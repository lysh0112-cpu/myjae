// lib/saju/ganji.ts
import { getSolarTermMoment } from './solarterm'

const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"]
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"]

/**
 * ★2026-07-27 — 입춘도 "시각"까지 본다.
 *   입춘 당일 태생의 년주가 반쯤 틀려 있었다. (2027 입춘은 2월 4일 10시 52분)
 * @param birthMinute 태어난 시각(자정부터 몇 분). 모르면 예전처럼 당일=이전 해.
 */
export async function getYearGanji(
  year: number, month: number, day: number, apiKey: string,
  birthMinute?: number | null,
): Promise<string> {
  const lichun = await getSolarTermMoment(year, 2, apiKey)
  const lichunMin = lichun.hour * 60 + lichun.minute
  const passed = day > lichun.day || (day === lichun.day && birthMinute != null && birthMinute >= lichunMin)
  let adjustedYear = year
  if (month < 2 || (month === 2 && !passed)) adjustedYear = year - 1
  const BASE_YEAR = 1984
  const offset = ((adjustedYear - BASE_YEAR) % 60 + 60) % 60
  return STEMS[offset % 10] + BRANCHES[offset % 12]
}

/**
 * ★2026-07-27 — 절입 "시각"까지 본다.
 *
 * [무엇이 틀렸었나]
 *   `if (day <= termDay) 이전 월` — 절입일 당일은 무조건 이전 월로 봤다.
 *   그런데 절기는 하루 중 어느 순간에 든다. 2026년 대설은 12월 7일 11시 53분이다.
 *     12월 7일 11시 출생 → 아직 亥월    12월 7일 12시 30분 출생 → 子월
 *   당일 태생의 월주가 반쯤 틀려 있었다. **월주가 틀리면 명식이 통째로 틀린다.**
 *   (하늘도마뱀과 대조하다 2026-11-07·2026-12-07 두 건에서 드러났다)
 *
 * @param birthMinute 태어난 시각(자정부터 몇 분). 모르면 넘기지 않는다.
 *                    없으면 예전처럼 "당일=이전 월" 로 본다. 시를 모르면 가릴 길이 없다.
 */
export async function getMonthGanji(
  year: number, month: number, day: number, apiKey: string,
  birthMinute?: number | null,
): Promise<string> {
  const term = await getSolarTermMoment(year, month, apiKey)
  const termMin = term.hour * 60 + term.minute
  /** 그 절기를 이미 지났는가 */
  const passed = (d: number, t: { day: number }, tMin: number) =>
    d > t.day || (d === t.day && birthMinute != null && birthMinute >= tMin)
  let monthIdx = month
  if (!passed(day, term, termMin)) {
    monthIdx = month - 1
    if (monthIdx < 1) monthIdx = 12
  }
  const lichun = await getSolarTermMoment(year, 2, apiKey)
  const lichunMin = lichun.hour * 60 + lichun.minute
  let adjustedYear = year
  if (month < 2 || (month === 2 && !passed(day, lichun, lichunMin))) adjustedYear = year - 1
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
  const stemOffset = (monthBranchIdx - 2 + 12) % 12
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
  const idx = ((totalDays + 10) % 60 + 60) % 60
  return STEMS[idx % 10] + BRANCHES[idx % 12]
}
