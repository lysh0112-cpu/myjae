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
// ★2026-07-30 (3단계-e) — 특수 피함 규칙 (숫자·간지·동자이음·서열)
import { checkSpecialAvoidRules, type UserContext } from './checkSpecialAvoidRules'

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
  /**
   * ★대법원 «인명용 한자» 인가 — 🔴 아직 DB 에 «없는» 칸입니다 (2026-08-01 · 43부)
   *
   * ⚠️ is_name_use 와 «다른 것» 입니다. 헷갈리지 마십시오.
   *     is_name_use  = 작명 기준 — 자의품격 不用 을 거른 것 (우리 판단)
   *     court_name_use = 대법원 인명용 한자표에 실렸는가 (★법)
   *   출생신고·개명신고는 «법» 쪽만 봅니다. 뜻이 좋아도 표에 없으면 못 씁니다.
   *
   * ★이 칸이 들어오면 courtNameUse() 가 «모름» 대신 참·거짓을 냅니다.
   *   그때 화면 안내를 «판정» 으로 올릴 수 있습니다. 코드는 안 고쳐도 됩니다.
   */
  court_name_use?: boolean | null
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

/**
 * ★대법원 인명용 한자인가 — 🔴 «모름(null)» 이 정상입니다 (2026-08-01 · 43부)
 *
 * ══════════════════════════════════════════════════════════════════
 *  [왜 지금은 언제나 «모름» 인가]
 *    hanja 표에 그 칸이 아직 없습니다. 대조할 원본을 받지 못했습니다.
 *
 *  ⚠️⚠️ «모름» 을 true 로 뭉개지 마십시오.
 *     우리 목록(자의품격 기준)이 대법원 표와 «같다는 근거가 없습니다».
 *     같다고 말해 버리면 손님이 출생신고에서 되돌아옵니다 —
 *     이름을 다시 지어야 하고, 그 책임이 우리에게 옵니다.
 *     ★없는 것을 지어내지 않습니다. (교훈 EJ)
 *
 *  [그래서 지금 하는 일]
 *    화면은 «판정» 대신 «확인 권유» 를 냅니다 —
 *      「출생신고에는 대법원 인명용 한자만 쓸 수 있습니다. 한 번 더 확인해 주세요」
 *    ★한자 고르는 화면 둘(newhanja·hanja)과 아기 작명 입구에 있습니다.
 *
 *  [칸이 들어오면]
 *    ① SQL 로 court_name_use 를 채우고
 *    ② listPolicy 에 배지 한 줄을 더하면 됩니다 (거르지는 «마십시오» —
 *       50개 음이 후보 0개가 되던 일이 不用 에서 이미 있었습니다)
 *    ③ 그때 화면 문구를 «권유» 에서 «판정» 으로 올리십시오.
 * ══════════════════════════════════════════════════════════════════
 */
