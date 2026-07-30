// lib/saju/surname.ts
//
// 복성(複姓 · 두 글자 성씨) 목록 · 성과 이름을 가르는 단일 창구
//
// ★2026-07-31 3차 신설
//
// 그동안 각 화면이 `surname = chars[0]` 으로 첫 글자만 성으로 잡았습니다.
// 그래서 남궁민수 → 성 「남」 + 이름 「궁민수」 가 되어
// 성 획수도 틀리고 이름이 3글자가 되어 사격이 통째로 어긋났습니다.
//
// 출처   『타고난 운명을 보완하는 작명개운법』 139~150쪽 「성씨 획수별 좋은 수리 배열」
//        위 표의 성씨 목록에서 두 글자 성만 뽑았습니다.
//
// ⚠️ 25획 성 항목 중 한 자리는 스캔이 흐려 판독하지 못했습니다.
//    추정해서 넣지 않았습니다 (교훈 EJ). 확인되면 추가하십시오.
// ⚠️ 교재에 없는 복성(어금·강전·망절·소봉·순우 등)은 넣지 않았습니다.
//    쓰실 것인지 확인이 필요합니다.

export interface CompoundSurname {
  /** 한글 두 글자 — 예: "남궁" */
  hangul: string;
  /** 한자 두 글자 — 예: "南宮" */
  hanja: string;
  /** 교재가 적어 둔 성 획수(원획법) — ★참고용입니다. 실제 계산은 DB 획수를 씁니다 */
  bookStrokes: number;
}

/** 교재 139~150쪽에서 뽑은 두 글자 성씨 */
export const COMPOUND_SURNAMES: CompoundSurname[] = [
  { hangul: "을지", hanja: "乙支", bookStrokes: 5 },
  { hangul: "대실", hanja: "大室", bookStrokes: 12 },
  { hangul: "동방", hanja: "東方", bookStrokes: 12 },
  { hangul: "소실", hanja: "小室", bookStrokes: 12 },
  { hangul: "이선", hanja: "以先", bookStrokes: 12 },
  { hangul: "영고", hanja: "令孤", bookStrokes: 13 },
  { hangul: "사공", hanja: "司空", bookStrokes: 13 },
  { hangul: "공손", hanja: "公孫", bookStrokes: 14 },
  { hangul: "서문", hanja: "西門", bookStrokes: 14 },
  { hangul: "사마", hanja: "司馬", bookStrokes: 15 },
  { hangul: "장곡", hanja: "長谷", bookStrokes: 15 },
  { hangul: "중실", hanja: "仲室", bookStrokes: 15 },
  { hangul: "황보", hanja: "皇甫", bookStrokes: 16 },
  { hangul: "남궁", hanja: "南宮", bookStrokes: 19 },
  { hangul: "재회", hanja: "再會", bookStrokes: 19 },
  { hangul: "선우", hanja: "鮮于", bookStrokes: 20 },
  { hangul: "부정", hanja: "負鼎", bookStrokes: 22 },
  { hangul: "독고", hanja: "獨孤", bookStrokes: 25 },
  { hangul: "제갈", hanja: "諸葛", bookStrokes: 31 },
];

const BY_HANGUL = new Map(COMPOUND_SURNAMES.map((s) => [s.hangul, s]));
const BY_HANJA = new Map(COMPOUND_SURNAMES.map((s) => [s.hanja, s]));

/** 한글 두 글자(또는 한자 두 글자)가 복성인가 */
export function findCompoundSurname(
  a: { hangul?: string; hanja?: string } | null | undefined,
  b: { hangul?: string; hanja?: string } | null | undefined,
): CompoundSurname | null {
  if (!a || !b) return null;
  const hj = `${a.hanja ?? ""}${b.hanja ?? ""}`;
  if (hj.length === 2) {
    const byHanja = BY_HANJA.get(hj);
    if (byHanja) return byHanja;
  }
  const hg = `${a.hangul ?? ""}${b.hangul ?? ""}`;
  return BY_HANGUL.get(hg) ?? null;
}

/**
 * 글자 배열을 «성» 과 «이름» 으로 가릅니다. ★성 분리는 이 함수 하나로만 하십시오.
 *
 * 남궁민수 → surname [남, 궁] · given [민, 수]
 * 류승현   → surname [류]     · given [승, 현]
 *
 * ⚠️ 세 글자짜리 배열이 복성으로 걸리면 이름이 한 글자가 됩니다 (예: 남궁민).
 *    그것이 맞습니다 — 외자 이름입니다.
 */
export function splitSurname<T extends { hangul?: string; hanja?: string }>(
  chars: T[],
): { surname: T[]; given: T[]; compound: CompoundSurname | null } {
  if (chars.length === 0) return { surname: [], given: [], compound: null };
  // ★두 글자만 있으면 복성으로 보지 않습니다 — 이름이 0글자가 되기 때문입니다
  if (chars.length >= 3) {
    const c = findCompoundSurname(chars[0], chars[1]);
    if (c) return { surname: [chars[0], chars[1]], given: chars.slice(2), compound: c };
  }
  return { surname: [chars[0]], given: chars.slice(1), compound: null };
}
