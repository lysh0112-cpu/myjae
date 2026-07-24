// lib/saju/coupleFilterV1.ts
// ============================================================================
//  궁합 판정 엔진 v1 — 심산 기준 (점수·등급 없음)
//
//  ★ 왜 점수제를 버렸나
//    심산 궁합론(『명리적성 비법노트』 232~235쪽)에는 배점·가중치·종합식이 없다.
//    232쪽은 "판단법"의 나열이지 배점표가 아니다. 점수를 내려면 심산에 없는
//    가중치를 우리가 발명해야 하고, 그 순간 근거가 심산이 아니게 된다.
//    238쪽 개운법도 "사주를 좋고 나쁜 것으로 단식 판단을 하면 안 된다"고 못박는다.
//    출산·결혼·이사택일 세 서비스가 이미 같은 이유로 점수제를 버렸다.
//    → 카테고리별 별표(상태 표시)만 두고, 총점은 만들지 않는다.
//
//  ★ 근거 (직접 스캔 확인한 원문만 씀)
//    232쪽 1번  오행 궁합 — 본인에게 없는 오행을 서로 채워 주는지
//    232쪽 2번  조후 — 水火가 가장 중요
//    232쪽 3번  원진·형충해파는 보지 않는다  ← 단, 아래 두 예외
//    232쪽 4번  배우자 궁합 길흉의 판단 기준은 日支
//    232쪽 5번  남자=재성(정재·편재) / 여자=관성(정관·편관)
//    232쪽 6번  무재남·무관녀는 식상 用神이 배우자를 대체
//    232쪽      일간과 일지가 合이면 궁합이 좋다 (天合地合 / 天沖地沖 예시)
//    232·233쪽  月支-日支 계절 반대면 찰떡궁합 / 같으면 부정적 / 丑丑은 이혼 가능성
//    233쪽      재성·관성이 용신·희신이면 좋고 기신이면 불화
//    233쪽      통근·형충공망·태과·비겁에 눌림·천을귀인
//
//  ★ 연재쌤 확정 (2026-07-24)
//    ① 일월(月支-日支) 원진은 안 좋다        ← 232쪽 3번의 예외
//    ② 丑丑은 특정. 未未·午午 등은 해당 없음
//    ③ 성별을 입력받는다 (심산 궁합은 남녀 비대칭이 핵심)
//    ④ 232쪽 일주 天合地合/天沖地沖은 그대로 반영  ← 232쪽 3번의 예외
//    ⑤ 여름·겨울생은 조후 70% 이상 / 봄·가을생은 억부 70%
//    ⑥ 내게 필요한 용신이 상대에게 있나가 제일 중요
//    ⑦ 상대가 많이 갖고 있으면 별을 더, 조금이면 덜
//
//  ★ 재사용 (교훈 E — 만들기 전에 grep)
//    simsanOhaeng.ts  오행 점수 (38쪽 점수론, 원장님 110→100 수정판)
//    yongsinNew.ts    용신 5신 (151쪽 표), 통근 순위 (145쪽)
//    jijiGrade.ts     지지 144칸 등급 (49쪽 + 51~73쪽, 연재쌤 3칸 확정)
//    gongmang.ts      공망
//    gwiin.ts         천을귀인
// ============================================================================

import { calcSimsanOhaeng, type Pillar, type Ohaeng } from './simsanOhaeng'
import { calcYongsinNew } from './yongsinNew'
import { jijiPairText, jijiStars } from './coupleJijiText'
import { getGongmang } from './gongmang'

// ── 상수 ────────────────────────────────────────────────────────────────────
const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_EL: Record<string, Ohaeng> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}
/** 지장간 — 심산 245쪽 표 (여기·중기·정기). 亥에 戊 포함 */
const HIDDEN: Record<string, string[]> = {
  子: ['壬', '', '癸'], 丑: ['癸', '辛', '己'], 寅: ['戊', '丙', '甲'], 卯: ['甲', '', '乙'],
  辰: ['乙', '癸', '戊'], 巳: ['戊', '庚', '丙'], 午: ['丙', '己', '丁'], 未: ['丁', '乙', '己'],
  申: ['戊', '壬', '庚'], 酉: ['庚', '', '辛'], 戌: ['辛', '丁', '戊'], 亥: ['戊', '甲', '壬'],
}
const SEASON: Record<string, '봄' | '여름' | '가을' | '겨울'> = {
  寅: '봄', 卯: '봄', 辰: '봄', 巳: '여름', 午: '여름', 未: '여름',
  申: '가을', 酉: '가을', 戌: '가을', 亥: '겨울', 子: '겨울', 丑: '겨울',
}
const GEN: Record<Ohaeng, Ohaeng> = { 수: '목', 목: '화', 화: '토', 토: '금', 금: '수' }
const CON: Record<Ohaeng, Ohaeng> = { 수: '화', 화: '금', 금: '목', 목: '토', 토: '수' }
const YANG_STEM = new Set(['甲', '丙', '戊', '庚', '壬'])

/** 원진 — 연재쌤 확정 ①에서 쓴다 (일월 원진만) */
const WONJIN: string[][] = [
  ['子', '未'], ['丑', '午'], ['寅', '酉'], ['卯', '申'], ['辰', '亥'], ['巳', '戌'],
]
/** 천간합 — 232쪽 天合地合 판정용 */
const GAN_HAP: string[][] = [
  ['甲', '己'], ['乙', '庚'], ['丙', '辛'], ['丁', '壬'], ['戊', '癸'],
]
/** 지지 육합 */
const JI_HAP: string[][] = [
  ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未'],
]
/** 지지 충 */
const CHUNG: string[][] = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
]
/** 천을귀인 — 일간 기준 (gwiin.ts와 같은 표) */
const CHEON_EUL: Record<string, string[]> = {
  甲: ['丑', '未'], 乙: ['子', '申'], 丙: ['酉', '亥'], 丁: ['酉', '亥'], 戊: ['丑', '未'],
  己: ['子', '申'], 庚: ['丑', '未'], 辛: ['寅', '午'], 壬: ['巳', '卯'], 癸: ['巳', '卯'],
}

