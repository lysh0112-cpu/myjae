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

// 간지 순서
const STEMS  = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

// 충 쌍
const CHUNG_PAIRS = [
  ['子','午'],['丑','未'],['寅','申'],
  ['卯','酉'],['辰','戌'],['巳','亥']
]

// 월별 지지 (양력 기준 절기 후)
const MONTH_BRANCH: Record<number, string> = {
  1:'丑', 2:'寅', 3:'卯', 4:'辰', 5:'巳', 6:'午',
  7:'未', 8:'申', 9:'酉', 10:'戌', 11:'亥', 12:'子'
}

// =============================================
// 일진 계산
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

// =============================================
// 손없는날 계산 (음력 기준)
// =============================================

// 음력 날짜에서 손없는날 여부
// 손없는날: 음력 9, 10, 19, 20, 29, 30일
function isSonEomneunNal(lunarDay: number): boolean {
  return [9, 10, 19, 20, 29, 30].includes(lunarDay)
}

// 월기일: 음력 5, 14, 23일
function isWolgiNal(lunarDay: number): boolean {
  return [5, 14, 23].includes(lunarDay)
}

// =============================================
// 한국 공휴일 + 대체공휴일
// =============================================

// 고정 공휴일
const FIXED_HOLIDAYS: string[] = [
  '01-01', // 신정
  '03-01', // 삼일절
  '05-05', // 어린이날
  '06-06', // 현충일
  '08-15', // 광복절
  '10-03', // 개천절
  '10-09', // 한글날
  '12-25', // 성탄절
]

// 연도별 대체공휴일 (주요 연도 수동 입력)
const SUBSTITUTE_HOLIDAYS: Record<string, string[]> = {
  '2026': [
    '2026-02-02', // 설 연휴 대체
    '2026-05-06', // 어린이날 대체
    '2026-09-28', // 추석 연휴
    '2026-09-29',
    '2026-09-30',
    '2026-10-01', // 추석 대체
  ],
  '2027': [
    '2027-01-28', // 설 연휴
    '2027-01-29',
    '2027-03-01',
    '2027-05-05',
    '2027-09-20', // 추석 연휴
    '2027-09-21',
    '2027-09-22',
  ],
  '2028': [
    '2028-02-16', // 설 연휴
    '2028-02-17',
    '2028-02-18',
    '2028-05-05',
    '2028-09-30', // 추석
    '2028-10-02',
  ],
}

function isHoliday(dateStr: string): boolean {
  const date = new Date(dateStr)
  const mmdd = dateStr.slice(5)
  const year = dateStr.slice(0, 4)

  if (FIXED_HOLIDAYS.includes(mmdd)) return true
  if (SUBSTITUTE_HOLIDAYS[year]?.includes(dateStr)) return true

  const day = date.getDay()
  if (day === 0 || day === 6) return true

  return false
}

// =============================================
// 일진 점수 계산
// =============================================

function calcDayScore(
  dayGanji: { stem: string; branch: string },
  yongsin1: string,
  yongsin2: string,
  ilji1: string,
  ilji2: string,
  month: number
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  const dayElement = STEM_ELEMENT[dayGanji.stem]
  const dayBranchElement = BRANCH_ELEMENT[dayGanji.branch]

  // 일진 천간 오행 vs 용신
  const rel1 = getElementRel(dayElement, yongsin1)
  const rel2 = getElementRel(dayElement, yongsin2)

  if (rel1 === 'same' || rel1 === 'generates') {
    score += 8
    reasons.push(`일진 천간(${dayGanji.stem})이 신랑 용신(${yongsin1})에 유리`)
  } else if (rel1 === 'controls') {
    score -= 5
    reasons.push(`일진 천간(${dayGanji.stem})이 신랑 용신(${yongsin1})을 극함`)
  }

  if (rel2 === 'same' || rel2 === 'generates') {
    score += 8
    reasons.push(`일진 천간(${dayGanji.stem})이 신부 용신(${yongsin2})에 유리`)
  } else if (rel2 === 'controls') {
    score -= 5
    reasons.push(`일진 천간(${dayGanji.stem})이 신부 용신(${yongsin2})을 극함`)
  }

  // 일진 지지 vs 두 사람 일지 충
  if (isChung(dayGanji.branch, ilji1)) {
    score -= 15
    reasons.push(`일진 지지(${dayGanji.branch})가 신랑 일지(${ilji1})와 충 — 매우 불길`)
  }
  if (isChung(dayGanji.branch, ilji2)) {
    score -= 15
    reasons.push(`일진 지지(${dayGanji.branch})가 신부 일지(${ilji2})와 충 — 매우 불길`)
  }

  // 계절 오행 vs 용신
  const monthBranch = MONTH_BRANCH[month]
  const seasonElement = BRANCH_ELEMENT[monthBranch]
  if (seasonElement === yongsin1 || seasonElement === yongsin2) {
    score += 5
    reasons.push(`${month}월 계절 오행(${seasonElement})이 용신과 일치`)
  }

  return { score, reasons }
}

