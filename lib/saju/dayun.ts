// lib/saju/dayun.ts
// 대운/세운/월운 계산 로직

import { STEMS, BRANCHES } from './constants'

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

// 육친 계산
function getSipsin(dayStem: string, targetStem: string): string {
  if (!targetStem || targetStem === '?') return ''
  const HEAVENLY_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
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
const BRANCH_YIN: Record<string,boolean> = {子:true,丑:true,寅:false,卯:true,辰:false,巳:true,午:false,未:true,申:false,酉:true,戌:false,亥:true}

function getSipsinBranch(dayStem: string, branch: string): string {
  if (!branch || branch === '?') return ''
  const HEAVENLY_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
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

/**
 * 대운 계산
 * @param birthYear 출생년도
 * @param monthGanji 월주 (예: '壬子')
 * @param yearStem 년간
 * @param gender 성별
 * @param dayStem 일간
 */
export function calcDayunList(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  monthGanji: string,
  yearStem: string,
  gender: string,
  dayStem: string
): DayunItem[] {
  const HEAVENLY_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
  const EARTHLY_BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

  const yearStemIdx = HEAVENLY_STEMS.indexOf(yearStem)
  const isYangYear = yearStemIdx % 2 === 0
  const isMale = gender === '남'
  const isForward = (isYangYear && isMale) || (!isYangYear && !isMale)

  const monthStem = monthGanji[0]
  const monthBranch = monthGanji[1]
  let stemIdx = HEAVENLY_STEMS.indexOf(monthStem)
  let branchIdx = EARTHLY_BRANCHES.indexOf(monthBranch)

  const list: DayunItem[] = []
  // 대운수 계산 (절기까지 남은 일수 / 3)
  const startAge = calcDayunStartAge(birthYear, birthMonth, birthDay, isForward)

  for (let i = 0; i < 8; i++) {
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

// 대운 시작 나이 계산 (절기 기반 간략 버전)
function calcDayunStartAge(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  isForward: boolean
): number {
  // 절기까지 남은 일수를 3으로 나눈 값 (반올림)
  // 간략 계산: 월 중간 기준 약 15일로 근사
  const termDay = 6 // 절기 평균 6일 근사
  let daysToTerm: number
  if (isForward) {
    daysToTerm = termDay > birthDay ? termDay - birthDay : 30 - birthDay + termDay
  } else {
    daysToTerm = birthDay > termDay ? birthDay - termDay : birthDay + 30 - termDay
  }
  return Math.max(1, Math.round(daysToTerm / 3))
}

/**
 * 세운 계산 (현재 기준 ±10년)
 */
export function calcSeyunList(dayStem: string, currentYear: number): SeyunItem[] {
  const HEAVENLY_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
  const EARTHLY_BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

  const list: SeyunItem[] = []
  for (let year = currentYear - 5; year <= currentYear + 20; year++) {
    const offset = ((year - 4) % 60 + 60) % 60
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
 */
export function calcWolunList(dayStem: string, year: number): WolunItem[] {
  const HEAVENLY_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
  const EARTHLY_BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

  // 년간 기준 월간 시작
  const yearOffset = ((year - 4) % 60 + 60) % 60
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
