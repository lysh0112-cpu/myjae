// lib/saju/hanjaRow.ts
// 한자 사전(Supabase `hanja` 표) 읽기 — ★단일 창구
//
// ══════════════════════════════════════════════════════════════════
//  [왜 이 파일이 생겼나]  2026-07-30 · 3단계
//
//    `HanjaRow` 타입과 select 문이 **세 벌** 흩어져 있었습니다.
//        app/manseryeok/naming/diagnosis/page.tsx:30
//        app/manseryeok/naming/rename/hanja/page.tsx:22
//        app/manseryeok/naming/rename/newhanja/page.tsx:30
//    그래서 세 화면이 «같은 표를 다르게» 읽고 있었습니다 —
//        · diagnosis 만 grade 를 select 했고, 개명 화면 둘은 안 했습니다
//        · ★그래서 개명 화면 둘은 «不用»(불용한자 947건)을 «전혀 거르지 않았습니다»
//          손님에게 인명에 쓸 수 없는 글자를 추천하고 있었던 것입니다
//
//  [그리고 2단계 DB 컬럼을 읽어야 합니다]
//        resource_ohaeng_primary   표준 표기(목|화|토|금|수)
//        resource_ohaeng_secondary 부 자원오행
//        strokes_kangxi            강희 원획 (수리·음양 계산 기준)
//        is_name_use               불용 여부 (grade 문자열 비교 대체)
//
//  ⚠️⚠️ **가장 중요 — 마이그레이션 «전에도» 돌아야 합니다.**
//    Supabase 는 없는 컬럼을 select 하면 **400 으로 통째로 실패** 합니다.
//    그래서 컬럼 이름을 나열하지 않고 `*` 로 받고, 아래 읽기 함수들이
//    «새 컬럼이 있으면 그것을, 없으면 옛 컬럼을» 씁니다.
//    → SQL 을 먼저 돌려도, 코드를 먼저 올려도 안 깨집니다.
//    ★컬럼 이름을 다시 나열하고 싶어지면 마이그레이션이 «모든 환경에»
//      들어갔는지 먼저 확인하십시오. (개발·스테이징·운영)
// ══════════════════════════════════════════════════════════════════

import { normalizeOhaeng, cleanHanja, type Ohaeng } from './ohaeng'

/**
 * `hanja` 표 한 줄.
 * ⚠️ 새 컬럼은 전부 선택값입니다 — 마이그레이션 전에는 없습니다.
 */
export interface HanjaRow {
  // ── 옛 컬럼 (언제나 있음) ──
  hangul: string
  hanja: string
  meaning: string
  strokes: number
  /** 원본 표기. 덕암 자료는 «한자»(木火土金水) 입니다. ★판정에 직접 쓰지 마십시오 */
  resource_ohaeng: string
  /** ⚠️ 코드는 이 값을 읽지 않습니다 — naming.ts 가 초성에서 계산합니다 */
  sound_ohaeng?: string
  avoid_hard?: boolean
  avoid_soft?: boolean
  /** 자의품격 大吉|中吉|小吉|不用 */
  grade?: string

  // ── 2단계 신설 컬럼 (마이그레이션 뒤에만 있음) ──
  resource_ohaeng_primary?: string | null
  resource_ohaeng_secondary?: string | null
  radical?: string | null
  radical_ohaeng?: string | null
  meaning_ohaeng?: string | null
  resource_basis?: string | null
  resource_confidence?: number | null
  strokes_kangxi?: number | null
  strokes_actual?: number | null
  is_name_use?: boolean | null
  is_active?: boolean | null
  review_note?: string | null

  /** id 는 표에 있으나 화면이 쓰지 않습니다 */
  id?: string | number
}

/**
 * ★select 에 쓸 컬럼 목록.
 * ⚠️ `*` 입니다. 이름을 나열하면 마이그레이션 «전» 에 400 으로 죽습니다.
 *    한자 한 줄은 열 몇 칸이라 `*` 로 받아도 무게가 없습니다.
 */
