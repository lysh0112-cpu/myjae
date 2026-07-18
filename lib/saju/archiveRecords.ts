// lib/saju/archiveRecords.ts
// ============================================================================
// 나의 운명 아카이브 — 홈의 모든 서비스에서 "저장"한 기록을 한 리스트로.
// ----------------------------------------------------------------------------
//   - 모든 서비스가 이미 saju_records 한 테이블에 service_type만 달리 저장한다.
//     (사주/대운/세운/내사주그림/연애·부부궁합/타로/결혼·출산택일/개명 등)
//   - 여기서는 user_id로 "전 service_type"을 최신순으로 한 번에 긁는다.
//     기존 idx_saju_records_user_service_created 인덱스를 그대로 탄다.
//   - 각 카드는 service_type으로 배지(라벨·색)를 붙이고,
//     "다시보기"는 각 서비스가 이미 쓰는 recordId URL 규칙으로 연결한다.
//   - 상담 내역(consultations)은 여기 포함하지 않는다(별도 영역 유지).
//
// [삭제] deleteArchiveRecord = saju_records에서 그 행(id)을 지운다.
//   각 서비스 보관함(couple-storage 등)과 완전히 같은 행이라 자동 연동된다.
//   (B방식 키워드 보관 훅은 userInterests.ts에서 삭제 직전에 호출)
// ============================================================================

import { supabase } from '@/lib/supabase'

export interface ArchiveItem {
  id: string
  serviceType: string
  title: string | null
  relation: string | null       // 카테고리/관심사 (고민 통계용)
  inputData: Record<string, unknown> | null   // 사람 정보 (다시보기 URL 구성용)
  resultData: unknown           // 저장 스냅샷 (아코디언 펼침용)
  createdAt: string
}

// service_type → 배지 라벨·색 (피치톤 계열 + 서비스별 포인트)
interface Badge { label: string; bg: string; fg: string }
const BADGES: Record<string, Badge> = {
  saju:     { label: '사주',       bg: '#f0eafa', fg: '#6a4a9c' },
  daeun:    { label: '대운',       bg: '#e6eef5', fg: '#2f5f80' },
  seyun:    { label: '연월운세',   bg: '#f3ecdf', fg: '#8a6a3c' },
  mulsang:  { label: '내사주그림', bg: '#fbeee4', fg: '#a55a2c' },
  couple:   { label: '연애궁합',   bg: '#fbeaf0', fg: '#993556' },
  married:  { label: '부부궁합',   bg: '#f8e8ee', fg: '#8a3556' },
  tarot:    { label: '타로',       bg: '#f0eafa', fg: '#6a4a9c' },
  wedding:  { label: '결혼택일',   bg: '#e9f2ea', fg: '#3b6d3b' },
  birth:    { label: '출산택일',   bg: '#e9f2ea', fg: '#3b6d3b' },
  naming:   { label: '개명',       bg: '#f3ecdf', fg: '#8a6a3c' },
  expert:   { label: '만세력',     bg: '#eceae4', fg: '#6a6258' },
}

export function badgeOf(serviceType: string): Badge {
  return BADGES[serviceType] || { label: serviceType, bg: '#eceae4', fg: '#6a6258' }
}

// 다시보기 URL — 각 서비스가 이미 쓰는 recordId 규칙을 그대로 사용.
// input_data에서 필요한 값(mode 등)을 꺼내 붙인다.
// 사람 정보(input_data) → result-new가 읽는 URL 쿼리 (saju-storage의 personToQuery와 동일)
function personToQuery(d: Record<string, unknown> | null, name: string | null): string {
  if (!d) return name ? `name=${encodeURIComponent(name)}` : ''
  const p = new URLSearchParams()
  const g = (k: string) => (d[k] == null ? '' : String(d[k]))
  if (g('year')) p.set('year', g('year'))
  if (g('month')) p.set('month', g('month'))
  if (g('day')) p.set('day', g('day'))
  if (g('gender')) p.set('gender', g('gender'))
  if (g('calType')) p.set('calType', g('calType'))
  p.set('leapMonth', g('leapMonth') || '0')
  p.set('hour', g('hour') || '모름')
  if (name) p.set('name', name)
  return p.toString()
}

