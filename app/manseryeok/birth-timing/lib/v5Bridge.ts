// app/manseryeok/birth-timing/lib/v5Bridge.ts
//
// ★ v5 결과 ↔ 기존 저장/다시보기 스키마 브리지
//   v5 는 "날짜(DayRecommendation) + 시간배열(HourPick)" 2단 구조.
//   저장은 이 구조를 그대로 평면 스냅샷으로 담고, 다시보기 때 되돌린다.

import type { DayRecommendation, HourPick } from './recommendV5'
import type { ScoreV5Breakdown } from './scoreV5'
import type { DayunItem } from '@/lib/saju/dayun'

export interface HourSnapshot {
  hourIdx: number
  hourLabel: string
  saju: string
  breakdown: ScoreV5Breakdown
  dayunScore: number
  dayunNote: string
  finalScore: number
  needExpert: boolean
  y: number; m: number; d: number
}

export interface RecV5Snapshot {
  rank: number
  dateLabel: string
  weekday: string
  dateKey: string
  offset: number
  bestScore: number
  hours: HourSnapshot[]
  dayunList: DayunItem[]
  y: number; m: number; d: number
}

export function toSnapshot(r: DayRecommendation): RecV5Snapshot {
  return {
    rank: r.rank, dateLabel: r.dateLabel, weekday: r.weekday,
    dateKey: r.dateKey, offset: r.offset, bestScore: r.bestScore,
    hours: r.hours.map((h): HourSnapshot => ({ ...h })),
    dayunList: r.dayunList ?? [],
    y: r.y, m: r.m, d: r.d,
  }
}

export function fromSnapshot(s: RecV5Snapshot): DayRecommendation {
  return {
    rank: s.rank, dateLabel: s.dateLabel, weekday: s.weekday,
    dateKey: s.dateKey, offset: s.offset, bestScore: s.bestScore,
    hours: s.hours.map((h): HourPick => ({ ...h })),
    dayunList: s.dayunList ?? [],
    y: s.y, m: s.m, d: s.d,
  }
}
