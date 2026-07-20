// lib/saju/yongsinNew.ts
// ============================================================================
//  용신 계산기 (100점 점수론 기반) — 조후·억부·격국 3종 독립 산출
//  출전: 연재쌤 정리(NotebookLM)
//  기준문서: 용신재설계_기준문서_v1.md
//
//  ★ 기존 simsanOhaeng(적성용)과 별개. 여기서는 辰戌丑未를 '본기 土'로 본다.
//    (적성·직업 = 계절치환 / 건강·궁합·용신 = 본기 土)
//
//  화면 표시 규격:
//    - 조후용신: 용신 1개만
//    - 억부용신: 5신 전부 (용·희·기·구·한)
//    - 격국용신: 용신 1개만
//
//  사용:
//    import { calcYongsinNew } from '@/lib/saju/yongsinNew'
//    const r = calcYongsinNew(saju, dayStem)
//    // r.johu.element / r.eokbu.{yongsin,heesin,gisin,gusin,hansin} / r.gyeokguk.{name,element}
// ============================================================================

import { calcSimsanOhaeng } from './simsanOhaeng'

export type Ohaeng = '목' | '화' | '토' | '금' | '수'

export interface Pillar {
  pillar: string   // '년주'|'월주'|'일주'|'시주'
  stem: string
  branch: string
}

// ── 기본 매핑 ───────────────────────────────────────────────────────────────
const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
// 지지 본래 오행 (辰戌丑未 = 土, 계절치환 안 함)
const BRANCH_EL: Record<string, Ohaeng> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}
// 상생: A생B (A가 B를 생함)
const GEN: Record<Ohaeng, Ohaeng> = { 수: '목', 목: '화', 화: '토', 토: '금', 금: '수' }
// 상극: A극B (A가 B를 극함)
const CON: Record<Ohaeng, Ohaeng> = { 수: '화', 화: '금', 금: '목', 목: '토', 토: '수' }

const ALL: Ohaeng[] = ['목', '화', '토', '금', '수']
/** x를 생하는 오행 (x의 인성 방향) */
const saengOf = (x: Ohaeng): Ohaeng => (Object.keys(GEN) as Ohaeng[]).find(k => GEN[k] === x)!
/** x를 극하는 오행 (x의 관성 방향) */
const geukOf = (x: Ohaeng): Ohaeng => (Object.keys(CON) as Ohaeng[]).find(k => CON[k] === x)!

// ── 배점 (100점) ────────────────────────────────────────────────────────────
const STEM_SCORE: Record<string, number> = { 시주: 10, 일주: 10, 월주: 10, 년주: 5 }
const BRANCH_SCORE: Record<string, number> = { 시주: 10, 일주: 15, 월주: 35, 년주: 5 }

/** 용신 전용 오행 점수 (지지 전부 본래 오행 — 辰戌丑未=土) */
export function calcYongsinScore(saju: Pillar[]): Record<Ohaeng, number> {
  const s: Record<Ohaeng, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  for (const { pillar, stem, branch } of saju) {
    const se = STEM_EL[stem]
    if (se) s[se] += STEM_SCORE[pillar] ?? 0
    const be = BRANCH_EL[branch]
    if (be) s[be] += BRANCH_SCORE[pillar] ?? 0
  }
  return s
}

// ── 신강약 판정 (비겁+인성 = X) ──────────────────────────────────────────────
export type Ganghyak = '극신약' | '신약' | '중화' | '신강'
export function judgeStrength(x: number): Ganghyak {
  if (x < 30) return '극신약'
  if (x < 42) return '신약'
  if (x <= 47) return '중화'
  return '신강'
}

// 일간 기준 오행 육친 관계
interface Rel { bigeop: Ohaeng; insung: Ohaeng; siksang: Ohaeng; jaesung: Ohaeng; gwansung: Ohaeng }
function relOf(dayEl: Ohaeng): Rel {
  return {
    bigeop: dayEl,
    insung: saengOf(dayEl),   // 나를 생
    siksang: GEN[dayEl],       // 내가 생
    jaesung: CON[dayEl],       // 내가 극
    gwansung: geukOf(dayEl),   // 나를 극
  }
}

const WINTER = ['亥', '子', '丑']
const SUMMER = ['巳', '午', '未']

