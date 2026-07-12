// lib/saju/naming.ts
// 작명 진단 엔진 — "내 이름 풀이" (5관점 겸손 해설판)
// 이미 계산된 사주/용신을 받아, 이름 한자들을 5관점으로 분석한다.
//   5관점: ① 음양오행  ② 발음오행  ③ 수리오행(81수리)  ④ 자원오행  ⑤ 사주보완(용신)
// 삼원오행은 81수리와 겹쳐 제외(대표님 확정).
//
// ★ 방침(대표님 지시):
//   - "좋다/나쁘다" 판정하지 않는다. 화면엔 등급(grade)을 노출하지 않는다.
//   - 각 관점은 AI 통변이 3단(무엇을 보나/이 이름은/어떤 의미인가)으로 겸손하게 서술한다.
//   - 엔진은 "사실(facts)"만 정확히 산출해 AI에 근거로 넘긴다. 문장은 AI가 쓴다.
//   - grade는 내부 종합점수 계산용으로만 유지(하위호환). 화면 표시 금지.
//
// 검증: 류승현(柳承炫) 사례에서 작명왕·작명가 실제 화면값과 일치 확인 완료.

import { getSuriInfo, type SuriFortune } from "./suri81";

// ── 발음오행 기준 (초성) ──
// 명연재 표준: ㅇㅎ = 토(土). 작명가는 ㅇㅎ=수(水) 학파 — 연재 선생님 검수 때 최종 확정.
export const SOUND_OHAENG_MODE: "토" | "수" = "토";

// 용신 보완 판정 모드.
//   "관대" = 희신도 보충으로 인정 / "엄격" = 용신만 인정
export const YONGSIN_MODE: "관대" | "엄격" = "관대";

