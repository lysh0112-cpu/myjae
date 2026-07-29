// lib/saju/premium/deepJudge.ts
//
// ┌──────────────────────────────────────────────────────────────────┐
// │  프리미엄 리포트가 쓸 «판정» 모음 — 1단계                            │
// │  2026-07-29                                                       │
// └──────────────────────────────────────────────────────────────────┘
//
// ── 왜 이 파일이 먼저인가 ────────────────────────────────────────────
//   대표님 기획서의 7+6 섹션 가운데 아래 것들은 **교재 문장으로만 있고
//   판정하는 코드가 없었습니다.**
//       천극지충   chungMeaning 문장에만
//       시상일위   yukchinRule 문장에만
//       접목운     jijiTrait 문장에만
//       관인상생   yukchinRule 문장에만
//       액땜       jijiGrade 해설에만
//   그리고 아래 것들은 아예 없었습니다.
//       양팔통·음팔통 · 무자론 · 다자론 · 강점 지능 · 천간40:지지60 가중
//
//   ★프롬프트에 섹션만 만들고 재료를 안 주면 AI 가 지어냅니다.
//     33부의 沖, 34부의 지지 합, 자화간합·암합 — 세 번 다 같은 자리였습니다. (교훈 BO)
//     그래서 «판정»을 먼저 짓고, 그다음에 프롬프트를 얹습니다.
//
// ── ⚠️ 여기서 새로 계산하지 않는 것 ───────────────────────────────────
//   오행 100점  calcSimsanOhaeng   (29부 5장 — 손대지 말 것)
//   격국·용신    calcYongsinNew     (교훈 BQ — 한 곳에서만)
//   대운 목록    화면이 /api/dayun 으로 받아 넘긴다
//   이 파일은 그것들을 **받아서 판정만** 합니다.
//
// ── ⚠️ 잣대의 출전 ────────────────────────────────────────────────────
//   교재에서 온 것   양팔통/음팔통 · 접목운(辰戌丑未) · 천극지충 · 시상일위
//   대표님이 정한 것 25~45점=강점 · 50점 이상=과다 · 천간40:지지60
//   ★뒤엣것은 교재가 아닙니다. 바꾸실 때는 이 파일 맨 위 상수만 고치면 됩니다.

import type { Ohaeng } from '../simsanOhaeng'

export interface Pill { pillar: string; stem: string; branch: string }

// ── 대표님이 정한 잣대 (교재 아님) ──────────────────────────────────
export const STRENGTH_MIN = 25      // 강점 지능 하한
export const STRENGTH_MAX = 45      // 강점 지능 상한
export const EXCESS_MIN = 50        // 과다
export const WEIGHT_GAN = 0.4       // 정신(천간)
export const WEIGHT_JI = 0.6        // 현실(지지)

const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_EL: Record<string, Ohaeng> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}
const YANG_STEM = new Set(['甲', '丙', '戊', '庚', '壬'])
const YANG_BRANCH = new Set(['子', '寅', '辰', '午', '申', '戌'])
const GEN: Record<Ohaeng, Ohaeng> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CON: Record<Ohaeng, Ohaeng> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }
const CHUNG: Record<string, string> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
}
const TOJI = new Set(['辰', '戌', '丑', '未'])
const JIJANGAN: Record<string, string[]> = {
  子: ['壬', '癸'], 丑: ['癸', '辛', '己'], 寅: ['戊', '丙', '甲'], 卯: ['甲', '乙'],
  辰: ['乙', '癸', '戊'], 巳: ['戊', '庚', '丙'], 午: ['丙', '己', '丁'], 未: ['丁', '乙', '己'],
  申: ['戊', '壬', '庚'], 酉: ['庚', '辛'], 戌: ['辛', '丁', '戊'], 亥: ['戊', '甲', '壬'],
}
const EL5: Ohaeng[] = ['목', '화', '토', '금', '수']
export type YukchinGroup = '비겁' | '식상' | '재성' | '관성' | '인성'

function yukchinOf(dayEl: Ohaeng, el: Ohaeng): YukchinGroup {
  if (el === dayEl) return '비겁'
  if (GEN[dayEl] === el) return '식상'
  if (CON[dayEl] === el) return '재성'
  if (CON[el] === dayEl) return '관성'
  return '인성'
}
/** 일간과 음양이 같으면 편(偏), 다르면 정(正) */
function jeongPyeon(dayStem: string, ch: string, isStem: boolean): '정' | '편' {
  const dayYang = YANG_STEM.has(dayStem)
  const chYang = isStem ? YANG_STEM.has(ch) : YANG_BRANCH.has(ch)
  return chYang === dayYang ? '편' : '정'
}

/**
 * 육친 묶음 + 정/편 → 십성 제 이름.
 *   ★"정식상" 같은 말이 나오지 않게 하려고 둡니다.
 *     음양이 같으면 비견·식신·편재·편관·편인, 다르면 겁재·상관·정재·정관·정인입니다.
 */
const SIPSIN_NAME: Record<YukchinGroup, { 편: string; 정: string }> = {
  비겁: { 편: '비견', 정: '겁재' },
  식상: { 편: '식신', 정: '상관' },
  재성: { 편: '편재', 정: '정재' },
  관성: { 편: '편관', 정: '정관' },
  인성: { 편: '편인', 정: '정인' },
}
export function sipsinName(grp: YukchinGroup, jp: '정' | '편'): string {
  return SIPSIN_NAME[grp][jp]
}
const chars = (saju: Pill[]) =>
  saju.flatMap(p => [
    { ch: p.stem, isStem: true, pillar: p.pillar },
    { ch: p.branch, isStem: false, pillar: p.pillar },
  ]).filter(x => x.ch && x.ch !== '?')

