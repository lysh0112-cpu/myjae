// lib/saju/resourceJudge.ts
// 자원오행 통합 판정 — 사주 프로필(용신·희신·기신·구신·한신 + 과다/결핍)과 대조
//
// ══════════════════════════════════════════════════════════════════
//  [왜 이 파일이 생겼나]  2026-07-30 · 2단계
//
//    1단계는 «표기» 를 맞췄습니다(木 → 목). 2단계는 «판정» 을 맞춥니다.
//
//    옛 naming.ts 의 자원오행 판정에는 이런 구멍이 있었습니다 —
//      ① 상극을 감점하지 않았습니다. links 에 '극' 라벨만 남고 saeng 만 셌습니다.
//         → 木剋土(상극) · 木→水(무관) · 木·木(비화) 가 점수상 완전히 같았습니다.
//      ② 상생의 «방향» 을 무시했습니다. isSaeng 이 양방향이라
//         木生火(성이 이름을 낳음)와 火←木(역생)이 같은 1점이었습니다.
//      ③ 과다 오행 중복 투입 경고가 «없었습니다».
//         elementScore 를 facts 로 넘기기만 하고 판정하지 않았습니다.
//         simsanOhaeng.grade() 가 결핍/약함/발달/과다를 이미 주는데 부르지 않았습니다.
//      ④ 기신(忌神)·구신(仇神)·한신(閑神)을 «버렸습니다».
//         calcYongsinCompat 이 주는데 naming 은 yongsin·heeksin·score 셋만 받았습니다.
//      ⑤ 경고를 담을 자리가 없었습니다. 반환 타입에 warnings 가 없었습니다.
//
//  [방침은 그대로 지킵니다 — 대표님 지시]
//    ★「좋다/나쁘다」 로 판정하지 않습니다. 화면에 등급을 내지 않습니다.
//      score 는 **내부용** 입니다 — 개명 후보를 줄 세우는 데만 씁니다.
//      손님에게 가는 것은 facts 와 warnings «사실» 이고, 문장은 AI 가 씁니다.
//    ⚠️ warnings 를 그대로 화면에 뿌리지 마십시오. AI 재료입니다. (교훈 AV)
// ══════════════════════════════════════════════════════════════════

import { type Ohaeng, OHAENG_ALL, normalizeOhaeng } from './ohaeng'
import { grade as ohaengGradeOf, type OhaengGrade } from './simsanOhaeng'
import { ohaengOfChar } from './ohaengNature'

// ══════════════════════════════════════════════════════════════════
//  관계 — 방향까지 가립니다
// ══════════════════════════════════════════════════════════════════

const GENERATES: Record<Ohaeng, Ohaeng> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CONTROLS: Record<Ohaeng, Ohaeng> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }

/** 앞 글자(a) → 뒤 글자(b) 로 본 관계 */
export type RelKind = '순생' | '역생' | '순극' | '역극' | '비화' | '모름'

export function relationDirected(a: Ohaeng | null, b: Ohaeng | null): RelKind {
  if (!a || !b) return '모름'
  if (a === b) return '비화'
  if (GENERATES[a] === b) return '순생'   // 앞이 뒤를 낳음 — 성→이름 하향생
  if (GENERATES[b] === a) return '역생'   // 뒤가 앞을 낳음 — 역생
  if (CONTROLS[a] === b) return '순극'    // ★앞이 뒤를 극함. 가장 무겁게 봅니다
  if (CONTROLS[b] === a) return '역극'    // 뒤가 앞을 극함
  return '모름'
}

/** 사람이 읽을 관계 설명 — 화면·프롬프트가 같은 문장을 쓰게 한 곳에 둡니다 (교훈 CJ) */
export function relationText(a: Ohaeng | null, b: Ohaeng | null, rel: RelKind): string {
  if (rel === '모름') return `${a ?? '?'}→${b ?? '?'} 관계를 판정하지 못했습니다`
  const HAN: Record<Ohaeng, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }
  const A = a ? HAN[a] : '?', B = b ? HAN[b] : '?'
  switch (rel) {
    case '순생': return `${A}生${B} — 앞 글자가 뒤 글자를 살립니다`
    case '역생': return `${B}生${A} — 뒤 글자가 앞 글자를 살립니다(역생)`
    case '순극': return `${A}剋${B} — 앞 글자가 뒤 글자를 누릅니다`
    case '역극': return `${B}剋${A} — 뒤 글자가 앞 글자를 누릅니다`
    case '비화': return `${A}·${B} 같은 기운(비화)`
  }
}

/** 관계 하나의 값. ★합이 아니라 «평균» 으로 씁니다 (이름 길이에 등급이 흔들리지 않게) */
const REL_SCORE: Record<RelKind, number> = {
  순생: 2.0,
  비화: 1.0,   // 같은 기운 — 나쁘지 않으나 흐름이 없습니다
  역생: 1.0,   // 상생이지만 방향이 거꾸로
  역극: -1.0,
  순극: -2.0,  // ★성이 이름을 누르는 자리
  모름: 0.0,   // 판정 불가. 0 «이면서» problems 에 남깁니다
}

// ══════════════════════════════════════════════════════════════════
//  배점 — ★바꾸면 개명 «추천 순위» 가 바뀝니다
// ══════════════════════════════════════════════════════════════════
//
// ⚠️ 바꿀 때는 무작위 표본으로 걸림 비율을 다시 재십시오. (교훈 BO)
//    16-verify-naming.ts 가 분포를 찍어 줍니다.
// ══════════════════════════════════════════════════════════════════
//  배점 — ★바꾸면 개명 «추천 순위» 가 바뀝니다
// ══════════════════════════════════════════════════════════════════
//
//  ⚠️ 바꿀 때는 무작위 표본으로 걸림 비율을 다시 재십시오. (교훈 BO)
//     16-verify-naming.ts 가 분포를 찍어 줍니다.
//
//  ★2026-07-30 (4단계) — 30 → 10 으로 줄였다가 «되돌렸습니다».
//
//    [무엇이 있었나]  『작명개운법』 107쪽의 두 대목을 묶어 읽었습니다 —
//        ① 「어디서든 자원오행이 상극이라 흉하다는 말은 무시하기 바란다」
//        ② 「자원오행은 성을 제외하고 이름의 자원오행을 찾아 판단한다」
//      ②를 「흐름에서 성을 빼라」로 읽고, 둘을 합쳐 「흐름 자체를 가볍게 보라」로
//      과잉 해석해 W_FLOW 를 10 으로 낮췄습니다.
//
//    [무엇이 틀렸나]  ②는 «용신 충족을 어디서 세는가» 를 말한 것입니다.
//      성은 바꿀 수 없으니 «이름 두 글자가 사주를 보완했는가» 로 판단한다는 뜻이고,
//      **상생 흐름은 성을 포함해 성-상명자-하명자 순환으로 보는 것이 정석입니다.**
//      → 지금 코드가 이미 맞습니다 (흐름은 성 포함 · hasYongsin 은 given 만).
//
//    [실측도 역효과였습니다]  흐름을 10 으로 줄이고 용신을 60 으로 올리자
//      용신 미충족 시 0점이 되어 오히려 가혹해졌습니다 —
//        아쉬움 30.9% → 46.0%
//      「낮은 점수를 주어 개명을 유도하지 말라」는 교재 취지와 정반대입니다.
//
//    ★대신 ①(상극을 흠으로 보지 말라)은 «감점» 이 아니라 «AI 재료» 로 전합니다.
//      resourceFactsBlock 아래쪽 BOOK_CLASH_VIEW 를 보십시오.
//      그리고 ④ 예외(용신·희신 보완이면 감점 면제)가 이미 49.2% 를 덮고 있습니다.
export const W_FLOW = 30      // ① 배치(흐름)
export const W_YONGSIN = 40   // ② 용신 충족 — 가장 무겁게
export const W_BALANCE = 30   // ③ 균형 (과다 억제 · 결핍 충족 · 기신 회피)

