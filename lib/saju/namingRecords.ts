// lib/saju/namingRecords.ts
// ============================================================================
// 개명(이름풀이) 전용 기록(보관함) 로직 — 내 이름 + 남(가족·지인) 이름풀이 저장/조회.
// ----------------------------------------------------------------------------
// 사주·타로·택일과 동일한 "보관함 관문" 패턴을 개명에 맞게 옮겼다.
//   - saju_records 테이블 재사용, service_type='naming'
//   - 개명은 "사람 + 이름"이 붙는다 → input_data 에 사람 생년월일 + 뽑은 한자를 담는다.
//   - input_data(jsonb): person(생년월일시·성별) · relation(관계) · chars(한자 글자들)
//   - result_data(jsonb): 풀이 스냅샷(result 채점 + commentary 해설) — 다시보기 시 재계산·AI 재호출 없음.
//   - title = 이름(한글) / relation = 관계(self/부인/자녀/지인 등) → 목록·집계에서 바로 구분.
//
// [로그인 아이디 기준으로 정보가 이어짐]
//   저장·조회 모두 auth.getUser()의 user_id로 묶는다.
//   → 고객은 어느 기기에서든 자기 기록을 보고,
//     운영은 user_id·relation 으로 "누구 이름을 봤나" 트렌드를 집계할 수 있다.
//
// 대규모 조회: user_id + service_type='naming' 복합 인덱스
//   (idx_saju_records_user_service_created)를 그대로 탄다 — 추가 SQL 불필요.
//
// [주의] 기존 my_names 테이블 저장은 그대로 유지한다(마이페이지·개명 갈래·상담사
//   파이프라인이 참조). 이 파일은 saju_records 쪽 신규 보관함만 담당한다(병행).
// ============================================================================

import { supabase } from '@/lib/supabase'
import type { DiagnoseResult, NameChar } from '@/lib/saju/naming'

// 관계 배지 색 (보관함 목록 표시용, 피치톤 계열)
//   그룹 단위로만 색을 준다(인연/가족·자녀/사회/본인) — 관계 종류가 많아도 한눈에.
export const NAMING_RELATION_COLOR: Record<string, string> = {
  self:  '#96502e',   // 본인
  love:  '#c8506e',   // 연인·배우자 계열
  child: '#3c82a0',   // 자녀·손주
  family:'#b46e46',   // 부모·형제·친척
  social:'#8c6ea0',   // 친구·지인·직장
  etc:   '#96502e',
}

// relation(관계 문자열) → 색 그룹 키
export function namingRelationGroup(relation: string): keyof typeof NAMING_RELATION_COLOR {
  if (!relation || relation === 'self' || relation === '본인') return 'self'
  if (['연인', '썸남/썸녀', '전연인', '배우자', '전배우자'].includes(relation)) return 'love'
  if (['자녀', '손주'].includes(relation)) return 'child'
  if (['부모', '형제/자매', '조부모', '며느리/사위', '친척'].includes(relation)) return 'family'
  if (['친구', '지인', '직장동료', '상사/부하', '동업자/파트너'].includes(relation)) return 'social'
  return 'etc'
}

// 관계 배지에 보여줄 짧은 라벨 (self → '본인')
export function namingRelationLabel(relation: string): string {
  if (!relation || relation === 'self') return '본인'
  return relation
}

// 진단 대상 사람의 생년월일 정보 (saju_records input_data.person)
export interface NamingPerson {
  gender: string
  calType: string
  year: string
  month: string
  day: string
  leapMonth: string
  hour: string        // '0'~'11' 또는 '모름'
}

// input_data(jsonb)에 담는 형태
interface NamingInputBlob {
  person: NamingPerson | null   // 진단한 사람의 사주 입력값 (내 것이면 profiles 값)
  relation: string              // self | 관계
  chars: (NameChar | null)[]    // 뽑은 한자 글자들 (성 + 이름)
}

// 결과 해설 스냅샷 (result_data)
export interface NamingResultSnapshot {
  result: DiagnoseResult
  commentary: {
    title: string
    summary: string
    good: string
    improve: string
    advice: string
  } | null
}

// 보관함 카드 한 줄에 필요한 요약
export interface NamingRecord {
  id: string
  hangulName: string           // 홍길동
  hanjaName: string            // 洪吉東
  relation: string             // self | 부인 | 자녀 ...
  overallGrade: string         // 좋음 | 보통 | 아쉬움 ('' 가능)
  chars: (NameChar | null)[]
  person: NamingPerson | null
  createdAt: string            // ISO
  snapshot?: NamingResultSnapshot   // 다시보기 시 로드
}

// chars → 한글/한자 이름 문자열
function namesFromChars(chars: (NameChar | null)[]): { hangul: string; hanja: string } {
  const picked = chars.filter(Boolean) as NameChar[]
  return {
    hangul: picked.map(c => c.hangul).join(''),
    hanja: picked.map(c => c.hanja).join(''),
  }
}