export function courtNameUse(row: HanjaRow): boolean | null {
  return typeof row.court_name_use === 'boolean' ? row.court_name_use : null
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
 * ⚠️⚠️ **목록을 만들 때는 이 함수를 쓰지 마십시오.** `listPolicy()` 를 쓰십시오.
 *    까닭 — 아래 「왜 거르지 않고 표시하나」 를 보십시오.
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
//  ★목록 정책 — «거르기» 가 아니라 «표시하기»
// ══════════════════════════════════════════════════════════════════
//
//  [왜 거르지 않고 표시하나]  2026-07-30 실측
//
//    不用(인명 불가)을 목록에서 «빼면» 어떻게 되는지 DB 로 재봤습니다.
//        전체 8,650자 중 不用 4,486자 (51.9%)
//        485개 음(音) 가운데 —
//            A. 후보 0개   ★50개 음   겁 곪 곯 괴 굄 굅 궤 긱 깁 넉 넘 넣 늠 …
//            B. 1~2개       101개 음
//            C. 3~5개       110개 음
//            D. 6개 이상    224개 음
//
//    ★「괴」·「겁」 같은 음은 그 음의 한자가 «전부» 不用 입니다.
//      (겁 5자 전부 · 괴 15자 전부 · 늠 5자 전부)
//      덕암 자료가 틀린 것이 아니라 그 음의 글자들이 인명에 안 맞는 뜻인 것입니다.
//
//    ⚠️ 그런데 「내 이름 풀이」는 **이미 그 이름을 가진 분이 오는 화면** 입니다.
//       거르면 그분은 한자를 하나도 못 골라 «이름 풀이 보기» 단추가 영영 안 눌립니다.
//       손님 열 명 중 한 명꼴로 화면이 막힙니다.
//
//  [그래서]
//       막는 것    avoid_hard · 쉬는 줄(is_active=false)   — 아주 좁게
//       표시하는 것 不用 · 뜻이 좋지 않은 글자              — 목록엔 남기고 흐리게 + 배지
//       미루는 것   추천 목록에서는 뒤로                    (compareCandidates 의 softPenalty)

export interface ListPolicy {
  /** 목록에 낼 것인가. false 는 «정말로 막는» 것뿐입니다 */
  show: boolean
  /** 흐리게 그릴 것인가 */
  dim: boolean
  /** 배지 문구. 없으면 null */
  badge: string | null
  /** 손님에게 보여 줄 짧은 안내. 없으면 null */
  note: string | null
  /** 추천 정렬에서 뒤로 미는 정도 (0=평범, 클수록 뒤) */
  softPenalty: number
  /** 진단용 */
  why: AvoidReason['why']
  /**
   * ★2026-07-30 (3단계-e) — 특수 규칙 배지(숫자·간지·동자이음).
   *   [왜 따로 두나]  不用 배지와 «다른 축» 입니다. 한 글자가 둘 다일 수 있습니다.
   *     예) 辰(진)은 덕암 中吉(쓸 수 있음)인데 «간지» 라 사주 충돌 주의가 붙습니다.
   *   화면은 badge 를 먼저 그리고, 없으면 specialBadge 를 그리면 됩니다.
   */
  specialBadge: string | null
  /** 특수 규칙 해설들 — 감정서용 */
  specialNotes: string[]
}

/**
 * ★목록을 만들 때는 이 함수를 쓰십시오.
 *
 *   const rows = data.filter(r => listPolicy(r).show)
 *   // 그리고 그릴 때 dim·badge 를 함께 씁니다
 */
export function listPolicy(row: HanjaRow, ctx?: UserContext): ListPolicy {
  const blocked = (why: AvoidReason['why']): ListPolicy => ({
    show: false, dim: true, badge: null, note: null, softPenalty: 100, why,
    specialBadge: null, specialNotes: [],
  })

  // ── 정말로 막는 것 ──
  if (row.avoid_hard === true) return blocked('avoid_hard')
  if (!rowActive(row)) return blocked('inactive')

  // ── ★특수 규칙 (숫자·간지·동자이음·서열) — «다른 축» 이라 함께 봅니다 ──
  //   예) 辰(진)은 덕암 中吉(쓸 수 있음)인데 간지라 「사주 충돌 주의」가 붙습니다.
  //   ⚠️ 막지 않습니다. 감점과 배지만 더합니다.
  const sp = checkSpecialAvoidRules(rowHanja(row), ctx)

  // ── 보여 주되 표시하는 것 ──
  if (!rowNameUse(row)) {
    return {
      show: true, dim: true,
      badge: '인명 권장 안 함',
      note: '이름에 잘 쓰지 않는 글자로 봅니다. 이미 쓰고 계신 이름이라면 그대로 풀이해 드립니다.',
      softPenalty: 40 + sp.penalty, why: 'not_name_use',
      specialBadge: sp.badgeLabel, specialNotes: sp.descriptions,
    }
  }
  const m = row.meaning || ''
  if (AVOID_KEYWORDS.some(k => m.includes(k))) {
    return {
      show: true, dim: true,
      badge: '뜻 확인',
      note: '뜻에 무거운 낱말이 들어 있습니다. 한 번 살펴보시면 좋겠습니다.',
      softPenalty: 25 + sp.penalty, why: 'meaning',
      specialBadge: sp.badgeLabel, specialNotes: sp.descriptions,
    }
  }
  // ── 특수 규칙에만 걸린 글자 — ★막지도 흐리게 하지도 않습니다 ──
  //   덕암이 «쓸 수 있다» 고 본 글자입니다(辰·丁·寅·元 …). 배지로 알리기만 합니다.
  if (sp.penalty > 0) {
    return {
      show: true, dim: false,
      badge: null, note: null,
      softPenalty: sp.penalty, why: null,
      specialBadge: sp.badgeLabel, specialNotes: sp.descriptions,
    }
  }
  return {
    show: true, dim: false, badge: null, note: null, softPenalty: 0, why: null,
    specialBadge: null, specialNotes: [],
  }
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


// ══════════════════════════════════════════════════════════════════
//  ★2026-07-31 (40부 3차) — 같은 한자가 «몇 가지 음» 으로 실려 있는가
// ══════════════════════════════════════════════════════════════════
//
//  [왜 필요한가]  두음법칙 안내를 «정말 두 음으로 쓰이는 한자» 에만 띄우려고 합니다.
//    글자만 보면 「양」이 梁(량→양)인지 楊(본래 양)인지 알 수 없고,
//    「이」는 李 지만 「리」로 적는 분은 사실상 없습니다.
//    → 글자만 보고 띄우면 이씨·양씨 손님 «전원» 이 쓸모없는 안내를 봅니다.
//
//  ★목록을 새로 만들지 않았습니다. hanja 표가 정답을 갖고 있습니다.
//    표가 좋아지면 안내도 저절로 정확해집니다.

/**
 * `hanja` 표에서 같은 한자의 한글 음을 전부 모읍니다. 실패하면 빈 배열.
 *
 * ⚠️ Supabase 클라이언트 «타입» 을 받지 않습니다 — 흉내 내면 버전마다 깨집니다.
 *    부르는 쪽이 «조회 그 자체» 를 넘기십시오.
 *
 *    const readings = await fetchHanjaReadings(
 *      (h) => supabase.from('hanja').select('hangul').eq('hanja', h), '柳')
 */
export async function fetchHanjaReadings(
  query: (hanja: string) => PromiseLike<{ data: unknown; error: unknown }>,
  hanja: string,
): Promise<string[]> {
  try {
    const { data, error } = await query(hanja)
    if (error || !Array.isArray(data)) return []
    const out = new Set<string>()
    for (const r of data as { hangul?: string }[]) {
      const h = r?.hangul?.trim()
      if (h) out.add(h)
    }
    return [...out]
  } catch {
    return []
  }
}