export const HANJA_SELECT = '*'

// ══════════════════════════════════════════════════════════════════
//  읽기 함수 — «새 컬럼이 있으면 그것을, 없으면 옛 컬럼을»
// ══════════════════════════════════════════════════════════════════

/**
 * 주 자원오행. 표준 표기(목|화|토|금|수) 또는 null.
 *
 *   마이그레이션 뒤 : resource_ohaeng_primary ('목')      → 그대로
 *   마이그레이션 전 : resource_ohaeng ('木') → 정규화      → '목'
 *
 * ⚠️ null 을 '기타' 로 뭉개지 마십시오. 부르는 쪽이 «모름» 을 알아야 합니다.
 */
export function rowOhaeng(row: HanjaRow): Ohaeng | null {
  return normalizeOhaeng(row.resource_ohaeng_primary) ?? normalizeOhaeng(row.resource_ohaeng)
}

/** 부 자원오행. 없으면 null (마이그레이션 전에는 언제나 null) */
export function rowOhaengSecondary(row: HanjaRow): Ohaeng | null {
  return normalizeOhaeng(row.resource_ohaeng_secondary)
}

/**
 * 획수 — ★수리 4격과 음양은 «원획법» 으로 셉니다.
 *
 * ⚠️ strokes_kangxi 가 0 이나 음수면 믿지 않고 strokes 로 돌아갑니다.
 *    마이그레이션 STEP 4 가 채우지 않은 채 컬럼만 만들면 NULL 인데,
 *    그때 0 으로 읽으면 수리 4격이 통째로 깨집니다.
 */
export function rowStrokes(row: HanjaRow): number {
  const k = row.strokes_kangxi
  if (typeof k === 'number' && Number.isFinite(k) && k > 0) return k
  return Number(row.strokes) || 0
}

/**
 * 인명에 쓸 수 있는가.
 *
 *   마이그레이션 뒤 : is_name_use 를 그대로
 *   마이그레이션 전 : grade !== '不用' 로 판단 (지금 코드와 같은 잣대)
 *
 * ⚠️ grade 가 «없으면»(개명 화면들은 select 하지 않았습니다) true 로 봅니다.
 *    ★이제 HANJA_SELECT='*' 로 받으므로 grade 가 언제나 옵니다.
 *      그래서 마이그레이션 전에도 개명 화면이 不用 을 거르게 됩니다.
 */
export function rowNameUse(row: HanjaRow): boolean {
  if (typeof row.is_name_use === 'boolean') return row.is_name_use
  if (typeof row.grade === 'string') return row.grade.trim() !== '不用'
  return true
}

/** 목록에 낼 줄인가 (중복으로 «쉬게» 한 줄을 제외) */
export function rowActive(row: HanjaRow): boolean {
  return row.is_active !== false
}

/** 한자 글자 — 공백·비가시문자를 걷어냅니다 (덕암 자료 행 5002 의 `' 熺'`) */
export function rowHanja(row: HanjaRow): string {
  return cleanHanja(row.hanja) || row.hanja
}

// ══════════════════════════════════════════════════════════════════
//  걸러내기 — ★세 화면이 «같은 잣대» 를 쓰게 합니다 (교훈 CJ)
// ══════════════════════════════════════════════════════════════════

/**
 * 뜻이 좋지 않아 인명에 피하는 글자들.
 * ⚠️ diagnosis/page.tsx 에만 있던 표를 여기로 옮겼습니다.
 *    개명 화면 둘은 이 그물이 «없었습니다».
 */
export const AVOID_KEYWORDS = [
  '죽을', '죽일', '주검', '시체', '시신', '송장', '애도', '슬플', '슬픔',
  '근심', '걱정', '병', '앓을', '아플', '악할', '흉할', '흉', '재앙', '재난',
  '천할', '천박', '종', '노예', '놈', '도둑', '도적', '귀신', '미칠', '미치광이',
  '어리석을', '간사할', '간교', '허물', '꺾을', '무너질', '망할', '멸할',
  '원수', '저주', '독', '괴로울', '비참', '울', '눈물', '한숨',
]

