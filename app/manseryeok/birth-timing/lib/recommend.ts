// app/manseryeok/birth-timing/lib/recommend.ts
// 출산택일 5·6단계: 부모 관계 가점 + 전체 채점 + 정렬 → 추천 5개 / 피할 날 추출
//
// 설계: docs/출산택일_설계.md 참고. 명리 판단은 "잠정 기준".

import { buildCandidates, sajuString, type Candidate } from './candidates'
import { scoreBaby, type ScoreBreakdown } from './score'
import { BIRTH_SCORE_CONFIG as CFG } from './birthScoreConfig'

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
    if (isHap) { bonus += CFG.parent.hap; if (!note) note = '부모와 천간합 — 인연이 깊어요' }
    else {
      // ① 아기가 부모를 생(生)해주면 +3 (효자 기운)
      const pEl = STEM_ELEMENT[p.dayStem]
      if (pEl && SAENG[babyEl] === pEl) { bonus += CFG.parent.saeng; if (!note) note = '부모를 돕는 기운이 있어요' }
    }

    // ② 부모 용신 부합 (신버전 억부용신) — 아기 사주가 부모에게 힘이 되는 오행을 갖췄는가
    if (p.yongsin && babyElementCount) {
      const have = babyElementCount[p.yongsin] || 0
      if (have >= 2) { bonus += CFG.parent.yongsin2; if (!note) note = `부모에게 힘이 되는 ${p.yongsin} 기운을 갖춘 아기예요` }
      else if (have >= 1) { bonus += CFG.parent.yongsin1; if (!note) note = `부모의 용신(${p.yongsin})을 살려주는 기운이 있어요` }
    }
  }
  if (bonus > CFG.parent.bonusCap) bonus = CFG.parent.bonusCap
  return { bonus, note }
}

export interface Recommendation {
  rank: number
  offset: number           // 예정일 기준 -1(전날) / 0(예정일) / +1(다음날)
  dateLabel: string
  hourLabel: string
  score: number
  saju: string
  breakdown: ScoreBreakdown
  parentNote: string
  weekday: string          // '토'
  isWeekend: boolean
  dateKey: string          // 'YYYYMMDD' (공휴일 조회 매칭용)
  avoidFlags: string[]     // 이 날이 전통적으로 피하는 구성이면 사유 (없으면 빈 배열)
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
  parents?: ParentLite[]
}

// 메인: 예정일 → 전날·당일·다음날 3일, 각 날 최고 시진 1개 (+ 피할 날 안내)
//   [출산택일 3일 방식] 예정일이 정해져 있으므로 그 ±1일만 본다.
//   각 날짜에서 점수가 가장 높은 시진 1개를 뽑고, offset(-1/0/+1) 순서로 정렬.
//   산액(피하는 구성)에 걸린 날도 3일이면 그대로 보여주되 avoidFlags를 실어 화면서 경고.
export async function runBirthTiming(dueDate: string, opts: RunOptions = {}): Promise<BirthResult> {
  const { timePref = 'any', parents = [] } = opts

  // 전날·당일·다음날 (before1/after1)
  const candidates = await buildCandidates(dueDate, { timePref, before: 1, after: 1 })
  if (candidates.length === 0) {
    return { recommendations: [], avoidDays: [], totalEvaluated: 0 }
  }

  // 각 후보 채점 + 부모 가점
  const scored = candidates.map(c => {
    const breakdown = scoreBaby(c)
    const pb = parentBonus(c.day.stem, parents, breakdown.elementCount)
    const finalScore = Math.min(CFG.scoreCap, breakdown.total + pb.bonus)
    return { c, breakdown, parentNote: pb.note, finalScore }
  })

  // 각 offset(-1/0/+1)별로 최고 점수 시진 1개만 선택
  const bestByOffset = new Map<number, typeof scored[number]>()
  for (const s of scored) {
    const cur = bestByOffset.get(s.c.offset)
    if (!cur || s.finalScore > cur.finalScore) bestByOffset.set(s.c.offset, s)
  }

  // offset 순서 고정: -1(전날) → 0(예정일) → +1(다음날)
  const ordered = [-1, 0, 1]
    .map(off => bestByOffset.get(off))
    .filter((s): s is typeof scored[number] => s !== undefined)

  const pad = (n: number) => String(n).padStart(2, '0')
  const recommendations: Recommendation[] = ordered.map((s, i) => ({
    rank: i + 1,
    offset: s.c.offset,
    dateLabel: s.c.dateLabel,
    hourLabel: s.c.hourLabel,
    score: Math.round(s.finalScore),
    saju: sajuString(s.c),
    breakdown: s.breakdown,
    parentNote: s.parentNote,
    weekday: s.c.weekday,
    isWeekend: s.c.isWeekend,
    dateKey: `${s.c.y}${pad(s.c.m)}${pad(s.c.d)}`,
    avoidFlags: s.breakdown.avoidFlags,
    y: s.c.y, m: s.c.m, d: s.c.d, hourIdx: s.c.hourIdx,
  }))

  // 피할 날: 3일 중 산액 구성이 있는 날 (화면 하단 요약용)
  const avoidDays: AvoidDay[] = recommendations
    .filter(r => r.avoidFlags.length > 0)
    .map(r => ({ dateLabel: r.dateLabel, reasons: r.avoidFlags }))

  return { recommendations, avoidDays, totalEvaluated: candidates.length }
}