/** 과다 판정 — 두 잣대를 «함께» 봅니다 */
export const EXCESS_POINT_MIN = 50   // simsanOhaeng.grade 의 «과다» 문턱 (100점 만점)
export const EXCESS_COUNT_MIN = 4    // ★대표님 지시 — 여덟 글자 가운데 넷 이상

const PENALTY_EXCESS = 12   // 과다 오행을 이름이 또 보탤 때
const PENALTY_DEVELOPED = 4 // 발달(25~49) 오행을 보탤 때 — 가볍게
const PENALTY_GISIN = 15    // 기신을 보탤 때 ★가장 무겁게
const PENALTY_GUSIN = 8     // 구신을 보탤 때
const BONUS_LACK = 6        // 결핍(0점) 오행을 채울 때
const BONUS_ISOLATED = 4    // 고립으로 본 오행을 채울 때

/**
 * ★④ 예외 인정 — 이름 안에서 상극이 나더라도 «보완» 이면 감점하지 않습니다.
 *
 *   [왜]  이름의 목적은 사주를 보완하는 것입니다. 용신을 담기 위해 고른 글자가
 *         이웃과 상극이 되는 일은 흔하고, 그것을 감점하면 «용신을 담지 말라» 는
 *         말이 되어 버립니다. 대표님 지시(2단계 ④)대로 예외를 둡니다.
 *
 *   [잣대] 상극 관계(순극·역극)의 두 글자 가운데 «어느 한쪽» 이라도
 *          용신 또는 희신을 담고 있으면 그 관계를 «비화»(중립)로 봅니다.
 *
 *   ⚠️ 유파 선택입니다. 끄고 싶으면 이 값을 false 로 두면 됩니다 — 한 곳입니다.
 *   ⚠️ 감점만 면제하고 «가점» 은 주지 않습니다. 상극이 좋아지는 것은 아닙니다.
 *   ★연재쌤 확인 대기 — 예외를 «희신까지» 인정할지, «용신만» 인정할지.
 */
export const CLASH_EXEMPT_WHEN_SUPPLEMENTING = true
export const CLASH_EXEMPT_INCLUDES_HEEKSIN = true

// ══════════════════════════════════════════════════════════════════
//  ① 사주 오행 프로필 — 버려지던 값을 모읍니다
// ══════════════════════════════════════════════════════════════════

/**
 * 오행 등급. 저장소 표준은 `simsanOhaeng.grade()` 의 네 단계입니다.
 * ⚠️ `'보통'` 은 **밖에서 손으로 만든 프로필** 을 받기 위해 넓혀 둔 값입니다.
 *    결핍도 과다도 발달도 아닌 자리로 봅니다(감점·가산 없음).
 *    ★새 코드에서 '보통' 을 만들어 쓰지 마십시오 — grade() 를 부르십시오. (교훈 CJ)
 */
export type OhaengLevel = OhaengGrade | '보통'

/**
 * 사주 오행 프로필.
 *
 * ⚠️ `yongsin`·`level` 만 있으면 돕니다. 나머지는 선택값이고
 *    `ensureProfile()` 이 안전한 기본값을 채웁니다.
 *    → 손으로 만든 프로필(용신 + 등급만)도 judgeResource 에 바로 넣을 수 있습니다.
 */
export interface SajuOhaengProfile {
  yongsin: Ohaeng | null
  heeksin?: Ohaeng | null
  /** ★지금까지 naming 이 받지 않던 값 */
  gisin?: Ohaeng | null
  /** ★지금까지 naming 이 받지 않던 값 */
  gusin?: Ohaeng | null
  /** ★지금까지 naming 이 받지 않던 값 */
  hansin?: Ohaeng | null
  isStrong?: boolean
  /** 오행별 점수 (심산 100점 만점). 없으면 0 으로 봅니다 */
  score?: Partial<Record<Ohaeng, number>>
  /** 결핍 / 약함 / 발달 / 과다 (또는 보통) */
  level: Record<Ohaeng, OhaengLevel>
  /** 여덟 글자 가운데 그 오행이 몇 자리인가 */
  count?: Partial<Record<Ohaeng, number>>
  /** 글자 수를 셀 수 있었는가 */
  hasCount?: boolean
  /** 과다로 본 오행. 없으면 level·score 에서 뽑습니다 */
  excess?: Ohaeng[]
  /** 결핍 오행. 없으면 level·score 에서 뽑습니다 */
  lacking?: Ohaeng[]
  /** ★고립으로 본 오행 — 우리가 정한 잣대입니다 */
  isolated?: Ohaeng[]
}

/**
 * 빈 자리가 없는 «다 채워진» 프로필.
 * `buildSajuOhaengProfile()` 이 이것을 돌려줍니다 — 부르는 쪽이 `?.` 를 안 써도 됩니다.
 * ⚠️ judgeResource 는 더 느슨한 `SajuOhaengProfile` 도 받습니다(ensureProfile 이 채웁니다).
 */
export interface SajuOhaengProfileFull {
  yongsin: Ohaeng | null
  heeksin: Ohaeng | null
  gisin: Ohaeng | null
  gusin: Ohaeng | null
  hansin: Ohaeng | null
  isStrong: boolean
  score: Record<Ohaeng, number>
  level: Record<Ohaeng, OhaengLevel>
  count: Record<Ohaeng, number>
  hasCount: boolean
  excess: Ohaeng[]
  lacking: Ohaeng[]
  isolated: Ohaeng[]
}

