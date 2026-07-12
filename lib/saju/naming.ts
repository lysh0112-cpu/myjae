// lib/saju/naming.ts
// 작명 진단 엔진 — "내 이름 풀이"
// 이미 계산된 사주/용신을 받아, 이름 한자들을 4요소로 채점한다.
//   4요소: ① 용신 보완  ② 자원오행 흐름  ③ 발음오행 흐름  ④ 81수리
// 81수리표(suri81.ts)와 용신엔진(yongsin.ts)을 그대로 활용.
//
// 검증: 류승현(柳承炫) 사례에서 작명왕·작명가 실제 화면값과 일치 확인 완료.

import { getSuriInfo, type SuriFortune } from "./suri81";

// ── 발음오행 기준 (초성) ──
// 명연재 표준: ㅇㅎ = 토(土). 작명가는 ㅇㅎ=수(水) 학파 — 연재 선생님 검수 때 최종 확정.
// 바꾸려면 SOUND_OHAENG_SET 한 곳만 수정하면 전체 전환됨.
export const SOUND_OHAENG_MODE: "토" | "수" = "토"; // ㅇㅎ을 무엇으로 볼지

// 용신 보완 판정 모드.
//   "관대" = 희신도 보충으로 인정(명연재 기본, 희망적 어조)
//   "엄격" = 용신만 인정(작명가와 동일하게 깐깐하게)
// 연재 선생님 검수 때 최종 확정.
export const YONGSIN_MODE: "관대" | "엄격" = "관대";

function soundOhaengTable(mode: "토" | "수"): Record<string, string> {
  const oh = mode; // ㅇㅎ 공통
  return {
    ㄱ: "목", ㅋ: "목", ㄲ: "목",
    ㄴ: "화", ㄷ: "화", ㄹ: "화", ㅌ: "화", ㄸ: "화",
    ㅅ: "금", ㅈ: "금", ㅊ: "금", ㅆ: "금", ㅉ: "금",
    ㅁ: "수", ㅂ: "수", ㅍ: "수", ㅃ: "수",
    ㅇ: oh, ㅎ: oh,
  };
}

const CHOSEONG = [
  "ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ",
  "ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ",
];

// 한글 한 글자에서 초성 추출
function getChoseong(han: string): string {
  const code = han.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return "";
  return CHOSEONG[Math.floor(code / 588)];
}

// 한글 음절의 발음오행
export function soundOhaengOf(han: string, mode: "토" | "수" = SOUND_OHAENG_MODE): string {
  const cho = getChoseong(han);
  return soundOhaengTable(mode)[cho] ?? "";
}

// ── 입력 타입 ──
// 사용자가 고른 이름 글자 (한글음 + 한자 + 한자정보)
export interface NameChar {
  hangul: string;        // 한글 음 (예: "승")
  hanja: string;         // 한자 (예: "承")
  strokes: number;       // 원획수 (강희자전)
  resourceOhaeng: string; // 자원오행 (목/화/토/금/수)
}

export interface DiagnoseInput {
  surname: NameChar;     // 성씨
  given: NameChar[];     // 이름 글자들 (보통 2자, 외자면 1자)
  yongsin: string;       // 용신 오행 (calcYongsin 결과)
  heeksin?: string;      // 희신 (있으면 보조 용신으로 인정)
  elementScore: Record<string, number>; // 사주 오행 점수 (calcYongsin의 score)
}

// ── 채점 결과 타입 ──
// grade는 내부용(종합 판정·정렬). 고객 화면은 판정이 아니라 "관점별 팩트+서술"로 노출.
export type Grade = "좋음" | "보통" | "아쉬움";

export interface FactorResult {
  grade: Grade;
  detail: string;
  facts?: Record<string, unknown>; // AI 서술용 근거 데이터 (판정 아님)
}

// 획수 음양 (순양/순음/조화)
export type YinYangState = "순양" | "순음" | "조화";
export interface YinYangResult {
  state: YinYangState;
  strokes: number[];            // 각 글자 획수
  marks: ("양" | "음")[];       // 홀=양, 짝=음
}

