// app/manseryeok/moving-timing/lib/recommendV1.ts
//
// ★ 이사택일 v1 — 후보 생성 + 고정필터 적용까지.
//   선택필터(손·방향)는 화면에서 실시간으로 켜고 끄므로 여기서 걸지 않는다.
//   판정 결과를 전부 실어 보내고, 토글할 때마다 화면이 다시 거른다.
//   → 결혼택일 recommendV7 과 같은 구조.
//
//   ══════════════════════════════════════════════════════════
//   [API 호출 설계 — 여기가 결혼택일과 다르다]
//   ══════════════════════════════════════════════════════════
//
//   ① 일주 간지 — 호출 0회 (자체 계산)
//      lib/saju/ganji.ts 의 getDayGanji 를 직접 부른다.
//      /api/lunar 가 돌려주던 dayGanji 도 애초에 이 함수의 결과였다(route.ts:44).
//      서버까지 갔다 올 이유가 없다.
//
//      [검증] 2026-07-24
//      · ganji.ts / taegil.ts / 율리우스적일(JDN) 독립구현 3종을
//        1900-01-01 ~ 2100-12-31 (73,414일) 전수 대조 → 불일치 0건
//      · 천문연구원 실측 — 2027-02-07 丁巳 · 2027-12-31 甲申 → 일치
//      · 인수인계서 실측 — 1998-01-05 壬子 · 1997-08-15 己丑 → 일치
//
//   ② 음력 — 호출 13회 (월별)
//      손 판정에 lunarDay 가 필요한데, 음력은 자체 계산이 불가능하다.
//      달의 크기(29/30일)와 윤달은 삭망 천문 계산이라 산술로 안 나온다.
//      (npm lunar-javascript 로 시도했다가 2027 설날이 하루 어긋나 폐기했다)
//
//      대신 음력은 '연속'이므로 각 달 1일의 양력 날짜만 알면 나머지가 정해진다.
//      기간에 걸친 달의 개수(1년이면 13개)만 부르고 사이를 채운다.
//      → 365회에서 13회로 줄었다.
//
//   ③ 공휴일 — 호출 1회 (/api/holidays 가 기간 조회를 지원한다)
//
//   ══════════════════════════════════════════════════════════

import {
  judgeDay, type DayInput, type PersonSaju, type MovingDetail, type OwnerMode,
} from './movingFilterV1'
import { splitGanji, calcHourPillar, type Direction } from './movingTables'
import { calcYongsinCompat as calcYongsin } from '@/lib/saju/yongsinNew'
import { getDayGanji } from '@/lib/saju/ganji'
import { solarToLunar } from './lunarTable'

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']
const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (y: number, m: number, d: number) => `${y}${pad(m)}${pad(d)}`
const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

/** 입력 화면에서 넘어오는 사람 정보 */
export interface RawPerson {
  year: string; month: string; day: string; hour: string
  gender: string; calType: string
  name?: string
}

export interface DayResult {
  y: number; m: number; d: number
  dateKey: string
  dateLabel: string      // '3월 27일'
  fullLabel: string      // '2027년 3월 27일'
  weekday: string
  ganji: string
  lunarLabel: string     // '음력 2월 19일'
  holidayName?: string
  detail: MovingDetail
}

export interface MovingV1Result {
  days: DayResult[]
  totalCandidates: number
  passedFixed: number
  people: PersonSaju[]       // 판정 대상 (공동 2명 / 단독 1명)
  contractor: PersonSaju | null   // 계약자 (명식표에 항상 둘 다 그린다)
  spouse: PersonSaju | null       // 배우자
  direction: Direction | null
  ownerMode: OwnerMode
  lunarFailed: boolean       // 음력 조회 실패 — 화면이 안내한다
  error?: string
}

/** 설·추석 연휴인가 */
function isMyeongjeolName(name: string): boolean {
  if (!name) return false
  return name.includes('설날') || name.includes('추석') ||
         name.includes('설연휴') || name.includes('한가위')
}

/** 기간 내 공휴일 조회. 실패하면 빈 맵 → 명절 배제 없이 안전 진행 */
async function fetchHolidayMap(start: string, end: string): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    const res = await fetch(`/api/holidays?start=${start}&end=${end}`)
    const data = await res.json()
    if (Array.isArray(data?.holidays)) {
      for (const h of data.holidays) {
        if (h?.date) map.set(String(h.date), h.name || '공휴일')
      }
    }
  } catch { /* 실패해도 진행 */ }
  return map
}

