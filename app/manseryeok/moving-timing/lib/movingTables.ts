// app/manseryeok/moving-timing/lib/movingTables.ts
//
// ★ 이사택일 v1 공용 표 (2026-07-24)
//
//   [원칙 — 결혼택일 weddingTables.ts 와 같다]
//   · 공용 엔진(lib/saju/*)은 건드리지 않는다. 호출만 한다.
//   · 결혼택일과 값이 같은 것은 같은 값을 쓰되 import 하지 않는다.
//     두 서비스가 서로를 끌어다 쓰면 한쪽 수정이 다른 쪽을 조용히 바꾼다.
//     (출산택일에서 같은 표가 6곳에 복사됐다가 갈라진 일이 있었다 — 23부 교훈)

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
 * ★자형 포함 — 결혼택일과 같은 판정. ⚠️ 연재쌤 검수 대상.
 */
export function hyeongOf(a: string, b: string): '삼형' | '상형' | '자형' | null {
  if (a === b) return JAHYEONG_BRANCHES.includes(a) ? '자형' : null
  for (const g of SAMHYEONG_GROUPS) if (g.includes(a) && g.includes(b)) return '삼형'
  for (const g of SANGHYEONG_GROUPS) if (g.includes(a) && g.includes(b)) return '상형'
  return null
}

/**
 * 일주 60갑자 → 공망 지지 2개 (순공).
 * 순수 규칙이라 API 가 필요 없다.
 */
export function gongmangBranches(ganji: string): string[] {
  if (!ganji || ganji.length < 2) return []
  const s = STEMS.indexOf(ganji[0])
  const b = BRANCHES.indexOf(ganji[1])
  if (s < 0 || b < 0) return []
  const xun = ((b - s) % 12 + 12) % 12
  return [BRANCHES[(xun + 10) % 12], BRANCHES[(xun + 11) % 12]]
}

/** 시주 계산 — useResultSaju.calcHourPillar 와 동일 규칙(오자둔) */
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

// ══════════════════════════════════════════════════════════════
//  손(損) — 이사택일에만 있는 개념
// ══════════════════════════════════════════════════════════════
//
//  '손'은 방위를 돌아다니며 이사·개업을 방해한다는 민간 신앙의 존재다.
//  음력 날짜 끝자리에 따라 동→남→서→북 순으로 자리를 옮기고,
//  9·10일에는 하늘로 올라가 어느 방위에도 없다 — 이것이 '손 없는 날'이다.
//
//  ⚠️ 근거: 제미나이 조회 결과(『천기대요』·『택일통해』 인용).
//     교재 원문을 직접 확인하지 못했다. 연재쌤 검수 대상.
//
//  [정통 택일에서의 무게]
//  손 없는 날은 '반드시'가 아니라 '참고' 조건이다.
//  공망·충·형이 훨씬 중하게 다뤄진다. 그래서 우리도
//  공망·충·형은 고정필터, 손은 선택 토글로 둔다.

export type Direction = '동' | '서' | '남' | '북'

export const DIRECTIONS: Direction[] = ['동', '서', '남', '북']

/**
 * 음력 날짜 → 그날 손이 머무는 방위. 없으면 null(= 손 없는 날).
 *
 *   끝자리 1·2 → 동
 *   끝자리 3·4 → 남
 *   끝자리 5·6 → 서
 *   끝자리 7·8 → 북
 *   끝자리 9·0 → 없음 (하늘로 올라감)
 */
export function sonDirection(lunarDay: number): Direction | null {
  if (!lunarDay || lunarDay < 1 || lunarDay > 30) return null
  const r = lunarDay % 10
  if (r === 1 || r === 2) return '동'
  if (r === 3 || r === 4) return '남'
  if (r === 5 || r === 6) return '서'
  if (r === 7 || r === 8) return '북'
  return null
}

/**
 * 손 없는 날인가 — 음력 9·10·19·20·29·30.
 *
 * ★소월(29일까지인 달)은 30일이 없으므로 그 달은 5일뿐이다.
 *   보정하지 않는다(전통 택일에 이월·보정 개념이 없다).
 *   lunarDay 로만 판정하므로 소월은 자연히 5일이 된다.
 */
export function isSonEomneunNal(lunarDay: number): boolean {
  return sonDirection(lunarDay) === null && lunarDay >= 1 && lunarDay <= 30
}

/** 방위 한자 (화면 표시용) */
export const DIR_HANJA: Record<Direction, string> = {
  동: '東', 서: '西', 남: '南', 북: '北',
}
