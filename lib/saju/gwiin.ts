// lib/saju/gwiin.ts
// ============================================================================
// 귀인류 길신(吉神) 7가지 — 사주 원국에 매핑해 표시.
//   천을귀인·태극귀인·문창귀인·금여·암록 : 일간(日干) 기준 → 지지에서 탐색
//   월덕귀인 : 월지 삼합 오행의 양간 → 천간에서 탐색
//   천덕귀인 : 월지 기준 → 천간 또는 지지에서 탐색
//
// 근거: 자평진전·적천수·삼명통회. NotebookLM 조견표(검산 완료: 금여=건록+2,
//   암록=건록의 육합 규칙과 20/20 일치). ★연재쌤 최종 검수 대상(원칙 12).
//
// 사용:
//   getGwiinForBranch(dayStem, monthBranch, branch)  → 그 지지에 붙는 귀인 목록
//   getGwiinForStem(monthBranch, stem)               → 그 천간에 붙는 귀인 목록
//   (원국 렌더 시 각 칸마다 호출해서 배지로 표시)
// ============================================================================

// ── 일간 기준, 지지에서 찾는 귀인 (값이 배열=여러 지지 가능) ──
const CHEON_EUL: Record<string, string[]> = {  // 천을귀인
  甲: ['丑', '未'], 乙: ['子', '申'], 丙: ['酉', '亥'], 丁: ['酉', '亥'], 戊: ['丑', '未'],
  己: ['子', '申'], 庚: ['丑', '未'], 辛: ['寅', '午'], 壬: ['巳', '卯'], 癸: ['巳', '卯'],
}
const TAE_GEUK: Record<string, string[]> = {  // 태극귀인
  甲: ['子', '午'], 乙: ['子', '午'], 丙: ['卯', '酉'], 丁: ['卯', '酉'], 戊: ['辰', '戌', '丑', '未'],
  己: ['辰', '戌', '丑', '未'], 庚: ['寅', '亥'], 辛: ['寅', '亥'], 壬: ['巳', '申'], 癸: ['巳', '申'],
}
const MUN_CHANG: Record<string, string> = {  // 문창귀인
  甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯',
}
const GEUM_YEO: Record<string, string> = {  // 금여 (건록+2칸)
  甲: '辰', 乙: '巳', 丙: '未', 丁: '申', 戊: '未', 己: '申', 庚: '戌', 辛: '亥', 壬: '丑', 癸: '寅',
}
const AM_ROK: Record<string, string> = {  // 암록 (건록의 육합)
  甲: '亥', 乙: '戌', 丙: '申', 丁: '未', 戊: '申', 己: '未', 庚: '巳', 辛: '辰', 壬: '寅', 癸: '丑',
}

// ── 월지 기준 ──
// 월덕귀인: 월지 삼합 오행의 양간을 천간에서 찾음
const WOL_DEOK: Record<string, string> = {
  寅: '丙', 午: '丙', 戌: '丙',
  申: '壬', 子: '壬', 辰: '壬',
  巳: '庚', 酉: '庚', 丑: '庚',
  亥: '甲', 卯: '甲', 未: '甲',
}
// 천덕귀인: 월지별로 천간 또는 지지 하나. (지지는 지지끼리, 천간은 천간끼리 매칭)
const CHEON_DEOK: Record<string, string> = {
  子: '巳', 丑: '庚', 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛',
  午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙',
}
// 천덕 값이 지지인지 천간인지 구분용
const STEMS = new Set(['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'])

/**
 * 특정 지지 자리에 붙는 귀인 목록.
 * @param dayStem 일간
 * @param monthBranch 월지 (천덕이 지지로 성립하는지 판정용)
 * @param branch 판정할 지지
 */
export function getGwiinForBranch(dayStem: string, monthBranch: string, branch: string): string[] {
  const result: string[] = []
  if (!branch || branch === '?') return result
  if (CHEON_EUL[dayStem]?.includes(branch)) result.push('천을귀인')
  if (TAE_GEUK[dayStem]?.includes(branch)) result.push('태극귀인')
  if (MUN_CHANG[dayStem] === branch) result.push('문창귀인')
  if (GEUM_YEO[dayStem] === branch) result.push('금여')
  if (AM_ROK[dayStem] === branch) result.push('암록')
  // 천덕귀인이 지지로 성립하는 경우 (월지에 매핑된 값이 지지이고, 이 자리와 같을 때)
  const td = CHEON_DEOK[monthBranch]
  if (td && !STEMS.has(td) && td === branch) result.push('천덕귀인')
  return result
}

/**
 * 특정 천간 자리에 붙는 귀인 목록 (월덕·천덕은 천간에 성립).
 * @param monthBranch 월지
 * @param stem 판정할 천간
 */
export function getGwiinForStem(monthBranch: string, stem: string): string[] {
  const result: string[] = []
  if (!stem || stem === '?') return result
  if (WOL_DEOK[monthBranch] === stem) result.push('월덕귀인')
  const td = CHEON_DEOK[monthBranch]
  if (td && STEMS.has(td) && td === stem) result.push('천덕귀인')
  return result
}

// 귀인 표시용 짧은 이름·색 (원국 배지)
export const GWIIN_STYLE: Record<string, { short: string; color: string }> = {
  '천을귀인': { short: '천을', color: '#c8783c' },
  '태극귀인': { short: '태극', color: '#7c5aaa' },
  '문창귀인': { short: '문창', color: '#3c82a0' },
  '금여':     { short: '금여', color: '#b48a3c' },
  '암록':     { short: '암록', color: '#5a8c5a' },
  '월덕귀인': { short: '월덕', color: '#c85a8c' },
  '천덕귀인': { short: '천덕', color: '#c85a6e' },
}
