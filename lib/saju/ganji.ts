// lib/saju/ganji.ts
import { getSolarTermDay } from './solarterm'

const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"]
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"]

export async function getYearGanji(
  year: number, month: number, day: number, apiKey: string
): Promise<string> {
  const lichunDay = await getSolarTermDay(year, 2, apiKey)
  let adjustedYear = year
  if (month < 2 || (month === 2 && day < lichunDay)) adjustedYear = year - 1
  const BASE_YEAR = 1984
  const offset = ((adjustedYear - BASE_YEAR) % 60 + 60) % 60
  return STEMS[offset % 10] + BRANCHES[offset % 12]
}

export async function getMonthGanji(
  year: number, month: number, day: number, apiKey: string
): Promise<string> {
  const termDay = await getSolarTermDay(year, month, apiKey)
  let monthIdx = month
  if (day < termDay) {
    monthIdx = month - 1
    if (monthIdx < 1) monthIdx = 12
  }
  const lichunDay = await getSolarTermDay(year, 2, apiKey)
  let adjustedYear = year
  if (month < 2 || (month === 2 && day < lichunDay)) adjustedYear = year - 1
  const BASE_YEAR = 1984
  const yearOffset = ((adjustedYear - BASE_YEAR) % 60 + 60) % 60
  const yearStemIdx = yearOffset % 10
  const inMonthStemBase = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0]
  const inMonthStemIdx = inMonthStemBase[yearStemIdx]
  const branchMap: Record<number, number> = {
    1:1, 2:2, 3:3, 4:4, 5:5, 6:6,
    7:7, 8:8, 9:9, 10:10, 11:11, 12:0
  }
  const monthBranchIdx = branchMap[monthIdx]
  let stemOffset = monthBranchIdx - 2
  if (stemOffset < 0) stemOffset += 12
  const monthStemIdx = (inMonthStemIdx + stemOffset) % 10
  return STEMS[monthStemIdx] + BRANCHES[monthBranchIdx]
}

export function getDayGanji(year: number, month: number, day: number): string {
  function isLeapYear(y: number): boolean {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
  }
  function daysInMonth(y: number, m: number): number {
    return [0,31,isLeapYear(y)?29:28,31,30,31,30,31,31,30,31,30,31][m]
  }
  let totalDays = 0
  for (let y = 1900; y < year; y++) {
    totalDays += isLeapYear(y) ? 366 : 365
  }
  for (let m = 1; m < month; m++) {
    totalDays += daysInMonth(year, m)
  }
  totalDays += day - 1
  // ✅ 1900.1.1 = 甲戌 = index 14
  const idx = ((totalDays + 10) % 60 + 60) % 60
  return STEMS[idx % 10] + BRANCHES[idx % 12]
}