/**
 * ★안전한 기본값 채우기.
 *
 *   [왜 필요한가]  프로필을 «손으로» 만들어 넣는 자리가 생깁니다 —
 *     검사기·후보 정렬·연재쌤 검증용 시늉 자료 등.
 *     그때 excess·lacking 이 없으면 judgeResource 가 터집니다.
 *     ⚠️ 조용히 빈 배열로 두면 «과다가 없는 사주» 로 오판합니다.
 *        그래서 level·score 에서 «뽑아» 냅니다.
 */
export function ensureProfile(p: SajuOhaengProfile): SajuOhaengProfileFull {
  const score = {} as Record<Ohaeng, number>
  const count = {} as Record<Ohaeng, number>
  const level = {} as Record<Ohaeng, OhaengLevel>
  for (const el of OHAENG_ALL) {
    score[el] = Number(p.score?.[el] ?? 0) || 0
    count[el] = Number(p.count?.[el] ?? 0) || 0
    level[el] = p.level?.[el] ?? '보통'
  }
  const hasCount = p.hasCount ?? OHAENG_ALL.some(el => count[el] > 0)

  // 넘겨받은 것이 있으면 그대로, 없으면 level·score·글자수에서 뽑습니다
  const excess = p.excess ?? OHAENG_ALL.filter(el =>
    level[el] === '과다'
    || score[el] >= EXCESS_POINT_MIN
    || (hasCount && count[el] >= EXCESS_COUNT_MIN))
  const lacking = p.lacking ?? OHAENG_ALL.filter(el =>
    level[el] === '결핍' || (p.score !== undefined && score[el] === 0))

  return {
    yongsin: p.yongsin ?? null,
    heeksin: p.heeksin ?? null,
    gisin: p.gisin ?? null,
    gusin: p.gusin ?? null,
    hansin: p.hansin ?? null,
    isStrong: p.isStrong ?? false,
    score, level, count, hasCount,
    excess, lacking,
    isolated: p.isolated ?? [],
  }
}

/** calcYongsinCompat 이 주는 모양 — 필요한 것만 받습니다 */
export interface YongsinLike {
  isStrong?: boolean
  yongsin?: string
  heeksin?: string
  gisin?: string
  gusin?: string
  hansin?: string
  score?: Record<string, number>
}

export interface PillarLike { pillar?: string; stem: string; branch: string }

/**
 * ★고립(孤立) 잣대 — ⚠️⚠️ 우리가 정한 것입니다. 교재 잣대가 아닙니다.
 *
 *   인수인계서 3-4장 ㉖ 에 「「고립」의 잣대」가 **미결로 남아 있습니다.**
 *   정통 명리의 고립은 «글자의 자리» 를 봐야 하지만(사방이 극하는 오행으로 둘러싸임),
 *   지금 우리에게는 점수만 있습니다. 그래서 점수로만 재는 «보수적 대용» 을 둡니다.
 *
 *   잣대 : 점수가 0보다 크고 25 미만(약함)이면서, 그 오행을 «생해 주는» 오행도 25 미만
 *          → 약한데 받쳐 줄 힘도 없는 자리
 *
 *   ⚠️ 결핍(0점)과 겹치지 않습니다. 0점은 lacking 으로만 셉니다.
 *   ★연재쌤 확인 대기. 잣대를 고치실 때 **이 함수 하나만** 고치면 됩니다.
 */
function judgeIsolated(score: Record<Ohaeng, number>): Ohaeng[] {
  const out: Ohaeng[] = []
  for (const el of OHAENG_ALL) {
    if (score[el] <= 0 || score[el] >= 25) continue
    // el 을 생해 주는 오행 (GENERATES[x] === el 인 x)
    const feeder = OHAENG_ALL.find(x => GENERATES[x] === el)
    if (feeder && score[feeder] < 25) out.push(el)
  }
  return out
}

/**
 * 사주 프로필을 만듭니다. ★버려지던 gisin·gusin·hansin·isStrong 을 함께 받습니다.
 *
 * @param y     calcYongsinCompat 의 반환값
 * @param saju  네 기둥. 넘기면 «글자 수» 로도 과다를 셉니다 (대표님 지시 — 넷 이상)
 */
export function buildSajuOhaengProfile(
  y: YongsinLike,
  saju?: PillarLike[] | null,
): SajuOhaengProfileFull {
  const score = {} as Record<Ohaeng, number>
  const level = {} as Record<Ohaeng, OhaengLevel>
  const count = {} as Record<Ohaeng, number>

  for (const el of OHAENG_ALL) {
    score[el] = Number(y.score?.[el] ?? 0) || 0
    level[el] = ohaengGradeOf(score[el])   // ★잣대를 새로 만들지 않습니다 (교훈 CJ)
    count[el] = 0
  }

  // 여덟 글자 세기 — ohaengOfChar 공용 창구를 씁니다 (표를 새로 만들지 않습니다)
  let hasCount = false
  if (Array.isArray(saju) && saju.length > 0) {
    hasCount = true
    for (const p of saju) {
      for (const ch of [p?.stem, p?.branch]) {
        if (!ch) continue
        const el = ohaengOfChar(ch)
        if (el && (OHAENG_ALL as readonly string[]).includes(el)) count[el as Ohaeng] += 1
      }
    }
  }

  const excess = OHAENG_ALL.filter(el =>
    score[el] >= EXCESS_POINT_MIN || (hasCount && count[el] >= EXCESS_COUNT_MIN))
  const lacking = OHAENG_ALL.filter(el => score[el] === 0)
  const isolated = judgeIsolated(score)

  return {
    yongsin: normalizeOhaeng(y.yongsin),
    heeksin: normalizeOhaeng(y.heeksin),
    gisin: normalizeOhaeng(y.gisin),
    gusin: normalizeOhaeng(y.gusin),
    hansin: normalizeOhaeng(y.hansin),
    isStrong: !!y.isStrong,
    score, level, count, hasCount,
    excess, lacking, isolated,
  }
}

// ══════════════════════════════════════════════════════════════════
//  ② 판정
// ══════════════════════════════════════════════════════════════════

export interface JudgeChar {
  hanja: string
  hangul: string
  /** 주 자원오행. 못 읽었으면 null — '기타' 로 뭉개지 않습니다 */
  primary: Ohaeng | null
  /** 부 자원오행 (2단계 DB 컬럼이 들어오면 채워집니다. 없으면 null) */
  secondary?: Ohaeng | null
}

