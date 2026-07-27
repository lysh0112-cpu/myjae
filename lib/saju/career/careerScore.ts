// lib/saju/career/careerScore.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  진로적성 전용 점수 계산기                                        │
// │  출전: 『명리적성 비법노트』(심산) 58~61쪽 「13. 점수 계산법」        │
// │        40쪽 「寅月과 申月 辰戌丑未(6개월)의 점수 계산법이 다른 이유」  │
// └───────────────────────────────────────────────────────────────┘
//
// ★2026-07-28 연재쌤 확정
//   ① 배점은 100점(현재 프로그램)으로 간다. 책의 110점을 쓰지 않는다.
//   ② 시지(時支) 계절치환은 **책 사례대로 적용한다.**
//   ③ 寅월 2.15~2.25 는 수25 · 목10 (현재 코드 그대로)
//
//   → 그래서 simsanOhaeng.ts 와 다른 점은 **시지 치환 하나뿐**이다.
//     배점·월지 치환·날짜 분할은 전부 같다.
//     계산을 새로 짜지 않고 calcSimsanOhaeng 결과에서 시지 10점만 옮긴다.
//
// ⚠️ simsanOhaeng.ts 는 절대 건드리지 않는다.
//    사주보기·궁합·출산택일이 함께 쓴다. 거기서 시지 치환을 켜면 세 서비스가 흔들린다.
//
// [왜 시지도 치환하는가 — 교재 60쪽 표 「시지(時支) 특이사항」]
//   책 사례 (8) 재수생(戌월 戌시)이 근거다.
//     "월지와 시지에 있는 술월 술시(戌月戌時)는 오행상 토재성이지만
//      육친상 금관성(金官星)에 해당한다"
//   시지를 치환하지 않으면 금 40 · 토 35 로 격차가 5점이 되고,
//   치환하면 금 50 · 토 25 로 책과 같은 그림이 된다.
//
// [계절치환은 육친 전용이다 — 교재 40쪽·60쪽]
//   60쪽 표의 치환 칸 제목이 「육친성향(적성)」이다.
//   40쪽은 "오행으로 판단 = 건강과 궁합, 격과 용신 / 육친으로 판단 = 진로와 직업적성"
//   → 그래서 이 계산기의 결과는 **육친 점수**다.
//     책 사례가 "육친별 점수 목40 화30 토10 금15 수15" 처럼
//     오행 이름으로 적는 것도 같은 이유다. 숫자는 한 벌이고 부르는 이름만 둘이다.

import { calcSimsanOhaeng, type Ohaeng, type OhaengScore } from '../simsanOhaeng'
import type { Pillar } from './types'
import { euro } from '../josa'

/** 지지 본래 오행 */
const BRANCH_EL: Record<string, Ohaeng> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}
const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

/** 시지 배점 (simsanOhaeng 과 같아야 한다) */
const HOUR_BRANCH_POINT = 10

/**
 * 시지 계절치환 — 교재 60쪽 표 「시지(時支) 특이사항」
 *   寅월 · 丑월 : 丑시 · 寅시 → 水
 *   卯월 · 辰월 : 辰시       → 木
 *   未월        : 未시       → 火
 *   申월        : 申시 · 未시 → 火
 *   酉월 · 戌월 : 戌시       → 金
 *   巳·午·亥·子월 : 각 시의 오행 그대로
 */
export function convertHourBranch(monthBranch: string, hourBranch: string): Ohaeng | null {
  const base = BRANCH_EL[hourBranch]
  if (!base) return null
  switch (monthBranch) {
    case '寅': case '丑':
      return (hourBranch === '丑' || hourBranch === '寅') ? '수' : base
    case '卯': case '辰':
      return hourBranch === '辰' ? '목' : base
    case '未':
      return hourBranch === '未' ? '화' : base
    case '申':
      return (hourBranch === '申' || hourBranch === '未') ? '화' : base
    case '酉': case '戌':
      return hourBranch === '戌' ? '금' : base
    default:
      return base
  }
}

/** 글자 하나 (개수를 셀 때 쓴다) */
export interface CharMark {
  ch: string
  pillar: string
  /** 천간인가 지지인가 */
  where: '천간' | '지지'
  /** 계절치환이 적용된 뒤의 오행 */
  el: Ohaeng
  /** 본래 오행과 달라졌는가 */
  converted: boolean
}

export interface CareerScoreResult {
  /** 육친 점수 (합 100. 시를 모르면 80) */
  score: OhaengScore
  /** 오행별 글자 — 개수 판정에 쓴다 (교재 40쪽) */
  chars: Record<Ohaeng, CharMark[]>
  /** 월지가 어느 오행으로 잡혔는가 (치환 뒤) */
  monthEl: Ohaeng | null
  /** 시지 치환이 일어났는가 */
  hourConverted: boolean
  hourNote: string | null
  /** 환산 전 합계 (시 모름이면 80) */
  total: number
}

