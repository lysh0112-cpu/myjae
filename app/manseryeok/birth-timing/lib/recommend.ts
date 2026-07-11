// app/manseryeok/birth-timing/lib/recommend.ts
// 출산택일 5·6단계: 부모 관계 가점 + 전체 채점 + 정렬 → 추천 5개 / 피할 날 추출
//
// 설계: docs/출산택일_설계.md 참고. 명리 판단은 "잠정 기준".

import { buildCandidates, sajuString, type Candidate } from './candidates'
import { scoreBaby, type ScoreBreakdown } from './score'

interface ParentLite {
  // 부모 사주에서 가점 계산에 쓰는 정보 (일간 + 억부용신)
  dayStem?: string
  yongsin?: string    // 부모의 억부용신 오행(목/화/토/금/수) — 신버전 엔진(calcYongsinCompat)에서 계산
}

// 천간 → 오행
const STEM_ELEMENT: Record<string, string> = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
  '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
}
// 상생: 목→화→토→금→수→목
const SAENG: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
// 천간합 쌍
const STEM_HAP: [string, string][] = [
  ['甲', '己'], ['乙', '庚'], ['丙', '辛'], ['丁', '壬'], ['戊', '癸'],
]

// 부모 관계 가점 (보조, 최대 +10) — 아기 사주는 그대로 100점 만점 본체.
//   ① 일간 관계: 천간합 +5 / 아기가 부모를 생(生) +3  (기존)
//   ② 부모 용신 부합(신버전): 아기 사주 오행 구성이 부모의 억부용신을 채워주면 가점.
//      부모 용신 오행이 아기 8글자에 2개↑ → +3 / 1개 → +1.5  (부모별 합산)
//   → 부모 보너스 총합은 +10 상한(초과분 캡). 아기 사주 100점이 주역인 구조 불변.
function parentBonus(
  babyDayStem: string,
  parents: ParentLite[],
  babyElementCount?: Record<string, number>,
): { bonus: number; note: string } {
  let bonus = 0
  let note = ''
  const babyEl = STEM_ELEMENT[babyDayStem]
  if (!babyEl) return { bonus: 0, note: '' }

  for (const p of parents) {
    if (!p.dayStem) continue
    // ① 천간합이면 +5
    const isHap = STEM_HAP.some(([a, b]) =>
      (a === babyDayStem && b === p.dayStem) || (b === babyDayStem && a === p.dayStem))
    if (isHap) { bonus += 5; if (!note) note = '부모와 천간합 — 인연이 깊어요' }
    else {
      // ① 아기가 부모를 생(生)해주면 +3 (효자 기운)
      const pEl = STEM_ELEMENT[p.dayStem]
      if (pEl && SAENG[babyEl] === pEl) { bonus += 3; if (!note) note = '부모를 돕는 기운이 있어요' }
    }

    // ② 부모 용신 부합 (신버전 억부용신) — 아기 사주가 부모에게 힘이 되는 오행을 갖췄는가
    if (p.yongsin && babyElementCount) {
      const have = babyElementCount[p.yongsin] || 0
      if (have >= 2) { bonus += 3; if (!note) note = `부모에게 힘이 되는 ${p.yongsin} 기운을 갖춘 아기예요` }
      else if (have >= 1) { bonus += 1.5; if (!note) note = `부모의 용신(${p.yongsin})을 살려주는 기운이 있어요` }
    }
  }
  if (bonus > 10) bonus = 10
  return { bonus, note }
}

export interface Recommendation {
  rank: number
  dateLabel: string
  hourLabel: string
  score: number
  saju: string
  breakdown: ScoreBreakdown
  parentNote: string
  y: number; m: number; d: number; hourIdx: number
}

export interface AvoidDay {
  dateLabel: string
  reasons: string[]
}

export interface BirthResult {
  recommendations: Recommendation[]
  avoidDays: AvoidDay[]
  totalEvaluated: number
}

export interface RunOptions {
  timePref?: 'morning' | 'afternoon' | 'any'
  excludeWeekend?: boolean
  parents?: ParentLite[]
}

// 메인: 예정일 → 추천 5개 + 피할 날
export async function runBirthTiming(dueDate: string, opts: RunOptions = {}): Promise<BirthResult> {
  const { timePref = 'any', excludeWeekend = true, parents = [] } = opts

  const candidates = await buildCandidates(dueDate, { timePref, excludeWeekend })
  if (candidates.length === 0) {
    return { recommendations: [], avoidDays: [], totalEvaluated: 0 }
  }

  // 각 후보 채점 + 부모 가점
  const scored = candidates.map(c => {
    const breakdown = scoreBaby(c)
    const pb = parentBonus(c.day.stem, parents, breakdown.elementCount)
    const finalScore = Math.min(100, breakdown.total + pb.bonus)
    return { c, breakdown, parentNote: pb.note, finalScore }
  })

  // 산액 회피 플래그가 있는 후보 → "피할 날" 후보로 분리
  const avoidByDate = new Map<string, Set<string>>()
  for (const s of scored) {
    if (s.breakdown.avoidFlags.length > 0) {
      const key = `${s.c.y}-${s.c.m}-${s.c.d}`
      if (!avoidByDate.has(key)) avoidByDate.set(key, new Set())
      s.breakdown.avoidFlags.forEach(f => avoidByDate.get(key)!.add(f))
    }
  }

  // 추천: 산액 회피에 안 걸린 것 중 점수 높은 순 5개
  const clean = scored.filter(s => s.breakdown.avoidFlags.length === 0)
  clean.sort((a, b) => b.finalScore - a.finalScore)

  // 같은 날짜는 최고 점수 시진 하나만 (날짜 다양성)
  const seen = new Set<string>()
  const top: typeof clean = []
  for (const s of clean) {
    const key = `${s.c.y}-${s.c.m}-${s.c.d}`
    if (seen.has(key)) continue
    seen.add(key)
    top.push(s)
    if (top.length >= 5) break
  }

  const recommendations: Recommendation[] = top.map((s, i) => ({
    rank: i + 1,
    dateLabel: s.c.dateLabel,
    hourLabel: s.c.hourLabel,
    score: Math.round(s.finalScore),
    saju: sajuString(s.c),
    breakdown: s.breakdown,
    parentNote: s.parentNote,
    y: s.c.y, m: s.c.m, d: s.c.d, hourIdx: s.c.hourIdx,
  }))

  // 피할 날 (최대 3개)
  const avoidDays: AvoidDay[] = []
  for (const [key, reasons] of avoidByDate) {
    const [y, m, d] = key.split('-')
    avoidDays.push({ dateLabel: `${y}년 ${m}월 ${d}일`, reasons: Array.from(reasons) })
    if (avoidDays.length >= 3) break
  }

  return { recommendations, avoidDays, totalEvaluated: candidates.length }
}