export function reviewUrl(item: ArchiveItem): string {
  const rid = item.id
  const st = item.serviceType
  const from = 'from=mypage'   // 뒤로가기 시 마이페이지로
  const q = personToQuery(item.inputData, item.title)
  const qs = q ? `${q}&` : ''
  switch (st) {
    case 'couple':
    case 'married':
      return `/manseryeok/couple-result-new?mode=${st === 'married' ? 'married' : 'couple'}&recordId=${rid}&${from}`
    case 'mulsang':
      return `/manseryeok/mulsang?recordId=${rid}&${from}`
    case 'tarot':
      return `/tarot?recordId=${rid}&${from}`
    case 'naming':
      return `/manseryeok/naming/diagnosis?recordId=${rid}&${from}`
    case 'wedding':
      return `/manseryeok/wedding-timing/result?${qs}recordId=${rid}&${from}`
    case 'birth':
      return `/manseryeok/birth-timing/result?${qs}recordId=${rid}&${from}`
    case 'daeun':
      return `/manseryeok/result-new?${qs}unse=daeun&recordId=${rid}&${from}`
    case 'seyun':
      return `/manseryeok/result-new?${qs}unse=seyun&recordId=${rid}&${from}`
    case 'saju':
    default:
      return `/manseryeok/result-new?${qs}recordId=${rid}&${from}`
  }
}

async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

// 아카이브 리스트에 표시할 service_type (혼자 조회·저장한 것만; 상담 제외)
const ARCHIVE_TYPES = [
  'saju', 'daeun', 'seyun', 'mulsang',
  'couple', 'married', 'tarot',
  'wedding', 'birth', 'naming',
]

// 전 서비스 통합 조회 (최신순). limit로 페이지네이션 가능.
export async function listArchive(limit = 50, offset = 0): Promise<ArchiveItem[]> {
  const user_id = await uid()
  if (!user_id) return []
  const { data, error } = await supabase
    .from('saju_records')
    .select('id, service_type, title, relation, input_data, result_data, created_at')
    .eq('user_id', user_id)
    .in('service_type', ARCHIVE_TYPES)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error || !data) {
    if (error) console.error('[archive] list error', error.message)
    return []
  }
  return data.map((r) => ({
    id: r.id,
    serviceType: r.service_type,
    title: r.title,
    relation: r.relation,
    inputData: (r.input_data as Record<string, unknown>) || null,
    resultData: r.result_data,
    createdAt: r.created_at,
  }))
}

// 아카이브 개수(요약 표시용)
export async function countArchive(): Promise<number> {
  const user_id = await uid()
  if (!user_id) return 0
  const { count, error } = await supabase
    .from('saju_records')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user_id)
    .in('service_type', ARCHIVE_TYPES)
  if (error || count == null) return 0
  return count
}

// 카테고리(relation)별 집계 — 고민 통계 태그 칩용. [{tag, count}] 최신 많은 순.
export async function tagCounts(): Promise<{ tag: string; count: number }[]> {
  const items = await listArchive(300, 0)
  const map = new Map<string, number>()
  for (const it of items) {
    let tag = (it.relation || '').trim()
    if (!tag) continue
    if (tag === 'self') tag = '본인'   // 화면 표시용 라벨(저장값은 그대로 self)
    map.set(tag, (map.get(tag) || 0) + 1)
  }
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

// 삭제 — saju_records에서 해당 행 제거(각 서비스 보관함과 자동 연동).
// B방식: 삭제 직전 키워드 보관은 호출부(page)에서 userInterests.archiveKeyword를 먼저 호출.
export async function deleteArchiveRecord(id: string): Promise<boolean> {
  const user_id = await uid()
  if (!user_id) return false
  const { error } = await supabase
    .from('saju_records')
    .delete()
    .eq('user_id', user_id)
    .eq('id', id)
  if (error) {
    console.error('[archive] delete error', error.message)
    return false
  }
  return true
}
