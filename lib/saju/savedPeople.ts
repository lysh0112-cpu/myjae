// lib/saju/savedPeople.ts
// ============================================================================
// "가족·지인" 등 타인 사주를 saju_records 테이블에 저장/조회/수정/삭제하는
// 공용 헬퍼. 화면(모달·입력폼)이 아니라 순수 로직이라 어디서든 재사용한다.
// ----------------------------------------------------------------------------
// 왜 이 파일이 필요한가:
//   홈의 12서비스(사주/궁합/대운/…)가 전부 "사람 선택 모달"을 거친다.
//   그 모달과 "새 사람 추가" 입력폼이 공통으로 쓸 저장소 접근 로직을
//   여기 한 곳에 모아, 서비스마다 다시 짜지 않게 한다.
//
// saju_records 컬럼(이미 존재, 현재 비어있음):
//   id, user_id, service_type, title, relation, input_data(jsonb),
//   result_data(jsonb), created_at
//
// 이 파일이 다루는 것:
//   - listSavedPeople : 내가 저장한 사람 목록 조회
//   - addSavedPerson  : 새 사람 저장 (중복이면 막고 알림용 결과 반환)
//   - updateSavedPerson : 기존 사람 수정
//   - deleteSavedPerson : 삭제
//   - groupByRelation : 목록을 "연인·가족 / 친구·지인 / 기타"로 자동 분류
//   - RELATIONS : 관계 칩 목록 (입력폼에서 사용)
//
// 계산·표준화는 lib/saju/myInfo.ts 를 재사용한다. (personKey/MyInfo 규칙 통일)
// ============================================================================

import { supabase } from '@/lib/supabase'
import { personKey, type MyInfo } from '@/lib/saju/myInfo'

// ── input_data(jsonb)에 저장하는 사주 정보 형태 ──
// MyInfo와 동일 필드. (표준 규격을 그대로 저장해 조회 시 바로 쓰게)
export interface SavedInputData {
  gender: string     // '남' | '여'
  calType: string    // '양력' | '음력'
  year: string
  month: string
  day: string
  leapMonth: string  // '0' 평달 | '1' 윤달
  hour: string       // '0'~'11' | '모름'
}

// ── DB의 saju_records 한 행을 앱에서 다루는 형태 ──
export interface SavedPerson {
  id: string
  user_id: string
  service_type: string | null
  title: string           // 이름(별명) 예: "아내", "큰딸"
  relation: string        // 관계 예: "연인", "자녀", 직접입력값 등
  input_data: SavedInputData
  created_at: string
}

// ── 저장/수정 시 넘기는 입력값 ──
export interface PersonDraft {
  title: string
  relation: string
  input: SavedInputData
  serviceType?: string | null   // 진입한 서비스가 정함 (예: 'saju' | 'couple' | 'dayun')
}

// ============================================================================
// 관계 칩 목록 (입력폼에서 사용) — 인연 → 가족 → 사회 순
// 나중에 빼거나 순서 바꾸려면 이 배열만 수정하면 된다. (+ 직접 입력)
// ============================================================================
export const RELATIONS = [
  '연인', '썸남/썸녀', '전연인', '배우자', '전배우자',
  '부모', '자녀', '형제/자매', '조부모', '손주', '며느리/사위', '친척',
  '친구', '지인', '직장동료', '상사/부하', '동업자/파트너',
] as const

// 목록 모달에서 묶을 그룹 정의 (relation → 그룹 라벨)
const FAMILY_LOVE = new Set<string>([
  '연인', '썸남/썸녀', '전연인', '배우자', '전배우자',
  '부모', '자녀', '형제/자매', '조부모', '손주', '며느리/사위', '친척',
])
const SOCIAL = new Set<string>([
  '친구', '지인', '직장동료', '상사/부하', '동업자/파트너',
])

export type PersonGroupKey = 'love_family' | 'social' | 'etc'

export interface PersonGroup {
  key: PersonGroupKey
  label: string
  people: SavedPerson[]
}

// 목록을 3그룹으로 분류. 빈 그룹은 제외. (사람 없는 그룹은 화면에서 자동 숨김)
export function groupByRelation(people: SavedPerson[]): PersonGroup[] {
  const love: SavedPerson[] = []
  const social: SavedPerson[] = []
  const etc: SavedPerson[] = []
  for (const p of people) {
    if (FAMILY_LOVE.has(p.relation)) love.push(p)
    else if (SOCIAL.has(p.relation)) social.push(p)
    else etc.push(p)   // 직접 입력 등
  }
  const groups: PersonGroup[] = [
    { key: 'love_family', label: '연인 · 가족', people: love },
    { key: 'social', label: '친구 · 지인', people: social },
    { key: 'etc', label: '기타', people: etc },
  ]
  return groups.filter(g => g.people.length > 0)
}

// ── input_data → MyInfo (personKey 계산 등에 사용) ──
function inputToMyInfo(input: SavedInputData): MyInfo {
  return {
    gender: input.gender,
    calType: input.calType,
    year: input.year,
    month: input.month,
    day: input.day,
    leapMonth: input.leapMonth || '0',
    hour: input.hour,
  }
}

