// lib/saju/pinnedServices.ts
// ============================================================================
// 홈 서비스 리스트의 "찜(압핀)" 저장·조회·토글 헬퍼.
// ----------------------------------------------------------------------------
// 방침:
//   - 로그인 회원만 찜 가능. 비회원이 압핀을 누르면 화면에서 로그인 안내.
//   - 저장은 saju_records 테이블에 service_type='pinned' 로. (추가 테이블 불필요)
//       title = 서비스 이름(예: '사주', '연인궁합')  ← 어떤 서비스를 찜했는지
//   - 최대 2개. 3개째는 막고 false 반환(화면이 안내).
//
// saju_records 컬럼(기존): id, user_id, service_type, title, relation,
//   input_data(jsonb), result_data(jsonb), created_at
//   → 찜은 사람 사주가 아니므로 input_data/result_data 는 빈 객체로 둔다.
// ============================================================================

import { supabase } from '@/lib/supabase'

export const MAX_PINS = 2

// 찜한 서비스 이름 목록 조회 (오래된 순 = 찜한 순서)
export async function listPinnedServices(): Promise<string[]> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return []
  const { data, error } = await supabase
    .from('saju_records')
    .select('title, created_at')
    .eq('user_id', u.user.id)
    .eq('service_type', 'pinned')
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data.map((r) => r.title).filter(Boolean) as string[]
}

// 찜 토글. 반환값:
//   { ok: true,  pinned: true  }  → 방금 찜함
//   { ok: true,  pinned: false }  → 방금 해제함
//   { ok: false, reason: 'guest' }     → 비회원 (로그인 필요)
//   { ok: false, reason: 'max' }       → 이미 2개라 더 못 함
export type PinResult =
  | { ok: true; pinned: boolean }
  | { ok: false; reason: 'guest' | 'max' | 'error' }

export async function togglePinnedService(serviceName: string): Promise<PinResult> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return { ok: false, reason: 'guest' }
  const uid = u.user.id

  // 이미 찜돼 있으면 해제
  const { data: existing } = await supabase
    .from('saju_records')
    .select('id')
    .eq('user_id', uid)
    .eq('service_type', 'pinned')
    .eq('title', serviceName)
    .limit(1)

  if (existing && existing.length > 0) {
    const { error } = await supabase.from('saju_records').delete().eq('id', existing[0].id)
    if (error) return { ok: false, reason: 'error' }
    return { ok: true, pinned: false }
  }

  // 새로 찜 — 개수 제한 확인
  const { count } = await supabase
    .from('saju_records')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)
    .eq('service_type', 'pinned')
  if ((count ?? 0) >= MAX_PINS) return { ok: false, reason: 'max' }

  const { error } = await supabase.from('saju_records').insert({
    user_id: uid,
    service_type: 'pinned',
    title: serviceName,
    relation: '',
    input_data: {},
    result_data: {},
  })
  if (error) return { ok: false, reason: 'error' }
  return { ok: true, pinned: true }
}