export interface AvoidReason {
  avoid: boolean
  /** 왜 걸렀는가 — 진단용. 손님 화면에 그대로 쓰지 마십시오 */
  why: 'avoid_hard' | 'not_name_use' | 'meaning' | 'inactive' | null
}

/**
 * 이 글자를 손님에게 내지 않을 것인가.
 *
 * ★세 화면이 이 함수 하나를 씁니다. 전에는 —
 *     diagnosis        avoid_hard + 不用 + 뜻
 *     rename/hanja     avoid_hard 만          ← 不用 947건이 그대로 나갔습니다
 *     rename/newhanja  avoid_hard 만          ← 같음
 */
export function avoidReason(row: HanjaRow): AvoidReason {
  if (row.avoid_hard === true) return { avoid: true, why: 'avoid_hard' }
  if (!rowActive(row)) return { avoid: true, why: 'inactive' }
  if (!rowNameUse(row)) return { avoid: true, why: 'not_name_use' }
  const m = row.meaning || ''
  if (AVOID_KEYWORDS.some(k => m.includes(k))) return { avoid: true, why: 'meaning' }
  return { avoid: false, why: null }
}

/** 짧은 형태 */
export function isAvoidChar(row: HanjaRow): boolean {
  return avoidReason(row).avoid
}

// ══════════════════════════════════════════════════════════════════
//  변환 — 판정 엔진에 넘기는 모양
// ══════════════════════════════════════════════════════════════════

/** naming.ts 의 NameChar 모양 (resourceOhaeng 이 string) */
export interface NameCharLike {
  hangul: string
  hanja: string
  strokes: number
  resourceOhaeng: string
  meaning?: string
}

/** DB 한 줄 → NameChar (옛 엔진 diagnoseName 용) */
export function toNameChar(row: HanjaRow): NameCharLike {
  return {
    hangul: row.hangul,
    hanja: rowHanja(row),
    strokes: rowStrokes(row),
    resourceOhaeng: rowOhaeng(row) ?? '',
    meaning: row.meaning,
  }
}

/** DB 한 줄 → JudgeChar (2단계 엔진 judgeResource 용) */
export function toJudgeChar(row: HanjaRow): {
  hanja: string; hangul: string; primary: Ohaeng | null; secondary: Ohaeng | null
} {
  return {
    hanja: rowHanja(row),
    hangul: row.hangul,
    primary: rowOhaeng(row),
    secondary: rowOhaengSecondary(row),
  }
}

// ══════════════════════════════════════════════════════════════════
//  진단 — 어느 컬럼을 읽고 있는가
// ══════════════════════════════════════════════════════════════════

/**
 * 마이그레이션이 «들어왔는가» 를 한 줄로 알려 줍니다.
 * ★16-verify-naming.ts 와 진단 화면에서 씁니다.
 *   컬럼을 만들었다고 코드가 쓰는 것이 아니므로, 실제로 읽히는지 눈으로 봐야 합니다.
 */
export function describeRowSource(row: HanjaRow): string {
  const parts: string[] = []
  parts.push(row.resource_ohaeng_primary != null
    ? `자원오행=resource_ohaeng_primary('${row.resource_ohaeng_primary}')`
    : `자원오행=resource_ohaeng('${row.resource_ohaeng}')→정규화`)
  parts.push(typeof row.strokes_kangxi === 'number' && row.strokes_kangxi > 0
    ? `획수=strokes_kangxi(${row.strokes_kangxi})`
    : `획수=strokes(${row.strokes})`)
  parts.push(typeof row.is_name_use === 'boolean'
    ? `불용=is_name_use(${row.is_name_use})`
    : `불용=grade('${row.grade ?? ''}')`)
  return parts.join(' · ')
}