// ═══════════════════════════════════════════════════════════════
// 1-1. 음양 비율 · 양팔통 / 음팔통
// ═══════════════════════════════════════════════════════════════

export interface EumyangResult {
  yang: number
  eum: number
  yangPct: number
  /** 여덟 글자가 모두 양 */
  yangPaltong: boolean
  /** 여덟 글자가 모두 음 */
  eumPaltong: boolean
  label: string
  say: string
}

export function judgeEumyang(saju: Pill[]): EumyangResult {
  let yang = 0, eum = 0
  for (const c of chars(saju)) {
    const isY = c.isStem ? YANG_STEM.has(c.ch) : YANG_BRANCH.has(c.ch)
    if (isY) yang++; else eum++
  }
  const total = Math.max(1, yang + eum)
  const yangPct = Math.round((yang / total) * 100)
  const yangPaltong = eum === 0 && yang >= 6
  const eumPaltong = yang === 0 && eum >= 6

  let label: string, say: string
  if (yangPaltong) {
    label = '양팔통'
    say = '여덟 글자가 모두 양(陽)입니다. 기운이 밖으로만 뻗어 시원시원하고 추진력이 큽니다. 다만 안으로 접어 쉬는 결이 없어, 지칠 때를 스스로 정해 두셔야 합니다.'
  } else if (eumPaltong) {
    label = '음팔통'
    say = '여덟 글자가 모두 음(陰)입니다. 안으로 모으고 살피는 힘이 깊습니다. 다만 밖으로 내미는 결이 약해, 기회 앞에서 한 박자 늦기 쉽습니다. 먼저 손 드는 연습이 도움이 됩니다.'
  } else if (yangPct >= 70) {
    label = '양 우세'
    say = '양의 기운이 뚜렷합니다. 나서서 벌이고 부딪히며 배우는 결입니다.'
  } else if (yangPct <= 30) {
    label = '음 우세'
    say = '음의 기운이 뚜렷합니다. 물러서서 살피고 다듬으며 나아가는 결입니다.'
  } else {
    label = '음양 균형'
    say = '음과 양이 고릅니다. 나설 때와 물러설 때를 상황에 맞춰 쓸 수 있는 결입니다.'
  }
  return { yang, eum, yangPct, yangPaltong, eumPaltong, label, say }
}

// ═══════════════════════════════════════════════════════════════
// 1-3. 정신(천간 40%) vs 현실(지지 60%)
// ═══════════════════════════════════════════════════════════════

export interface MindRealityResult {
  /** 천간만으로 본 오행 분포 (정신·이상) */
  gan: Record<Ohaeng, number>
  /** 지지만으로 본 오행 분포 (현실·행동) */
  ji: Record<Ohaeng, number>
  topGan: Ohaeng
  topJi: Ohaeng
  /** 이상과 현실이 같은 기운을 가리키는가 */
  aligned: boolean
  say: string
}

export function judgeMindReality(saju: Pill[]): MindRealityResult {
  const gan: Record<Ohaeng, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  const ji: Record<Ohaeng, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  for (const p of saju) {
    const se = STEM_EL[p.stem]; if (se) gan[se] += WEIGHT_GAN * 25
    const be = BRANCH_EL[p.branch]; if (be) ji[be] += WEIGHT_JI * 25
  }
  const top = (m: Record<Ohaeng, number>) => EL5.slice().sort((a, b) => m[b] - m[a])[0]
  const topGan = top(gan), topJi = top(ji)
  const aligned = topGan === topJi
  const say = aligned
    ? `머릿속으로 바라는 것과 몸이 실제로 하는 일이 같은 쪽(${topGan})을 가리킵니다. 생각과 행동이 어긋나지 않아 힘이 덜 듭니다.`
    : `머리는 ${topGan} 쪽을 바라는데 실제 사는 결은 ${topJi} 쪽입니다. 이상과 현실이 다른 자리라, 스스로 «말과 행동이 다르다»고 자책하기 쉽습니다. 어긋난 것이 아니라 두 결을 다 가진 것입니다.`
  return { gan, ji, topGan, topJi, aligned, say }
}

// ═══════════════════════════════════════════════════════════════
// 4-1. 무자론(無字論) · 4-2. 다자론(多字論) · 강점 지능
// ═══════════════════════════════════════════════════════════════

