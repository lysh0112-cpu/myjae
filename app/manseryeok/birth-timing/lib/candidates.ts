// app/manseryeok/birth-timing/lib/candidates.ts
// 출산택일 2단계: 후보 날짜·시진 생성 + 각 후보의 아기 사주 8글자 뽑기
//
// 설계(docs/출산택일_설계.md, docs/사주계산_메모.md) 기준:
//  - 날짜: 출산예정일 -7일 ~ +7일 (총 15일)
//  - 시진: 卯시~申시 (index 3~8, 05~17시) 주간만
//  - 사주: /api/lunar 로 연·월·일 간지(날짜당 1회) + calcHourPillar 로 시주(코드)
//
// ※ 사주 생성 로직은 기존 useResultSaju 와 동일한 방식을 그대로 사용한다.

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// 주간 시진: 卯(3)~申(8) — 05~17시
export const WORK_HOUR_INDICES = [3, 4, 5, 6, 7, 8]

export const HOUR_LABEL: Record<number, string> = {
  0: '子시(23~01)', 1: '丑시(01~03)', 2: '寅시(03~05)', 3: '卯시(05~07)',
  4: '辰시(07~09)', 5: '巳시(09~11)', 6: '午시(11~13)', 7: '未시(13~15)',
  8: '申시(15~17)', 9: '酉시(17~19)', 10: '戌시(19~21)', 11: '亥시(21~23)',
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

export interface Pillar { stem: string; branch: string }

export interface DateSaju {
  // 그 날짜(양력) 자체 정보
  y: number; m: number; d: number
  weekday: string          // '화'
  isWeekend: boolean
  // 그 날의 연·월·일 간지 (시주 제외)
  year: Pillar
  month: Pillar
  day: Pillar
}

export interface Candidate {
  y: number; m: number; d: number
  hourIdx: number
  weekday: string
  isWeekend: boolean
  dateLabel: string        // '2027년 3월 9일 (화)'
  hourLabel: string        // '卯시(05~07)'
  // 사주 8글자
  year: Pillar
  month: Pillar
  day: Pillar
  hour: Pillar
}

// 간지 문자열 → {stem, branch} (괄호 형태 (甲子)도 처리) — useResultSaju.splitGanji 와 동일
function splitGanji(ganji: string): Pillar {
  if (!ganji) return { stem: '?', branch: '?' }
  const match = ganji.match(/\(([^)]+)\)/)
  if (match && match[1].length >= 2) return { stem: match[1][0], branch: match[1][1] }
  if (ganji.length >= 2) return { stem: ganji[0], branch: ganji[1] }
  return { stem: '?', branch: '?' }
}

// 시주 계산 — useResultSaju.calcHourPillar 와 동일
export function calcHourPillar(dayStem: string, hourIdx: number): Pillar {
  const dg = HEAVENLY_STEMS.indexOf(dayStem)
  if (dg < 0) return { stem: '?', branch: '?' }
  const groupBase = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]
  const stem = HEAVENLY_STEMS[(groupBase[dg] + hourIdx) % 10]
  const branch = EARTHLY_BRANCHES[hourIdx]
  return { stem, branch }
}

// 예정일(YYYY-MM-DD) → -7 ~ +7일의 날짜 객체 배열 (양력)
function buildDateRange(dueDate: string, before = 7, after = 7): { y: number; m: number; d: number }[] {
  const base = new Date(dueDate + 'T00:00:00')
  if (isNaN(base.getTime())) return []
  const out: { y: number; m: number; d: number }[] = []
  for (let offset = -before; offset <= after; offset++) {
    const dt = new Date(base)
    dt.setDate(base.getDate() + offset)
    out.push({ y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() })
  }
  return out
}

// 양력 날짜 하나의 연·월·일 간지를 /api/lunar 에서 가져온다 (날짜당 1회)
async function fetchDateSaju(y: number, m: number, d: number): Promise<DateSaju | null> {
  try {
    const url = `/api/lunar?year=${y}&month=${m}&day=${d}&calType=양력&leapMonth=0`
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) return null
    const dt = new Date(y, m - 1, d)
    const wd = WEEKDAY[dt.getDay()]
    return {
      y, m, d,
      weekday: wd,
      isWeekend: dt.getDay() === 0 || dt.getDay() === 6,
      year: splitGanji(data.yearGanji),
      month: splitGanji(data.monthGanji),
      day: splitGanji(data.dayGanji),
    }
  } catch {
    return null
  }
}

export interface BuildOptions {
  // 선호 시간대: 'morning'(오전 卯~午) | 'afternoon'(未~申) | 'any'
  timePref?: 'morning' | 'afternoon' | 'any'
  // 주말 제외 여부 (제왕절개는 보통 평일)
  excludeWeekend?: boolean
}

// 메인: 예정일 → 후보(날짜×시진 + 사주 8글자) 배열
export async function buildCandidates(dueDate: string, opts: BuildOptions = {}): Promise<Candidate[]> {
  const { timePref = 'any', excludeWeekend = true } = opts

  const dates = buildDateRange(dueDate)
  if (dates.length === 0) return []

  // 날짜별 연·월·일 간지를 병렬로 가져온다 (KASI 호출 = 날짜 수 = 15회)
  const dateSajus = await Promise.all(dates.map(dt => fetchDateSaju(dt.y, dt.m, dt.d)))

  // 선호 시간대에 따른 시진 필터
  let hours = WORK_HOUR_INDICES
  if (timePref === 'morning') hours = [3, 4, 5, 6]   // 卯~午 (05~13)
  else if (timePref === 'afternoon') hours = [7, 8]  // 未~申 (13~17)

  const candidates: Candidate[] = []
  for (const ds of dateSajus) {
    if (!ds) continue
    if (excludeWeekend && ds.isWeekend) continue
    if (ds.day.stem === '?') continue // 사주를 못 만든 날은 제외

    for (const hourIdx of hours) {
      const hour = calcHourPillar(ds.day.stem, hourIdx)
      candidates.push({
        y: ds.y, m: ds.m, d: ds.d,
        hourIdx,
        weekday: ds.weekday,
        isWeekend: ds.isWeekend,
        dateLabel: `${ds.y}년 ${ds.m}월 ${ds.d}일 (${ds.weekday})`,
        hourLabel: HOUR_LABEL[hourIdx],
        year: ds.year,
        month: ds.month,
        day: ds.day,
        hour,
      })
    }
  }

  return candidates
}

// 후보의 사주 8글자를 "시 일 월 연 / 지지" 형태 문자열로
export function sajuString(c: Candidate): string {
  const stems = `${c.hour.stem} ${c.day.stem} ${c.month.stem} ${c.year.stem}`
  const branches = `${c.hour.branch} ${c.day.branch} ${c.month.branch} ${c.year.branch}`
  return `${stems} / ${branches}`
}
