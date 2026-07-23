// app/manseryeok/birth-timing/lib/sajuTables.ts
//
// ★ 출산택일 공용 표 — 여러 파일에 흩어져 있던 같은 표를 한곳으로 모았다. (2026-07-23)
//
//   [왜 모았나]
//   STEM_EL 이 6곳, BRANCH_EL 4곳, 원진 3곳, 형 3곳에 각각 복사돼 있었다.
//   값은 모두 같았지만, 한 곳만 고치면 나머지가 갈라져 조용히 다른 결과를 낸다.
//   실제로 지장간 표는 이미 갈라져 있었다(아래 참조).
//
//   [원칙]
//   · 공용 엔진(lib/saju/*)은 건드리지 않는다. 출산택일 폴더 안에서만 모은다.
//   · 값을 바꾸지 않는다. 기존 파일들과 100% 같은 값만 옮겨 왔다.
//   · 유파가 갈리는 것은 주석에 근거를 남긴다.

// ── 오행 매핑 ──────────────────────────────────────────────────────────
export const STEM_EL: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

/**
 * 지지 본래 오행 (辰戌丑未 = 土).
 * ※ 계절 치환을 하지 않는다. 적성용 simsanOhaeng 과 다르므로 섞어 쓰지 말 것.
 *   (yongsinNew.ts 주석: "적성·직업 = 계절치환 / 건강·궁합·용신 = 본기 土")
 */
export const BRANCH_EL: Record<string, string> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}

/** 지지의 음양 (십신 판정용) */
export const BRANCH_YIN: Record<string, boolean> = {
  子: true, 丑: true, 寅: false, 卯: true, 辰: false, 巳: false,
  午: true, 未: true, 申: false, 酉: true, 戌: false, 亥: false,
}

/** 지지 본기(정기) 천간 — 십신을 지지에서 뽑을 때 쓴다 */
export const BRANCH_MAIN_STEM: Record<string, string> = {
  子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙',
  午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬',
}

// ── 지장간 ────────────────────────────────────────────────────────────
/**
 * 지장간 (정기·중기·여기 전부).
 *
 * ★연재쌤 확정 2026-07-23:
 *   · 뿌리(통근) 판정에서 지장간을 본다. 여기(餘氣)도 뿌리로 인정한다.
 *     예) 亥의 여기 甲 → 甲 일간의 뿌리로 봄
 *   · **亥에는 戊(土)를 넣지 않는다.** 亥는 토 일간의 뿌리가 될 수 없다(약하다).
 *
 * ⚠️ 공용 lib/saju/yongsinNew.ts 의 JIJANGAN 은 亥를 戊甲壬으로 본다(유파 차이).
 *    그 파일은 사주보기·궁합이 공유하므로 건드리지 않는다.
 *    출산택일은 이 표를 쓴다. 두 표가 다르다는 것을 알고 쓰는 것이다.
 *
 * ※ 왕지(子卯酉)는 정기 하나만 둔다. 오행으로 환산하면 결과가 같다
 *   (壬癸 모두 수 / 甲乙 모두 목 / 庚辛 모두 금).
 */
export const JIJANGAN: Record<string, string[]> = {
  子: ['癸'],            丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'], 卯: ['乙'],
  辰: ['戊', '乙', '癸'], 巳: ['丙', '戊', '庚'],
  午: ['丁', '己'],       未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'], 酉: ['辛'],
  戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
}

/** 지장간을 오행으로 바꾼 표 (scoreV6.JIJANGAN_EL 과 동일) */
export const JIJANGAN_EL: Record<string, string[]> = Object.fromEntries(
  Object.entries(JIJANGAN).map(([b, list]) => [b, [...new Set(list.map(s => STEM_EL[s]))]]),
)

// ── 오행 상생·상극 ──────────────────────────────────────────────────────
/** A가 B를 생함 (A생B) */
export const GEN: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
/** A가 B를 극함 (A극B) */
export const OVERCOME: Record<string, string> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' }

/** x를 생하는 오행 = x의 인성 */
export const inseongElOf = (x: string) => (Object.keys(GEN)).find(k => GEN[k] === x) ?? ''
/** x를 극하는 오행 = x의 관성 */
export const gwanElOf = (x: string) => (Object.keys(OVERCOME)).find(k => OVERCOME[k] === x) ?? ''
/** x가 생하는 오행 = x의 식상 */
export const siksangElOf = (x: string) => GEN[x] ?? ''
/** x가 극하는 오행 = x의 재성 */
export const jaeElOf = (x: string) => OVERCOME[x] ?? ''

