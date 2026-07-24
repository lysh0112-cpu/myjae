// app/manseryeok/wedding-timing/lib/recommendV7.ts
//
// ★ 결혼택일 v7 — 후보 생성 + 고정필터 적용까지.
//   선택필터는 화면에서 실시간으로 켜고 끄므로 여기서 걸지 않는다.
//   (두 분이 토글할 때마다 서버를 다시 부르면 안 되니, 판정 결과를 다 실어 보낸다)
//   → 출산택일 recommendV7 과 같은 구조.
//
//   [후보 기간] 두 분이 지정한 시작일 ~ 종료일 (최대 400일)
//   [요일]      전부 만든다. 주말·공휴일 여부는 플래그로 실어 보내고
//               화면의 '예식하는 날' 토글이 거른다.
//   [명절]      설·추석 연휴는 고정 배제. /api/holidays 의 이름으로 판정한다.

import { judgeDay, type DayInput, type PersonSaju, type WeddingDetail } from './weddingFilterV7'
import { splitGanji, calcHourPillar, STEMS, BRANCHES } from './weddingTables'
import { calcYongsinCompat as calcYongsin } from '@/lib/saju/yongsinNew'

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']
const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (y: number, m: number, d: number) => `${y}${pad(m)}${pad(d)}`
const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

/** 입력 화면에서 넘어오는 사람 정보 */
export interface RawPerson {
  year: string; month: string; day: string; hour: string
  gender: string; calType: string
}

export interface DayResult {
  y: number; m: number; d: number
  dateKey: string
  dateLabel: string      // '3월 27일'
  fullLabel: string      // '2027년 3월 27일'
  weekday: string
  ganji: string
  holidayName?: string
  detail: WeddingDetail
}

export interface WeddingV7Result {
  days: DayResult[]          // 고정필터 통과분. 선택필터는 화면에서 적용
  totalCandidates: number    // 기간 내 전체 일수
  passedFixed: number
  bride: PersonSaju | null
  groom: PersonSaju | null
  error?: string
}

/**
 * 설·추석 연휴인가.
 *
 * ★공휴일 이름으로 판정한다. /api/holidays 가 '설날'·'추석'을 이름에 담아 주므로
 *   연휴 전후일도 같은 이름을 달고 온다. 이름을 못 받으면 명절 배제가 동작하지
 *   않지만, 그때도 공휴일 자체는 걸러지므로 안전하게 진행된다.
 */
function isMyeongjeolName(name: string): boolean {
  if (!name) return false
  return name.includes('설날') || name.includes('추석') ||
         name.includes('설연휴') || name.includes('한가위')
}

/** 기간 내 공휴일 조회. 실패하면 빈 맵 → 명절·공휴일 없이 안전 진행 */
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
 * 한 사람의 사주(일주·일지 + 억부용신)를 가져온다.
 *
 * ★용신은 공용 엔진 calcYongsinCompat 을 그대로 호출한다. 우리가 계산하지 않는다.
 *   시를 모르면 시주를 빼고 계산한다(정확도만 떨어지고 계산은 된다).
 */
async function fetchPersonSaju(p: RawPerson | null): Promise<PersonSaju | null> {
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

    return {
      dayStem: day.stem,
      dayBranch: day.branch,
      ganji: day.stem + day.branch,
      yongsin: ys.yongsin ?? '',
      status: (ys as { status?: string }).status ?? '',
      monthBranch: month.branch,
    }
  } catch {
    return null
  }
}

/** 양력 날짜 하나의 일주 간지를 가져온다 */
async function fetchDayGanji(y: number, m: number, d: number): Promise<string | null> {
  try {
    const res = await fetch(`/api/lunar?year=${y}&month=${m}&day=${d}&calType=양력&leapMonth=0`)
    const data = await res.json()
    if (data.error) return null
    const g = splitGanji(data.dayGanji)
    return g.stem === '?' ? null : g.stem + g.branch
  } catch {
    return null
  }
}

export interface RunV7Options {
  startDate: string   // 'YYYY-MM-DD'
  endDate: string
  groom: RawPerson | null
  bride: RawPerson | null
}

const MAX_DAYS = 400

