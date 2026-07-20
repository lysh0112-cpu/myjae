// lib/saju/monthlyFortune.ts
// ============================================================================
// 이달의 운세 — 월운(月運) 채점 엔진
// ----------------------------------------------------------------------------
// ★ 오늘의 운세(dailyFortune.ts)는 건드리지 않는다. 월운은 이 파일이 담당한다.
//
// 명리 근거 (『심산 명리비법 적성노트』 / 『심산강의 노트정리』):
//   ① 천간은 일간 기준   — "일간은 본인이기 때문에 본인이 운을 받는 것이다"
//   ② 지지는 월지에 먼저 — 84쪽 "대운이나 세운을 일단 月支에 대입해라.
//                            月支가 총사령관이다"
//   ③ 영향력 순위        — 85쪽 月支 > 日支 > 時支 > 年支
//   ④ 지지 등급 A~D      — 49쪽 + 51~73쪽 (lib/saju/jijiGrade.ts)
//   ⑤ 등급 점수          — 강의노트 201쪽 A 3점 / B 1.5 / C 0 / D −1.5
//                            → 이 비율을 그대로 30점에 옮기면 A30·B22.5·C15·D7.5
//
// 배점 (100점)
//   ① 오행·용신 30점  — 이달 오행이 내 용신/희신/기신 중 무엇인가
//   ② 천간     20점  — 이달 천간과 내 일간의 관계 (합/생/극)
//   ③ 지지     30점  — 월지 20점 + 일지 10점  (②번 근거)
//   ④ 십성     20점  — 이달 천간의 십성이 나에게 어떤 자리인가
//
// ⚠ 배점·경계는 잠정값이다. 상수를 위쪽에 모아두었으니 여기만 고치면 된다.
// ============================================================================

import { JIJI_GRADE, type JijiGrade } from './jijiGrade'

// ── 조정 가능한 값들 (연재쌤 확정 시 여기만 고친다) ─────────────
/** 지지 등급 → 점수 (만점 대비 비율). 강의노트 201쪽 A3/B1.5/C0/D−1.5 비율 */
const GRADE_RATIO: Record<JijiGrade, number> = { A: 1.0, B: 0.75, C: 0.5, D: 0.25 }
/** 지지 30점을 월지·일지에 나누는 비율 (월지가 총사령관) */
const BRANCH_MAX = { month: 20, day: 10 }
/** 등급 경계 — 2026-07-19 확정.
 *    "안 좋은 달이 많으면 사람들이 싫어한다"는 판단으로 후하게 잡았다.
 *    시뮬레이션(2000명×12개월): 활짝 8.5% · 순한바람 34.8% · 차곡차곡 54.4% · 숨고르기 2.3%
 *    → 10명 중 7명이 1년에 한 번은 "활짝 열리는 달"을 본다. */
const CUTS = { S: 75, A: 62, B: 40 }

const STEM_EL: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_EL: Record<string, string> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}
const GEN: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CTRL: Record<string, string> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' }
/** 천간합 (甲己·乙庚·丙辛·丁壬·戊癸) */
const STEM_HAP: Record<string, string> = {
  甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛',
  辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊',
}

/** 오행 → 나에게 어떤 십성인가 (일간 기준) */
function sipseongOf(dayEl: string, el: string): string {
  if (el === dayEl) return '비겁'
  if (GEN[dayEl] === el) return '식상'
  if (CTRL[dayEl] === el) return '재성'
  if (CTRL[el] === dayEl) return '관성'
  if (GEN[el] === dayEl) return '인성'
  return ''
}

export interface MonthlyFortuneInput {
  myDayStem: string      // 내 일간 (예: 甲)
  myDayBranch: string    // 내 일지 (예: 寅)
  myMonthBranch: string  // 내 월지 (예: 子)  ★ 월운의 핵심 기준
  yongsin: string        // 용신 오행 (목/화/토/금/수)
  heeksin: string        // 희신
  gisin: string          // 기신
  monthStem: string      // 이달 천간 (예: 乙)
  monthBranch: string    // 이달 지지 (예: 未)
}