// ── 지지 관계 ──────────────────────────────────────────────────────────
/** 원진(怨嗔) 6쌍 — 까닭 없이 서로 불편한 사이 */
export const WONJIN_PAIRS: [string, string][] = [
  ['子', '未'], ['丑', '午'], ['寅', '酉'], ['卯', '申'], ['辰', '亥'], ['巳', '戌'],
]
/** 충(沖) 6쌍 — 정면으로 부딪침 */
export const CHUNG_PAIRS: [string, string][] = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
]
/** 삼형(三刑) 2그룹 */
export const SAMHYEONG_GROUPS: string[][] = [['寅', '巳', '申'], ['丑', '戌', '未']]
/** 상형(相刑) — 子卯 */
export const SANGHYEONG_GROUPS: string[][] = [['子', '卯']]
/** 자형(自刑) — 같은 글자끼리. 연재쌤 확정: 월지-일지에서만 본다 */
export const JAHYEONG_BRANCHES = ['辰', '午', '酉', '亥']

/** 삼합 — 세 글자가 모이면 그 오행이 강해진다 */
export const SAMHAP: { branches: string[]; el: string }[] = [
  { branches: ['申', '子', '辰'], el: '수' },
  { branches: ['亥', '卯', '未'], el: '목' },
  { branches: ['寅', '午', '戌'], el: '화' },
  { branches: ['巳', '酉', '丑'], el: '금' },
]
/** 방국 — 같은 계절 세 글자 */
export const BANGGUK: { branches: string[]; el: string }[] = [
  { branches: ['寅', '卯', '辰'], el: '목' },
  { branches: ['巳', '午', '未'], el: '화' },
  { branches: ['申', '酉', '戌'], el: '금' },
  { branches: ['亥', '子', '丑'], el: '수' },
]

// ── 계절 ──────────────────────────────────────────────────────────────
export const SPRING = ['寅', '卯', '辰']
export const SUMMER = ['巳', '午', '未']
export const AUTUMN = ['申', '酉', '戌']
export const WINTER = ['亥', '子', '丑']

/**
 * 월지로 계절을 판정한다.
 * ★연재쌤 확정: 여름·겨울생은 조후용신, 봄·가을생은 억부용신을 본다.
 */
export function seasonOf(monthBranch: string): '봄' | '여름' | '가을' | '겨울' | '' {
  if (SPRING.includes(monthBranch)) return '봄'
  if (SUMMER.includes(monthBranch)) return '여름'
  if (AUTUMN.includes(monthBranch)) return '가을'
  if (WINTER.includes(monthBranch)) return '겨울'
  return ''
}

// ── 판정 도우미 ────────────────────────────────────────────────────────
export function isPair(list: [string, string][], a: string, b: string): boolean {
  return list.some(([x, y]) => (x === a && y === b) || (y === a && x === b))
}
export const isWonjin = (a: string, b: string) => isPair(WONJIN_PAIRS, a, b)
export const isChung = (a: string, b: string) => isPair(CHUNG_PAIRS, a, b)

/** 두 지지의 형(刑) 관계. 같은 글자면 자형. 없으면 null */
export function hyeongOf(a: string, b: string): '삼형' | '상형' | '자형' | null {
  if (a === b) return JAHYEONG_BRANCHES.includes(a) ? '자형' : null
  for (const g of SAMHYEONG_GROUPS) if (g.includes(a) && g.includes(b)) return '삼형'
  for (const g of SANGHYEONG_GROUPS) if (g.includes(a) && g.includes(b)) return '상형'
  return null
}

/** 어떤 오행이 지지들의 지장간에 뿌리내린 자리 이름 목록 */
export function rootSeatsOf(el: string, branches: string[], seatNames = ['년지', '월지', '일지', '시지']): string[] {
  if (!el) return []
  const out: string[] = []
  branches.forEach((b, i) => {
    if ((JIJANGAN[b] ?? []).some(s => STEM_EL[s] === el)) out.push((seatNames[i] ?? '') + b)
  })
  return out
}

/** 드러난 8글자의 오행 개수 (지장간 안 봄, 지지는 본래 오행) */
export function countElements(stems: string[], branches: string[]): Record<string, number> {
  const c: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  stems.forEach(s => { const e = STEM_EL[s]; if (e) c[e]++ })
  branches.forEach(b => { const e = BRANCH_EL[b]; if (e) c[e]++ })
  return c
}
