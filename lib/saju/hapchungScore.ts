// lib/saju/hapchungScore.ts
// ============================================================================
//  합·충(合沖) 반영 오행 점수 계산 (전문가 모드 전용)
//  기준: 용신재설계 자료 (연재쌤/NotebookLM) — 방합·삼합·반합·육합·천간합 + 충 + 거리가중치
//
//  ★ 기본 점수(합충 전)는 yongsinNew.calcYongsinScore와 동일 (辰戌丑未=본기 土).
//    그 위에 합충으로 오행 점수를 이동/삭감한 결과를 돌려준다.
//  ★ 일반 모드는 이 파일을 쓰지 않는다. 전문가 토글 ON일 때만 사용.
// ============================================================================

import type { Ohaeng, Pillar } from './yongsinNew'
import { calcYongsinScore } from './yongsinNew'

const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_EL: Record<string, Ohaeng> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화', 午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}
const BRANCH_ORDER = ['년주', '월주', '일주', '시주']

// 지지별 배점 (yongsinScore와 동일)
const BRANCH_SCORE: Record<string, number> = { 시주: 10, 일주: 15, 월주: 35, 년주: 5 }

// ── 거리 가중치 ──────────────────────────────────────────────────────────────
// 인접(1칸)=1.0, 격(2칸)=0.5, 원격(3칸)=0.2
function distWeight(i: number, j: number): number {
  const d = Math.abs(i - j)
  if (d === 1) return 1.0
  if (d === 2) return 0.5
  return 0.2
}

// ── 삼합·방합·육합·왕지 정의 ────────────────────────────────────────────────
const WANGJI = new Set(['子', '午', '卯', '酉'])
// 삼합: 화신오행
const SAMHAP: { branches: string[]; el: Ohaeng }[] = [
  { branches: ['申', '子', '辰'], el: '수' },
  { branches: ['亥', '卯', '未'], el: '목' },
  { branches: ['寅', '午', '戌'], el: '화' },
  { branches: ['巳', '酉', '丑'], el: '금' },
]
// 방합: 화신오행 (+ 월지 포함 필수)
const BANGHAP: { branches: string[]; el: Ohaeng }[] = [
  { branches: ['寅', '卯', '辰'], el: '목' },
  { branches: ['巳', '午', '未'], el: '화' },
  { branches: ['申', '酉', '戌'], el: '금' },
  { branches: ['亥', '子', '丑'], el: '수' },
]
// 육합: 두 지지 → 화신오행
const YUKHAP: Record<string, Ohaeng> = {
  '子丑': '토', '寅亥': '목', '卯戌': '화', '辰酉': '금', '巳申': '수', '午未': '화',
}
// 충: 6쌍
const CHUNG: string[] = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥']

// ── 메인: 합충 반영 점수 ─────────────────────────────────────────────────────
export interface HapchungResult {
  score: Record<Ohaeng, number>       // 합충 반영 후
  baseScore: Record<Ohaeng, number>   // 합충 전
  notes: string[]                     // 적용된 합충 설명
}