export interface MonthlyFortuneScore {
  total: number                  // 0~100
  ohaeng: number                 // 0~30
  stem: number                   // 0~20
  branch: number                 // 0~30 (월지 20 + 일지 10)
  sipseong: number               // 0~20
  grade: 'S' | 'A' | 'B' | 'C'
  /** 영역별 — 화면에서 "일·환경 / 나·건강" 두 줄로 보여준다 */
  area: {
    /** 월지 반응 = 사회·환경 (0~100 환산) */
    env: number
    envGrade: JijiGrade
    envTag: string
    envDesc: string
    /** 일지 반응 = 개인·건강 (0~100 환산) */
    self: number
    selfGrade: JijiGrade
    selfTag: string
    selfDesc: string
  }
  /** AI 프롬프트에 넘길 재료 */
  flags: {
    monthElement: string      // 이달 천간 오행
    monthBranchElement: string
    sipseongName: string      // 이달 천간의 십성
    isYongsin: boolean
    isGisin: boolean
    stemHap: boolean          // 이달 천간이 내 일간과 합
  }
}

/** 월운 채점 */
export function scoreMonthlyFortune(input: MonthlyFortuneInput): MonthlyFortuneScore {
  const { myDayStem, myDayBranch, myMonthBranch, yongsin, heeksin, gisin, monthStem, monthBranch } = input

  const dayEl = STEM_EL[myDayStem] ?? ''
  const mEl = STEM_EL[monthStem] ?? ''
  const mbEl = BRANCH_EL[monthBranch] ?? ''

  // ── ① 오행·용신 30점 ──────────────────────────────
  // 이달의 기운(천간+지지 오행)이 내게 필요한 것인가
  let ohaeng = 0
  const score1 = (el: string): number => {
    if (el === yongsin) return 15
    if (el === heeksin) return 11
    if (el === gisin) return 2
    return 7   // 한신·구신 등 그 밖 — 나쁘지도 좋지도 않음
  }
  ohaeng = score1(mEl) + score1(mbEl)

  // ── ② 천간 20점 ──────────────────────────────────
  // 일간 기준. 합이면 가장 좋고, 생해주면 좋고, 극하면 낮다.
  let stem: number
  if (STEM_HAP[myDayStem] === monthStem) stem = 20        // 천간합
  else if (GEN[mEl] === dayEl) stem = 16                  // 이달이 나를 생함
  else if (mEl === dayEl) stem = 12                       // 같은 오행(비겁)
  else if (GEN[dayEl] === mEl) stem = 10                  // 내가 이달을 생함
  else if (CTRL[mEl] === dayEl) stem = 4                  // 이달이 나를 극함
  else stem = 8                                           // 내가 이달을 극함

  // ── ③ 지지 30점 = 월지 20 + 일지 10 ────────────────
  //    소스: "운을 일단 月支에 대입해라. 月支가 총사령관"
  const relEnv = JIJI_GRADE[myMonthBranch]?.[monthBranch]
  const relSelf = JIJI_GRADE[myDayBranch]?.[monthBranch]
  const envPt = relEnv ? BRANCH_MAX.month * GRADE_RATIO[relEnv.grade] : BRANCH_MAX.month * 0.5
  const selfPt = relSelf ? BRANCH_MAX.day * GRADE_RATIO[relSelf.grade] : BRANCH_MAX.day * 0.5
  const branch = envPt + selfPt

  // ── ④ 십성 20점 ──────────────────────────────────
  // 이달 천간이 나에게 어떤 자리인가. 인성·재성처럼 도움되는 자리에 높은 점수.
  const sipName = sipseongOf(dayEl, mEl)
  const SIPSEONG_PT: Record<string, number> = {
    인성: 16, 재성: 15, 식상: 13, 비겁: 11, 관성: 9,
  }
  const sipseong = SIPSEONG_PT[sipName] ?? 10

  const total = Math.round(ohaeng + stem + branch + sipseong)
  const grade: 'S' | 'A' | 'B' | 'C' =
    total >= CUTS.S ? 'S' : total >= CUTS.A ? 'A' : total >= CUTS.B ? 'B' : 'C'

  return {
    total,
    ohaeng: Math.round(ohaeng),
    stem,
    branch: Math.round(branch),
    sipseong,
    grade,
    area: {
      env: Math.round((envPt / BRANCH_MAX.month) * 100),
      envGrade: relEnv?.grade ?? 'C',
      envTag: relEnv?.tag ?? '',
      envDesc: relEnv?.desc ?? '',
      self: Math.round((selfPt / BRANCH_MAX.day) * 100),
      selfGrade: relSelf?.grade ?? 'C',
      selfTag: relSelf?.tag ?? '',
      selfDesc: relSelf?.desc ?? '',
    },
    flags: {
      monthElement: mEl,
      monthBranchElement: mbEl,
      sipseongName: sipName,
      isYongsin: mEl === yongsin || mbEl === yongsin,
      isGisin: mEl === gisin || mbEl === gisin,
      stemHap: STEM_HAP[myDayStem] === monthStem,
    },
  }
}