// ── 저장 (결과가 나오면 자동 저장) ──
export async function saveNamingRecord(args: {
  chars: (NameChar | null)[]
  relation: string                 // self | 관계
  person: NamingPerson | null
  result: DiagnoseResult
  commentary: NamingResultSnapshot['commentary']
  serviceType?: string             // 'naming'(개명, 기본) | 'newborn'(아기)
}): Promise<{ ok: boolean; id?: string; message?: string }> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return { ok: false, message: '로그인이 필요해요' }

  const { hangul, hanja } = namesFromChars(args.chars)

  const blob: NamingInputBlob = {
    person: args.person,
    relation: args.relation || 'self',
    chars: args.chars,
  }
  const snapshot: NamingResultSnapshot = {
    result: args.result,
    commentary: args.commentary,
  }

  const { data, error } = await supabase
    .from('saju_records')
    .insert({
      user_id: uid,
      // 개명='naming' / 아기='newborn' — 보관함이 서비스별로 분리 조회된다.
      service_type: args.serviceType || 'naming',
      // title 에 이름을 넣어 목록에서 바로 보인다 (한자 우선, 없으면 한글).
      title: hanja || hangul || '무제',
      // relation 칸에 관계를 넣어 목록·트렌드 집계에서 바로 구분.
      relation: args.relation || 'self',
      input_data: blob,
      result_data: snapshot,
    })
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  return { ok: true, id: data?.id }
}

// DB row → NamingRecord 변환
function toRecord(r: {
  id: string; relation: string | null; title: string;
  input_data: unknown; result_data: unknown; created_at: string;
}): NamingRecord | null {
  const blob = r.input_data as NamingInputBlob | null
  const chars = blob && Array.isArray(blob.chars) ? blob.chars : []
  const { hangul, hanja } = namesFromChars(chars)
  const snap = r.result_data as NamingResultSnapshot | null
  const grade = snap?.result?.overallGrade ?? ''
  return {
    id: r.id,
    hangulName: hangul,
    hanjaName: hanja || r.title || '',
    relation: blob?.relation ?? r.relation ?? 'self',
    overallGrade: grade,
    chars,
    person: blob?.person ?? null,
    createdAt: r.created_at,
    snapshot: snap ?? undefined,
  }
}

// ── 목록 (내 이름풀이 기록, 최신순) ──
//   [대규모] 목록은 result_data(해설 전체)를 가져오지 않는다 — 가볍게.
//   해설 스냅샷은 카드를 눌러 다시보기(getNamingRecord)할 때만 내려받는다.
//   단, 목록에서 종합등급을 보여주려고 result_data 를 살짝 실으면 무거워지므로,
//   등급은 저장 시 title 뒤가 아니라 다시보기에서만 확정 표시한다.
export async function listNamingRecords(serviceType: string = 'naming'): Promise<NamingRecord[]> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return []

  const { data, error } = await supabase
    .from('saju_records')
    .select('id, relation, title, input_data, created_at')
    .eq('user_id', uid)
    .eq('service_type', serviceType)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data
    .map(r => toRecord({ ...r, result_data: undefined }))
    .filter((x): x is NamingRecord => x !== null)
    // ⚠️ 같은 service_type='naming' 에는 "사람만 등록된 레코드"(새 사람 추가 시,
    //    한자 없음)와 "실제 이름풀이 결과"(한자 모두 넣어 해설까지 나온 것)가
    //    함께 담긴다. 보관함에는 한자를 다 넣어 완성된 이름풀이만 보여준다.
    //    → 한 사람이 여러 한자로 여러 번 풀었으면 그 각각이 다 목록에 뜬다.
    .filter(r => {
      const filled = r.chars.filter(Boolean) as NameChar[]
      // 성+이름 최소 2글자 이상 & 모든 글자에 한자가 채워졌을 때만 = 완성된 이름풀이
      return filled.length >= 2 && filled.every(c => !!c.hanja)
    })
}

// ── 하나 불러오기 (보관함 카드 눌러 다시보기 — 해설 스냅샷 포함) ──
export async function getNamingRecord(id: string): Promise<NamingRecord | null> {
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
export async function deleteNamingRecord(id: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return false
  const { error } = await supabase.from('saju_records').delete().eq('user_id', uid).eq('id', id)
  return !error
}

// ── 관계 트렌드 집계 (내 기록 기준) ──
//   운영/마케팅용. "이 회원이 누구 이름을 봤나(본인·자녀·배우자…)" relation별 건수.
//   ※ 전체 회원 트렌드(관리자 대시보드)는 서버에서 user_id 필터 없이 별도 집계 예정.
export async function myNamingRelationStats(): Promise<Record<string, number>> {
  const list = await listNamingRecords()
  const stats: Record<string, number> = {}
  for (const r of list) {
    const g = namingRelationGroup(r.relation)
    stats[g] = (stats[g] ?? 0) + 1
  }
  return stats
}

// "N일 전" 표기 (사주·타로·택일과 동일)
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
