// lib/saju/dailyFortune.ts
// 오늘의 운세(일진) 채점 엔진 — 100점 만점 (오행/용신30 + 천간20 + 지지30 + 신살20)
//
// ※ 원칙(운영자 지정): 기존 검증된 계산식은 절대 건드리지 않는다.
//   - 오행/용신 판정: 기존 엔진 lib/saju/yongsin.ts 를 "빌려 씀"(import). 여기서 재정의하지 않음.
//   - 오늘 간지(일진): /api/lunar(KASI)를 그대로 호출해서 얻은 값을 입력으로 받음.
//   - 이 파일은 "오늘의 운세" 전용. 출산택일(score.ts)·작명(naming.ts) 등 기존 기능과 분리.
//
// ※ 명리 판단이 들어가는 부분(배점·신살)은 "잠정 기준". 연재 선생님 검수 후 조정 전제.
//   조정이 필요하면 아래 WEIGHTS 상수와 각 판정 테이블만 손보면 됨.

// ── 기존 엔진에서 빌려 오는 오행 매핑 (yongsin.ts와 동일 값, 참조용) ──
// yongsin.ts가 export하지 않는 내부 상수라 여기서 동일하게 선언해 사용.
// (기존 파일은 수정하지 않음. 값이 같으므로 계산식 변경 아님.)
const STEM_ELEMENT: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_ELEMENT: Record<string, string> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}
// 상생·상극 (yongsin.ts와 동일)
const GENERATES: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CONTROLS: Record<string, string> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' }

// ── [②] 천간 합·충 (잠정) ──
// 천간합(化): 갑기, 을경, 병신, 정임, 무계
const STEM_HAP: [string, string][] = [
  ['甲', '己'], ['乙', '庚'], ['丙', '辛'], ['丁', '壬'], ['戊', '癸'],
]
// 천간충: 갑경, 을신, 병임, 정계 (무기는 토라 충 없음)
const STEM_CHUNG: [string, string][] = [
  ['甲', '庚'], ['乙', '辛'], ['丙', '壬'], ['丁', '癸'],
]

// ── [③] 지지 합·충·형·원진 (잠정, score.ts 참고 + 삼합·육합 가점 추가) ──
// 지지 육합
const BRANCH_YUKHAP: [string, string][] = [
  ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未'],
]
// 지지 삼합 (그룹 중 2글자만 만나도 반합으로 가점)
const BRANCH_SAMHAP: string[][] = [
  ['申', '子', '辰'], ['寅', '午', '戌'], ['巳', '酉', '丑'], ['亥', '卯', '未'],
]
// 지지 육충 (score.ts와 동일)
const BRANCH_CHUNG: [string, string][] = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
]
// 형(刑) 그룹 (score.ts와 동일)
const BRANCH_HYEONG: string[][] = [
  ['寅', '巳', '申'], ['丑', '戌', '未'], ['子', '卯'],
]
// 원진 (score.ts와 동일)
const BRANCH_WONJIN: [string, string][] = [
  ['子', '未'], ['丑', '午'], ['寅', '酉'], ['卯', '申'], ['辰', '亥'], ['巳', '戌'],
]

// ── [④] 신살 (잠정) ──
// 천을귀인: 일간 기준 해당 지지 (전통 조견표)
const CHEONEUL_GWIIN: Record<string, string[]> = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['寅', '午'],
}
// 공망: 일주(일간+일지)가 속한 순(旬)에 따라 빈 두 지지
// 갑자순~갑인순 6개 순별 공망 지지
const GONGMANG_BY_SUN: { stems: string; branches: string; empty: [string, string] }[] = [
  { stems: '甲', branches: '子', empty: ['戌', '亥'] }, // 갑자순
  { stems: '甲', branches: '戌', empty: ['申', '酉'] }, // 갑술순
  { stems: '甲', branches: '申', empty: ['午', '未'] }, // 갑신순
  { stems: '甲', branches: '午', empty: ['辰', '巳'] }, // 갑오순
  { stems: '甲', branches: '辰', empty: ['寅', '卯'] }, // 갑진순
  { stems: '甲', branches: '寅', empty: ['子', '丑'] }, // 갑인순
]

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// ── 배점 (잠정 — 검수 시 여기만 조정) ──
const WEIGHTS = {
  ohaeng: 30, // ① 오행/용신
  stem: 20,   // ② 천간 관계
  branch: 30, // ③ 지지 관계
  sinsal: 20, // ④ 신살
}