/**
 * 기간 전체의 음력 일자 표를 만든다. — ★API 호출 0회 (내장 대조표)
 *
 * 전에는 /api/lunar 를 날짜마다 부르는 설계를 검토했다. 1년이면 365회,
 * 음력 달 경계만 부르는 방식으로 줄여도 48회였다. 고객이 늘면 공공데이터포털
 * 트래픽 한도에 걸린다. → lunarTable.ts 에 대조표를 내장해 호출을 없앴다.
 *
 * 표가 다루지 못하는 범위(1900 이전 · 2050-12 이후)는 비워 둔다.
 * 그 경우 손 판정을 건너뛰고 화면이 안내한다.
 */
function buildLunarMap(
  dates: { y: number; m: number; d: number }[],
): Map<string, { lunarMonth: number; lunarDay: number }> {
  const map = new Map<string, { lunarMonth: number; lunarDay: number }>()
  for (const dt of dates) {
    const lun = solarToLunar(dt.y, dt.m, dt.d)
    if (lun) {
      map.set(ymd(dt.y, dt.m, dt.d), {
        lunarMonth: lun.lunarMonth,
        lunarDay: lun.lunarDay,
      })
    }
  }
  return map
}

/** 한 사람의 사주(일주·일지 + 억부용신 + 명식 8글자)를 가져온다. */
async function fetchPersonSaju(
  p: RawPerson | null,
  roleName: '계약자' | '배우자',
): Promise<PersonSaju | null> {
  if (!p || !p.year || !p.month || !p.day) return null
  try {
    const url = `/api/lunar?year=${p.year}&month=${p.month}&day=${p.day}` +
                `&calType=${p.calType || '양력'}&leapMonth=0`
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) return null

    const year = splitGanji(data.yearGanji)
    const month = splitGanji(data.monthGanji)
    const day = splitGanji(data.dayGanji)
    if (day.stem === '?') return null

    const hourIdx = p.hour === '-1' || p.hour === '' || p.hour == null ? null : parseInt(p.hour)
    const hour = hourIdx !== null && hourIdx >= 0
      ? calcHourPillar(day.stem, hourIdx)
      : { stem: '?', branch: '?' }

    const pillars = [
      { pillar: '시주', stem: hour.stem, branch: hour.branch },
      { pillar: '일주', stem: day.stem, branch: day.branch },
      { pillar: '월주', stem: month.stem, branch: month.branch },
      { pillar: '년주', stem: year.stem, branch: year.branch },
    ].filter(pp => pp.stem !== '?' && pp.branch !== '?')

    const hb = hour.branch === '?' ? null : hour.branch
    const ys = calcYongsin(pillars, day.stem, data.solarMonth, data.solarDay, hb)

    const HOUR_NAME = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    const hourLabel = hourIdx !== null && hourIdx >= 0 && hourIdx < 12
      ? ` ${HOUR_NAME[hourIdx]}시` : ''
    const birthLabel = `${p.calType || '양력'} ${p.year}.${p.month}.${p.day}${hourLabel}`

    return {
      dayStem: day.stem,
      dayBranch: day.branch,
      ganji: day.stem + day.branch,
      yongsin: ys.yongsin ?? '',
      status: (ys as { status?: string }).status ?? '',
      monthBranch: month.branch,
      pillars,
      birthLabel,
      name: p.name?.trim() || roleName,
      role: roleName,
    }
  } catch {
    return null
  }
}

/** 양력 날짜 하나의 일주 간지 — 자체 계산 */
function dayGanjiOf(y: number, m: number, d: number): string | null {
  const g = getDayGanji(y, m, d)
  return g && g.length >= 2 ? g : null
}

export interface RunV1Options {
  startDate: string   // 'YYYY-MM-DD'
  endDate: string
  contractor: RawPerson | null   // 계약자
  spouse: RawPerson | null       // 배우자
  ownerMode: OwnerMode           // 'single' | 'joint'
  /** 단독명의일 때 누구 명의인가. 'contractor' | 'spouse' */
  ownerWho: 'contractor' | 'spouse'
  direction: Direction | null    // 이사 가는 방향
}

