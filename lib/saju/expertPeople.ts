// lib/saju/expertPeople.ts
// ============================================================================
// 전문가용 인적사항 관리 (expert_people 테이블 전용)
//
//   ★ 고객용 saju_records와 완전 분리된 별도 테이블을 사용한다.
//     - 고객 기록(사주·궁합·개명·찜 등)과 섞이지 않음
//     - 중복제거·필터 간섭 없음 (savedPeople의 전역 중복제거 영향 안 받음)
//     - RLS로 본인 데이터만 접근
//
//   쓰는 곳: app/manseryeok/expert (전문가용 만세력 계산기)
// ============================================================================

import { supabase } from '@/lib/supabase'

// ── 앱에서 다루는 한 사람 ──
export interface ExpertPerson {
  id: string
  user_id: string
  name: string
  memo: string | null
  gender: string      // '남' | '여'
  calType: string     // '양력' | '음력'
  year: string
  month: string
  day: string
  leapMonth: string   // '0' 평달 | '1' 윤달
  hour: string        // '0'~'11' | '모름'
  created_at: string
}

// ── 등록/수정 시 넘기는 입력값 ──
export interface ExpertPersonDraft {
  name: string
  memo?: string
  gender: string
  calType: string
  year: string
  month: string
  day: string
  leapMonth: string
  hour: string
}

type SaveResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'not_logged_in' | 'duplicate' | 'invalid' | 'error' }

// DB 행 → 앱 형태
function normalize(row: Record<string, unknown>): ExpertPerson {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name ?? ''),
    memo: (row.memo as string) ?? null,
    gender: String(row.gender ?? '남'),
    calType: String(row.cal_type ?? '양력'),
    year: String(row.birth_year ?? ''),
    month: String(row.birth_month ?? ''),
    day: String(row.birth_day ?? ''),
    leapMonth: row.leap_month ? '1' : '0',
    hour: String(row.birth_hour ?? '모름'),
    created_at: String(row.created_at ?? ''),
  }
}

// 같은 사람인지 판별하는 키 (생년월일 + 성별 + 달력 + 시)
function personKey(p: {
  gender: string; calType: string; year: string; month: string
  day: string; leapMonth: string; hour: string
}): string {
  return [p.gender, p.calType, p.year, p.month, p.day, p.leapMonth, p.hour].join('_')
}

/** 내가 등록한 전문가용 사람 목록 (최신순) */
export async function listExpertPeople(): Promise<ExpertPerson[]> {
  const { data: u } = await supabase.auth.getUser()
  if (!u?.user) return []
  const { data, error } = await supabase
    .from('expert_people')
    .select('*')
    .eq('user_id', u.user.id)
    .order('created_at', { ascending: false })
  if (error) { console.error('listExpertPeople', error.message); return [] }
  return (data ?? []).map(normalize)
}

/** 새 사람 등록 (같은 사주가 이미 있으면 duplicate) */
export async function addExpertPerson(draft: ExpertPersonDraft): Promise<SaveResult> {
  const { data: u } = await supabase.auth.getUser()
  if (!u?.user) return { ok: false, reason: 'not_logged_in' }

  const y = Number(draft.year), m = Number(draft.month), d = Number(draft.day)
  if (!draft.name.trim() || !y || !m || !d) return { ok: false, reason: 'invalid' }

  // 중복 확인 — 내 목록 안에서만 판정 (고객 기록의 영향을 받지 않음)
  const mine = await listExpertPeople()
  const key = personKey(draft)
  if (mine.some(p => personKey(p) === key)) return { ok: false, reason: 'duplicate' }

  const { data, error } = await supabase
    .from('expert_people')
    .insert({
      user_id: u.user.id,
      name: draft.name.trim(),
      memo: draft.memo?.trim() || null,
      gender: draft.gender,
      cal_type: draft.calType,
      birth_year: y,
      birth_month: m,
      birth_day: d,
      leap_month: draft.leapMonth === '1',
      birth_hour: draft.hour || '모름',
    })
    .select('id')
    .single()

  if (error || !data) { console.error('addExpertPerson', error?.message); return { ok: false, reason: 'error' } }
  return { ok: true, id: String(data.id) }
}

/** 사람 정보 수정 */
export async function updateExpertPerson(id: string, draft: ExpertPersonDraft): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser()
  if (!u?.user) return false
  const { error } = await supabase
    .from('expert_people')
    .update({
      name: draft.name.trim(),
      memo: draft.memo?.trim() || null,
      gender: draft.gender,
      cal_type: draft.calType,
      birth_year: Number(draft.year),
      birth_month: Number(draft.month),
      birth_day: Number(draft.day),
      leap_month: draft.leapMonth === '1',
      birth_hour: draft.hour || '모름',
    })
    .eq('id', id)
    .eq('user_id', u.user.id)
  if (error) { console.error('updateExpertPerson', error.message); return false }
  return true
}

/** 삭제 */
export async function deleteExpertPerson(id: string): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser()
  if (!u?.user) return false
  const { error } = await supabase
    .from('expert_people')
    .delete()
    .eq('id', id)
    .eq('user_id', u.user.id)
  if (error) { console.error('deleteExpertPerson', error.message); return false }
  return true
}

/** 만세력 조회 URL 만들기 (전문가 모드: 통변 없이 차트만) */
export function toExpertResultUrl(p: ExpertPerson): string {
  const q = new URLSearchParams()
  q.set('year', p.year); q.set('month', p.month); q.set('day', p.day)
  q.set('gender', p.gender); q.set('calType', p.calType)
  q.set('leapMonth', p.leapMonth || '0')
  if (p.hour && p.hour !== '모름') q.set('hour', String(p.hour))
  if (p.name) q.set('name', p.name)
  q.set('pro', '1')       // 전문가 모드 (합충 토글 등)
  q.set('mode', 'chart')  // 통변 없음, 차트만
  return `/manseryeok/result-new?${q.toString()}`
}

/** 목록 아바타 글자 (이름 첫 글자) */
export function expertAvatarChar(name: string): string {
  const t = (name || '').trim()
  return t ? t[0] : '?'
}