const NO_YUKCHIN_SAY: Record<YukchinGroup, string> = {
  비겁: '내 편이 되어 줄 기운이 없습니다. 혼자 버티는 데 익숙하지만, 그만큼 «내 사람»에 목말라 합니다. 사람을 고를 때 조급해지지 않도록 살펴 주십시오.',
  식상: '밖으로 꺼내는 기운이 없습니다. 속에 든 것은 많은데 표현이 늦어 답답할 때가 있습니다. 말과 글로 꺼내는 연습이 그대로 힘이 됩니다.',
  재성: '손에 쥐는 기운이 없습니다. 돈과 실물에 무심한 듯하면서도 «없으면 어쩌나» 하는 불안이 깊습니다. 숫자를 눈으로 확인하는 습관이 마음을 가라앉힙니다.',
  관성: '나를 눌러 세우는 기운이 없습니다. 틀에 얽매이지 않아 자유롭지만, 스스로 규칙을 만들지 않으면 흐트러지기 쉽습니다. 마감과 약속을 밖에 걸어 두십시오.',
  인성: '받쳐 주는 기운이 없습니다. 기대지 않고 스스로 배워 온 결입니다. 다만 «인정받고 싶다»는 마음이 깊게 자리해, 칭찬 한마디에 크게 흔들릴 수 있습니다.',
}
const MANY_YUKCHIN_SAY: Record<YukchinGroup, { good: string; bad: string }> = {
  비겁: { good: '고집스럽게 밀고 나가는 힘이 큽니다', bad: '남의 말을 안 듣고 혼자 짊어지다 지칩니다' },
  식상: { good: '표현하고 만들어 내는 힘이 큽니다', bad: '말이 앞서고 벌인 일을 다 못 거둡니다' },
  재성: { good: '기회를 잡고 굴리는 힘이 큽니다', bad: '여러 개를 동시에 벌여 어느 것도 깊어지지 않습니다' },
  관성: { good: '책임을 지고 기준을 세우는 힘이 큽니다', bad: '스스로를 몰아세워 몸과 마음이 굳습니다' },
  인성: { good: '깊이 파고들고 받아들이는 힘이 큽니다', bad: '생각만 길어지고 몸이 안 움직입니다' },
}

export interface ExtremeResult {
  /** 점수가 0인 오행 */
  lackingEl: Ohaeng[]
  /** 점수가 0인 육친 (무관·무재…) */
  lackingYukchin: YukchinGroup[]
  /** 50점 이상 오행 */
  excessiveEl: Ohaeng[]
  excessiveYukchin: YukchinGroup[]
  /** 25~45점 — 가장 안정적으로 쓰이는 자리 */
  strengthEl: Ohaeng[]
  strengthYukchin: YukchinGroup[]
  /** 화면·프롬프트에 나갈 줄 */
  lackLines: string[]
  manyLines: string[]
  strengthLines: string[]
}

export function judgeExtremes(
  score: Record<Ohaeng, number>, dayStem: string,
): ExtremeResult {
  const dayEl = STEM_EL[dayStem] ?? '토'
  const Y: Record<YukchinGroup, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 }
  for (const el of EL5) Y[yukchinOf(dayEl, el)] += score[el] ?? 0

  const lackingEl = EL5.filter(el => (score[el] ?? 0) === 0)
  const excessiveEl = EL5.filter(el => (score[el] ?? 0) >= EXCESS_MIN)
  const strengthEl = EL5.filter(el => {
    const v = score[el] ?? 0
    return v >= STRENGTH_MIN && v <= STRENGTH_MAX
  })
  const G = Object.keys(Y) as YukchinGroup[]
  const lackingYukchin = G.filter(g => Y[g] === 0)
  const excessiveYukchin = G.filter(g => Y[g] >= EXCESS_MIN)
  const strengthYukchin = G.filter(g => Y[g] >= STRENGTH_MIN && Y[g] <= STRENGTH_MAX)

  return {
    lackingEl, lackingYukchin, excessiveEl, excessiveYukchin, strengthEl, strengthYukchin,
    lackLines: lackingYukchin.map(g => `무${g[0]} — ${NO_YUKCHIN_SAY[g]}`),
    manyLines: excessiveYukchin.map(g => {
      const m = MANY_YUKCHIN_SAY[g]
      return `${g} 과다(${Math.round(Y[g])}점) — 살리면 ${m.good}. 못 다스리면 ${m.bad}.`
    }),
    strengthLines: strengthYukchin.map(g =>
      `${g} ${Math.round(Y[g])}점 — 넘치지도 모자라지도 않아 가장 고르게 쓰이는 자리입니다.`),
  }
}

// ═══════════════════════════════════════════════════════════════
// 2-1. 시상일위 · 월지 통근
// ═══════════════════════════════════════════════════════════════

export interface SisangResult {
  /** 시간(時天干)의 십성이 원국에 홀로 서 있는가 */
  isSisangIlwi: boolean
  sipsin: string
  say: string
}

export function judgeSisangIlwi(saju: Pill[], dayStem: string): SisangResult {
  const dayEl = STEM_EL[dayStem] ?? '토'
  const hour = saju.find(p => p.pillar === '시주')
  const empty: SisangResult = { isSisangIlwi: false, sipsin: '', say: '' }
  if (!hour?.stem || hour.stem === '?') return empty
  const el = STEM_EL[hour.stem]
  if (!el) return empty
  const grp = yukchinOf(dayEl, el)
  const jp = jeongPyeon(dayStem, hour.stem, true)   // 정/편 — 문구에 쓴다

  // 원국 여덟 글자 가운데 같은 육친이 시간 하나뿐인가
  let count = 0
  for (const c of chars(saju)) {
    const e = c.isStem ? STEM_EL[c.ch] : BRANCH_EL[c.ch]
    if (!e) continue
    if (yukchinOf(dayEl, e) === grp) count++
  }
  const alone = count === 1
  const name = sipsinName(grp, jp)
  return {
    isSisangIlwi: alone,
    sipsin: name,
    say: alone
      ? `시간(時干)에 ${name}이 홀로 서 있습니다. 교재는 이런 자리를 «시상일위»라 하여 귀하게 봅니다. 늦게 드러나는 자리라 젊을 때보다 중년 이후에 빛납니다.`
      : '',
  }
}