// ── ① 조후용신 (용신 1개만) ─────────────────────────────────────────────────
//   ★ 소스 원문(『심산 명리비법 적성노트』151쪽):
//     "조후용신: 건강, 궁합 판단: 巳午未月 여름생(水), 亥子丑月 겨울생(火)"
//   → 신강약과 무관하게 계절만 본다. (극신약 유예·가교오행은 소스에 없어 제거)
//   ※ 소스에 "90%는 이 공식, 10%는 예외"라 적혀 있으나 예외 규칙은 명시돼 있지 않음.
export interface JohuResult { element: Ohaeng | null; note: string }
function calcJohu(monthBranch: string, _dayEl: Ohaeng, _x: number, _score: Record<Ohaeng, number>): JohuResult {
  const isWinter = WINTER.includes(monthBranch)
  const isSummer = SUMMER.includes(monthBranch)
  if (isWinter) return { element: '화', note: '겨울 태생이라 따뜻한 기운이 필요해요' }
  if (isSummer) return { element: '수', note: '여름 태생이라 시원한 기운이 필요해요' }
  return { element: null, note: '봄·가을생은 조후가 온화해요' }
}

// ── ② 억부용신 + 5신 ────────────────────────────────────────────────────────
export interface EokbuResult {
  yongsin: Ohaeng
  heesin: Ohaeng
  gisin: Ohaeng
  gusin: Ohaeng
  hansin: Ohaeng
  note: string
}

// ★★★ 소스 원문: 『심산 명리비법 적성노트』 p.151 「08 용신 찾는 비법」 표
//
//   표는 신강/신약이 아니라 "어떤 육친이 강한가" 5칸으로 나뉜다.
//     신강한 사주(인비가 강함) : 인성 / 비겁
//     신약한 사주(식재관이 강함): 식상 / 재성 / 관성
//
//   ⚠️ 이전 코드는 "신약이면 무조건 인성, 신강이면 무조건 재성"이었다.
//      그래서 재다신약(월지가 재성)인데도 인성이 용신으로 나오는 오류가 있었다.
//      (연재쌤 지적: "월지 재성이면 비겁이 용신이다")
//
//   ⚠️ 희신도 "용신을 생하는 오행"이 아니라 표에 직접 적힌 값을 쓴다.
//      (p.150 정의는 원론이고, 실제 감명은 p.151 표를 따른다)
//
//   ※ 표 아래 단서: "90%의 명식은 위 공식을 따르지만 10% 정도는 예외가 있다."
type Yukchin5 = '비겁' | '식상' | '재성' | '관성' | '인성'
interface GangTable { yong: Yukchin5; hee: Yukchin5; note: string }

const P151_TABLE: Record<Yukchin5, GangTable> = {
  // ── 신강한 사주 (인비가 강함) ──
  인성: { yong: '재성', hee: '식상', note: '인성이 강해 재성으로 눌러 줘요' },
  비겁: { yong: '식상', hee: '재성', note: '비겁이 강해 식상으로 흘려보내요' },
  // ── 신약한 사주 (식재관이 강함) ──
  식상: { yong: '인성', hee: '비겁', note: '식상이 강해 인성으로 다잡아 줘요' },
  재성: { yong: '비겁', hee: '인성', note: '재성이 강해 비겁으로 힘을 보태요' },
  관성: { yong: '인성', hee: '비겁', note: '관성이 강해 인성으로 받아 줘요' },
}

// 월지가 어느 육친인지 — 소스 p.141 "월지가 비겁·인성으로 통근하면 신강,
// 월지가 식재관이면 신약". 즉 신강약도, 무엇이 강한지도 월지가 기준이다.
function yukchinOfEl(dayEl: Ohaeng, el: Ohaeng): Yukchin5 {
  const r = relOf(dayEl)
  if (el === r.bigeop) return '비겁'
  if (el === r.insung) return '인성'
  if (el === r.siksang) return '식상'
  if (el === r.jaesung) return '재성'
  return '관성'
}
function yukchin5ToEl(dayEl: Ohaeng, y: Yukchin5): Ohaeng {
  const r = relOf(dayEl)
  switch (y) {
    case '비겁': return r.bigeop
    case '식상': return r.siksang
    case '재성': return r.jaesung
    case '관성': return r.gwansung
    case '인성': return r.insung
  }
}

