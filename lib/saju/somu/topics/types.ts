// lib/saju/somu/topics/types.ts
//
//  🌿 소무승 물상론 — «주제별» 꼭지 타입 (十一 ~ 十六)
//
//  ⛔ 손대기 «전» 에 ../data.ts 머리말을 읽으십시오. 담는 규칙이 거기 있습니다.
//     특히 ★to 표('둘다' | '상담사만') — 빠뜨리면 '상담사만' 으로 봅니다.
//
//  ★왜 타입을 «따로» 잡았는가 —
//     一~十 은 «일간별» 이라 SomuChapter(stem·keywords·pairs·seasons·cases)에 담깁니다.
//     ★十一~十六 은 «주제별» 입니다. 일간도 없고 天干論·地支論·通辯論도 없습니다.
//     ⇒ SomuChapter 에 억지로 끼워 넣으면 빈 칸(pairs: [] · seasons: {…})이 넷 생기고
//        화면이 그것을 걸러 내는 조건을 또 만들어야 합니다.
//     ⛔⛔ ★SOMU_CHAPTERS 에 넣지 마십시오 — Record<string, SomuChapter> 라 타입이 깨집니다.
//        주제별은 ./index.ts 의 SOMU_TOPICS 에 따로 담습니다.
//
//  ✅ SomuTo · SomuLine 은 ★data.ts 에서 «가져다» 씁니다.
//     ⛔ 여기에 다시 적지 마십시오 — 사본이 둘 되면 to 표가 갈라집니다.
//
//  ⚠️⚠️ ★이 얼개는 «53부 인수인계서 6장» 이 「대표님·연재쌤과 정하고 시작하라」고
//     적어 둔 자리입니다. 자료 파일은 «어디에도 안 걸려» 있어 되돌리기 쉽지만,
//     ★화면(SomuReading.tsx)에 붙이는 것은 얼개를 정하신 «뒤» 에 하십시오.

import type { SomuLine } from '../data'

/** 주제 안의 한 갈래 — 十二運星이면 「생(長生)」「욕(沐浴)」… 열둘 */
export interface SomuTopicSection {
  /** 로마자 열쇠 — 화면 key 용 */
  key: string
  /** 교재 소제목 그대로 — 「생(長生)」 */
  label: string
  /** 교재 원문 줄들 */
  lines: SomuLine[]
}

/** 교재가 «상자» 안에 넣어 둔 차례 그림 */
export interface SomuTopicOrder {
  /** ★상자 안 원문 한 줄 그대로 */
  text: string
  /** 화면이 ▸ 로 잇도록 끊어 놓은 것 — ⛔ 글자를 바꾸지 마십시오 */
  items: string[]
}

/** 「일간이 甲은 亥궁이 장생지요.」 같은 줄 */
export interface SomuStemBranchLine {
  /** 그 줄이 묶은 천간 — 교재가 「丙戊」처럼 둘씩 묶은 곳이 있습니다 */
  stems: string[]
  /** 지지 한 글자 */
  branch: string
  /** ★교재 원문 그대로 */
  text: string
}

/** 주제 한 꼭지 */
export interface SomuTopic {
  /** 파일 열쇠 — 'unseong12' */
  id: string
  /** 교재 차례 번호 — '十四' */
  no: string
  /** 꼭지 이름 — '十二運星' */
  label: string
  /** 쪽수 — 출전 표기용. ★반드시 «스캔 밑단» 값으로 */
  pages: string
  /** 표지 쪽 */
  coverPage: number
  /** 머리 설명 */
  intro: SomuLine[]
  /** 차례 상자 */
  order?: SomuTopicOrder
  /**
   * 천간 → 지지 표 (十二運星의 장생지 여덟 줄)
   * ⚠️ ★교재는 «장생지» 만 적어 두었습니다. 순행·역행 규칙은 «없습니다».
   *    ⛔ 나머지 열한 자리를 «계산해» 채우지 마십시오 (unseong12.ts 머리말 참조).
   */
  stemTable?: SomuStemBranchLine[]
  /** 갈래들 */
  sections: SomuTopicSection[]
}
