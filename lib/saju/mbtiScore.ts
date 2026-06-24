// lib/saju/mbtiScore.ts
// MBTI 궁합 점수 계산 — 항목별 가중치 + 유명 조합 보정

// =============================================
// 유명 궁합 좋은 조합 (보너스)
// =============================================

const GOOD_PAIRS: [string, string][] = [
  ['INFJ', 'ENTP'],
  ['INTJ', 'ENFP'],
  ['ISFJ', 'ESTP'],
  ['INFP', 'ENFJ'],
  ['ISTJ', 'ESTP'],
  ['ISFP', 'ENFJ'],
  ['INTP', 'ENTJ'],
  ['ISTP', 'ESTJ'],
]

const GOOD_PAIRS_BONUS = 3

// =============================================
// 궁합 나쁜 조합 (감점)
// =============================================

const BAD_PAIRS: [string, string][] = [
  ['ISTJ', 'INTJ'],  // 둘 다 T+J — 너무 딱딱
  ['ESTJ', 'ENTJ'],  // 둘 다 T+J — 주도권 충돌
  ['INFP', 'ENFP'],  // 둘 다 F+P — 너무 감성적
  ['ISFP', 'INFP'],  // 둘 다 F+P
]

const BAD_PAIRS_PENALTY = -3

// =============================================
// 항목별 점수 계산
// =============================================

// ① E/I (에너지 방향) — 10점
function calcEIScore(ei1: string, ei2: string): { score: number; reason: string } {
  if (ei1 === 'E' && ei2 === 'I' || ei1 === 'I' && ei2 === 'E') {
    return { score: 10, reason: 'E+I 조합 — 외향과 내향이 서로를 보완하는 최고 조합' }
  }
  if (ei1 === 'E' && ei2 === 'E') {
    return { score: 6, reason: 'E+E 조합 — 활발하지만 둘 다 지칠 수 있음' }
  }
  return { score: 4, reason: 'I+I 조합 — 안정적이지만 답답할 수 있음' }
}

// ② N/S (인식 방식) — 8점
function calcNSScore(ns1: string, ns2: string): { score: number; reason: string } {
  if (ns1 !== ns2) {
    return { score: 8, reason: 'N+S 조합 — 직관과 현실감각의 이상적 조화' }
  }
  if (ns1 === 'N') {
    return { score: 5, reason: 'N+N 조합 — 창의적이지만 현실감 부족할 수 있음' }
  }
  return { score: 5, reason: 'S+S 조합 — 안정적이지만 변화에 약할 수 있음' }
}

// ③ T/F (판단 방식) — 15점 (가장 중요)
function calcTFScore(tf1: string, tf2: string): { score: number; reason: string } {
  if (tf1 !== tf2) {
    return { score: 15, reason: 'T+F 조합 — 논리와 감성의 완벽한 조화, 갈등 해결력 최고' }
  }
  if (tf1 === 'T') {
    return { score: 5, reason: 'T+T 조합 — 합리적이지만 감정 소통이 부족할 수 있음' }
  }
  return { score: 5, reason: 'F+F 조합 — 감성적이지만 냉정한 판단이 어려울 수 있음' }
}

// ④ J/P (생활 방식) — 12점
function calcJPScore(jp1: string, jp2: string): { score: number; reason: string } {
  if (jp1 !== jp2) {
    return { score: 12, reason: 'J+P 조합 — 계획성과 유연함의 이상적 조화' }
  }
  if (jp1 === 'J') {
    return { score: 6, reason: 'J+J 조합 — 안정적이지만 융통성이 부족할 수 있음' }
  }
  return { score: 4, reason: 'P+P 조합 — 자유롭지만 현실적 문제가 생길 수 있음' }
}

// =============================================
// 유명 조합 보정
// =============================================

function calcPairBonus(mbti1: string, mbti2: string): { score: number; reason: string } {
  const m1 = mbti1.toUpperCase()
  const m2 = mbti2.toUpperCase()

  for (const [a, b] of GOOD_PAIRS) {
    if ((m1 === a && m2 === b) || (m1 === b && m2 === a)) {
      return { score: GOOD_PAIRS_BONUS, reason: `${m1}+${m2} — 명리학적으로도 잘 맞는 유명 궁합 조합` }
    }
  }

  for (const [a, b] of BAD_PAIRS) {
    if ((m1 === a && m2 === b) || (m1 === b && m2 === a)) {
      return { score: BAD_PAIRS_PENALTY, reason: `${m1}+${m2} — 비슷한 성향끼리 충돌 주의` }
    }
  }

  return { score: 0, reason: '' }
}

// =============================================
// 결과 인터페이스
// =============================================

export interface MbtiScoreResult {
  totalScore: number    // 최대 25점
  eiScore: number       // E/I (10점)
  nsScore: number       // N/S (8점)
  tfScore: number       // T/F (15점)
  jpScore: number       // J/P (12점)
  bonusScore: number    // 유명 조합 보정
  reasons: string[]
  hasMbti: boolean
}

// =============================================
// 메인 함수
// =============================================

export function calcMbtiScoreDetailed(
  mbti1: string,
  mbti2: string
): MbtiScoreResult {
  // MBTI 미입력 처리
  if (!mbti1 || !mbti2 || mbti1.length < 4 || mbti2.length < 4) {
    return {
      totalScore: 0,
      eiScore: 0, nsScore: 0, tfScore: 0, jpScore: 0,
      bonusScore: 0,
      reasons: [],
      hasMbti: false,
    }
  }

  const m1 = mbti1.toUpperCase()
  const m2 = mbti2.toUpperCase()

  const ei = calcEIScore(m1[0], m2[0])
  const ns = calcNSScore(m1[1], m2[1])
  const tf = calcTFScore(m1[2], m2[2])
  const jp = calcJPScore(m1[3], m2[3])
  const bonus = calcPairBonus(m1, m2)

  // 45점 만점 → 25점으로 환산
  const rawTotal = ei.score + ns.score + tf.score + jp.score
  const normalized = Math.round(rawTotal / 45 * 25)

  // 보너스/감점 적용
  const totalScore = Math.max(0, Math.min(25, normalized + bonus.score))

  const reasons = [
    ei.reason,
    ns.reason,
    tf.reason,
    jp.reason,
    bonus.reason,
  ].filter(Boolean)

  return {
    totalScore,
    eiScore: ei.score,
    nsScore: ns.score,
    tfScore: tf.score,
    jpScore: jp.score,
    bonusScore: bonus.score,
    reasons,
    hasMbti: true,
  }
}
