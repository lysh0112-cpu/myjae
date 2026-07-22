// lib/saju/mbtiCompareView.ts
// ============================================================================
// 연인 궁합 MBTI 카드용 — 축별 점수를 화면용(등급·설명)으로 변환.
//   계산은 lib/saju/mbtiScore.ts(calcMbtiScoreDetailed)가 하고,
//   여기선 "점수 숫자" 대신 "잘 맞아요/최고예요" 같은 말로 바꾼다.
//   (점수의 상처 방지 원칙 — 오행 카드와 동일 철학)
// ============================================================================

import { calcMbtiScoreDetailed } from './mbtiScore'

export interface MbtiAxisView {
  label: string      // 축 이름 (예: '에너지 방향')
  note?: string      // 부가 (예: '가장 중요')
  grade: string      // 등급 말 (예: '최고예요')
  gradeColor: string // 등급 배지 색
  desc: string       // 한 줄 설명
}

export interface MbtiCompareView {
  hasMbti: boolean
  mbti1: string
  mbti2: string
  axes: MbtiAxisView[]
  summary: string    // 종합 한 문단
}

// 점수/만점 비율 → 등급 말 + 색
function grade(score: number, max: number): { grade: string; color: string } {
  const r = score / max
  if (r >= 0.95) return { grade: '최고예요', color: '#c85a3c' }
  if (r >= 0.7) return { grade: '잘 맞아요', color: '#3B6D11' }
  if (r >= 0.45) return { grade: '무난해요', color: '#8a7a3a' }
  return { grade: '맞춰가요', color: '#8a6a52' }
}

// 축별 설명 — 두 글자 조합으로 (예: E+I). 순서 무관하게 정렬해 판정.
function axisDesc(a: string, b: string, kind: 'ei' | 'ns' | 'tf' | 'jp'): string {
  const pair = [a, b].sort().join('')
  const TABLE: Record<string, Record<string, string>> = {
    ei: {
      EI: '활발함과 차분함이 서로를 채워줘요',
      EE: '둘 다 활발해 함께 있으면 즐거워요',
      II: '둘 다 차분해 편안하고 아늑해요',
    },
    ns: {
      NS: '상상력과 현실감각이 이상적으로 어우러져요',
      NN: '둘 다 상상력이 풍부해 대화가 즐거워요',
      SS: '둘 다 현실적이라 발이 땅에 붙어 있어요',
    },
    tf: {
      FT: '감성과 논리가 만나 갈등도 잘 풀어요',
      TT: '둘 다 논리적이라 합이 잘 맞아요',
      FF: '둘 다 다정해 서로 마음을 잘 알아줘요',
    },
    jp: {
      JP: '계획성과 자유로움이 균형을 이뤄요',
      JJ: '둘 다 계획적이라 척척 맞아요',
      PP: '둘 다 자유로워 얽매이지 않아요',
    },
  }
  return TABLE[kind][pair] ?? ''
}

const AXIS_LABEL: Record<string, string> = {
  ei: '에너지 방향', ns: '인식 방식', tf: '판단 방식', jp: '생활 방식',
}

export function buildMbtiCompareView(mbti1: string, mbti2: string): MbtiCompareView {
  const r = calcMbtiScoreDetailed(mbti1, mbti2)
  if (!r.hasMbti) {
    return { hasMbti: false, mbti1: '', mbti2: '', axes: [], summary: '' }
  }
  const m1 = mbti1.toUpperCase(), m2 = mbti2.toUpperCase()

  const axes: MbtiAxisView[] = [
    { kind: 'ei', score: r.eiScore, max: 10, i: 0 },
    { kind: 'ns', score: r.nsScore, max: 8, i: 1 },
    { kind: 'tf', score: r.tfScore, max: 15, i: 2, note: '가장 중요' },
    { kind: 'jp', score: r.jpScore, max: 12, i: 3 },
  ].map(a => {
    const g = grade(a.score, a.max)
    return {
      label: AXIS_LABEL[a.kind],
      note: a.note,
      grade: g.grade,
      gradeColor: g.color,
      desc: axisDesc(m1[a.i], m2[a.i], a.kind as 'ei' | 'ns' | 'tf' | 'jp'),
    }
  })

  // 종합: 반대가 많은지 닮은 게 많은지로 톤 결정
  let opposite = 0
  for (let i = 0; i < 4; i++) if (m1[i] !== m2[i]) opposite++
  const summary =
    opposite >= 3
      ? '성향이 서로 많이 달라요. 신기하게도 MBTI에선 다른 점이 클수록 끌리고 채워주는 조합이 되기도 해요. 서로의 다름이 설렘과 안정이 되어줘요.'
      : opposite <= 1
        ? '성향이 참 많이 닮았어요. 말하지 않아도 통하는, 결이 비슷한 두 사람이에요. 편안함이 가장 큰 강점이에요.'
        : '닮은 점과 다른 점이 고루 섞였어요. 통하는 부분에선 편안하고, 다른 부분에선 서로를 새롭게 채워주는 사이예요.'

  return { hasMbti: true, mbti1: m1, mbti2: m2, axes, summary }
}