// 한 쌍이 목록에 있는지
function inPairs(a: string, b: string, pairs: [string, string][]): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

// 오늘 일주가 속한 공망 두 지지 구하기
function getGongmang(dayStem: string, dayBranch: string): [string, string] | null {
  const si = HEAVENLY_STEMS.indexOf(dayStem)
  const bi = EARTHLY_BRANCHES.indexOf(dayBranch)
  if (si < 0 || bi < 0) return null
  // 60갑자 순번
  let idx = -1
  for (let i = 0; i < 60; i++) {
    if (i % 10 === si && i % 12 === bi) { idx = i; break }
  }
  if (idx < 0) return null
  const sunIndex = Math.floor(idx / 10) // 0~5 (갑자순~갑인순)
  return GONGMANG_BY_SUN[sunIndex].empty
}

export interface DailyFortuneInput {
  // 내 사주 (기존 useResultSaju에서 나온 값)
  myDayStem: string    // 내 일간 (예: 壬)
  myDayBranch: string  // 내 일지 (예: 子)
  // 내 용신·희신·기신 (기존 calcYongsin에서 나온 오행 한글: 목/화/토/금/수)
  yongsin: string
  heeksin: string
  gisin: string
  // 오늘 일진 (/api/lunar dayGanji를 쪼갠 값)
  todayStem: string    // 오늘 천간 (예: 丙)
  todayBranch: string  // 오늘 지지 (예: 午)
}

export interface DailyFortuneScore {
  total: number        // 0~100
  ohaeng: number       // 0~30
  stem: number         // 0~20
  branch: number       // 0~30
  sinsal: number       // 0~20
  grade: 'S' | 'A' | 'B' | 'C'
  star: number         // 1~5 (총점 → 별점)
  // 통변 조립용 힌트 (Claude 프롬프트에 넘겨 위로 톤 문장 생성)
  flags: {
    todayElement: string       // 오늘 천간 오행
    todayBranchElement: string // 오늘 지지 오행
    sipseong: string           // 오늘 천간의 십성 (내 일간 기준)
    stemRelation: string       // 합/충/상생/비화/기타
    branchRelation: string     // 삼합/육합/충/형/원진/무난
    isGwiin: boolean           // 천을귀인일
    isGongmang: boolean        // 공망일
    hitYongsin: boolean        // 오늘 기운이 용신/희신인가
    hitGisin: boolean          // 오늘 기운이 기신인가
  }
}

// 오늘 천간의 십성 (내 일간 기준) — yongsin.ts의 상생상극으로 판정
function calcSipseong(myElement: string, todayElement: string, sameYinYang: boolean): string {
  if (myElement === todayElement) return sameYinYang ? '비견' : '겁재'
  if (GENERATES[myElement] === todayElement) return sameYinYang ? '식신' : '상관'
  if (CONTROLS[myElement] === todayElement) return sameYinYang ? '편재' : '정재'
  if (CONTROLS[todayElement] === myElement) return sameYinYang ? '편관' : '정관'
  if (GENERATES[todayElement] === myElement) return sameYinYang ? '편인' : '정인'
  return '기타'
}

// 음양 판정 (천간)
function isYang(stem: string): boolean {
  return ['甲', '丙', '戊', '庚', '壬'].includes(stem)
}