const isPair = (a: string, b: string, list: string[][]) =>
  list.some(([x, y]) => (a === x && b === y) || (a === y && b === x))

/** 月支-日支가 봄↔가을인가 — 232쪽 "봄가을은 보통"에 해당하는 자리 */
const isSpringAutumn = (monthBranch: string, dayBranch: string): boolean => {
  const sw = SEASON[monthBranch], si = SEASON[dayBranch]
  return (sw === '봄' && si === '가을') || (sw === '가을' && si === '봄')
}

/**
 * ★2026-07-24 — 두 사람 사이의 계절 궁합
 *
 *   ⚠️ 전에는 이 판정을 judgePerson 안에서 "내 월지 ↔ 내 일지"로 봤다.
 *      그러면 한 사람 사주 구조를 보는 것이라 궁합이 아니다.
 *      대표님 확인(2026-07-24): 부부 궁합이므로 두 사람 관계에서 본다.
 *      → A님 月支 ↔ B님 日支 로 교차해서 본다. 양방향 둘 다 본다.
 *
 *   [남녀 공통 — 233쪽]
 *     계절이 같으면 부정적 / 반대면 긍정적
 *   [여자만 — 232쪽 여자 항목]
 *     반대면 찰떡궁합 / 봄가을은 보통 / 丑丑은 이혼 가능성
 *
 *   232쪽 2번 "조후에서는 水火가 가장 중요" → 여름(火)↔겨울(水)만 '반대'.
 *   봄↔가을은 원문이 "보통"이라 못박았다.
 *
 *   ⚠️ 丑丑은 여기서 다루지 않는다. 丑丑은 둘 다 겨울이라 계절로는 '같음'이고,
 *      "이혼 가능성"이라는 별도 단서는 여자 항목에만 있기 때문이다.
 *      호출부에서 성별을 보고 isChukChuk() 으로 따로 판정한다.
 */
function crossSeason(monthBranch: string, dayBranch: string): SeasonRel {
  const sw = SEASON[monthBranch], si = SEASON[dayBranch]
  if (!sw || !si) return '보통'
  const opposite =
    (sw === '여름' && si === '겨울') || (sw === '겨울' && si === '여름')
  if (opposite) return '반대'
  return sw === si ? '같음' : '보통'
}

/** 丑丑인가 — 232쪽 여자 항목 "丑丑은 이혼 가능성이 크다" (연재쌤 확정 ②: 未未·午午 등은 해당 없음) */
const isChukChuk = (monthBranch: string, dayBranch: string): boolean =>
  monthBranch === '丑' && dayBranch === '丑'

// ── 한글 조사 — 받침 유무로 갈린다. 한자는 우리말 음으로 읽어 판정한다. ──
const HANJA_SOUND: Record<string, string> = {
  甲:'갑',乙:'을',丙:'병',丁:'정',戊:'무',己:'기',庚:'경',辛:'신',壬:'임',癸:'계',
  子:'자',丑:'축',寅:'인',卯:'묘',辰:'진',巳:'사',午:'오',未:'미',
  申:'신',酉:'유',戌:'술',亥:'해',
}
function hasJong(word: string): boolean {
  const last = word[word.length - 1]
  const ch = HANJA_SOUND[last] ?? last
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 !== 0
}
/** 을/를 */
const eul = (w: string) => `${w}${hasJong(w) ? '을' : '를'}`
/** 이/가 */
const iga = (w: string) => `${w}${hasJong(w) ? '이' : '가'}`
/** 와/과 */
const wagwa = (w: string) => `${w}${hasJong(w) ? '과' : '와'}`
/** 오행 이름을 화면용으로 — 한자 병기 */
const EL_LABEL: Record<Ohaeng, string> = {
  목: '나무(木)', 화: '불(火)', 토: '흙(土)', 금: '쇠(金)', 수: '물(水)',
}

// ── 타입 ────────────────────────────────────────────────────────────────────
export type Gender = '남' | '여'
/** 月支-日支 계절 관계 (232쪽) — 두 사람 교차로 본다 */
export type SeasonRel = '반대' | '같음' | '보통'
export type Stars = 1 | 2 | 3 | 4 | 5

export interface PersonInput {
  name: string
  gender: Gender
  saju: Pillar[]           // 년주·월주·일주·시주
  solarMonth: number
  solarDay: number
  hourBranch: string | null
}

/** 한 사람의 기본 분석 */
export interface PersonJudge {
  name: string
  gender: Gender
  dayStem: string
  dayBranch: string
  monthBranch: string
  ohaeng: Record<Ohaeng, number>
  season: '봄' | '여름' | '가을' | '겨울'
  /** 조후로 볼지 억부로 볼지 — 연재쌤 확정 ⑤ */
  useJohu: boolean
  /** 이 사람에게 필요한 오행 (조후 또는 억부 용신) */
  needEl: Ohaeng
  needFrom: '조후' | '억부'
  /** 억부 5신 (참고용) */
  eokbu: { yongsin: Ohaeng; heesin: Ohaeng; gisin: Ohaeng }
  /** 배우자 십신 — 남=재성 / 여=관성 (232쪽 5번) */
  spouseName: '재성' | '관성'
  spouseEl: Ohaeng
  spouseScore: number
  /** 배우자 십신이 없으면 식상이 대체 (232쪽 6번) */
  spouseAbsent: boolean
  /** 배우자 십신 자리 (천간·지지·지장간) */
  spouseWhere: string[]
  /** 배우자 십신이 통근했는가 (233쪽) */
  spouseRooted: boolean
  /** 배우자 십신이 공망에 걸렸는가 (233쪽 형충공망) */
  spouseGongmang: boolean
  /** 일지 십신 — 234·235쪽 해설 열쇠 */
  iljiSipsin: string
  /** 月支-日支 계절 관계 (232·233쪽) */
  /** ⚠️ 한 사람 안에서 본 참고값. 궁합 판정은 judgeCouple 이 교차로 다시 계산한다. */
  seasonRel: SeasonRel
  /** 일월 원진 — 연재쌤 확정 ① */
  wonjinIlWol: boolean
  /** 내 천을귀인 글자 */
  gwiinChars: string[]
  /** 내 사주 안의 천을귀인 위치 */
  gwiinMine: string[]
  gongmang: [string, string]
}

