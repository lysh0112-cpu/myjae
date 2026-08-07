// lib/saju/somu/topics/index.ts
//
//  🌿 소무승 물상론 — «주제별» 꼭지 등록표 (十一 ~ 十六)
//
//  ⛔⛔ ★SOMU_CHAPTERS(../data.ts) 와 «섞지» 마십시오.
//     저쪽은 일간별(Record<string, SomuChapter>), 이쪽은 주제별입니다.
//     ⇒ 화면도 «다른 자리» 에 그립니다. 일간을 안 고르고도 읽는 글이기 때문입니다.
//
//  ★지금 담긴 것 : 十四 十二運星(433~440) · ★十五 十二支神殺(441~454)  — «두 꼭지».
//  □ 남은 것 : 十一 自然現象論 · 十二 変證論 · 十三 神殺論 · 十六 通辯要論
//     ⛔ 목차 쪽수는 어긋납니다. ★十二運星 429→433 · 十二支神殺 437→441 — 둘 다 «+4» 였습니다.
//        담을 때 반드시 «스캔 밑단» 쪽번호로 고쳐 적으십시오.
//  ⚠️ ★일간 두 장(壬水·癸水)도 아직 남아 있습니다 — ../data.ts 를 보십시오.
//
//  ⚠️ 꼭지를 더할 때 ★고칠 곳은 «이 파일 한 곳» 입니다 (import 한 줄 + 등록 한 줄).
//     그리고 위 「지금 담긴 것 / 남은 것」 줄을 ★반드시 함께 고치십시오.

import type { SomuTopic } from './types'
import { UNSEONG12 } from './unseong12'
import { SINSAL12 } from './sinsal12'

export type {
  SomuTopic,
  SomuTopicSection,
  SomuTopicTable,
  SomuTopicTableRow,
  SomuStemBranchLine,
  SomuSamhapLine,
  SomuTopicOrder,
} from './types'

export const SOMU_TOPICS: Record<string, SomuTopic> = {
  unseong12: UNSEONG12,
  sinsal12: SINSAL12,
}

/** 화면에 보일 차례 — 교재 차례 그대로 */
export const SOMU_TOPIC_ORDER: string[] = ['unseong12', 'sinsal12']