export async function runWeddingV7(opts: RunV7Options): Promise<WeddingV7Result> {
  const { startDate, endDate, groom: rawG, bride: rawB } = opts

  const empty = (error: string): WeddingV7Result => ({
    days: [], totalCandidates: 0, passedFixed: 0, bride: null, groom: null, error,
  })

  if (!startDate || !endDate) return empty('희망 기간을 입력해 주세요.')
  const s = new Date(startDate + 'T00:00:00')
  const e = new Date(endDate + 'T00:00:00')
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return empty('날짜를 읽지 못했어요.')
  if (e < s) return empty('종료일이 시작일보다 빠를 수 없어요.')

  // 두 사람 사주
  const [bride, groom] = await Promise.all([fetchPersonSaju(rawB), fetchPersonSaju(rawG)])
  if (!bride || !groom) {
    return empty('두 분의 사주 정보가 부족해요. 이전 화면에서 생년월일을 확인해 주세요.')
  }

  // 날짜 목록
  const dates: { y: number; m: number; d: number }[] = []
  const cur = new Date(s)
  while (cur <= e && dates.length < MAX_DAYS) {
    dates.push({ y: cur.getFullYear(), m: cur.getMonth() + 1, d: cur.getDate() })
    cur.setDate(cur.getDate() + 1)
  }
  if (dates.length === 0) return empty('후보 날짜를 만들지 못했어요.')

  // 공휴일
  const first = dates[0], last = dates[dates.length - 1]
  const holidayMap = await fetchHolidayMap(
    isoDate(first.y, first.m, first.d),
    isoDate(last.y, last.m, last.d),
  )

  // 일주 간지 — 날짜별 1회
  const ganjiList = await Promise.all(dates.map(dt => fetchDayGanji(dt.y, dt.m, dt.d)))

  const judged: DayResult[] = []
  dates.forEach((dt, i) => {
    const ganji = ganjiList[i]
    if (!ganji) return
    const key = ymd(dt.y, dt.m, dt.d)
    const wd = new Date(dt.y, dt.m - 1, dt.d).getDay()
    const holidayName = holidayMap.get(key)

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
    }

    const detail = judgeDay(input, bride, groom)
    if (!detail.passFixed) return

    judged.push({
      y: dt.y, m: dt.m, d: dt.d,
      dateKey: key,
      dateLabel: `${dt.m}월 ${dt.d}일`,
      fullLabel: `${dt.y}년 ${dt.m}월 ${dt.d}일`,
      weekday: WEEKDAY[wd],
      ganji,
      holidayName,
      detail,
    })
  })

  return {
    days: judged,
    totalCandidates: dates.length,
    passedFixed: judged.length,
    bride, groom,
  }
}

/**
 * 정한 날짜 1~3개를 진단한다. (check 화면)
 * 후보를 만들지 않고 입력 날짜를 그대로 판정한다. 판정 엔진은 judgeDay 를 그대로 쓴다.
 */
export interface DiagnoseV7Result {
  results: DayResult[]
  bride: PersonSaju | null
  groom: PersonSaju | null
  error?: string
}

export async function runDiagnoseV7(opts: {
  dates: string[]
  groom: RawPerson | null
  bride: RawPerson | null
}): Promise<DiagnoseV7Result> {
  const clean = opts.dates.filter(d => d && d.trim())
  if (clean.length === 0) {
    return { results: [], bride: null, groom: null, error: '봐드릴 날짜를 한 개 이상 골라 주세요.' }
  }

  const [bride, groom] = await Promise.all([
    fetchPersonSaju(opts.bride), fetchPersonSaju(opts.groom),
  ])
  if (!bride || !groom) {
    return {
      results: [], bride: null, groom: null,
      error: '두 분의 사주 정보가 부족해요. 이전 화면에서 생년월일을 확인해 주세요.',
    }
  }

  // 공휴일 — 고른 날짜 범위만
  const sorted = [...clean].sort()
  const holidayMap = await fetchHolidayMap(sorted[0], sorted[sorted.length - 1])

  const results: DayResult[] = []
  for (const ds of clean) {
    const dt = new Date(ds + 'T00:00:00')
    if (isNaN(dt.getTime())) continue
    const y = dt.getFullYear(), m = dt.getMonth() + 1, d = dt.getDate()
    const ganji = await fetchDayGanji(y, m, d)
    if (!ganji) continue

    const key = ymd(y, m, d)
    const wd = dt.getDay()
    const holidayName = holidayMap.get(key)

    const input: DayInput = {
      y, m, d,
      dateKey: key,
      weekday: WEEKDAY[wd],
      isWeekend: wd === 0 || wd === 6,
      isHoliday: !!holidayName,
      holidayName,
      isMyeongjeol: isMyeongjeolName(holidayName ?? ''),
      dayStem: ganji[0],
      dayBranch: ganji[1],
      ganji,
    }

    results.push({
      y, m, d,
      dateKey: key,
      dateLabel: `${m}월 ${d}일`,
      fullLabel: `${y}년 ${m}월 ${d}일`,
      weekday: WEEKDAY[wd],
      ganji,
      holidayName,
      detail: judgeDay(input, bride, groom),
    })
  }

  return { results, bride, groom }
}

void STEMS; void BRANCHES
