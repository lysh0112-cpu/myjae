// lib/saju/dayun.ts
// 대운/세운/월운 계산 로직
// [수정] 대운수(첫 대운 나이)를 양력 생일 + 실제 절입일 기준으로 정확히 계산

import { CHEONGAN as STEMS, JIJI as BRANCHES } from './constants'
import { getSolarTermMoment } from './solarterm'

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
/**
 * ★대운 간지열 — 월주에서 앞뒤로 나아간다. (2026-07-27 꺼냄)
 *
 * calcDayunList 안에 묻혀 있던 계산을 밖으로 꺼냈다.
 * 꺼낸 까닭: 출산택일(babyFilterV7)이 똑같은 것을 따로 만들어 쓰고 있었다.
 *   부품이 둘이면 한쪽만 고쳐 놓고 다른 쪽이 남는다. 하나로 모은다.
 *
 * ⚠️ 절기 API 가 필요 없다. 간지열은 월주와 방향만으로 정해진다.
 *    그래서 서버·화면 어디서든 부를 수 있다. (대운수는 절기가 필요해 서버 전용)
 */
export function dayunGanjiList(
  monthGanji: string, isForward: boolean, count = 10,
): Array<{ cheongan: string; jiji: string }> {
  let stemIdx = HEAVENLY_STEMS.indexOf(monthGanji[0])
  let branchIdx = EARTHLY_BRANCHES.indexOf(monthGanji[1])
  const out: Array<{ cheongan: string; jiji: string }> = []
  for (let i = 0; i < count; i++) {
    if (isForward) { stemIdx = (stemIdx + 1) % 10; branchIdx = (branchIdx + 1) % 12 }
    else { stemIdx = (stemIdx - 1 + 10) % 10; branchIdx = (branchIdx - 1 + 12) % 12 }
    out.push({ cheongan: HEAVENLY_STEMS[stemIdx], jiji: EARTHLY_BRANCHES[branchIdx] })
  }
  return out
}

export async function calcDayunStartAge(
  solarYear: number,
  solarMonth: number,
  solarDay: number,
  isForward: boolean,
  apiKey: string,
  birthMinute?: number | null,
): Promise<number> {
  // ★2026-07-27 — 절입 "시각"까지 본다.
  //
  //   [무엇이 틀렸었나]
  //     ① 순행일 때 무조건 "다음 달" 절입일을 봤다. 생일이 그 달 절입일보다 앞이면
  //        다음 절기는 이번 달인데 한 달을 통째로 더 셌다. (손님의 약 9%, 최대 11년)
  //     ② 절입일 "당일" 을 무조건 지난 것으로 봤다. 절기는 하루 중 어느 순간에 든다.
  //        2026년 입동은 11월 7일 18시 51분이다. 그날 12시 30분생은 아직 戌월이다.
  //
  //   [어떻게 확인했나]
  //     하늘도마뱀 앱과 열아홉 사례를 대조했다. 두 건이 이 ② 때문에 어긋났다.
  //       2026-11-07 12:30 여 · 2027-01-05 12:30 여
  //
  //   [지금 — 하늘도마뱀 18사례 전부 일치하는 방식]
  //     ① 어느 절기가 다음/지난 절기인지는 **시각까지** 보고 가른다.
  //     ② 날수는 **날짜로만** 센다.
  //     처음에는 ②도 시분까지 소수로 셌는데, 그러면 두 건이 어긋났다
  //     (1985-02-05·2002-12-11). 앱이 화면에 적는 소수값(大 9.6 등)과
  //     우리 값이 최대 0.42 벌어졌고 그 차이가 반올림을 뒤집었다.
  //     우리 절입 시각은 앱과 12분 이내로 맞으니, 앱이 날수를 날짜로 세는 것으로 본다.
  //
  //     birthMinute 이 없으면(시 모름) 예전처럼 당일=아직 안 지난 것으로 본다.
  const bMin = birthMinute ?? 0
  /** 그 절기를 이미 지났는가 — 여기만 시각을 본다 */
  const passed = (t: { day: number; hour: number; minute: number }) =>
    solarDay > t.day ||
    (solarDay === t.day && birthMinute != null && bMin >= t.hour * 60 + t.minute)
  /** 태어난 날에서 그 절입일까지 며칠인가 — 날짜로만 센다 */
  const gapDays = (
    ty: number, tm: number, t: { day: number },
  ) => daysBetween(solarYear, solarMonth, solarDay, ty, tm, t.day)

  const termThis = await getSolarTermMoment(solarYear, solarMonth, apiKey)
  let days: number

  if (isForward) {
    // 다음 절입 순간까지. 아직 이번 달 절기를 안 지났으면 그것이 다음 절기다.
    if (!passed(termThis)) {
      days = gapDays(solarYear, solarMonth, termThis)
    } else {
      let nm = solarMonth + 1, ny = solarYear
      if (nm > 12) { nm = 1; ny += 1 }
      days = gapDays(ny, nm, await getSolarTermMoment(ny, nm, apiKey))
    }
  } else {
    // 지난 절입 순간부터. 아직 이번 달 절기를 안 지났으면 직전 달 절기가 지난 절기다.
    if (passed(termThis)) {
      days = -gapDays(solarYear, solarMonth, termThis)
    } else {
      let pm = solarMonth - 1, py = solarYear
      if (pm < 1) { pm = 12; py -= 1 }
      days = -gapDays(py, pm, await getSolarTermMoment(py, pm, apiKey))
    }
  }

  if (days < 0) days = 0
  // 3일 = 1년. 최소 0. (하늘도마뱀과 맞춤 — 2026-07-27 대표님 확정)
  return Math.max(0, Math.round(days / DAYS_PER_DAYUN_YEAR))
}

