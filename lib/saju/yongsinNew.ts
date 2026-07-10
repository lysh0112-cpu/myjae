// lib/saju/yongsinNew.ts
// ============================================================================
//  용신 계산기 (심산 명리 100점 점수론 기반) — 조후·억부·격국 3종 독립 산출
//  출전: 심산 『명리적성 비법노트』 + 연재쌤 정리(NotebookLM)
//  기준문서: 용신재설계_기준문서_v1.md
//
//  ★ 기존 simsanOhaeng(적성용)과 별개. 여기서는 辰戌丑未를 '본기 土'로 본다.
//    (적성·직업 = 계절치환 / 건강·궁합·용신 = 본기 土 — 심산 원칙)
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
export interface JohuResult { element: Ohaeng | null; note: string }
function calcJohu(monthBranch: string, dayEl: Ohaeng, x: number, score: Record<Ohaeng, number>): JohuResult {
  const isWinter = WINTER.includes(monthBranch)
  const isSummer = SUMMER.includes(monthBranch)
  if (!isWinter && !isSummer) return { element: null, note: '봄·가을생은 조후가 온화해요' }

  const r = relOf(dayEl)
  const status = judgeStrength(x)

  // 극신약: 조후 유예 → 인성(생명선). 단 토다 등은 억부(병약)에서 다룸
  if (status === '극신약') {
    return { element: r.insung, note: '기운이 약해 먼저 나를 돕는 기운이 필요해요' }
  }
  // 겨울·여름 신약: 가교오행 (겨울 木 / 여름 金)
  if (status === '신약') {
    // 겨울신약이라도 조후오행이 인성/비겁으로 튼튼하면 조후 직행 (딸 케이스)
    const johuEl: Ohaeng = isWinter ? '화' : '수'
    if (score[johuEl] >= 15 && (r.insung === johuEl || r.bigeop === johuEl)) {
      return { element: johuEl, note: isWinter ? '겨울 태생이라 따뜻한 기운이 필요해요' : '여름 태생이라 시원한 기운이 필요해요' }
    }
    return { element: isWinter ? '목' : '금', note: '억부와 조후를 잇는 다리 역할의 기운이에요' }
  }
  // 중화·신강: 조후우선
  return { element: isWinter ? '화' : '수', note: isWinter ? '겨울 태생이라 따뜻한 기운이 필요해요' : '여름 태생이라 시원한 기운이 필요해요' }
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
function calcEokbu(dayEl: Ohaeng, x: number, score: Record<Ohaeng, number>): EokbuResult {
  const r = relOf(dayEl)
  const status = judgeStrength(x)
  let yongsin: Ohaeng
  let note: string

  // 병약 우선: 특정오행 ≥ 50 AND 억부예정오행(인성) == 0
  const maxEntry = (Object.entries(score) as [Ohaeng, number][]).sort((a, b) => b[1] - a[1])[0]
  if (status === '극신약' && maxEntry[1] >= 50 && score[r.insung] === 0) {
    yongsin = geukOf(maxEntry[0])  // 과다한 병 오행을 극하는 약신
    note = '특정 기운이 지나치게 강해, 그것을 다스리는 기운을 씁니다'
  } else if (x < 42) {
    yongsin = r.insung             // 신약 → 인성
    note = '기운이 약해 나를 돕는 기운을 용신으로 삼아요'
  } else {
    yongsin = r.jaesung            // 신강 → 재성(대표)
    note = '기운이 강해 눌러주는 기운을 용신으로 삼아요'
  }

  // 5신
  let heesin = saengOf(yongsin)    // 희신 = 용신을 생
  // 과다 강등: 희신후보 ≥ 30 OR (신강48↑ & ≥25) → 식상으로 대체
  if (score[heesin] >= 30 || (x >= 48 && score[heesin] >= 25)) {
    heesin = GEN[yongsin]          // 용신이 생하는 식상으로 대체
  }
  const gisin = geukOf(yongsin)    // 기신 = 용신을 극
  const gusin = saengOf(gisin)     // 구신 = 기신을 생 (연재쌤 완성표 방식)
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
  식신격: '재성', 상관격: '재성',      // 상관: 재 또는 인 → 대표 재성
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

export function calcYongsinNew(saju: Pillar[], dayStem: string): YongsinNewResult | null {
  const dayEl = STEM_EL[dayStem]
  if (!dayEl || saju.length === 0) return null
  const score = calcYongsinScore(saju)
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
    eokbu: calcEokbu(dayEl, inbi, score),
    gyeokguk: calcGyeokguk(saju, dayStem),
  }
}
