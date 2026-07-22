// app/manseryeok/birth-timing/lib/score.ts
// 출산택일 3단계: 아기 사주 채점 (조후30 + 오행30 + 지지안정40 = 100)
//
// ※ 명리 판단이 들어가는 부분 — "잠정 기준". 연재 선생님 검수 후 조정 전제.
// 설계: docs/출산택일_설계.md 참고

import type { Candidate } from './candidates'
import { BIRTH_SCORE_CONFIG as CFG } from './birthScoreConfig'

// ── 천간·지지 → 오행 매핑 ──
const STEM_ELEMENT: Record<string, string> = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
  '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
}
const BRANCH_ELEMENT: Record<string, string> = {
  '寅': '목', '卯': '목', '巳': '화', '午': '화',
  '辰': '토', '戌': '토', '丑': '토', '未': '토',
  '申': '금', '酉': '금', '子': '수', '亥': '수',
}

const ELEMENTS = ['목', '화', '토', '금', '수']

// 지지 온도 성향 (조후용): 더운 달 / 추운 달
const SUMMER_BRANCHES = ['巳', '午', '未'] // 여름 (조열)
const WINTER_BRANCHES = ['亥', '子', '丑'] // 겨울 (한랭)

// 지지 육충 쌍
const CHUNG_PAIRS: [string, string][] = [
  ['子', '午'], ['丑', '未'], ['寅', '申'],
  ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
]
// 지지 형(刑) — 대표적인 삼형·자형
const HYEONG_GROUPS: string[][] = [
  ['寅', '巳', '申'], // 삼형
  ['丑', '戌', '未'], // 삼형
  ['子', '卯'],       // 상형
]
// 원진 쌍
const WONJIN_PAIRS: [string, string][] = [
  ['子', '未'], ['丑', '午'], ['寅', '酉'],
  ['卯', '申'], ['辰', '亥'], ['巳', '戌'],
]

export interface ScoreBreakdown {
  total: number          // 0~100
  ohaeng: number         // 0~30
  johu: number           // 0~30
  jiji: number           // 0~40
  // 별점(1~5)으로 변환한 값 — 화면 표시용
  starOhaeng: number
  starJohu: number
  starJiji: number
  // 산액 회피에 걸렸는지 (걸리면 후보에서 밀어냄)
  avoidFlags: string[]
  elementCount: Record<string, number>
}

// 후보의 8글자를 오행 개수로 집계
function countElements(c: Candidate): Record<string, number> {
  const count: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  const stems = [c.year.stem, c.month.stem, c.day.stem, c.hour.stem]
  const branches = [c.year.branch, c.month.branch, c.day.branch, c.hour.branch]
  for (const s of stems) { const e = STEM_ELEMENT[s]; if (e) count[e]++ }
  for (const b of branches) { const e = BRANCH_ELEMENT[b]; if (e) count[e]++ }
  return count
}

// ① 오행 중화 (30점)
function scoreOhaeng(count: Record<string, number>): { score: number; avoid: string[] } {
  const avoid: string[] = []
  const values = ELEMENTS.map(e => count[e])
  const missing = values.filter(v => v === 0).length      // 없는 오행 개수
  const max = Math.max(...values)
  const total = values.reduce((a, b) => a + b, 0) || 1     // 보통 8

  // 한 오행 비율
  const maxRatio = max / total

  let score = CFG.weights.ohaeng
  // 없는 오행마다 감점
  score -= missing * CFG.ohaeng.missingEach
  // 한 오행 쏠림 감점 (70% 이상이면 큰 감점 = 산액 회피)
  if (maxRatio >= CFG.ohaeng.ratioHigh) { score -= CFG.ohaeng.concentratedHigh; avoid.push('한 오행이 심하게 치우침') }
  else if (maxRatio >= CFG.ohaeng.ratioMid) { score -= CFG.ohaeng.concentratedMid }

  if (score < 0) score = 0
  if (score > CFG.weights.ohaeng) score = CFG.weights.ohaeng
  return { score, avoid }
}