// ═══════════════════════════════════════════════════════════════
// 3-2 · 5-1. 일지 지장간 십성 조합 (관인상생 · 식신생재 …)
// ═══════════════════════════════════════════════════════════════

export interface JijangganResult {
  branch: string
  /** 지장간 글자 */
  hidden: string[]
  /** 각 글자의 육친 */
  groups: YukchinGroup[]
  /** 이룬 구조 이름 (관인상생·식신생재 …) */
  structure: string
  say: string
}

const STRUCTURE: Array<{ need: YukchinGroup[]; name: string; say: string }> = [
  { need: ['관성', '인성'], name: '관인상생',
    say: '맡은 자리가 배움으로 이어지는 구조입니다. 조직 안에서 신뢰를 쌓아 올라가는 결이라, 튀기보다 꾸준함으로 인정받습니다.' },
  { need: ['식상', '재성'], name: '식신생재',
    say: '만들어 낸 것이 그대로 돈으로 이어지는 구조입니다. 내 손으로 만든 것을 파는 자리에서 힘이 납니다.' },
  { need: ['재성', '관성'], name: '재생관',
    say: '벌어들인 것이 자리와 이름으로 이어지는 구조입니다. 실적으로 지위를 만드는 결입니다.' },
  { need: ['인성', '비겁'], name: '인생비겁',
    say: '배운 것이 곧 내 힘이 되는 구조입니다. 공부와 자격이 그대로 무기가 됩니다.' },
  { need: ['비겁', '식상'], name: '비겁생식상',
    say: '내 안의 힘이 표현으로 터져 나오는 구조입니다. 스스로 판을 만들어 드러내는 자리가 맞습니다.' },
]

export function judgeDayJijanggan(saju: Pill[], dayStem: string): JijangganResult {
  const dayEl = STEM_EL[dayStem] ?? '토'
  const b = saju.find(p => p.pillar === '일주')?.branch ?? ''
  const hidden = JIJANGAN[b] ?? []
  const groups = hidden.map(h => yukchinOf(dayEl, STEM_EL[h] ?? '토'))
  const set = new Set(groups)
  const found = STRUCTURE.find(s => s.need.every(n => set.has(n)))
  return {
    branch: b, hidden, groups,
    structure: found?.name ?? '',
    say: found?.say ?? (hidden.length
      ? `일지 ${b} 속에 ${[...set].join('·')}이 들어 있습니다. 겉으로 잘 안 드러나지만 실제로 움직일 때 쓰는 기운입니다.`
      : ''),
  }
}

// ═══════════════════════════════════════════════════════════════
// 5-2. 천극지충 · 5-3. 접목운
// ═══════════════════════════════════════════════════════════════

export interface DaeunFlag {
  age: number
  ganji: string
  /** ★월주를 천극지충하는가 — 누구나 여섯 번째 대운에서 한 번 만난다 */
  cheongeukJichung: boolean
  /** 일주를 천극지충하는가 — 사람마다 다르다 */
  dayClash: boolean
  /** 辰戌丑未 대운 — 갈아타는 자리 */
  interchange: boolean
  note: string
}

/**
 * ★2026-07-29 — 「5대운 천극지충」의 정체를 계산으로 확인했습니다.
 *
 *   교재는 «누구나 맞이하는 5대운의 변곡점» 이라 적습니다.
 *   처음에는 대운이 **일주**를 치는 것으로 잡았는데, 그러면 사람마다 걸리기도 하고
 *   안 걸리기도 해서 «누구나» 가 성립하지 않았습니다.
 *
 *   [확인한 것] 대운이 **월주**를 천극지충하는 자리는 계산상 늘 같은 순번입니다.
 *       60갑자 60가지 × 순행·역행 = 120가지를 전부 돌려 보니
 *       **예외 없이 «여섯 번째 대운»** 한 곳에서만 걸렸습니다.
 *     까닭은 간단합니다. 대운은 월주에서 한 칸씩 나아가므로
 *       천간 6칸 = 극 · 지지 6칸 = 충  → 여섯 번째에 둘이 동시에 성립합니다.
 *     첫 대운을 0으로 세면 «5대운» 이 되니, 교재의 표현과 맞습니다.
 *
 *   ★그래서 «누구나» 맞이합니다. 나이는 대운수에 따라 달라집니다(대략 55~65세).
 *   ⚠️ 일주를 치는 천극지충은 따로 dayClash 로 표시합니다. 이쪽은 사람마다 다릅니다.
 */
