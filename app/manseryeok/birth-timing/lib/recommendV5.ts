// app/manseryeok/birth-timing/lib/recommendV5.ts
//
// ★ 출산택일 v5 최종 선발 (설계안 §3·§4·§9)
//   예정일 ±7일(15일) · 평일만 · 좋은 날 3개(서로 다른 날) · 각 날 최고 시진
//   + 대운 타이밍 가점(용신 30~60세) + 종격 분기(전문가 상담)
//
//   [대운 캐싱 — 핵심 실무]
//   대운은 시간과 무관, "날짜(+성별)"로만 결정된다.
//   → 15일 × 5시진 = 75후보라도 대운 계산은 '날짜당 1회'(최대 15회)면 충분.
//   dateKey(YYYYMMDD) 로 캐시해 절기 API 폭발을 막는다.
//   대운은 서버 API(/api/dayun)를 거친다(절기 KASI 키가 서버에만 있음).

import { buildCandidates, type Candidate } from './candidates'
import { scoreBabyV5, type ScoreV5Breakdown } from './scoreV5'
import { scoreDayunTiming } from './dayunTiming'
import { BIRTH_SCORE_CONFIG as CFG } from './birthScoreConfig'
import type { DayunItem } from '@/lib/saju/dayun'

// 한 시각(시주) 단위 — 누르면 모달로 열리는 최소 단위
export interface HourPick {
  hourIdx: number
  hourLabel: string
  saju: string
  breakdown: ScoreV5Breakdown
  dayunScore: number
  dayunNote: string
  finalScore: number       // 원국 + 대운 (내부용, 화면엔 감춤)
  needExpert: boolean
  y: number; m: number; d: number
}

// 한 날짜 = 순위 단위. 그 안에 좋은 시간 여러 개(목업: 날짜마다 시간 3개).
export interface DayRecommendation {
  rank: number
  dateLabel: string
  weekday: string
  dateKey: string
  offset: number
  hours: HourPick[]        // 그 날의 좋은 시간들 (점수순, 최대 maxHours)
  bestScore: number        // 날짜 대표 점수(그 날 최고 시각) — 날짜 순위 정렬용
  dayunList: DayunItem[]   // 대운 10개 (날짜당 동일 — 시각 무관). 대운표 렌더용.
  y: number; m: number; d: number
}

// 하위호환 별칭 (기존 import 깨지지 않게)
export type RecommendationV5 = DayRecommendation

export interface BirthResultV5 {
  recommendations: DayRecommendation[]
  totalEvaluated: number
  excludedWeekend: number
  excludedHoliday: number
  excludedWonjin: number
}

export interface RunOptionsV5 {
  timePref?: 'morning' | 'afternoon' | 'any'
  wish?: string            // 부모가 고른 '바라는 점' 1개 (없으면 균등 채점)
  gender?: string          // 대운 방향(순/역행)에 필수
  before?: number          // 기본 7
  after?: number           // 기본 7
}

