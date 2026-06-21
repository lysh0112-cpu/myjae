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
  const BASE_YEAR = 2000, BASE_MONTH = 1, BASE_DAY = 1, BASE_IDX = 54
  let days = 0
  if (year > BASE_YEAR || (year === BASE_YEAR && month > BASE_MONTH) ||
      (year === BASE_YEAR && month === BASE_MONTH && day >= BASE_DAY)) {
    for (let y = BASE_YEAR; y < year; y++) days += isLeapYear(y) ? 366 : 365
    for (let m = BASE_MONTH; m < month; m++) days += daysInMonth(year, m)
    days += day - BASE_DAY
  } else {
    for (let y = year; y < BASE_YEAR; y++) days -= isLeapYear(y) ? 366 : 365
    for (let m = month; m < BASE_MONTH; m++) days -= daysInMonth(BASE_YEAR, m)
    days -= BASE_DAY - day
  }
  const idx = ((days + BASE_IDX) % 60 + 60) % 60
  return STEMS[idx % 10] + BRANCHES[idx % 12]
}
