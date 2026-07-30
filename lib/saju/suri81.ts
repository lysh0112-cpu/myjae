// lib/saju/suri81.ts
// 81수리 길흉표
//
// ★2026-07-31 — 정본을 교재로 바꿨습니다 (대표님 지시)
//
//   원본(정본)   『타고난 운명을 보완하는 작명개운법』 5장
//                 152쪽 「한 장으로 정리한 81수리 길흉표」
//                 153~154쪽 「81수리 격·운 표」
//                 155~170쪽 「81수리 길흉 해설표」   ← 해설 전문은 아직 안 옮겼습니다
//
//   부본(참고)   작명왕·작명가 앱 화면 대조본  →  SURI_81_APP
//                 2026-07-31 이전 정본입니다. 대조용으로 남겨 둡니다.
//
// ⚠️ 두 표는 길흉이 14칸, 격 이름이 53칸 다릅니다. diffSuriSources() 로 볼 수 있습니다.
//
// ⚠️ 교재에는 «평(반길반흉)» 이 없습니다. 81수 전부가 길 아니면 흉입니다.
//    부본에 있던 평 14칸이 교재에서 길 5 · 흉 9 로 갈립니다.

/** 교재의 길흉. «평» 은 교재에 없습니다. 미정 = 표 밖의 수(0 이하 등) — 판정 불가 */
export type SuriFortune = "길" | "흉" | "미정";

export interface SuriInfo {
  /** 격(格) 이름 — 예: 용진격 */
  name: string;
  /** 운(運) 이름 — 예: 건창운. 교재는 «격, 운» 두 낱말로 적습니다 */
  un: string;
  fortune: SuriFortune;
}

// ─────────────────────────────────────────────────────────
//  원본 — 교재 153~154쪽
// ─────────────────────────────────────────────────────────
export const SURI_81: Record<number, SuriInfo> = {
  1:  { name: "태초격", un: "두령운", fortune: "길" },
  2:  { name: "분산격", un: "고독운", fortune: "흉" },
  3:  { name: "명예격", un: "복록운", fortune: "길" },
  4:  { name: "박약격", un: "파괴운", fortune: "흉" },
  5:  { name: "성공격", un: "명재운", fortune: "길" },
  6:  { name: "축재격", un: "후덕운", fortune: "길" },
  7:  { name: "강성격", un: "발전운", fortune: "길" },
  8:  { name: "발달격", un: "전진운", fortune: "길" },
  9:  { name: "종국격", un: "불행운", fortune: "흉" },
  10: { name: "공허격", un: "단명운", fortune: "흉" },
  11: { name: "갱신격", un: "재건운", fortune: "길" },
  12: { name: "유약격", un: "고수운", fortune: "흉" },
  13: { name: "총명격", un: "지달운", fortune: "길" },
  14: { name: "이산격", un: "파괴운", fortune: "흉" },
  15: { name: "통솔격", un: "행복운", fortune: "길" },
  16: { name: "덕망격", un: "유재운", fortune: "길" },
  17: { name: "용진격", un: "건창운", fortune: "길" },
  18: { name: "발전격", un: "융창운", fortune: "길" },
  19: { name: "성패격", un: "병약운", fortune: "흉" },
  20: { name: "공허격", un: "허망운", fortune: "흉" },
  21: { name: "자립격", un: "두령운", fortune: "길" },
  22: { name: "중절격", un: "박약운", fortune: "흉" },
  23: { name: "혁신격", un: "왕성운", fortune: "길" },
  24: { name: "출세격", un: "축재운", fortune: "길" },
  25: { name: "안강격", un: "재록운", fortune: "길" },
  26: { name: "만달격", un: "평파운", fortune: "흉" },
  27: { name: "대인격", un: "중절운", fortune: "흉" },
  28: { name: "풍파격", un: "파란운", fortune: "흉" },
  29: { name: "성공격", un: "대복운", fortune: "길" },
  30: { name: "불측격", un: "불안운", fortune: "흉" },
  31: { name: "흥성격", un: "영화운", fortune: "길" },
  32: { name: "순풍격", un: "왕성운", fortune: "길" },
  33: { name: "등용격", un: "융성운", fortune: "길" },
  34: { name: "파멸격", un: "파멸운", fortune: "흉" },
  35: { name: "태평격", un: "안강운", fortune: "길" },
  36: { name: "조난격", un: "파란운", fortune: "흉" },
  37: { name: "정치격", un: "출세운", fortune: "길" },
  38: { name: "문예격", un: "학사운", fortune: "길" },
  39: { name: "장성격", un: "지휘운", fortune: "길" },
  40: { name: "변화격", un: "파란운", fortune: "흉" },
  41: { name: "고명격", un: "제중운", fortune: "길" },
  42: { name: "신고격", un: "수난운", fortune: "흉" },
  43: { name: "성쇠격", un: "산재운", fortune: "흉" },
  44: { name: "파멸격", un: "파멸운", fortune: "흉" },
  45: { name: "대각격", un: "현달운", fortune: "길" },
  46: { name: "미달격", un: "비수운", fortune: "흉" },
  47: { name: "출세격", un: "발전운", fortune: "길" },
  48: { name: "제중격", un: "영달운", fortune: "길" },
  49: { name: "변화격", un: "성패운", fortune: "흉" },
  50: { name: "상반격", un: "불행운", fortune: "흉" },
  51: { name: "길흉격", un: "성패운", fortune: "흉" },
  52: { name: "능통격", un: "전진운", fortune: "길" },
  53: { name: "불화격", un: "불화운", fortune: "흉" },
  54: { name: "무공격", un: "패가운", fortune: "흉" },
  55: { name: "부족격", un: "불안운", fortune: "흉" },
  56: { name: "한탄격", un: "패망운", fortune: "흉" },
  57: { name: "노력격", un: "강성운", fortune: "길" },
  58: { name: "선곤격", un: "후복운", fortune: "길" },
  59: { name: "불우격", un: "불성운", fortune: "흉" },
  60: { name: "동요격", un: "재난운", fortune: "흉" },
  61: { name: "영화격", un: "개화운", fortune: "길" },
  62: { name: "낙화격", un: "고독운", fortune: "흉" },
  63: { name: "순성격", un: "발전운", fortune: "길" },
  64: { name: "침체격", un: "쇠멸운", fortune: "흉" },
  65: { name: "달성격", un: "길상운", fortune: "길" },
  66: { name: "쇠망격", un: "배신운", fortune: "흉" },
  67: { name: "천복격", un: "영달운", fortune: "길" },
  68: { name: "발달격", un: "발명운", fortune: "길" },
  69: { name: "불안격", un: "정지운", fortune: "흉" },
  70: { name: "공허격", un: "어둠운", fortune: "흉" },
  71: { name: "만달격", un: "발전운", fortune: "길" },
  72: { name: "불길격", un: "후곤운", fortune: "흉" },
  73: { name: "평길격", un: "평복운", fortune: "길" },
  74: { name: "우매격", un: "불우운", fortune: "흉" },
  75: { name: "적시격", un: "평화운", fortune: "길" },
  76: { name: "선곤격", un: "후성운", fortune: "흉" },
  77: { name: "전후격", un: "길흉운", fortune: "길" },
  78: { name: "선길격", un: "평복운", fortune: "흉" },
  79: { name: "종극격", un: "종말운", fortune: "흉" },
  80: { name: "종결격", un: "은둔운", fortune: "흉" },
  81: { name: "환원격", un: "갱생운", fortune: "길" },
};

