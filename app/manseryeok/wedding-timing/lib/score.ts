// app/manseryeok/wedding-timing/lib/score.ts
// 결혼택일 3단계: 0단계 강력필터 + 1단계 100점 채점
//
// 설계: docs/결혼택일_산식.md 그대로 코드화. (노트북LM 자료 = 심산강의·통변요론)
// ※ 전통 길흉표(천을귀인·천희홍란·사폐·천지전)는 자료의 공식을 그대로 따름.
//    "잠정 기준" — 연재 선생님 검수 후 확정.

// ── 오행 매핑 (산식 메모 0번 인덱스 정의) ──
const STEM_ELEMENT: Record<string, string> = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
  '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
}
const BRANCH_ELEMENT: Record<string, string> = {
  '寅': '목', '卯': '목', '巳': '화', '午': '화',
  '辰': '토', '戌': '토', '丑': '토', '未': '토',
  '申': '금', '酉': '금', '子': '수', '亥': '수',
}

// ── 0단계 필터용 쌍/표 ──

// F2. 일지 충 — 子午 丑未 寅申 卯酉 辰戌 巳亥
const CHUNG_PAIRS: [string, string][] = [
  ['子', '午'], ['丑', '未'], ['寅', '申'],
  ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
]
// F3. 일지 원진 — 子未 丑午 寅酉 卯申 辰亥 巳戌
const WONJIN_PAIRS: [string, string][] = [
  ['子', '未'], ['丑', '午'], ['寅', '酉'],
  ['卯', '申'], ['辰', '亥'], ['巳', '戌'],
]
// F5. 사폐일 — 계절별 간지
const SAPYE: Record<string, string[]> = {
  봄: ['庚申'], 여름: ['壬子'], 가을: ['甲寅'], 겨울: ['丙午'],
}
// F6. 천지전일 — 계절별 간지
const CHEONJIJEON: Record<string, string[]> = {
  봄: ['乙卯', '辛卯'], 여름: ['丙午', '戊午'], 가을: ['辛酉', '癸酉'], 겨울: ['壬子', '丙子'],
}

// 계절 판정 — 절기 기준 월지 (봄=寅卯辰, 여름=巳午未, 가을=申酉戌, 겨울=亥子丑)
function seasonOf(monthBranch: string): string {
  if (['寅', '卯', '辰'].includes(monthBranch)) return '봄'
  if (['巳', '午', '未'].includes(monthBranch)) return '여름'
  if (['申', '酉', '戌'].includes(monthBranch)) return '가을'
  if (['亥', '子', '丑'].includes(monthBranch)) return '겨울'
  return ''
}

function isChung(a: string, b: string): boolean {
  return CHUNG_PAIRS.some(([x, y]) => (x === a && y === b) || (y === a && x === b))
}
function isWonjin(a: string, b: string): boolean {
  return WONJIN_PAIRS.some(([x, y]) => (x === a && y === b) || (y === a && x === b))
}

// ── 1단계 가점용 표 ──

// ① 천을귀인 — 일간 기준 지지 2개
const CHEONEUL: Record<string, string[]> = {
  '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
  '乙': ['子', '申'], '己': ['子', '申'],
  '丙': ['亥', '酉'], '丁': ['亥', '酉'],
  '壬': ['巳', '卯'], '癸': ['巳', '卯'],
  '辛': ['午', '寅'],
}

// ④ 육합 — 子丑 寅亥 卯戌 辰酉 巳申 午未
const YUKHAP_PAIRS: [string, string][] = [
  ['子', '丑'], ['寅', '亥'], ['卯', '戌'],
  ['辰', '酉'], ['巳', '申'], ['午', '未'],
]
// ④ 삼합 그룹 — 申子辰(수) 寅午戌(화) 巳酉丑(금) 亥卯未(목)
const SAMHAP_GROUPS: string[][] = [
  ['申', '子', '辰'], ['寅', '午', '戌'], ['巳', '酉', '丑'], ['亥', '卯', '未'],
]

function isYukhap(a: string, b: string): boolean {
  return YUKHAP_PAIRS.some(([x, y]) => (x === a && y === b) || (y === a && x === b))
}
function isSamhap(a: string, b: string): boolean {
  return SAMHAP_GROUPS.some(g => g.includes(a) && g.includes(b) && a !== b)
}

const BRANCH_INDEX: Record<string, number> = {
  '子': 0, '丑': 1, '寅': 2, '卯': 3, '辰': 4, '巳': 5,
  '午': 6, '未': 7, '申': 8, '酉': 9, '戌': 10, '亥': 11,
}
const INDEX_BRANCH = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// ④ 천희성·홍란성 도출 (산식 메모 공식 그대로)
//   천희지 = (9 - 년지index + 12) % 12   (酉=9 에서 년지만큼 역행)
//   홍란지 = (천희지 + 6) % 12            (천희와 충)
function cheonhuiHongran(yearBranch: string): { cheonhui: string; hongran: string } | null {
  const yi = BRANCH_INDEX[yearBranch]
  if (yi === undefined) return null
  const ch = (9 - yi + 12) % 12
  const hr = (ch + 6) % 12
  return { cheonhui: INDEX_BRANCH[ch], hongran: INDEX_BRANCH[hr] }
}

// ── 한 사람의 사주 요약(채점 입력) ──
export interface PersonSaju {
  dayStem: string      // 일간
  dayBranch: string    // 일지
  yearBranch: string   // 년지 (천희·홍란 도출)
  ganji: string        // 일주 60갑자 (본명일 판정)
  yongsin: string      // 용신 오행 (calcYongsin 결과)
}

