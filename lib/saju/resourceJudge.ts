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

export interface SajuOhaengProfile {
  yongsin: Ohaeng | null
  heeksin: Ohaeng | null
  /** ★지금까지 naming 이 받지 않던 값 */
  gisin: Ohaeng | null
  /** ★지금까지 naming 이 받지 않던 값 */
  gusin: Ohaeng | null
  /** ★지금까지 naming 이 받지 않던 값 */
  hansin: Ohaeng | null
  isStrong: boolean
  /** 오행별 점수 (심산 100점 만점) */
  score: Record<Ohaeng, number>
  /** 결핍 / 약함 / 발달 / 과다 — simsanOhaeng.grade() 를 그대로 부릅니다 */
  level: Record<Ohaeng, OhaengGrade>
  /** 여덟 글자 가운데 그 오행이 몇 자리인가 (saju 를 넘겼을 때만) */
  count: Record<Ohaeng, number>
  /** 글자 수를 셀 수 있었는가 — false 면 count 는 전부 0 입니다 */
  hasCount: boolean
  /** 과다로 본 오행 (점수 50+ «또는» 글자 4개+) */
  excess: Ohaeng[]
  /** 결핍(0점) 오행 */
  lacking: Ohaeng[]
  /** ★고립으로 본 오행 — 우리가 정한 잣대입니다 (아래 주의) */
  isolated: Ohaeng[]
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
): SajuOhaengProfile {
  const score = {} as Record<Ohaeng, number>
  const level = {} as Record<Ohaeng, OhaengGrade>
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
/** 한자 글자를 «한글 음» 기준으로 조사 붙이기 — 한자 뒤에 조사가 오면 음으로 판단합니다 */
function cj(c: JudgeChar, pair: Parameters<typeof josa>[1]): string {
  return c.hanja + josa(c.hangul, pair).slice(c.hangul.length)
}

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
 * @param surname 성 한 글자 (바꿀 수 없는 글자)
 * @param given   이름 글자들 (한 자 이상)
 * @param P       사주 프로필
 */
export function judgeResource(
  surname: JudgeChar,
  given: JudgeChar[],
  P: SajuOhaengProfile,
): ResourceVerdict {
  const warnings: string[] = []
  const problems: string[] = []

  const seq = [surname, ...given]
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
  if (O.length >= 3) addLink(0, O.length - 1, 0.5, ' [성↔끝]')

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
  // ─────────────────────────────────────────────────────────────
  let balance = W_BALANCE
  const excessAdded: Ohaeng[] = []
  const lackFilled: Ohaeng[] = []
  const isolatedFilled: Ohaeng[] = []
  const gisinAdded: Ohaeng[] = []

  for (let k = 0; k < given.length; k++) {
    const o = givenO[k]
    if (!o) continue
    const ch = given[k]

    // (a) ★과다 오행을 또 보탰다 — 가장 중요한 경고
    if (P.excess.includes(o)) {
      excessAdded.push(o)
      balance -= PENALTY_EXCESS
      const cnt = P.hasCount ? ` · 여덟 글자 가운데 ${P.count[o]}자리` : ''
      warnings.push(
        `사주에 ${o} 기운이 이미 넉넉한 편인데(${P.score[o]}점${cnt}) `
        + `이름의 ${ch.hanja}도 ${oj(o, '을/를')} 더합니다`)
    } else if (P.level[o] === '발달') {
      balance -= PENALTY_DEVELOPED
    }

    // (b) 결핍 오행을 채웠다 — 가산
    if (P.lacking.includes(o)) {
      lackFilled.push(o)
      balance += BONUS_LACK
    } else if (P.isolated.includes(o)) {
      // (b-2) 고립으로 본 오행을 채웠다 — 가산 (잣대는 judgeIsolated 주석 참고)
      isolatedFilled.push(o)
      balance += BONUS_ISOLATED
    }

    // (c) ★기신·구신을 보탰다 — 지금까지 재료조차 안 받던 판정
    if (P.gisin && o === P.gisin) {
      gisinAdded.push(o)
      balance -= PENALTY_GISIN
      warnings.push(
        `${oj(o, '은/는')} 이 사주가 꺼리는 기운(기신)으로 봅니다. `
        + `이름의 ${cj(ch, '이/가')} ${o}입니다`)
    } else if (P.gusin && o === P.gusin) {
      gisinAdded.push(o)
      balance -= PENALTY_GUSIN
      warnings.push(
        `${oj(o, '은/는')} 이 사주에 도움이 덜 되는 기운(구신)으로 봅니다. `
        + `이름의 ${cj(ch, '이/가')} ${o}입니다`)
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
      surnameOhaeng: surname.primary,
      givenOhaengs: givenO,
      excessAdded, lackFilled, isolatedFilled, gisinAdded,
      sajuScore: P.score, sajuLevel: HANLEVEL, sajuCount: P.count,
      clashExemptCount,
    },
  }
}

// ══════════════════════════════════════════════════════════════════
//  ③ 프롬프트 재료 — AI 에게 «사실» 로 나갑니다
// ══════════════════════════════════════════════════════════════════

/**
 * 프롬프트에 실을 한 덩이. ★「나쁘다」는 말을 한 번도 쓰지 않습니다.
 * 숫자와 관계만 적고 판정 문장은 AI 가 씁니다. (대표님 방침 · naming.ts:8)
 *
 * ⚠️ 걸린 것이 없으면 그 줄을 «아예 넣지 않습니다».
 *    「해당 없음」이라 적으면 AI 가 그 말을 손님에게 옮겨 씁니다. (교훈 BF)
 */
export function resourceFactsBlock(v: ResourceVerdict, P: SajuOhaengProfile): string {
  const L: string[] = []
  const f = v.facts

  L.push('[자원오행 — 글자에 담긴 기운]')
  L.push(`흐름  ${f.chain}`)
  for (const k of f.links) L.push(`관계  ${k.text}`)

  L.push('')
  L.push('[사주와의 관계]')
  if (P.yongsin) L.push(`사주가 바라는 기운(용신)   ${P.yongsin}`)
  if (P.heeksin) L.push(`그다음으로 좋은 기운(희신)  ${P.heeksin}`)
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
  // 아직 채우지 않은 결핍 — 「없다」가 아니라 「비어 있다」로 적습니다
  const lackUnfilled = P.lacking.filter(o => !f.lackFilled.includes(o))
  if (lackUnfilled.length) L.push(`비어 있는 기운              ${lackUnfilled.join(' · ')} — 이름이 채우지 않았습니다`)

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
  return L.join('\n')
}