// ─────────────────────────────────────────────────────────
//  부본 — 작명왕·작명가 앱 화면 대조본 (2026-07-31 이전 정본)
//  ★판정에 쓰지 않습니다. 대조·이력 보존용입니다.
// ─────────────────────────────────────────────────────────
export const SURI_81_APP: Record<number, { name: string; fortune: "길" | "평" | "흉" }> = {
  1:  { name: "태초격", fortune: "길" },  2:  { name: "분리격", fortune: "흉" },
  3:  { name: "명예격", fortune: "길" },  4:  { name: "부정격", fortune: "흉" },
  5:  { name: "성공격", fortune: "길" },  6:  { name: "풍부격", fortune: "길" },
  7:  { name: "독립격", fortune: "길" },  8:  { name: "개물격", fortune: "길" },
  9:  { name: "궁박격", fortune: "흉" },  10: { name: "공허격", fortune: "흉" },
  11: { name: "신성격", fortune: "길" },  12: { name: "박약격", fortune: "흉" },
  13: { name: "지모격", fortune: "길" },  14: { name: "이산격", fortune: "흉" },
  15: { name: "통솔격", fortune: "길" },  16: { name: "덕망격", fortune: "길" },
  17: { name: "건창격", fortune: "길" },  18: { name: "발전격", fortune: "길" },
  19: { name: "고난격", fortune: "흉" },  20: { name: "허망격", fortune: "흉" },
  21: { name: "두령격", fortune: "길" },  22: { name: "중절격", fortune: "흉" },
  23: { name: "공명격", fortune: "길" },  24: { name: "입신격", fortune: "길" },
  25: { name: "안강격", fortune: "길" },  26: { name: "시비격", fortune: "흉" },
  27: { name: "중단격", fortune: "평" },  28: { name: "파란격", fortune: "흉" },
  29: { name: "성공격", fortune: "길" },  30: { name: "부몽격", fortune: "평" },
  31: { name: "흥성격", fortune: "길" },  32: { name: "요행격", fortune: "길" },
  33: { name: "승천격", fortune: "길" },  34: { name: "파멸격", fortune: "흉" },
  35: { name: "평범격", fortune: "길" },  36: { name: "의협격", fortune: "흉" },
  37: { name: "인덕격", fortune: "길" },  38: { name: "문예격", fortune: "평" },
  39: { name: "안락격", fortune: "길" },  40: { name: "무상격", fortune: "흉" },
  41: { name: "대공격", fortune: "길" },  42: { name: "고행격", fortune: "흉" },
  43: { name: "성쇠격", fortune: "흉" },  44: { name: "마장격", fortune: "흉" },
  45: { name: "대지격", fortune: "길" },  46: { name: "부지격", fortune: "흉" },
  47: { name: "출세격", fortune: "길" },  48: { name: "제사격", fortune: "길" },
  49: { name: "은퇴격", fortune: "평" },  50: { name: "부몽격", fortune: "평" },
  51: { name: "춘추격", fortune: "평" },  52: { name: "승룡격", fortune: "길" },
  53: { name: "내허격", fortune: "흉" },  54: { name: "절망격", fortune: "흉" },
  55: { name: "미달격", fortune: "평" },  56: { name: "부족격", fortune: "흉" },
  57: { name: "노력격", fortune: "길" },  58: { name: "후영격", fortune: "평" },
  59: { name: "실의격", fortune: "흉" },  60: { name: "동요격", fortune: "흉" },
  61: { name: "명리격", fortune: "길" },  62: { name: "화락격", fortune: "흉" },
  63: { name: "순성격", fortune: "길" },  64: { name: "침체격", fortune: "흉" },
  65: { name: "휘양격", fortune: "길" },  66: { name: "우매격", fortune: "흉" },
  67: { name: "통달격", fortune: "길" },  68: { name: "흥가격", fortune: "길" },
  69: { name: "종말격", fortune: "흉" },  70: { name: "공허격", fortune: "흉" },
  71: { name: "견실격", fortune: "평" },  72: { name: "상반격", fortune: "평" },
  73: { name: "평길격", fortune: "평" },  74: { name: "우매격", fortune: "흉" },
  75: { name: "정수격", fortune: "평" },  76: { name: "이산격", fortune: "흉" },
  77: { name: "전후격", fortune: "평" },  78: { name: "선길격", fortune: "평" },
  79: { name: "종극격", fortune: "흉" },  80: { name: "종결격", fortune: "흉" },
  81: { name: "환원격", fortune: "길" },
};

