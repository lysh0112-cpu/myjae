// lib/saju/coupleRecords.ts
// ============================================================================
// 궁합 전용 기록(보관함) 로직 — 두 사람 쌍을 저장/조회한다.
// ----------------------------------------------------------------------------
// 사주아이처럼: 지난 궁합을 누르면 "그때 본 결과 그대로" 다시 뜬다.
//   → result_data 에 결과 스냅샷(등급·명식·통변 텍스트)을 통째로 저장하고,
//     보관함에서 누르면 재계산·AI 재호출 없이 그대로 렌더(대규모: DB 읽기 1회).
//
// 기존 sajuRecords.ts(한 사람용)는 건드리지 않고, 궁합 전용 래퍼를 둔다.
//   - saju_records 테이블 재사용, service_type='couple'
//   - input_data(jsonb) 안에 두 사람(person1, person2)을 함께 담는다
//   - pairKey: 두 사람 생년월일시를 정렬 조합 → 순서 무관 같은 쌍 판별(다시보기용)
//
// 대규모 조회: user_id + service_type='couple' 인덱스로 목록을 받고(최신순),
//   특정 쌍 재조회는 pairKey로 필터. (행 폭증 시 pairKey 컬럼+인덱스 추가 권장 — 주석 참고)
// ============================================================================

import { supabase } from '@/lib/supabase'
import type { SavedInputData } from '@/lib/saju/savedPeople'

export type CoupleMode = 'couple' | 'married'

// 한 사람 식별키 (생년월일시+성별)
function personKey(d: SavedInputData): string {
  return [d.gender, d.calType, d.year, d.month, d.day, d.leapMonth, d.hour].join('|')
}
// 두 사람 쌍 키 (순서 무관 — 정렬해서 합침)
export function pairKeyOf(p1: SavedInputData, p2: SavedInputData): string {
  return [personKey(p1), personKey(p2)].sort().join('#')
}

// 보관함 카드 한 줄에 필요한 요약
export interface CoupleRecord {
  id: string
  mode: CoupleMode
  name1: string
  name2: string
  relation: string          // 관계 라벨(연인/부부/친구 등)
  grade: string             // 등급 표현 (점수 숫자 아님)
  createdAt: string         // ISO
  input1: SavedInputData
  input2: SavedInputData
  resultData?: unknown      // 결과 스냅샷 (다시보기용 — 그대로 렌더)
  unsavedCount?: number     // 저장 안 된 사람 수(예: "미저장 2명") — 화면 표시용
}

// input_data(jsonb)에 담는 형태
interface CoupleInputBlob {
  mode: CoupleMode
  person1: SavedInputData & { name?: string }
  person2: SavedInputData & { name?: string }
  pairKey: string
  grade?: string            // 등급 표현 (목록 표시용)
  unsavedCount?: number
}

// ── 저장 ──
export async function saveCoupleRecord(args: {
  mode: CoupleMode
  name1: string
  name2: string
  relation: string
  grade: string
  input1: SavedInputData & { name?: string }
  input2: SavedInputData & { name?: string }
  resultData?: unknown        // 등급·명식·통변 텍스트 스냅샷
  unsavedCount?: number
}): Promise<{ ok: boolean; id?: string; message?: string }> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return { ok: false, message: '로그인이 필요해요' }

  const blob: CoupleInputBlob = {
    mode: args.mode,
    person1: args.input1,
    person2: args.input2,
    pairKey: pairKeyOf(args.input1, args.input2),
    grade: args.grade,
    unsavedCount: args.unsavedCount,
  }

  const { data, error } = await supabase
    .from('saju_records')
    .insert({
      user_id: uid,
      service_type: 'couple',
      title: `${args.name1} ♥ ${args.name2}`,
      relation: args.relation,
      input_data: blob,
      result_data: args.resultData ?? null,
    })
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  return { ok: true, id: data?.id }
}

// blob → CoupleRecord 변환
function toRecord(r: {
  id: string; relation: string | null; title: string;
  input_data: unknown; result_data: unknown; created_at: string
}): CoupleRecord | null {
  const blob = r.input_data as CoupleInputBlob | null
  if (!blob || !blob.person1 || !blob.person2) return null
  // title에서 이름 복원 (♥ 기준). 실패 시 person.name 사용.
  const parts = (r.title || '').split('♥').map(s => s.trim())
  const name1 = blob.person1.name || parts[0] || '나'
  const name2 = blob.person2.name || parts[1] || '상대'
  // 등급은 result_data 스냅샷에 담아두는 것을 우선(없으면 relation 옆 표시 생략)
  const grade =
    blob.grade ||
    ((r.result_data as { grade?: string } | null)?.grade ?? '')
  return {
    id: r.id,
    mode: blob.mode || 'couple',
    name1, name2,
    relation: r.relation || (blob.mode === 'married' ? '부부' : '연인'),
    grade,
    createdAt: r.created_at,
    input1: blob.person1,
    input2: blob.person2,
    resultData: r.result_data ?? undefined,
    unsavedCount: blob.unsavedCount,
  }
}

// ── 목록 (내 궁합 전체, 최신순) ──
//   mode 필터('couple'|'married'|undefined=전체)는 화면에서 걸러도 되지만
//   여기서 옵션으로 받는다.
export async function listCoupleRecords(mode?: CoupleMode): Promise<CoupleRecord[]> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return []

  const { data, error } = await supabase
    .from('saju_records')
    .select('id, relation, title, input_data, result_data, created_at')
    .eq('user_id', uid)
    .eq('service_type', 'couple')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  const list = data
    .map(toRecord)
    .filter((x): x is CoupleRecord => x !== null)

  return mode ? list.filter(r => r.mode === mode) : list
}

// ── 특정 쌍의 지난 기록 (다시보기 판단용) ──
export async function findCoupleRecordByPair(
  p1: SavedInputData, p2: SavedInputData
): Promise<CoupleRecord | null> {
  const key = pairKeyOf(p1, p2)
  const all = await listCoupleRecords()
  const found = all.find(r => pairKeyOf(r.input1, r.input2) === key)
  return found ?? null
}

// ── 하나 불러오기 (보관함에서 카드 눌렀을 때) ──
export async function getCoupleRecord(id: string): Promise<CoupleRecord | null> {
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
export async function deleteCoupleRecord(id: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return false
  const { error } = await supabase.from('saju_records').delete().eq('user_id', uid).eq('id', id)
  return !error
}

// "N일 전" 표기
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
