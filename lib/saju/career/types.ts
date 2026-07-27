// lib/saju/career/types.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  진로적성 — 공용 타입                                            │
// │  출전: 『명리적성 비법노트』(심산)                                 │
// │                                                                │
// │  ★모든 카드 판정 부품이 CareerCard 하나로 내보낸다.                │
// │    화면(CareerJudgeCard)은 이 모양만 알면 되므로,                  │
// │    카드를 새로 붙여도 화면을 안 고쳐도 된다.                        │
// └───────────────────────────────────────────────────────────────┘
//
// ⚠️ lines 와 reasons 를 반드시 갈라 담을 것. (26~28부 교훈 AV)
//    궁합에서 "(순화해서 전할 것)" 같은 AI 지시문이 lines 에 섞여
//    [해설 복사]와 상담사 화면으로 새어 나간 적이 있다.
//      lines   = 고객이 읽는 문장. 화면·복사본·상담사 화면에 그대로 나간다.
//      reasons = 통변 엔진에게만 주는 재료. 화면에 절대 안 나간다.

import type { Ohaeng, Pillar } from '../simsanOhaeng'

export type { Ohaeng, Pillar }

/** 카드 한 장의 판정 결과 (모든 진로적성 부품의 공통 반환형) */
export interface CareerCard {
  /** 화면 정렬·통변 매칭에 쓰는 열쇠말. 카드마다 고유. */
  key: string
  /** 화면에 찍히는 제목 */
  title: string
  /** 제목 옆 배지 (없으면 빈 문자열). 없는 등급을 지어내지 않는다. */
  badge: string
  /** ★고객용 — 화면·복사본에 그대로 나간다 */
  lines: string[]
  /** ★AI 통변 재료 — 화면에 안 나간다 */
  reasons: string[]
  /** 카드별 부가 데이터 (그래프 등). 화면이 필요할 때만 꺼내 쓴다. */
  data?: Record<string, unknown>
}

/** 진로적성 판정에 들어가는 입력 (모든 부품이 이걸 받는다) */
export interface CareerInput {
  /** 사주 네 기둥. pillar 는 '년주'|'월주'|'일주'|'시주' */
  saju: Pillar[]
  /** 양력 월 (1~12) — 寅·申월 날짜분할에 필요 */
  solarMonth: number
  /** 양력 일 (1~31) */
  solarDay: number
  /** 시지 글자 (예 '卯'). 시를 모르면 null */
  hourBranch: string | null
  /** 학생용/성인용 — 카드 구성이 갈린다 (대학 카드는 학생만) */
  target?: 'student' | 'adult'
}

/** 시(時)를 모르는 사주인지. 시주가 '?' 로 들어온다. (교훈 AW) */
export function isHourUnknown(saju: Pillar[]): boolean {
  const h = saju.find(p => p.pillar === '시주')
  return !h || h.stem === '?' || h.branch === '?'
}