export function flagDaeunList(
  list: Array<{ age: number; cheongan: string; jiji: string }>,
  saju: Pill[], dayStem: string,
  /**
   * ★2026-07-29 — 학생에게는 «결혼·이직» 같은 어른 말을 쓰지 않습니다.
   *   접목운 설명에 그 말이 있어 17세 리포트 재료로 그대로 새어 나갔습니다.
   *   재료에 있으면 AI 가 꺼내 씁니다. (교훈 BF)
   */
  target: 'student' | 'adult' = 'adult',
): DaeunFlag[] {
  const dayEl = STEM_EL[dayStem] ?? '토'
  const dayBranch = saju.find(p => p.pillar === '일주')?.branch ?? ''
  const monthP = saju.find(p => p.pillar === '월주')
  const monthEl = monthP ? STEM_EL[monthP.stem] : undefined
  const monthBranch = monthP?.branch ?? ''
  /** 극은 방향을 가리지 않는다 — 대운이 치든 원국이 치든 부딪히는 것은 같다 */
  const geukEither = (a?: Ohaeng, b?: Ohaeng) => !!a && !!b && (CON[a] === b || CON[b] === a)

  return list.map(d => {
    const gEl = STEM_EL[d.cheongan]
    // ★월주를 치는 천극지충 — 누구나 여섯 번째 대운에서 한 번 만난다
    const cheongeukJichung = geukEither(gEl, monthEl) && !!monthBranch && CHUNG[monthBranch] === d.jiji
    // 일주를 치는 것 — 사람마다 다르다
    const dayClash = geukEither(gEl, dayEl) && !!dayBranch && CHUNG[dayBranch] === d.jiji
    const interchange = TOJI.has(d.jiji)
    const notes: string[] = []
    if (cheongeukJichung) {
      notes.push('천극지충 — 태어난 달의 기둥을 위아래로 함께 치는 대운입니다. 누구나 한 번은 지나는 인생의 변곡점으로, 자리·일·사는 곳이 크게 바뀌기 쉽습니다. 미리 정리해 두면 훨씬 덜 흔들립니다.')
    }
    if (dayClash && !cheongeukJichung) {
      notes.push('내 자리(일주)를 위아래로 치는 대운입니다. 가까운 사이와 몸 쪽에서 변화가 크니 살펴 주십시오.')
    }
    if (interchange) {
      notes.push(target === 'student'
        ? '접목운 — 辰戌丑未 대운입니다. 사는 자리나 배우는 자리가 바뀌기 쉬운 때입니다(전학·진학·이사).'
        : '접목운 — 辰戌丑未 대운입니다. 새 삶으로 갈아타는 인터체인지 같은 때입니다(결혼·이사·이직·전직).')
    }
    return { age: d.age, ganji: `${d.cheongan}${d.jiji}`, cheongeukJichung, dayClash, interchange, note: notes.join(' ') }
  })
}

// ═══════════════════════════════════════════════════════════════
// 7-1. 액땜 솔루션
// ═══════════════════════════════════════════════════════════════

export interface RemedyResult { lines: string[] }

/**
 * ★교재가 «액땜»이라 부르는 자리를 오늘의 행동으로 옮깁니다.
 *   ⚠️ 겁주지 않습니다. «이렇게 하면 액을 면한다»가 아니라
 *      «몸과 마음을 미리 풀어 두면 덜 흔들린다»는 결로 씁니다. (교훈 AX)
 *   ⚠️ 의료 행위를 권하지 않습니다. 헌혈·부항은 교재의 말이라 그대로 두되
 *      «몸 상태에 맞게, 전문가와 상의해» 라는 단서를 함께 답니다.
 */
export function buildRemedy(a: {
  gisin?: Ohaeng | null
  hardDaeun?: boolean
  excessiveEl?: Ohaeng[]
}): RemedyResult {
  const lines: string[] = []
  if (a.hardDaeun) {
    lines.push('피를 나누는 일(헌혈)이나 몸의 묵은 것을 푸는 일(부항·마사지)은 교재가 든 액땜입니다. 다만 몸 상태에 맞게, 필요하면 전문가와 상의해 정하십시오.')
    lines.push('남을 돕는 일(봉사·기부)로 기운을 내보내면 안으로 뭉친 것이 풀립니다. 액수보다 «꾸준함»이 힘입니다.')
  }
  if (a.gisin) {
    lines.push(`${a.gisin} 기운이 짙어지는 때는 그 색과 방향을 일부러 늘리지 마십시오. 옷·공간·머무는 자리에서 조금만 덜어도 몸이 가벼워집니다.`)
  }
  for (const el of a.excessiveEl ?? []) {
    const how: Record<Ohaeng, string> = {
      목: '벌여 놓은 일을 하나 줄이십시오. 새로 시작하는 대신 이미 있는 것을 마무리하는 달을 두면 좋습니다.',
      화: '말과 결정을 하루 묵히십시오. 급히 답하지 않는 습관 하나가 화(火)를 크게 눅입니다.',
      토: '한자리에 오래 머무는 대신 몸을 움직이십시오. 걷기와 자리 바꾸기가 답답함을 풉니다.',
      금: '잘라 내기 전에 한 번 더 듣는 연습을 하십시오. 기준이 센 만큼 사람이 다칠 수 있습니다.',
      수: '생각을 글로 꺼내 두십시오. 안에서만 굴리면 물이 고여 가라앉습니다.',
    }
    lines.push(`${el} 과다 — ${how[el]}`)
  }
  // ★2026-07-29 — 기획 ⑧ «단순 조언이 아닌 구체적 액션».
  //   전에는 대운이 험할 때만 헌혈·봉사가 나갔습니다. 평온한 대운이면
  //   «하던 대로 하십시오» 한 줄로 끝나 개운 섹션이 비었습니다.
  //   ★항상 나가는 기본 액션 셋을 깔아 둡니다. (교재가 드는 액땜의 결)
  lines.push('몸에서 덜어 내는 일 — 헌혈이나 부항처럼 묵은 것을 빼는 일이 교재가 드는 액땜입니다. 몸 상태에 맞게, 필요하면 전문가와 상의해 정하십시오.')
  lines.push('밖으로 내보내는 일 — 봉사나 기부처럼 남에게 흘려보내면 안으로 뭉친 것이 풀립니다. 액수보다 꾸준함이 힘입니다.')
  lines.push('안을 다스리는 일 — 하루 십 분이라도 숨을 고르거나 걷는 시간을 두십시오. 마음 수련은 기신운을 넘기는 가장 값싼 방법입니다.')
  lines.push('자리를 바꾸는 일 — 잠자리 방향, 책상 위치, 자주 입는 색을 바꾸는 것만으로도 기운의 결이 달라집니다.')
  return { lines }
}