export interface CategoryResult {
  key: string
  title: string
  /** 양방향이면 두 줄, 아니면 한 줄 */
  stars?: Stars
  dual?: { text: string; stars: Stars }[]
  lines: string[]
}

export interface CoupleJudgeV1 {
  a: PersonJudge
  b: PersonJudge
  cats: CategoryResult[]
  /** 보관함 배지 문구 */
  badge: string
  /** 총평 세 덩어리 */
  good: string[]
  watch: string[]
  note: string[]
}

// ── 별 매기기 ───────────────────────────────────────────────────────────────
//   연재쌤 확정 ⑦: 상대가 많이 갖고 있으면 별을 더, 조금이면 덜.
//   구간 근거: simsanOhaeng 은 100점 만점이라 오행 평균이 20점.
//   ⚠️ 이 구간은 연재쌤 최종 확인 대상.
export function starsByScore(pts: number): Stars {
  if (pts >= 30) return 5
  if (pts >= 20) return 4
  if (pts >= 10) return 3
  if (pts >= 1) return 2
  return 1
}

// ── 십신 ────────────────────────────────────────────────────────────────────
function sipsinOf(dayStem: string, other: string): string {
  const de = STEM_EL[dayStem], oe = STEM_EL[other]
  if (!de || !oe) return ''
  const same = YANG_STEM.has(dayStem) === YANG_STEM.has(other)
  if (de === oe) return same ? '비견' : '겁재'
  if (GEN[de] === oe) return same ? '식신' : '상관'
  if (CON[de] === oe) return same ? '편재' : '정재'
  if (CON[oe] === de) return same ? '편관' : '정관'
  return same ? '편인' : '정인'
}

const insungOf = (el: Ohaeng): Ohaeng => (Object.keys(GEN) as Ohaeng[]).find(k => GEN[k] === el)!
const gwansungOf = (el: Ohaeng): Ohaeng => (Object.keys(CON) as Ohaeng[]).find(k => CON[k] === el)!

// ── 한 사람 분석 ────────────────────────────────────────────────────────────
export function judgePerson(p: PersonInput): PersonJudge {
  const byPillar: Record<string, Pillar> = {}
  p.saju.forEach(x => { byPillar[x.pillar] = x })
  const ilju = byPillar['일주']
  const wol = byPillar['월주']

  const dayStem = ilju?.stem ?? ''
  const dayBranch = ilju?.branch ?? ''
  const monthBranch = wol?.branch ?? ''
  const dayEl = STEM_EL[dayStem]

  const ohaeng = calcSimsanOhaeng(p.saju, p.solarMonth, p.solarDay, p.hourBranch)
  const season = SEASON[monthBranch] ?? '봄'

  // ── 연재쌤 확정 ⑤ — 여름·겨울생은 조후, 봄·가을생은 억부 ──
  const useJohu = season === '여름' || season === '겨울'

  const yong = calcYongsinNew(p.saju, dayStem, ohaeng)
  // calcYongsinNew 는 일간·명식이 불완전하면 null 을 돌려준다.
  //   ⚠️ 조용히 넘어가면 안 되므로(교훈 U) 기본값을 두되, 억부는 참고용이라
  //     needEl 은 조후(계절)로 대체된다. 봄·가을생이면 아래 needEl 계산에서
  //     eokbu.yongsin 이 쓰이므로, null 일 때는 일간 오행을 그대로 둔다.
  const eokbu = yong
    ? {
        yongsin: yong.eokbu.yongsin,
        heesin: yong.eokbu.heesin,
        gisin: yong.eokbu.gisin,
      }
    : { yongsin: dayEl, heesin: dayEl, gisin: CON[dayEl] }
  // 조후로 볼 때: 겨울생은 火, 여름생은 水 (232쪽 2번 — 조후에서는 水火가 가장 중요)
  const johuEl: Ohaeng = season === '겨울' ? '화' : '수'
  const needEl: Ohaeng = useJohu ? johuEl : eokbu.yongsin
  const needFrom: '조후' | '억부' = useJohu ? '조후' : '억부'

  // ── 배우자 십신 (232쪽 5번) ──
  const spouseName: '재성' | '관성' = p.gender === '남' ? '재성' : '관성'
  const spouseEl: Ohaeng = p.gender === '남' ? CON[dayEl] : gwansungOf(dayEl)

  // 배우자 십신이 어디에 있는가 (천간 + 지지 + 지장간)
  const spouseWhere: string[] = []
  const posName: Record<string, string> = { 년주: '년', 월주: '월', 일주: '일', 시주: '시' }
  for (const q of p.saju) {
    const pn = posName[q.pillar] ?? ''
    if (STEM_EL[q.stem] === spouseEl) spouseWhere.push(`${pn}간 ${q.stem}`)
    if (BRANCH_EL[q.branch] === spouseEl) spouseWhere.push(`${pn}지 ${q.branch}`)
    else {
      for (const h of HIDDEN[q.branch] ?? []) {
        if (h && STEM_EL[h] === spouseEl) spouseWhere.push(`${pn}지 ${q.branch} 속 ${h}`)
      }
    }
  }
  const spouseAbsent = spouseWhere.length === 0
  const spouseScore = ohaeng[spouseEl] ?? 0
  // 통근 — 지지 본기가 배우자 오행이면 뿌리 있음 (233쪽 "재성이 뿌리를 내리면")
  const spouseRooted = p.saju.some(q => BRANCH_EL[q.branch] === spouseEl)

  // 공망 (233쪽 재성 형충공망)
  const gongmang = ilju ? getGongmang(ilju.stem, ilju.branch) : ['', ''] as [string, string]
  const spouseGongmang = p.saju.some(
    q => BRANCH_EL[q.branch] === spouseEl && gongmang.includes(q.branch),
  )

  // 일지 십신 (232쪽 4번 — 판단 기준은 日支)
  const iljiSipsin = dayBranch ? sipsinOf(dayStem, HIDDEN[dayBranch]?.[2] ?? '') : ''

  // ── 月支-日支 계절 (한 사람 안에서 본 것) ──
  //   ⚠️ 이 값은 "내 사주 구조"를 보는 참고값이다.
  //      궁합 판정(찰떡궁합)은 judgeCouple 에서 두 사람 교차(내 月支 ↔ 상대 日支)로
  //      다시 계산한다. 이 필드를 궁합 근거로 쓰지 마라. (2026-07-24 대표님 확인)
  const seasonRel = crossSeason(monthBranch, dayBranch)

  // ── 일월 원진 (연재쌤 확정 ①) ──
  const wonjinIlWol = isPair(monthBranch, dayBranch, WONJIN)

  // ── 천을귀인 ──
  const gwiinChars = CHEON_EUL[dayStem] ?? []
  const gwiinMine: string[] = []
  for (const q of p.saju) {
    if (gwiinChars.includes(q.branch)) gwiinMine.push(`${posName[q.pillar]}지 ${q.branch}`)
  }

  return {
    name: p.name, gender: p.gender,
    dayStem, dayBranch, monthBranch,
    ohaeng, season, useJohu, needEl, needFrom, eokbu,
    spouseName, spouseEl, spouseScore, spouseAbsent, spouseWhere,
    spouseRooted, spouseGongmang,
    iljiSipsin, seasonRel, wonjinIlWol,
    gwiinChars, gwiinMine, gongmang,
  }
}