// SavedPerson → MyInfo (결과 화면으로 넘길 때 사용)
export function personToMyInfo(p: SavedPerson): MyInfo {
  return inputToMyInfo(p.input_data)
}

// ============================================================================
// 조회 — 로그인한 내가 저장한 사람들
// ============================================================================
export async function listSavedPeople(): Promise<SavedPerson[]> {
  const { data: u } = await supabase.auth.getUser()
  if (!u?.user) return []
  const { data, error } = await supabase
    .from('saju_records')
    .select('id, user_id, service_type, title, relation, input_data, created_at')
    .eq('user_id', u.user.id)
    .order('created_at', { ascending: false })
  if (error) { console.error('listSavedPeople', error); return [] }
  // input_data가 문자열로 올 수도 있어 안전 파싱
  return (data ?? []).map(normalizeRow)
}

function normalizeRow(row: Record<string, unknown>): SavedPerson {
  let input = row.input_data as unknown
  if (typeof input === 'string') {
    try { input = JSON.parse(input) } catch { input = {} }
  }
  const inp = (input ?? {}) as Record<string, unknown>
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    service_type: (row.service_type as string) ?? null,
    title: (row.title as string) ?? '',
    relation: (row.relation as string) ?? '',
    input_data: {
      gender: String(inp.gender ?? '남'),
      calType: String(inp.calType ?? '양력'),
      year: String(inp.year ?? ''),
      month: String(inp.month ?? ''),
      day: String(inp.day ?? ''),
      leapMonth: String(inp.leapMonth ?? '0'),
      hour: inp.hour == null ? '모름' : String(inp.hour),
    },
    created_at: String(row.created_at ?? ''),
  }
}

// ============================================================================
// 저장 결과 타입 (중복 방지 알림용)
// ============================================================================
export type AddResult =
  | { ok: true; person: SavedPerson }
  | { ok: false; reason: 'duplicate'; existing: SavedPerson }
  | { ok: false; reason: 'not_logged_in' }
  | { ok: false; reason: 'error'; message: string }

// ── 같은 사람인지 판정: personKey(달력·생년월일·윤달·시·성별) 동일 ──
export function isSamePerson(a: SavedInputData, b: SavedInputData): boolean {
  return personKey(inputToMyInfo(a)) === personKey(inputToMyInfo(b))
}

// ============================================================================
// 추가 — 중복이면 저장하지 않고 "이미 있어요" 알림용 결과 반환
// ============================================================================
export async function addSavedPerson(draft: PersonDraft): Promise<AddResult> {
  const { data: u } = await supabase.auth.getUser()
  if (!u?.user) return { ok: false, reason: 'not_logged_in' }

  // 중복 체크: 같은 생년월일(+달력+윤달+시+성별) 사람이 이미 있으면 막는다.
  const existingList = await listSavedPeople()
  const dup = existingList.find(p => isSamePerson(p.input_data, draft.input))
  if (dup) return { ok: false, reason: 'duplicate', existing: dup }

  const { data, error } = await supabase
    .from('saju_records')
    .insert({
      user_id: u.user.id,
      service_type: draft.serviceType ?? null,
      title: draft.title,
      relation: draft.relation,
      input_data: draft.input,
    })
    .select('id, user_id, service_type, title, relation, input_data, created_at')
    .single()

  if (error || !data) {
    return { ok: false, reason: 'error', message: error?.message ?? '저장에 실패했어요' }
  }
  return { ok: true, person: normalizeRow(data) }
}

// ============================================================================
// 수정 — 편집 모드에서 기존 사람 값 갱신
//   중복 체크: 나 자신(id)을 제외하고 같은 사람이 있으면 막는다.
// ============================================================================
export type UpdateResult =
  | { ok: true; person: SavedPerson }
  | { ok: false; reason: 'duplicate'; existing: SavedPerson }
  | { ok: false; reason: 'error'; message: string }

export async function updateSavedPerson(id: string, draft: PersonDraft): Promise<UpdateResult> {
  const existingList = await listSavedPeople()
  const dup = existingList.find(p => p.id !== id && isSamePerson(p.input_data, draft.input))
  if (dup) return { ok: false, reason: 'duplicate', existing: dup }

  const { data, error } = await supabase
    .from('saju_records')
    .update({
      title: draft.title,
      relation: draft.relation,
      input_data: draft.input,
      ...(draft.serviceType !== undefined ? { service_type: draft.serviceType } : {}),
    })
    .eq('id', id)
    .select('id, user_id, service_type, title, relation, input_data, created_at')
    .single()

  if (error || !data) {
    return { ok: false, reason: 'error', message: error?.message ?? '수정에 실패했어요' }
  }
  return { ok: true, person: normalizeRow(data) }
}

// ============================================================================
// 삭제
// ============================================================================
export async function deleteSavedPerson(id: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.from('saju_records').delete().eq('id', id)
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

// ============================================================================
// 아바타 글자 — 이름 첫 글자 (목록·입력폼 공용)
// ============================================================================
export function avatarChar(title: string): string {
  const t = (title ?? '').trim()
  return t ? t[0] : '?'
}
