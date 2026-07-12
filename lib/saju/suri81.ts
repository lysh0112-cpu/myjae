// lib/saju/suri81.ts
// 81수리 길흉표 (한국 통용 웅기식 표준)
// 작명왕·작명가 실제 화면과 대조 검증 완료 (17건창격=길, 18발전격=길, 26시비격=흉)
//
// fortune: "길"(좋음) | "평"(반길반흉) | "흉"(나쁨)
// name: 격(格) 이름

export type SuriFortune = "길" | "평" | "흉";

export interface SuriInfo {
  name: string;        // 격 이름 (예: 건창격)
  fortune: SuriFortune; // 길흉
}

// 1~81 수리 길흉표
export const SURI_81: Record<number, SuriInfo> = {
  1: { name: "태초격", fortune: "길" },
  2: { name: "분리격", fortune: "흉" },
  3: { name: "명예격", fortune: "길" },
  4: { name: "부정격", fortune: "흉" },
  5: { name: "성공격", fortune: "길" },
  6: { name: "풍부격", fortune: "길" },
  7: { name: "독립격", fortune: "길" },
  8: { name: "개물격", fortune: "길" },
  9: { name: "궁박격", fortune: "흉" },
  10: { name: "공허격", fortune: "흉" },
  11: { name: "신성격", fortune: "길" },
  12: { name: "박약격", fortune: "흉" },
  13: { name: "지모격", fortune: "길" },
  14: { name: "이산격", fortune: "흉" },
  15: { name: "통솔격", fortune: "길" },
  16: { name: "덕망격", fortune: "길" },
  17: { name: "건창격", fortune: "길" },
  18: { name: "발전격", fortune: "길" },
  19: { name: "고난격", fortune: "흉" },
  20: { name: "허망격", fortune: "흉" },
  21: { name: "두령격", fortune: "길" },
  22: { name: "중절격", fortune: "흉" },
  23: { name: "공명격", fortune: "길" },
  24: { name: "입신격", fortune: "길" },
  25: { name: "안강격", fortune: "길" },
  26: { name: "시비격", fortune: "흉" },
  27: { name: "중단격", fortune: "평" },
  28: { name: "파란격", fortune: "흉" },
  29: { name: "성공격", fortune: "길" },
  30: { name: "부몽격", fortune: "평" },
  31: { name: "흥성격", fortune: "길" },
  32: { name: "요행격", fortune: "길" },
  33: { name: "승천격", fortune: "길" },
  34: { name: "파멸격", fortune: "흉" },
  35: { name: "평범격", fortune: "길" },
  36: { name: "의협격", fortune: "흉" },
  37: { name: "인덕격", fortune: "길" },
  38: { name: "문예격", fortune: "평" },
  39: { name: "안락격", fortune: "길" },
  40: { name: "무상격", fortune: "흉" },
  41: { name: "대공격", fortune: "길" },
  42: { name: "고행격", fortune: "흉" },
  43: { name: "성쇠격", fortune: "흉" },
  44: { name: "마장격", fortune: "흉" },
  45: { name: "대지격", fortune: "길" },
  46: { name: "부지격", fortune: "흉" },
  47: { name: "출세격", fortune: "길" },
  48: { name: "제사격", fortune: "길" },
  49: { name: "은퇴격", fortune: "평" },
  50: { name: "부몽격", fortune: "평" },
  51: { name: "춘추격", fortune: "평" },
  52: { name: "승룡격", fortune: "길" },
  53: { name: "내허격", fortune: "흉" },
  54: { name: "절망격", fortune: "흉" },
  55: { name: "미달격", fortune: "평" },
  56: { name: "부족격", fortune: "흉" },
  57: { name: "노력격", fortune: "길" },
  58: { name: "후영격", fortune: "평" },
  59: { name: "실의격", fortune: "흉" },
  60: { name: "동요격", fortune: "흉" },
  61: { name: "명리격", fortune: "길" },
  62: { name: "화락격", fortune: "흉" },
  63: { name: "순성격", fortune: "길" },
  64: { name: "침체격", fortune: "흉" },
  65: { name: "휘양격", fortune: "길" },
  66: { name: "우매격", fortune: "흉" },
  67: { name: "통달격", fortune: "길" },
  68: { name: "흥가격", fortune: "길" },
  69: { name: "종말격", fortune: "흉" },
  70: { name: "공허격", fortune: "흉" },
  71: { name: "견실격", fortune: "평" },
  72: { name: "상반격", fortune: "평" },
  73: { name: "평길격", fortune: "평" },
  74: { name: "우매격", fortune: "흉" },
  75: { name: "정수격", fortune: "평" },
  76: { name: "이산격", fortune: "흉" },
  77: { name: "전후격", fortune: "평" },
  78: { name: "선길격", fortune: "평" },
  79: { name: "종극격", fortune: "흉" },
  80: { name: "종결격", fortune: "흉" },
  81: { name: "환원격", fortune: "길" },
};

// 81을 넘는 수는 81로 나눈 나머지로 환원 (전통 방식)
// 예: 85획 → 85-80=5 → 5수리. 0이면 81로 처리.
export function normalizeSuri(num: number): number {
  if (num <= 81) return num;
  const r = num % 80;
  return r === 0 ? 81 : r;
}

// 수리값을 받아 길흉 정보 반환
export function getSuriInfo(num: number): SuriInfo {
  const n = normalizeSuri(num);
  return SURI_81[n] ?? { name: "미정", fortune: "평" };
}