// ── 등급 이름 ─────────────────────────────────────────────────
// 겁주지 않기 원칙: 낮은 점수도 "나쁜 달"이라 하지 않는다.
// ⚠ 문구는 연재쌤 확인 대상.
export const MONTH_GRADE_LABEL: Record<'S' | 'A' | 'B' | 'C', string> = {
  S: '활짝 열리는 달',
  A: '순한 바람이 부는 달',
  B: '차곡차곡 쌓는 달',
  C: '숨 고르는 달',
}

/** 막대·글씨 색 (피치톤) */
export const MONTH_GRADE_COLOR: Record<'S' | 'A' | 'B' | 'C', { bar: string; text: string }> = {
  S: { bar: '#e09030', text: '#96502e' },
  A: { bar: '#e09030', text: '#96502e' },
  B: { bar: '#d9a878', text: '#b4785a' },
  C: { bar: '#cbb5a0', text: '#b4785a' },
}

// ── 1년 흐름 ─────────────────────────────────────────────────
// 화면에서 "지난달보다 몇 점" · 막대 그래프로 쓴다. AI 호출 없음.

export interface MonthTrendItem {
  month: number          // 1~12 (양력 기준 월 번호)
  monthStem: string
  monthBranch: string
  total: number
  grade: 'S' | 'A' | 'B' | 'C'
}

/**
 * 12개월치 월운 점수를 한 번에 낸다.
 * @param wolunList lib/saju/dayun.ts 의 calcWolunList() 결과를 그대로 넘긴다
 */
export function monthTrend(
  base: Omit<MonthlyFortuneInput, 'monthStem' | 'monthBranch'>,
  wolunList: Array<{ month: number; cheongan: string; jiji: string }>,
): MonthTrendItem[] {
  return wolunList.map((w) => {
    const r = scoreMonthlyFortune({ ...base, monthStem: w.cheongan, monthBranch: w.jiji })
    return {
      month: w.month,
      monthStem: w.cheongan,
      monthBranch: w.jiji,
      total: r.total,
      grade: r.grade,
    }
  })
}

// ── 이번 달 좋은 날 ───────────────────────────────────────────
// 그 달의 날짜별 일진을 내 일지와 대조해 등급을 매긴다.
// ⚠ 오늘의 운세(dailyFortune.ts)와는 별개의 간단 계산이다.
//   "이 달 안에서 상대적으로 나은 날"을 고르는 용도라 지지 관계만 본다.

export interface GoodDayItem {
  day: number
  branch: string
  grade: JijiGrade
  tag: string
}

/**
 * 그 달에서 좋은 날 / 조심할 날을 뽑는다.
 * @param ilunList lib/saju/dayun.ts 의 calcIlunList() 결과
 * @param myDayBranch 내 일지
 */
export function pickGoodDays(
  ilunList: Array<{ day: number; jiji: string }>,
  myDayBranch: string,
  opt: { good?: number; bad?: number } = {},
): { good: GoodDayItem[]; bad: GoodDayItem[] } {
  const goodN = opt.good ?? 3
  const badN = opt.bad ?? 1

  const rows: GoodDayItem[] = ilunList.map((d) => {
    const rel = JIJI_GRADE[myDayBranch]?.[d.jiji]
    return {
      day: d.day,
      branch: d.jiji,
      grade: rel?.grade ?? 'C',
      tag: rel?.tag ?? '',
    }
  })

  const order: Record<JijiGrade, number> = { A: 0, B: 1, C: 2, D: 3 }
  const sorted = [...rows].sort((a, b) => order[a.grade] - order[b.grade] || a.day - b.day)

  // 좋은 날은 A만 (없으면 B까지), 조심할 날은 D만 (없으면 비움)
  const aOnly = sorted.filter((r) => r.grade === 'A')
  const good = (aOnly.length >= goodN ? aOnly : sorted.filter((r) => r.grade === 'A' || r.grade === 'B'))
    .slice(0, goodN)
    .sort((a, b) => a.day - b.day)
  const bad = rows.filter((r) => r.grade === 'D').slice(0, badN)

  return { good, bad }
}