// ── 두 사람 판정 ────────────────────────────────────────────────────────────
/**
 * @param spouseTitle 배우자운 카드 제목을 만드는 함수.
 *   ★2026-07-24 메뉴 통합 — 부부면 "○○님의 배우자운", 그 외는 "○○님의 인연운".
 *   안 넘기면 예전처럼 '배우자운'으로 둔다.
 */
export function judgeCouple(
  pa: PersonInput,
  pb: PersonInput,
  spouseTitle: (name: string) => string = (n) => `${n}님의 배우자운`,
): CoupleJudgeV1 {
  const a = judgePerson(pa)
  const b = judgePerson(pb)
  const cats: CategoryResult[] = []

  // ① 필요한 기운을 채워 주는가 — 연재쌤 확정 ⑥ (제일 중요)
  const aHas = b.ohaeng[a.needEl] ?? 0     // 상대가 내 필요 오행을 얼마나 가졌나
  const bHas = a.ohaeng[b.needEl] ?? 0
  const aStars = starsByScore(aHas)
  const bStars = starsByScore(bHas)
  const warmWord = (el: Ohaeng) =>
    el === '화' ? '따뜻한 불(火)' : el === '수' ? '시원한 물(水)' : EL_LABEL[el]

  // ★2026-07-24 고침 — 계절이 같다고 필요 기운까지 같은 것은 아니다.
  //
  //   [무엇이 문제였나]
  //   전에는 계절만 같으면 a.needEl 하나로 "두 분 다 ○○이 필요하다"고 썼다.
  //   실제 사례(정준호 봄생·이경아 봄생)에서 이런 문구가 나갔다.
  //     "두 분 다 봄에 태어나 따뜻한 불(火) 기운이 필요한 사주예요."
  //   그런데 정준호는 火, 이경아는 金 이 필요했다. 이경아 몫이 통째로 틀렸다.
  //
  //   [왜 그런가]
  //   연재쌤 확정 ⑤ — 여름·겨울생은 조후(水火), 봄·가을생은 억부로 본다.
  //   조후는 계절이 정하니 같은 계절이면 같지만, 억부는 사주 구성이 정한다.
  //   그래서 봄생 둘이라도 한 명은 火, 한 명은 金 이 될 수 있다.
  //
  //   → 계절이 같은지가 아니라 needEl 이 같은지로 갈린다.
  const sameNeed = a.needEl === b.needEl
  const seasonLine = sameNeed
    ? (a.season === b.season
        ? `두 분 다 ${a.season}에 태어나 ${warmWord(a.needEl)} 기운이 필요한 사주예요.`
        : `${a.name}님은 ${a.season}생, ${b.name}님은 ${b.season}생이신데 두 분 다 ${warmWord(a.needEl)} 기운이 필요해요.`)
    : `${a.name}님은 ${a.season}생이라 ${EL_LABEL[a.needEl]}, ${b.name}님은 ${b.season}생이라 ${EL_LABEL[b.needEl]} 기운이 필요해요.`
  cats.push({
    key: 'need',
    title: '필요한 기운을 채워 주는가',
    // ★2026-07-24 — 양방향 두 줄을 없애고 별 하나로 합쳤다. (대표님 지시)
    //   [왜]
    //   바로 위 오행 비교 카드(막대 그래프)가 두 사람의 기운 분포를 이미
    //   그림으로 보여 준다. 같은 이야기를 글로 또 늘어놓으면 화면만 길어진다.
    //   [별을 어떻게 합쳤나]
    //   높은 쪽을 쓴다. (대표님 확정)
    //   한쪽만 채워 줘도 "채워 주는 자리가 있다" 는 것이 이 카드의 뜻이라,
    //   낮은 쪽으로 깎으면 있는 복을 없는 것처럼 보이게 된다.
    //   ⚠️ 옛 두 줄 문구는 지우지 않고 아래 주석에 남긴다. 되살릴 때 쓴다.
    //      { text: `${b.name}님이 ${a.name}님께 ${EL_LABEL[a.needEl]} 기운을 나눠 주세요`, stars: aStars }
    //      { text: `${a.name}님이 ${b.name}님께 ${EL_LABEL[b.needEl]} 기운을 나눠 주세요`, stars: bStars }
    stars: (Math.max(aStars, bStars) as Stars),
    lines: [seasonLine],
  })

  // ② 서로에게 귀인이 되는가 — 연재쌤 지시
  //
  //   ★2026-07-24 문구 손질 (대표님 지시)
  //     [무엇이 문제였나]
  //     · 두 줄의 주어가 서로 달라 방향이 헷갈렸다.
  //         "류도이님의 子·子가 홍길동님께 천을귀인이 됩니다."   (주어=글자)
  //         "홍길동님 사주에는 류도이님의 귀인이 없어요."        (주어=사주)
  //       뒤 문장이 "홍길동님께 귀인이 없다"로 읽혀 서운하게 들린다.
  //     · 둘 다 없을 때 "없어요"만 두 번 나와 야박했다.
  //
  //     [어떻게 고쳤나]
  //     · 주어를 사람으로 통일해 "누가 누구에게" 가 분명해지게 했다.
  //     · 없을 때는 단정 대신 "이 자리로는 맺어지지 않았다"로 눅이고,
  //       둘 다 없으면 위로 한 줄을 덧붙인다. (238쪽 개운법의 태도)
  //
  //   ⚠️ 궁합에서는 천을귀인만 본다. 심산 232·233쪽이 천을귀인만 말하기 때문이다.
  //      사주 원국 화면은 귀인 8종을 다 보여 주므로, 고객이 "내 사주엔 귀인이
  //      많던데?" 하고 생각하실 수 있다. 그래서 아래 안내 한 줄을 넣는다.
  const aGetsGwiin = pb.saju.filter(q => a.gwiinChars.includes(q.branch)).map(q => q.branch)
  const bGetsGwiin = pa.saju.filter(q => b.gwiinChars.includes(q.branch)).map(q => q.branch)
  const gwiinLines: string[] = []

  if (bGetsGwiin.length)
    gwiinLines.push(`${a.name}님은 ${b.name}님께 귀인이 되어 드립니다. (${bGetsGwiin.join('·')})`)
  else
    gwiinLines.push(`${a.name}님은 ${b.name}님의 귀인 글자를 지니지 않으셨어요.`)

  if (aGetsGwiin.length)
    gwiinLines.push(`${b.name}님은 ${a.name}님께 귀인이 되어 드립니다. (${aGetsGwiin.join('·')})`)
  else
    gwiinLines.push(`${b.name}님은 ${a.name}님의 귀인 글자를 지니지 않으셨어요.`)

  const bothGwiin = aGetsGwiin.length > 0 && bGetsGwiin.length > 0
  const oneGwiin = aGetsGwiin.length > 0 || bGetsGwiin.length > 0

  if (!oneGwiin) {
    // 둘 다 없을 때 — 여기서 끝내면 야박하다. 뜻을 정확히 전하고 다독인다.
    gwiinLines.push('궁합에서 보는 귀인은 천을귀인 하나예요. 이 자리로 맺어지지 않았을 뿐, 두 분 사이가 부족하다는 뜻은 아닙니다.')
    gwiinLines.push('서로를 살펴 주는 마음이 곧 귀인의 자리를 대신합니다.')
  } else if (!bothGwiin) {
    gwiinLines.push('한쪽으로 흐르는 자리예요. 받은 분이 먼저 마음을 내어 드리면 두 분 사이가 고르게 됩니다.')
  }

  cats.push({
    key: 'gwiin',
    title: '서로에게 귀인이 되는가',
    // ⚠️ 이 구간은 연재쌤 최종 확인 대상 (8장 ①)
    stars: bothGwiin ? 5 : oneGwiin ? 3 : 2,
    lines: gwiinLines,
  })

  // ③ 없는 오행을 채워 주는가 (232쪽 1번)
  const ALL: Ohaeng[] = ['목', '화', '토', '금', '수']
  const aZero = ALL.filter(e => (a.ohaeng[e] ?? 0) === 0)
  const bZero = ALL.filter(e => (b.ohaeng[e] ?? 0) === 0)
  const aFilled = aZero.filter(e => (b.ohaeng[e] ?? 0) > 0)
  const bFilled = bZero.filter(e => (a.ohaeng[e] ?? 0) > 0)
  const ohLines: string[] = []
  if (aFilled.length) {
    const where = pb.saju
      .filter(q => STEM_EL[q.stem] === aFilled[0] || BRANCH_EL[q.branch] === aFilled[0])
      .map(q => (STEM_EL[q.stem] === aFilled[0] ? q.stem : q.branch))
    ohLines.push(`${a.name}님께 없는 ${eul(aFilled.map(e => EL_LABEL[e]).join('·'))} ${b.name}님이 지니고 계세요.${where.length ? ` (${where.join('·')})` : ''}`)
  } else if (aZero.length) {
    ohLines.push(`${a.name}님께 없는 ${aZero.map(e => EL_LABEL[e]).join('·')} 기운은 ${b.name}님께도 없어요.`)
  } else {
    ohLines.push(`${a.name}님은 다섯 기운이 고루 있어 따로 채워 받을 자리가 없습니다.`)
  }
  if (bFilled.length) {
    ohLines.push(`${b.name}님께 없는 ${eul(bFilled.map(e => EL_LABEL[e]).join('·'))} ${a.name}님이 지니고 계세요.`)
  } else if (bZero.length) {
    ohLines.push(`${b.name}님께 없는 ${bZero.map(e => EL_LABEL[e]).join('·')} 기운은 ${a.name}님께도 없어요.`)
  } else {
    ohLines.push(`${b.name}님은 다섯 기운이 고루 있어 따로 채워 받을 자리가 없습니다.`)
  }
  const bothFill = aFilled.length > 0 && bFilled.length > 0
  const oneFill = aFilled.length > 0 || bFilled.length > 0
  cats.push({
    key: 'ohaeng',
    title: '없는 오행을 채워 주는가',
    stars: bothFill ? 5 : oneFill ? 4 : (aZero.length === 0 && bZero.length === 0) ? 3 : 2,
    lines: ohLines,
  })

  // ④ 두 분 일주가 만나는 자리 (232쪽 + 49쪽 지지 등급)
  const ganHap = isPair(a.dayStem, b.dayStem, GAN_HAP)
  const jiHap = isPair(a.dayBranch, b.dayBranch, JI_HAP)
  const jiChung = isPair(a.dayBranch, b.dayBranch, CHUNG)
  const ganEl1 = STEM_EL[a.dayStem], ganEl2 = STEM_EL[b.dayStem]
  const ganChung = CON[ganEl1] === ganEl2 || CON[ganEl2] === ganEl1

  // ⚠️ 비대칭이다 — 내가 상대를 볼 때와 상대가 나를 볼 때가 다르다.
  //    (辰→寅 은 C, 寅→辰 은 B) 한쪽만 쓰면 판정이 한쪽으로 기운다.
  const pairAB = jijiPairText(a.dayBranch, b.dayBranch)
  const pairBA = jijiPairText(b.dayBranch, a.dayBranch)

  const iljuLines: string[] = []
  iljuLines.push(`${a.dayStem}${a.dayBranch} ↔ ${b.dayStem}${b.dayBranch}`)
  if (ganHap && jiHap) iljuLines.push('천간도 지지도 합이 되는 天合地合이에요. 심산이 좋다고 본 자리입니다.')
  else if (ganChung && jiChung) iljuLines.push('천간도 지지도 충이 되는 天沖地沖이에요. 성격이 부딪히기 쉬운 자리입니다.')
  else if (jiChung) iljuLines.push('일지가 충으로 마주해 서로 다른 방향을 볼 수 있어요.')
  else if (jiHap) iljuLines.push('일지가 육합으로 만나 서로 잘 어울리는 자리예요.')
  else iljuLines.push('충으로 부딪히지도, 강하게 합하지도 않는 중간 자리예요.')
  if (pairAB?.text) iljuLines.push(pairAB.text)

  cats.push({
    key: 'ilju',
    title: '두 분 일주가 만나는 자리',
    lines: iljuLines,
    dual: [
      { text: `${a.name}님 쪽에서 본 자리`, stars: (ganHap && jiHap) ? 5 : (pairAB ? jijiStars(pairAB.grade) : 3) },
      { text: `${b.name}님 쪽에서 본 자리`, stars: (ganHap && jiHap) ? 5 : (pairBA ? jijiStars(pairBA.grade) : 3) },
    ],
  })

  // ⑤⑥ 각자의 배우자운 (232쪽 5번 · 233쪽 · 일월 원진)
  for (const x of [a, b]) {
    const lines: string[] = []
    const genderWord = x.gender === '남' ? '남성' : '여성'
    const hanja = x.spouseName === '재성' ? '財' : '官'
    if (x.spouseAbsent) {
      lines.push(`${genderWord}은 ${x.spouseName}(${hanja})이 배우자 자리인데, 원국에 드러나지 않았어요. 이럴 땐 식상이 그 자리를 대신한다고 봅니다.`)
    } else {
      lines.push(`${genderWord}은 ${x.spouseName}(${hanja})이 배우자 자리예요. (${x.spouseWhere.slice(0, 2).join(' · ')})`)
      if (x.spouseScore >= 20) lines.push(`${EL_LABEL[x.spouseEl]} ${x.spouseName}이 넉넉해 배우자 자리가 든든한 편입니다.`)
      else if (x.spouseScore >= 10) lines.push(`${EL_LABEL[x.spouseEl]} ${x.spouseName}이 알맞게 자리하고 있어요.`)
      else lines.push(`${EL_LABEL[x.spouseEl]} ${x.spouseName}이 옅은 편이라, 서로 살펴 주시는 노력이 값을 합니다.`)
      if (x.spouseRooted) lines.push('그 기운이 지지에 뿌리를 내리고 있어 힘을 씁니다.')
      else lines.push('다만 지지에 뿌리를 두지 못해 조금 떠 있는 모양이에요.')
      if (x.spouseGongmang) lines.push('배우자 자리가 공망과 겹쳐, 마음을 더 기울이셔야 하는 자리입니다.')
    }
    if (x.iljiSipsin) {
      const t = iljiText(x.gender, x.iljiSipsin)
      lines.push(t ? `배우자 자리가 ${x.iljiSipsin}이에요. ${t.body}` : `배우자 자리가 ${x.iljiSipsin}이에요.`)
    }
    lines.push(x.wonjinIlWol
      ? `월지 ${wagwa(x.monthBranch)} 일지 ${iga(x.dayBranch)} 원진으로 얽혀, 마음이 예민해지기 쉬운 구조예요.`
      : `월지 ${wagwa(x.monthBranch)} 일지 ${iga(x.dayBranch)} 원진으로 얽히지 않아 마음이 어지럽지 않은 구조예요.`)
    // ★계절 궁합 — 두 사람 교차 (내 月支 ↔ 상대 日支)
    //   2026-07-24 대표님 확인: 부부 궁합이므로 두 사람 관계에서 본다.
    //
    //   [남녀 공통 — 233쪽]
    //     » 계절이 같으면 부정적이고 月支의 계절과 日支가 반대면 긍정적이다.
    //   [여자만 추가 — 232쪽 여자 항목]
    //     » 月支와 日支 계절이 반대이면 찰떡궁합이다.
    //        – 봄가을은 보통    – 丑丑은 이혼 가능성이 크다.
    //
    //   ⚠️ 봄가을·丑丑 단서는 232쪽 "여자 항목" 아래에만 있다.
    //      남자에게 붙이면 원문에 없는 판정을 만드는 것이다. (교훈 AA)
    const mate = x === a ? b : a
    const isFemale = x.gender === '여'
    const cs = crossSeason(x.monthBranch, mate.dayBranch)
    const chukChuk = isFemale && isChukChuk(x.monthBranch, mate.dayBranch)
    const springAutumn = isFemale && isSpringAutumn(x.monthBranch, mate.dayBranch)
    const seasonPair = `${x.name}님 월지 ${wagwa(x.monthBranch)} ${mate.name}님 일지 ${iga(mate.dayBranch)}`

    if (chukChuk) {
      // 232쪽 여자 항목 — 원문은 "이혼 가능성이 크다". 대표님 지시로 순화한다.
      lines.push(`${seasonPair} 모두 丑이라 각별히 살피셔야 하는 자리예요.`)
    } else if (cs === '반대') {
      lines.push(isFemale
        ? `${seasonPair} 계절이 서로 반대라 배우자와 아주 잘 맞는 자리예요.`
        : `${seasonPair} 계절이 서로 반대라 배우자와 잘 맞는 자리예요.`)
    } else if (springAutumn) {
      // 여자 항목에만 있는 단서 — 봄가을은 보통
      lines.push(`${seasonPair} 봄·가을로 나뉘어 치우침 없이 무난한 자리예요.`)
    } else if (cs === '같음') {
      lines.push(`${seasonPair} 계절이 같아 기운이 한쪽으로 쏠려 있어요.`)
    }

    // 별: 배우자 자리 상태 종합 (점수·뿌리·공망·원진 + 두 사람 계절)
    //   ★2026-07-24 대표님 지시 — 별점은 그대로 유지한다.
    //     계절 문구는 남녀를 갈라 원문대로 고쳤지만, 별 가감은 건드리지 않는다.
    //     ('같음'·丑丑 에 별을 깎는 안이 있었으나 넣지 않는다)
    let st: Stars = starsByScore(x.spouseScore)
    if (!x.spouseRooted && st > 1) st = (st - 1) as Stars
    if (x.spouseGongmang && st > 1) st = (st - 1) as Stars
    if (x.wonjinIlWol && st > 1) st = (st - 1) as Stars
    if (cs === '반대' && st < 5) st = (st + 1) as Stars

    cats.push({
      key: `spouse_${x === a ? 'a' : 'b'}`,
      title: spouseTitle(x.name),
      stars: st,
      lines,
    })
  }

  // ── 배지 (보관함 목록용) ──
  const badge =
    (aStars >= 3 && bStars >= 3) ? '서로 기운을 채워 주는 사이'
    : bothGwiin ? '서로에게 귀인이 되는 사이'
    : (aStars >= 3 || bStars >= 3) ? '기운을 채워 주는 사이'
    : oneGwiin ? '귀인이 되어 주는 사이'
    : oneFill ? '빈자리를 메워 주는 사이'
    : pairAB?.grade === 'A' ? '일주가 잘 맞는 사이'
    : pairAB?.grade === 'D' ? '서로 다름을 살펴야 할 사이'
    : '차분히 살펴볼 사이'

  // ── 총평 세 덩어리 ──
  const good: string[] = []
  const watch: string[] = []
  const note: string[] = []

  if (aFilled.length) good.push(`${b.name}님이 ${a.name}님께 없는 ${eul(aFilled.map(e => EL_LABEL[e]).join('·'))} 지니고 계세요.`)
  if (bFilled.length) good.push(`${a.name}님이 ${b.name}님께 없는 ${eul(bFilled.map(e => EL_LABEL[e]).join('·'))} 지니고 계세요.`)
  if (bGetsGwiin.length) good.push(`${a.name}님의 ${iga(bGetsGwiin.join('·'))} ${b.name}님께 귀인이 되어 드립니다.`)
  if (aGetsGwiin.length) good.push(`${b.name}님의 ${iga(aGetsGwiin.join('·'))} ${a.name}님께 귀인이 되어 드립니다.`)
  if (!jiChung && !ganChung) good.push('두 분 일주가 충으로 부딪히지 않고 만납니다.')
  if (!a.wonjinIlWol && !b.wonjinIlWol) good.push('두 분 다 월지와 일지가 원진으로 얽히지 않았어요.')
  if (aStars >= 4 || bStars >= 4) good.push('서로에게 필요한 기운을 넉넉히 지니고 계세요.')

  if (a.season === b.season && (a.useJohu || b.useJohu))
    watch.push(`두 분 다 ${a.season}에 나셔서 같은 기운이 필요해요. 서로 온기를 나누는 일이 이 관계의 숙제입니다.`)
  if (a.spouseScore < 10 && b.spouseScore < 10)
    watch.push('두 분 모두 배우자 자리의 기운이 옅은 편이에요. 서로 먼저 살펴 주시는 노력이 값을 합니다.')
  else if (a.spouseScore < 10) watch.push(`${a.name}님의 배우자 자리가 옅은 편이에요.`)
  else if (b.spouseScore < 10) watch.push(`${b.name}님의 배우자 자리가 옅은 편이에요.`)
  if (jiChung) watch.push('두 분 일지가 충으로 마주해, 같은 일을 두고 다르게 보실 수 있습니다.')
  if (a.wonjinIlWol) watch.push(`${a.name}님은 월지와 일지가 원진이라 마음이 예민해지기 쉬워요.`)
  if (b.wonjinIlWol) watch.push(`${b.name}님은 월지와 일지가 원진이라 마음이 예민해지기 쉬워요.`)
  if (pairAB?.grade === 'D' || pairBA?.grade === 'D')
    watch.push('일지가 서로 편치 않은 자리라, 다름을 인정하는 연습이 필요합니다.')

  const ta = a.iljiSipsin ? iljiText(a.gender, a.iljiSipsin) : null
  const tb = b.iljiSipsin ? iljiText(b.gender, b.iljiSipsin) : null
  if (ta) note.push(`${a.name}님은 ${ta.short} 자리예요. (${a.iljiSipsin})`)
  if (tb) note.push(`${b.name}님은 ${tb.short} 자리예요. (${b.iljiSipsin})`)

  return { a, b, cats, badge, good, watch, note }
}

