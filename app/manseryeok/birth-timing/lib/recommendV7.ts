// app/manseryeok/birth-timing/lib/recommendV7.ts
//
// ★ 출산택일 v7 — 후보 생성 + 고정필터 적용까지.
//   선택필터는 화면에서 실시간으로 켜고 끄므로 여기서 걸지 않는다.
//   (부모가 토글할 때마다 서버를 다시 부르면 안 되니, 판정 결과를 다 실어 보낸다)
//
//   [후보 기간] 예정일 3주 전 ~ 예정일 +3일 (연재쌤 확정 2026-07-23)
//   [요일]     평일만. 주말·공휴일 제외 (제왕절개 실무)
//   [시진]     巳午未申 4시진 = 09:30~17:30 (병원 수술 시간)

import { buildCandidates, HOUR_LABEL, type Candidate } from './candidates'
import { judgeCandidate, type FilterDetail } from './babyFilterV7'
import type { DayunItem } from '@/lib/saju/dayun'

export interface HourOption {
  hourIdx: number
  hourLabel: string       // '巳시(09:30~11:30)'
  hourBranch: string
  sajuText: string        // '丁巳 癸丑 癸亥 戊申' (시 일 월 년)
  candidate: Candidate
  detail: FilterDetail
}

export interface DayOption {
  y: number; m: number; d: number
  dateKey: string         // 'YYYYMMDD' — 캐시 키는 반드시 padStart (교훈 H)
  dateLabel: string       // '12월 5일'
  weekday: string         // '화'
  dayGanji: string        // '甲子'
  offset: number          // 예정일 기준
  /** 대운 10개. 날짜당 동일(시각 무관) — 대운표 렌더용 */
  dayunList: DayunItem[]
  hours: HourOption[]
}

export interface RecommendV7Result {
  days: DayOption[]           // 고정필터 통과분. 선택필터는 화면에서 적용
  totalCandidates: number     // 후보 전체 (고정필터 전)
  passedFixed: number         // 고정필터 통과 개수
  yearGanji: string           // 고정된 년주
  monthGanjiList: string[]    // 후보 기간에 걸친 월주 (절기 넘어가면 2개)
  error?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 후보 기간의 공휴일 조회. 실패하면 빈 Set → 주말만 배제로 안전하게 진행 */
async function fetchHolidays(start: string, end: string): Promise<Set<string>> {
  const set = new Set<string>()
  try {
    const res = await fetch(`/api/holidays?start=${start}&end=${end}`)
    const data = await res.json()
    if (Array.isArray(data?.holidays)) {
      for (const h of data.holidays) if (h?.date) set.add(String(h.date))
    }
  } catch { /* 실패해도 진행 */ }
  return set
}

function ymd(y: number, m: number, d: number) { return `${y}${pad(m)}${pad(d)}` }
function isoDate(y: number, m: number, d: number) { return `${y}-${pad(m)}-${pad(d)}` }

/**
 * 날짜별 대운 목록(10개) 조회.
 *
 * ★recommendV5.fetchDayunForDate 와 같은 방식이다. 절기(KASI) 키가 서버에만 있어
 *   /api/dayun 을 거친다. 대운은 '날짜 + 성별'로만 정해지므로 시진이 달라도 같다.
 *   → 캐시로 날짜당 1회만 부른다. (v5 주석: 15일 × 5시진 = 75후보라도 최대 15회)
 *
 * 목록 첫 칸의 age 가 곧 대운수(첫 대운 시작 나이)다.
 * 실패하면 빈 배열 → 호출부가 기본값으로 진행한다.
 */
async function fetchDayunForDate(
  c: Candidate, gender: string, cache: Map<string, DayunItem[]>,
): Promise<DayunItem[]> {
  const key = ymd(c.y, c.m, c.d)
  const hit = cache.get(key)
  if (hit) return hit
  try {
    const res = await fetch('/api/dayun', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        solarYear: c.y, solarMonth: c.m, solarDay: c.d,
        monthGanji: `${c.month.stem}${c.month.branch}`,
        yearStem: c.year.stem,
        gender,
        dayStem: c.day.stem,
      }),
    })
    const data = await res.json()
    const list: DayunItem[] = data?.dayunList ?? []
    cache.set(key, list)
    return list
  } catch {
    cache.set(key, [])
    return []
  }
}