// ═══════════════════════════════════════════════════════════════
//  한 번에 — 프리미엄 재료 묶음
// ═══════════════════════════════════════════════════════════════

export interface DeepResult {
  eumyang: EumyangResult
  mindReality: MindRealityResult
  extremes: ExtremeResult
  sisang: SisangResult
  jijanggan: JijangganResult
  daeunFlags: DaeunFlag[]
  remedy: RemedyResult
}

export function buildDeep(a: {
  saju: Pill[]
  dayStem: string
  score: Record<Ohaeng, number>
  daeunList?: Array<{ age: number; cheongan: string; jiji: string }>
  age?: number
  gisin?: Ohaeng | null
  /** 학생이면 어른 말(결혼·이직)을 빼고 냅니다 */
  target?: 'student' | 'adult'
}): DeepResult {
  const target = a.target ?? (a.age != null && a.age < 20 ? 'student' : 'adult')
  const extremes = judgeExtremes(a.score, a.dayStem)
  const daeunFlags = a.daeunList?.length
    ? flagDaeunList(a.daeunList, a.saju, a.dayStem, target) : []
  const now = a.age != null
    ? [...daeunFlags].reverse().find(d => a.age! >= d.age) : undefined
  return {
    eumyang: judgeEumyang(a.saju),
    mindReality: judgeMindReality(a.saju),
    extremes,
    sisang: judgeSisangIlwi(a.saju, a.dayStem),
    jijanggan: judgeDayJijanggan(a.saju, a.dayStem),
    daeunFlags,
    remedy: buildRemedy({
      gisin: a.gisin,
      hardDaeun: !!(now?.cheongeukJichung || now?.dayClash || now?.interchange),
      excessiveEl: extremes.excessiveEl,
    }),
  }
}

// ═══════════════════════════════════════════════════════════════
// [모듈2 5-2] 재물관 — 정재(안정) vs 편재(큰 재물·투자)
// ═══════════════════════════════════════════════════════════════

export interface WealthStyle {
  jeongJae: number
  pyeonJae: number
  /** 정재 쪽이 차지하는 비율 0~100 */
  jeongPct: number
  label: '안정형' | '확장형' | '균형형' | '무재'
  say: string
  guide: string
}

/**
 * ★재성의 «결»을 가른다. (기획 모듈2 5-2)
 *   정재 = 매달 들어오는 돈. 월급·임대·계약처럼 예측되는 수익.
 *   편재 = 한 번에 크게 움직이는 돈. 사업·투자·수수료처럼 진폭이 큰 수익.
 *   ⚠️ 어느 쪽이 낫다는 뜻이 아닙니다. «내가 편한 방식»을 아는 것이 요점입니다.
 *   ⚠️ 투자 권유로 읽히지 않게 문구를 짰습니다. (교훈 CM — 좋은 말이 더 위험하다)
 */
export function judgeWealthStyle(
  saju: Pill[], dayStem: string, score: Record<Ohaeng, number>,
): WealthStyle {
  const dayEl = STEM_EL[dayStem] ?? '토'
  let jc = 0, pc = 0
  for (const c of chars(saju)) {
    const el = c.isStem ? STEM_EL[c.ch] : BRANCH_EL[c.ch]
    if (!el || yukchinOf(dayEl, el) !== '재성') continue
    if (jeongPyeon(dayStem, c.ch, c.isStem) === '정') jc++; else pc++
  }
  const total = jc + pc
  let jaeScore = 0
  for (const el of EL5) if (yukchinOf(dayEl, el) === '재성') jaeScore += score[el] ?? 0

  if (!total || jaeScore === 0) {
    return {
      jeongJae: 0, pyeonJae: 0, jeongPct: 50, label: '무재',
      say: '재성이 드러나 있지 않습니다. 돈을 «쫓는» 결이 아니라 «따라오게 하는» 결입니다.',
      guide: '수치를 눈으로 확인하는 습관이 특히 도움이 됩니다. 통장을 나누고 달마다 한 번 들여다보는 것만으로도 불안이 크게 줄어듭니다.',
    }
  }
  const jeong = (jaeScore * jc) / total
  const pyeon = (jaeScore * pc) / total
  const jeongPct = Math.round((jeong / Math.max(1, jeong + pyeon)) * 100)
  const label: WealthStyle['label'] =
    jeongPct >= 65 ? '안정형' : jeongPct <= 35 ? '확장형' : '균형형'

  const SAY: Record<string, { say: string; guide: string }> = {
    안정형: {
      say: '정재가 우세합니다. 예측되는 수입에서 마음이 편해지는 결입니다. 크게 벌기보다 새지 않게 지키는 데 강합니다.',
      guide: '고정 수입을 축으로 삼고, 변동이 큰 쪽은 감당할 수 있는 만큼만 곁에 두십시오. 남이 크게 버는 이야기에 흔들릴 때가 이 결의 약한 자리입니다.',
    },
    확장형: {
      say: '편재가 우세합니다. 한 번에 크게 움직이는 돈에 감각이 있습니다. 기회를 알아보는 눈이 빠릅니다.',
      guide: '벌이의 진폭이 큰 만큼 «잃어도 되는 선»을 미리 정해 두셔야 합니다. 정해 두지 않으면 좋은 감각이 오히려 독이 됩니다. 투자 판단은 늘 평소 잣대로 하십시오.',
    },
    균형형: {
      say: '정재와 편재가 반반입니다. 안정된 축 하나와 벌이는 축 하나를 함께 굴릴 수 있는 결입니다.',
      guide: '축을 둘로 나눠 두십시오. 하나가 흔들려도 다른 하나가 받쳐 주면 이 결이 가장 잘 삽니다.',
    },
  }
  return {
    jeongJae: Math.round(jeong), pyeonJae: Math.round(pyeon), jeongPct, label,
    say: SAY[label].say, guide: SAY[label].guide,
  }
}