const MAX_DAYS = 400

export async function runMovingV1(opts: RunV1Options): Promise<MovingV1Result> {
  const { startDate, endDate, ownerMode, ownerWho, direction } = opts

  const empty = (error: string): MovingV1Result => ({
    days: [], totalCandidates: 0, passedFixed: 0,
    people: [], contractor: null, spouse: null,
    direction, ownerMode, lunarFailed: false, error,
  })

  if (!startDate || !endDate) return empty('희망 기간을 입력해 주세요.')
  const s = new Date(startDate + 'T00:00:00')
  const e = new Date(endDate + 'T00:00:00')
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return empty('날짜를 읽지 못했어요.')
  if (e < s) return empty('종료일이 시작일보다 빠를 수 없어요.')

  // 두 사람 사주 — 명식표에는 항상 둘 다 그린다(단독명의여도).
  const [contractor, spouse] = await Promise.all([
    fetchPersonSaju(opts.contractor, '계약자'),
    fetchPersonSaju(opts.spouse, '배우자'),
  ])
  if (!contractor) {
    return empty('계약자분의 사주 정보가 부족해요. 이전 화면에서 생년월일을 확인해 주세요.')
  }

  // 판정 대상 — 공동명의면 둘 다, 단독명의면 고른 한 사람만.
  //   ★공동명의는 합집합(한 사람이라도 걸리면 배제). 교집합으로 하면
  //     두 사람 공망이 겹치는 커플에서만 필터가 살아난다(결혼택일 실측).
  let people: PersonSaju[]
  if (ownerMode === 'joint') {
    people = spouse ? [contractor, spouse] : [contractor]
  } else {
    const picked = ownerWho === 'spouse' ? spouse : contractor
    people = picked ? [picked] : [contractor]
  }

  // 날짜 목록
  const dates: { y: number; m: number; d: number }[] = []
  const cur = new Date(s)
  while (cur <= e && dates.length < MAX_DAYS) {
    dates.push({ y: cur.getFullYear(), m: cur.getMonth() + 1, d: cur.getDate() })
    cur.setDate(cur.getDate() + 1)
  }
  if (dates.length === 0) return empty('후보 날짜를 만들지 못했어요.')

  const first = dates[0], last = dates[dates.length - 1]

  // 공휴일 1회 + 음력 13회 — 나란히 부른다
  // 공휴일만 부른다(1회). 음력은 내장 대조표라 호출이 없다.
  const holidayMap = await fetchHolidayMap(
    isoDate(first.y, first.m, first.d), isoDate(last.y, last.m, last.d))
  const lunarMap = buildLunarMap(dates)
  const lunarFailed = lunarMap.size === 0

  const judged: DayResult[] = []
  for (const dt of dates) {
    const ganji = dayGanjiOf(dt.y, dt.m, dt.d)
    if (!ganji) continue
    const key = ymd(dt.y, dt.m, dt.d)
    const wd = new Date(dt.y, dt.m - 1, dt.d).getDay()
    const holidayName = holidayMap.get(key)
    const lun = lunarMap.get(key)

    const input: DayInput = {
      y: dt.y, m: dt.m, d: dt.d,
      dateKey: key,
      weekday: WEEKDAY[wd],
      isWeekend: wd === 0 || wd === 6,
      isHoliday: !!holidayName,
      holidayName,
      isMyeongjeol: isMyeongjeolName(holidayName ?? ''),
      dayStem: ganji[0],
      dayBranch: ganji[1],
      ganji,
      lunarDay: lun?.lunarDay ?? 0,
      lunarMonth: lun?.lunarMonth ?? 0,
    }

    const detail = judgeDay(input, people, direction)
    if (!detail.passFixed) continue

    judged.push({
      y: dt.y, m: dt.m, d: dt.d,
      dateKey: key,
      dateLabel: `${dt.m}월 ${dt.d}일`,
      fullLabel: `${dt.y}년 ${dt.m}월 ${dt.d}일`,
      weekday: WEEKDAY[wd],
      ganji,
      lunarLabel: lun ? `음력 ${lun.lunarMonth}월 ${lun.lunarDay}일` : '',
      holidayName,
      detail,
    })
  }

  return {
    days: judged,
    totalCandidates: dates.length,
    passedFixed: judged.length,
    people, contractor, spouse,
    direction, ownerMode, lunarFailed,
  }
}