export interface DiagnoseResult {
  yinyang: YinYangResult;        // ① 음양오행 (획수 음양) — 참고 표시, 점수 미반영
  soundFlow: FactorResult;       // ② 발음오행
  suri: {                        // ③ 81수리 (사격)
    grade: Grade;
    gyeok: { label: string; sum: number; name: string; symbol: string; fortune: SuriFortune; desc: string }[];
  };
  resourceFlow: FactorResult;    // ④ 자원오행
  yongsinBohwan: FactorResult;   // ⑤ 사주 보완 (용신)
  overallGrade: Grade;           // 종합 (내부용)
  weakElement: string;           // 채워야 할 오행 (용신)
}

// ── 오행 상생/상극 ──
const GENERATES: Record<string, string> = { 목:"화", 화:"토", 토:"금", 금:"수", 수:"목" };

function isSaeng(a: string, b: string): boolean {
  return GENERATES[a] === b || GENERATES[b] === a;
}

// ── ① 음양오행: 획수의 홀짝(양/음) 균형 ──
//   원전(작명 개명 실전서 86~87쪽): 순양(모두 홀수)·순음(모두 짝수)은 치우침,
//   섞이면 조화. 점수엔 반영하지 않고 참고로만 표시(감점 없음).
function scoreYinYang(input: DiagnoseInput): YinYangResult {
  const strokes = [input.surname.strokes, ...input.given.map((g) => g.strokes)];
  const marks = strokes.map((s) => (s % 2 === 1 ? "양" : "음") as "양" | "음");
  const allYang = marks.every((m) => m === "양");
  const allEum = marks.every((m) => m === "음");
  const state: YinYangState = allYang ? "순양" : allEum ? "순음" : "조화";
  return { state, strokes, marks };
}

// ── ① 용신 보완: 이름 자원오행이 용신(또는 희신)을 포함하는가 ──
function scoreYongsin(input: DiagnoseInput, mode: "관대" | "엄격"): FactorResult {
  const nameOhaengs = input.given.map((g) => g.resourceOhaeng);
  const hasYongsin = nameOhaengs.includes(input.yongsin);
  const hasHeeksin = input.heeksin ? nameOhaengs.includes(input.heeksin) : false;

  if (hasYongsin) {
    return { grade: "좋음", detail: `용신 ${input.yongsin}을(를) 이름이 채워줍니다.` };
  }
  if (mode === "관대" && hasHeeksin) {
    return { grade: "보통", detail: `희신 ${input.heeksin}은(는) 채우나, 용신 ${input.yongsin}은 더 채우면 좋습니다.` };
  }
  return { grade: "아쉬움", detail: `사주에 필요한 ${input.yongsin}을(를) 이름이 보완하지 못합니다.` };
}

// ── ④ 자원오행 흐름: 이름 글자들의 자원오행이 상생으로 흐르는가 ──
function scoreResource(input: DiagnoseInput): FactorResult {
  const chars = [input.surname, ...input.given];
  const seq = chars.map((c) => c.resourceOhaeng);
  // 이웃 쌍별 관계 (서술용)
  const links: { from: string; to: string; saeng: boolean }[] = [];
  let saeng = 0, total = 0;
  for (let i = 0; i < seq.length - 1; i++) {
    total++;
    const ok = isSaeng(seq[i], seq[i + 1]);
    if (ok) saeng++;
    links.push({ from: seq[i], to: seq[i + 1], saeng: ok });
  }
  const facts = {
    glyphs: chars.map((c) => ({ hanja: c.hanja, hangul: c.hangul, ohaeng: c.resourceOhaeng })),
    flow: seq,
    links,
  };
  if (total === 0) return { grade: "보통", detail: "자원오행 흐름을 평가할 글자가 부족합니다.", facts };
  const ratio = saeng / total;
  if (ratio >= 0.5) return { grade: "좋음", detail: "이름 한자들의 기운이 서로 살려주는 흐름입니다.", facts };
  if (ratio > 0) return { grade: "보통", detail: "상생과 상극이 섞여 있습니다.", facts };
  return { grade: "아쉬움", detail: "이름 한자들의 기운이 서로 부딪칩니다.", facts };
}

