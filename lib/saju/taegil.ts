// lib/saju/taegil.ts
// 결혼 택일 계산 로직

import { calcCoupleSamjae } from './samjae'

// =============================================
// 상수
// =============================================

const STEM_ELEMENT: Record<string, string> = {
  甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',
  己:'토',庚:'금',辛:'금',壬:'수',癸:'수'
}
const BRANCH_ELEMENT: Record<string, string> = {
  子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',
  午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수'
}
const GENERATES: Record<string, string> = {
  목:'화', 화:'토', 토:'금', 금:'수', 수:'목'
}
const CONTROLS: Record<string, string> = {
  목:'토', 화:'금', 토:'수', 금:'목', 수:'화'
}

const STEMS   = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

const CHUNG_PAIRS = [
  ['子','午'],['丑','未'],['寅','申'],
  ['卯','酉'],['辰','戌'],['巳','亥']
]

const MONTH_BRANCH: Record<number, string> = {
  1:'丑', 2:'寅', 3:'卯', 4:'辰', 5:'巳', 6:'午',
  7:'未', 8:'申', 9:'酉', 10:'戌', 11:'亥', 12:'子'
}

const DAY_OF_WEEK = ['일','월','화','수','목','금','토']

// =============================================
// 유틸
// =============================================

function getDayGanji(year: number, month: number, day: number): { stem: string; branch: string } {
  function isLeapYear(y: number): boolean {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
  }
  function daysInMonth(y: number, m: number): number {
    return [0,31,isLeapYear(y)?29:28,31,30,31,30,31,31,30,31,30,31][m]
  }
  let totalDays = 0
  for (let y = 1900; y < year; y++) totalDays += isLeapYear(y) ? 366 : 365
  for (let m = 1; m < month; m++) totalDays += daysInMonth(year, m)
  totalDays += day - 1
  const idx = ((totalDays + 10) % 60 + 60) % 60
  return { stem: STEMS[idx % 10], branch: BRANCHES[idx % 12] }
}

function getElementRel(e1: string, e2: string): string {
  if (!e1 || !e2) return 'neutral'
  if (e1 === e2) return 'same'
  if (GENERATES[e1] === e2) return 'generates'
  if (CONTROLS[e1] === e2) return 'controls'
  if (CONTROLS[e2] === e1) return 'controlled'
  return 'neutral'
}

function isChung(b1: string, b2: string): boolean {
  return CHUNG_PAIRS.some(([a, b]) => (b1 === a && b2 === b) || (b1 === b && b2 === a))
}

function isSonEomneunNal(lunarDay: number): boolean {
  return [9, 10, 19, 20, 29, 30].includes(lunarDay)
}

function isWolgiNal(lunarDay: number): boolean {
  return [5, 14, 23].includes(lunarDay)
}

// =============================================
// 일진 점수
// =============================================

function calcDayScore(
  dayGanji: { stem: string; branch: string },
  yongsin1: string,
  yongsin2: string,
  ilji1: string,
  ilji2: string,
  month: number
): { score: number; reasons: string[]; warnings: string[] } {
  let score = 0
  const reasons: string[] = []
  const warnings: string[] = []

  const dayElement = STEM_ELEMENT[dayGanji.stem]

  // 일진 천간 오행 vs 용신1
  const rel1 = getElementRel(dayElement, yongsin1)
  if (rel1 === 'same' || rel1 === 'generates') {
    score += 8
    reasons.push(`일진 천간(${dayGanji.stem})이 신랑 용신(${yongsin1})에 유리`)
  } else if (rel1 === 'controls') {
    score -= 5
    warnings.push(`일진 천간(${dayGanji.stem})이 신랑 용신(${yongsin1})을 극함`)
  }

  // 일진 천간 오행 vs 용신2
  const rel2 = getElementRel(dayElement, yongsin2)
  if (rel2 === 'same' || rel2 === 'generates') {
    score += 8
    reasons.push(`일진 천간(${dayGanji.stem})이 신부 용신(${yongsin2})에 유리`)
  } else if (rel2 === 'controls') {
    score -= 5
    warnings.push(`일진 천간(${dayGanji.stem})이 신부 용신(${yongsin2})을 극함`)
  }

  // 일진 지지 vs 두 사람 일지 충
  if (ilji1 && isChung(dayGanji.branch, ilji1)) {
    score -= 15
    warnings.push(`일진 지지(${dayGanji.branch})가 신랑 일지(${ilji1})와 충 — 매우 불길`)
  }
  if (ilji2 && isChung(dayGanji.branch, ilji2)) {
    score -= 15
    warnings.push(`일진 지지(${dayGanji.branch})가 신부 일지(${ilji2})와 충 — 매우 불길`)
  }

  // 계절 오행 vs 용신
  const seasonElement = BRANCH_ELEMENT[MONTH_BRANCH[month]]
  if (seasonElement === yongsin1 || seasonElement === yongsin2) {
    score += 5
    reasons.push(`${month}월 계절 오행(${seasonElement})이 용신과 일치`)
  }

  // 요일 보너스는 외부에서 처리
  return { score, reasons, warnings }
}