// 날짜별 대운 목록 fetch (서버 API). 캐시로 중복 호출 방지.
async function fetchDayunForDate(
  c: Candidate,
  gender: string,
  cache: Map<string, DayunItem[]>,
): Promise<DayunItem[]> {
  const key = `${c.y}${String(c.m).padStart(2, '0')}${String(c.d).padStart(2, '0')}`
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

const pad = (n: number) => String(n).padStart(2, '0')

// ── 원진(怨嗔) 배제 ── (연재쌤 확정 2026-07-23)
//   "원진이 일지와 월지에 있으면 아예 배제한다."
//   → 다른 자리(연지·시지)의 원진은 보지 않는다. 월-일 사이만 본다.
//   → 감점이 아니라 '배제'. 그 날은 후보에서 통째로 뺀다(시간 무관하게 날짜 단위).
const WONJIN_PAIRS: [string, string][] = [
  ['子', '未'], ['丑', '午'], ['寅', '酉'],
  ['卯', '申'], ['辰', '亥'], ['巳', '戌'],
]
function isWolIlWonjin(monthBranch: string, dayBranch: string): boolean {
  return WONJIN_PAIRS.some(
    ([a, b]) =>
      (monthBranch === a && dayBranch === b) ||
      (monthBranch === b && dayBranch === a),
  )
}

// 후보 기간의 공휴일 조회 (/api/holidays 재사용 — 결혼택일과 같은 API).
//   반환: Set<'YYYYMMDD'>. dateKey 와 같은 포맷이라 바로 매칭된다.
//   실패해도 빈 Set 을 돌려줘 '주말만 배제'로 안전하게 동작한다.
async function fetchHolidaySet(
  first: { y: number; m: number; d: number },
  last: { y: number; m: number; d: number },
): Promise<Set<string>> {
  try {
    const start = `${first.y}-${pad(first.m)}-${pad(first.d)}`
    const end = `${last.y}-${pad(last.m)}-${pad(last.d)}`
    const res = await fetch(`/api/holidays?start=${start}&end=${end}`)
    const data = await res.json()
    const set = new Set<string>()
    if (Array.isArray(data?.holidays)) {
      for (const h of data.holidays) if (h?.date) set.add(String(h.date))
    }
    return set
  } catch {
    return new Set<string>()
  }
}

function sajuString(c: Candidate): string {
  return `${c.year.stem}${c.year.branch} ${c.month.stem}${c.month.branch} ` +
         `${c.day.stem}${c.day.branch} ${c.hour.stem}${c.hour.branch}`
}

/**
 * 메인: 예정일 → 15일 평일 후보 채점 → 좋은 날 3개.
 */
export async function runBirthTimingV5(
  dueDate: string,
  opts: RunOptionsV5 = {},
): Promise<BirthResultV5> {
  // 후보 기간 (연재쌤 확정 2026-07-23): 예정일 '이전 3주 ~ 예정일 당일'.
  //   예정일 이후는 보지 않는다 — 제왕절개는 예정일을 넘기지 않고 미리 하는 게 일반적.
  const { timePref = 'any', gender = '', before = 21, after = 0, wish } = opts

  const raw = await buildCandidates(dueDate, { timePref, before, after })
  if (raw.length === 0) return { recommendations: [], totalEvaluated: 0, excludedWeekend: 0, excludedHoliday: 0, excludedWonjin: 0 }

  // ── 배제 필터: 주말 + 공휴일 + 월일 원진 ──
  //   주말·공휴일 = 병원이 쉬어서 수술 불가(실무 제약).
  //   월일 원진 = 명리적 배제. 연재쌤 확정: "원진이 일지·월지에 있으면 아예 배제".
  let candidates = raw
  let excludedWeekend = 0
  let excludedHoliday = 0
  let excludedWonjin = 0

  // ① 월지-일지 원진 배제 (날짜 단위 — 시간과 무관하므로 먼저 걸러 계산량도 줄인다)
  {
    const beforeW = candidates.length
    candidates = candidates.filter(c => !isWolIlWonjin(c.month.branch, c.day.branch))
    excludedWonjin = beforeW - candidates.length
  }

  if (CFG.filter.weekendExclude) {
    const beforeCnt = candidates.length
    candidates = candidates.filter(c => !c.isWeekend)
    excludedWeekend = beforeCnt - candidates.length

    // 공휴일 배제 — /api/holidays 조회 후 dateKey 로 매칭.
    //   조회 실패 시 빈 Set → 주말만 배제된 상태로 안전하게 진행.
    const sorted = [...candidates].sort((a, b) =>
      `${a.y}${pad(a.m)}${pad(a.d)}`.localeCompare(`${b.y}${pad(b.m)}${pad(b.d)}`))
    if (sorted.length > 0) {
      const firstC = sorted[0]
      const lastC = sorted[sorted.length - 1]
      const holidaySet = await fetchHolidaySet(
        { y: firstC.y, m: firstC.m, d: firstC.d },
        { y: lastC.y, m: lastC.m, d: lastC.d },
      )
      if (holidaySet.size > 0) {
        const beforeH = candidates.length
        candidates = candidates.filter(c => !holidaySet.has(`${c.y}${pad(c.m)}${pad(c.d)}`))
        excludedHoliday = beforeH - candidates.length
      }
    }
  }
  if (candidates.length === 0) return { recommendations: [], totalEvaluated: 0, excludedWeekend, excludedHoliday, excludedWonjin }

  // ── 원국 채점 (동기) ──
  const scored = candidates.map(c => ({ c, bd: scoreBabyV5(c, wish) }))

  // ── 대운 타이밍 (비동기, 날짜별 캐시) ──
  const cache = new Map<string, DayunItem[]>()
  const withDayun = await Promise.all(scored.map(async s => {
    let dayunScore = 0, dayunNote = ''
    if (gender && !s.bd.isJonggyeok) {
      const dayun = await fetchDayunForDate(s.c, gender, cache)
      const dt = scoreDayunTiming(dayun, s.bd.yongsinEl, CFG.dayun)
      dayunScore = dt.score
      dayunNote = dt.note
    }
    return { ...s, dayunScore, dayunNote, finalScore: s.bd.total + dayunScore }
  }))

  // ── 상위 pick.days 개 '시각'을 그대로 뽑는다 (2026-07-23 변경) ──
  //   [왜 바뀌었나]
  //   이전엔 날짜로 묶어 '날짜당 1개'만 뽑았다. 그러면 같은 날짜의 2·3위 시각이
  //   전체 상위권인데도 버려지고, 점수가 낮은 다른 날짜가 대신 올라왔다.
  //   → 부모에게 손해. 이제는 점수순 상위 3개를 그대로 보여준다.
  //   → 같은 날짜가 2~3개 들어와도 무방(시간이 다르므로). 대표님 확정.
  const topPicks = [...withDayun]
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, CFG.pick.days)

  //   화면(ResultV5)은 DayRecommendation(날짜 + hours[]) 구조를 쓰므로
  //   각 시각을 '카드 하나'로 만들어 넘긴다(hours 에 그 시각 하나만 담음).
  const recommendations: DayRecommendation[] = topPicks.map((s, i) => {
    const key = `${s.c.y}${pad(s.c.m)}${pad(s.c.d)}`
    const hour: HourPick = {
      hourIdx: s.c.hourIdx,
      hourLabel: s.c.hourLabel,
      saju: sajuString(s.c),
      breakdown: s.bd,
      dayunScore: s.dayunScore,
      dayunNote: s.dayunNote,
      finalScore: Math.round(s.finalScore),
      needExpert: s.bd.isJonggyeok,
      y: s.c.y, m: s.c.m, d: s.c.d,
    }
    return {
      rank: i + 1,
      dateLabel: s.c.dateLabel,
      weekday: s.c.weekday,
      dateKey: key,
      offset: s.c.offset,
      hours: [hour],
      bestScore: Math.round(s.finalScore),
      dayunList: cache.get(key) ?? [],
      y: s.c.y, m: s.c.m, d: s.c.d,
    }
  })

  return { recommendations, totalEvaluated: candidates.length, excludedWeekend, excludedHoliday, excludedWonjin }
}