/**
 * 정한 날짜 1~3개를 진단한다. (check 화면)
 * 후보를 만들지 않고 입력 날짜를 그대로 판정한다. 판정 엔진은 judgeDay 를 그대로 쓴다.
 */
export interface DiagnoseV1Result {
  results: DayResult[]
  people: PersonSaju[]
  contractor: PersonSaju | null
  spouse: PersonSaju | null
  direction: Direction | null
  ownerMode: OwnerMode
  lunarFailed: boolean
  error?: string
}

export async function runDiagnoseV1(opts: {
  dates: string[]
  contractor: RawPerson | null
  spouse: RawPerson | null
  ownerMode: OwnerMode
  ownerWho: 'contractor' | 'spouse'
  direction: Direction | null
}): Promise<DiagnoseV1Result> {
  const { ownerMode, ownerWho, direction } = opts
  const clean = opts.dates.filter(d => d && d.trim())

  const empty = (error: string): DiagnoseV1Result => ({
    results: [], people: [], contractor: null, spouse: null,
    direction, ownerMode, lunarFailed: false, error,
  })

  if (clean.length === 0) return empty('봐드릴 날짜를 한 개 이상 골라 주세요.')

  const [contractor, spouse] = await Promise.all([
    fetchPersonSaju(opts.contractor, '계약자'),
    fetchPersonSaju(opts.spouse, '배우자'),
  ])
  if (!contractor) {
    return empty('계약자분의 사주 정보가 부족해요. 이전 화면에서 생년월일을 확인해 주세요.')
  }

  let people: PersonSaju[]
  if (ownerMode === 'joint') {
    people = spouse ? [contractor, spouse] : [contractor]
  } else {
    const picked = ownerWho === 'spouse' ? spouse : contractor
    people = picked ? [picked] : [contractor]
  }

  const parsed = clean
    .map(ds => {
      const dt = new Date(ds + 'T00:00:00')
      if (isNaN(dt.getTime())) return null
      return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }
    })
    .filter((x): x is { y: number; m: number; d: number } => x !== null)
    .sort((a, b) => ymd(a.y, a.m, a.d).localeCompare(ymd(b.y, b.m, b.d)))

  if (parsed.length === 0) return empty('날짜를 읽지 못했어요.')

  const f = parsed[0], l = parsed[parsed.length - 1]
  const holidayMap = await fetchHolidayMap(
    isoDate(f.y, f.m, f.d), isoDate(l.y, l.m, l.d))
  const lunarMap = buildLunarMap(parsed)

  const results: DayResult[] = []
  for (const dt of parsed) {
    const ganji = dayGanjiOf(dt.y, dt.m, dt.d)
    if (!ganji) continue
    const key = ymd(dt.y, dt.m, dt.d)
    const wd = new Date(dt.y, dt.m - 1, dt.d).getDay()
    const holidayName = holidayMap.get(key)
    const lun = lunarMap.get(key)

    const input: DayInput = {
      y: dt.y, m: dt.m, d: dt.d,
      dateKey: key,
      weekday: WEEKDAY[wd],
      isWeekend: wd === 0 || wd === 6,
      isHoliday: !!holidayName,
      holidayName,
      isMyeongjeol: isMyeongjeolName(holidayName ?? ''),
      dayStem: ganji[0],
      dayBranch: ganji[1],
      ganji,
      lunarDay: lun?.lunarDay ?? 0,
      lunarMonth: lun?.lunarMonth ?? 0,
    }

    results.push({
      y: dt.y, m: dt.m, d: dt.d,
      dateKey: key,
      dateLabel: `${dt.m}월 ${dt.d}일`,
      fullLabel: `${dt.y}년 ${dt.m}월 ${dt.d}일`,
      weekday: WEEKDAY[wd],
      ganji,
      lunarLabel: lun ? `음력 ${lun.lunarMonth}월 ${lun.lunarDay}일` : '',
      holidayName,
      detail: judgeDay(input, people, direction),
    })
  }

  return {
    results, people, contractor, spouse,
    direction, ownerMode,
    lunarFailed: lunarMap.size === 0,
  }
}