/**
 * 원본(교재)과 부본(앱)이 어긋나는 자리를 냅니다.
 * ★검사 그물·상담사 대조용입니다. 판정에는 쓰지 않습니다.
 */
export function diffSuriSources(): {
  fortuneDiff: { num: number; bookName: string; bookFortune: string; appName: string; appFortune: string }[];
  nameDiff: { num: number; bookName: string; appName: string }[];
} {
  const fortuneDiff: { num: number; bookName: string; bookFortune: string; appName: string; appFortune: string }[] = [];
  const nameDiff: { num: number; bookName: string; appName: string }[] = [];
  for (let n = 1; n <= 81; n++) {
    const book = SURI_81[n];
    const app = SURI_81_APP[n];
    if (!book || !app) continue;
    if (book.fortune !== app.fortune) {
      fortuneDiff.push({
        num: n, bookName: book.name, bookFortune: book.fortune,
        appName: app.name, appFortune: app.fortune,
      });
    }
    if (book.name !== app.name) {
      nameDiff.push({ num: n, bookName: book.name, appName: app.name });
    }
  }
  return { fortuneDiff, nameDiff };
}

// ─────────────────────────────────────────────────────────
//  환원 · 조회
// ─────────────────────────────────────────────────────────

/**
 * 81을 넘는 수는 −80 으로 환원합니다 (전통 방식).
 * 예: 85 → 5 · 160 → 81 · 163 → 3
 * ⚠️ 0 이하·NaN 은 표에 없는 수입니다. 0 을 내보내 getSuriInfo 가 «미정» 으로 받습니다.
 */
export function normalizeSuri(num: number): number {
  if (!Number.isFinite(num)) return 0;
  if (num <= 0) return 0;
  if (num <= 81) return num;
  const r = num % 80;
  return r === 0 ? 81 : r;
}

/** 수리값을 받아 격·운·길흉을 냅니다. 표 밖의 수는 «미정» 입니다. */
export function getSuriInfo(num: number): SuriInfo {
  const n = normalizeSuri(num);
  return SURI_81[n] ?? { name: "미정", un: "미정", fortune: "미정" };
}
