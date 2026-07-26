// lib/saju/coupleFilterV1.ts
// ★★★ VERSION: 2026-07-24-v3 ★★★
//   덮어쓰기가 됐는지 확인하려면 이 줄을 보십시오.
//   이 줄이 없으면 옛 파일입니다.
//   이 판의 변경점:
//     · '필요한 기운을 채워 주는가' 카드 삭제 → 계절 한 줄만 '없는 오행' 카드로
//     · 카드 순서 정렬 (없는오행 → 귀인 → 일주 → 각자 배우자운)
//     · 양방향 두 줄(dual) 제거 — 일주 카드에만 남음
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
//    232쪽 3번  원진·형충파해까지 모두 보면 복잡해진다 (금지가 아니라 주의)
//               → 봐도 된다. 예전 해석 "보지 않는다"는 과한 오독이었음. (대표님 정정)
//    232쪽 4번  배우자 궁합 길흉의 판단 기준은 日支
//    232쪽 5번  남자=재성(정재·편재) / 여자=관성(정관·편관)
//    232쪽 6번  무재남·무관녀는 식상 用神이 배우자를 대체
//    232쪽      일간과 일지가 合이면 궁합이 좋다 (天合地合 / 天沖地沖 예시)
//    232·233쪽  月支-日支 계절 반대면 찰떡궁합 / 같으면 부정적 / 丑丑은 이혼 가능성
//    233쪽      재성·관성이 용신·희신이면 좋고 기신이면 불화
//    233쪽      통근·형충공망·태과·비겁에 눌림·천을귀인
//
//  ★ 연재쌤 확정 (2026-07-24)
//    ① 일월(月支-日支) 원진은 안 좋다        ← 232쪽 3번에서 봐도 된다고 함
//    ② 丑丑은 특정. 未未·午午 등은 해당 없음
//    ③ 성별을 입력받는다 (심산 궁합은 남녀 비대칭이 핵심)
//    ④ 232쪽 일주 天合地合/天沖地沖은 그대로 반영  ← 232쪽 3번에서 봐도 된다고 함
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

/** ★2026-07-25 — 쟁합(爭合)·투합(妬合) 판정. (연재쌤: 부부 어느 쪽이든 있으면 궁합 별로)
 *   한 사주 원국의 네 천간 안에서, 한 글자를 두고 그 합 짝이 둘 이상이면 쟁합/투합.
 *     예: 甲 둘 + 己 하나 → 己 하나를 甲 둘이 다툼 (쟁합)
 *         己 둘 + 甲 하나 → 甲 하나를 己 둘이 다툼 (투합)
 *   양간이 다투면 쟁합, 음간이 다투면 투합이나, 여기선 구분 없이 '있다/없다'만 본다.
 *   (천간합 기준. 지지합 쟁합은 관법이 갈려 넣지 않는다.) */
function hasJaengTuHap(stems: string[]): boolean {
  const count: Record<string, number> = {}
  for (const s of stems) count[s] = (count[s] ?? 0) + 1
  for (const [x, y] of GAN_HAP) {
    // x 가 둘 이상이고 그 합 짝 y 가 하나라도 있으면 → y 를 두고 x 들이 다툼
    if ((count[x] ?? 0) >= 2 && (count[y] ?? 0) >= 1) return true
    if ((count[y] ?? 0) >= 2 && (count[x] ?? 0) >= 1) return true
  }
  return false
}

/** ★2026-07-26 연재쌤 친필 입묘표 — 원문 그대로.
 *   [관성입묘(부성입묘)] — 일간 오행 기준. 아래 간지가 년/월/시에 오면 관성입묘.
 *     木일간 → 辛丑 / 火일간 → 壬辰 / 土일간 → 乙未 / 金일간 → 丙戌 / 水일간 → 戊辰·戊戌
 *   [재성입묘] — 일주(일간) 오행 기준. 아래 간지가 년/월/시에 오면 재성입묘.
 *     木일주 → 戊辰·戊戌 / 火일주 → 辛丑 / 土일주 → 壬辰 / 金일주 → 乙未 / 水일주 → 丙戌
 *   판정: 사주 년·월·시 기둥(일주 제외)에 해당 간지가 있으면 입묘.
 *   ⚠️ 원문 단서: "원국 오행이 강력하게 입묘되면 피해가 없거나 약하다"
 *     → 이 완화 조건은 강약 기준이 필요해 연재쌤 추가 확인 대상. 일단 입묘 여부만 본다. */
const GWANSUNG_IPMYO: Record<Ohaeng, string[]> = {
  목: ['辛丑'], 화: ['壬辰'], 토: ['乙未'], 금: ['丙戌'], 수: ['戊辰', '戊戌'],
}
const JAESUNG_IPMYO: Record<Ohaeng, string[]> = {
  목: ['戊辰', '戊戌'], 화: ['辛丑'], 토: ['壬辰'], 금: ['乙未'], 수: ['丙戌'],
}
/** 사주 년·월·시(일주 제외)에 해당 간지(천간+지지)가 있는가 */
function hasGanjiInYearMonthHour(saju: Pillar[], targets: string[]): boolean {
  for (const q of saju) {
    if (q.pillar === '일주') continue   // 입묘는 년·월·시에 올 때
    if (targets.includes(`${q.stem}${q.branch}`)) return true
  }
  return false
}
/** 천간충 — 표준 4충 (甲庚·乙辛·丙壬·丁癸). 戊己土는 충 없음 */
const GAN_CHUNG: string[][] = [
  ['甲', '庚'], ['乙', '辛'], ['丙', '壬'], ['丁', '癸'],
]
/** 지지 육합 */
const JI_HAP: string[][] = [
  ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未'],
]
/** 지지 충 */
const CHUNG: string[][] = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
]
/** 형(刑) — ⑩ 남자 재성 형충공망 판정용. 삼형·상형·자형 모두 (대표님 지시) */
const SAMHYEONG: string[][] = [
  ['寅', '巳'], ['巳', '申'], ['寅', '申'],   // 삼형 寅巳申
  ['丑', '戌'], ['戌', '未'], ['丑', '未'],   // 삼형 丑戌未
]
const SANGHYEONG: string[][] = [['子', '卯']]  // 상형 子卯
const JAHYEONG = ['辰', '午', '酉', '亥']       // 자형 (같은 글자 둘)
/** 두 지지가 형인가 (삼형·상형·자형) */
function isHyeong(branches: string[]): boolean {
  // 삼형·상형: 두 글자 쌍이 사주 안에 함께 있는가
  for (const pair of [...SAMHYEONG, ...SANGHYEONG]) {
    if (branches.includes(pair[0]) && branches.includes(pair[1])) return true
  }
  // 자형: 같은 글자가 둘 이상
  for (const j of JAHYEONG) {
    if (branches.filter(b => b === j).length >= 2) return true
  }
  return false
}
/** 천을귀인 — 일간 기준 (gwiin.ts와 같은 표) */
const CHEON_EUL: Record<string, string[]> = {
  甲: ['丑', '未'], 乙: ['子', '申'], 丙: ['酉', '亥'], 丁: ['酉', '亥'], 戊: ['丑', '未'],
  己: ['子', '申'], 庚: ['丑', '未'], 辛: ['寅', '午'], 壬: ['巳', '卯'], 癸: ['巳', '卯'],
}
/** 냉(찬) 지지 — ⑦ 월일 조후 판정용. (대표님 지시) 나머지 6개는 온(따뜻) */
const COLD_BRANCH = new Set(['子', '丑', '辰', '申', '酉', '亥'])

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

