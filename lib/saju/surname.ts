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
// ★2026-07-31 4차 — 교재 밖 복성도 넣었습니다 (대표님 확정)
//    실사용자의 예외 성씨를 막는 것이 이점이라는 판단입니다.
//    source 로 출처를 갈라 두었으니 나중에 되짚을 수 있습니다.
//
// ★2026-07-31 6차 — 두 자리를 대표님이 원본으로 확인해 주셨습니다.
//    · 25획 성 = 명림(明臨)   ← 明8 + 臨17 = 25. 획수가 맞아떨어집니다
//    · 13획 성 = 영고(令孤)   ← 교재에 「영호(令狐)」는 없습니다. 영고로 확정
//
//    ⚠️ 제가 스캔에서 「남입(南臨)」으로 흐리게 읽던 자리입니다.
//       臨 은 맞았고 앞 글자를 南 으로 잘못 봤습니다. 대표님 판독으로 明 확정.
//       한글 읽기가 명림/명임으로 갈릴 수 있어 altHangul 로 둘 다 받습니다.
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-09 — 대표님 지시로 «성씨 자료를 엑셀에 맞췄습니다»
//    근거 : ___통합_인명용한자_성씨.xlsx (복성 23)
//
//    ① 「어금 魚金 · 순우 淳于 · 즙수 汁水 · 부여 扶餘 는 성씨 자료에서 삭제」
//       ⇒ 교재 밖 복성이 ★7 → 3 (강전·망절·소봉) · 합계 ★27 → 23 이 되었습니다.
//       ⛔⛔ 되살리지 마십시오. 다음 세션이 「빠졌네」 하고 넣기 쉬운 자리입니다.
//          ⚠️ lib/saju/surnameHanja.ts 의 「어금」도 함께 걷었습니다.
//       ⚠️ 이제 「부여○○」는 복성으로 «안» 갈립니다 — 단성 「부」 로 봅니다.
//
//    ② 「명림 => 명임 으로」  ⇒ hangul 을 명임 으로 두고 altHangul 을 걷었습니다.
//
//    ③ 「이선은 以先이 맞다」  ⇒ ★이 파일이 맞았습니다. 그대로 두었습니다.
//       ⚠️ 엑셀 쪽이 以仙 으로 되어 있습니다 — ★엑셀을 고치셔야 합니다.
//
//    ⚠️ 이제 이 표(23)와 엑셀 복성(23)이 «수와 내용이 같습니다» — 以仙 한 곳만 빼고.
// ══════════════════════════════════════════════════════════════════

export interface CompoundSurname {
  /** 한글 두 글자 — 예: "남궁" */
  hangul: string;
  /** 한자 두 글자 — 예: "南宮" */
  hanja: string;
  /** 교재가 적어 둔 성 획수(원획법) — ★참고용. 실제 계산은 DB 획수를 씁니다 */
  bookStrokes: number | null;
  /** book = 교재 139~150쪽 · extra = 교재 밖 (2026-07-31 대표님 확정) */
  source: "book" | "extra";
  /** 한글 읽기가 갈리는 성씨의 다른 표기 — 예: 명림 ↔ 명임 */
  altHangul?: string[];
  /** ★표기가 갈리거나 확인이 필요한 자리 */
  note?: string;
}

