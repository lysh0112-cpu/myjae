// lib/saju/tarotRecords.ts
// ============================================================================
// 타로 전용 기록(보관함) 로직 — 혼자서 뽑은 타로 결과를 저장/조회.
// ----------------------------------------------------------------------------
// 사주·궁합·택일과 동일한 "보관함 관문" 패턴을 타로에 맞게 옮겼다.
//   - saju_records 테이블 재사용, service_type='tarot'
//   - 타로는 "상대방"이 없다 → 사람(person) 대신 질문·관심사·뽑은 카드를 담는다.
//   - input_data(jsonb): question(질문) · category(관심사★) · spread(스프레드) · cards(뽑은 카드)
//   - result_data(jsonb): 해석 스냅샷(title/cards/summary/advice) — 다시보기 시 재계산·AI 재호출 없음.
//   - title = 질문 요약 / relation = category(관심사) → 목록·집계에서 바로 구분.
//
// [로그인 아이디 기준으로 정보가 이어짐]
//   저장·조회 모두 auth.getUser()의 user_id로 묶는다.
//   → 고객은 어느 기기에서든 자기 기록을 보고,
//     운영은 user_id·category 로 관심사 트렌드를 집계할 수 있다.
//
// 대규모 조회: user_id + service_type='tarot' 복합 인덱스
//   (idx_saju_records_user_service_created)를 그대로 탄다 — 추가 SQL 불필요.
// ============================================================================

import { supabase } from '@/lib/supabase'

// 관심사 5종 (홈 스크린샷의 칩과 동일) + 직접입력 폴백 '기타'
export type TarotCategory =
  | '연애·결혼' | '직장·이직' | '사업·재물' | '건강' | '인간관계' | '기타'

export const TAROT_CATEGORIES: TarotCategory[] =
  ['연애·결혼', '직장·이직', '사업·재물', '건강', '인간관계', '기타']

// 관심사 배지 색 (보관함 목록·트렌드 표시용, 피치톤 계열)
export const TAROT_CATEGORY_COLOR: Record<TarotCategory, string> = {
  '연애·결혼': '#c8506e',
  '직장·이직': '#3c82a0',
  '사업·재물': '#b46e46',
  '건강':     '#4a9450',
  '인간관계': '#8c6ea0',
  '기타':     '#96502e',
}

// 뽑은 카드 한 장 (저장용 — 화면 Picked에서 필요한 것만 추림)
export interface TarotSavedCard {
  cardId: number
  name: string          // 카드 이름(한글)
  nameEn?: string
  position: string      // 배치 위치(과거/현재/미래 등)
  reversed: boolean     // 역방향 여부
}

// 해석 스냅샷 (타로 결과 result_data)
export interface TarotResultSnapshot {
  title: string
  cards: { position: string; name: string; direction: string; meaning: string }[]
  summary: string
  advice: string
}

// input_data(jsonb)에 담는 형태
interface TarotInputBlob {
  question: string
  category: TarotCategory
  spreadId: string          // 'one' | 'three' | 'four' | 'celtic'
  spreadTitle: string       // '세 장 뽑기' 등 표시용
  cards: TarotSavedCard[]
}

// 보관함 카드 한 줄에 필요한 요약
export interface TarotRecord {
  id: string
  question: string
  category: TarotCategory
  spreadId: string
  spreadTitle: string
  cards: TarotSavedCard[]
  createdAt: string             // ISO
  resultData?: TarotResultSnapshot   // 결과 스냅샷 (다시보기 시 로드)
}

// 질문을 목록 title 용으로 짧게
function shortTitle(q: string): string {
  const t = (q || '').trim().replace(/\s+/g, ' ')
  if (!t) return '무제 리딩'
  return t.length > 30 ? t.slice(0, 30) + '…' : t
}

// category 값 정규화 (모르는 값이 오면 '기타')
function normCategory(v: unknown): TarotCategory {
  return (TAROT_CATEGORIES as string[]).includes(v as string)
    ? (v as TarotCategory)
    : '기타'
}

// ── 저장 (결과가 나오면 자동 저장) ──
export async function saveTarotRecord(args: {
  question: string
  category: TarotCategory
  spreadId: string
  spreadTitle: string
  cards: TarotSavedCard[]
  resultData: TarotResultSnapshot
}): Promise<{ ok: boolean; id?: string; message?: string }> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return { ok: false, message: '로그인이 필요해요' }

  const category = normCategory(args.category)

  const blob: TarotInputBlob = {
    question: args.question,
    category,
    spreadId: args.spreadId,
    spreadTitle: args.spreadTitle,
    cards: args.cards,
  }

  const { data, error } = await supabase
    .from('saju_records')
    .insert({
      user_id: uid,
      service_type: 'tarot',
      title: shortTitle(args.question),
      // relation 칸에 관심사(category)를 넣어 목록·트렌드 집계에서 바로 구분.
      relation: category,
      input_data: blob,
      result_data: args.resultData ?? null,
    })
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  return { ok: true, id: data?.id }
}

// blob → TarotRecord 변환
function toRecord(r: {
  id: string; relation: string | null; title: string;
  input_data: unknown; result_data: unknown; created_at: string;
}): TarotRecord | null {
  const blob = r.input_data as TarotInputBlob | null
  if (!blob) return null
  return {
    id: r.id,
    question: blob.question || r.title || '무제 리딩',
    category: normCategory(blob.category ?? r.relation),
    spreadId: blob.spreadId || 'three',
    spreadTitle: blob.spreadTitle || '타로 리딩',
    cards: Array.isArray(blob.cards) ? blob.cards : [],
    createdAt: r.created_at,
    resultData: (r.result_data as TarotResultSnapshot) ?? undefined,
  }
}

// ── 목록 (내 타로 기록, 최신순) ──
//   [대규모] 목록은 result_data(해석 전체)를 가져오지 않는다 — 가볍게.
//   해석 스냅샷은 카드를 눌러 다시보기(getTarotRecord)할 때만 내려받는다.
export async function listTarotRecords(): Promise<TarotRecord[]> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return []

  const { data, error } = await supabase
    .from('saju_records')
    .select('id, relation, title, input_data, created_at')
    .eq('user_id', uid)
    .eq('service_type', 'tarot')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data
    .map(r => toRecord({ ...r, result_data: undefined }))
    .filter((x): x is TarotRecord => x !== null)
}

// ── 하나 불러오기 (보관함 카드 눌러 다시보기 — 해석 스냅샷 포함) ──
export async function getTarotRecord(id: string): Promise<TarotRecord | null> {
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
export async function deleteTarotRecord(id: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return false
  const { error } = await supabase.from('saju_records').delete().eq('user_id', uid).eq('id', id)
  return !error
}

// ── 관심사 트렌드 집계 (내 기록 기준) ──
//   운영/마케팅용. 지금 이 회원이 어떤 관심사에 몰렸는지 category별 건수.
//   ※ 전체 회원 트렌드(관리자 대시보드)는 서버에서 user_id 필터 없이 별도 집계 예정.
export async function myTarotCategoryStats(): Promise<Record<TarotCategory, number>> {
  const base: Record<TarotCategory, number> = {
    '연애·결혼': 0, '직장·이직': 0, '사업·재물': 0, '건강': 0, '인간관계': 0, '기타': 0,
  }
  const list = await listTarotRecords()
  for (const r of list) base[r.category] = (base[r.category] ?? 0) + 1
  return base
}

// "N일 전" 표기 (사주·택일과 동일)
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