// ── 후보 채점 입력 ──
export interface ScoreInput {
  dayStem: string      // 후보날 일간
  dayBranch: string    // 후보날 일지
  ganji: string        // 후보날 일주 간지
  monthBranch: string  // 후보날 월지 (계절 판정)
  lunarDay: number | null // 음력일 (손없는날). 모르면 null → 0점 처리
  groom: PersonSaju
  bride: PersonSaju
}

export interface FilterResult {
  passed: boolean
  reasons: string[]    // 탈락 사유 (피할 날 표시용)
}

// 0단계: 강력 필터 — 하나라도 걸리면 제외
export function applyFilters(input: ScoreInput): FilterResult {
  const reasons: string[] = []
  const { dayBranch, ganji, monthBranch, groom, bride } = input

  // F2. 일지 충 (신랑 OR 신부 일지와)
  if (isChung(dayBranch, groom.dayBranch) || isChung(dayBranch, bride.dayBranch)) {
    reasons.push('두 사람 일지와 충(沖)')
  }
  // F3. 일지 원진
  if (isWonjin(dayBranch, groom.dayBranch) || isWonjin(dayBranch, bride.dayBranch)) {
    reasons.push('두 사람 일지와 원진(怨嗔)')
  }
  // F4. 본명일 (일주 간지 동일)
  if (ganji === groom.ganji || ganji === bride.ganji) {
    reasons.push('본명일 (신랑/신부 일진과 같은 날)')
  }
  // F5. 사폐일
  const season = seasonOf(monthBranch)
  if (season && SAPYE[season]?.includes(ganji)) {
    reasons.push('사폐일 (作事不成 대흉일)')
  }
  // F6. 천지전일
  if (season && CHEONJIJEON[season]?.includes(ganji)) {
    reasons.push('천지전일 (大凶日)')
  }
  // ※ F1. 공망은 recommend 단계에서 자체 계산해 주입

  return { passed: reasons.length === 0, reasons }
}

export interface WeddingBreakdown {
  total: number              // 0~100
  cheoneul: number           // 0~30
  yongsin: number            // 0~30
  sonEopneun: number         // 0~20
  cheonhuiHongran: number    // 0~20
  badges: string[]           // 적용 길신 배지
}

// 1단계: 100점 채점 (0단계 통과한 날만)
export function scoreWedding(input: ScoreInput): WeddingBreakdown {
  const { dayStem, dayBranch, lunarDay, groom, bride } = input
  const badges: string[] = []

  // ① 천을귀인일 — 30점 (신랑 일간 기준 +15, 신부 일간 기준 +15)
  let cheoneul = 0
  if (CHEONEUL[groom.dayStem]?.includes(dayBranch)) cheoneul += 15
  if (CHEONEUL[bride.dayStem]?.includes(dayBranch)) cheoneul += 15
  if (cheoneul > 0) badges.push('천을귀인')

  // ② 부부 용신일 — 30점
  //   후보날 간지 오행 집합 = { 일간오행, 일지오행 }
  const dayElems = new Set<string>()
  if (STEM_ELEMENT[dayStem]) dayElems.add(STEM_ELEMENT[dayStem])
  if (BRANCH_ELEMENT[dayBranch]) dayElems.add(BRANCH_ELEMENT[dayBranch])
  let yongsin = 0
  if (groom.yongsin && dayElems.has(groom.yongsin)) yongsin += 15
  if (bride.yongsin && dayElems.has(bride.yongsin)) yongsin += 15
  if (yongsin > 0) badges.push('용신 보완')

  // ③ 손 없는 날 — 20점 (음력 끝자리 9 또는 0)
  let sonEopneun = 0
  if (lunarDay != null) {
    const last = lunarDay % 10
    if (last === 9 || last === 0) { sonEopneun = 20; badges.push('손 없는 날') }
  }

  // ④ 천희성·홍란성 — 20점 (하나라도 만족 시)
  let chr = 0
  const g = cheonhuiHongran(groom.yearBranch)
  const b = cheonhuiHongran(bride.yearBranch)
  const starHit =
    (g && (dayBranch === g.cheonhui || dayBranch === g.hongran)) ||
    (b && (dayBranch === b.cheonhui || dayBranch === b.hongran))
  // OR: 후보날 일지가 신랑/신부 일지와 육합 또는 삼합
  const hapHit =
    isYukhap(dayBranch, groom.dayBranch) || isYukhap(dayBranch, bride.dayBranch) ||
    isSamhap(dayBranch, groom.dayBranch) || isSamhap(dayBranch, bride.dayBranch)
  if (starHit || hapHit) { chr = 20; badges.push(starHit ? '천희·홍란' : '육합·삼합') }

  let total = cheoneul + yongsin + sonEopneun + chr
  if (total > 100) total = 100

  // ⑤ (보강·선택) 천덕·월덕일 +10 — 산식 메모에 표 미수록이라 보류.
  //    연재 선생님이 월지 기준 천덕/월덕 표를 주시면 여기서 +10 (총점 100 상한) 추가.
  //    TODO: docs/결혼택일_산식.md ⑤항 확정 후 구현.

  return { total, cheoneul, yongsin, sonEopneun, cheonhuiHongran: chr, badges }
}

// 점수 → 등급/별점 (산식 메모 표)
export function gradeOf(score: number): { grade: string; stars: number } {
  if (score >= 90) return { grade: 'S', stars: 5 }
  if (score >= 75) return { grade: 'A', stars: 4 }
  if (score >= 60) return { grade: 'B', stars: 3 }
  if (score >= 45) return { grade: 'C', stars: 2 }
  return { grade: 'D', stars: 1 }
}

export { seasonOf }