const EL5: Ohaeng[] = ['목', '화', '토', '금', '수']
const real = (x: string) => !!x && x !== '?'

/**
 * 진로적성 육친 점수.
 * calcSimsanOhaeng(100점 · 월지 치환)을 받아 **시지 10점만 다시 배치**한다.
 */
export function calcCareerScore(
  saju: Pillar[], solarMonth: number, solarDay: number, hourBranch: string | null,
): CareerScoreResult {
  const base = calcSimsanOhaeng(saju, solarMonth, solarDay, hourBranch)
  const score: OhaengScore = { ...base }

  const monthPillar = saju.find(p => p.pillar === '월주')
  const monthBranch = monthPillar?.branch ?? ''
  const hourPillar = saju.find(p => p.pillar === '시주')
  const hb = hourBranch ?? hourPillar?.branch ?? ''

  // ── 시지 치환 ────────────────────────────────────────────────
  let hourConverted = false
  let hourNote: string | null = null
  if (real(hb) && real(monthBranch)) {
    const from = BRANCH_EL[hb]
    const to = convertHourBranch(monthBranch, hb)
    if (from && to && from !== to) {
      score[from] = (score[from] ?? 0) - HOUR_BRANCH_POINT
      score[to] = (score[to] ?? 0) + HOUR_BRANCH_POINT
      hourConverted = true
      hourNote = `시지 ${hb}(${from})을 ${monthBranch}월의 기운으로 보아 ${to}${euro(to)} 계산했어요.`
    }
  }

  // ── 글자 세기 (치환 반영) ────────────────────────────────────
  const chars: Record<Ohaeng, CharMark[]> = { 목: [], 화: [], 토: [], 금: [], 수: [] }
  let monthEl: Ohaeng | null = null

  for (const p of saju) {
    if (real(p.stem)) {
      const el = STEM_EL[p.stem]
      if (el) chars[el].push({ ch: p.stem, pillar: p.pillar, where: '천간', el, converted: false })
    }
    if (!real(p.branch)) continue
    const from = BRANCH_EL[p.branch]
    if (!from) continue

    let el: Ohaeng = from
    if (p.pillar === '월주') {
      // 월지는 calcSimsanOhaeng 이 이미 치환했다. 가장 많이 받은 오행으로 되짚는다.
      el = pickMonthEl(base, p.branch, saju, solarMonth, solarDay, hb) ?? from
      monthEl = el
    } else if (p.pillar === '시주') {
      el = convertHourBranch(monthBranch, p.branch) ?? from
    }
    chars[el].push({ ch: p.branch, pillar: p.pillar, where: '지지', el, converted: el !== from })
  }

  const total = EL5.reduce((a, e) => a + (score[e] ?? 0), 0)
  return { score, chars, monthEl, hourConverted, hourNote, total }
}

/**
 * 월지가 어느 오행으로 잡혔는지 되짚는다.
 * (寅·申월은 두 오행으로 갈리므로 더 많이 받은 쪽을 월지 오행으로 본다)
 */
function pickMonthEl(
  base: OhaengScore, branch: string, saju: Pillar[],
  m: number, d: number, hb: string,
): Ohaeng | null {
  // 월지를 뺀 점수를 구해 차이를 보면 월지가 어디에 얼마를 줬는지 알 수 있다.
  const without = calcSimsanOhaeng(
    saju.map(p => p.pillar === '월주' ? { ...p, branch: '?' } : p),
    m, d, hb,
  )
  let best: Ohaeng | null = null, bestDiff = 0
  for (const e of EL5) {
    const diff = (base[e] ?? 0) - (without[e] ?? 0)
    if (diff > bestDiff) { bestDiff = diff; best = e }
  }
  return best ?? BRANCH_EL[branch] ?? null
}

// ── 발달 · 과다 판정 (교재 40쪽) ────────────────────────────────
//
//   육친의 발달   동일한 오행이 3개 이하(月支 포함 2개)   25~45점  진취적 성향(강점 지능)
//   육친의 과다   동일한 오행이 4개 이상                 50점 이상  모험적 성향(단점)
//
//   ★잣대가 둘이다. 글자 개수로도 보고 점수로도 본다.
//     월지가 낀 오행은 무게가 커서(35점) 2개만으로도 발달로 친다.
//     즉 월지가 끼면 3개부터 과다, 안 끼면 4개부터 과다다.
//
//   ※ 46~49점 구간은 책에 규정이 없다. 발달 쪽으로 붙였다. (연재쌤 확인 대상)

export type CareerGrade = '결핍' | '약함' | '발달' | '과다'

