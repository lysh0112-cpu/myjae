// lib/saju/movingRecords.ts
// ============================================================================
// 이사택일 전용 기록(보관함) — 계약자·배우자 + 택일 결과를 저장/조회.
// ----------------------------------------------------------------------------
// 결혼택일 weddingRecords.ts 를 본떴다. 같은 "보관함 관문" 패턴:
//   지난 택일을 누르면 "그때 본 결과 그대로" 다시 뜬다.
//   → result_data 에 결과 스냅샷을 통째로 저장하고, 보관함에서 누르면
//     재계산·API 재호출 없이 그대로 렌더한다.
//
//   - saju_records 테이블 재사용, service_type='moving'
//   - input_data(jsonb) 안에 두 사람 + kind + 명의형태 + 이사방향을 담는다
//
// ★결혼택일과 다른 점 — 명의(ownerMode·ownerWho)와 방향(direction)을 함께 저장한다.
//   이 둘이 없으면 다시보기에서 결과가 달라진다. 명의가 바뀌면 판정 대상이
//   바뀌고, 방향이 바뀌면 손 판정이 바뀌기 때문이다.
// ============================================================================

import { supabase } from '@/lib/supabase'
import type { SavedInputData } from '@/lib/saju/savedPeople'

/** 정한 날 봐주기(check) / 좋은 날 찾기(find) */
export type MovingKind = 'check' | 'find'

export const MOVING_KIND_LABEL: Record<MovingKind, string> = {
  check: '정한 날 봐주기',
  find: '좋은 날 찾기',
}

/** 명의 형태 */
export type MovingOwnerMode = 'single' | 'joint'
export type MovingOwnerWho = 'contractor' | 'spouse'
export type MovingDirection = '동' | '서' | '남' | '북'

export const OWNER_MODE_LABEL: Record<MovingOwnerMode, string> = {
  single: '단독명의',
  joint: '공동명의',
}

// 한 사람 식별키 (생년월일시+성별)
function personKey(d: SavedInputData): string {
  return [d.gender, d.calType, d.year, d.month, d.day, d.leapMonth, d.hour].join('|')
}
/** 두 사람 쌍 키 (순서 무관) */
export function pairKeyOf(p1: SavedInputData, p2: SavedInputData): string {
  return [personKey(p1), personKey(p2)].sort().join('#')
}

/** 보관함 카드 한 줄에 필요한 요약 */
export interface MovingRecord {
  id: string
  kind: MovingKind
  name1: string             // 계약자
  name2: string             // 배우자
  summary: string
  createdAt: string
  input1: SavedInputData & { name?: string }
  input2: SavedInputData & { name?: string }
  ownerMode: MovingOwnerMode
  ownerWho: MovingOwnerWho
  direction: MovingDirection | null
  resultData?: unknown
}

// input_data(jsonb)에 담는 형태
interface MovingInputBlob {
  kind: MovingKind
  person1: SavedInputData & { name?: string }
  person2: SavedInputData & { name?: string }
  pairKey: string
  summary?: string
  ownerMode?: MovingOwnerMode
  ownerWho?: MovingOwnerWho
  direction?: MovingDirection | null
}

// ── 저장 ──
export async function saveMovingRecord(args: {
  kind: MovingKind
  name1: string
  name2: string
  summary: string
  input1: SavedInputData & { name?: string }
  input2: SavedInputData & { name?: string }
  ownerMode: MovingOwnerMode
  ownerWho: MovingOwnerWho
  direction: MovingDirection | null
  resultData?: unknown
}): Promise<{ ok: boolean; id?: string; message?: string }> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return { ok: false, message: '로그인이 필요해요' }

  const blob: MovingInputBlob = {
    kind: args.kind,
    person1: args.input1,
    person2: args.input2,
    pairKey: pairKeyOf(args.input1, args.input2),
    summary: args.summary,
    ownerMode: args.ownerMode,
    ownerWho: args.ownerWho,
    direction: args.direction,
  }

  const { data, error } = await supabase
    .from('saju_records')
    .insert({
      user_id: uid,
      service_type: 'moving',
      title: `${args.name1} · ${args.name2}`,
      relation: MOVING_KIND_LABEL[args.kind],
      input_data: blob,
      result_data: args.resultData ?? null,
    })
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  return { ok: true, id: data?.id }
}

// blob → MovingRecord 변환
function toRecord(r: {
  id: string; relation: string | null; title: string;
  input_data: unknown; result_data: unknown; created_at: string;
}): MovingRecord | null {
  const blob = r.input_data as MovingInputBlob | null
  if (!blob || !blob.person1) return null

  const parts = (r.title || '').split('·').map(s => s.trim())
  const name1 = blob.person1.name || parts[0] || '계약자'
  const name2 = blob.person2?.name || parts[1] || '배우자'
  const kind: MovingKind = blob.kind === 'find' ? 'find' : 'check'

  return {
    id: r.id,
    kind,
    name1, name2,
    summary: blob.summary || MOVING_KIND_LABEL[kind],
    createdAt: r.created_at,
    input1: blob.person1,
    input2: blob.person2,
    // 옛 기록에 없을 수 있다 — 기본값으로 받는다
    ownerMode: blob.ownerMode === 'single' ? 'single' : 'joint',
    ownerWho: blob.ownerWho === 'spouse' ? 'spouse' : 'contractor',
    direction: blob.direction ?? null,
    resultData: r.result_data ?? undefined,
  }
}

// ── 목록 (최신순) ──
//   [대규모] 목록은 result_data 를 가져오지 않는다 — 가볍게.
//   결과 스냅샷은 카드를 눌러 다시보기할 때만 내려받는다.
export async function listMovingRecords(): Promise<MovingRecord[]> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return []

  const { data, error } = await supabase
    .from('saju_records')
    .select('id, relation, title, input_data, created_at')
    .eq('user_id', uid)
    .eq('service_type', 'moving')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data
    .map(r => toRecord({ ...r, result_data: undefined }))
    .filter((x): x is MovingRecord => x !== null)
}

// ── 하나 불러오기 (결과 스냅샷 포함) ──
export async function getMovingRecord(id: string): Promise<MovingRecord | null> {
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
export async function deleteMovingRecord(id: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return false
  const { error } = await supabase.from('saju_records').delete().eq('user_id', uid).eq('id', id)
  return !error
}

/** "N일 전" 표기 (결혼택일과 동일) */
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