/** 교재 139~150쪽에서 뽑은 두 글자 성씨 */
export const COMPOUND_SURNAMES: CompoundSurname[] = [
  // ── 교재 139~150쪽에서 뽑은 것 (19)
  { hangul: "을지", hanja: "乙支", bookStrokes: 5,  source: "book" },
  { hangul: "대실", hanja: "大室", bookStrokes: 12, source: "book" },
  { hangul: "동방", hanja: "東方", bookStrokes: 12, source: "book" },
  { hangul: "소실", hanja: "小室", bookStrokes: 12, source: "book" },
  { hangul: "이선", hanja: "以先", bookStrokes: 12, source: "book" },
  { hangul: "영고", hanja: "令孤", bookStrokes: 13, source: "book" },
  { hangul: "사공", hanja: "司空", bookStrokes: 13, source: "book" },
  { hangul: "공손", hanja: "公孫", bookStrokes: 14, source: "book" },
  { hangul: "서문", hanja: "西門", bookStrokes: 14, source: "book" },
  { hangul: "사마", hanja: "司馬", bookStrokes: 15, source: "book" },
  { hangul: "장곡", hanja: "長谷", bookStrokes: 15, source: "book" },
  { hangul: "중실", hanja: "仲室", bookStrokes: 15, source: "book" },
  { hangul: "황보", hanja: "皇甫", bookStrokes: 16, source: "book" },
  { hangul: "남궁", hanja: "南宮", bookStrokes: 19, source: "book" },
  { hangul: "재회", hanja: "再會", bookStrokes: 19, source: "book" },
  { hangul: "선우", hanja: "鮮于", bookStrokes: 20, source: "book" },
  { hangul: "부정", hanja: "負鼎", bookStrokes: 22, source: "book" },
  { hangul: "독고", hanja: "獨孤", bookStrokes: 25, source: "book" },
  // ★2026-08-09 대표님 지시 「명림 => 명임 으로」 — 표기를 «명임» 으로 확정했습니다.
  //   ⚠️ altHangul(「명림」)을 «걷었습니다». 이제 「명림」으로 적으면 복성으로 «안» 갈립니다.
  //      ⛔ 되살리지 마십시오. 대표님이 표기를 하나로 정하신 자리입니다.
  { hangul: "명임", hanja: "明臨", bookStrokes: 25, source: "book",
    note: "明8 + 臨17 = 25획 — 교재 25획 성과 맞습니다 · 표기는 명임 (2026-08-09 확정)" },
  { hangul: "제갈", hanja: "諸葛", bookStrokes: 31, source: "book" },

  // ── 교재 밖 — 실제 쓰이는 복성 (★3)
  //    ★bookStrokes 를 비웠습니다. 획수는 DB 원획을 씁니다.
  { hangul: "강전", hanja: "岡田", bookStrokes: null, source: "extra" },
  { hangul: "망절", hanja: "網切", bookStrokes: null, source: "extra" },
  { hangul: "소봉", hanja: "小峰", bookStrokes: null, source: "extra" },
];

const BY_HANGUL = new Map<string, CompoundSurname>();
for (const c of COMPOUND_SURNAMES) {
  BY_HANGUL.set(c.hangul, c);
  for (const alt of c.altHangul ?? []) BY_HANGUL.set(alt, c);   // 명림 ↔ 명임
}
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
 * ★2026-08-01 (43부) — «한글 글자열» 에서 성씨만 떼어 냅니다.
 *
 * [왜 필요한가]  신생아 작명은 chars 가 «없습니다». 손님이 성씨를 «글자로» 적고,
 *   보관함은 「류 첫째」 같은 호칭을 통째로 실어 보냅니다.
 *   그때 앞 두 글자를 무턱대고 자르면 「김철수」가 「김철」이 됩니다.
 *
 * ⚠️ 복성 판단은 위 BY_HANGUL 한 곳만 봅니다 — 목록을 새로 만들지 마십시오.
 *
 *   "류"        → "류"
 *   "류 첫째"   → "류"      (첫 낱말만 봅니다)
 *   "남궁"      → "남궁"    (복성)
 *   "김철수"    → "김"      (복성이 아니니 한 글자)
 */
export function surnameOfHangul(text: string): string {
  const first = (text ?? "").trim().split(/\s+/)[0] ?? "";
  const ch = [...first];
  if (ch.length >= 2) {
    const two = ch[0] + ch[1];
    if (BY_HANGUL.has(two)) return two;
  }
  return ch[0] ?? "";
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