export const GRADE_RULE = {
  DEVELOP_MIN: 25,   // 발달 최소 점수
  DEVELOP_MAX: 45,   // 발달 최대 점수 (책 표기)
  EXCESS_MIN: 50,    // 과다 최소 점수
  COUNT_EXCESS: 4,           // 월지가 안 끼면 4개부터 과다
  COUNT_EXCESS_WITH_MONTH: 3, // 월지가 끼면 3개부터 과다
} as const

export interface GradeResult {
  el: Ohaeng
  points: number
  count: number
  hasMonth: boolean
  /** 점수로 본 등급 */
  byPoint: CareerGrade
  /** 글자 개수로 본 등급 */
  byCount: CareerGrade
  /** 최종 — 둘 중 하나라도 과다면 과다로 본다 */
  grade: CareerGrade
  /** 두 잣대가 어긋났는가 (통변에서 조심하라고 알린다) */
  disagree: boolean
}

export function gradeOf(r: CareerScoreResult, el: Ohaeng, normalize = true): GradeResult {
  const raw = r.score[el] ?? 0
  // 시를 몰라 합이 80이면 100으로 환산해 등급을 잰다 (교훈 AW)
  const pts = normalize && r.total > 0 ? Math.round(raw * 100 / r.total) : raw

  const marks = r.chars[el] ?? []
  const count = marks.length
  const hasMonth = marks.some(m => m.pillar === '월주' && m.where === '지지')

  const byPoint: CareerGrade =
    pts === 0 ? '결핍'
    : pts >= GRADE_RULE.EXCESS_MIN ? '과다'
    : pts >= GRADE_RULE.DEVELOP_MIN ? '발달'
    : '약함'

  // 글자 개수 잣대 — 교재 40쪽은 상한선을 말한다.
  //   발달 = 3개 이하 (월지가 끼면 2개)
  //   과다 = 4개 이상 (월지가 끼면 3개)
  const limit = hasMonth ? GRADE_RULE.COUNT_EXCESS_WITH_MONTH : GRADE_RULE.COUNT_EXCESS
  const byCount: CareerGrade =
    count === 0 ? '결핍'
    : count >= limit ? '과다'
    : '발달'

  // 최종 — 둘 중 하나라도 과다면 과다로 본다
  const grade: CareerGrade =
    (count === 0 || pts === 0) ? '결핍'
    : pts < GRADE_RULE.DEVELOP_MIN ? '약함'
    : (byPoint === '과다' || byCount === '과다') ? '과다'
    : '발달'

  return {
    el, points: raw, count, hasMonth, byPoint, byCount, grade,
    disagree: byPoint !== byCount && grade !== '결핍' && grade !== '약함',
  }
}

// ── 대표 오행(강점 지능) 고르기 ─────────────────────────────────
//
// ★교재 40쪽이 점수와 글자 개수를 **나란히** 놓은 이유가 여기 있다.
//   점수만 보면 월지(35점) 하나가 글자 세 개를 이긴다.
//   그런데 책 사례는 점수가 비슷할 때 **여러 자리에 퍼진 쪽**을 대표로 삼는다.
//
//     (1) 신생아  화35(1자·월지뿐) vs 금30(3자)  → 책은 금을 강점 지능이라 한다
//     (5) 중2     수35(1자·월지뿐) vs 토30(3자)  → 책은 토를 강점 지능이라 한다
//
//   그래서 1위와 2위의 점수 차가 TIE_GAP 이내면 글자 수가 많은 쪽을 대표로 본다.
//   (책 사례 9건 모두 이 규칙으로 대표가 일치한다)
export const TIE_GAP = 10

/** 강점 지능 후보를 점수 순으로. 점수가 엇비슷하면 글자 수 많은 쪽을 앞세운다. */
export function pickStrong(r: CareerScoreResult, g: Record<Ohaeng, GradeResult>): Ohaeng[] {
  const cand = EL5.filter(e => g[e].grade === '발달' || g[e].grade === '과다')
  return cand.sort((a, b) => {
    const pa = r.score[a] ?? 0, pb = r.score[b] ?? 0
    if (Math.abs(pa - pb) <= TIE_GAP && g[a].count !== g[b].count) {
      return g[b].count - g[a].count      // 점수가 엇비슷하면 글자 많은 쪽
    }
    return pb - pa
  })
}

/** 다섯 오행 전부 등급 매기기 */
export function gradeAll(r: CareerScoreResult): Record<Ohaeng, GradeResult> {
  return {
    목: gradeOf(r, '목'), 화: gradeOf(r, '화'), 토: gradeOf(r, '토'),
    금: gradeOf(r, '금'), 수: gradeOf(r, '수'),
  }
}

export { EL5 }
export type { Ohaeng, OhaengScore }