function getElementRel(e1: string, e2: string): string {
  if (e1 === e2) return 'same'
  if (GENERATES[e1] === e2) return 'generates'
  if (CONTROLS[e1] === e2) return 'controls'
  if (CONTROLS[e2] === e1) return 'controlled'
  return 'neutral'
}

function isChung(b1: string, b2: string): boolean {
  return CHUNG_PAIRS.some(([a, b]) => (b1 === a && b2 === b) || (b1 === b && b2 === a))
}

// =============================================
// 메인: 택일 후보 날짜 생성
// =============================================

export interface TaegilCandidate {
  date: string          // YYYY-MM-DD
  dayOfWeek: string     // 요일
  score: number         // 종합 점수
  isHoliday: boolean
  isSonEomneun: boolean // 손없는날
  isWolgi: boolean      // 월기일
  samjaeAdvice: string  // 삼재 조언
  dayGanji: string      // 일진 (甲子 형태)
  reasons: string[]     // 좋은 이유
  warnings: string[]    // 주의사항
}

export interface TaegilOptions {
  yongsin1: string      // 신랑 용신
  yongsin2: string      // 신부 용신
  ilji1: string         // 신랑 일지
  ilji2: string         // 신부 일지
  yeonji1: string       // 신랑 년지 (삼재용)
  yeonji2: string       // 신부 년지 (삼재용)
  monthsAhead?: number  // 몇 개월 후까지 (기본 24)
  targetYear?: number   // 특정 년도만
}

const DAY_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토']

export function generateTaegilCandidates(
  options: TaegilOptions,
  lunarDayMap: Map<string, { lunarDay: number; yeonji: string }>
): TaegilCandidate[] {
  const {
    yongsin1, yongsin2, ilji1, ilji2,
    yeonji1, yeonji2,
    monthsAhead = 24,
    targetYear,
  } = options

  const candidates: TaegilCandidate[] = []
  const today = new Date()
  const end = new Date(today)
  end.setMonth(end.getMonth() + monthsAhead)

  const cur = new Date(today)
  cur.setDate(cur.getDate() + 14) // 최소 2주 후부터

  while (cur <= end) {
    const dateStr = cur.toISOString().slice(0, 10)
    const year = cur.getFullYear()
    const month = cur.getMonth() + 1
    const day = cur.getDate()
    const dow = cur.getDay()

    // 특정 년도 필터
    if (targetYear && year !== targetYear) {
      cur.setDate(cur.getDate() + 1)
      continue
    }

    // 주말/공휴일만 대상
    if (!isHoliday(dateStr)) {
      cur.setDate(cur.getDate() + 1)
      continue
    }

    const reasons: string[] = []
    const warnings: string[] = []
    let score = 50 // 기본 점수

    // 음력 정보
    const lunarInfo = lunarDayMap.get(dateStr)
    const lunarDay = lunarInfo?.lunarDay ?? 0
    const yearBranch = lunarInfo?.yeonji ?? ''

    // 손없는날
    const isSonEomneun = lunarDay > 0 ? isSonEomneunNal(lunarDay) : false
    if (isSonEomneun) {
      score += 15
      reasons.push(`손없는날 (음력 ${lunarDay}일)`)
    }

    // 월기일
    const isWolgi = lunarDay > 0 ? isWolgiNal(lunarDay) : false
    if (isWolgi) {
      score -= 20
      warnings.push(`월기일 (음력 ${lunarDay}일) — 결혼 피하는 것이 좋음`)
    }

    // 삼재
    const samjae = calcCoupleSamjae(yeonji1, yeonji2, yearBranch)
    score += samjae.scoreImpact
    const samjaeAdvice = samjae.advice
    if (samjae.isAnySamjae) {
      warnings.push(samjaeAdvice)
    } else {
      reasons.push(samjaeAdvice)
    }

    // 일진 점수
    const dayGanji = getDayGanji(year, month, day)
    const { score: dayScore, reasons: dayReasons } = calcDayScore(
      dayGanji, yongsin1, yongsin2, ilji1, ilji2, month
    )
    score += dayScore
    reasons.push(...dayReasons.filter(r => dayScore >= 0))
    warnings.push(...dayReasons.filter(r => dayScore < 0))

    // 공휴일 연휴 보너스
    const dayOfWeekStr = DAY_OF_WEEK[dow]
    if (dow === 6) { // 토요일
      score += 3
      reasons.push('토요일 — 하객 참석 용이')
    }
    if (dow === 0) { // 일요일
      score += 5
      reasons.push('일요일 — 전통적 결혼 선호일')
    } 

    candidates.push({
      date: dateStr,
      dayOfWeek: dayOfWeekStr,
      score: Math.max(0, Math.min(100, score)),
      isHoliday: true,
      isSonEomneun,
      isWolgi,
      samjaeAdvice,
      dayGanji: dayGanji.stem + dayGanji.branch,
      reasons: reasons.filter(Boolean),
      warnings: warnings.filter(Boolean),
    })

    cur.setDate(cur.getDate() + 1)
  }

  // 점수 높은 순 정렬
  return candidates
    .filter(c => !c.isWolgi)        // 월기일 제외
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)                    // 상위 20개
}