/** ★2026-07-25 연재쌤 정리 — 두 사람이 태어난 계절(월지)로 보는 궁합.
 *   (앞의 crossSeason 은 월지↔일지 교차였는데, 이건 두 사람 월지↔월지다.)
 *
 *   [원문 "궁합이 부정적일 때" + 연재쌤]
 *     · 겨울(亥子丑)에 태어난 사람 ↔ 여름(巳午未)에 태어난 사람 = 아주 좋다
 *     · 봄(寅卯辰) ↔ 봄(寅卯辰) = 부정적 (같은 계절)
 *     · 가을(申酉戌) ↔ 가을(申酉戌) = 부정적 (같은 계절)
 *   나머지(겨울↔겨울, 여름↔여름, 봄↔가을 등)는 '보통'으로 둔다.
 *   반환: '아주좋음' | '부정' | '보통'
 */
type MonthSeasonRel = '아주좋음' | '부정' | '보통'
function monthSeasonMatch(monthA: string, monthB: string): MonthSeasonRel {
  const sa = SEASON[monthA], sb = SEASON[monthB]
  if (!sa || !sb) return '보통'
  // 겨울 ↔ 여름 = 아주 좋다
  if ((sa === '겨울' && sb === '여름') || (sa === '여름' && sb === '겨울')) return '아주좋음'
  // 봄 ↔ 봄, 가을 ↔ 가을 = 부정적
  if ((sa === '봄' && sb === '봄') || (sa === '가을' && sb === '가을')) return '부정'
  return '보통'
}

/** 丑丑인가 — 232쪽 여자 항목 "丑丑은 이혼 가능성이 크다" (연재쌤 확정 ②: 未未·午午 등은 해당 없음) */
/** ★2026-07-26 연재쌤 — 입묘 완화(일간 통근) 판정용 건록·양인.
 *   건록(建祿): 일간의 정록 지지. 양인(羊刃): 양간의 제왕 지지(음간은 통상 안 봄). */
const GEONROK: Record<string, string> = {
  甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子',
}
const YANGIN: Record<string, string> = {
  甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子',
}

const isChukChuk = (monthBranch: string, dayBranch: string): boolean =>
  monthBranch === '丑' && dayBranch === '丑'

/** ★2026-07-25 연재쌤 확정 — 격각(隔角) 판정. 한 사람 원국의 월지-일지로만 본다.
 *   월지와 일지가 지지 순서에서 한 칸을 건너뛰면 격각.
 *     예: 子월 寅일 → 가운데 丑이 빠짐 → 격각 → 부부 사이가 별로 안 좋다.
 *   ⚠️ 궁합에서 두 사람 일지끼리 보는 격각은 틀린 이론이라 쓰지 않는다.
 *   지지 순서: 子丑寅卯辰巳午未申酉戌亥 (12칸 원형). 두 글자 간격이 정확히 2면 격각. */