// ② 조후 (30점) — 태어난 달(월지)의 온도를 시·일의 기운이 보완하는가
function scoreJohu(c: Candidate, count: Record<string, number>): number {
  const monthBranch = c.month.branch
  const isSummer = SUMMER_BRANCHES.includes(monthBranch)
  const isWinter = WINTER_BRANCHES.includes(monthBranch)

  // 여름생: 水가 필요 / 겨울생: 火가 필요
  if (isSummer) {
    const water = count['수']
    if (water >= 2) return CFG.johu.full
    if (water === 1) return CFG.johu.half
    return CFG.johu.lack // 더운데 물이 없음
  }
  if (isWinter) {
    const fire = count['화']
    if (fire >= 2) return CFG.johu.full
    if (fire === 1) return CFG.johu.half
    return CFG.johu.lack // 추운데 불이 없음
  }
  // 봄·가을(환절기)생은 대체로 온화 — 기본 점수
  return CFG.johu.neutral
}

// ③ 지지 안정 + 산액 회피 (40점)
function scoreJiji(c: Candidate): { score: number; avoid: string[] } {
  const branches = [c.year.branch, c.month.branch, c.day.branch, c.hour.branch]
  const avoid: string[] = []
  let penalty = 0

  // 충(沖) 검사
  let chungCount = 0
  for (const [a, b] of CHUNG_PAIRS) {
    if (branches.includes(a) && branches.includes(b)) chungCount++
  }
  if (chungCount >= 1) penalty += chungCount * CFG.jiji.chungEach
  if (chungCount >= CFG.jiji.chungAvoidAt) avoid.push('강한 충(沖)이 겹침')

  // 형(刑) 검사
  for (const grp of HYEONG_GROUPS) {
    const hit = grp.filter(g => branches.includes(g)).length
    if (hit >= 2) penalty += CFG.jiji.hyeong
  }

  // 원진 검사
  for (const [a, b] of WONJIN_PAIRS) {
    if (branches.includes(a) && branches.includes(b)) penalty += CFG.jiji.wonjin
  }

  // 산액 회피 — 子·卯·酉 두 글자 이상 겹침/충
  const jaMyoYu = branches.filter(b => ['子', '卯', '酉'].includes(b))
  const uniqueJMY = new Set(jaMyoYu)
  if (jaMyoYu.length >= 2 && uniqueJMY.size >= 2) {
    penalty += CFG.jiji.jaMyoYu
    avoid.push('子·卯·酉가 겹쳐 전통적으로 출산 시 피해온 구성')
  }

  let score = CFG.weights.jiji - penalty
  if (score < 0) score = 0
  return { score, avoid }
}

// 점수(0~상한) → 별점 1~5
function toStar(score: number, max: number): number {
  const ratio = score / max
  const [c5, c4, c3, c2] = CFG.starCut
  if (ratio >= c5) return 5
  if (ratio >= c4) return 4
  if (ratio >= c3) return 3
  if (ratio >= c2) return 2
  return 1
}

// 메인: 후보 1건 채점 (아기 사주 100점 기준 — 부모 가점은 별도 5단계)
export function scoreBaby(c: Candidate): ScoreBreakdown {
  const count = countElements(c)
  const oh = scoreOhaeng(count)
  const johu = scoreJohu(c, count)
  const jiji = scoreJiji(c)

  const avoidFlags = [...oh.avoid, ...jiji.avoid]
  const total = oh.score + johu + jiji.score

  return {
    total,
    ohaeng: oh.score,
    johu,
    jiji: jiji.score,
    starOhaeng: toStar(oh.score, CFG.weights.ohaeng),
    starJohu: toStar(johu, CFG.weights.johu),
    starJiji: toStar(jiji.score, CFG.weights.jiji),
    avoidFlags,
    elementCount: count,
  }
}
