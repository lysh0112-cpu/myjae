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

export interface RecommendationV5 {
  rank: number
  dateLabel: string
  hourLabel: string
  offset: number
  weekday: string
  dateKey: string
  saju: string
  breakdown: ScoreV5Breakdown
  dayunScore: number
  dayunNote: string
  finalScore: number       // 원국 + 대운 (내부용, 화면엔 감춤)
  needExpert: boolean      // 종격 → 전문가 상담 분기
  y: number; m: number; d: number; hourIdx: number
}

export interface BirthResultV5 {
  recommendations: RecommendationV5[]
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
  const key = `${c.y}${c.m}${c.d}`
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

  // ── 날짜별 최고 시진 1개 ──
  const bestByDate = new Map<string, typeof withDayun[number]>()
  for (const s of withDayun) {
    const key = `${s.c.y}${pad(s.c.m)}${pad(s.c.d)}`
    const cur = bestByDate.get(key)
    if (!cur || s.finalScore > cur.finalScore) bestByDate.set(key, s)
  }

  // ── 상위 3개 날짜 (서로 다른 날) ──
  const top3 = [...bestByDate.values()]
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 3)

  const recommendations: RecommendationV5[] = top3.map((s, i) => ({
    rank: i + 1,
    dateLabel: s.c.dateLabel,
    hourLabel: s.c.hourLabel,
    offset: s.c.offset,
    weekday: s.c.weekday,
    dateKey: `${s.c.y}${pad(s.c.m)}${pad(s.c.d)}`,
    saju: sajuString(s.c),
    breakdown: s.bd,
    dayunScore: s.dayunScore,
    dayunNote: s.dayunNote,
    finalScore: Math.round(s.finalScore),
    needExpert: s.bd.isJonggyeok,
    y: s.c.y, m: s.c.m, d: s.c.d, hourIdx: s.c.hourIdx,
  }))

  return { recommendations, totalEvaluated: candidates.length, excludedWeekend }
}