// ── ② 발음오행 흐름 ──
function scoreSound(input: DiagnoseInput, mode: "토" | "수"): FactorResult {
  const hanguls = [input.surname.hangul, ...input.given.map((g) => g.hangul)];
  const seq = hanguls.map((h) => soundOhaengOf(h, mode));
  const links: { from: string; to: string; saeng: boolean }[] = [];
  let saeng = 0, total = 0;
  for (let i = 0; i < seq.length - 1; i++) {
    total++;
    const ok = isSaeng(seq[i], seq[i + 1]);
    if (ok) saeng++;
    links.push({ from: seq[i], to: seq[i + 1], saeng: ok });
  }
  const facts = {
    syllables: hanguls.map((h, i) => ({ hangul: h, cho: getChoseong(h), ohaeng: seq[i] })),
    flow: seq,
    links,
  };
  if (total === 0) return { grade: "보통", detail: "발음오행 흐름을 평가할 수 없습니다.", facts };
  const ratio = saeng / total;
  if (ratio >= 0.5) return { grade: "좋음", detail: "부르는 소리의 기운이 부드럽게 흐릅니다.", facts };
  if (ratio > 0) return { grade: "보통", detail: "소리의 기운이 일부만 어울립니다.", facts };
  return { grade: "아쉬움", detail: "소리의 기운이 서로 부딪칩니다.", facts };
}

// ── ④ 81수리 (작명가식 사격: 두 글자 짝 + 전체합, 태극수 없음) ──
function scoreSuri(input: DiagnoseInput): DiagnoseResult["suri"] {
  const sur = input.surname.strokes;
  const g = input.given.map((x) => x.strokes);
  const gyeok: { label: string; sum: number; name: string; symbol: string; fortune: SuriFortune; desc: string }[] = [];

  // 이름 2자 기준 (외자/3자는 화면단에서 분기)
  if (g.length === 2) {
    const pairs: [string, number][] = [
      ["초년운", g[0] + g[1]],
      ["청년운", sur + g[0]],
      ["중년운", sur + g[1]],
      ["말년운", sur + g[0] + g[1]],
    ];
    for (const [label, sum] of pairs) {
      const info = getSuriInfo(sum);
      gyeok.push({ label, sum, name: info.name, symbol: info.symbol, fortune: info.fortune, desc: info.desc });
    }
  } else if (g.length === 1) {
    const pairs: [string, number][] = [
      ["전반운", sur + g[0]],
      ["전체운", sur + g[0]], // 외자는 격이 적음
    ];
    for (const [label, sum] of pairs) {
      const info = getSuriInfo(sum);
      gyeok.push({ label, sum, name: info.name, symbol: info.symbol, fortune: info.fortune, desc: info.desc });
    }
  }

  const heung = gyeok.filter((x) => x.fortune === "흉").length;
  const gil = gyeok.filter((x) => x.fortune === "길").length;
  let grade: Grade = "보통";
  if (heung === 0 && gil >= gyeok.length - 1) grade = "좋음";
  else if (heung >= 2) grade = "아쉬움";
  return { grade, gyeok };
}

// 등급을 점수로 (종합 판정용)
function gradeToNum(g: Grade): number {
  return g === "좋음" ? 2 : g === "보통" ? 1 : 0;
}

// ── 종합 진단 ──
export function diagnoseName(
  input: DiagnoseInput,
  mode: "토" | "수" = SOUND_OHAENG_MODE,
  yongsinMode: "관대" | "엄격" = YONGSIN_MODE
): DiagnoseResult {
  const yinyang = scoreYinYang(input);          // ① 음양 (참고만, 점수 미반영)
  const soundFlow = scoreSound(input, mode);    // ② 발음
  const suri = scoreSuri(input);                // ③ 수리
  const resourceFlow = scoreResource(input);    // ④ 자원
  const yongsinBohwan = scoreYongsin(input, yongsinMode); // ⑤ 용신

  // 종합 점수(내부용): 음양은 제외. 용신×3, 자원×2, 수리×1.5, 발음×1
  //   (원전에 음양 감점 기준이 없어 점수에 넣지 않음 — 어제 확정 원칙)
  const weighted =
    gradeToNum(yongsinBohwan.grade) * 3 +
    gradeToNum(resourceFlow.grade) * 2 +
    gradeToNum(suri.grade) * 1.5 +
    gradeToNum(soundFlow.grade) * 1;
  const maxWeighted = 2 * (3 + 2 + 1.5 + 1); // 15
  const ratio = weighted / maxWeighted;

  let overallGrade: Grade = "보통";
  if (ratio >= 0.7) overallGrade = "좋음";
  else if (ratio < 0.4) overallGrade = "아쉬움";

  return {
    yinyang,
    soundFlow,
    suri,
    resourceFlow,
    yongsinBohwan,
    overallGrade,
    weakElement: input.yongsin,
  };
}