// ============================================================================
//  일지(日支) 십신별 배우자 해설 — 『명리적성 비법노트』 234쪽(남) · 235쪽(여)
//
//  ★ 남녀 표가 대칭이 아니다. 뒤집어 쓰면 안 된다.
//    남자 표 = 그 남자 본인이 어떤 사람인가
//    여자 표 = 어떤 남편을 만나는가 / 남편을 어떻게 대하는가
//
//  ★ 문구는 원문을 그대로 쓰지 않고 부드럽게 옮겼다. (대표님 지시 2026-07-24)
//    돈 내고 보시는 고객에게 "악처", "마마보이 90%", "돈타령한다" 같은 말을
//    그대로 내밀 수 없다. 뜻은 살리되 표현을 눅였다.
//    연인 궁합에도 쓰므로 '남편·아내' 대신 '배우자'로 적었다.
//    ⚠️ 연재쌤 문구 검수 대상.
// ============================================================================

export interface IljiText {
  /** 한 줄 요약 — 카드 제목 옆에 */
  short: string
  /** 본문 */
  body: string
}

/** 남자 일지 — 234쪽. 본인의 성향으로 읽는다. */
const ILJI_MALE: Record<string, IljiText> = {
  비견: { short: '밖에서는 너그럽고 안에서는 뚝심 있는',
    body: '사회에서는 두루 품는 분이신데, 집에서는 뜻을 잘 굽히지 않으세요. 바깥일만큼 집안일에도 마음을 쓰시면 훨씬 편안해집니다.' },
  겁재: { short: '지고는 못 사는 승부사',
    body: '고집과 승부욕, 추진력이 강한 편이세요. 여럿 앞에서 칭찬을 들으면 크게 힘이 나시고, 지적은 오래 담아두시는 편입니다.' },
  식신: { short: '자상하고 처가에 잘하는',
    body: '성품이 자상하고 배우자 쪽 식구들에게도 살뜰하세요. 곁에 있으면 마음이 놓이는 분입니다.' },
  상관: { short: '분위기를 살리는 재주꾼',
    body: '사교적이고 눈치가 빠르며 머리 회전이 좋으세요. 셈이 밝아 살림을 불리는 재주도 있으십니다.' },
  편재: { short: '바깥일에 마음이 많이 가는',
    body: '활동 반경이 넓고 사람을 많이 만나시는 자리예요. 그만큼 집안일에는 마음이 덜 갈 수 있으니, 안팎의 균형을 살펴보시면 좋습니다.' },
  정재: { short: '알뜰하고 반듯한',
    body: '자상하고 경제관념이 밝으세요. 다만 원칙을 중히 여기셔서 융통성이 아쉬울 때가 있습니다.' },
  편관: { short: '스스로에게 엄격한',
    body: '자신을 몰아붙이며 애쓰시는 자리예요. 바깥에서 기운을 다 쓰고 오시는 경우가 많아, 집에서는 조금 느슨해지셔도 좋습니다.' },
  정관: { short: '무슨 일이든 함께 의논하는',
    body: '모든 일을 배우자와 상의하시고 책임감이 깊으세요. 곁에 있는 사람이 든든해지는 자리입니다.' },
  편인: { short: '본가와 마음이 가까운',
    body: '자라온 집과의 정이 깊으세요. 두 집 사이에서 마음이 오갈 수 있으니, 지금 꾸린 가정 쪽으로 무게를 조금 옮기시면 좋습니다.' },
  정인: { short: '반듯하고 성실한',
    body: '모범적이고 성실하세요. 다만 정해진 틀을 좋아하셔서 유연함이 아쉬울 때가 있습니다.' },
}

