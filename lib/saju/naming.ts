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
// ⚠️⚠️ 옛 주석 — 「검증: 류승현(柳承炫) 사례에서 작명왕·작명가 실제 화면값과 일치 확인 완료」
//
//  ★2026-07-31 (40부) — 이 «검증» 은 «부본» 에 맞춘 것이었습니다.
//    류승현 = 화·금·토.
//      옛 비율식        상생1 + 상극1 → ratio 0.5 → 「좋음」 ★4.5   (작명왕·작명가와 일치)
//      교재 60쪽 火金土  «凶» — 선고후길격                          (정본)
//    → 작명왕·작명가 앱과 교재가 «다릅니다». 우리는 교재를 정본으로 삼기로 했으므로
//      이 사례는 이제 「아쉬움」 ★3.5 입니다.
//
//    ⚠️ 2-1장(81수리표)에서 저장소가 «작명왕 부본» 을 쓰고 있던 것과 «같은 일» 입니다.
//       발음오행에도 부본이 섞여 있었습니다.
//    ⚠️ 앱 화면값과 대조해 「맞다」고 확인하지 마십시오. 교재와 대조하십시오. (교훈 ER)

import { getSuriInfo, type SuriFortune } from "./suri81";
import { getSuriGuide, SURI_TONE_GUIDE } from "./suriGuide";
// ★2026-07-31 (40부) 발음오행 — 교재 125칸 표로 갈아끼웠습니다
import { evaluateSoundOhaeng, type SoundVerdict } from "./soundEngine";
import {
  type SoundBook,
  soundOhaengOf as normSoundOhaengOf,
} from "./sound/normalize";

// ── 발음오행 기준 ──
// ★2026-07-31 (40부) — 교재 3장 대조로 «학설이 확정» 되었습니다.
//   57쪽  자음 배당은 «운해본» — ㅇㅎ = 土 (해례본은 土/水 가 서로 반대)
//         「필자는 운해본을 따르고 있으며 이 책에 수록된 모든 사례는 운해본에 의한 작명이다」
//   ⚠️ 아래 상수의 "토" 가 운해본, "수" 가 해례본입니다. 이름을 바꾸지 않은 것은
//      부르는 쪽(diagnoseName 의 mode 인자)을 깨지 않기 위해서입니다.
export const SOUND_OHAENG_MODE: "토" | "수" = "토";

/** "토"/"수" → 교재의 본 이름. ★새 코드는 SoundBook 을 직접 쓰십시오 */
export function modeToBook(mode: "토" | "수"): SoundBook {
  return mode === "토" ? "운해본" : "해례본";
}

// 용신 보완 판정 모드.
//   "관대" = 희신도 보충으로 인정 / "엄격" = 용신만 인정
export const YONGSIN_MODE: "관대" | "엄격" = "관대";

/**
 * 한 글자의 발음오행.
 * ★2026-07-31 — 표를 이 파일에서 «걷어내고» lib/saju/sound/normalize.ts 로 옮겼습니다.
 *   된소리(ㄲㄸㅃㅆㅉ)가 교재 표에 없다는 것, 두음법칙을 표기음 그대로 쓴다는 것이
 *   전부 그 파일 머리말에 근거와 함께 적혀 있습니다.
 * ⚠️ 판정할 수 없으면 '' 를 냅니다(하위호환). «까닭» 이 필요하면 parseSoundChar 를 쓰십시오.
 */