export interface ResourceLink {
  from: Ohaeng | null
  to: Ohaeng | null
  rel: RelKind
  /** 예외 인정으로 감점을 면제했는가 (④) */
  exempted: boolean
  text: string
}

/**
 * 한글 조사를 받침에 맞춰 붙입니다 — 「화을」·「토은」·「炫가」 같은 어색함을 막습니다.
 *
 *   ⚠️ 이것이 왜 중요한가 — 이 문장들은 **AI 에게 재료로 나갑니다.**
 *      어색한 표현을 그대로 두면 AI 가 그대로 옮겨 손님에게 씁니다.
 *      (교훈 BF 의 사촌 — 재료에 있는 말은 밖으로 나옵니다)
 *
 *   josa('목', '은/는') → '목은'      josa('화', '은/는') → '화는'
 *   josa('현', '이/가') → '현이'      josa('대', '이/가') → '대가'
 */
export function josa(word: string, pair: '은/는' | '이/가' | '을/를' | '과/와' | '으로/로'): string {
  const [withJong, withoutJong] = pair.split('/')
  const last = word.trim().slice(-1)
  const code = last.charCodeAt(0)
  // 한글 음절이 아니면(한자·영문) 판단할 수 없으므로 «받침 있음» 쪽으로 둡니다
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return word + withJong
  const jong = (code - 0xac00) % 28
  // '로/으로' 는 ㄹ 받침에서 '로' 를 씁니다 (예: 물로)
  if (pair === '으로/로' && jong === 8) return word + withoutJong
  return word + (jong === 0 ? withoutJong : withJong)
}

/** 조사 «만» 돌려줍니다 — 괄호 뒤에 붙일 때 씁니다. josaOf('토','이/가') → '가' */
export function josaOf(word: string, pair: Parameters<typeof josa>[1]): string {
  return josa(word, pair).slice(word.length)
}

