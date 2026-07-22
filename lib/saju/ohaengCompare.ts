// lib/saju/ohaengCompare.ts
// ============================================================================
// 두 사람 오행 비교 — 닮음도·보완도 산출 + 오행별 값 정리
//   궁합 시각화 부품(OhaengCompareCard)이 쓰는 계산 로직.
//   화면과 분리해 두어, 계산만 따로 테스트/재사용할 수 있게 한다.
//
// 산출식 (2026-07-22 확정, 연재쌤 방향 OK):
//   닮음% = (1 - Σ|A오행 - B오행| / 200) × 100   → 두 사람이 비슷할수록 높음
//   보완% = 서로_메운양 / 두사람_부족총량 × 100    → 부족을 서로 채울수록 높음
//     · 부족 = 각 오행이 평균(20) 미만인 부분
//     · 메움 = 한쪽 부족을 상대가 채우는 양 (평균까지만 인정)
//
// ★ 오행 색은 lib/saju/ohaengColor.ts(연재쌤 지정) 를 쓴다. 여기선 값만 다룬다.
// ============================================================================

export type Ohaeng = '목' | '화' | '토' | '금' | '수'
export const OHAENG_ORDER: Ohaeng[] = ['목', '화', '토', '금', '수']

const AVG = 20        // 오행 5개 균등 분배 시 평균 (100/5)
const MAX_DIFF = 200  // 두 사람 오행 차이합의 이론상 최대

export interface OhaengCompareResult {
  /** 오행별 두 사람 값 (막대그래프용) */
  rows: { el: Ohaeng; a: number; b: number }[]
  /** 닮음도 0~100 */
  similarity: number
  /** 보완도 0~100 */
  complement: number
  /** 가장 차이 큰 오행 (해설용) */
  mostDifferent: Ohaeng
  /** 가장 닮은(차이 작은) 오행 (해설용) */
  mostSimilar: Ohaeng
  /** 닮음이 더 강한지 보완이 더 강한지 */
  leaning: 'similar' | 'complement'
}

/**
 * 두 사람의 오행 점수를 받아 닮음·보완을 산출한다.
 * @param aScores A(예: 남편)의 오행 점수 { 목,화,토,금,수 }
 * @param bScores B(예: 아내)의 오행 점수
 */
export function compareOhaeng(
  aScores: Record<string, number>,
  bScores: Record<string, number>,
): OhaengCompareResult {
  const a = (el: Ohaeng) => aScores[el] ?? 0
  const b = (el: Ohaeng) => bScores[el] ?? 0

  const rows = OHAENG_ORDER.map(el => ({ el, a: a(el), b: b(el) }))

  // ── 닮음도 ──
  const diffSum = OHAENG_ORDER.reduce((s, el) => s + Math.abs(a(el) - b(el)), 0)
  const similarity = Math.round((1 - diffSum / MAX_DIFF) * 100)

  // ── 보완도 ──
  let fill = 0
  for (const el of OHAENG_ORDER) {
    if (a(el) < AVG && b(el) > a(el)) fill += Math.min(b(el) - a(el), AVG - a(el))
    if (b(el) < AVG && a(el) > b(el)) fill += Math.min(a(el) - b(el), AVG - b(el))
  }
  const lackTotal =
    OHAENG_ORDER.reduce((s, el) => s + Math.max(0, AVG - a(el)), 0) +
    OHAENG_ORDER.reduce((s, el) => s + Math.max(0, AVG - b(el)), 0)
  const complement = lackTotal > 0 ? Math.round((fill / lackTotal) * 100) : 0

  // ── 해설용: 가장 다른/닮은 오행 ──
  const sorted = [...OHAENG_ORDER].sort(
    (x, y) => Math.abs(a(y) - b(y)) - Math.abs(a(x) - b(x)),
  )
  const mostDifferent = sorted[0]
  const mostSimilar = sorted[sorted.length - 1]

  return {
    rows,
    similarity: clamp(similarity),
    complement: clamp(complement),
    mostDifferent,
    mostSimilar,
    leaning: similarity >= complement ? 'similar' : 'complement',
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n))
}
