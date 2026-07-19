// lib/saju/ohaengColor.ts
// ============================================================================
// 오행 색 — 명카페 전체가 공유하는 단 하나의 기준
// ----------------------------------------------------------------------------
// ★ 색을 바꾸려면 이 파일만 고치면 된다. 화면 파일을 찾아다니지 않는다.
//   (2026-07-19 이전에는 13개 파일에 같은 색이 흩어져 있었다)
//
// 2026-07-19 연재쌤 지시로 "진한 배경 + 흰 글씨" 방식으로 통일:
//   목 진초록 / 화 빨강 / 토 진노랑 / 금 흰바탕 검정글씨 / 수 검정
//   → 이전에는 옅은 배경 + 색 글씨였다.
//
// ⚠ 오행 색은 명리 규칙이다. 연재쌤 확인 없이 바꾸지 말 것.
// ============================================================================

export type Ohaeng = '목' | '화' | '토' | '금' | '수'

// ⚠ 아래 색 표들은 Record<string, string> 으로 둔다.
//   화면마다 el 을 Element 로 받는 곳과 string 으로 받는 곳이 섞여 있어서
//   Record<Ohaeng, ...> 로 좁히면 string 을 넘기는 화면에서 타입 에러가 난다.
//   (2026-07-19 DayunTableNew 배포 실패로 확인)
//   오행이 아닌 값이 오면 undefined 가 되므로, 쓰는 쪽에서 `|| 기본색` 을 붙인다.

/** 칸 배경색 */
export const EL_BG: Record<string, string> = {
  목: '#2e7d32',   // 진초록
  화: '#c62828',   // 빨강
  토: '#e8a317',   // 진노랑(주황 기운)
  금: '#ffffff',   // 흰색 — 글씨가 검정
  수: '#2b2b2b',   // 검정
}

/** 칸 테두리색 — 배경과 같게 두되, 금만 흰 배경이라 회색 테두리로 칸을 드러낸다 */
export const EL_BD: Record<string, string> = {
  목: '#2e7d32',
  화: '#c62828',
  토: '#e8a317',
  금: '#c8c8c8',
  수: '#2b2b2b',
}

/** 큰 글씨(천간·지지 한 글자) 색 */
export const EL_C: Record<string, string> = {
  목: '#ffffff',
  화: '#ffffff',
  토: '#ffffff',
  금: '#1a1a1a',   // 흰 배경이라 검정
  수: '#ffffff',
}

/** 칸 안 작은 한자(木·火·土·金·水) 색 — 큰 글씨보다 한 단계 옅게 해서 위계를 준다 */
export const EL_C_SUB: Record<string, string> = {
  목: '#f0f8ec',
  화: '#ffeaea',
  토: '#fffaf0',
  금: '#4a4a4a',
  수: '#e0e0e0',
}

/** 오행 한자 */
export const EL_HAN: Record<string, string> = {
  목: '木', 화: '火', 토: '土', 금: '金', 수: '水',
}

/** 오행 우리말 */
export const EL_NAME: Record<string, string> = {
  목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물',
}

// ── 글씨용 진한 색 ──────────────────────────────────────────────
// 배경 없이 글씨에만 색을 쓸 때(오각형 바깥 라벨, 범례, 표 안 글자 등).
// 흰 배경 위에 놓이므로 진한 색이어야 읽힌다.
export const EL_TEXT: Record<string, string> = {
  목: '#2e7d32',
  화: '#c62828',
  토: '#f57f17',
  금: '#616161',
  수: '#2b2b2b',
}

// ── 오각형 그래프 원 채움색 ──────────────────────────────────────
// 원 안에 퍼센트 숫자가 들어가므로 배경과 글씨 대비가 필요하다.
export const EL_PENTAGON: Record<string, string> = {
  목: '#2e7d32',
  화: '#c62828',
  토: '#e8a317',
  금: '#ffffff',
  수: '#2b2b2b',
}

/** 오각형 원 안 글씨색 (채움색 위에 놓임) */
export const EL_PENTAGON_TEXT: Record<string, string> = {
  목: '#ffffff',
  화: '#ffffff',
  토: '#ffffff',
  금: '#1a1a1a',
  수: '#ffffff',
}

// ── 헬퍼 ────────────────────────────────────────────────────────
const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_EL: Record<string, Ohaeng> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}

/** 천간 글자 → 오행 */
export function elOfStem(stem: string): Ohaeng | undefined {
  return STEM_EL[stem]
}
/** 지지 글자 → 오행 */
export function elOfBranch(branch: string): Ohaeng | undefined {
  return BRANCH_EL[branch]
}
