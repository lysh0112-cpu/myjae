// app/manseryeok/birth-timing/lib/v5Bridge.ts
//
// ★ v5 결과 ↔ 기존 저장/다시보기 스키마 브리지
//
//   [왜] 기존 result/page.tsx 의 저장·다시보기·세션스토리지·AI해설은 전부
//   옛 Recommendation( score/parentNote/breakdown.elementCount/avoidFlags )에 묶여 있다.
//   v5(RecommendationV5)는 필드가 다르다(finalScore/dayunNote/다른 breakdown).
//   → 검증된 저장 골격을 깨지 않으려, v5 결과를 "저장용 평면 객체"로 변환하고
//     다시보기 시 복원한다. 화면 렌더는 ResultV5 가 RecommendationV5 를 직접 쓴다.
//
//   즉 저장에는 화면 표시에 필요한 최소 필드만 평면으로 담고,
//   다시보기 때 그대로 ResultV5 에 넘길 수 있는 형태로 되돌린다.

import type { RecommendationV5 } from './recommendV5'
import type { ScoreV5Breakdown } from './scoreV5'

// 저장/복원용 평면 스냅샷 (JSON 직렬화 안전)
export interface RecV5Snapshot {
  rank: number
  dateLabel: string
  hourLabel: string
  offset: number
  weekday: string
  dateKey: string
  saju: string
  breakdown: ScoreV5Breakdown
  dayunScore: number
  dayunNote: string
  finalScore: number
  needExpert: boolean
  y: number; m: number; d: number; hourIdx: number
}

export function toSnapshot(r: RecommendationV5): RecV5Snapshot {
  return {
    rank: r.rank, dateLabel: r.dateLabel, hourLabel: r.hourLabel,
    offset: r.offset, weekday: r.weekday, dateKey: r.dateKey, saju: r.saju,
    breakdown: r.breakdown, dayunScore: r.dayunScore, dayunNote: r.dayunNote,
    finalScore: r.finalScore, needExpert: r.needExpert,
    y: r.y, m: r.m, d: r.d, hourIdx: r.hourIdx,
  }
}

// 다시보기: 저장 스냅샷 → RecommendationV5 (구조 동일하므로 그대로 통과)
export function fromSnapshot(s: RecV5Snapshot): RecommendationV5 {
  return { ...s }
}