/** 오행 이름 + 조사 */
function oj(el: Ohaeng, pair: Parameters<typeof josa>[1]): string { return josa(el, pair) }
export interface ResourceVerdict {
  /** ★내부 점수 0~100. 손님 화면에 쓰지 마십시오. 후보 정렬 전용 */
  score: number
  /**
   * ★하위 점수 — 셋을 갈라 봅니다.
   *
   *   [왜 필요한가]  총점만 있으면 «왜 이 점수인가» 를 갈라볼 수 없습니다.
   *     16-verify-naming.ts 가 이것을 짚어 냈습니다 —
   *     기신 투입과 구신 투입을 견주려 했는데, 오행을 바꾸면 «흐름» 도 함께 바뀌어
   *     총점 차이가 균형에서 온 것인지 흐름에서 온 것인지 알 수 없었습니다.
   *     (목→토는 순극 −2, 목→화는 순생 +2 — 흐름이 균형 감점을 덮었습니다)
   *
   *   ⚠️ 이 값도 «내부» 입니다. 손님 화면에 쓰지 마십시오.
   *   ★배점을 조일 때(교훈 BO) 어느 칸이 움직였는지 여기서 보십시오.
   */
  breakdown: {
    /** 배치(흐름) 0 ~ W_FLOW */
    flow: number
    /** 용신 충족 0 ~ W_YONGSIN */
    yongsin: number
    /** 균형(과다·결핍·기신) 0 ~ W_BALANCE */
    balance: number
    /** 상한을 씌우기 «전» 의 합 — problems 로 깎였는지 알 수 있습니다 */
    rawTotal: number
    /** 판정 불가로 씌운 상한. 없으면 null */
    cappedTo: number | null
  }
  /** 하위호환 3단 등급 — 기존 가중식이 계속 돕니다 */
  grade: '좋음' | '보통' | '아쉬움'
  /** ★AI 가 담담히 서술할 «사실». 판정 문장이 아닙니다 */
  facts: {
    chain: string
    links: ResourceLink[]
    flowAvg: number
    yongsin: Ohaeng | null
    heeksin: Ohaeng | null
    gisin: Ohaeng | null
    hasYongsin: boolean
    hasYongsinSecondary: boolean
    hasHeeksin: boolean
    /** ★given 만 봅니다 — hasYongsin 과 잣대를 통일했습니다 */
    yongsinChars: Array<{ hanja: string; hangul: string }>
    surnameOhaeng: Ohaeng | null
    givenOhaengs: Array<Ohaeng | null>
    /** 과다인데 이름이 더 보탠 오행 */
    excessAdded: Ohaeng[]
    /** 결핍인데 이름이 채운 오행 */
    lackFilled: Ohaeng[]
    /** 고립으로 본 오행을 이름이 채운 것 */
    isolatedFilled: Ohaeng[]
    /** 기신·구신을 보탠 오행 */
    gisinAdded: Ohaeng[]
    /** 오행별 점수·등급·글자수 */
    sajuScore: Record<Ohaeng, number>
    sajuLevel: Record<Ohaeng, string>
    sajuCount: Record<Ohaeng, number>
    /** 예외를 인정한 상극이 몇 자리였나 (④) */
    clashExemptCount: number
  }
  /** ★신설 — 「경고」를 담을 자리. 옛 구조에는 없었습니다 */
  warnings: string[]
  /** 판정 불가·자료 문제. 조용히 넘기지 않습니다 */
  problems: string[]
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

/**
 * ★자원오행 통합 판정.
 *
 * @param surname 성 (바꿀 수 없는 글자). ★복성이면 두 글자 배열로 주십시오 (2026-07-31)
 * @param given   이름 글자들 (한 자 이상)
 * @param P       사주 프로필
 */
export function judgeResource(
  surname: JudgeChar | JudgeChar[],
  given: JudgeChar[],
  profile: SajuOhaengProfile,
): ResourceVerdict {
  // ★2026-07-31 복성 — 성이 두 글자면 둘 다 «성» 입니다.
  //   예전에는 남궁순임이 성「南」+ 이름「穹淳荏」로 들어와 穹 이 이름 글자로 채점됐습니다.
  const surArr: JudgeChar[] = Array.isArray(surname) ? surname : [surname]
  // ★손으로 만든 프로필(용신 + 등급만)도 받습니다. 빈 자리는 안전한 기본값으로.
  const P = ensureProfile(profile)
  const warnings: string[] = []
  const problems: string[] = []

  const seq = [...surArr, ...given]
  const O = seq.map(c => c.primary)
  const givenO = given.map(c => c.primary)
  const givenAll = given.flatMap(c => [c.primary, c.secondary ?? null]).filter(Boolean) as Ohaeng[]

  // 이 글자가 «보완하는» 글자인가 — ④ 예외 판정에 씁니다
  const isSupplementing = (c: JudgeChar): boolean => {
    const els = [c.primary, c.secondary ?? null].filter(Boolean) as Ohaeng[]
    if (P.yongsin && els.includes(P.yongsin)) return true
    if (CLASH_EXEMPT_INCLUDES_HEEKSIN && P.heeksin && els.includes(P.heeksin)) return true
    return false
  }

  // ─────────────────────────────────────────────────────────────
  // ① 배치(흐름) — 방향 있는 상생/상극 + ④ 예외
  // ─────────────────────────────────────────────────────────────
  const links: ResourceLink[] = []
  let relSum = 0, relCount = 0, clashExemptCount = 0

  const addLink = (i: number, j: number, weight: number, suffix = '') => {
    const a = O[i], b = O[j]
    const rel = relationDirected(a, b)
    let exempted = false

    if ((rel === '순극' || rel === '역극')
        && CLASH_EXEMPT_WHEN_SUPPLEMENTING
        && (isSupplementing(seq[i]) || isSupplementing(seq[j]))) {
      // ★④ — 보완하는 글자가 만든 상극은 감점하지 않습니다. 중립으로 봅니다.
      exempted = true
      clashExemptCount++
      relSum += REL_SCORE['비화'] * weight
    } else {
      relSum += REL_SCORE[rel] * weight
      if (rel === '순극') {
        warnings.push(
          `${seq[i].hanja}(${a})와 ${seq[j].hanja}(${b})${josaOf(b as string, '이/가')} `
          + `서로 누르는 자리로 봅니다`)
      }
    }
    relCount += weight

    if (rel === '모름') {
      problems.push(`${seq[i].hanja}→${seq[j].hanja} 관계를 판정하지 못했습니다`)
    }
    links.push({
      from: a, to: b, rel, exempted,
      text: relationText(a, b, rel) + (exempted ? ' (사주를 보완하는 글자라 감점하지 않았습니다)' : '') + suffix,
    })
  }

  for (let i = 0; i < O.length - 1; i++) addLink(i, i + 1, 1)

  // ★옛 로직이 «건너뛰던» 관계 하나 — 성과 마지막 글자.
  //   세 글자 이상에서 의미가 큽니다. 무게는 절반으로 둡니다(이웃보다 멉니다).
  //   ★2026-07-31 조건을 «이름 두 글자 이상» 으로 바로잡았습니다.
  //   예전 O.length >= 3 은 복성 + 외자(남궁민)에서도 걸렸습니다.
  if (given.length >= 2) addLink(0, O.length - 1, 0.5, ' [성↔끝]')

  const flowAvg = relCount > 0 ? relSum / relCount : 0            // -2.0 ~ +2.0
  const flowScore = clamp((flowAvg + 2) / 4, 0, 1) * W_FLOW        // 0 ~ 30

  // ─────────────────────────────────────────────────────────────
  // ② 용신 충족 — ★성은 제외합니다 (바꿀 수 없는 글자이므로)
  // ─────────────────────────────────────────────────────────────
  const hasYongsin = !!P.yongsin && givenO.includes(P.yongsin)
  const hasYongsinSecondary = !!P.yongsin && !hasYongsin && givenAll.includes(P.yongsin)
  const hasHeeksin = !!P.heeksin && givenO.includes(P.heeksin)
  const hasHansin = !!P.hansin && givenO.includes(P.hansin)

  let yongsinScore: number
  if (hasYongsin) yongsinScore = W_YONGSIN                    // 40
  else if (hasYongsinSecondary) yongsinScore = W_YONGSIN * 0.7 // 28 — 부 오행으로 충족
  else if (hasHeeksin) yongsinScore = W_YONGSIN * 0.5          // 20 — 희신 (관대)
  else if (hasHansin) yongsinScore = W_YONGSIN * 0.25          // 10 — 한신 (중립)
  else {
    yongsinScore = 0
    warnings.push(
      `이름에 사주가 바라는 기운(${P.yongsin ?? '미상'})이 담기지 않았습니다`)
  }

  // ─────────────────────────────────────────────────────────────
  // ③ 균형 — ★옛 로직에 «전혀 없던» 판정입니다
  //
  //   ⚠️⚠️ 글자마다 돌지 말고 «오행별로» 묶습니다. (2026-07-30 대표님 지적)
  //     [왜]  이름 두 글자가 같은 오행이면 —
  //             · excessAdded 가 ['화','화'] 로 중복되고
  //             · 같은 경고가 두 줄 나가고 (AI 가 되풀이해 씁니다)
  //             · ★감점이 두 배로 들어갔습니다 (기신 −15 가 −30)
  //     ★대신 «어느 글자들» 인지는 버리지 않고 경고 문장에 함께 적습니다.
  //       감점은 한 번, 정보는 그대로 — 둘 다 지킵니다.
  // ─────────────────────────────────────────────────────────────
  let balance = W_BALANCE
  const excessAdded: Ohaeng[] = []
  const lackFilled: Ohaeng[] = []
  const isolatedFilled: Ohaeng[] = []
  const gisinAdded: Ohaeng[] = []

  /** 오행 → 그 오행을 담은 이름 글자들 */
  const byOhaeng = new Map<Ohaeng, JudgeChar[]>()
  for (let k = 0; k < given.length; k++) {
    const o = givenO[k]
    if (!o) continue
    const arr = byOhaeng.get(o)
    if (arr) arr.push(given[k])
    else byOhaeng.set(o, [given[k]])
  }

  for (const [o, chars] of byOhaeng) {
    /** 그 오행을 담은 글자를 「炫·炡」 처럼 묶어 적습니다 */
    const chLabel = chars.map(c => c.hanja).join('·')
    const chJosa = josaOf(chars[chars.length - 1].hangul, '이/가')

    // (a) ★과다 오행을 또 보탰다 — 가장 중요한 경고
    if (P.excess.includes(o)) {
      excessAdded.push(o)
      balance -= PENALTY_EXCESS
      const cnt = P.hasCount ? ` · 여덟 글자 가운데 ${P.count[o]}자리` : ''
      const many = chars.length > 1 ? ` (${chars.length}자리)` : ''
      warnings.push(
        `사주에 ${o} 기운이 이미 넉넉한 편인데(${P.score[o]}점${cnt}) `
        + `이름의 ${chLabel}도 ${oj(o, '을/를')} 더합니다${many}`)
    } else if (P.level[o] === '발달') {
      balance -= PENALTY_DEVELOPED
    }

    // (b) 결핍·고립 오행을 채웠다 — 가산
    //   ⚠️⚠️ 단, «기신·구신» 이면 가산하지 않습니다.
    //     [왜]  꺼리는 기운이 비어 있는 것은 «아쉬움» 이 아니라 오히려 편한 자리입니다.
    //           그것을 채우면 사주가 꺼리는 기운을 보태는 것이므로 상 줄 일이 아닙니다.
    //     ★2026-07-30 실기기에서 드러났습니다 — 기신(금)이 결핍인 사주에
    //       AI 가 「금의 기운을 의식적으로 가꾸어 나가십시오」 라고 권했습니다.
    //       재료가 «금이 비어 있다» 만 말하고 «금이 기신이다» 를 말하지 않았기 때문입니다.
    const isDisliked = (P.gisin !== null && o === P.gisin) || (P.gusin !== null && o === P.gusin)
    if (!isDisliked) {
      if (P.lacking.includes(o)) {
        lackFilled.push(o)
        balance += BONUS_LACK
      } else if (P.isolated.includes(o)) {
        isolatedFilled.push(o)
        balance += BONUS_ISOLATED
      }
    }

    // (c) ★기신·구신을 보탰다 — 지금까지 재료조차 안 받던 판정
    if (P.gisin !== null && o === P.gisin) {
      gisinAdded.push(o)
      balance -= PENALTY_GISIN
      warnings.push(
        `${oj(o, '은/는')} 이 사주가 꺼리는 기운(기신)으로 봅니다. `
        + `이름의 ${chLabel}${chJosa} ${o}입니다`)
    } else if (P.gusin !== null && o === P.gusin) {
      gisinAdded.push(o)
      balance -= PENALTY_GUSIN
      warnings.push(
        `${oj(o, '은/는')} 이 사주에 도움이 덜 되는 기운(구신)으로 봅니다. `
        + `이름의 ${chLabel}${chJosa} ${o}입니다`)
    }
  }
  balance = clamp(balance, 0, W_BALANCE)

  // ─────────────────────────────────────────────────────────────
  //  합산 · 판정 불가 처리
  // ─────────────────────────────────────────────────────────────
  let score = flowScore + yongsinScore + balance
  const rawTotal = Math.round(clamp(score, 0, 100))
  let cappedTo: number | null = null

  if (O.some(o => o === null)) {
    problems.push('자원오행을 못 읽은 글자가 있어 이 점수는 참고용입니다')
    if (score > 40) { score = 40; cappedTo = 40 }   // ★조용히 통과하지 못하게
  }
  if (!P.yongsin) {
    problems.push('용신을 계산하지 못해 사주 보완을 판정하지 못했습니다')
    if (score > 60) { score = 60; cappedTo = 60 }
  }

  score = Math.round(clamp(score, 0, 100))
  const grade: ResourceVerdict['grade'] =
    score >= 70 ? '좋음' : score >= 45 ? '보통' : '아쉬움'

  const HANLEVEL = {} as Record<Ohaeng, string>
  for (const el of OHAENG_ALL) HANLEVEL[el] = P.level[el]

  return {
    score, grade, warnings, problems,
    breakdown: {
      flow: Math.round(flowScore * 10) / 10,
      yongsin: Math.round(yongsinScore * 10) / 10,
      balance: Math.round(balance * 10) / 10,
      rawTotal, cappedTo,
    },
    facts: {
      chain: seq.map(c => `${c.hanja}(${c.primary ?? '?'})`).join('→'),
      links, flowAvg: Math.round(flowAvg * 100) / 100,
      yongsin: P.yongsin, heeksin: P.heeksin, gisin: P.gisin,
      hasYongsin, hasYongsinSecondary, hasHeeksin,
      // ★given 만 — 옛 로직은 hasYongsin(이름만)과 yongsinChars(성 포함)가 어긋났습니다
      yongsinChars: given
        .filter(c => c.primary === P.yongsin)
        .map(c => ({ hanja: c.hanja, hangul: c.hangul })),
      surnameOhaeng: surArr[0].primary,
      givenOhaengs: givenO,
      excessAdded, lackFilled, isolatedFilled, gisinAdded,
      sajuScore: P.score, sajuLevel: HANLEVEL, sajuCount: P.count,
      clashExemptCount,
    },
  }
}

// ══════════════════════════════════════════════════════════════════
//  ④ 개명 후보 정렬 점수 — ★두 화면이 «같은» 잣대를 쓰게 합니다
// ══════════════════════════════════════════════════════════════════
//
//  [무엇이 달라지나]  옛 정렬은 다섯 관점을 «3단 등급(2/1/0)» 으로 뭉개 더했습니다.
//
//      옛  weighted = 용신×3 + 자원×2 + 수리×1.5 + 발음×1     (만점 15)
//          → 자원오행 관점의 ratio 0.5 와 1.0 이 같은 «좋음» 이라 정보가 사라졌고,
//            상극·과다·기신이 점수에 닿지 않았습니다.
//
//      새  자원+용신 칸만 judgeResource 의 0~100 으로 갈아 끼웁니다.
//          ★비율은 옛 가중치를 «그대로» 옮겼습니다 —
//              (3+2)/7.5 = 66.7%   1.5/7.5 = 20%   1/7.5 = 13.3%
//          → 바뀌는 것은 «정밀도» 뿐이고 관점의 무게는 그대로입니다.
//
//  ⚠️ 수리·발음은 아직 3단 등급입니다. 그것까지 정밀하게 하려면
//     scoreSuri·scoreSound 를 고쳐야 하고, 그건 4단계 일입니다.
//     ★한 번에 다 바꾸면 무엇 때문에 순서가 바뀐 건지 갈라볼 수 없습니다. (교훈 DU)

/** 옛 가중치에서 뽑은 비율 — ★바꾸면 개명 추천 순서가 바뀝니다 */
export const CAND_W_RESOURCE = 5 / 7.5    // 0.667  자원오행 + 사주보완
export const CAND_W_SURI = 1.5 / 7.5      // 0.200  수리
export const CAND_W_SOUND = 1 / 7.5       // 0.133  발음

/** 3단 등급 → 0~100 */
function gradeTo100(g: '좋음' | '보통' | '아쉬움'): number {
  return g === '좋음' ? 100 : g === '보통' ? 50 : 0
}

/**
 * 개명 후보 하나의 정렬 점수 (0~100).
 *
 * @param v          judgeResource 결과 (자원오행 + 사주보완)
 * @param suriGrade  diagnoseName().suri.grade
 * @param soundGrade diagnoseName().soundFlow.grade
 *
 * ⚠️ ★내부 점수입니다. 손님 화면에 쓰지 마십시오. 줄 세우기 전용입니다.
 */
export function candidateScore(
  v: ResourceVerdict,
  suriGrade: '좋음' | '보통' | '아쉬움',
  soundGrade: '좋음' | '보통' | '아쉬움',
): number {
  const s = v.score * CAND_W_RESOURCE
    + gradeTo100(suriGrade) * CAND_W_SURI
    + gradeTo100(soundGrade) * CAND_W_SOUND
  return Math.round(clamp(s, 0, 100) * 10) / 10
}

/**
 * 후보 둘을 견주는 비교 함수 — `sort()` 에 그대로 넣습니다.
 *
 * 순서
 *   ① 용신을 담았는가        ★하드 게이트 (대표님이 두신 것 — 바꾸지 않았습니다)
 *   ② avoid_soft 가 아닌가   (권장 회피자를 뒤로)
 *   ③ candidateScore 높은 쪽
 *   ④ 획수 적은 쪽
 *
 * ⚠️ 두 화면이 각자 비교 함수를 쓰면 반드시 갈립니다. 이 하나만 부르십시오. (교훈 CJ)
 */
export interface CandidateLike {
  fitsYongsin: boolean
  avoidSoft: boolean
  score: number
  strokes: number
  /**
   * ★2026-07-30 (3단계-b) — «막지 않고 뒤로 미는» 정도. hanjaRow.listPolicy 가 줍니다.
   *   不用 40 · 뜻 25 · 평범 0. 없으면 0 으로 봅니다.
   *   [왜]  不用 을 목록에서 빼면 50개 음이 후보 0개가 되어 손님이 막힙니다.
   *         그래서 «보여 주되 뒤로» 두는 것입니다.
   */
  softPenalty?: number
}
export function compareCandidates(a: CandidateLike, b: CandidateLike): number {
  if (a.fitsYongsin !== b.fitsYongsin) return a.fitsYongsin ? -1 : 1
  // ★不用·뜻으로 미룬 글자를 먼저 뒤로 보냅니다 (avoid_soft 보다 무겁게 봅니다)
  const aPen = a.softPenalty ?? 0
  const bPen = b.softPenalty ?? 0
  if (aPen !== bPen) return aPen - bPen
  const aSoft = a.avoidSoft ? 1 : 0
  const bSoft = b.avoidSoft ? 1 : 0
  if (aSoft !== bSoft) return aSoft - bSoft
  if (b.score !== a.score) return b.score - a.score
  return a.strokes - b.strokes
}

// ══════════════════════════════════════════════════════════════════
//  ⑤ 프롬프트 재료 — AI 에게 «사실» 로 나갑니다
// ══════════════════════════════════════════════════════════════════

/**
 * 프롬프트에 실을 한 덩이. ★「나쁘다」는 말을 한 번도 쓰지 않습니다.
 * 숫자와 관계만 적고 판정 문장은 AI 가 씁니다. (대표님 방침 · naming.ts:8)
 *
 * ⚠️ 걸린 것이 없으면 그 줄을 «아예 넣지 않습니다».
 *    「해당 없음」이라 적으면 AI 가 그 말을 손님에게 옮겨 씁니다. (교훈 BF)
 */
export function resourceFactsBlock(v: ResourceVerdict, profile: SajuOhaengProfile): string {
  const P = ensureProfile(profile)
  const L: string[] = []
  const f = v.facts

  L.push('[자원오행 — 글자에 담긴 기운]')
  L.push(`흐름  ${f.chain}`)
  for (const k of f.links) L.push(`관계  ${k.text}`)

  L.push('')
  L.push('[사주와의 관계]')
  if (P.yongsin) L.push(`사주가 바라는 기운(용신)   ${P.yongsin}`)
  if (P.heeksin) L.push(`그다음으로 좋은 기운(희신)  ${P.heeksin}`)
  // ★★2026-07-30 — 기신·구신을 «언제나» 적습니다.
  //   [왜]  전에는 «이름에 들어 있을 때만» 적었습니다. 그래서 기신이 결핍인 사주에서
  //         AI 가 그 기운을 «가꾸라» 고 권하는 일이 실기기에서 나왔습니다.
  //         꺼리는 기운은 이름에 없어도 AI 가 «알아야» 합니다.
  if (P.gisin) L.push(`사주가 꺼리는 기운(기신)    ${P.gisin}  ★이 기운을 «채우라·가꾸라» 고 권하지 마세요`)
  if (P.gusin) L.push(`도움이 덜 되는 기운(구신)   ${P.gusin}`)
  L.push(`이름에 담긴 기운            ${f.givenOhaengs.map(o => o ?? '?').join(' · ')}`)
  L.push(f.yongsinChars.length
    ? `용신을 담은 글자            ${f.yongsinChars.map(c => c.hanja).join(' · ')}`
    : '용신을 담은 글자            없습니다')

  if (f.excessAdded.length) {
    for (const o of new Set(f.excessAdded)) {
      const cnt = P.hasCount ? ` · 여덟 글자 중 ${P.count[o]}자리` : ''
      L.push(`이미 넉넉한 기운            ${o} ${P.score[o]}점${cnt} — 이름이 여기에 더합니다`)
    }
  }
  if (f.lackFilled.length) {
    for (const o of new Set(f.lackFilled)) L.push(`비어 있던 기운              ${o} 0점 — 이름이 채웁니다`)
  }
  if (f.isolatedFilled.length) {
    for (const o of new Set(f.isolatedFilled)) L.push(`약하고 받쳐 줄 힘이 적던 기운  ${o} ${P.score[o]}점 — 이름이 채웁니다`)
  }
  if (f.gisinAdded.length) {
    for (const o of new Set(f.gisinAdded)) {
      const which = P.gisin === o ? '꺼리는 기운(기신)' : '도움이 덜 되는 기운(구신)'
      L.push(`${which.padEnd(20, ' ')} ${o} — 이름에 들어 있습니다`)
    }
  }
  // ★채우지 않은 결핍 — «꺼리는 기운» 과 «바라는 기운» 을 갈라 적습니다.
  //   전에는 뭉쳐서 「채우지 않았습니다」 로만 적어, 기신이 결핍일 때
  //   AI 가 그것을 아쉬움으로 읽고 «가꾸라» 고 권했습니다.
  const lackUnfilled = P.lacking.filter(o => !f.lackFilled.includes(o))
  const lackWanted = lackUnfilled.filter(o => o !== P.gisin && o !== P.gusin)
  const lackDisliked = lackUnfilled.filter(o => o === P.gisin || o === P.gusin)
  if (lackWanted.length) {
    L.push(`비어 있는 기운              ${lackWanted.join(' · ')} — 이름이 채우지 않았습니다`)
  }
  if (lackDisliked.length) {
    L.push(`비어 있으나 꺼리는 기운      ${lackDisliked.join(' · ')} — 비어 있는 것이 편한 자리로 봅니다`)
    L.push(`                            ★«채우라·보태라·가꾸라» 고 권하지 마세요`)
  }

  if (v.warnings.length) {
    L.push('')
    L.push('[참고하실 자리 — ★단정하지 말고 «이런 견해가 있다» 로 담담히 전하세요]')
    for (const w of v.warnings) L.push(`· ${w}`)
  }
  if (f.clashExemptCount > 0) {
    L.push('')
    L.push(`※ 서로 누르는 자리가 ${f.clashExemptCount}곳 있으나, 사주를 보완하는 글자가 만든 것이라`)
    L.push('   흠으로 보지 않는 견해가 있습니다. 이 점을 함께 전해 주세요.')
  }

  // ★★2026-07-30 (4단계) — 상극이 «남아 있을» 때 교재의 견해를 함께 전합니다.
  //
  //   [왜]  『타고난 운명을 보완하는 작명개운법』 107쪽 —
  //     「자원오행은 … 한글 발음오행처럼 억지로 상생의 배열을 맞출 필요는 없다.
  //      어디서든 자원오행이 상극이라 흉하다는 말은 무시하기 바란다.
  //      상극이라 하더라도 필요한 용신과 절실한 오행을 보완하는 것이 맞는 작명법이다.」
  //
  //   ★감점 구조는 그대로 두고(상생을 보는 유파도 있으므로) 이 견해를 «재료» 로 실어
  //     AI 가 한쪽으로 단정하지 않게 합니다. (대표님 확정)
  //   ⚠️ 예외로 이미 면제된 자리(위 clashExemptCount)와는 «다른» 줄입니다.
  //      여기는 «면제되지 않은 상극» 이 남아 있을 때만 나갑니다.
  const clashLeft = f.links.filter(k => (k.rel === '순극' || k.rel === '역극') && !k.exempted).length
  if (clashLeft > 0) {
    L.push('')
    L.push('[★상극을 보는 두 견해 — 한쪽으로 단정하지 말고 함께 전해 주세요]')
    L.push('· 성명학에는 자원오행도 상생으로 이어지는 배열을 좋게 보는 견해가 있습니다.')
    L.push('· 한편 「자원오행은 사주에 필요한 기운을 채우는 것이 본래 목적이므로,')
    L.push('  억지로 상생 배열을 맞출 필요는 없고 상극이라 하여 흠으로 볼 일은 아니다」')
    L.push('  라고 보는 견해도 있습니다. 이름을 짓는 실무에서는 뒤엣것을 따르는 분도 많습니다.')
    // ⚠️ 여기에 «단정하는 낱말» 을 예시로 적지 마십시오.
    //   AI 가 예시를 끌어 씁니다. (교훈 — 금지어를 예시로 넣으면 AI 가 끌어 씁니다)
    L.push('· 그러니 상극이 있다는 것만으로 흠으로 단정하지 마시고, 두 견해가 있다는 것과')
    L.push('  이 이름이 사주를 얼마나 보완하는가를 함께 놓고 담담히 전해 주세요.')
  }
  return L.join('\n')
}

// ══════════════════════════════════════════════════════════════════
//  ⑥ 형제 서열 안내 — ★감점 없이 «참고» 로만 (2026-07-30 대표님 지시)
// ══════════════════════════════════════════════════════════════════
//
//  [왜 감점하지 않나]  『작명개운법』 120쪽 표는 「첫째 칸 / 둘째 칸」이
//    «쓸 글자» 인지 «피할 글자» 인지 원문으로 갈리지 않습니다.
//    그리고 이름 풀이 폼이 «몇째» 를 묻지 않아 판정할 근거도 없습니다.
//    → 감점하지 않고 «이런 글자이니 한 번 살펴보시라» 고만 전합니다.
//
//  ⚠️ 불용 목록에 «문장» 으로 실린 여섯 자(完 元 泰 長 大 輝)는 방향이 분명합니다 —
//     「맏이는 무방하나 동생(차자)이 쓰면」. 그것만 조금 더 구체적으로 적습니다.
//
//  ⚠️ 원문 사유(「형을 극한다」·「불길하다」)를 그대로 내보내지 않습니다.
//     순화해서 전합니다. (교훈 BR · 대표님 방침)

import { BIRTH_ORDER_CAUTION_MAP } from './tables/jakmyeongGaeunbeop'

/**
 * 이름에 «형제 서열을 가려 쓰는 글자» 가 있으면 안내 한 덩이를 만듭니다.
 * 없으면 빈 문자열 — ★그러면 프롬프트에 블록을 아예 안 넣습니다. (교훈 BF)
 *
 * @param given 이름 글자들 (성은 보지 않습니다 — 성은 서열과 무관합니다)
 */
export function birthOrderCautionBlock(given: JudgeChar[]): string {
  const hits = given
    .map(c => ({ ch: c, info: BIRTH_ORDER_CAUTION_MAP[c.hanja] }))
    .filter(x => !!x.info)
  if (hits.length === 0) return ''

  const L: string[] = []
  L.push('[형제 서열에 따라 가려 쓰는 글자 — ★참고로만 전해 주세요]')
  for (const { ch, info } of hits) {
    if (info.source === '불용목록') {
      L.push(
        `· ${ch.hanja}(${ch.hangul}) — 예로부터 «맏이가 쓰면 무방하나 아래 형제가 쓰면 `
        + `한 번 살펴보라» 고 전해 오는 글자입니다.`)
    } else {
      L.push(
        `· ${ch.hanja}(${ch.hangul}) — 형제 사이의 순서를 나타내는 뜻이 있어, `
        + `태어난 순서에 맞추어 가려 쓰는 것이 좋다고 보는 견해가 있습니다.`)
    }
  }
  L.push('')
  L.push('※ 다루는 법')
  L.push('· ★«좋지 않다» 로 단정하지 마시고, 「이런 견해가 전해 온다」 정도로만 담담히 전하세요.')
  L.push('· 형제 순서를 저희가 알지 못하므로 «맞다 / 틀리다» 를 말하지 마세요.')
  L.push('  「해당하신다면 한 번 헤아려 보시라」 는 정도가 알맞습니다.')
  L.push('· 이 한 가지로 이름 전체를 판단하지 마세요. 다섯 관점 가운데 작은 참고입니다.')
  return L.join('\n')
}