// ═══════════════════════════════════════════════════════════════
// [모듈2 6-1] 커리어 발복 대운
// ═══════════════════════════════════════════════════════════════

export interface CareerDaeun {
  age: number
  ganji: string
  /** 용신·희신이 드는 대운인가 */
  favorable: boolean
  /** 기신·구신이 드는 대운인가 */
  unfavorable: boolean
  /** 관성(자리·명예)이 드는 대운인가 */
  gwanseong: boolean
  note: string
}

/**
 * ★커리어가 크는 대운을 고른다. (기획 모듈2 6-1)
 *   용신·희신이 들면 «힘이 붙는 때», 관성이 들면 «자리와 이름이 오는 때».
 *   ⚠️ 좋고 나쁨의 판정이 아니라 «어느 때 밀어 볼 만한가» 입니다.
 */
export function flagCareerDaeun(
  list: Array<{ age: number; cheongan: string; jiji: string }>,
  dayStem: string,
  yong?: { yongsin?: Ohaeng; heesin?: Ohaeng; gisin?: Ohaeng; gusin?: Ohaeng } | null,
): CareerDaeun[] {
  const dayEl = STEM_EL[dayStem] ?? '토'
  const good = new Set([yong?.yongsin, yong?.heesin].filter(Boolean) as Ohaeng[])
  const bad = new Set([yong?.gisin, yong?.gusin].filter(Boolean) as Ohaeng[])
  return list.map(d => {
    const els = [STEM_EL[d.cheongan], BRANCH_EL[d.jiji]].filter(Boolean) as Ohaeng[]
    const favorable = els.some(e => good.has(e))
    const unfavorable = els.some(e => bad.has(e))
    const gwanseong = els.some(e => yukchinOf(dayEl, e) === '관성')
    const notes: string[] = []
    if (favorable) notes.push('나를 살리는 기운이 드는 때 — 밀어 볼 만합니다')
    if (gwanseong) notes.push('자리와 이름이 오는 때 — 승진·이직·자격에 힘이 붙습니다')
    if (unfavorable) notes.push('힘이 덜 실리는 때 — 벌이기보다 다지는 쪽이 이롭습니다')
    return { age: d.age, ganji: `${d.cheongan}${d.jiji}`, favorable, unfavorable, gwanseong, note: notes.join(' · ') }
  })
}

// ═══════════════════════════════════════════════════════════════
// [17단계 ④] 목화(외향) vs 금수(내성) — 음양과 «다른 축»
// ═══════════════════════════════════════════════════════════════

export interface MokhwaResult {
  mokhwa: number
  geumsu: number
  mokhwaPct: number
  label: string
  say: string
}

/**
 * ★음양 비율과 헷갈리지 마십시오. 다른 축입니다.
 *   음양   글자 하나하나의 陰陽 — 기운을 밖으로 내미는가 안으로 접는가
 *   목화금수  오행의 방향 — 뻗고 타오르는가(목화) 거두고 가라앉는가(금수)
 *   ★둘이 어긋나는 사람이 있습니다. «양인데 금수»면 겉은 활달한데 속은 차분합니다.
 *     그 어긋남이 이 사람을 설명하는 가장 좋은 재료가 됩니다.
 */
export function judgeMokhwaGeumsu(score: Record<Ohaeng, number>): MokhwaResult {
  const mokhwa = (score['목'] ?? 0) + (score['화'] ?? 0)
  const geumsu = (score['금'] ?? 0) + (score['수'] ?? 0)
  const mokhwaPct = Math.round((mokhwa / Math.max(1, mokhwa + geumsu)) * 100)
  const label = mokhwaPct >= 65 ? '목화 우세' : mokhwaPct <= 35 ? '금수 우세' : '목화금수 균형'
  const SAY: Record<string, string> = {
    '목화 우세': '뻗어 나가고 드러내는 기운이 셉니다. 사람 앞에 서고 새로 벌이는 일에서 살아납니다. 다만 벌인 것을 거두는 힘은 따로 길러야 합니다.',
    '금수 우세': '거두고 가라앉히는 기운이 셉니다. 살피고 파고들며 마무리하는 데 강합니다. 다만 먼저 나서고 알리는 일은 애써 연습해야 합니다.',
    '목화금수 균형': '뻗는 기운과 거두는 기운이 고릅니다. 벌이는 일과 마무리하는 일을 다 감당할 수 있는 결입니다.',
  }
  return { mokhwa: Math.round(mokhwa), geumsu: Math.round(geumsu), mokhwaPct, label, say: SAY[label] }
}

