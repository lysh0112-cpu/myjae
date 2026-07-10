// lib/saju/dayun.ts
// 대운/세운/월운 계산 로직
// [수정] 대운수(첫 대운 나이)를 양력 생일 + 실제 절입일 기준으로 정확히 계산

import { CHEONGAN as STEMS, JIJI as BRANCHES } from './constants'
import { getSolarTermDay } from './solarterm'

export interface DayunItem {
  age: number
  cheongan: string
  jiji: string
  ganYukchin: string
  jiYukchin: string
}

export interface SeyunItem {
  year: number
  cheongan: string
  jiji: string
  ganYukchin: string
  jiYukchin: string
}

export interface WolunItem {
  month: number
  cheongan: string
  jiji: string
  ganYukchin: string
  jiYukchin: string
}

const HEAVENLY_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const EARTHLY_BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

// ─────────────────────────────────────────────
// 대운수 반올림 규칙 (검수용 상수: 3일 = 1년)
// 연재 선생님 검수 후 이 값/방식만 조정하면 전체 적용됨
const DAYS_PER_DAYUN_YEAR = 3
// ─────────────────────────────────────────────

// 육친(천간) 계산
function getSipsin(dayStem: string, targetStem: string): string {
  if (!targetStem || targetStem === '?') return ''
  const STEM_ELEMENT: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
  const dayIdx = HEAVENLY_STEMS.indexOf(dayStem)
  const targetIdx = HEAVENLY_STEMS.indexOf(targetStem)
  const dayElement = STEM_ELEMENT[dayStem]
  const targetElement = STEM_ELEMENT[targetStem]
  const sameYin = (dayIdx % 2) === (targetIdx % 2)
  const generates: Record<string,string> = {목:'화',화:'토',토:'금',금:'수',수:'목'}
  const controls: Record<string,string> = {목:'토',화:'금',토:'수',금:'목',수:'화'}
  if (dayElement === targetElement) return sameYin ? '비견' : '겁재'
  if (generates[dayElement] === targetElement) return sameYin ? '식신' : '상관'
  if (controls[dayElement] === targetElement) return sameYin ? '편재' : '정재'
  if (controls[targetElement] === dayElement) return sameYin ? '편관' : '정관'
  if (generates[targetElement] === dayElement) return sameYin ? '편인' : '정인'
  return ''
}

