// lib/saju/birthRecords.ts
// ============================================================================
// 출산택일 전용 기록(보관함) 로직 — 부모 두 사람 + 출산 설문 + 택일 결과를 저장/조회.
// ----------------------------------------------------------------------------
// 결혼택일(weddingRecords.ts)과 동일한 "보관함 관문" 패턴:
//   지난 출산택일을 누르면 "그때 본 추천 그대로" 다시 뜬다.
//   → result_data 에 결과 스냅샷(추천 날짜·피할 날·AI 해설)을 통째로 저장하고,
//     보관함에서 누르면 재계산·AI 재호출 없이 그대로 렌더(대규모: DB 읽기 1회).
//
//   - saju_records 테이블 재사용, service_type='birth'
//   - input_data(jsonb) 안에 부모(person1, person2) + survey(예정일·방법 등)를 담는다
//   - pairKey: 두 부모 생년월일시를 정렬 조합 → 순서 무관 같은 쌍 판별
//
// 대규모 조회: user_id + service_type='birth' 인덱스로 목록을 최신순으로 받는다.
//   (saju_records 복합 인덱스 idx_saju_records_user_service_created 를 그대로 탄다.)
//   [대규모] 목록은 result_data(결과 전체)를 가져오지 않는다 — 가볍게.
// ============================================================================

import { supabase } from '@/lib/supabase'
import type { SavedInputData } from '@/lib/saju/savedPeople'

// 출산 설문 (입구 화면에서 받는 정보)
export interface BirthSurvey {
  dueDate: string        // 출산 예정일 'YYYY-MM-DD'
  method: string         // 제왕절개 / 자연분만 등
  timePref: string       // 상관없음 / 평일오전 / 평일오후
  babyGender: string     // 상관없음 / 남 / 여
  wishes: string[]       // 부모가 바라는 점
  avoidNote: string      // 피하고 싶은 점(자유 입력)
}

// 한 사람 식별키 (생년월일시+성별)
function personKey(d: SavedInputData): string {
  return [d.gender, d.calType, d.year, d.month, d.day, d.leapMonth, d.hour].join('|')
}
// 두 사람 쌍 키 (순서 무관 — 정렬해서 합침)
export function pairKeyOf(p1: SavedInputData, p2: SavedInputData): string {
  return [personKey(p1), personKey(p2)].sort().join('#')
}

// 보관함 카드 한 줄에 필요한 요약
export interface BirthRecord {
  id: string
  name1: string             // 부모1 이름
  name2: string             // 부모2 이름
  summary: string           // 목록 표시용 한 줄 (예: "길일 5개 · 8월 예정")
  createdAt: string         // ISO
  input1: SavedInputData & { name?: string }
  input2: SavedInputData & { name?: string }
  survey: BirthSurvey       // 예정일·설문 (다시보기 시 필요)
  resultData?: unknown      // 결과 스냅샷 (다시보기용 — 그대로 렌더)
}

// input_data(jsonb)에 담는 형태
interface BirthInputBlob {
  person1: SavedInputData & { name?: string }
  person2: SavedInputData & { name?: string }
  survey: BirthSurvey
  pairKey: string
  summary?: string          // 목록 표시용
}

// ── 저장 ──
export async function saveBirthRecord(args: {
  name1: string
  name2: string
  summary: string           // 목록 카드 한 줄 요약
  input1: SavedInputData & { name?: string }
  input2: SavedInputData & { name?: string }
  survey: BirthSurvey
  resultData?: unknown      // 추천 날짜·피할 날·AI 해설 스냅샷
}): Promise<{ ok: boolean; id?: string; message?: string }> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return { ok: false, message: '로그인이 필요해요' }

  const blob: BirthInputBlob = {
    person1: args.input1,
    person2: args.input2,
    survey: args.survey,
    pairKey: pairKeyOf(args.input1, args.input2),
    summary: args.summary,
  }

  const { data, error } = await supabase
    .from('saju_records')
    .insert({
      user_id: uid,
      service_type: 'birth',
      title: `${args.name1} · ${args.name2}`,
      // relation 칸에 예정일을 넣어 목록에서 바로 구분.
      relation: args.survey.dueDate ? `${args.survey.dueDate} 예정` : '출산택일',
      input_data: blob,
      result_data: args.resultData ?? null,
    })
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  return { ok: true, id: data?.id }
}

// blob → BirthRecord 변환
function toRecord(r: {
  id: string; relation: string | null; title: string;
  input_data: unknown; result_data: unknown; created_at: string;
}): BirthRecord | null {
  const blob = r.input_data as BirthInputBlob | null
  if (!blob || !blob.person1 || !blob.person2) return null
  // title에서 이름 복원 (· 기준). 실패 시 person.name 사용.
  const parts = (r.title || '').split('·').map(s => s.trim())
  const name1 = blob.person1.name || parts[0] || '부모1'
  const name2 = blob.person2.name || parts[1] || '부모2'
  const survey: BirthSurvey = blob.survey || {
    dueDate: '', method: '', timePref: '', babyGender: '', wishes: [], avoidNote: '',
  }
  return {
    id: r.id,
    name1, name2,
    summary: blob.summary || (survey.dueDate ? `${survey.dueDate} 예정` : '출산택일'),
    createdAt: r.created_at,
    input1: blob.person1,
    input2: blob.person2,
    survey,
    resultData: r.result_data ?? undefined,
  }
}

// ── 목록 (내 출산택일 기록, 최신순) ──
//   [대규모] 목록은 result_data(결과 전체)를 가져오지 않는다 — 가볍게.
//   결과 스냅샷은 카드를 눌러 다시보기(getBirthRecord)할 때만 내려받는다.
export async function listBirthRecords(): Promise<BirthRecord[]> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return []

  const { data, error } = await supabase
    .from('saju_records')
    .select('id, relation, title, input_data, created_at')
    .eq('user_id', uid)
    .eq('service_type', 'birth')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data
    .map(r => toRecord({ ...r, result_data: undefined }))
    .filter((x): x is BirthRecord => x !== null)
}

// ── 하나 불러오기 (보관함에서 카드 눌렀을 때 — 결과 스냅샷 포함) ──
export async function getBirthRecord(id: string): Promise<BirthRecord | null> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return null

  const { data, error } = await supabase
    .from('saju_records')
    .select('id, relation, title, input_data, result_data, created_at')
    .eq('user_id', uid)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return toRecord(data)
}

// ── 삭제 ──
export async function deleteBirthRecord(id: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return false
  const { error } = await supabase.from('saju_records').delete().eq('user_id', uid).eq('id', id)
  return !error
}

// "N일 전" 표기 (궁합·결혼택일과 동일)
export function daysAgoLabel(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24))
  if (days <= 0) return '오늘'
  if (days === 1) return '어제'
  if (days < 7) return `${days}일 전`
  if (days < 30) return `${Math.floor(days / 7)}주 전`
  if (days < 365) return `${Math.floor(days / 30)}개월 전`
  return `${Math.floor(days / 365)}년 전`
}
