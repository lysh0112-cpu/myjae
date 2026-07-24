// app/manseryeok/wedding-timing/lib/weddingTables.ts
//
// ★ 결혼택일 v7 공용 표 (2026-07-24)
//
//   [왜 모았나]
//   출산택일에서 같은 표가 6곳에 복사돼 있다가 조용히 갈라진 일이 있었다.
//   (23부 교훈 — sajuTables.ts 를 만든 이유)
//   결혼택일도 처음부터 한곳에 모아 둔다.
//
//   [원칙]
//   · 공용 엔진(lib/saju/*)은 건드리지 않는다. 호출만 한다.
//   · 출산택일 sajuTables.ts 와 값이 같은 것은 같은 값을 쓴다.
//     다만 import 하지 않는다 — 두 서비스가 서로를 끌어다 쓰면
//     한쪽 수정이 다른 쪽을 조용히 바꾼다.

export const STEM_EL: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

/** 지지 본래 오행 (辰戌丑未 = 土). 계절 치환하지 않는다. */
export const BRANCH_EL: Record<string, string> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** 충(沖) 6쌍 — 정면으로 부딪힘 */
export const CHUNG_PAIRS: [string, string][] = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
]

/** 삼형(三刑) 2그룹 */
export const SAMHYEONG_GROUPS: string[][] = [['寅', '巳', '申'], ['丑', '戌', '未']]
/** 상형(相刑) — 子卯 */
export const SANGHYEONG_GROUPS: string[][] = [['子', '卯']]
/** 자형(自刑) — 같은 글자끼리 */
export const JAHYEONG_BRANCHES = ['辰', '午', '酉', '亥']

function isPair(list: [string, string][], a: string, b: string): boolean {
  return list.some(([x, y]) => (x === a && y === b) || (y === a && x === b))
}

/** 두 지지가 충 관계인가 */
export const isChung = (a: string, b: string) => isPair(CHUNG_PAIRS, a, b)

/**
 * 두 지지의 형(刑) 관계. 없으면 null.
 *
 * ★자형 포함. 같은 글자가 辰午酉亥면 자형으로 본다.
 *   (출산택일은 월지-일지에서만 자형을 봤지만, 결혼택일은 판정 대상이
 *    '예식일 일지 vs 사람 일지'로 자리 구조가 달라 그대로 옮기지 않았다.)
 *   ⚠️ 연재쌤 검수 대상.
 */
export function hyeongOf(a: string, b: string): '삼형' | '상형' | '자형' | null {
  if (a === b) return JAHYEONG_BRANCHES.includes(a) ? '자형' : null
  for (const g of SAMHYEONG_GROUPS) if (g.includes(a) && g.includes(b)) return '삼형'
  for (const g of SANGHYEONG_GROUPS) if (g.includes(a) && g.includes(b)) return '상형'
  return null
}

/**
 * 일주 60갑자 → 공망 지지 2개 (순공).
 *
 * 순수 규칙이라 API 가 필요 없다. 순(旬)의 첫 지지를 구한 뒤
 * 그 순에서 짝을 못 찾고 남는 마지막 두 지지가 공망이다.
 */
export function gongmangBranches(ganji: string): string[] {
  if (!ganji || ganji.length < 2) return []
  const s = STEMS.indexOf(ganji[0])
  const b = BRANCHES.indexOf(ganji[1])
  if (s < 0 || b < 0) return []
  const xun = ((b - s) % 12 + 12) % 12
  return [BRANCHES[(xun + 10) % 12], BRANCHES[(xun + 11) % 12]]
}

/** 시주 계산 — useResultSaju.calcHourPillar 와 동일 규칙 */
export function calcHourPillar(dayStem: string, hourIdx: number): { stem: string; branch: string } {
  const dg = STEMS.indexOf(dayStem)
  if (dg < 0) return { stem: '?', branch: '?' }
  const groupBase = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]
  return { stem: STEMS[(groupBase[dg] + hourIdx) % 10], branch: BRANCHES[hourIdx] }
}

/** 간지 문자열 → {stem, branch} (괄호 형태 (甲子)도 처리) */
export function splitGanji(ganji: string): { stem: string; branch: string } {
  if (!ganji) return { stem: '?', branch: '?' }
  const m = ganji.match(/\(([^)]+)\)/)
  if (m && m[1].length >= 2) return { stem: m[1][0], branch: m[1][1] }
  if (ganji.length >= 2) return { stem: ganji[0], branch: ganji[1] }
  return { stem: '?', branch: '?' }
}
