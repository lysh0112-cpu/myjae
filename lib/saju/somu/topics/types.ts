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
//     ⇒ SomuChapter 에 억지로 끼워 넣으면 빈 칸이 넷 생기고
//        화면이 그것을 걸러 내는 조건을 또 만들어야 합니다.
//     ⛔⛔ ★SOMU_CHAPTERS 에 넣지 마십시오 — Record<string, SomuChapter> 라 타입이 깨집니다.
//        주제별은 ./index.ts 의 SOMU_TOPICS 에 따로 담습니다.
//
//  ✅ SomuTo · SomuLine 은 ★data.ts 에서 «가져다» 씁니다.
//     ⛔ 여기에 다시 적지 마십시오 — 사본이 둘 되면 to 표가 갈라집니다.
//
//  ★고쳐 온 자취 —
//    · 十四 十二運星 을 담으며 신설 (intro · order · stemTable · sections)
//    · ★十五 十二支神殺 을 담으며 «셋» 이 늘었습니다 —
//        SomuTopicSection.keywords   낱말 나열 줄 (神殺마다 맨 앞 ○ 한 줄)
//        SomuTopicSection.tables     ★부부 / 부모 자식 / 사업장 표
//        SomuTopic.samhapTable       ★삼합 → 기준 지지 (寅午戌生은 午宮에 將星)
//      ⚠️ 셋 다 ★«물음표(?)» 입니다 — 十二運星 파일은 한 글자도 안 고쳤습니다.
//      ⛔ 새 꼭지에 없는 칸을 «빈 배열로» 채우지 마십시오. 아예 빼십시오.
//        (화면이 «없으면 안 그리는» 쪽으로 갈립니다)

import type { SomuLine } from '../data'

/** 표 한 줄 — 「巳酉丑 | 酉 | 잘 싸우고 잘 살아간다(언쟁부부).」 */
export interface SomuTopicTableRow {
  /** 왼쪽 칸 — ★교재 표기 그대로. 삼합일 때도, 지지 한 글자일 때도 있습니다 */
  left: string
  /** 오른쪽 칸 — 없는 줄이 있습니다 (月殺 452쪽 원국 보기) */
  right?: string
  /** 설명 칸 — 교재 원문 그대로 */
  text: string
  to?: SomuLine['to']
}

/** 표 한 덩이 — 「부부」 「부모 자식」 「사업장」 */
export interface SomuTopicTable {
  /** 왼쪽 세로 이름 — '부부' · '부모 자식' · '사업장' · '보기' */
  label: string
  /**
   * 머리 두 칸 — ['夫','婦'] · ['부모','자식'] · ['사장','종업원']
   * ⚠️ 머리가 «없는» 표가 있습니다 (月殺 452쪽 원국 보기) — 그때는 빼십시오.
   */
  head?: [string, string]
  rows: SomuTopicTableRow[]
}

/** 주제 안의 한 갈래 — 十二運星이면 「생(長生)」…, 十二支神殺이면 「將星殺(장성살)」… */
export interface SomuTopicSection {
  /** 로마자 열쇠 — 화면 key 용 */
  key: string
  /** 교재 소제목 그대로 — 「생(長生)」 · 「將星殺(장성살)」 */
  label: string
  /**
   * ★맨 앞 «낱말 나열» 한 줄 — 十二支神殺이 神殺마다 이렇게 시작합니다.
   * ⚠️ 十二運星에는 «없습니다». 없는 갈래는 아예 빼십시오.
   */
  keywords?: SomuLine[]
  /** 교재 원문 줄들 */
  lines: SomuLine[]
  /** 소제목 아래 표들 */
  tables?: SomuTopicTable[]
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

/** 「寅午戌 生은 午宮에 將星을 놓고 順行으로 짚어 간다.」 */
export interface SomuSamhapLine {
  /** 삼합 세 글자 — '寅午戌' */
  samhap: string
  /** 기준이 되는 지지 한 글자 — '午' */
  branch: string
  /** ★교재 원문 그대로 */
  text: string
}

/** 주제 한 꼭지 */
export interface SomuTopic {
  /** 파일 열쇠 — 'unseong12' · 'sinsal12' */
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
   *    ⛔ 나머지 열한 자리를 «계산해» 채우지 마십시오 (unseong12.ts 머리말).
   */
  stemTable?: SomuStemBranchLine[]
  /**
   * 삼합 → 기준 지지 (十二支神殺의 將星 네 줄)
   * ✅ ★이쪽은 «順行» 이 교재에 «적혀 있어» 규칙이 완결됩니다 (sinsal12.ts 머리말).
   */
  samhapTable?: SomuSamhapLine[]
  /** 갈래들 */
  sections: SomuTopicSection[]
}
