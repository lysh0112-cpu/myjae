// app/manseryeok/birth-timing/lib/birthScoreConfig.ts
//
// ★ 출산택일 산식의 "수치"를 한 곳에 모은 설정 파일 (방식 A 부품화)
//
// 연재 선생님 검수로 배점·감점을 조정할 때는 이 파일의 숫자만 바꾸면 된다.
// 계산 방법(무엇을 충으로 보는지, 어떻게 세는지)은 score.ts·recommend.ts에 있고
// 이 파일은 건드리지 않는다. 궁합의 ohaengColor.ts 와 같은 역할.
//
// ※ 여기 숫자는 전통 명리의 "원리"에 근거하되, 구체적 점수는 명카페의 잠정 설계값이다.
//   (docs/출산택일_설계.md 참고) — 고전에 "충 -12점" 같은 수치는 없다.

export const BIRTH_SCORE_CONFIG = {
  // ── 세 항목 만점 (합 100) ──
  weights: {
    ohaeng: 30, // 오행 중화
    johu: 30,   // 조후(온도)
    jiji: 40,   // 지지 안정
  },

  // ── ① 오행 중화 감점 ──
  ohaeng: {
    missingEach: 6,       // 없는 오행 1개당 감점
    concentratedHigh: 12, // 한 오행 70%↑ 쏠림 감점 (+ 산액 플래그)
    concentratedMid: 6,   // 한 오행 50%↑ 쏠림 감점
    ratioHigh: 0.7,       // '심한 쏠림' 기준 비율
    ratioMid: 0.5,        // '중간 쏠림' 기준 비율
  },

  // ── ② 조후 점수 (여름생 水 / 겨울생 火) ──
  johu: {
    full: 30,    // 필요한 기운 2개↑
    half: 20,    // 필요한 기운 1개
    lack: 8,     // 필요한 기운 없음
    neutral: 24, // 봄·가을(환절기) 기본점  ※ 연재쌤 조후표 나오면 이 고정값 대체 예정
  },

  // ── ③ 지지 안정 감점 ──
  jiji: {
    chungEach: 12,      // 충(沖) 1쌍당 감점
    chungAvoidAt: 2,    // 충이 이 개수↑면 산액 플래그
    hyeong: 8,          // 형(刑) 성립당 감점
    wonjin: 6,          // 원진 1쌍당 감점
    sanaek: 0,          // (삭제됨) 子·卯·酉 산액 — 원문 근거 없어 연재쌤 검수2 확정삭제. 되살리려면 값만.
  },

  // ── 별점(1~5) 변환 경계 (점수/만점 비율) ──
  starCut: [0.9, 0.72, 0.54, 0.36], // ≥0.9→5, ≥0.72→4, ≥0.54→3, ≥0.36→2, 그 미만→1

  // ── ② 부모 관계 가점 (보조) ──
  parent: {
    hap: 5,          // 아기 일간 ↔ 부모 일간 천간합
    saeng: 3,        // 아기가 부모를 생(生)
    yongsin2: 3,     // 부모 용신 오행이 아기 8글자에 2개↑
    yongsin1: 1.5,   // 부모 용신 오행이 1개
    momChung: 0,     // ★ 산모 일지 충 감점 — 연재쌤 수치 나오면 여기에. 지금은 0(동작 안 함)
    bonusCap: 10,    // 부모 가점 합산 상한
  },

  // ── 최종 점수 상한 (아기 중심 유지) ──
  scoreCap: 100, // 최종 = min(scoreCap, 아기점수 + 부모가점)
}

export type BirthScoreConfig = typeof BIRTH_SCORE_CONFIG
