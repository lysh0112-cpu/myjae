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
}

export interface RunOptionsV5 {
  timePref?: 'morning' | 'afternoon' | 'any'
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
  const { timePref = 'any', gender = '', before = 7, after = 7 } = opts

  const raw = await buildCandidates(dueDate, { timePref, before, after })
  if (raw.length === 0) return { recommendations: [], totalEvaluated: 0, excludedWeekend: 0 }

  // ── 배제 필터: 주말·공휴일 (설계안 §4) ──
  let candidates = raw
  let excludedWeekend = 0
  if (CFG.filter.weekendExclude) {
    const before2 = raw.length
    candidates = raw.filter(c => !c.isWeekend)
    excludedWeekend = before2 - candidates.length
    // (공휴일은 dateKey 기반 별도 표에서 추가 제외 예정 — 지금은 주말만)
  }
  if (candidates.length === 0) return { recommendations: [], totalEvaluated: 0, excludedWeekend }

  // ── 원국 채점 (동기) ──
  const scored = candidates.map(c => ({ c, bd: scoreBabyV5(c) }))

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

  // ── 날짜별로 그룹핑 (목업: 한 날짜에 좋은 시간 여러 개) ──
  const byDate = new Map<string, typeof withDayun>()
  for (const s of withDayun) {
    const key = `${s.c.y}${pad(s.c.m)}${pad(s.c.d)}`
    const arr = byDate.get(key) ?? []
    arr.push(s)
    byDate.set(key, arr)
  }

  // 각 날짜: 그 날 시각들을 점수순 정렬 → 상위 maxHours개를 hours 로.
  //   날짜 대표점수(bestScore)는 그 날 최고 시각 점수 → 날짜 순위 정렬에 씀.
  const dayList = [...byDate.entries()].map(([key, arr]) => {
    const sorted = [...arr].sort((a, b) => b.finalScore - a.finalScore)
    const hours: HourPick[] = sorted.slice(0, CFG.pick.maxHours).map(s => ({
      hourIdx: s.c.hourIdx,
      hourLabel: s.c.hourLabel,
      saju: sajuString(s.c),
      breakdown: s.bd,
      dayunScore: s.dayunScore,
      dayunNote: s.dayunNote,
      finalScore: Math.round(s.finalScore),
      needExpert: s.bd.isJonggyeok,
      y: s.c.y, m: s.c.m, d: s.c.d,
    }))
    const rep = sorted[0]
    return {
      dateKey: key,
      dateLabel: rep.c.dateLabel,
      weekday: rep.c.weekday,
      offset: rep.c.offset,
      hours,
      bestScore: Math.round(rep.finalScore),
      dayunList: cache.get(key) ?? [],   // 그 날짜의 대운 10개 (대운표 렌더용)
      y: rep.c.y, m: rep.c.m, d: rep.c.d,
    }
  })

  // ── 상위 days개 날짜 (서로 다른 날, 대표점수순) ──
  const topDays = dayList
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, CFG.pick.days)

  const recommendations: DayRecommendation[] = topDays.map((d, i) => ({
    rank: i + 1,
    dateLabel: d.dateLabel,
    weekday: d.weekday,
    dateKey: d.dateKey,
    offset: d.offset,
    hours: d.hours,
    bestScore: d.bestScore,
    dayunList: d.dayunList,
    y: d.y, m: d.m, d: d.d,
  }))

  return { recommendations, totalEvaluated: candidates.length, excludedWeekend }
}