function soundOhaengTable(mode: "토" | "수"): Record<string, string> {
  const oh = mode;
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

function getChoseong(han: string): string {
  const code = han.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return "";
  return CHOSEONG[Math.floor(code / 588)];
}

export function soundOhaengOf(han: string, mode: "토" | "수" = SOUND_OHAENG_MODE): string {
  const cho = getChoseong(han);
  return soundOhaengTable(mode)[cho] ?? "";
}

// ── 입력 타입 ──
export interface NameChar {
  hangul: string;         // 한글 음 (예: "승")
  hanja: string;          // 한자 (예: "承")
  strokes: number;        // 원획수 (강희자전)
  resourceOhaeng: string; // 자원오행 (목/화/토/금/수)
  meaning?: string;       // 한자 뜻 (예: "이을") — 자원오행 서술용
}

export interface DiagnoseInput {
  surname: NameChar;
  given: NameChar[];
  yongsin: string;
  heeksin?: string;
  elementScore: Record<string, number>;
}

// ── 채점 결과 타입 ──
// grade: 내부 종합점수 계산용(하위호환). 화면 노출 금지.
export type Grade = "좋음" | "보통" | "아쉬움";

// facts: AI 통변이 서술 근거로 쓰는 "사실" 묶음. 관점마다 형태가 다르다.
export interface FactorResult {
  grade: Grade;                 // 내부용(점수 계산) — 화면 미표시
  detail: string;               // 내부 요약(하위호환) — 화면 미표시
  facts: Record<string, unknown>; // AI 통변용 근거 데이터
}

export interface SuriGyeok {
  label: string;    // 초년운/청년운/중년운/말년운
  sum: number;      // 획수 합
  name: string;     // 격 이름 (예: 두령격)
  fortune: SuriFortune; // 길/평/흉 (내부 참고 — 화면엔 격 이름 중심)
}

export interface DiagnoseResult {
  yinYang: FactorResult;         // ① 음양오행
  soundFlow: FactorResult;       // ② 발음오행
  suri: {                        // ③ 수리오행 (81수리 사격)
    grade: Grade;
    gyeok: SuriGyeok[];
    facts: Record<string, unknown>;
  };
  resourceFlow: FactorResult;    // ④ 자원오행
  yongsinBohwan: FactorResult;   // ⑤ 사주보완 (용신)
  overallGrade: Grade;           // 내부 종합(점수) — 화면 미표시
  weakElement: string;           // 채워야 할 오행 (용신)
}

// ── 오행 상생/상극 ──
const GENERATES: Record<string, string> = { 목:"화", 화:"토", 토:"금", 금:"수", 수:"목" };
const CONTROLS: Record<string, string> = { 목:"토", 토:"수", 수:"화", 화:"금", 금:"목" };

// a가 b를 생하는가 (a生b)
function generates(a: string, b: string): boolean { return GENERATES[a] === b; }
// a가 b를 극하는가 (a剋b)
function controls(a: string, b: string): boolean { return CONTROLS[a] === b; }
// 상생 관계(방향 무관)인가
function isSaeng(a: string, b: string): boolean { return GENERATES[a] === b || GENERATES[b] === a; }

// 두 오행의 관계를 라벨로: 생/극/비화(같음)/무관
type RelKind = "생" | "극" | "비화" | "기타";
function relationOf(a: string, b: string): { kind: RelKind; text: string } {
  if (a === b) return { kind: "비화", text: `${a}→${b} 같은 기운(비화)` };
  if (generates(a, b)) return { kind: "생", text: `${a}生${b} 상생(${a}이 ${b}를 낳음)` };
  if (generates(b, a)) return { kind: "생", text: `${b}生${a} 상생(${b}이 ${a}를 낳음)` };
  if (controls(a, b)) return { kind: "극", text: `${a}剋${b} 상극(${a}이 ${b}를 억누름)` };
  if (controls(b, a)) return { kind: "극", text: `${b}剋${a} 상극(${b}이 ${a}를 억누름)` };
  return { kind: "기타", text: `${a}→${b}` };
}

// ── ① 음양오행: 획수 홀짝 → 양/음 배열 ──
// 원전에 감점 기준 없음. 순양(모두 홀)/순음(모두 짝)은 "섞인 배열을 더 조화롭게 보는 견해"만 서술.
function scoreYinYang(input: DiagnoseInput): FactorResult {
  const chars = [input.surname, ...input.given];
  const seq = chars.map((c) => ({
    hanja: c.hanja, strokes: c.strokes,
    yin: c.strokes % 2 === 0,               // 짝=음
    mark: c.strokes % 2 === 0 ? "음" : "양",
  }));
  const yangCount = seq.filter((s) => !s.yin).length;
  const yinCount = seq.filter((s) => s.yin).length;
  const allSame = yangCount === 0 || yinCount === 0; // 순양 또는 순음
  const pattern = seq.map((s) => s.mark).join("-");

  // grade: 내부 점수용(섞이면 좋음, 순양/순음이면 보통) — 화면 미표시
  const grade: Grade = allSame ? "보통" : "좋음";

  return {
    grade,
    detail: `획수 음양 배열: ${pattern}`,
    facts: {
      pattern,                                 // 예: "음-음-양"
      chars: seq,                              // 글자별 획수·음양
      yangCount, yinCount,
      allSame,                                 // 순양/순음이면 true
      note: allSame
        ? "한쪽으로 치우친 배열. 음양이 섞인 배열을 더 조화롭게 보는 견해가 있음(감점 아님)."
        : "음과 양이 섞인 배열.",
    },
  };
}

// ── ② 발음오행 흐름 ──
function scoreSound(input: DiagnoseInput, mode: "토" | "수"): FactorResult {
  const chars = [input.surname, ...input.given];
  const seq = chars.map((c) => ({
    hangul: c.hangul,
    cho: getChoseong(c.hangul),
    ohaeng: soundOhaengOf(c.hangul, mode),
  }));
  const links: { from: string; to: string; rel: RelKind; text: string }[] = [];
  let saeng = 0, total = 0;
  for (let i = 0; i < seq.length - 1; i++) {
    const r = relationOf(seq[i].ohaeng, seq[i + 1].ohaeng);
    links.push({ from: seq[i].ohaeng, to: seq[i + 1].ohaeng, rel: r.kind, text: r.text });
    total++;
    if (isSaeng(seq[i].ohaeng, seq[i + 1].ohaeng)) saeng++;
  }
  const ratio = total ? saeng / total : 0;
  const grade: Grade = ratio >= 0.5 ? "좋음" : ratio > 0 ? "보통" : "아쉬움";

  return {
    grade,
    detail: `발음오행: ${seq.map((s) => s.ohaeng).join("→")}`,
    facts: {
      sequence: seq,                            // 글자별 초성·오행
      chain: seq.map((s) => `${s.hangul}(${s.ohaeng})`).join("→"),
      links,                                    // 이웃 간 상생/상극 관계
      saengCount: saeng, total,
    },
  };
}

// ── ③ 수리오행 (작명가식 사격: 태극수 없음, 원획 기준) ──
function scoreSuri(input: DiagnoseInput): DiagnoseResult["suri"] {
  const sur = input.surname.strokes;
  const g = input.given.map((x) => x.strokes);
  const gyeok: SuriGyeok[] = [];

  if (g.length === 2) {
    const pairs: [string, number][] = [
      ["초년운", g[0] + g[1]],
      ["청년운", sur + g[0]],
      ["중년운", sur + g[1]],
      ["말년운", sur + g[0] + g[1]],
    ];
    for (const [label, sum] of pairs) {
      const info = getSuriInfo(sum);
      gyeok.push({ label, sum, name: info.name, fortune: info.fortune });
    }
  } else if (g.length === 1) {
    const pairs: [string, number][] = [
      ["전반운", sur + g[0]],
      ["전체운", sur + g[0]],
    ];
    for (const [label, sum] of pairs) {
      const info = getSuriInfo(sum);
      gyeok.push({ label, sum, name: info.name, fortune: info.fortune });
    }
  }

  const heung = gyeok.filter((x) => x.fortune === "흉").length;
  const gil = gyeok.filter((x) => x.fortune === "길").length;
  let grade: Grade = "보통";
  if (heung === 0 && gil >= gyeok.length - 1) grade = "좋음";
  else if (heung >= 2) grade = "아쉬움";

  return {
    grade,
    gyeok,
    facts: {
      gyeok,                                    // 4격 전체 (라벨/합/격이름/길흉)
      heungCount: heung, gilCount: gil,
    },
  };
}

// ── ④ 자원오행 흐름 ──
function scoreResource(input: DiagnoseInput): FactorResult {
  const chars = [input.surname, ...input.given];
  const seq = chars.map((c) => ({
    hanja: c.hanja,
    meaning: c.meaning ?? "",
    ohaeng: c.resourceOhaeng,
  }));
  const links: { from: string; to: string; rel: RelKind; text: string }[] = [];
  let saeng = 0, total = 0;
  for (let i = 0; i < seq.length - 1; i++) {
    const r = relationOf(seq[i].ohaeng, seq[i + 1].ohaeng);
    links.push({ from: seq[i].ohaeng, to: seq[i + 1].ohaeng, rel: r.kind, text: r.text });
    total++;
    if (isSaeng(seq[i].ohaeng, seq[i + 1].ohaeng)) saeng++;
  }
  const ratio = total ? saeng / total : 0;
  const grade: Grade = ratio >= 0.5 ? "좋음" : ratio > 0 ? "보통" : "아쉬움";

  return {
    grade,
    detail: `자원오행: ${seq.map((s) => s.ohaeng).join("→")}`,
    facts: {
      sequence: seq,                            // 글자별 한자·뜻·오행
      chain: seq.map((s) => `${s.hanja}(${s.ohaeng})`).join("→"),
      links,
      saengCount: saeng, total,
    },
  };
}

// ── ⑤ 사주보완: 이름 자원오행이 용신(또는 희신)을 포함하는가 ──
function scoreYongsin(input: DiagnoseInput, mode: "관대" | "엄격"): FactorResult {
  const nameOhaengs = input.given.map((g) => g.resourceOhaeng);
  const surnameOhaeng = input.surname.resourceOhaeng;
  const hasYongsin = nameOhaengs.includes(input.yongsin);
  const hasHeeksin = input.heeksin ? nameOhaengs.includes(input.heeksin) : false;
  // 용신을 담은 글자들 (서술용)
  const yongsinChars = [input.surname, ...input.given]
    .filter((c) => c.resourceOhaeng === input.yongsin)
    .map((c) => ({ hanja: c.hanja, hangul: c.hangul }));

  let grade: Grade;
  if (hasYongsin) grade = "좋음";
  else if (mode === "관대" && hasHeeksin) grade = "보통";
  else grade = "아쉬움";

  return {
    grade,
    detail: `용신 ${input.yongsin} / 이름 자원오행 [${nameOhaengs.join(",")}]`,
    facts: {
      yongsin: input.yongsin,
      heeksin: input.heeksin ?? null,
      nameOhaengs,                              // 이름 글자 자원오행들
      surnameOhaeng,
      hasYongsin, hasHeeksin,
      yongsinChars,                             // 용신을 담은 글자
      elementScore: input.elementScore,         // 사주 오행 분포 (계절/한난 서술용)
    },
  };
}

function gradeToNum(g: Grade): number {
  return g === "좋음" ? 2 : g === "보통" ? 1 : 0;
}

// ── 종합 진단 ──
export function diagnoseName(
  input: DiagnoseInput,
  mode: "토" | "수" = SOUND_OHAENG_MODE,
  yongsinMode: "관대" | "엄격" = YONGSIN_MODE
): DiagnoseResult {
  const yinYang = scoreYinYang(input);
  const soundFlow = scoreSound(input, mode);
  const suri = scoreSuri(input);
  const resourceFlow = scoreResource(input);
  const yongsinBohwan = scoreYongsin(input, yongsinMode);

  // 종합점수(내부용): 음양 제외 4요소 가중 (용신×3, 자원×2, 수리×1.5, 발음×1, 만점15)
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
    yinYang,
    soundFlow,
    suri,
    resourceFlow,
    yongsinBohwan,
    overallGrade,
    weakElement: input.yongsin,
  };
}