export interface RunV7Options {
  dueDate: string          // 'YYYY-MM-DD'
  gender: string           // '남' | '여'
  /** 대운 시작 나이. 절입일 기준 계산값. 없으면 5로 가정한다. */
  daeunStartAge?: number
}

export async function runRecommendV7(opts: RunV7Options): Promise<RecommendV7Result> {
  const { dueDate, gender } = opts

  const empty = (error: string): RecommendV7Result => ({
    days: [], totalCandidates: 0, passedFixed: 0,
    yearGanji: '', monthGanjiList: [], error,
  })

  if (!dueDate) return empty('출산예정일을 입력해 주세요.')
  if (!gender) return empty('아기 성별을 선택해 주세요. 성별이 있어야 대운을 계산할 수 있어요.')

  // 후보 기간: 예정일 3주 전 ~ +3일
  const all = await buildCandidates(dueDate, { timePref: 'any', before: 21, after: 3 })
  if (all.length === 0) return empty('후보 날짜를 만들지 못했어요. 예정일을 확인해 주세요.')

  // 주말 제외
  let cands = all.filter(c => !c.isWeekend)

  // 공휴일 제외 — dateKey 는 반드시 YYYYMMDD 로 통일 (교훈 H)
  const sorted = [...cands].sort((a, b) =>
    ymd(a.y, a.m, a.d).localeCompare(ymd(b.y, b.m, b.d)))
  if (sorted.length > 0) {
    const f = sorted[0], l = sorted[sorted.length - 1]
    const holidays = await fetchHolidays(isoDate(f.y, f.m, f.d), isoDate(l.y, l.m, l.d))
    if (holidays.size > 0) {
      cands = cands.filter(c => !holidays.has(ymd(c.y, c.m, c.d)))
    }
  }

  const totalCandidates = cands.length

  // 대운 — 날짜당 1회만 조회한다(시진이 달라도 대운은 같다). recommendV5 와 같은 캐시 방식.
  //   목록 전체를 들고 있어야 나중에 대운표(UnTable)를 그릴 수 있다.
  //   opts.daeunStartAge 가 넘어오면 API 를 부르지 않고 그 값을 쓴다(테스트·재현용).
  const dayunCache = new Map<string, DayunItem[]>()
  if (opts.daeunStartAge == null) {
    const firstPerDate = new Map<string, Candidate>()
    for (const c of cands) {
      const k = ymd(c.y, c.m, c.d)
      if (!firstPerDate.has(k)) firstPerDate.set(k, c)
    }
    await Promise.all([...firstPerDate.values()].map(c => fetchDayunForDate(c, gender, dayunCache)))
  }

  // 판정 — 고정필터 통과분만 남긴다
  const judged = cands.map(c => {
    const list = dayunCache.get(ymd(c.y, c.m, c.d)) ?? []
    const startAge = opts.daeunStartAge ?? (typeof list[0]?.age === 'number' ? list[0].age : undefined)
    return { c, detail: judgeCandidate(c, { gender, daeunStartAge: startAge }), dayunList: list }
  })
  const passed = judged.filter(x => x.detail.passFixed)

  // 날짜별로 묶기
  const byDate = new Map<string, DayOption>()
  for (const { c, detail, dayunList } of passed) {
    const key = ymd(c.y, c.m, c.d)
    if (!byDate.has(key)) {
      byDate.set(key, {
        y: c.y, m: c.m, d: c.d,
        dateKey: key,
        dateLabel: `${c.m}월 ${c.d}일`,
        weekday: c.weekday,
        dayGanji: c.day.stem + c.day.branch,
        offset: c.offset,
        dayunList,
        hours: [],
      })
    }
    byDate.get(key)!.hours.push({
      hourIdx: c.hourIdx,
      hourLabel: HOUR_LABEL[c.hourIdx],
      hourBranch: c.hour.branch,
      sajuText: `${c.hour.stem}${c.hour.branch} ${c.day.stem}${c.day.branch} ${c.month.stem}${c.month.branch} ${c.year.stem}${c.year.branch}`,
      candidate: c,
      detail,
    })
  }

  const days = [...byDate.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  days.forEach(d => d.hours.sort((a, b) => a.hourIdx - b.hourIdx))

  const monthSet = new Set(cands.map(c => c.month.stem + c.month.branch))

  return {
    days,
    totalCandidates,
    passedFixed: passed.length,
    yearGanji: cands[0] ? cands[0].year.stem + cands[0].year.branch : '',
    monthGanjiList: [...monthSet],
  }
}
