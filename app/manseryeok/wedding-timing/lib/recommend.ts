// app/manseryeok/wedding-timing/lib/recommend.ts
// 결혼택일 4·5단계: 두 사람 사주 준비 + 후보 채점 + 정렬 → 추천 5개 / 피할 날
//
// 설계: docs/결혼택일_산식.md. 명리 판단은 "잠정 기준" — 연재 선생님 검수 후 확정.
//
// 공망(F1)은 외부 파일에 의존하지 않고 여기서 자체 계산한다.
//  (일주 60갑자 → 순(旬) → 공망 지지 2개. 순수 규칙이라 정확함.)

import { buildWeddingCandidates, type DateCandidate, type Pillar } from './candidates'
import {
  applyFilters, scoreWedding, gradeOf,
  type PersonSaju, type ScoreInput, type WeddingBreakdown,
} from './score'
// 용신은 새 억부용신(정확한 100점 계산)을 쓴다. (궁합과 동일 부품으로 통일)
import { calcYongsinCompat as calcYongsin } from '@/lib/saju/yongsinNew'

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// 일주 60갑자 → 공망 지지 2개 (순공)
function gongmangBranches(ganji: string): string[] {
  if (!ganji || ganji.length < 2) return []
  const s = STEMS.indexOf(ganji[0])
  const b = BRANCHES.indexOf(ganji[1])
  if (s < 0 || b < 0) return []
  const xun = ((b - s) % 12 + 12) % 12   // 순의 첫 지지(甲에 대응) index
  const g1 = (xun + 10) % 12
  const g2 = (xun + 11) % 12
  return [BRANCHES[g1], BRANCHES[g2]]
}

// ── /api/lunar 로 한 사람의 사주(년·월·일 간지) 가져오기 ──
interface RawPerson {
  year: string; month: string; day: string; hour: string
  gender: string; calType: string
}