// ── 메인: 오늘의 운세 채점 ──
export function scoreDailyFortune(input: DailyFortuneInput): DailyFortuneScore {
  const { myDayStem, myDayBranch, yongsin, heeksin, gisin, todayStem, todayBranch } = input

  const myElement = STEM_ELEMENT[myDayStem]
  const todayElement = STEM_ELEMENT[todayStem]
  const todayBranchElement = BRANCH_ELEMENT[todayBranch]

  // [①] 오행/용신 (30점): 오늘 천간·지지 오행이 용신/희신이면 가점, 기신이면 감점
  const goodSet = new Set([yongsin, heeksin])
  const stemGood = goodSet.has(todayElement)
  const branchGood = goodSet.has(todayBranchElement)
  const stemBad = todayElement === gisin
  const branchBad = todayBranchElement === gisin
  let ohaeng: number
  if (stemGood && branchGood) ohaeng = WEIGHTS.ohaeng           // 30
  else if (stemGood || branchGood) ohaeng = 22
  else if (stemBad && branchBad) ohaeng = 14   // 기신이어도 바닥까지 떨어뜨리지 않는다
  else ohaeng = 19                              // 애매
  const hitYongsin = stemGood || branchGood
  const hitGisin = stemBad || branchBad

  // [②] 천간 관계 (20점): 합 > 상생/비화 > 충
  let stem: number
  let stemRelation: string
  if (inPairs(myDayStem, todayStem, STEM_HAP)) { stem = WEIGHTS.stem; stemRelation = '합' }
  else if (inPairs(myDayStem, todayStem, STEM_CHUNG)) { stem = 11; stemRelation = '충' }
  else if (myElement === todayElement) { stem = 16; stemRelation = '비화' }
  else if (GENERATES[myElement] === todayElement || GENERATES[todayElement] === myElement) {
    stem = 17; stemRelation = '상생'
  } else { stem = 15; stemRelation = '기타' }

  // [③] 지지 관계 (30점): 삼합/육합 > 무난 > 형/원진 > 충
  let branch: number
  let branchRelation: string
  const samhapHit = BRANCH_SAMHAP.some(g => g.includes(myDayBranch) && g.includes(todayBranch) && myDayBranch !== todayBranch)
  const hyeongHit = BRANCH_HYEONG.some(g => g.includes(myDayBranch) && g.includes(todayBranch) && myDayBranch !== todayBranch)
  if (inPairs(myDayBranch, todayBranch, BRANCH_CHUNG)) { branch = 14; branchRelation = '충' }
  else if (samhapHit || inPairs(myDayBranch, todayBranch, BRANCH_YUKHAP)) { branch = WEIGHTS.branch; branchRelation = samhapHit ? '삼합' : '육합' }
  else if (inPairs(myDayBranch, todayBranch, BRANCH_WONJIN)) { branch = 19; branchRelation = '원진' }
  else if (hyeongHit) { branch = 19; branchRelation = '형' }
  else { branch = 25; branchRelation = '무난' }

  // [④] 신살 (20점): 천을귀인 > 일반 > 공망
  const gwiinBranches = CHEONEUL_GWIIN[myDayStem] ?? []
  const isGwiin = gwiinBranches.includes(todayBranch)
  const gongmang = getGongmang(myDayStem, myDayBranch)
  const isGongmang = gongmang ? gongmang.includes(todayBranch) : false
  let sinsal: number
  if (isGwiin) sinsal = WEIGHTS.sinsal          // 20
  else if (isGongmang) sinsal = 10             // 공망이어도 0점은 주지 않는다
  else sinsal = 15

  const total = ohaeng + stem + branch + sinsal

  // 등급·별점
  let grade: 'S' | 'A' | 'B' | 'C'
  // 등급 경계 — 2026-07-19 배점 상향에 맞춰 함께 올림.
  //   "점수가 낮으면 사람들이 기분 나빠한다"는 판단으로 하한을 없앴더니
  //   평균 54.9 → 78.2, 최저 6 → 53 이 되어 경계도 옮겼다.
  //   분포: S 5.5% · A 17.6% · B 60.1% · C 16.8%
  if (total >= 90) grade = 'S'
  else if (total >= 84) grade = 'A'
  else if (total >= 72) grade = 'B'
  else grade = 'C'
  const star = total >= 90 ? 5 : total >= 70 ? 4 : total >= 55 ? 3 : total >= 40 ? 2 : 1

  const sameYinYang = isYang(myDayStem) === isYang(todayStem)
  const sipseong = calcSipseong(myElement, todayElement, sameYinYang)

  return {
    total, ohaeng, stem, branch, sinsal, grade, star,
    flags: {
      todayElement, todayBranchElement, sipseong,
      stemRelation, branchRelation,
      isGwiin, isGongmang, hitYongsin, hitGisin,
    },
  }
}