// ═══════════════════════════════════════════════════════════════
// [17단계 ⑥] 고립 오행과 오장육부
// ═══════════════════════════════════════════════════════════════

/** 오행 ↔ 몸 — 교재가 오행마다 대어 주는 자리 */
const ORGAN: Record<Ohaeng, { organ: string; care: string }> = {
  목: { organ: '간·쓸개, 그리고 눈과 힘줄', care: '늦게까지 깨어 있는 습관이 가장 크게 깎습니다. 술을 줄이고 잠을 앞당기는 것이 첫 걸음입니다.' },
  화: { organ: '심장·소장, 그리고 혈압과 잠', care: '마음이 급해질 때 몸이 먼저 반응합니다. 카페인을 줄이고 숨을 고르는 시간을 하루 한 번 두십시오.' },
  토: { organ: '비장·위장, 그리고 소화', care: '끼니를 거르거나 급히 먹는 것이 가장 해롭습니다. 때를 정해 천천히 드십시오.' },
  금: { organ: '폐·대장, 그리고 피부와 코', care: '건조하고 탁한 공기가 특히 부담입니다. 환기와 물 마시기를 챙기십시오.' },
  수: { organ: '신장·방광, 그리고 뼈와 귀', care: '몸을 차게 두는 것이 가장 나쁩니다. 허리와 발을 따뜻하게 하고 물을 자주 드십시오.' },
}

export interface HealthResult { lines: string[] }

/**
 * 고립·결핍 오행에서 몸 이야기를 낸다. (17단계 ⑥)
 *   ⚠️ 병을 단정하지 않습니다. «살펴 주십시오» 까지만 말합니다. (교훈 AX·병명 정리)
 */
export function judgeHealth(score: Record<Ohaeng, number>): HealthResult {
  const lines: string[] = []
  for (const el of EL5) {
    const v = score[el] ?? 0
    const o = ORGAN[el]
    if (v === 0) {
      lines.push(`${el}이 아예 없습니다 — ${o.organ} 쪽을 평소에 살펴 주십시오. ${o.care}`)
    } else if (v >= EXCESS_MIN) {
      lines.push(`${el}이 넘칩니다(${Math.round(v)}점) — ${o.organ} 쪽에 부담이 몰리기 쉽습니다. ${o.care}`)
    }
  }
  if (!lines.length) lines.push('크게 비거나 넘치는 기운이 없어, 몸 쪽으로 특별히 몰리는 자리는 보이지 않습니다.')
  return { lines }
}

// ═══════════════════════════════════════════════════════════════
// [17단계 ⑦] 대운 정밀 — 학창시절 · 조토/습토
// ═══════════════════════════════════════════════════════════════

/** 辰丑은 습토(축축한 흙), 戌未는 조토(마른 흙) — 접목운의 결이 다르다 */
const WET_TOJI = new Set(['辰', '丑'])
const DRY_TOJI = new Set(['戌', '未'])

export interface EarlyDaeun {
  age: number
  ganji: string
  /** 그 대운의 육친 (지지 기준) */
  group: YukchinGroup
  /** 학마운 — 재성이 인성을 극해 배움이 흔들리는 때 */
  hakma: boolean
  say: string
}

/**
 * 1~2대운(학창시절)을 본다. (17단계 ⑦)
 *   인성운 = 배움이 붙는 때 · 식상운 = 표현이 트이는 때
 *   ★재성운 = «학마운». 재성이 인성을 극해 공부에서 마음이 뜨는 때로 봅니다.
 */
export function judgeEarlyDaeun(
  list: Array<{ age: number; cheongan: string; jiji: string }>,
  dayStem: string,
): EarlyDaeun[] {
  const dayEl = STEM_EL[dayStem] ?? '토'
  const SAY: Record<YukchinGroup, string> = {
    인성: '배움이 붙는 때입니다. 공부한 것이 그대로 쌓입니다.',
    식상: '표현이 트이는 때입니다. 말과 글, 만드는 일에서 두각이 납니다.',
    재성: '★학마운 — 손에 잡히는 것에 마음이 쏠려 공부에서 마음이 뜨기 쉽습니다. 나무라기보다 «왜 지금 딴 데를 보는지»를 함께 살펴 주십시오.',
    관성: '틀과 규율이 들어오는 때입니다. 성적보다 태도가 먼저 잡힙니다.',
    비겁: '또래와 어울리는 힘이 커지는 때입니다. 친구가 성적을 좌우합니다.',
  }
  return list.slice(0, 2).map(d => {
    const el = BRANCH_EL[d.jiji] ?? '토'
    const group = yukchinOf(dayEl, el)
    return {
      age: d.age, ganji: `${d.cheongan}${d.jiji}`, group,
      hakma: group === '재성',
      say: SAY[group],
    }
  })
}

/** 접목운의 결 — 습토냐 조토냐 */
export function interchangeFlavor(jiji: string): string {
  if (WET_TOJI.has(jiji)) {
    return `${jiji}는 습토(축축한 흙)입니다. 젖은 땅이라 갈아타는 일이 더디게, 그러나 깊게 일어납니다. 서두르지 않아도 됩니다.`
  }
  if (DRY_TOJI.has(jiji)) {
    return `${jiji}는 조토(마른 흙)입니다. 마른 땅이라 갈아타는 일이 급하게 옵니다. 미리 준비해 두지 않으면 떠밀리듯 바뀝니다.`
  }
  return ''
}