async function fetchPersonSaju(p: RawPerson | null): Promise<PersonSaju | null> {
  if (!p || !p.year || !p.month || !p.day) return null
  try {
    const leap = '0'
    const url = `/api/lunar?year=${p.year}&month=${p.month}&day=${p.day}&calType=${p.calType || '양력'}&leapMonth=${leap}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) return null

    const split = (g: string): Pillar => {
      if (!g) return { stem: '?', branch: '?' }
      const m = g.match(/\(([^)]+)\)/)
      if (m && m[1].length >= 2) return { stem: m[1][0], branch: m[1][1] }
      if (g.length >= 2) return { stem: g[0], branch: g[1] }
      return { stem: '?', branch: '?' }
    }
    const year = split(data.yearGanji)
    const month = split(data.monthGanji)
    const day = split(data.dayGanji)

    // 시주: 시간을 알면 계산(용신 정확도↑), 모르면 생략
    const hourIdx = p.hour === '-1' || p.hour === '' || p.hour == null ? null : parseInt(p.hour)
    const calcHour = (dayStem: string, hi: number): Pillar => {
      const dg = STEMS.indexOf(dayStem)
      if (dg < 0) return { stem: '?', branch: '?' }
      const groupBase = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]
      return { stem: STEMS[(groupBase[dg] + hi) % 10], branch: BRANCHES[hi] }
    }
    const hour = hourIdx !== null ? calcHour(day.stem, hourIdx) : { stem: '?', branch: '?' }

    // calcYongsin 입력 형태: [{pillar, stem, branch}]
    const sajuPillars = [
      { pillar: '시주', stem: hour.stem, branch: hour.branch },
      { pillar: '일주', stem: day.stem, branch: day.branch },
      { pillar: '월주', stem: month.stem, branch: month.branch },
      { pillar: '년주', stem: year.stem, branch: year.branch },
    ].filter(pp => pp.stem !== '?' && pp.branch !== '?')

    // 심산 오행 점수로 용신 계산 (월지 계절 치환 반영).
    //   /api/lunar 가 돌려주는 양력 월·일을 그대로 쓴다. 시를 모르면 null.
    const hb = hour.branch === '?' ? null : hour.branch
    const ys = calcYongsin(sajuPillars, day.stem, data.solarMonth, data.solarDay, hb)

    return {
      dayStem: day.stem,
      dayBranch: day.branch,
      yearBranch: year.branch,
      ganji: day.stem + day.branch,
      yongsin: ys.yongsin,
    }
  } catch {
    return null
  }
}

export interface WeddingRecommendation {
  rank: number
  dateLabel: string
  ganji: string
  score: number
  grade: string
  stars: number
  badges: string[]
  breakdown: WeddingBreakdown
  y: number; m: number; d: number
  holidayName?: string
}

export interface WeddingAvoidDay {
  dateLabel: string
  reasons: string[]
}

export interface WeddingResult {
  recommendations: WeddingRecommendation[]
  avoidDays: WeddingAvoidDay[]
  totalEvaluated: number
  groomYongsin: string
  brideYongsin: string
  error?: string
}

export interface RunWeddingOptions {
  startDate: string
  endDate: string
  dayPref?: 'weekend' | 'holiday' | 'all' | 'any'
  groom: RawPerson | null
  bride: RawPerson | null
}

// 음력일 확보 — candidates 가 lunarDay 를 못 받았으면 여기서 1회 더 fetch (손없는날 판정)
async function ensureLunarDay(c: DateCandidate): Promise<number | null> {
  if (typeof c.lunarDay === 'number') return c.lunarDay
  try {
    const url = `/api/lunar?year=${c.y}&month=${c.m}&day=${c.d}&calType=양력&leapMonth=0`
    const res = await fetch(url)
    const data = await res.json()
    if (typeof data.lunarDay === 'number') return data.lunarDay
    if (typeof data.lunDay === 'number') return data.lunDay
    return null
  } catch {
    return null
  }
}

export async function runWeddingTiming(opts: RunWeddingOptions): Promise<WeddingResult> {
  const { startDate, endDate, dayPref = 'weekend', groom: rawG, bride: rawB } = opts

  const empty = (error: string): WeddingResult => ({
    recommendations: [], avoidDays: [], totalEvaluated: 0,
    groomYongsin: '', brideYongsin: '', error,
  })

  if (!startDate || !endDate) return empty('희망 기간을 입력해 주세요.')

  // 두 사람 사주 준비
  const [groom, bride] = await Promise.all([fetchPersonSaju(rawG), fetchPersonSaju(rawB)])
  if (!groom || !bride) {
    return empty('두 사람의 사주 정보가 부족해요. 이전 화면에서 생년월일을 확인해 주세요.')
  }

  // 후보 날짜 생성
  const candidates = await buildWeddingCandidates(startDate, endDate, { dayPref })
  if (candidates.length === 0) {
    return empty('해당 기간에 후보 날짜를 만들지 못했어요. 기간을 넓히거나 요일 조건을 바꿔 주세요.')
  }

  // 공망 지지 (두 사람)
  const gGongmang = gongmangBranches(groom.ganji)
  const bGongmang = gongmangBranches(bride.ganji)

  const passed: { c: DateCandidate; bd: WeddingBreakdown }[] = []
  const avoidByDate = new Map<string, Set<string>>()

  for (const c of candidates) {
    const reasons: string[] = []

    // F1. 공망 (자체 계산)
    if (gGongmang.includes(c.day.branch) || bGongmang.includes(c.day.branch)) {
      reasons.push('공망일 (두 사람 기준)')
    }

    const lunarDay = await ensureLunarDay(c)

    const input: ScoreInput = {
      dayStem: c.day.stem,
      dayBranch: c.day.branch,
      ganji: c.ganji,
      monthBranch: c.month.branch,
      lunarDay,
      groom, bride,
    }

    const filter = applyFilters(input)
    const allReasons = [...reasons, ...filter.reasons]

    if (allReasons.length > 0) {
      const key = `${c.y}-${c.m}-${c.d}`
      if (!avoidByDate.has(key)) avoidByDate.set(key, new Set())
      allReasons.forEach(r => avoidByDate.get(key)!.add(r))
      continue
    }

    const bd = scoreWedding(input)
    passed.push({ c, bd })
  }

  // 점수순 정렬 (동점이면 주말 우선)
  passed.sort((a, b) => {
    if (b.bd.total !== a.bd.total) return b.bd.total - a.bd.total
    return (b.c.isWeekend ? 1 : 0) - (a.c.isWeekend ? 1 : 0)
  })

  // 날짜 중복 제거하며 상위 5개
  const seen = new Set<string>()
  const top: typeof passed = []
  for (const s of passed) {
    const key = `${s.c.y}-${s.c.m}-${s.c.d}`
    if (seen.has(key)) continue
    seen.add(key)
    top.push(s)
    if (top.length >= 5) break
  }

  const recommendations: WeddingRecommendation[] = top.map((s, i) => {
    const g = gradeOf(s.bd.total)
    return {
      rank: i + 1,
      dateLabel: s.c.dateLabel,
      ganji: s.c.ganji,
      score: s.bd.total,
      grade: g.grade,
      stars: g.stars,
      badges: s.bd.badges,
      breakdown: s.bd,
      y: s.c.y, m: s.c.m, d: s.c.d,
      holidayName: s.c.holidayName,
    }
  })

  // 피할 날 (최대 3개)
  const avoidDays: WeddingAvoidDay[] = []
  for (const [key, reasons] of avoidByDate) {
    const [y, m, d] = key.split('-')
    avoidDays.push({ dateLabel: `${y}년 ${m}월 ${d}일`, reasons: Array.from(reasons).slice(0, 3) })
    if (avoidDays.length >= 3) break
  }

  return {
    recommendations,
    avoidDays,
    totalEvaluated: candidates.length,
    groomYongsin: groom.yongsin,
    brideYongsin: bride.yongsin,
  }
}
