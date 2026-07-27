// lib/saju/examLuck/types.ts
//
// 합격운·취업운·학업운 공용 타입
//
// ★진로적성(career/)과 같은 얼개다. 표(tables/)와 판정을 갈라 두고,
//   공용 엔진(dayun.ts · yongsinNew.ts · simsanOhaeng.ts)은 건드리지 않는다.
//   필요한 차이는 전부 examLuck/ 안에서 감싼다. (29부 5장)

import type { Ohaeng, Pillar } from '../simsanOhaeng'
export type { Ohaeng, Pillar }

/** 십신 열 가지 */
export type Sipsin =
  | '비견' | '겁재' | '식신' | '상관' | '편재'
  | '정재' | '편관' | '정관' | '편인' | '정인'

export const SIPSIN_ALL: Sipsin[] = [
  '비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인',
]

/** 한 해의 판정 결과 */
export interface YearLuck {
  year: number
  /** 그해 간지 */
  stem: string
  branch: string
  /** 천간·지지의 십신 */
  ganSipsin: string
  jiSipsin: string
  /**
   * 합산 점수 (유리 + / 불리 −)
   * ★2026-07-27 — 대운 30 : 세운 70 을 섞은 값이다. 등급도 이 값으로 매긴다.
   *   대운을 안 넘기면 세운만으로 매긴다(그 경우 seyunScore 와 같다).
   */
  score: number
  /** 세운만 본 점수 */
  seyunScore?: number
  /** 대운만 본 점수 — 대운을 넘겼을 때만 */
  dayunScore?: number
  /** 그때 흐르던 대운 간지 — 화면·통변에서 "무엇 때문인지" 밝히는 데 쓴다 */
  dayunGanji?: string
  /** 걸린 규칙들 — 화면 근거와 통변 재료에 그대로 쓴다 */
  hits: Array<{ key: string; say: string; weight: number; src: string }>
  /** 다섯 칸 등급 */
  grade: Grade
}

export type Grade = '아주 좋음' | '좋음' | '보통' | '조심' | '많이 조심'

/** 학생용/성인용 — 카드 구성이 갈린다 */
export type ExamTarget = 'student' | 'adult'

/** 판정에 들어가는 입력 */
export interface ExamInput {
  saju: Pillar[]
  /** 양력 생년월일 — 대운 계산에 필요 */
  birthYear: number
  birthMonth: number
  birthDay: number
  gender: string          // '남' | '여'
  /** 몇 해를 볼지 (올해 포함). 기본 5 */
  span?: number
  target?: ExamTarget
}

/** 카드 한 장 — career/ 의 CareerCard 와 같은 모양으로 맞춘다 */
export interface ExamCard {
  key: string
  title: string
  badge?: string
  /** 고객이 읽는 글 */
  lines: string[]
  /** AI 통변에게만 주는 재료 — ★화면에 그리지 말 것 (교훈 AV) */
  reasons: string[]
  data?: Record<string, unknown>
}