export function soundOhaengOf(han: string, mode: "토" | "수" = SOUND_OHAENG_MODE): string {
  return normSoundOhaengOf(han, modeToBook(mode));
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
  /** ★2026-07-31 복성(남궁·황보·선우 …) 둘째 글자. 단성이면 비웁니다.
   *  성 획수는 두 글자의 합으로 셉니다. 가르는 것은 lib/saju/surname.ts 의 splitSurname */
  surname2?: NameChar | null;
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

/**
 * ★2026-07-31 (40부) 발음오행 전용 — «정밀 점수» 를 함께 싣습니다.
 *
 * [왜 grade 만으로는 안 되나]
 *   교재 125칸은 길/반길반흉/흉 3단인데, 손님 분포가 길 29.7 · 반 2.2 · 흉 68.1 입니다.
 *   3단을 그대로 별로 옮기면 평균이 ★3.894 → ★3.456 으로 떨어집니다.
 *   그래서 «교재 판정은 그대로 두고» 흉 안에서 상극 1개와 2개를 갈라 별 칸을 늘렸습니다.
 *   → 그 갈래가 score 에 담깁니다. 평균 ★3.796 (실측 6,859).
 *
 * ⚠️⚠️ 화면과 서버가 «둘 다» 이 score 를 써야 합니다.
 *    한쪽만 grade 로 계산하면 2-10장(화면↔결과지 54.4% 어긋남)이 그대로 재발합니다.
 *    ★그래서 candidateScore 의 인자를 «등급» 에서 «점수» 로 바꿔 두었습니다 —
 *      타입이 안 맞으면 컴파일이 막히므로, 고쳐야 할 자리를 사람이 찾지 않아도 됩니다. (교훈 ET)
 */
export interface SoundFactorResult extends FactorResult {
  /** 0~100. ★별점은 이 값으로 만드십시오 */
  score: number;
  /** 판정의 «날것» — 교재표에서 나왔는지, problems 가 있는지 */
  verdict: SoundVerdict;
}

/** 사격 식별자 — ★한글 라벨은 이름 길이에 따라 달라지므로 판정에 쓰지 않습니다 */
export type GyeokKey = "won" | "hyeong" | "i" | "jeong";

export interface SuriGyeok {
  /** ★2026-07-31 원(元)·형(亨)·이(利)·정(貞) — 가중치 판정은 이 값으로 합니다 */
  key: GyeokKey;
  label: string;    // 초년운/청년운/중년운/말년운
  sum: number;      // 획수 합
  name: string;     // 격 이름 (예: 용진격)
  un: string;       // ★2026-07-31 운 이름 (예: 건창운) — 교재는 «격, 운» 두 낱말입니다
  fortune: SuriFortune; // 길/흉/미정 (내부 참고 — 화면엔 격 이름 중심)
  /** ★2026-07-31 순화 주제어 — 교재 155~170쪽 해설에서 (AI 재료) */
  theme: string;
  /** ★2026-07-31 순화 해설 한 문장 — AI 가 이 어조로 풀어 씁니다 */
  gentle: string;
}

export interface DiagnoseResult {
  yinYang: FactorResult;         // ① 음양오행
  soundFlow: SoundFactorResult;  // ② 발음오행 ★정밀 점수를 함께 실습니다
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

// ── ① 음양오행 — 획수 홀짝 → 양/음 배열 ──
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-07-31 (40부 6차) — 교재 2장(46~48쪽) 대조로 «정책이 확정» 되었습니다.
//
//   [판별]  교재 46쪽 「숫자적으로 1, 3, 5, 7, 9 홀수는 양이고
//                      2, 4, 6, 8, 10 짝수는 음이다」
//           → 원획(강희자전) 홀짝이 «정본» 입니다. rowStrokes() 값을 씁니다.
//
//   ⚠️ 교재 48쪽에는 «모음» 으로 가르는 축도 실려 있습니다 (양 ㅏㅑㅗㅛ / 음 ㅓㅕㅜㅠㅡㅣ).
//      ★대표님 확정 — «쓰지 않습니다».
//        [왜]  ㅐ ㅔ ㅚ ㅟ ㅢ ㅘ ㅝ 등 현대 한글의 주요 모음이 교재 표에 «없습니다».
//              규칙을 임의로 늘리면 교훈 EJ(추정 전사)를 어깁니다.
//        표 자체는 tables/eumyangOhaeng.ts 에 남겨 두었습니다(대조용).
//
//   [배열]  교재 48쪽 «좋은/나쁜 음양 배열» 표
//           2자 2/2 · 3자 6/6 은 «섞인 것 전부» 가 좋은 배열로 실려 있고,
//           4자만 14가지 중 6가지만 실린 «발췌» 입니다.
//           → 「좋은 목록에 있어야 좋다」로 읽으면 4자에서 8가지가 갈 곳이 없습니다.
//           ★대표님 확정 — 「순양·순음만 나쁘다」 단일 식으로 봅니다(해석 ②).
//             47쪽 본문도 「음과 양만으로 치우쳐 있으면」이라 «치우침» 만 말합니다.
//             글자 수와 무관하게 같은 식이라 2·3·4자를 따로 둘 필요가 없습니다.
//
//   [등급]  교재 47쪽 「음과 양만으로 치우쳐 있으면 그것을 «나쁜 음양 배열» 로 여긴다」
//           ★대표님 확정 — 치우침을 «보통» 에서 «아쉬움» 으로 한 칸 내립니다.
//             ⚠️ 종합 별점(overallStar)에서 음양은 «계속 제외» 됩니다.
//                손님 종합 점수에 불이익이 가지 않습니다. 一 칸의 별만 움직입니다.
//             실측 — 치우침 25.0% · 一 칸 평균 ★4.250 → ★4.125
//
//   [문구]  ⚠️ 교재 46쪽 원문에는 손님 앞에 낼 수 없는 표현이 있습니다.
//           ★대표님 확정 — «개운 안내» 로 바꿔 적습니다 (교훈 EG · BR).
//             어떤 말인지 여기 나열하지 않습니다 — 적어 두면 그것이 곧 예시가 됩니다.
// ══════════════════════════════════════════════════════════════════

/** ★치우친 배열에 나가는 «정해진 한 줄». AI 가 고쳐 쓰지 못하게 상수로 둡니다 */
export const EUMYANG_LEAN_NOTE =
  "기운이 한쪽으로 치우쳐, 차분함이나 추진력의 조화가 필요한 배합입니다.";

/** 섞인 배열에 나가는 한 줄 */
export const EUMYANG_MIXED_NOTE =
  "음과 양이 고루 섞여, 서로 다른 결이 균형을 이루는 배합입니다.";

/** 어조 지침 — AI 프롬프트에 함께 실으십시오 */
export const EUMYANG_TONE_GUIDE = [
  "음양은 «타고난 성질» 이 아니라 «지금 살펴볼 지점» 으로 옮겨 적으십시오.",
  "아래 안내 문장에 «적힌 것만» 쓰십시오. 거기 없는 내용을 보태지 마십시오.",
  "치우친 배열이라 하여 손님을 탓하듯 쓰지 마십시오. 보완할 방향으로 적으십시오.",
  "몸에 관해서는 「평소 생활에서 건강에 유의하기 바랍니다」 이 한 줄 밖으로 나가지 마십시오.",
] as const;

function scoreYinYang(input: DiagnoseInput): FactorResult {
  const chars = allChars(input);
  const seq = chars.map((c) => ({
    hanja: c.hanja, strokes: c.strokes,
    yin: c.strokes % 2 === 0,               // ★짝=음 · 홀=양 (교재 46쪽)
    mark: c.strokes % 2 === 0 ? "음" : "양",
  }));
  const yangCount = seq.filter((s) => !s.yin).length;
  const yinCount = seq.filter((s) => s.yin).length;
  // ★글자 수와 무관한 «단일 식» — 순양 또는 순음이면 치우침
  const allSame = yangCount === 0 || yinCount === 0;
  const pattern = seq.map((s) => s.mark).join("-");

  // ★2026-07-31 (40부 6차) — 교재 47쪽이 「나쁜 음양 배열」이라 하므로 «아쉬움» 입니다.
  //   ⚠️ 옛 값은 "보통" 이었습니다. 되돌리시려면 이 한 줄만 고치면 됩니다.
  const grade: Grade = allSame ? "아쉬움" : "좋음";

  return {
    grade,
    detail: `획수 음양 배열: ${pattern}`,
    facts: {
      pattern,                                 // 예: "음-음-양"
      chars: seq,                              // 글자별 획수·음양
      yangCount, yinCount,
      allSame,                                 // 순양/순음이면 true
      배열: allSame ? "치우침" : "섞임",
      // ★정해진 한 줄. AI 가 여기서 벗어나지 못하게 합니다 (교훈 EG)
      안내: allSame ? EUMYANG_LEAN_NOTE : EUMYANG_MIXED_NOTE,
      기준: "원획(강희자전) 홀수는 양 · 짝수는 음",
      출처: "작명개운법 2장 46~48쪽",
      note: allSame ? EUMYANG_LEAN_NOTE : EUMYANG_MIXED_NOTE,   // 하위호환
    },
  };
}

// ── ② 발음오행 — ★2026-07-31 (40부) 교재 125칸 표 조회로 갈아끼웠습니다 ──
//
//   [옛 방식]  상생 개수 / 이웃 개수 = ratio → 0.5 이상이면 「좋음」
//              🔴 상극을 «세지 않았습니다». 상생1+상극1 이 상생2 와 같은 등급이었습니다.
//              🔴 3글자에서 「보통」이 «구조적으로» 나올 수 없었습니다 (실측 0.0%).
//
//   [새 방식]  교재 60쪽 125칸을 그대로 조회 + 61~98쪽 격 이름을 재료로
//              실측 — 옛 방식과 교재가 어긋나던 30.8% 가 사라집니다
//                     (어긋남의 거의 전부가 «교재 흉인데 옛 방식 좋음» 1,936건이었습니다)
//
//   ⚠️ 판정 알맹이는 lib/saju/soundEngine.ts 에 있습니다. 여기는 «껍데기» 입니다 —
//      DiagnoseInput 을 SoundInputChar 로 옮기고 facts 모양만 옛것과 맞춥니다.
function scoreSound(input: DiagnoseInput, mode: "토" | "수"): SoundFactorResult {
  const chars = allChars(input);
  const roles = charRoles(input);
  const v = evaluateSoundOhaeng(
    chars.map((c, i) => ({ hangul: c.hangul, 역할: roles[i] })),
    modeToBook(mode),
  );

  const seq = v.chars.map((c, i) => ({
    hangul: c.hangul,
    cho: c.cho,
    ohaeng: c.ohaeng ?? "",
    역할: roles[i],
  }));

  // ★facts 의 «키 이름» 은 옛것을 그대로 둡니다 — AI 프롬프트와 검사 그물이 이 이름을 봅니다
  const links = v.links.map((l) => ({
    from: l.from ?? "",
    to: l.to ?? "",
    // ★2026-07-31 (40부 4차) — 어느 글자 사이인가. AI 가 괄호를 뒤집지 않도록
    앞글자: `${l.fromChar}(${l.from ?? "?"})`,
    뒷글자: `${l.toChar}(${l.to ?? "?"})`,
    자리: `${l.fromChar}(${l.from ?? "?"})→${l.toChar}(${l.to ?? "?"})`,
    rel: l.relation === "상생" ? "생" : l.relation === "상극" ? "극"
       : l.relation === "비화" ? "비화" : "기타",
    text: l.text,
    구간: l.구간,
  }));

  const 성씨 = seq.filter((x) => x.역할 === "성").map((x) => `${x.hangul}(${x.ohaeng})`).join("·");
  const 이름 = seq.filter((x) => x.역할 === "이름").map((x) => `${x.hangul}(${x.ohaeng})`).join("→");

  return {
    grade: v.grade,
    score: v.score,
    verdict: v,
    detail: `발음오행: ${v.elements.map((e) => e ?? "?").join("→")}`,
    facts: {
      sequence: seq,
      chain: seq.map((s) => `${s.hangul}(${s.ohaeng})`).join("→"),
      links,
      saengCount: v.saengCount,
      total: v.links.length,
      // ★2026-07-31 (40부) 교재에서 온 것들 — AI 가 이 이름으로 풀어 씁니다
      배열: v.combinationKey,                 // 예: '토금수'
      길흉: v.fortune,                        // 길 / 반길반흉 / 흉 / 모름
      // ★2026-07-31 (40부 2차) — «가려서» 내보냅니다. 자극적인 격 이름 12칸은 null 입니다
      격: v.gyeokPublic,                      // 예: '금상유문격' · 가린 칸은 null
      주제: v.theme,                          // 예: '재덕'
      안내: v.gentle,                         // ★AI 가 이 어조로 풀어 씁니다
      상극수: v.geukCount,
      비화수: v.bihwaCount,
      // ★«교재표에서 직접 나온 것인가» — 외자·복성은 '규칙유추' 입니다
      근거: v.basis,
      본: v.book,
      출처: "작명개운법 3장 60·61~98쪽",
      // ★조용히 넘기지 않습니다. resourceJudge 의 problems 와 같은 잣대입니다
      problems: v.problems,
      // 복성 경계 (39부 5차에서 넣은 것 — 그대로 둡니다)
      복성여부: !!input.surname2,
      성씨,
      이름,
      경계표시: `[${성씨}]→${이름}`,
    },
  };
}

/** 성(복성이면 두 글자)과 이름을 이은 전체 글자. ★[surname, ...given] 을 직접 쓰지 마십시오 */
function allChars(input: DiagnoseInput): NameChar[] {
  return input.surname2
    ? [input.surname, input.surname2, ...input.given]
    : [input.surname, ...input.given];
}

/** 글자별 역할 — allChars 와 순서가 같습니다. ★복성이면 앞 두 글자가 "성" 입니다 */
function charRoles(input: DiagnoseInput): ("성" | "이름")[] {
  const surCount = input.surname2 ? 2 : 1;
  return allChars(input).map((_, i) => (i < surCount ? "성" : "이름"));
}

/** 이웃 관계가 어느 구간에 놓였는가 — AI 가 «성씨 안» 과 «성→이름» 을 섞지 않도록 */
function linkZone(roles: ("성" | "이름")[], i: number): "성씨 안" | "성씨→이름" | "이름 안" {
  const a = roles[i], b = roles[i + 1];
  if (a === "성" && b === "성") return "성씨 안";
  if (a === "성" && b === "이름") return "성씨→이름";
  return "이름 안";
}

/** 성 획수 — 복성이면 두 글자의 합 */
function surnameStrokes(input: DiagnoseInput): number {
  return input.surname.strokes + (input.surname2?.strokes ?? 0);
}

// ── ③ 수리오행 (작명가식 사격: 태극수 없음, 원획 기준) ──
//
// ★2026-07-31 2차 — 등급 판정을 «개수 세기» 에서 «주운 가중치» 로 바꿨습니다.
// ★2026-07-31 3차 — 교재 136쪽 「성명 숫자별 수리4격의 구성 방법」 으로 사격을 재작성했습니다.
//
//   교재 136쪽 표 (성 = 복성이면 두 글자 합)
//     원격 元 = 이름 전체 획수 합       (외자면 이름 한 글자)
//     형격 亨 = 성 + 이름 첫 글자        ★주운
//     이격 利 = 성 + 이름 나머지 글자    (외자면 ★성 그 자체 — 가상수를 더하지 않습니다)
//     정격 貞 = 성 + 이름 전체 합        ★주운 · 총운
//
//   두 글자 이름은 예전 식과 결과가 같습니다. 외자·3글자 이상만 달라집니다.
function scoreSuri(input: DiagnoseInput): DiagnoseResult["suri"] {
  const sur = surnameStrokes(input);          // ★복성이면 두 글자 합
  const g = input.given.map((x) => x.strokes);
  const gyeok: SuriGyeok[] = [];

  const push = (key: GyeokKey, label: string, sum: number) => {
    const info = getSuriInfo(sum);
    const guide = getSuriGuide(sum > 0 ? (sum <= 81 ? sum : ((sum % 80) || 81)) : 0);
    gyeok.push({
      key, label, sum,
      name: info.name, un: info.un, fortune: info.fortune,
      theme: guide.theme, gentle: guide.gentle,
    });
  };

  const givenSum = g.reduce((a, b) => a + b, 0);

  if (g.length === 1) {
    // 외자 — 교재 136쪽 「성1 이름1」·「성2 이름1」
    //   ★2026-07-31 6차 — 이격을 «성 + 가상수 1» 에서 «성 그 자체» 로 바로잡았습니다.
    //   교재 표는 두 줄 모두 이격을 「성 1자」/「성 2자」로 적습니다. 가상수가 없습니다.
    //   복성이면 sur 가 이미 두 글자 합이라 같은 식으로 덮입니다.
    push("won",    "초년운", g[0]);
    push("hyeong", "청년운", sur + g[0]);
    push("i",      "중년운", sur);
    push("jeong",  "말년운", sur + g[0]);
  } else if (g.length >= 2) {
    // 두 글자 · 세 글자 이상 모두 같은 식입니다 (교재 136쪽의 일반형)
    const restSum = givenSum - g[0];
    push("won",    "초년운", givenSum);
    push("hyeong", "청년운", sur + g[0]);
    push("i",      "중년운", sur + restSum);
    push("jeong",  "말년운", sur + givenSum);
  }
  // 이름 0글자만 격이 없습니다 (아래에서 판정 보류)

  const isHeung = (k: GyeokKey) =>
    gyeok.some((x) => x.key === k && x.fortune === "흉");

  const isJeongHeung  = isHeung("jeong");                    // 정격(총운)이 흉인가
  const isHyeongHeung = isHeung("hyeong");                   // 형격(주운)이 흉인가
  const subHeungCount = gyeok.filter(
    (x) => (x.key === "won" || x.key === "i") && x.fortune === "흉").length;   // 부운 흉 (0~2)
  const totalHeungCount = gyeok.filter((x) => x.fortune === "흉").length;      // 전체 흉 (0~4)
  const gil = gyeok.filter((x) => x.fortune === "길").length;

  let grade: Grade = "보통";

  if (gyeok.length === 0) {
    // 🔴 격을 하나도 못 낸 것을 «좋음» 이라 부르던 자리입니다 (3-3장 ①). 판정 보류.
    grade = "보통";
  } else if ((isJeongHeung && isHyeongHeung) || totalHeungCount >= 3) {
    grade = "아쉬움";                 // 주운 둘 다 흉이거나, 전체 흉이 셋 이상
  } else if (
    totalHeungCount === 0 ||
    (!isJeongHeung && !isHyeongHeung && subHeungCount <= 1)
  ) {
    grade = "좋음";                   // 주운이 모두 길이고 부운 흉이 하나 이하
  } else {
    grade = "보통";                   // 주운 중 하나만 흉이거나, 부운 둘이 흉
  }

  return {
    grade,
    gyeok,
    facts: {
      gyeok,                                    // 사격 전체 (격키/라벨/합/격·운/길흉/주제/안내)
      heungCount: totalHeungCount, gilCount: gil,
      jeongHeung: isJeongHeung,                 // ★총운이 흉인가
      hyeongHeung: isHyeongHeung,               // ★주운이 흉인가
      subHeungCount,                            // ★부운 흉 개수
      성획수: sur,
      복성여부: !!input.surname2,
      서술지침: SURI_TONE_GUIDE,                 // ★AI 어조 가이드 (교재 155~170쪽 순화)
    },
  };
}

// ── ④ 자원오행 흐름 ──
function scoreResource(input: DiagnoseInput): FactorResult {
  const chars = allChars(input);
  const roles = charRoles(input);
  const seq = chars.map((c, i) => ({
    hanja: c.hanja,
    meaning: c.meaning ?? "",
    ohaeng: c.resourceOhaeng,
    역할: roles[i],                             // ★2026-07-31 성/이름 경계
  }));
  const links: { from: string; to: string; rel: RelKind; text: string;
    구간: "성씨 안" | "성씨→이름" | "이름 안" }[] = [];
  let saeng = 0, total = 0;
  for (let i = 0; i < seq.length - 1; i++) {
    const r = relationOf(seq[i].ohaeng, seq[i + 1].ohaeng);
    links.push({ from: seq[i].ohaeng, to: seq[i + 1].ohaeng, rel: r.kind, text: r.text,
      구간: linkZone(roles, i) });
    total++;
    if (isSaeng(seq[i].ohaeng, seq[i + 1].ohaeng)) saeng++;
  }
  const ratio = total ? saeng / total : 0;
  const grade: Grade = ratio >= 0.5 ? "좋음" : ratio > 0 ? "보통" : "아쉬움";

  return {
    grade,
    detail: `자원오행: ${seq.map((s) => s.ohaeng).join("→")}`,
    facts: {
      sequence: seq,                            // 글자별 한자·뜻·오행·역할
      chain: seq.map((s) => `${s.hanja}(${s.ohaeng})`).join("→"),
      links,
      saengCount: saeng, total,
      // ★2026-07-31 복성 경계 — 성씨는 「南穹」 두 글자입니다
      복성여부: !!input.surname2,
      성씨: seq.filter((x) => x.역할 === "성").map((x) => `${x.hanja}(${x.ohaeng})`).join("·"),
      이름: seq.filter((x) => x.역할 === "이름").map((x) => `${x.hanja}(${x.ohaeng})`).join("→"),
      경계표시: `[${seq.filter((x) => x.역할 === "성").map((x) => `${x.hanja}(${x.ohaeng})`).join("·")}]`
        + `→` + seq.filter((x) => x.역할 === "이름").map((x) => `${x.hanja}(${x.ohaeng})`).join("→"),
    },
  };
}

// ── ⑤ 사주보완: 이름 자원오행이 용신(또는 희신)을 포함하는가 ──
function scoreYongsin(input: DiagnoseInput, mode: "관대" | "엄격"): FactorResult {
  const nameOhaengs = input.given.map((g) => g.resourceOhaeng);
  const surnameOhaeng = input.surname.resourceOhaeng;
  // ★2026-07-31 복성이면 성 오행이 둘입니다
  const surnameOhaengs = input.surname2
    ? [input.surname.resourceOhaeng, input.surname2.resourceOhaeng]
    : [input.surname.resourceOhaeng];
  const hasYongsin = nameOhaengs.includes(input.yongsin);
  const hasHeeksin = input.heeksin ? nameOhaengs.includes(input.heeksin) : false;
  // 용신을 담은 글자들 (서술용)
  const yongsinChars = allChars(input)
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
      surnameOhaengs,                           // ★복성이면 둘
      복성여부: !!input.surname2,
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
