// app/manseryeok/wedding-timing/lib/candidates.ts
// 결혼택일 2단계: 희망 기간 안의 후보 날짜 생성 + 각 날의 연·월·일 간지 뽑기
//
// 설계(docs/결혼택일_산식.md) 기준:
//  - 날짜: 사용자가 지정한 기간(시작~끝). 기간이 길면 KASI 호출↑ → 기본 '주말만'으로 압축.
//  - 결혼택일은 '예식일(날짜)'이 기준이라 시진(時)은 쓰지 않는다 → 시주 계산 없음.
//  - 사주: /api/lunar 로 연·월·일 간지(날짜당 1회). useResultSaju 와 동일한 splitGanji 사용.
//
// ※ 후보 날짜의 간지를 만드는 방식은 출산택일 candidates.ts 와 100% 동일하게 맞춘다.

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

export interface Pillar { stem: string; branch: string }

export interface DateCandidate {
  y: number; m: number; d: number
  weekday: string          // '토'
  isWeekend: boolean
  dateLabel: string        // '2027년 3월 9일 (토)'
  ganji: string            // '甲子' (일주 간지 문자열 — 본명일/사폐/천지전 판정용)
  // 그 날의 연·월·일 간지
  year: Pillar
  month: Pillar
  day: Pillar
  // 음력일 (손없는날 판정용). /api/lunar 가 주면 채워지고, 없으면 score 단계에서 보강.
  lunarDay?: number
}

// 간지 문자열 → {stem, branch} (괄호 형태 (甲子)도 처리) — useResultSaju.splitGanji 와 동일
function splitGanji(ganji: string): Pillar {
  if (!ganji) return { stem: '?', branch: '?' }
  const match = ganji.match(/\(([^)]+)\)/)
  if (match && match[1].length >= 2) return { stem: match[1][0], branch: match[1][1] }
  if (ganji.length >= 2) return { stem: ganji[0], branch: ganji[1] }
  return { stem: '?', branch: '?' }
}

// 기간(YYYY-MM-DD ~ YYYY-MM-DD) → 날짜 객체 배열 (양력)
// 상한: 안전을 위해 최대 maxDays 일 까지만 (기본 200일 ≈ 6.5개월)
function buildDateRange(startDate: string, endDate: string, maxDays = 200): { y: number; m: number; d: number }[] {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return []
  if (end < start) return []

  const out: { y: number; m: number; d: number }[] = []
  const cur = new Date(start)
  let guard = 0
  while (cur <= end && guard < maxDays) {
    out.push({ y: cur.getFullYear(), m: cur.getMonth() + 1, d: cur.getDate() })
    cur.setDate(cur.getDate() + 1)
    guard++
  }
  return out
}

// 양력 날짜 하나의 연·월·일 간지를 /api/lunar 에서 가져온다 (날짜당 1회)
async function fetchDateSaju(y: number, m: number, d: number): Promise<DateCandidate | null> {
  try {
    const url = `/api/lunar?year=${y}&month=${m}&day=${d}&calType=양력&leapMonth=0`
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) return null
    const dt = new Date(y, m - 1, d)
    const wd = WEEKDAY[dt.getDay()]
    const day = splitGanji(data.dayGanji)
    return {
      y, m, d,
      weekday: wd,
      isWeekend: dt.getDay() === 0 || dt.getDay() === 6,
      dateLabel: `${y}년 ${m}월 ${d}일 (${wd})`,
      ganji: day.stem + day.branch,
      year: splitGanji(data.yearGanji),
      month: splitGanji(data.monthGanji),
      day,
      lunarDay: typeof data.lunarDay === 'number' ? data.lunarDay : undefined,
    }
  } catch {
    return null
  }
}

export interface BuildWeddingOptions {
  // 요일 선호: 'weekend'(토·일만) | 'all'(평일 포함) | 'any'(상관없음=전체)
  dayPref?: 'weekend' | 'all' | 'any'
}

// 메인: 기간 → 후보 날짜 배열 (각 날의 간지 포함)
export async function buildWeddingCandidates(
  startDate: string,
  endDate: string,
  opts: BuildWeddingOptions = {},
): Promise<DateCandidate[]> {
  const { dayPref = 'weekend' } = opts

  let dates = buildDateRange(startDate, endDate)
  if (dates.length === 0) return []

  // 요일 선호로 먼저 날짜 수를 줄여서 KASI 호출을 아낀다
  if (dayPref === 'weekend') {
    dates = dates.filter(dt => {
      const wd = new Date(dt.y, dt.m - 1, dt.d).getDay()
      return wd === 0 || wd === 6
    })
  }

  // 날짜별 연·월·일 간지를 병렬로 가져온다
  const results = await Promise.all(dates.map(dt => fetchDateSaju(dt.y, dt.m, dt.d)))

  const candidates: DateCandidate[] = []
  for (const c of results) {
    if (!c) continue
    if (c.day.stem === '?') continue // 간지를 못 만든 날 제외
    // dayPref === 'all' 이면 평일 포함 전체, 'any' 도 전체. weekend 는 위에서 이미 걸렀음.
    candidates.push(c)
  }
  return candidates
}