// =============================================
// 인터페이스
// =============================================

export interface TaegilCandidate {
  date: string
  dayOfWeek: string
  score: number
  isHoliday: boolean
  isSonEomneun: boolean
  isWolgi: boolean
  samjaeAdvice: string
  dayGanji: string
  reasons: string[]
  warnings: string[]
}

export interface TaegilOptions {
  yongsin1: string
  yongsin2: string
  ilji1: string
  ilji2: string
  yeonji1: string
  yeonji2: string
}

export interface LunarInfo {
  lunarDay: number
  yeonji: string  // 해당 날짜의 년지 (삼재 계산용)
}

// =============================================
// 메인 함수 — 외부에서 날짜 목록 받아서 처리
// =============================================

export function generateTaegilCandidates(
  dates: string[],                          // 외부에서 받은 날짜 목록 (YYYY-MM-DD)
  lunarMap: Map<string, LunarInfo>,         // 음력 정보 맵
  options: TaegilOptions
): TaegilCandidate[] {
  const { yongsin1, yongsin2, ilji1, ilji2, yeonji1, yeonji2 } = options

  const candidates: TaegilCandidate[] = []

  for (const dateStr of dates) {
    const dateObj = new Date(dateStr)
    const year  = dateObj.getFullYear()
    const month = dateObj.getMonth() + 1
    const day   = dateObj.getDate()
    const dow   = dateObj.getDay()

    const reasons: string[] = []
    const warnings: string[] = []
    let score = 50

    // 음력 정보
    const lunarInfo = lunarMap.get(dateStr)
    const lunarDay  = lunarInfo?.lunarDay ?? 0
    const yearBranch = lunarInfo?.yeonji ?? ''

    // 손없는날
    const isSonEomneun = lunarDay > 0 ? isSonEomneunNal(lunarDay) : false
    if (isSonEomneun) {
      score += 15
      reasons.push(`손없는날 (음력 ${lunarDay}일)`)
    }

    // 월기일 — 제외
    const isWolgi = lunarDay > 0 ? isWolgiNal(lunarDay) : false
    if (isWolgi) {
      score -= 25
      warnings.push(`월기일 (음력 ${lunarDay}일) — 결혼 피하는 것이 좋음`)
    }

    // 삼재
    const samjae = yearBranch
      ? calcCoupleSamjae(yeonji1, yeonji2, yearBranch)
      : { isAnySamjae: false, scoreImpact: 0, advice: '' }
    score += samjae.scoreImpact
    const samjaeAdvice = samjae.advice || ''
    if (samjae.isAnySamjae) {
      warnings.push(samjaeAdvice)
    } else if (samjaeAdvice) {
      reasons.push(samjaeAdvice)
    }

    // 일진 점수
    const dayGanji = getDayGanji(year, month, day)
    const { score: dayScore, reasons: dayR, warnings: dayW } = calcDayScore(
      dayGanji, yongsin1, yongsin2, ilji1, ilji2, month
    )
    score += dayScore
    reasons.push(...dayR)
    warnings.push(...dayW)

    // 요일 보너스
    if (dow === 0) {
      score += 5
      reasons.push('일요일 — 전통적 결혼 선호일')
    } else if (dow === 6) {
      score += 3
      reasons.push('토요일 — 하객 참석 용이')
    }

    candidates.push({
      date: dateStr,
      dayOfWeek: DAY_OF_WEEK[dow],
      score: Math.max(0, Math.min(100, score)),
      isHoliday: true,
      isSonEomneun,
      isWolgi,
      samjaeAdvice,
      dayGanji: dayGanji.stem + dayGanji.branch,
      reasons: reasons.filter(Boolean),
      warnings: warnings.filter(Boolean),
    })
  }

  // 월기일 제외 + 점수 높은 순 정렬 + 상위 20개
  return candidates
    .filter(c => !c.isWolgi)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
}
