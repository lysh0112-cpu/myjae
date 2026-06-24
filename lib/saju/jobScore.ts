// lib/saju/jobScore.ts
// 직업 오행 궁합 점수 계산 — 주오행 + 부오행 + 용신 연동

import { getMainOhaeng, getSubOhaeng } from './jobOhaeng'

// =============================================
// 상수
// =============================================

const GENERATES: Record<string, string> = {
  목: '화', 화: '토', 토: '금', 금: '수', 수: '목'
}
const CONTROLS: Record<string, string> = {
  목: '토', 화: '금', 토: '수', 금: '목', 수: '화'
}

// =============================================
// 오행 관계 계산
// =============================================

type OhaengRel = 'same' | 'generates' | 'generated' | 'controls' | 'controlled' | 'neutral'

function getOhaengRel(e1: string, e2: string): OhaengRel {
  if (!e1 || !e2) return 'neutral'
  if (e1 === e2) return 'same'
  if (GENERATES[e1] === e2) return 'generates'
  if (GENERATES[e2] === e1) return 'generated'
  if (CONTROLS[e1] === e2) return 'controls'
  if (CONTROLS[e2] === e1) return 'controlled'
  return 'neutral'
}

// =============================================
// 직업 오행 직접 관계 점수 (15점)
// =============================================

function calcDirectScore(main1: string, main2: string): { score: number; reason: string } {
  const rel = getOhaengRel(main1, main2)
  switch (rel) {
    case 'generates':
      return { score: 15, reason: `${main1}이 ${main2}를 생해주는 상생 관계 (내가 상대를 도움)` }
    case 'generated':
      return { score: 12, reason: `${main2}이 ${main1}를 생해주는 상생 관계 (상대가 나를 도움)` }
    case 'same':
      return { score: 10, reason: `두 사람 직업 오행이 같아(${main1}) 시너지 가능` }
    case 'neutral':
      return { score: 8, reason: `직업 오행이 중립 관계` }
    case 'controls':
      return { score: 5, reason: `${main1}이 ${main2}를 극하는 관계 (주도권 충돌 가능)` }
    case 'controlled':
      return { score: 3, reason: `${main2}이 ${main1}를 극하는 관계 (눌리는 구조)` }
    default:
      return { score: 8, reason: '직업 오행 중립' }
  }
}

// =============================================
// 부오행 보정 점수 (5점)
// =============================================

function calcSubScore(
  sub1: string, main2: string,
  sub2: string, main1: string
): { score: number; reason: string } {
  let score = 0
  const reasons: string[] = []

  // 부오행1 → 상대 주오행 관계
  if (sub1) {
    const rel1 = getOhaengRel(sub1, main2)
    if (rel1 === 'generates' || rel1 === 'same') {
      score += 3
      reasons.push(`부오행(${sub1})이 상대 직업(${main2})을 보완`)
    } else if (rel1 === 'controls') {
      score -= 2
      reasons.push(`부오행(${sub1})이 상대 직업(${main2})과 충돌`)
    }
  }

  // 부오행2 → 나의 주오행 관계
  if (sub2) {
    const rel2 = getOhaengRel(sub2, main1)
    if (rel2 === 'generates' || rel2 === 'same') {
      score += 2
      reasons.push(`상대 부오행(${sub2})이 나의 직업(${main1})을 보완`)
    } else if (rel2 === 'controls') {
      score -= 1
      reasons.push(`상대 부오행(${sub2})이 나의 직업(${main1})과 충돌`)
    }
  }

  return {
    score: Math.max(-3, Math.min(5, score)),
    reason: reasons.join(' / ') || '부오행 영향 없음'
  }
}

// =============================================
// 직업 오행 vs 상대 용신 점수 (10점)
// =============================================

function calcYongsinScore(
  main1: string, sub1: string, yongsin2: string,
  main2: string, sub2: string, yongsin1: string
): { score: number; reason: string } {
  let score = 0
  const reasons: string[] = []

  // 나의 직업(주) → 상대 용신
  const rel1 = getOhaengRel(main1, yongsin2)
  if (rel1 === 'generates' || rel1 === 'same') {
    score += 6
    reasons.push(`내 직업(${main1})이 상대 용신(${yongsin2})을 생해줌`)
  } else if (rel1 === 'controls') {
    score -= 4
    reasons.push(`내 직업(${main1})이 상대 용신(${yongsin2})을 극함`)
  }

  // 상대 직업(주) → 나의 용신
  const rel2 = getOhaengRel(main2, yongsin1)
  if (rel2 === 'generates' || rel2 === 'same') {
    score += 6
    reasons.push(`상대 직업(${main2})이 내 용신(${yongsin1})을 생해줌`)
  } else if (rel2 === 'controls') {
    score -= 4
    reasons.push(`상대 직업(${main2})이 내 용신(${yongsin1})을 극함`)
  }

  // 부오행 보정 — 용신과 관계
  if (sub1 && yongsin2) {
    const subRel1 = getOhaengRel(sub1, yongsin2)
    if (subRel1 === 'generates') {
      score += 2
      reasons.push(`부오행(${sub1})이 상대 용신(${yongsin2}) 보완`)
    }
  }
  if (sub2 && yongsin1) {
    const subRel2 = getOhaengRel(sub2, yongsin1)
    if (subRel2 === 'generates') {
      score += 2
      reasons.push(`상대 부오행(${sub2})이 내 용신(${yongsin1}) 보완`)
    }
  }

  return {
    score: Math.max(-8, Math.min(10, score)),
    reason: reasons.join(' / ') || '용신 영향 중립'
  }
}

// =============================================
// 결과 인터페이스
// =============================================

export interface JobScoreResult {
  totalScore: number    // 최대 30점
  directScore: number   // 직접 관계 (15점)
  subScore: number      // 부오행 보정 (5점)
  yongsinScore: number  // 용신 연동 (10점)
  reasons: string[]
}

// =============================================
// 메인 함수
// =============================================

export function calcJobScoreDetailed(
  jobId1: string,
  jobId2: string,
  yongsin1: string,
  yongsin2: string
): JobScoreResult {
  const main1 = getMainOhaeng(jobId1)
  const sub1  = getSubOhaeng(jobId1)
  const main2 = getMainOhaeng(jobId2)
  const sub2  = getSubOhaeng(jobId2)

  // 직업 없으면 기본값
  if (!main1 || !main2) {
    return {
      totalScore: 8,
      directScore: 8,
      subScore: 0,
      yongsinScore: 0,
      reasons: ['직업 정보 없음 — 기본값 적용'],
    }
  }

  const direct  = calcDirectScore(main1, main2)
  const sub     = calcSubScore(sub1, main2, sub2, main1)
  const yongsin = calcYongsinScore(main1, sub1, yongsin2, main2, sub2, yongsin1)

  const totalScore = Math.max(0, Math.min(30,
    direct.score + sub.score + yongsin.score
  ))

  return {
    totalScore,
    directScore: direct.score,
    subScore: sub.score,
    yongsinScore: yongsin.score,
    reasons: [direct.reason, sub.reason, yongsin.reason].filter(Boolean),
  }
}