// ── 겁재 개수 세기 ──────────────────────────────────────────────────────────
//   p.151 표 "비겁" 칸의 예외: "식상(70%), 관성(겁재 2개 이상)"
//   겁재 = 일간과 같은 오행이면서 음양이 다른 것.
//   ★ 연재쌤 확정: 원국의 천간·지지에 드러난 것만 센다. (지장간은 보지 않는다)
// ── 통근(通根) 순위표 ───────────────────────────────────────────────────────
//   출전: 『심산 명리비법 적성노트』 p.145 「통근 순위」
//   천간 글자가 어느 지지에 뿌리를 내리는지.
const TONGGEUN: Record<string, string[]> = {
  甲: ['卯', '寅', '亥', '辰', '未'], 乙: ['卯', '寅', '亥', '辰', '未'],
  丙: ['午', '巳', '寅', '未', '戌'], 丁: ['午', '巳', '寅', '未', '戌'],
  戊: ['午', '巳', '未', '戌', '辰', '丑'], 己: ['午', '巳', '未', '戌', '辰', '丑'],
  庚: ['酉', '申', '戌', '巳', '丑'], 辛: ['酉', '申', '戌', '巳', '丑'],
  壬: ['子', '亥', '申', '丑', '辰'], 癸: ['子', '亥', '申', '丑', '辰'],
}

// 인성이 원국에 "뿌리"를 내리고 있는가 — p.151 관성 칸의 "인성 뿌리 X" 판정용.
//   원국 천간에 인성 오행 글자가 있고, 그 글자가 지지에 통근했으면 뿌리 있음.
function hasInsungRoot(saju: Pillar[], dayEl: Ohaeng): boolean {
  const insungEl = relOf(dayEl).insung
  const branches = saju.map(p => p.branch).filter(Boolean)
  for (const p of saju) {
    if (!p.stem || STEM_EL[p.stem] !== insungEl) continue
    const roots = TONGGEUN[p.stem] ?? []
    if (branches.some(b => roots.includes(b))) return true
  }
  return false
}

const YANG_BRANCH = new Set(['子', '寅', '辰', '午', '申', '戌'])
const YANG_STEM_SET = new Set(['甲', '丙', '戊', '庚', '壬'])
function countGeopjae(saju: Pillar[], dayStem: string): number {
  const dayEl = STEM_EL[dayStem]
  if (!dayEl) return 0
  const dayIsYang = YANG_STEM_SET.has(dayStem)
  let n = 0
  for (const p of saju) {
    // 천간 — 일간 자신은 제외
    if (p.stem && p.stem !== dayStem && STEM_EL[p.stem] === dayEl) {
      if (YANG_STEM_SET.has(p.stem) !== dayIsYang) n++
    }
    // 지지
    if (p.branch && BRANCH_EL[p.branch] === dayEl) {
      if (YANG_BRANCH.has(p.branch) !== dayIsYang) n++
    }
  }
  return n
}

// 억부 5신 계산 — p.151 표 그대로.
//   "무엇이 강한가"는 육친별 점수 합계로 정한다.
//   ★ 심산 오행 점수(simsanOhaeng)가 이미 월지 계절 치환을 반영하고 있으므로
//     (예: 丑월은 土가 아니라 水로 계산), 그 점수를 그대로 쓰면 계절이 자동 반영된다.
//     연재쌤 확인: "이미 표에 넣어준 것"
//   기신·구신·한신은 p.150 정의대로 계산한다.
//     기신 = 용신을 극 / 구신 = 희신을 극 / 한신 = 나머지
function calcEokbu(dayEl: Ohaeng, score: Record<Ohaeng, number>, saju: Pillar[], dayStem: string): EokbuResult {
  // 오행 점수 → 육친 점수로 합산
  const byYukchin: Record<Yukchin5, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 }
  for (const el of ALL) byYukchin[yukchinOfEl(dayEl, el)] += score[el] ?? 0

  // 가장 강한 육친 (동점이면 비겁 > 인성 > 관성 > 재성 > 식상 순으로 안정 정렬)
  const ORDER: Yukchin5[] = ['비겁', '인성', '관성', '재성', '식상']
  let gang: Yukchin5 = ORDER[0]
  for (const y of ORDER) if (byYukchin[y] > byYukchin[gang]) gang = y

  const row = P151_TABLE[gang]
  let yongYukchin: Yukchin5 = row.yong
  let note = row.note

  // ★ p.151 표 예외 — 비겁이 강한 사주:
  //     "식상(70%), 관성(겁재 2개 이상)"
  //   기본은 식상이지만, 원국에 겁재가 2개 이상이면 관성으로 다스린다.
  //   연재쌤 확정: 겁재는 원국 천간·지지에 드러난 것만 센다. (지장간은 보지 않는다)
  if (gang === '비겁' && countGeopjae(saju, dayStem) >= 2) {
    yongYukchin = '관성'
    note = '겁재가 둘 이상이라 관성으로 다스려요'
  }

  // ★ p.151 표 예외 — 관성이 강한 사주:
  //     "인성(90%), 인성 뿌리 X → 식상"
  //   기본은 인성이지만, 인성이 원국에 뿌리를 못 내렸으면 식상으로 눌러 준다.
  //   (뿌리 판정은 p.145 통근 순위표를 따른다)
  if (gang === '관성' && !hasInsungRoot(saju, dayEl)) {
    yongYukchin = '식상'
    note = '인성이 뿌리가 없어 식상으로 눌러 줘요'
  }

  const yongsin = yukchin5ToEl(dayEl, yongYukchin)
  const heesin = yukchin5ToEl(dayEl, row.hee)
  const gisin = geukOf(yongsin)     // 용신을 극하는 것 (p.150)
  const gusin = geukOf(heesin)      // 희신을 극하는 것 (p.150)
  const hansin = ALL.find(e => ![yongsin, heesin, gisin, gusin].includes(e))!

  return { yongsin, heesin, gisin, gusin, hansin, note }
}