/** 여자 일지 — 235쪽. 어떤 배우자를 만나는가 / 어떻게 대하는가로 읽는다. */
const ILJI_FEMALE: Record<string, IljiText> = {
  비견: { short: '벗 같은 배우자를 만나는',
    body: '친구처럼 편안한 배우자를 만나는 자리예요. 서로 간섭을 줄이고 인정해 드리면 오래 잘 지내십니다. 자존심을 세워 드리는 게 중요해요.' },
  겁재: { short: '생활력이 강하고 스스로 일구는',
    body: '생활력이 강하고 자수성가하시는 분이에요. 추진력과 리더십을 좋은 쪽으로 쓰시면 크게 이루십니다. 때로는 듣는 쪽에 서 보시면 좋습니다.' },
  식신: { short: '배우자를 살뜰히 챙기는',
    body: '배우자를 아이 돌보듯 살뜰히 챙기시는 자리예요. 마음이 앞서 말이 많아질 수 있으니, 칭찬을 조금 더 얹으시면 집안이 화목해집니다.' },
  상관: { short: '살피는 마음이 깊은',
    body: '배우자의 일을 세세히 살피시는 편이에요. 마음이 쓰여서 그런 것이지만, 지나치면 서로 지칩니다. 다툼이 있을 땐 한 발 물러서 보시면 훨씬 편해집니다.' },
  편재: { short: '현실을 야무지게 챙기는',
    body: '살림과 셈이 야무지신 자리예요. 다만 배우자를 역할로만 보지 않도록, 사람 자체를 존중해 드리면 관계가 깊어집니다.' },
  정재: { short: '알뜰하고 현실적인',
    body: '알뜰하고 현실 감각이 밝으세요. 형편이 넉넉지 않을 때 마음이 먼저 조급해질 수 있으니, 함께 계획을 세우시면 좋습니다.' },
  편관: { short: '듬직하지만 강단 있는 배우자를 만나는',
    body: '강단 있고 원칙이 분명한 배우자를 만나는 자리예요. 때로 버겁게 느껴지실 수 있으니, 마음을 다스리는 시간을 따로 두시면 도움이 됩니다.' },
  정관: { short: '점잖고 반듯한 배우자를 만나는',
    body: '보수적이고 예의 바르며 반듯한 배우자를 만나는 자리예요. 가정과 자녀를 잘 돌보는 분이라 아주 좋습니다.' },
  편인: { short: '꼼꼼히 챙기는 배우자를 만나는',
    body: '세세한 것까지 챙기고 따지는 배우자를 만나는 자리예요. 관심이 지나치면 서로 피곤해지니, 각자의 몫을 정해 두시면 편안해집니다.' },
  정인: { short: '포근하고 든든한 배우자를 만나는',
    body: '포근하면서 집안일도 잘 챙기는, 든든한 배우자를 만나는 자리예요.' },
}

/** 일지 십신 해설 — 성별에 따라 다른 표를 쓴다 (234·235쪽) */
export function iljiText(gender: Gender, sipsin: string): IljiText | null {
  const table = gender === '남' ? ILJI_MALE : ILJI_FEMALE
  return table[sipsin] ?? null
}