const JIJI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
function isGyeokgak(monthBranch: string, dayBranch: string): boolean {
  const mi = JIJI_ORDER.indexOf(monthBranch)
  const di = JIJI_ORDER.indexOf(dayBranch)
  if (mi < 0 || di < 0) return false
  // 원형 거리 (0~6). 정확히 2칸이면 가운데 한 글자가 빠진 격각.
  let d = Math.abs(mi - di)
  if (d > 6) d = 12 - d
  return d === 2
}

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
  /** 배우자 오행이 고립됨 → 부정 (233쪽). 통변 참고용 */
  spouseIsolated: boolean
  /** 배우자 십신이 공망에 걸렸는가 (233쪽 형충공망) */
  spouseGongmang: boolean
  /** 일지 십신 — 234·235쪽 해설 열쇠 */
  iljiSipsin: string
  /** 月支-日支 계절 관계 (232·233쪽) */
  /** ⚠️ 한 사람 안에서 본 참고값. 궁합 판정은 judgeCouple 이 교차로 다시 계산한다. */
  seasonRel: SeasonRel
  /** 일월 원진 — 연재쌤 확정 ① */
  wonjinIlWol: boolean
  /** 여자 丑丑 — 본인 월지·일지가 둘 다 丑 (232쪽: 이혼 가능성). 남자는 항상 false */
  chukChukSelf: boolean
  /** 여자: 관성이 용신·희신이면 귀한 남편 (233쪽). 별 +2. 남자는 항상 false */
  spouseIsYongHee: boolean
  /** 여자: 정관·편관이 각각 2개 이상이면 관살혼잡 (232쪽). 별 -1. 남자는 항상 false */
  gwansalHonjap: boolean
  /** 여자: 관성이 기신이면 부부가 많이 싸운다 (233쪽). 별 -1. 남자는 항상 false */
  spouseIsGisin: boolean
  /** 여자: 무관 사주(천간·본기에 관성 없음) — 남편이 무능·덕 없음. 별 -1. 남자는 항상 false */
  muGwan: boolean
  /** 배우자 별이 천을귀인이면 배우자 덕이 많다 (233쪽). 별 +1. 남녀 공통 */
  gwanIsCheonEul: boolean
  /** 월지·일지가 냉·온 하나씩이면 조후 균형 → 궁합에 좋다. 별 +2. 남녀 공통 */
  johuBalance: boolean
  /** 격각 — 한 사람 월지-일지가 한 칸 건너뜀. 부부 사이 별로. 통변 참고용 */
  gyeokgak: boolean
  /** 재성(관성) 약 + 비겁 강 → 의처증·의부증 소지 (233쪽). 통변 참고용 */
  jaeWeakBigyeopStrong: boolean
  /** 쟁합·투합 — 한 사주 천간에 있으면 궁합 별로. 통변 참고용 */
  jaengTuHap: boolean
  /** 식상 태과 — 너무 강하면 부정 (233쪽). 남녀 공통. 통변 참고용 */
  siksangExcess: boolean
  /** 여자 일지 상관 + 재성 없음 → 부정 (233쪽). 통변 참고용 */
  femaleSanggwanNoJae: boolean
  /** 인성이 있어 위 상관무재를 잡아 주는가 */
  insungHelps: boolean
  /** 년주-일주 복음(같은 간지) → 이혼·재혼 소지 (233쪽). 통변 참고용 */
  bokEum: boolean
  /** 상관과 정관이 이웃해 있음 → 이혼 많이 (233쪽). 통변 참고용 */
  sanggwanJeonggwanNear: boolean
  /** 남자 재다신약 + 비겁 강 → 돈은 벌지만 불화 (233쪽). 통변 참고용 */
  jaeDaBulhwa: boolean
  /** 배우자 입묘 — 여자 관성입묘 / 남자 재성입묘 (연재쌤 친필표). 통변 참고용 */
  spouseIpmyo: boolean
  /** 입묘이나 일간이 통근해 완화됨 (연재쌤: 강하게 입묘되면 피해 적음). 통변 참고용 */
  spouseIpmyoButRooted: boolean
  /** 배우자 별 없음 (여=무관·남=무재). 두 사람 모두면 전생부부 인연 +5. 성별 무관 */
  spouseStarNone: boolean
  /** 남자: 재성이 형·충·공망 모두 걸림 — 배우자 덕 없는 사주. 통변 참고용. 여자는 항상 false */
  jaeHyeongChungGongmang: boolean
  /** 남자: 재성이 뿌리내림(지장간까지) — 배우자 재물운 좋다. 통변 참고용. 여자는 항상 false */
  jaeRootedRich: boolean
  /** 남자: 재성 많음(3개↑ 또는 45%↑) — 고부갈등·백수/악처 소지. 통변 참고용. 여자는 항상 false */
  jaeExcess: boolean
  /** 남자: 재성이 기신 — 악처·부부 불화수. 통변 참고용. 여자는 항상 false */
  jaeIsGisin: boolean
  /** 남자: 재성이 용신·희신 — 현모양처·미모의 배우자. 통변 참고용. 여자는 항상 false */
  jaeIsYongHee: boolean
  /** 남자: 재성이 있음 — 재물운·배우자운·부친운이 있다. 통변 참고용. 여자는 항상 false */
  jaePresent: boolean
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
  /** 통변용 사실 문구 (화면 별점 아님) — 통변 엔진이 순화해서 풀어씀 */
  reasons?: string[]
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

  const ohaeng = calcSimsanOhaeng(p.saju, p.solarMonth, p.solarDay, p.hourBranch, { forCouple: true })
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

  // ── 쟁합·투합 — 한 사주 원국 천간에서. 있으면 궁합 별로 (연재쌤) ──
  const jaengTuHap = hasJaengTuHap(p.saju.map(q => q.stem))

  // ── 입묘 — 연재쌤 친필표. 궁합(배우자)에 해당하는 것만 본다 ──
  //   여자: 관성입묘 → 남편운 불리 (원문: 배우자 불리, 남편 하락운 이별)
  //   남자: 재성입묘 → 배우자운 부족 (원문: 배우자 질병, 배우자복 부족)
  //   ※ 관성입묘 '남자'(자식 인연 박함)는 배우자운이 아니라 궁합에선 제외.
  const gwanIpmyo = hasGanjiInYearMonthHour(p.saju, GWANSUNG_IPMYO[dayEl] ?? [])
  const jaeIpmyo = hasGanjiInYearMonthHour(p.saju, JAESUNG_IPMYO[dayEl] ?? [])
  const spouseIpmyoRaw = p.gender === '여' ? gwanIpmyo : jaeIpmyo

  // 입묘 완화 — 연재쌤: "일간(본인)이 지지에 뿌리가 튼튼하면 입묘 피해가 적다"
  //   튼튼한 경우 = 다음 중 하나:
  //     ① 일지 간여지동 (일간과 일지가 같은 오행. 甲寅·乙卯 등)
  //     ② 월지에 건록 또는 양인
  //     ③ 다른 지지에라도 같은 오행 뿌리 (본기 또는 지장간)
  const ganyeojidong = !!dayBranch && BRANCH_EL[dayBranch] === dayEl
  const monthBr = wol?.branch ?? ''
  const geonrokYangin = monthBr === GEONROK[dayStem] || monthBr === YANGIN[dayStem]
  const otherRoot = p.saju.some(q => {
    if (BRANCH_EL[q.branch] === dayEl) return true
    return (HIDDEN[q.branch] ?? []).some(h => h && STEM_EL[h] === dayEl)
  })
  const dayRooted = ganyeojidong || geonrokYangin || otherRoot
  // 입묘돼도 일간이 튼튼하면(통근) 완화 — 피해 적음
  const spouseIpmyo = spouseIpmyoRaw && !dayRooted   // 뿌리 튼튼하면 입묘 판정 해제
  const spouseIpmyoButRooted = spouseIpmyoRaw && dayRooted   // 입묘지만 뿌리로 완화됨

  // ── 식상(食傷) 태과 — 남녀 공통. 너무 강하면 부정 (233쪽 "식상 강하면 음란") ──
  //   식상 = 일간이 생(生)하는 오행. simsanOhaeng 100점 기준.
  //   ⚠️ 기준(태과 점수)은 연재쌤 검수 대상. 일단 40점 이상을 '태과'로 본다.
  const siksangEl = GEN[dayEl]
  const siksangScore = ohaeng[siksangEl] ?? 0
  const siksangExcess = siksangScore >= 40

  // ── 여자: 일지 상관인데 재성이 없으면 부정 (아래 iljiSipsin 선언 뒤에서 계산) ──
  const jaeElF = CON[dayEl]          // 재성 오행
  const insungElF = insungOf(dayEl)  // 인성 오행
  const insungHelps = (ohaeng[insungElF] ?? 0) >= 10

  // ── 재성(관성) 약 + 비겁 강 → 의처증·의부증 소지 (233쪽 궁합 부정) ──
  //   ⚠️ 기준(약/강 점수)은 연재쌤 검수 대상. 일단 아래로 잡았다.
  //     재성(관성) 점수가 낮고(≤15), 비겁(일간 오행)이 높고(≥30),
  //     비겁이 배우자 오행보다 뚜렷이 많을 때. simsanOhaeng 100점 만점 기준.
  const spouseElScore = ohaeng[spouseEl] ?? 0
  const bigyeopScore = ohaeng[dayEl] ?? 0   // 비겁 = 일간과 같은 오행
  const jaeWeakBigyeopStrong =
    spouseElScore <= 15 && bigyeopScore >= 30 && bigyeopScore >= spouseElScore * 2

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
  // 통근(뿌리) — 배우자 오행이 지지 지장간(여기·중기·정기)에 있으면 뿌리 있음
  //   ★2026-07-24 고침 — 지지 대표오행만 보던 것을 지장간까지 본다. (대표님 지시)
  //     통근은 천간 기운이 땅속(지장간)에 뿌리를 두는가이므로, 지장간을 봐야 맞다.
  //     전에는 BRANCH_EL(대표오행)만 봐서, 申 속 壬水 같은 숨은 뿌리를 놓쳤다.
  //     233쪽 "재성이 뿌리를 내리면 배우자 재물운이 좋다"
  const spouseRooted = p.saju.some(
    q => (HIDDEN[q.branch] ?? []).some(h => h && STEM_EL[h] === spouseEl),
  )

  // ── 배우자 고립 — 재성·관성이 고립되면 부정 (233쪽). ⚠️ 연재쌤 검수 대상 ──
  //   원문 "고립되거나 통근하지 못한 경우" — 고립과 통근못함은 별개(OR).
  //   고립: 배우자 오행이 약하게 있으면서(점수 ≤10), 그 오행을 생(生)해 주는
  //   기운도 옅으면(생하는 오행 ≤10) 홀로 떠 외로운 상태로 본다.
  const spouseSaengEl = insungOf(spouseEl)   // 배우자 오행을 생하는 오행
  const spouseIsolated =
    spouseScore > 0 && spouseScore <= 10 && (ohaeng[spouseSaengEl] ?? 0) <= 10

  // ── ⑪ 남자: 재성이 뿌리내리면 배우자 재물운이 좋다 (233쪽) ──
  //   ★남자만. 통변 참고자료로만 (별점 안 건드림).
  //     뿌리 판정은 위 spouseRooted 와 같다(지장간까지). 남자일 때만 "재물운" 의미를 붙인다.
  //     의미: 배우자(아내)가 재물복이 있다.
  const jaeRootedRich = p.gender === '남' && spouseRooted

  // ── ⑫ 남자: 재성이 많으면(재다신약·태과) 고부갈등·백수/악처 소지 (233쪽) ──
  //   ★남자만. 통변 참고자료로만 (별점 안 건드림).
  //     조건: 재성(정재·편재)이 3개 이상  또는  재성 오행 ≥ 45%. (대표님 지시)
  //       개수(3개↑)는 재다신약 관점, 점수(45%↑)는 태과 관점 — 둘을 하나로 합쳤다.
  //     개수 셈법은 ③⑤와 같다(천간 + 지지 본기).
  //     의미(통변): "고부갈등 소지와, 배우자가 백수이거나 힘든 배우자를 만날 소지가 있다"
  let jaeCount = 0
  if (p.gender === '남') {
    for (const q of p.saju) {
      for (const g of [q.stem, HIDDEN[q.branch]?.[2] ?? '']) {
        if (!g) continue
        const s = sipsinOf(dayStem, g)
        if (s === '정재' || s === '편재') jaeCount++
      }
    }
  }
  const jaeExcess = p.gender === '남' && (jaeCount >= 3 || spouseScore >= 45)

  // ── ⑮ 남자: 재성이 있으면 재물운·배우자운·부친운이 있다 (233쪽) ──
  //   ★남자만. 통변 참고자료로만 (별점 안 건드림).
  //     재성(정재·편재)이 천간·본기에 하나라도 있으면 성립.
  //     남자에게 재성은 재물·배우자(아내)·부친을 함께 뜻하므로,
  //     재성이 있으면 이 세 방면의 기운이 갖춰져 있다고 본다.
  const jaePresent = p.gender === '남' && jaeCount >= 1
  // ⑧ 남자 재다신약 → 비겁운(대운·세운)이 드는 시기에 돈은 벌지만 부부 불화 (233쪽)
  //   ★"비겁운"은 대운·세운(시기)이라 궁합(원국)에선 못 본다. 재다신약 성향만 잡고,
  //     멘트에서 "비겁운이 드는 시기에는~"으로 안내한다. (연재쌤 원문 취지)
  const jaeDaBulhwa = jaeExcess && p.gender === '남'


  // 공망 (233쪽 재성 형충공망)
  const gongmang = ilju ? getGongmang(ilju.stem, ilju.branch) : ['', ''] as [string, string]
  const spouseGongmang = p.saju.some(
    q => BRANCH_EL[q.branch] === spouseEl && gongmang.includes(q.branch),
  )

  // ── ⑩ 남자: 재성이 형·충·공망에 모두 걸리면 배우자 덕이 없다 (233쪽) ──
  //   ★남자만. 통변 참고자료로만 쓴다 (별점 안 건드림).
  //     재성이 있는 지지가 ① 형 ② 충 ③ 공망 셋 다 걸릴 때만 성립. (AND)
  //     의미: "원래 배우자 덕이 없는 사주". 통변에서 순화해서 쓴다.
  //     형은 삼형·상형·자형 모두 본다. (대표님 지시)
  const allBranches = p.saju.map(q => q.branch)
  const spouseBranches = p.saju.filter(q => BRANCH_EL[q.branch] === spouseEl).map(q => q.branch)
  const jaeChung = spouseBranches.some(sb => allBranches.some(ob => isPair(sb, ob, CHUNG)))
  const jaeHyeong = spouseBranches.some(sb => isHyeong([sb, ...allBranches.filter(b => b !== sb)]))
  const jaeHyeongChungGongmang = p.gender === '남'
    && spouseBranches.length > 0
    && jaeChung && jaeHyeong && spouseGongmang

  // ── ② 여자: 관성이 용신·희신이면 귀한 남편 (233쪽) ──
  //   ★여자만. 남자(재성)에는 이 규칙을 적용하지 않는다. (대표님 지시)
  //     "여자 사주에서 관성이 용신·희신이면 남편이 귀한 사람이 된다"
  //     용신·희신을 같이 '귀한 것'으로 보고 별 +2.
  const spouseIsYongHee = p.gender === '여'
    && (spouseEl === eokbu.yongsin || spouseEl === eokbu.heesin)

  // ── ⑭ 남자: 재성이 용신·희신이면 현모양처·미모의 배우자 (233쪽) ──
  //   ★남자만. 통변 참고자료로만 (별점 안 건드림). 여자 ②(관성 용신희신)의 재성 버전.
  //     의미: 아내(재성)가 나를 살리는 기운이라, 현모양처를 만나거나
  //           외모가 수려한 배우자를 만난다.
  const jaeIsYongHee = p.gender === '남'
    && (spouseEl === eokbu.yongsin || spouseEl === eokbu.heesin)

  // ── ④ 여자: 관성이 기신이면 부부가 많이 싸운다 (233쪽) ──
  //   ★여자만. ②의 짝. 233쪽 "관성이 용신·희신이면 좋고 기신이면 불화".
  //     별 -1.
  const spouseIsGisin = p.gender === '여' && spouseEl === eokbu.gisin

  // ── ⑬ 남자: 재성이 기신이면 악처를 만나거나 부부 불화수 (233쪽) ──
  //   ★남자만. 통변 참고자료로만 (별점 안 건드림). 여자 ④(관성 기신)의 재성 버전.
  //     의미: 아내(재성)가 부담이 되는 기운이라, 힘든 배우자를 만나거나 다툼이 잦을 소지.
  const jaeIsGisin = p.gender === '남' && spouseEl === eokbu.gisin

  // ── ③ 여자: 정관·편관이 각각 2개 이상이면 관살혼잡 (232쪽) ──
  //   ★여자만. 세는 법은 천간 + 지지 본기(지장간 속기운 제외).
  //     지장간까지 세면 대부분 사주가 걸려 혼잡이 남발된다.
  //     판정: 정관 2개 이상 '또는' 편관 2개 이상. 별 -1.
  let jeonggwan = 0
  let pyeongwan = 0
  if (p.gender === '여') {
    for (const q of p.saju) {
      for (const g of [q.stem, HIDDEN[q.branch]?.[2] ?? '']) {
        if (!g) continue
        const s = sipsinOf(dayStem, g)
        if (s === '정관') jeonggwan++
        else if (s === '편관') pyeongwan++
      }
    }
  }
  const gwansalHonjap = p.gender === '여' && (jeonggwan >= 2 || pyeongwan >= 2)

  // ── ⑤ 여자: 무관(無官) 사주 — 남편이 무능하고 덕이 없다 ──
  //   ★여자만. 천간·지지 본기에 관성(정관·편관)이 하나도 없는 경우. 별 -1.
  //     ③과 같은 셈법(천간+본기, 지장간 속기운 제외)을 쓴다.
  const muGwan = p.gender === '여' && jeonggwan === 0 && pyeongwan === 0

  // ── ⑨ 배우자 별 없음 (무재/무관) — 전생부부 인연 판정용 ──
  //   ★성별 무관. 자기 배우자 별(여=관성 정관·편관 / 남=재성 정재·편재)이
  //     천간·지지 본기에 하나도 없는 경우.
  //     두 사람이 모두 이러하면 judgeCouple 에서 "전생부부 인연"으로 본다.
  //     (여자 무재판정은 관성이 아니라 재성 십신을 따로 센다)
  let spouseStarCount = 0
  const spouseSipsin = p.gender === '남' ? ['정재', '편재'] : ['정관', '편관']
  for (const q of p.saju) {
    for (const g of [q.stem, HIDDEN[q.branch]?.[2] ?? '']) {
      if (!g) continue
      if (spouseSipsin.includes(sipsinOf(dayStem, g))) spouseStarCount++
    }
  }
  const spouseStarNone = spouseStarCount === 0

  // ── ⑥ 배우자 별(여=관성·남=재성)이 천을귀인이면 배우자 덕이 많다 (233쪽) ──
  //   ★남녀 공통. 별 +1. (대표님 지시 — 원래 여자만이었으나 공통으로 확대)
  //     천을귀인은 지지로만 판정하므로, 배우자 별도 지지 본기로 본다.
  //     지지 본기가 배우자 별 오행이면서, 그 지지가 천을귀인 글자인 경우.
  const gwanIsCheonEul = p.saju.some(q => {
    const bongi = HIDDEN[q.branch]?.[2] ?? ''
    const isSpouseEl = bongi && STEM_EL[bongi] === spouseEl
    const isCheonEul = (CHEON_EUL[dayStem] ?? []).includes(q.branch)
    return isSpouseEl && isCheonEul
  })

  // ── ⑦ 월지·일지 조후 — 하나는 냉, 하나는 온이면 궁합에 좋다 ──
  //   ★남녀 공통. 별 +2. (대표님 지시)
  //     한 사람 사주 안에서 월지·일지가 냉·온 하나씩이면 조후가 균형 잡힘.
  //       냉: 子 丑 辰 申 酉 亥   온: 寅 卯 巳 午 未 戌
  const iljiCold = COLD_BRANCH.has(dayBranch)
  const woljiCold = COLD_BRANCH.has(monthBranch)
  const johuBalance = (iljiCold && !woljiCold) || (!iljiCold && woljiCold)

  // ── 격각(隔角) — 연재쌤 확정. 한 사람 원국의 월지-일지가 한 칸 건너뛰면 격각. ──
  //   부부 사이가 별로 좋지 않다. (예: 子월 寅일 → 가운데 丑 빠짐)
  const gyeokgak = isGyeokgak(monthBranch, dayBranch)

  // 일지 십신 (232쪽 4번 — 판단 기준은 日支)
  const iljiSipsin = dayBranch ? sipsinOf(dayStem, HIDDEN[dayBranch]?.[2] ?? '') : ''
  // ── 여자: 일지 상관인데 재성이 없으면 부정 (233쪽). 인성이 있으면 잡아 준다 ──
  const femaleSanggwanNoJae =
    p.gender === '여' && iljiSipsin === '상관' && (ohaeng[jaeElF] ?? 0) === 0

  // ── ⑥ 년주-일주 복음(伏吟) — 같은 간지면 이혼·재혼 소지 (233쪽) ──
  const yeon = byPillar['년주']
  const bokEum = !!(yeon && ilju && yeon.stem === ilju.stem && yeon.branch === ilju.branch)

  // ── ⑤ 상관과 정관이 가까이 있으면 이혼 많이 (233쪽) ──
  //   천간에서 상관과 정관이 이웃(인접 기둥)에 있는 경우를 본다.
  //   상관 = 일간이 생하고 음양 다른 것 / 정관 = 일간을 극하고 음양 다른 것.
  const stemsInOrder = ['년주', '월주', '일주', '시주'].map(pil => byPillar[pil]?.stem ?? '')
  let sanggwanJeonggwanNear = false
  for (let i = 0; i < stemsInOrder.length - 1; i++) {
    const s1 = stemsInOrder[i], s2 = stemsInOrder[i + 1]
    if (!s1 || !s2) continue
    const t1 = sipsinOf(dayStem, s1), t2 = sipsinOf(dayStem, s2)
    if ((t1 === '상관' && t2 === '정관') || (t1 === '정관' && t2 === '상관')) sanggwanJeonggwanNear = true
  }

  // ── ⑧ 남자 재다신약 + 비겁 강 → 위 jaeDaBulhwa 에서 처리함 (재성 과다 AND 비겁≥25) ──

  // ── 月支-日支 계절 (한 사람 안에서 본 것) ──
  //   ⚠️ 이 값은 "내 사주 구조"를 보는 참고값이다.
  //      궁합 판정(찰떡궁합)은 judgeCouple 에서 두 사람 교차(내 月支 ↔ 상대 日支)로
  //      다시 계산한다. 이 필드를 궁합 근거로 쓰지 마라. (2026-07-24 대표님 확인)
  const seasonRel = crossSeason(monthBranch, dayBranch)

  // ── 일월 원진 (연재쌤 확정 ①) ──
  const wonjinIlWol = isPair(monthBranch, dayBranch, WONJIN)

  // ── 여자 丑丑 (232쪽 여자 항목: 이혼 가능성) ──
  //   ★여자 본인 사주의 월지·일지가 둘 다 丑. 남자는 보지 않는다. (대표님 지시)
  const chukChukSelf = p.gender === '여' && isChukChuk(monthBranch, dayBranch)

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
    spouseRooted, spouseIsolated, spouseGongmang,
    iljiSipsin, seasonRel, wonjinIlWol, chukChukSelf,
    spouseIsYongHee, gwansalHonjap, spouseIsGisin, muGwan, gwanIsCheonEul, johuBalance, gyeokgak, jaeWeakBigyeopStrong, jaengTuHap, siksangExcess, femaleSanggwanNoJae, insungHelps, bokEum, sanggwanJeonggwanNear, jaeDaBulhwa, spouseIpmyo, spouseIpmyoButRooted,
    spouseStarNone, jaeHyeongChungGongmang, jaeRootedRich, jaeExcess, jaeIsGisin, jaeIsYongHee, jaePresent,
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

  // ★2026-07-25 — "봄생이라 ○ 필요" 계절 문구(seasonLine)를 삭제했다. (대표님 지시)
  //   억부로 보면 봄생 둘이라도 필요 기운이 달라(火·金), "봄생이라"를 이유로
  //   달면 모순처럼 보였다. 오행 설명은 AI 통변이 막대그래프 수치로 상세히 다룬다.

  //
  //   [왜]
  //   ③ '없는 오행을 채워 주는가' 와 하는 이야기가 겹쳤다.
  //   두 카드가 나란히 서서 같은 말을 반복하니 화면만 길어지고 헷갈렸다.
  //   → 이 카드의 계절 한 줄(seasonLine)만 ③ 으로 옮기고, 카드 자체는 없앤다.
  //     오행 비교 그래프도 ③ 안으로 들어간다. (page.tsx 의 needExtra)
  //
  //   [옛 코드 — 되살릴 때 쓴다]
  //     cats.push({
  //       key: 'need',
  //       title: '필요한 기운을 채워 주는가',
  //       stars: (Math.max(aStars, bStars) as Stars),
  //       lines: [seasonLine],
  //     })
  //   그 전에는 별이 두 줄(dual)이었다.
  //     { text: `${b.name}님이 ${a.name}님께 ${EL_LABEL[a.needEl]} 기운을 나눠 주세요`, stars: aStars }
  //     { text: `${a.name}님이 ${b.name}님께 ${EL_LABEL[b.needEl]} 기운을 나눠 주세요`, stars: bStars }
  //
  //   ⚠️ aStars·bStars 는 아직 총평(good/watch)에서 쓰므로 지우지 않는다.

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
  const bothFill = aFilled.length > 0 && bFilled.length > 0
  const oneFill = aFilled.length > 0 || bFilled.length > 0
  cats.push({
    key: 'ohaeng',
    title: '없는 오행을 채워 주는가',
    stars: bothFill ? 5 : oneFill ? 4 : (aZero.length === 0 && bZero.length === 0) ? 3 : 2,
    // ★2026-07-25 — 카드의 설명 문구(계절·채움)를 삭제했다. (대표님 지시)
    //   "봄생이라 ○ 필요" 문구가 억부와 안 맞아 모순처럼 보였다.
    //   카드에는 제목·별·오행 막대그래프만 두고, 상세 설명은 AI 통변이 맡는다.
    //   (오행 분포 수치는 toCoupleTongbyeonInput 이 통변 재료로 넘긴다)
    lines: [],
  })

  // ④ 두 분 일주가 만나는 자리 (232쪽 + 49쪽 지지 등급)
  const ganHap = isPair(a.dayStem, b.dayStem, GAN_HAP)
  const jiHap = isPair(a.dayBranch, b.dayBranch, JI_HAP)
  const jiChung = isPair(a.dayBranch, b.dayBranch, CHUNG)
  // ★2026-07-24 고침 — 천간충은 오행 극이 아니라 정해진 쌍이다.
  //   전에는 CON(오행 극)으로 봤는데, 그러면 丙辛(화극금)이 충으로 잡힌다.
  //   하지만 丙辛은 합(丙辛合)이다. 극과 충은 다르다.
  //   천간충 7쌍: 甲庚·乙辛·丙壬·丁癸·戊甲·己乙·... 중 표준 4충(甲庚·乙辛·丙壬·丁癸)을 쓴다.
  //   (戊己土는 충이 없다고 보는 관법을 따른다)
  const ganChung = isPair(a.dayStem, b.dayStem, GAN_CHUNG)

  // ⚠️ 비대칭이다 — 내가 상대를 볼 때와 상대가 나를 볼 때가 다르다.
  //    (辰→寅 은 C, 寅→辰 은 B) 한쪽만 쓰면 판정이 한쪽으로 기운다.
  const pairAB = jijiPairText(a.dayBranch, b.dayBranch)
  const pairBA = jijiPairText(b.dayBranch, a.dayBranch)

  const iljuLines: string[] = []
  iljuLines.push(`${a.dayStem}${a.dayBranch} ↔ ${b.dayStem}${b.dayBranch}`)
  if (ganHap && jiHap) iljuLines.push('천간도 지지도 합이 되는 天合地合이에요. 서로 깊이 끌리는 좋은 자리입니다.')
  else if (ganChung && jiChung) iljuLines.push('천간도 지지도 충이 되는 天沖地沖이에요. 성격이 부딪히기 쉬운 자리입니다.')
  else if (ganHap || jiHap) iljuLines.push('두 분 일주가 합으로 이어져, 서로 잘 어울리는 자리예요.')
  else if (ganChung || jiChung) iljuLines.push('두 분 일주가 충으로 마주해, 서로 다른 방향을 볼 수 있어요.')
  else iljuLines.push('충으로 부딪히지도, 강하게 합하지도 않는 중간 자리예요.')
  // ★2026-07-25 — 두 사람 일지끼리 보던 격각·동상이몽 설명(pairAB.text)을 제거했다.
  //   연재쌤: "궁합에서 일지끼리 맞춰보고 격각을 논하는 것은 맞지 않는 이론이다."
  //   격각은 한 사람 원국의 월지-일지로만 본다(아래 각자 배우자운에서 처리).
  //   일주 카드는 두 분 일주의 합·충만 본다.

  // ── 두 사람 태어난 계절(월지) 궁합 — 연재쌤 정리 ──
  //   겨울↔여름 = 아주 좋다 / 봄↔봄·가을↔가을 = 부정적
  const monthRel = monthSeasonMatch(a.monthBranch, b.monthBranch)
  if (monthRel === '아주좋음') {
    iljuLines.push('한 분은 겨울, 한 분은 여름에 태어나 계절이 서로를 채워 주는 아주 좋은 자리예요.')
  } else if (monthRel === '부정') {
    iljuLines.push('두 분 다 같은 계절(봄 또는 가을)에 태어나, 기운이 한쪽으로 몰려 서로 살펴 주어야 하는 자리예요. (순화해서 전할 것)')
  }

  // ── 쟁합·투합 — 부부 어느 쪽이든 있으면 궁합 별로 (연재쌤) ──
  if (a.jaengTuHap || b.jaengTuHap) {
    iljuLines.push('한 분의 사주에 한 기운을 두고 두 기운이 다투는 쟁합·투합의 결이 있어, 마음이 한곳에 오롯이 모이기 어려운 면이 있는 자리예요. (순화해서 전할 것)')
  }

  // ── ⑧ 일주 합/충 별점 (부부 서로를 놓고 봄, 방향 없음) ──
  //   ★부부 공통. 대표님 지시: 일주가 합이면 +2, 충이면 -2.
  //     天合地合·天沖地沖은 합/충이 겹친 것이므로 위 조건에 자연히 포함된다.
  //     (합과 충이 동시에 성립하긴 어렵지만, 그럴 땐 상쇄되게 둔다)
  let iljuStar: Stars = 3
  if (ganHap || jiHap) iljuStar = Math.min(5, iljuStar + 2) as Stars
  if (ganChung || jiChung) iljuStar = Math.max(1, iljuStar - 2) as Stars
  // 계절 궁합도 별점에 반영 (아주좋음 +1 / 부정 -1)
  if (monthRel === '아주좋음') iljuStar = Math.min(5, iljuStar + 1) as Stars
  else if (monthRel === '부정') iljuStar = Math.max(1, iljuStar - 1) as Stars
  // 쟁합·투합 있으면 -1
  if (a.jaengTuHap || b.jaengTuHap) iljuStar = Math.max(1, iljuStar - 1) as Stars

  cats.push({
    key: 'ilju',
    title: '두 분 일주가 만나는 자리',
    stars: iljuStar,
    lines: iljuLines,
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
    // ★2026-07-24 고침 — 丑丑은 "여자 자기 사주의 월지-일지"를 본다. (대표님 지시)
    //
    //   [무엇이 틀렸었나]
    //   전에는 isChukChuk(x.monthBranch, mate.dayBranch) 로
    //   "여자 월지 ↔ 남편 일지" 를 봤다. 계절 판정을 교차로 바꾸면서
    //   丑丑까지 딸려 교차가 된 것이다.
    //
    //   [원문·대표님 규칙]
    //   232쪽 여자 항목 "丑丑은 이혼 가능성이 크다" 는
    //   여자 본인 사주의 월지-일지가 둘 다 丑인 경우다. 남편은 보지 않는다.
    //   → x.dayBranch(자기 일지)로 판정한다.
    const chukChuk = x.chukChukSelf
    const springAutumn = isFemale && isSpringAutumn(x.monthBranch, mate.dayBranch)
    const seasonPair = `${x.name}님 월지 ${wagwa(x.monthBranch)} ${mate.name}님 일지 ${iga(mate.dayBranch)}`

    if (chukChuk) {
      // 232쪽 여자 항목 — 원문은 "이혼 가능성이 크다". 대표님 지시로 순화한다.
      //   ★여자 본인 월지·일지가 모두 丑인 경우. 상대와 무관하게 이 사람의 자리를 말한다.
      lines.push(`${x.name}님은 월지와 일지가 모두 丑이라, 배우자 자리를 각별히 살피셔야 하는 자리예요.`)
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

    // ★2026-07-25 대표님 지시 — 배우자운 카드의 별(★)을 없앤다.
    //   각 규칙을 별점 가감이 아니라 "통변용 사실 문구"로 모은다(reasons).
    //   통변 엔진이 이 문구들을 받아, 무섭지 않게 순화해서 풀어쓴다.
    //   별을 매기는 기준은 나중에 따로 정한다.
    const reasons: string[] = []

    // ── 전생부부(⑨)를 먼저 판정 — ⑤ 무관을 덮기 때문 ──
    const jeonsaengBubu = x.spouseStarNone && mate.spouseStarNone

    // 배우자 자리 기본 상태 (뿌리·공망)
    if (!x.spouseRooted) reasons.push('배우자 별이 지지에 뿌리를 두지 못해 조금 떠 있는 자리')
    if (x.spouseGongmang) reasons.push('배우자 자리가 공망과 겹쳐, 마음을 더 기울여야 하는 자리')
    if (x.wonjinIlWol) reasons.push('월지와 일지가 원진이라 마음이 예민해지기 쉬운 자리')

    // ── 여자 규칙 (①~⑤) — 통변용 사실 문구 ──
    if (chukChuk) reasons.push('여자 본인 월지·일지가 모두 丑 → 이혼 가능성이 큰 자리이니 각별히 살펴야 함 (순화해서 전할 것)')
    if (x.spouseIsYongHee) reasons.push('여자 관성이 용신·희신 → 귀한 남편을 만나는 자리, 남편이 복이 됨')
    if (x.spouseIsGisin) reasons.push('여자 관성이 기신 → 부부가 많이 다툴 소지 (순화해서 전할 것)')
    if (x.gwansalHonjap) reasons.push('여자 관살혼잡(정관·편관이 섞여 각 2개 이상) → 여자 사주로서 불리한 자리, 배우자 인연이 복잡하고 안정되기 어려움 (순화해서 전할 것)')
    if (x.muGwan && !jeonsaengBubu) reasons.push('여자 무관(관성 없음) → 남편 덕이 약할 수 있으니 인연을 스스로 가꿔야 하는 자리 (순화해서 전할 것)')

    // ── 남녀 공통 (⑥⑦) ──
    if (x.gwanIsCheonEul) reasons.push('배우자 별이 천을귀인 → 배우자 덕이 두터운 자리')
    if (x.johuBalance) reasons.push('월지·일지가 냉·온으로 어우러져 조후가 균형 잡힌 좋은 자리')
    if (x.gyeokgak) reasons.push('월지와 일지가 한 칸 건너뛴 격각이라, 부부 사이에 마음의 결이 어긋나기 쉬운 자리 (순화해서 전할 것)')
    if (x.jaeWeakBigyeopStrong) reasons.push(`${x.spouseName === '재성' ? '재성' : '관성'}은 옅고 비겁(같은 기운)이 강해, 배우자를 향한 마음이 앞서다 보면 의심이나 조바심으로 흐르기 쉬운 자리 (순화해서 전할 것)`)
    if (x.siksangExcess) reasons.push('식상(끼와 표현력의 기운)이 매우 강해, 감정과 매력이 풍부한 만큼 마음이 여러 곳으로 흐르지 않게 한 사람에게 정을 모으는 것이 중요한 자리 (순화해서 전할 것)')
    if (x.femaleSanggwanNoJae) {
      if (x.insungHelps) reasons.push('배우자 자리가 상관인데 재성이 옅은 편이나, 인성이 그 기운을 부드럽게 잡아 주어 균형이 맞춰지는 자리')
      else reasons.push('배우자 자리가 상관인데 재성이 없어, 마음이 곧고 표현이 강한 만큼 배우자를 너그럽게 품는 연습이 도움이 되는 자리 (순화해서 전할 것)')
    }
    if (x.bokEum) reasons.push('태어난 해와 날의 기둥이 같은 복음(伏吟)이라, 같은 자리를 두 번 밟는 결이 있어 마음의 매듭을 그때그때 풀어 가는 것이 좋은 자리 (순화해서 전할 것)')
    if (x.sanggwanJeonggwanNear) reasons.push('상관과 정관이 가까이 있어(또는 그런 기운이 드는 시기가 오면), 규범과 자유로움이 부딪히기 쉬운 만큼 서로의 방식을 존중하는 마음이 필요한 자리 (순화해서 전할 것)')
    if (x.spouseIsolated) reasons.push(`${x.spouseName}(배우자 기운)이 홀로 떠 생해 주는 기운도 옅어 조금 외로운 자리이니, 서로 곁을 지켜 주고 마음을 자주 나누면 좋은 자리 (순화해서 전할 것)`)
    if (x.jaeDaBulhwa) reasons.push('재물의 기운이 넉넉한 재다신약이라, 특히 비겁운(같은 기운이 드는 시기)이 오면 재물은 늘어도 바깥일에 마음이 쏠려 집안이 소홀해지기 쉬우니, 그런 때일수록 부부가 서로를 살피면 좋은 자리 (순화해서 전할 것)')
    if (x.spouseIpmyo) reasons.push(`${x.spouseName}(배우자 기운)이 창고에 드는 입묘의 결이 있어, 배우자와의 인연을 더 살뜰히 가꾸고 건강을 함께 챙기면 좋은 자리 (순화해서 전할 것)`)
    if (x.spouseIpmyoButRooted) reasons.push(`${x.spouseName}(배우자 기운)에 입묘의 결이 있으나, 본바탕(일간)이 지지에 튼튼히 뿌리내려 그 기운을 든든히 받치므로 크게 걱정하지 않아도 되는 자리`)

    // ── 전생부부 (⑨) ──
    if (jeonsaengBubu) reasons.push('두 사람 모두 배우자 별이 비어(남 무재·여 무관) 전생부부 인연 → 아주 귀한 자리, 많이 양보하고 가족 위해 마음 내라는 업보')

    // ── 남자 규칙 (⑩~⑮) — 통변용 사실 문구 ──
    if (x.jaeHyeongChungGongmang) reasons.push('남자 재성이 형·충·공망 모두 걸림 → 원래 배우자 덕이 약한 자리 (순화해서 전할 것)')
    if (x.jaeRootedRich) reasons.push('남자 재성이 뿌리내림 → 배우자(아내)의 재물운이 좋은 자리')
    if (x.jaeExcess) reasons.push('남자 재성이 많음(태과) → 고부갈등 소지와, 배우자가 힘든 배우자를 만날 소지 (순화해서 전할 것)')
    if (x.jaeIsGisin) reasons.push('남자 재성이 기신 → 부부 불화 소지 (순화해서 전할 것)')
    if (x.jaeIsYongHee) reasons.push('남자 재성이 용신·희신 → 현모양처이거나 외모가 수려한 배우자를 만나는 자리')
    if (x.jaePresent) reasons.push('남자 재성이 있음 → 재물운·배우자운·부친운이 갖춰진 자리')

    // 전생부부일 때만 카드 본문에도 특별 문구를 남긴다 (아주 좋은 자리라 눈에 보이게)
    if (jeonsaengBubu) {
      lines.push('두 분 다 배우자 자리가 비어, 오히려 전생부터 이어진 부부 인연으로 봅니다. 많이 양보하고 서로를 위해 마음을 내는 것이 두 분에게 주어진 귀한 몫이에요.')
    }

    cats.push({
      key: `spouse_${x === a ? 'a' : 'b'}`,
      title: spouseTitle(x.name),
      lines,
      reasons,
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

  // ★2026-07-24 — 무재/무관 전생부부 인연 (대표님 지시). 두 사람 모두 배우자 별이 없을 때.
  if (a.spouseStarNone && b.spouseStarNone) {
    good.push('두 분 다 배우자 자리가 비어, 전생부터 이어진 부부 인연으로 봅니다. 아주 귀한 자리예요.')
  }
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
  // ★2026-07-24 — 여자 丑丑 (232쪽: 이혼 가능성). 순화해서 담는다.
  if (a.chukChukSelf) watch.push(`${a.name}님은 월지와 일지가 모두 丑이라, 배우자 자리를 각별히 살피시면 좋아요.`)
  if (b.chukChukSelf) watch.push(`${b.name}님은 월지와 일지가 모두 丑이라, 배우자 자리를 각별히 살피시면 좋아요.`)
  if (pairAB?.grade === 'D' || pairBA?.grade === 'D')
    watch.push('일지가 서로 편치 않은 자리라, 다름을 인정하는 연습이 필요합니다.')

  const ta = a.iljiSipsin ? iljiText(a.gender, a.iljiSipsin) : null
  const tb = b.iljiSipsin ? iljiText(b.gender, b.iljiSipsin) : null
  if (ta) note.push(`${a.name}님은 ${ta.short} 자리예요. (${a.iljiSipsin})`)
  if (tb) note.push(`${b.name}님은 ${tb.short} 자리예요. (${b.iljiSipsin})`)

  // ★2026-07-24 — 화면에 나갈 순서로 정렬한다.
  //   '없는 오행을 채워 주는가' 를 맨 앞에 둔다. (대표님 지시)
  //   이 카드가 오행 비교 그래프까지 품고 있어 두 분 관계의 큰 그림을 먼저 보여 준다.
  //   그다음 귀인 → 일주 → 각자의 배우자운 순으로 좁혀 들어간다.
  const CARD_ORDER = ['ohaeng', 'gwiin', 'ilju']
  cats.sort((x, y) => {
    const ix = CARD_ORDER.indexOf(x.key)
    const iy = CARD_ORDER.indexOf(y.key)
    // 목록에 없는 것(spouse_a·spouse_b)은 뒤로 보내되 서로의 순서는 지킨다.
    return (ix === -1 ? 99 : ix) - (iy === -1 ? 99 : iy)
  })

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

/** 남자 일지 — 234쪽. 본인의 성향으로 읽는다. 원문 내용을 하나도 빼지 않되 거친 표현만 순화. */
const ILJI_MALE: Record<string, IljiText> = {
  비견: { short: '사회에선 성인군자, 집에선 뜻을 굽히지 않는',
    body: '사회생활을 할 때는 성인군자처럼 두루 품는 분이신데, 집에서는 고집이 세고 혼자 밀고 나가는 면이 있으세요. 일지가 비견인 남자는 집에서 잘하면 성공한다고 봅니다. 그러니 바깥일만큼 집안에 마음을 쓰시는 것이 곧 복이 되는 자리예요.' },
  겁재: { short: '고집·승부욕·경쟁심·우월감이 강한',
    body: '고집과 승부욕, 경쟁심, 우월감이 강한 편이세요. 일지가 겁재인 남자는 공개적으로 칭찬하면 보약이 되고, 지적하면 독이 됩니다. 그러니 세워 드리고 북돋아 주시면 훨씬 잘 풀리는 자리예요.' },
  식신: { short: '자상하고 처가에 잘하는',
    body: '성품이 자상하고 배우자 쪽 식구들에게도 살뜰하세요. 사윗감으로 아주 좋다고 보는 자리입니다. 곁에 있으면 마음이 놓이는 분이에요.' },
  상관: { short: '분위기 살리고 재테크에 밝은',
    body: '분위기를 살리고 사교적이며, 두뇌가 총명하고 눈치가 빠르세요. 셈이 밝아 재테크 능력도 있으십니다. 재주가 여럿인 자리예요.' },
  편재: { short: '바깥일과 사람에 마음이 많이 가는',
    body: '배우자 자리에 다른 인연이 함께 자리해, 배우자에게 군림하거나 가족을 강하게 쥐려는 면이 나올 수 있어요. 활동 반경이 넓고 바깥에 마음이 많이 가는 자리이니, 한눈파는 일을 특히 조심하시고 안팎의 균형을 살피시면 좋습니다.' },
  정재: { short: '자상하고 경제관념이 밝은',
    body: '자상하고 경제관념이 좋아 살림에 긍정적인 자리예요. 모범적이시지만 원칙을 중히 여기셔서 융통성이 아쉬울 때가 있습니다.' },
  편관: { short: '스스로를 몰아붙여 애쓰는',
    body: '자신을 극하며 몰아붙이는 자리라 몸과 마음이 피곤하기 쉬워요. (택일에서도 일지 편관은 가장 꺼리는 자리로 봅니다.) 집보다 밖으로 도는 경향과 한눈파는 일을 조심하셔야 하고, 집안의 배우자 자리가 가시방석처럼 편치 않아 부부 불화가 생기기 쉽습니다. 바깥에서 쓰는 기운을 집안으로 조금 돌리시면 한결 편안해집니다.' },
  정관: { short: '무슨 일이든 함께 의논하는',
    body: '모든 일을 배우자와 상의하시고 책임감이 깊으세요. 곁에 있는 사람이 든든해지는 자리입니다.' },
  편인: { short: '본가와 마음이 유난히 가까운',
    body: '본가, 특히 어머니와의 정이 유난히 깊어 그쪽으로 마음이 크게 기우는 자리예요. 배우자와 부딪히거나 어려운 일이 있으면 둘이 풀기보다 어머니께 먼저 이르고 상의하는 편이라, 그러다 보면 고부간의 갈등이 생기기 쉽습니다. 마음이 이랬다저랬다 하거나 아직 여물지 않은 면이 보일 수 있고 잔소리를 특히 싫어하시니, 부부의 일은 둘이 먼저 매듭짓고 지금 꾸린 가정 쪽으로 무게를 조금 옮기시면 관계가 편안해집니다.' },
  정인: { short: '반듯하고 성실한',
    body: '모범적이고 성실하세요. 다만 정해진 틀을 좋아하셔서 융통성이 아쉬울 때가 있습니다.' },
}

/** 여자 일지 — 235쪽. 어떤 배우자를 만나는가 / 어떻게 대하는가로 읽는다. 원문 내용을 하나도 빼지 않되 거친 표현만 순화. */
const ILJI_FEMALE: Record<string, IljiText> = {
  비견: { short: '벗 같은 배우자를 만나는',
    body: '친구처럼 편안한 배우자를 만나는 자리예요. 서로 간섭을 줄이고 칭찬하며 인정해 드리면 좋습니다. 배우자의 자존심을 상하게 하지 않는 것이 중요해요.' },
  겁재: { short: '생활력이 강하고 스스로 일구는',
    body: '생활력이 강하고 자수성가 스타일이에요. 고집과 자존감, 추진력, 리더십이 있어 이를 좋은 쪽으로 발휘하면 크게 이루십니다. 때로는 말을 줄이고 듣는 쪽에 서 보시면 관계가 한결 부드러워집니다.' },
  식신: { short: '배우자를 아이처럼 살뜰히 챙기는',
    body: '남편을 아이처럼 여기며 살뜰히 챙기시다 보니 잔소리가 많아지기 쉬운 자리예요. 집에서 잔소리를 줄이시면 가정이 화목해지니, 나무라기보다 가족을 자주 칭찬해 주시면 좋습니다.' },
  상관: { short: '배우자를 감시하고 통제하려는 마음이 강한',
    body: '배우자의 일거수일투족을 살피며, 감시하고 통제하려는 마음이 강한 자리예요. 마음이 쓰여서 그런 것이지만 지나치면 서로 지치니, 기질을 조금 누그러뜨릴 필요가 있습니다. 다툼이 있을 땐 본인 몫이 더 크다고 여기고 한 발 물러서 보시면, 앞세우는 감정과 저항하는 마음을 다스리는 데 도움이 됩니다.' },
  편재: { short: '현실을 야무지게 챙기는',
    body: '살림과 셈이 야무진 자리예요. 다만 배우자를 돈 벌어 오는 역할로만 보지 않도록, 사람 자체를 존중해 드리면 관계가 훨씬 깊어집니다.' },
  정재: { short: '알뜰하고 현실 감각이 밝은',
    body: '알뜰하고 현실 감각이 밝으세요. 형편이 넉넉지 않을 때 마음이 먼저 조급해지기 쉬우니(긍정 반, 부정 반의 자리), 다그치기보다 함께 계획을 세우시면 좋습니다.' },
  편관: { short: '강단 있는 배우자를 만나 마음공부가 필요한',
    body: '일지와 월지가 모두 편관이면 배우자가 호랑이처럼 강하고 완고하게 느껴질 수 있는 자리예요. 강단 있고 원칙이 분명한 배우자라 때로 버겁게 느껴지실 수 있으니, 수행하듯 마음을 다스리는 시간을 두시면 큰 도움이 됩니다.' },
  정관: { short: '점잖고 반듯한 현모양처 기질의',
    body: '보수적이고 점잖으며 예의 바른, 현모양처 기질의 배우자가 될 수 있어요. 가정과 자녀를 잘 돌보기에 아주 좋습니다.' },
  편인: { short: '세심하게 살피고 챙겨 주는 배우자를 만나는',
    body: '작은 것 하나까지 세심하게 살피고 챙겨 주는 배우자를 만나는 자리예요. 마음이 깊어 그런 것이지만, 그 관심이 지나치면 서로 숨이 막힐 수 있습니다. 시시콜콜한 것까지 함께하려 하기보다, 각자의 몫과 공간을 정해 두시면 두 분 다 한결 편안해집니다. 배우자의 세심함을 잔소리로 여기지 않고 아껴 주는 마음으로 받아 주시면 관계가 부드러워집니다.' },
  정인: { short: '포근하고 든든한 배우자를 만나는',
    body: '포근한 남편이면서 집안일도 잘 챙기는, 일등 남편이라 할 만한 든든한 배우자를 만나는 자리예요.' },
}

/** 일지 십신 해설 — 성별에 따라 다른 표를 쓴다 (234·235쪽) */
export function iljiText(gender: Gender, sipsin: string): IljiText | null {
  const table = gender === '남' ? ILJI_MALE : ILJI_FEMALE
  return table[sipsin] ?? null
}