// ── ③ 격국용신 (용신 1개만) ─────────────────────────────────────────────────
// 지장간 (여기, 중기, 본기 순 — 본기가 마지막)
const JIJANGAN: Record<string, string[]> = {
  子: ['壬', '癸'], 丑: ['癸', '辛', '己'], 寅: ['戊', '丙', '甲'], 卯: ['甲', '乙'],
  辰: ['乙', '癸', '戊'], 巳: ['戊', '庚', '丙'], 午: ['丙', '己', '丁'], 未: ['丁', '乙', '己'],
  申: ['戊', '壬', '庚'], 酉: ['庚', '辛'], 戌: ['辛', '丁', '戊'], 亥: ['戊', '甲', '壬'],
}
const YANG_STEM = new Set(['甲', '丙', '戊', '庚', '壬'])
// 십신 (일간 기준 다른 천간)
function sipsinOf(dayStem: string, other: string): string {
  const de = STEM_EL[dayStem], oe = STEM_EL[other]
  if (!de || !oe) return ''
  const same = YANG_STEM.has(dayStem) === YANG_STEM.has(other)
  if (de === oe) return same ? '비견' : '겁재'
  if (GEN[de] === oe) return same ? '식신' : '상관'
  if (CON[de] === oe) return same ? '편재' : '정재'
  if (CON[oe] === de) return same ? '편관' : '정관'   // oe가 de를 극 = 관
  if (GEN[oe] === de) return same ? '편인' : '정인'   // oe가 de를 생 = 인
  return ''
}
// 12격 → 격국용신(상신) 오행 방향 (일간 기준 육친)
// 반환은 '육친종류'가 아니라 dayEl 기준 실제 오행으로 변환해서 씀
type Yukchin = '비겁' | '식상' | '재성' | '관성' | '인성'
const GYEOK_SANGSIN: Record<string, Yukchin> = {
  비견격: '관성', 겁재격: '관성', 건록격: '관성', 양인격: '관성',
  식신격: '재성', 상관격: '인성',      // 식신생재 / 상관패인(소스: 상관격→인성)
  편재격: '식상', 정재격: '식상',
  편관격: '식상', 정관격: '인성',      // 편관: 식상(식신제살) / 정관: 인성(관인상생)
  편인격: '관성', 정인격: '관성',      // 관인상생
}
function yukchinToEl(dayEl: Ohaeng, y: Yukchin): Ohaeng {
  const r = relOf(dayEl)
  switch (y) {
    case '비겁': return r.bigeop
    case '식상': return r.siksang
    case '재성': return r.jaesung
    case '관성': return r.gwansung
    case '인성': return r.insung
  }
}
export interface GyeokgukResult { name: string; element: Ohaeng | null; note: string }
function calcGyeokguk(saju: Pillar[], dayStem: string): GyeokgukResult {
  const dayEl = STEM_EL[dayStem]
  const month = saju.find(p => p.pillar === '월주')
  if (!month) return { name: '', element: null, note: '' }
  const hidden = JIJANGAN[month.branch] ?? []
  const others = saju.filter(p => p.pillar !== '일주').map(p => p.stem)  // 일간 제외
  const bongi = hidden[hidden.length - 1]
  const junggi = hidden.length === 3 ? hidden[1] : null
  const yeogi = hidden[0]

  let gyeokStem = bongi
  if (others.includes(bongi)) gyeokStem = bongi
  else if (junggi && others.includes(junggi)) gyeokStem = junggi
  else if (others.includes(yeogi)) gyeokStem = yeogi
  else gyeokStem = bongi  // 미투출 → 본기

  const name = sipsinOf(dayStem, gyeokStem) + '격'
  const sangsin = GYEOK_SANGSIN[name]
  const element = sangsin ? yukchinToEl(dayEl, sangsin) : null
  return { name, element, note: sangsin ? `${name}이라 ${sangsin}이 격국용신이에요` : name }
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export interface YongsinNewResult {
  score: Record<Ohaeng, number>
  inbiScore: number           // 비겁+인성
  status: Ganghyak
  dayElement: Ohaeng
  johu: JohuResult            // 조후용신 (용신만)
  eokbu: EokbuResult          // 억부용신 (5신)
  gyeokguk: GyeokgukResult    // 격국용신 (용신만)
}

export function calcYongsinNew(saju: Pillar[], dayStem: string, scoreOverride?: Record<Ohaeng, number>): YongsinNewResult | null {
  const dayEl = STEM_EL[dayStem]
  if (!dayEl || saju.length === 0) return null
  const score = scoreOverride ?? calcYongsinScore(saju)
  const r = relOf(dayEl)
  const inbi = score[r.bigeop] + score[r.insung]
  const status = judgeStrength(inbi)
  const monthBranch = saju.find(p => p.pillar === '월주')?.branch ?? ''

  return {
    score,
    inbiScore: inbi,
    status,
    dayElement: dayEl,
    johu: calcJohu(monthBranch, dayEl, inbi, score),
    eokbu: calcEokbu(dayEl, score, saju, dayStem),
    gyeokguk: calcGyeokguk(saju, dayStem),
  }
}

// ============================================================================
// 호환 어댑터 — 낡은 calcYongsin(yongsin.ts)을 쓰던 곳을 최소 수정으로
//   새 억부용신(정확한 100점 계산)으로 옮기기 위한 래퍼.
//
//   반환 형태를 낡은 YongsinResult(heeksin 철자 포함)와 똑같이 맞춘다.
//   → 호출부는 import만 calcYongsin → calcYongsinCompat 로 바꾸면 된다.
//
//   억부용신을 쓰는 이유: 궁합·결혼택일은 "이 사람에게 좋은 오행(용신)"이
//   필요한데, 억부(eokbu)가 5신(용·희·기·구·한)을 다 주므로 딱 맞는다.
//
//   [주의] 이 어댑터는 궁합·결혼택일 전용으로 도입. 다른 화면(작명·운세 등)은
//   기존 calcYongsin을 그대로 쓴다(연재쌤 검수 전까지 결과 안 바꿈).
// ============================================================================

// 낡은 YongsinResult와 동일한 형태 (heeksin 철자 유지)
export interface YongsinCompatResult {
  isStrong: boolean
  yongsin: string
  heeksin: string
  gisin: string
  gusin: string
  hansin: string
  score: Record<string, number>
  description: string
}

export function calcYongsinCompat(
  saju: Pillar[],
  dayStem: string,
  // ★ 양력 월·일·시지 — 넘기면 심산 오행 점수(월지 계절 치환 반영)로 계산한다.
  //   연재쌤 확정: 丑월=水, 未월=火 등 계절 치환이 맞다.
  //   넘기지 않으면 예전처럼 자체 배점(지지를 본래 오행으로)으로 계산한다.
  //   → 호출부를 한 곳씩 옮기는 동안 기존 화면이 깨지지 않게 하기 위함.
  solarMonth?: number,
  solarDay?: number,
  hourBranch?: string | null,
): YongsinCompatResult {
  const useSimsan =
    typeof solarMonth === 'number' && solarMonth >= 1 && solarMonth <= 12 &&
    typeof solarDay === 'number' && solarDay >= 1 && solarDay <= 31
  const score = useSimsan
    ? (calcSimsanOhaeng(saju, solarMonth!, solarDay!, hourBranch ?? null) as Record<Ohaeng, number>)
    : undefined
  const r = calcYongsinNew(saju, dayStem, score)

  // 계산 불가(일간 없음·기둥 없음) → 안전한 빈 결과
  if (!r) {
    return {
      isStrong: false,
      yongsin: '', heeksin: '', gisin: '', gusin: '', hansin: '',
      score: {}, description: '용신을 계산할 수 없어요.',
    }
  }

  const strong = r.status === '신강' || r.status === '중화'
  return {
    isStrong: strong,
    // 억부용신의 5신을 낡은 필드명에 매핑 (heesin → heeksin)
    yongsin: r.eokbu.yongsin,
    heeksin: r.eokbu.heesin,
    gisin: r.eokbu.gisin,
    gusin: r.eokbu.gusin,
    hansin: r.eokbu.hansin,
    score: r.score,
    description: `일간 ${dayStem}(${r.dayElement})은 ${r.status}. 억부 기준 용신은 ${r.eokbu.yongsin}이에요.`,
  }
}