export function calcHapchungScore(saju: Pillar[]): HapchungResult {
  const base = calcYongsinScore(saju)
  const score: Record<Ohaeng, number> = { ...base }
  const notes: string[] = []

  // 지지 배열 (자리 index 포함)
  const branches = BRANCH_ORDER
    .map((p, idx) => {
      const found = saju.find(s => s.pillar === p)
      return found ? { pillar: p, branch: found.branch, idx, pts: BRANCH_SCORE[p] } : null
    })
    .filter(Boolean) as { pillar: string; branch: string; idx: number; pts: number }[]

  const monthBranch = saju.find(s => s.pillar === '월주')?.branch ?? ''
  const branchSet = new Set(branches.map(b => b.branch))

  // 점수 이동 헬퍼: from오행 → to오행 (원지지 pts 기준, 비율·거리 적용)
  const move = (fromBranch: string, pts: number, toEl: Ohaeng, ratio: number, dw: number, label: string) => {
    const fromEl = BRANCH_EL[fromBranch]
    if (!fromEl || fromEl === toEl) return
    const amount = pts * ratio * dw
    if (amount <= 0) return
    score[fromEl] = Math.max(0, score[fromEl] - amount)
    score[toEl] += amount
    notes.push(`${label}: ${fromBranch}(${fromEl}) → ${toEl} ${amount.toFixed(1)}점 이동`)
  }

  // ── 1) 방합 (세 지지 다 있고 월지 포함) — 변환율 100%, 잔존 0 ──
  for (const bh of BANGHAP) {
    if (bh.branches.every(b => branchSet.has(b)) && bh.branches.includes(monthBranch)) {
      for (const b of branches) {
        if (bh.branches.includes(b.branch) && BRANCH_EL[b.branch] !== bh.el) {
          move(b.branch, b.pts, bh.el, 1.0, 1.0, '방합')
        }
      }
    }
  }

  // ── 2) 삼합 (세 지지 + 왕지 포함) — 변환율 80% ──
  for (const sh of SAMHAP) {
    if (sh.branches.every(b => branchSet.has(b)) && sh.branches.some(b => WANGJI.has(b) && branchSet.has(b))) {
      for (const b of branches) {
        if (sh.branches.includes(b.branch) && BRANCH_EL[b.branch] !== sh.el) {
          move(b.branch, b.pts, sh.el, 0.8, 1.0, '삼합')
        }
      }
    }
  }

  // ── 3) 반합 (왕지 포함 2지지) — 변환율 60%, 거리가중 적용 ──
  for (const sh of SAMHAP) {
    // 왕지 + 다른 한 글자 조합
    const present = branches.filter(b => sh.branches.includes(b.branch))
    // 삼합 이미 성립하면 스킵
    if (sh.branches.every(b => branchSet.has(b))) continue
    // 왕지 포함 2개 쌍만
    for (let x = 0; x < present.length; x++) {
      for (let y = x + 1; y < present.length; y++) {
        const a = present[x], c = present[y]
        const hasWang = WANGJI.has(a.branch) || WANGJI.has(c.branch)
        if (!hasWang) continue // 왕지 없는 생묘합은 불성립(0%)
        const dw = distWeight(a.idx, c.idx)
        // 왕지 아닌 쪽 지지가 화신으로 변환
        const nonWang = WANGJI.has(a.branch) ? c : a
        if (BRANCH_EL[nonWang.branch] !== sh.el) {
          move(nonWang.branch, nonWang.pts, sh.el, 0.6, dw, '반합')
        }
      }
    }
  }

  // ── 4) 육합 (2지지) — 변환율 50%, 거리가중 ──
  for (let x = 0; x < branches.length; x++) {
    for (let y = x + 1; y < branches.length; y++) {
      const a = branches[x], c = branches[y]
      const key1 = a.branch + c.branch, key2 = c.branch + a.branch
      const hapEl = YUKHAP[key1] ?? YUKHAP[key2]
      if (!hapEl) continue
      const dw = distWeight(a.idx, c.idx)
      // 월령이 화신을 극하면 보정 0.5 (합이불화)
      const monthEl = BRANCH_EL[monthBranch]
      const CON: Record<Ohaeng, Ohaeng> = { 수: '화', 화: '금', 금: '목', 목: '토', 토: '수' }
      const monthBonus = (monthEl && CON[monthEl] === hapEl) ? 0.5 : 1.0
      move(a.branch, a.pts, hapEl, 0.5 * monthBonus, dw, '육합')
      move(c.branch, c.pts, hapEl, 0.5 * monthBonus, dw, '육합')
    }
  }

  // ── 5) 충 (2지지) — 약자 50%·강자 20% 삭감, 거리가중 ──
  for (let x = 0; x < branches.length; x++) {
    for (let y = x + 1; y < branches.length; y++) {
      const a = branches[x], c = branches[y]
      const k1 = a.branch + c.branch, k2 = c.branch + a.branch
      if (!CHUNG.includes(k1) && !CHUNG.includes(k2)) continue
      const dw = distWeight(a.idx, c.idx)
      const elA = BRANCH_EL[a.branch], elC = BRANCH_EL[c.branch]
      const sumA = score[elA], sumC = score[elC]
      // 약자 판정 (총점 비교)
      let cutA = 0.35, cutC = 0.35
      if (sumA > sumC) { cutA = 0.20; cutC = 0.50 }
      else if (sumC > sumA) { cutA = 0.50; cutC = 0.20 }
      const dropA = a.pts * cutA * dw
      const dropC = c.pts * cutC * dw
      score[elA] = Math.max(0, score[elA] - dropA)
      score[elC] = Math.max(0, score[elC] - dropC)
      notes.push(`충: ${a.branch}↔${c.branch} (${dropA.toFixed(1)}·${dropC.toFixed(1)}점 삭감)`)
    }
  }

  // 반올림
  const round = (o: Record<Ohaeng, number>): Record<Ohaeng, number> => ({
    목: Math.round(o.목 * 10) / 10, 화: Math.round(o.화 * 10) / 10, 토: Math.round(o.토 * 10) / 10,
    금: Math.round(o.금 * 10) / 10, 수: Math.round(o.수 * 10) / 10,
  })

  return { score: round(score), baseScore: base, notes }
}
