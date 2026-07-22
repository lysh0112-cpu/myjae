// app/manseryeok/birth-timing/lib/starMapV5.ts
//
// ★ v5 채점 → 화면 별점 3줄 변환 (설계안 §7)
//   숫자 점수는 감추고, 별점·순위·해설만 노출한다. (교훈 A "점수는 상처를 준다")
//
//   [3줄 재구성] 오행/조후/지지  →  건강 / 성공 / 재물·명예
//     · 건강   = 조후(온도) + 오행 중화        → 몸의 균형
//     · 성공   = 격국 성패 + 일간 통근         → 그릇의 완성도
//     · 재물명예 = 재·관 + 대운 타이밍          → 사회적 성취 + 인생 흐름
//
//   대운 타이밍(용신이 30~60세에 오는가)을 '재물·명예'에 얹은 이유:
//   재·관은 사회적 성취축이고, 대운은 그 성취가 인생 핵심기에 받쳐지는지라 결이 같다.

import type { ScoreV5Breakdown } from './scoreV5'
import { BIRTH_SCORE_CONFIG as CFG } from './birthScoreConfig'

const W = CFG.weightsV5

export interface StarLine {
  label: '건강' | '성공' | '재물·명예'
  stars: number   // 1~5
}

// 비율(0~1) → 별점 1~5 (config starCut 재사용)
function ratioToStar(ratio: number): number {
  const [c5, c4, c3, c2] = CFG.starCut
  if (ratio >= c5) return 5
  if (ratio >= c4) return 4
  if (ratio >= c3) return 3
  if (ratio >= c2) return 2
  return 1
}

export function toStarLines(bd: ScoreV5Breakdown, dayunScore: number): StarLine[] {
  // 건강: 조후 + 오행 (만점 = W.johu + W.ohaeng)
  const healthMax = W.johu + W.ohaeng
  const health = ratioToStar((bd.johu + bd.ohaeng) / (healthMax || 1))

  // 성공: 격국 + 통근 (만점 = W.gyeok + W.tonggeun)
  const successMax = W.gyeok + W.tonggeun
  const success = ratioToStar((bd.gyeok + bd.tonggeun) / (successMax || 1))

  // 재물·명예: 재관 + 대운타이밍 (만점 = W.jaegwan + dayun.cap)
  const wealthMax = W.jaegwan + CFG.dayun.cap
  const wealth = ratioToStar((bd.jaegwan + dayunScore) / (wealthMax || 1))

  return [
    { label: '건강', stars: health },
    { label: '성공', stars: success },
    { label: '재물·명예', stars: wealth },
  ]
}