const BRANCH_ELEMENT: Record<string,string> = {子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수'}
const BRANCH_YIN: Record<string,boolean> = {子:true,丑:true,寅:false,卯:true,辰:false,巳:false,午:true,未:true,申:false,酉:true,戌:false,亥:false}

// 육친(지지) 계산
function getSipsinBranch(dayStem: string, branch: string): string {
  if (!branch || branch === '?') return ''
  const STEM_ELEMENT: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
  const branchElement = BRANCH_ELEMENT[branch]
  const dayElement = STEM_ELEMENT[dayStem]
  const dayIdx = HEAVENLY_STEMS.indexOf(dayStem)
  const dayYin = dayIdx % 2 === 1
  const branchYin = BRANCH_YIN[branch]
  const sameYin = dayYin === branchYin
  const generates: Record<string,string> = {목:'화',화:'토',토:'금',금:'수',수:'목'}
  const controls: Record<string,string> = {목:'토',화:'금',토:'수',금:'목',수:'화'}
  if (dayElement === branchElement) return sameYin ? '비견' : '겁재'
  if (generates[dayElement] === branchElement) return sameYin ? '식신' : '상관'
  if (controls[dayElement] === branchElement) return sameYin ? '편재' : '정재'
  if (controls[branchElement] === dayElement) return sameYin ? '편관' : '정관'
  if (generates[branchElement] === dayElement) return sameYin ? '편인' : '정인'
  return ''
}

// 순행/역행 판정 (년간 음양 × 성별)
export function isForwardDayun(yearStem: string, gender: string): boolean {
  const yearStemIdx = HEAVENLY_STEMS.indexOf(yearStem)
  const isYangYear = yearStemIdx % 2 === 0
  const isMale = gender === '남'
  return (isYangYear && isMale) || (!isYangYear && !isMale)
}

// 두 양력 날짜 사이의 일수
function daysBetween(y1:number,m1:number,d1:number, y2:number,m2:number,d2:number): number {
  const a = Date.UTC(y1, m1-1, d1)
  const b = Date.UTC(y2, m2-1, d2)
  return Math.round((b - a) / 86400000)
}

/**
 * 대운수(첫 대운 시작 나이) 계산 — 정확판
 * 반드시 '양력' 생년월일을 넣을 것.
 * @param solarYear 양력 연
 * @param solarMonth 양력 월 (1~12)
 * @param solarDay 양력 일
 * @param isForward 순행 여부
 * @param apiKey KASI 절기 API 키 (서버에서 전달)
 */
export async function calcDayunStartAge(
  solarYear: number,
  solarMonth: number,
  solarDay: number,
  isForward: boolean,
  apiKey: string
): Promise<number> {
  let days: number
  if (isForward) {
    // 다음 절기(다음 달 절입일)까지
    let nm = solarMonth + 1
    let ny = solarYear
    if (nm > 12) { nm = 1; ny += 1 }
    const termDay = await getSolarTermDay(ny, nm, apiKey)
    days = daysBetween(solarYear, solarMonth, solarDay, ny, nm, termDay)
  } else {
    // 역행: 이번 달 절입일까지 거슬러. 생일이 절입일 전이면 직전 달 절기로.
    const termThis = await getSolarTermDay(solarYear, solarMonth, apiKey)
    const diffThis = daysBetween(solarYear, solarMonth, termThis, solarYear, solarMonth, solarDay)
    if (diffThis >= 0) {
      days = diffThis
    } else {
      let pm = solarMonth - 1
      let py = solarYear
      if (pm < 1) { pm = 12; py -= 1 }
      const termPrev = await getSolarTermDay(py, pm, apiKey)
      days = daysBetween(py, pm, termPrev, solarYear, solarMonth, solarDay)
    }
  }
  if (days < 0) days = 0
  return Math.max(1, Math.round(days / DAYS_PER_DAYUN_YEAR))
}

/**
 * 대운 목록 계산 — 정확판(async)
 * 반드시 '양력' 생년월일을 넣을 것.
 */
export async function calcDayunList(
  solarYear: number,
  solarMonth: number,
  solarDay: number,
  monthGanji: string,
  yearStem: string,
  gender: string,
  dayStem: string,
  apiKey: string
): Promise<DayunItem[]> {
  const isForward = isForwardDayun(yearStem, gender)

  const monthStem = monthGanji[0]
  const monthBranch = monthGanji[1]
  let stemIdx = HEAVENLY_STEMS.indexOf(monthStem)
  let branchIdx = EARTHLY_BRANCHES.indexOf(monthBranch)

  const startAge = await calcDayunStartAge(solarYear, solarMonth, solarDay, isForward, apiKey)

  const list: DayunItem[] = []
  for (let i = 0; i < 10; i++) {
    if (isForward) {
      stemIdx = (stemIdx + 1) % 10
      branchIdx = (branchIdx + 1) % 12
    } else {
      stemIdx = (stemIdx - 1 + 10) % 10
      branchIdx = (branchIdx - 1 + 12) % 12
    }
    const cheongan = HEAVENLY_STEMS[stemIdx]
    const jiji = EARTHLY_BRANCHES[branchIdx]
    list.push({
      age: startAge + i * 10,
      cheongan,
      jiji,
      ganYukchin: getSipsin(dayStem, cheongan),
      jiYukchin: getSipsinBranch(dayStem, jiji),
    })
  }
  return list
}

/**
 * 세운 계산 (현재 기준 -5 ~ +20년)
 * [수정] 기준년을 1984년(甲子年)으로 정정
 */
export function calcSeyunList(dayStem: string, currentYear: number): SeyunItem[] {
  const list: SeyunItem[] = []
  for (let year = currentYear - 5; year <= currentYear + 20; year++) {
    const offset = ((year - 1984) % 60 + 60) % 60
    const cheongan = HEAVENLY_STEMS[offset % 10]
    const jiji = EARTHLY_BRANCHES[offset % 12]
    list.push({
      year,
      cheongan,
      jiji,
      ganYukchin: getSipsin(dayStem, cheongan),
      jiYukchin: getSipsinBranch(dayStem, jiji),
    })
  }
  return list
}

/**
 * 월운 계산 (특정 년도의 12개월)
 * [수정] 년간 기준을 1984년(甲子年)으로 정정
 */
export function calcWolunList(dayStem: string, year: number): WolunItem[] {
  const yearOffset = ((year - 1984) % 60 + 60) % 60
  const yearStemIdx = yearOffset % 10
  const inMonthStemBase = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0]
  const inMonthStemIdx = inMonthStemBase[yearStemIdx]

  const branchMap: Record<number, number> = {
    1:1, 2:2, 3:3, 4:4, 5:5, 6:6,
    7:7, 8:8, 9:9, 10:10, 11:11, 12:0
  }

  const list: WolunItem[] = []
  for (let month = 1; month <= 12; month++) {
    const monthBranchIdx = branchMap[month]
    let stemOffset = monthBranchIdx - 2
    if (stemOffset < 0) stemOffset += 12
    const monthStemIdx = (inMonthStemIdx + stemOffset) % 10
    const cheongan = HEAVENLY_STEMS[monthStemIdx]
    const jiji = EARTHLY_BRANCHES[monthBranchIdx]
    list.push({
      month,
      cheongan,
      jiji,
      ganYukchin: getSipsin(dayStem, cheongan),
      jiYukchin: getSipsinBranch(dayStem, jiji),
    })
  }
  return list
}

// ── 일운 (특정 연·월의 날짜별 간지) ──────────────────────────────
export interface IlunItem {
  day: number
  cheongan: string
  jiji: string
  ganYukchin: string
  jiYukchin: string
}

// 양력 연·월·일 → 일진 간지 (getDayGanji와 동일 산식, 60갑자 순환)
function dayGanjiIdx(year: number, month: number, day: number): number {
  function isLeap(y: number): boolean { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 }
  function dim(y: number, m: number): number {
    return [0, 31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m]
  }
  let total = 0
  for (let y = 1900; y < year; y++) total += isLeap(y) ? 366 : 365
  for (let m = 1; m < month; m++) total += dim(year, m)
  total += day - 1
  return ((total + 10) % 60 + 60) % 60
}

/**
 * 일운 계산 (특정 양력 연·월의 1일~말일 날짜별 간지)
 * @param dayStem 일간 (십신 계산용)
 * @param year 양력 연도
 * @param month 양력 월 (1~12)
 */
export function calcIlunList(dayStem: string, year: number, month: number): IlunItem[] {
  function isLeap(y: number): boolean { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 }
  const daysInMonth = [0, 31, isLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]
  const list: IlunItem[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    const idx = dayGanjiIdx(year, month, day)
    const cheongan = HEAVENLY_STEMS[idx % 10]
    const jiji = EARTHLY_BRANCHES[idx % 12]
    list.push({
      day,
      cheongan,
      jiji,
      ganYukchin: getSipsin(dayStem, cheongan),
      jiYukchin: getSipsinBranch(dayStem, jiji),
    })
  }
  return list
}