/**
 * 대운 목록 계산 — 정확판(async)
 * 반드시 '양력' 생년월일을 넣을 것.
 */
/**
 * ★열두 시진 각각의 대운수를 한 번에 낸다. (2026-07-27)
 *
 * [왜 필요한가]
 *   출산택일은 후보 날짜 하나에 시진 여럿을 함께 본다.
 *   예전에는 "대운은 날짜와 성별로만 정해지니 시진이 달라도 같다"고 보고
 *   날짜당 한 번만 불렀다. 그런데 절입일 당일이면 시진에 따라 대운수가 갈린다.
 *
 * [어떻게]
 *   절입 순간은 날짜마다 하나뿐이니 절기 조회는 한 번(많아야 두 번)만 한다.
 *   그 값으로 열두 시진을 모두 계산한다. KASI 를 열두 번 부르지 않는다.
 */
export async function calcDayunStartAgeByHour(
  solarYear: number, solarMonth: number, solarDay: number,
  isForward: boolean, apiKey: string,
): Promise<number[]> {
  const termThis = await getSolarTermMoment(solarYear, solarMonth, apiKey)
  let other: { day: number; hour: number; minute: number }
  let oy: number, om: number
  if (isForward) { om = solarMonth + 1; oy = solarYear; if (om > 12) { om = 1; oy += 1 } }
  else { om = solarMonth - 1; oy = solarYear; if (om < 1) { om = 12; oy -= 1 } }
  other = await getSolarTermMoment(oy, om, apiKey)

  const termMin = termThis.hour * 60 + termThis.minute
  return Array.from({ length: 12 }, (_, hourIdx) => {
    const bMin = (((hourIdx * 120 + 1410) % 1440) + 60) % 1440   // 그 시의 한가운데
    const passed = solarDay > termThis.day || (solarDay === termThis.day && bMin >= termMin)
    let days: number
    if (isForward) {
      days = passed
        ? daysBetween(solarYear, solarMonth, solarDay, oy, om, other.day)
        : daysBetween(solarYear, solarMonth, solarDay, solarYear, solarMonth, termThis.day)
    } else {
      days = passed
        ? daysBetween(solarYear, solarMonth, termThis.day, solarYear, solarMonth, solarDay)
        : daysBetween(oy, om, other.day, solarYear, solarMonth, solarDay)
    }
    if (days < 0) days = 0
    return Math.max(0, Math.round(days / DAYS_PER_DAYUN_YEAR))
  })
}

export async function calcDayunList(
  solarYear: number,
  solarMonth: number,
  solarDay: number,
  monthGanji: string,
  yearStem: string,
  gender: string,
  dayStem: string,
  apiKey: string,
  /** ★태어난 시각(자정부터 몇 분). 절입일 당일 태생을 가리는 데 쓴다. */
  birthMinute?: number | null,
): Promise<DayunItem[]> {
  const isForward = isForwardDayun(yearStem, gender)

  const startAge = await calcDayunStartAge(solarYear, solarMonth, solarDay, isForward, apiKey, birthMinute)

  const list: DayunItem[] = []
  const seq = dayunGanjiList(monthGanji, isForward, 10)
  for (let i = 0; i < 10; i++) {
    const { cheongan, jiji } = seq[i]
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
