// lib/saju/sajuRecords.ts
// ============================================================================
// "사주 기록" 공용 로직 — 홈의 12개 서비스가 모두 함께 쓴다.
// ----------------------------------------------------------------------------
// 사주아이처럼 "○○님의 이 서비스를 언제 봤는지" 기록하고,
// 다시 들어오면 "지난 해설 다시 보기 / 새로 보기"를 고르게 한다.
//
// saju_records 테이블(이미 존재)에 얹는다:
//   id, user_id, service_type, title, relation, input_data(jsonb),
//   result_data(jsonb), created_at
//
// service_type 으로 서비스를 구분하므로(saju/couple/daeun/…),
// 이 파일 하나로 모든 서비스의 기록을 다룬다.
//
// 이 파일이 다루는 것:
//   - listRecords     : 특정 사람+서비스의 지난 기록 목록 (최신순)
//   - latestRecord    : 가장 최근 기록 1건 (없으면 null)
//   - saveRecord      : 새 기록 저장 (결과 스냅샷 포함)
//   - daysAgoLabel    : "124일 전" 같은 표시용 문구
// ============================================================================

import { supabase } from '@/lib/supabase'
import type { SavedInputData } from '@/lib/saju/savedPeople'

export interface SajuRecord {
  id: string
  serviceType: string          // 'saju' | 'couple' | 'daeun' | ...
  title: string                // 대상 이름/별명
  relation?: string            // 관계(가족·지인 등)
  inputData: SavedInputData    // 그때 본 사람의 사주 입력값
  resultData?: unknown         // 결과 스냅샷(선택) — 지난 해설 다시보기용
  createdAt: string            // ISO 날짜
}

// 사람을 식별하는 키: 생년월일시 + 성별 (같은 사람 판별용)
function personKeyOf(d: SavedInputData): string {
  return [d.gender, d.calType, d.year, d.month, d.day, d.leapMonth, d.hour].join('|')
}

// ── 지난 기록 목록 (특정 사람 + 특정 서비스, 최신순) ──
export async function listRecords(
  serviceType: string,
  person: SavedInputData
): Promise<SajuRecord[]> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return []

  // 목록은 result_data(통변 전체)를 가져오지 않는다 — 대규모에서 가볍게.
  //   통변 스냅샷은 카드를 눌러 다시보기(getRecord)할 때만 내려받는다.
  const { data, error } = await supabase
    .from('saju_records')
    .select('id, service_type, title, relation, input_data, created_at')
    .eq('user_id', uid)
    .eq('service_type', serviceType)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  const key = personKeyOf(person)
  return data
    .filter(r => r.input_data && personKeyOf(r.input_data as SavedInputData) === key)
    .map(r => ({
      id: r.id,
      serviceType: r.service_type,
      title: r.title,
      relation: r.relation ?? undefined,
      inputData: r.input_data as SavedInputData,
      resultData: undefined,   // 목록에선 안 실음(다시보기 getRecord에서 로드)
      createdAt: r.created_at,
    }))
}

// ── 가장 최근 기록 1건 ──
export async function latestRecord(
  serviceType: string,
  person: SavedInputData
): Promise<SajuRecord | null> {
  const list = await listRecords(serviceType, person)
  return list.length ? list[0] : null
}

// ── 보관함용: 특정 서비스의 내 기록 전체 (사람 무관, 최신순) ──
//   holds saju-storage 화면에서 사용. 한 사람 필터 없이 그 서비스 기록을 다 보여준다.
export async function listRecordsByService(
  serviceType: string
): Promise<SajuRecord[]> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return []

  // 목록은 result_data(통변 전체)를 가져오지 않는다 — 대규모에서 가볍게.
  const { data, error } = await supabase
    .from('saju_records')
    .select('id, service_type, title, relation, input_data, created_at')
    .eq('user_id', uid)
    .eq('service_type', serviceType)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data
    .filter(r => r.input_data)   // 사람 정보 있는 것만
    .map(r => ({
      id: r.id,
      serviceType: r.service_type,
      title: r.title,
      relation: r.relation ?? undefined,
      inputData: r.input_data as SavedInputData,
      resultData: undefined,   // 목록에선 안 실음(다시보기 getRecord에서 로드)
      createdAt: r.created_at,
    }))
}

// ── 물상도 목록용 가벼운 요약 (화풍 · 그림 유무만) ──
//   목록에서 result_data 전체(해설 포함)를 실으면 무거우므로,
//   물상도 보관함에서만 따로 불러 화풍과 그림 유무를 표시한다.
export interface MulsangSummary { style: string | null; hasImage: boolean }

export async function loadMulsangSummaries(
  ids: string[]
): Promise<Record<string, MulsangSummary>> {
  const out: Record<string, MulsangSummary> = {}
  if (ids.length === 0) return out
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return out

  const { data, error } = await supabase
    .from('saju_records')
    .select('id, result_data')
    .eq('user_id', uid)
    .in('id', ids)

  if (error || !data) return out

  for (const r of data) {
    const rd = r.result_data as { images?: { style?: string; imageUrl?: string }[] } | null
    const first = rd?.images?.[0]
    out[r.id] = {
      style: first?.style ?? null,
      hasImage: !!first?.imageUrl,
    }
  }
  return out
}

// ── 하나 불러오기 (보관함 카드 눌러 다시보기용 — 결과 스냅샷 로드) ──
export async function getRecord(id: string): Promise<SajuRecord | null> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return null

  const { data, error } = await supabase
    .from('saju_records')
    .select('id, service_type, title, relation, input_data, result_data, created_at')
    .eq('user_id', uid)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return {
    id: data.id,
    serviceType: data.service_type,
    title: data.title,
    relation: data.relation ?? undefined,
    inputData: data.input_data as SavedInputData,
    resultData: data.result_data ?? undefined,
    createdAt: data.created_at,
  }
}

// ── 삭제 ──
export async function deleteRecord(id: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return false
  const { error } = await supabase.from('saju_records').delete().eq('user_id', uid).eq('id', id)
  return !error
}

// ── 새 기록 저장 ──
export async function saveRecord(args: {
  serviceType: string
  title: string
  relation?: string
  inputData: SavedInputData
  resultData?: unknown
}): Promise<{ ok: boolean; id?: string; message?: string }> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return { ok: false, message: '로그인이 필요해요' }

  const { data, error } = await supabase
    .from('saju_records')
    .insert({
      user_id: uid,
      service_type: args.serviceType,
      title: args.title,
      relation: args.relation ?? null,
      input_data: args.inputData,
      result_data: args.resultData ?? null,
    })
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  return { ok: true, id: data?.id }
}

// ── "N일 전" 표시용 ──
export function daysAgoLabel(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24))
  if (days <= 0) return '오늘'
  if (days === 1) return '어제'
  return `${days}일 전`
}
