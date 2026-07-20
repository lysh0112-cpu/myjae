// lib/saju/coupleScore.ts
// 두 사람 궁합 점수 계산 — 명리학 기반 고정값
// 배점(시 있을 때): 일주28 용신18 년주10 월주8 공망6 오행10 조후8 시주12 = 100
// 시 모를 때: 시주(12) 제외 → 나머지 88점 만점을 100점으로 비율 환산 (노트북LM 원리)

// 용신은 새 억부용신(정확한 100점 계산)을 쓴다.
//   calcYongsinCompat = 낡은 calcYongsin과 같은 형태(heeksin 등)를 반환하는 어댑터.
import { calcYongsinCompat as calcYongsin } from './yongsinNew'

// 심산 오행 점수(월지 계절 치환)를 쓰기 위한 양력 날짜·시지.
//   넘기지 않으면 예전처럼 자체 배점으로 계산한다(호환 유지).
export interface SolarInfo { month: number; day: number; hourBranch: string | null }

// =============================================
// 상수 테이블
// =============================================

export const GENERATES: Record<string, string> = {
  목: '화', 화: '토', 토: '금', 금: '수', 수: '목'
}
export const CONTROLS: Record<string, string> = {
  목: '토', 화: '금', 토: '수', 금: '목', 수: '화'
}
export const STEM_ELEMENT: Record<string, string> = {
  甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',
  己:'토',庚:'금',辛:'금',壬:'수',癸:'수'
}
export const BRANCH_ELEMENT: Record<string, string> = {
  子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',
  午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수'
}

// 계절(월지 기준) — 조후 계산용
export const BRANCH_SEASON: Record<string, string> = {
  寅:'봄',卯:'봄',辰:'봄', 巳:'여름',午:'여름',未:'여름',
  申:'가을',酉:'가을',戌:'가을', 亥:'겨울',子:'겨울',丑:'겨울'
}

// 형충회합파해 표
const JI_YUKHAP = [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']]
const SAMHAP = [['申','子','辰'],['亥','卯','未'],['寅','午','戌'],['巳','酉','丑']]
const BANGHAP = [['寅','卯','辰'],['巳','午','未'],['申','酉','戌'],['亥','子','丑']]
const CHUNG = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']]
const HYUNG = [['寅','巳'],['巳','申'],['丑','戌'],['戌','未'],['子','卯']]
const PA = [['子','酉'],['丑','辰'],['寅','亥'],['卯','午'],['巳','申'],['未','戌']]
const HAE = [['子','未'],['丑','午'],['寅','巳'],['卯','辰'],['申','亥'],['酉','戌']]
const GAN_HAP = [['甲','己'],['乙','庚'],['丙','辛'],['丁','壬'],['戊','癸']]

// =============================================
// 유틸 함수
// =============================================

export function isPair(a: string, b: string, pairs: string[][]): boolean {
  return pairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x))
}

export function isInTrio(a: string, b: string, trios: string[][]): boolean {
  return trios.some(trio => trio.includes(a) && trio.includes(b))
}

export function getElementRelation(e1: string, e2: string): 'same' | 'generates' | 'generated' | 'controls' | 'controlled' | 'neutral' {
  if (e1 === e2) return 'same'
  if (GENERATES[e1] === e2) return 'generates'
  if (GENERATES[e2] === e1) return 'generated'
  if (CONTROLS[e1] === e2) return 'controls'
  if (CONTROLS[e2] === e1) return 'controlled'
  return 'neutral'
}

export function seasonTemp(season: string): 'hot' | 'cold' | 'mild' {
  if (season === '여름') return 'hot'
  if (season === '겨울') return 'cold'
  return 'mild'
}

export function hasValidPillar(stem: string, branch: string): boolean {
  return !!stem && !!branch && stem !== '?' && branch !== '?'
}

// =============================================
// 점수 항목별 인터페이스
// =============================================

export interface ScoreDetail {
  category: string
  item: string
  score: number
  reason: string
}

export interface CoupleScoreResult {
  totalScore: number
  details: ScoreDetail[]
  iljuScore: number       // 28
  yongsinScore: number    // 18
  yeonScore: number       // 10
  wolScore: number        // 8
  gongmangScore: number   // 6
  ohaengScore: number     // 10
  johuScore: number       // 8
  sijuScore: number       // 12 (시 모를 땐 0)
  hasSiju: boolean
  grade: string
  gradeDesc: string
}

export interface SajuPillarSimple {
  pillar: string
  stem: string
  branch: string
}

// =============================================
// ① 일주 관계 (28점)
// =============================================

export function calcIljuScore(
  stem1: string, branch1: string,
  stem2: string, branch2: string,
  details: ScoreDetail[]
): number {
  let score = 0

  if (isPair(branch1, branch2, JI_YUKHAP)) {
    score += 20
    details.push({ category: '일주', item: `일지 육합 (${branch1}${branch2})`, score: 20, reason: '일지가 육합으로 천생연분 관계' })
  } else if (isInTrio(branch1, branch2, SAMHAP)) {
    score += 15
    details.push({ category: '일주', item: `일지 삼합 (${branch1}${branch2})`, score: 15, reason: '일지가 삼합으로 강한 인연' })
  } else if (isInTrio(branch1, branch2, BANGHAP)) {
    score += 12
    details.push({ category: '일주', item: `일지 방합 (${branch1}${branch2})`, score: 12, reason: '일지가 방합으로 같은 방향' })
  } else if (isPair(branch1, branch2, CHUNG)) {
    score -= 20
    details.push({ category: '일주', item: `일지 충 (${branch1}${branch2}충)`, score: -20, reason: '일지가 충으로 갈등 주의' })
  } else if (isPair(branch1, branch2, HYUNG)) {
    score -= 12
    details.push({ category: '일주', item: `일지 형 (${branch1}${branch2}형)`, score: -12, reason: '일지가 형으로 마찰 가능성' })
  } else if (isPair(branch1, branch2, PA)) {
    score -= 6
    details.push({ category: '일주', item: `일지 파 (${branch1}${branch2}파)`, score: -6, reason: '일지가 파로 소소한 갈등' })
  } else if (isPair(branch1, branch2, HAE)) {
    score -= 4
    details.push({ category: '일주', item: `일지 해 (${branch1}${branch2}해)`, score: -4, reason: '일지가 해로 약한 방해' })
  }

  if (isPair(stem1, stem2, GAN_HAP)) {
    score += 8
    details.push({ category: '일주', item: `일간 천간합 (${stem1}${stem2}합)`, score: 8, reason: '일간이 천간합으로 강한 끌림' })
  } else {
    const e1 = STEM_ELEMENT[stem1]
    const e2 = STEM_ELEMENT[stem2]
    const rel = getElementRelation(e1, e2)
    if (rel === 'controls' || rel === 'controlled') {
      score -= 8
      details.push({ category: '일주', item: `일간 상극 (${e1}→${e2})`, score: -8, reason: '일간 오행이 상극 관계' })
    } else if (rel === 'generates' || rel === 'generated') {
      score += 5
      details.push({ category: '일주', item: `일간 상생 (${e1}→${e2})`, score: 5, reason: '일간 오행이 상생 관계' })
    }
  }

  return Math.max(-20, Math.min(28, score))
}

// =============================================
// ② 용신 조화 (18점)
// =============================================

export function calcYongsinScore(
  saju1: SajuPillarSimple[], saju2: SajuPillarSimple[],
  dayStem1: string, dayStem2: string,
  details: ScoreDetail[],
  dates?: [SolarInfo, SolarInfo],
): number {
  let score = 0
  try {
    // 심산 오행 점수로 용신 계산 (월지 계절 치환 반영)
    const y1 = calcYongsin(saju1, dayStem1, dates?.[0].month, dates?.[0].day, dates?.[0].hourBranch)
    const y2 = calcYongsin(saju2, dayStem2, dates?.[1].month, dates?.[1].day, dates?.[1].hourBranch)
    const rel = getElementRelation(y1.yongsin, y2.yongsin)

    if (rel === 'same') {
      score = 18
      details.push({ category: '용신', item: `용신 동일 (${y1.yongsin})`, score: 18, reason: '두 사람 용신이 같아 완벽한 조화' })
    } else if (rel === 'generates') {
      score = 14
      details.push({ category: '용신', item: `용신 상생 (${y1.yongsin}→${y2.yongsin})`, score: 14, reason: '내 용신이 상대 용신을 생해줌' })
    } else if (rel === 'generated') {
      score = 11
      details.push({ category: '용신', item: `용신 상생 (${y2.yongsin}→${y1.yongsin})`, score: 11, reason: '상대 용신이 내 용신을 생해줌' })
    } else if (rel === 'neutral') {
      score = 5
      details.push({ category: '용신', item: `용신 중립 (${y1.yongsin}·${y2.yongsin})`, score: 5, reason: '용신이 중립 관계' })
    } else {
      score = -13
      details.push({ category: '용신', item: `용신 상극 (${y1.yongsin}↔${y2.yongsin})`, score: -13, reason: '용신이 상극으로 에너지 충돌' })
    }

    if (y1.heeksin === y2.yongsin || y2.heeksin === y1.yongsin) {
      score += 4
      details.push({ category: '용신', item: '희신-용신 보완', score: 4, reason: '희신이 상대 용신을 보완' })
    }
    if (y1.gisin === y2.yongsin || y2.gisin === y1.yongsin) {
      score -= 7
      details.push({ category: '용신', item: '기신-용신 충돌', score: -7, reason: '기신이 상대 용신에 영향' })
    }
  } catch {
    score = 5
  }
  return Math.max(-13, Math.min(18, score))
}

// =============================================
// ③ 년주 관계 (10점)
// =============================================

export function calcYeonScore(
  yStem1: string, yBranch1: string,
  yStem2: string, yBranch2: string,
  details: ScoreDetail[]
): number {
  let score = 0

  if (isPair(yStem1, yStem2, GAN_HAP)) {
    score += 8
    details.push({ category: '년주', item: `년간 천간합 (${yStem1}${yStem2})`, score: 8, reason: '같은 시대적 가치관과 기운' })
  } else if (yStem1 === yStem2) {
    score += 5
    details.push({ category: '년주', item: `년간 동일 (${yStem1})`, score: 5, reason: '동갑 또는 같은 천간' })
  }

  if (isInTrio(yBranch1, yBranch2, SAMHAP)) {
    score += 6
    details.push({ category: '년주', item: `년지 삼합 (${yBranch1}${yBranch2})`, score: 6, reason: '년지 삼합으로 운명적 인연' })
  } else if (isPair(yBranch1, yBranch2, JI_YUKHAP)) {
    score += 6
    details.push({ category: '년주', item: `년지 육합 (${yBranch1}${yBranch2})`, score: 6, reason: '년지 육합으로 잘 맞는 궁합' })
  } else if (isPair(yBranch1, yBranch2, CHUNG)) {
    score -= 8
    details.push({ category: '년주', item: `년지 충 (${yBranch1}${yBranch2}충)`, score: -8, reason: '년지 충으로 가치관 충돌' })
  }

  const ye1 = STEM_ELEMENT[yStem1]
  const ye2 = STEM_ELEMENT[yStem2]
  if (getElementRelation(ye1, ye2) === 'controls' || getElementRelation(ye1, ye2) === 'controlled') {
    score -= 5
    details.push({ category: '년주', item: `년간 상극 (${ye1}↔${ye2})`, score: -5, reason: '년간 오행 상극' })
  }

  return Math.max(-8, Math.min(10, score))
}

// =============================================
// ④ 월주 관계 (8점)
// =============================================

export function calcWolScore(
  mStem1: string, mBranch1: string,
  mStem2: string, mBranch2: string,
  details: ScoreDetail[]
): number {
  let score = 0

  if (isInTrio(mBranch1, mBranch2, SAMHAP)) {
    score += 8
    details.push({ category: '월주', item: `월지 삼합 (${mBranch1}${mBranch2})`, score: 8, reason: '월지 삼합으로 생활 리듬이 잘 맞음' })
  } else if (isPair(mBranch1, mBranch2, JI_YUKHAP)) {
    score += 6
    details.push({ category: '월주', item: `월지 육합 (${mBranch1}${mBranch2})`, score: 6, reason: '월지 육합으로 일상이 조화롭' })
  } else if (isPair(mBranch1, mBranch2, CHUNG)) {
    score -= 6
    details.push({ category: '월주', item: `월지 충 (${mBranch1}${mBranch2}충)`, score: -6, reason: '월지 충으로 생활 습관 충돌' })
  }

  if (isPair(mStem1, mStem2, GAN_HAP)) {
    score += 5
    details.push({ category: '월주', item: `월간 천간합 (${mStem1}${mStem2})`, score: 5, reason: '월간 합으로 감정적 유대' })
  }

  const me1 = STEM_ELEMENT[mStem1]
  const me2 = STEM_ELEMENT[mStem2]
  if (getElementRelation(me1, me2) === 'controls' || getElementRelation(me1, me2) === 'controlled') {
    score -= 4
    details.push({ category: '월주', item: `월간 상극 (${me1}↔${me2})`, score: -4, reason: '월간 오행 상극' })
  }

  return Math.max(-6, Math.min(8, score))
}

// =============================================
// ⑤ 공망 (6점)
// =============================================

export function calcGongmangScore(
  gm1: [string, string], gm2: [string, string],
  branch1: string, branch2: string,
  yBranch1: string, yBranch2: string,
  details: ScoreDetail[]
): number {
  let score = 0

  if (gm1.includes(branch2)) {
    score -= 8
    details.push({ category: '공망', item: `공망이 상대 일지 (${branch2})`, score: -8, reason: '내 공망이 상대 일지를 공망시킴' })
  }
  if (gm2.includes(branch1)) {
    score -= 8
    details.push({ category: '공망', item: `공망이 상대 일지 (${branch1})`, score: -8, reason: '상대 공망이 내 일지를 공망시킴' })
  }

  if (gm1.includes(yBranch2)) {
    score -= 4
    details.push({ category: '공망', item: `공망이 상대 년지 (${yBranch2})`, score: -4, reason: '내 공망이 상대 년지에 영향' })
  }
  if (gm2.includes(yBranch1)) {
    score -= 4
    details.push({ category: '공망', item: `공망이 상대 년지 (${yBranch1})`, score: -4, reason: '상대 공망이 내 년지에 영향' })
  }

  if (gm1[0] === gm2[0] && gm1[1] === gm2[1]) {
    score -= 3
    details.push({ category: '공망', item: `공통 공망 (${gm1.join(',')})`, score: -3, reason: '두 사람 공망이 같음' })
  }

  if (score === 0) {
    score = 4
    details.push({ category: '공망', item: '공망 영향 없음', score: 4, reason: '공망으로 인한 부정적 영향 없음' })
  }

  return Math.max(-6, Math.min(6, score))
}

// =============================================
// ⑥ 오행 균형 (10점)
// =============================================

export function calcOhaengScore(
  saju1: SajuPillarSimple[], saju2: SajuPillarSimple[],
  details: ScoreDetail[]
): number {
  const combined = [...saju1, ...saju2]
  const count: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }

  combined.forEach(p => {
    if (STEM_ELEMENT[p.stem]) count[STEM_ELEMENT[p.stem]]++
    if (BRANCH_ELEMENT[p.branch]) count[BRANCH_ELEMENT[p.branch]]++
  })

  const nonZero = Object.values(count).filter(v => v > 0).length
  const max = Math.max(...Object.values(count))
  const min = Math.min(...Object.values(count).filter(v => v > 0))
  const balance = max - min

  let score = 0
  if (nonZero === 5) {
    score = balance <= 2 ? 10 : balance <= 4 ? 7 : 5
    details.push({ category: '오행', item: `5행 균형 (편차 ${balance})`, score, reason: '두 사람 합쳐 5오행 모두 보유' })
  } else if (nonZero === 4) {
    score = 7
    details.push({ category: '오행', item: '4행 분포', score: 7, reason: '두 사람 합쳐 4오행 보유' })
  } else {
    score = 3
    details.push({ category: '오행', item: `${nonZero}행 분포`, score: 3, reason: '오행 편중 있음' })
  }

  const elements1 = new Set(saju1.map(p => STEM_ELEMENT[p.stem]).filter(Boolean))
  const elements2 = new Set(saju2.map(p => STEM_ELEMENT[p.stem]).filter(Boolean))
  const complement = [...elements1].filter(e => !elements2.has(e)).length
  if (complement >= 2) {
    score += 3
    details.push({ category: '오행', item: '오행 보완 관계', score: 3, reason: '서로 부족한 오행을 채워주는 관계' })
  }

  return Math.min(10, score)
}

// =============================================
// ⑦ 조후 (온도 밸런스) (8점)
// =============================================

export function calcJohuScore(
  mBranch1: string, mBranch2: string,
  details: ScoreDetail[]
): number {
  const s1 = BRANCH_SEASON[mBranch1]
  const s2 = BRANCH_SEASON[mBranch2]
  if (!s1 || !s2) {
    details.push({ category: '조후', item: '온도 정보 부족', score: 4, reason: '월지 정보가 부족해 중립으로 봄' })
    return 4
  }
  const t1 = seasonTemp(s1)
  const t2 = seasonTemp(s2)

  if ((t1 === 'hot' && t2 === 'cold') || (t1 === 'cold' && t2 === 'hot')) {
    details.push({ category: '조후', item: `온도 보완 (${s1}·${s2})`, score: 8, reason: '한 분은 따뜻하고 한 분은 서늘한 기운이라 서로의 온도를 잘 맞춰줌' })
    return 8
  }
  if ((t1 === 'hot' && t2 === 'hot') || (t1 === 'cold' && t2 === 'cold')) {
    details.push({ category: '조후', item: `온도 쏠림 (${s1}·${s2})`, score: 2, reason: '두 분 기운의 온도가 비슷해 가끔 조절이 필요함' })
    return 2
  }
  if (t1 === 'mild' && t2 === 'mild') {
    details.push({ category: '조후', item: `온화 (${s1}·${s2})`, score: 5, reason: '두 분 다 온화한 기운이라 편안하게 어울림' })
    return 5
  }
  details.push({ category: '조후', item: `무난 (${s1}·${s2})`, score: 5, reason: '한 분의 기운을 다른 한 분이 부드럽게 받쳐줌' })
  return 5
}

// =============================================
// ⑧ 시주 관계 (12점) — 자식운·말년운의 조화
//    두 사람 모두 시주를 아는 경우에만 계산.
// =============================================

export function calcSijuScore(
  hStem1: string, hBranch1: string,
  hStem2: string, hBranch2: string,
  details: ScoreDetail[]
): number {
  let score = 0

  if (isPair(hBranch1, hBranch2, JI_YUKHAP) || isInTrio(hBranch1, hBranch2, SAMHAP)) {
    score += 12
    details.push({ category: '시주', item: `시지 합 (${hBranch1}${hBranch2})`, score: 12, reason: '말년까지 서로 잘 맞는 기운' })
  } else if (isInTrio(hBranch1, hBranch2, BANGHAP)) {
    score += 9
    details.push({ category: '시주', item: `시지 방합 (${hBranch1}${hBranch2})`, score: 9, reason: '말년의 방향이 비슷함' })
  } else if (isPair(hBranch1, hBranch2, CHUNG)) {
    score -= 8
    details.push({ category: '시주', item: `시지 충 (${hBranch1}${hBranch2}충)`, score: -8, reason: '말년의 가치관 차이 가능성' })
  } else if (isPair(hBranch1, hBranch2, HYUNG) || isPair(hBranch1, hBranch2, PA) || isPair(hBranch1, hBranch2, HAE)) {
    score -= 4
    details.push({ category: '시주', item: `시지 형·파·해 (${hBranch1}${hBranch2})`, score: -4, reason: '말년에 소소한 마찰 가능성' })
  } else {
    score += 4
    details.push({ category: '시주', item: `시지 중립 (${hBranch1}·${hBranch2})`, score: 4, reason: '말년의 기운이 무난함' })
  }

  if (isPair(hStem1, hStem2, GAN_HAP)) {
    score += 3
    details.push({ category: '시주', item: `시간 천간합 (${hStem1}${hStem2})`, score: 3, reason: '말년까지 마음이 통함' })
  }

  return Math.max(-8, Math.min(12, score))
}

// =============================================
// 등급 계산
// =============================================

export function getGrade(score: number): { grade: string; gradeDesc: string } {
  if (score >= 90) return { grade: '운명이 점지한 천생연분 💫', gradeDesc: '이런 조합은 평생 한 번 만나기도 힘들어요' }
  if (score >= 80) return { grade: '소울메이트형 ✨', gradeDesc: '만나기 힘든 최고의 조합이에요' }
  if (score >= 70) return { grade: '서로를 성장시키는 황금 커플 🌟', gradeDesc: '함께할수록 더 빛나는 인연이에요' }
  if (score >= 55) return { grade: '다름이 매력인 탐구형 커플 💡', gradeDesc: '서로의 다름이 오히려 큰 매력이에요' }
  if (score >= 40) return { grade: '노력으로 완성되는 드라마틱 커플 🔥', gradeDesc: '함께 만들어가는 사랑이 더 특별해요' }
  return { grade: '극과 극, 반전 매력 커플 ⚡', gradeDesc: '가장 강렬하고 잊지 못할 인연이에요' }
}

// =============================================
// 메인 함수
// =============================================

export function calcCoupleScore(
  saju1: SajuPillarSimple[],
  saju2: SajuPillarSimple[],
  gm1: [string, string],
  gm2: [string, string],
  // 심산 오행 점수용 양력 날짜·시지 (없으면 예전 방식으로 계산)
  dates?: [SolarInfo, SolarInfo],
): CoupleScoreResult {
  const details: ScoreDetail[] = []

  const ilju1 = saju1.find(p => p.pillar === '일주')
  const ilju2 = saju2.find(p => p.pillar === '일주')
  const yeon1 = saju1.find(p => p.pillar === '년주')
  const yeon2 = saju2.find(p => p.pillar === '년주')
  const wol1  = saju1.find(p => p.pillar === '월주')
  const wol2  = saju2.find(p => p.pillar === '월주')
  const si1   = saju1.find(p => p.pillar === '시주')
  const si2   = saju2.find(p => p.pillar === '시주')

  const dayStem1 = ilju1?.stem ?? ''
  const dayStem2 = ilju2?.stem ?? ''
  const dayBranch1 = ilju1?.branch ?? ''
  const dayBranch2 = ilju2?.branch ?? ''

  // 두 사람 모두 시주가 유효할 때만 시주 항목을 채점한다.
  const hasSiju =
    hasValidPillar(si1?.stem ?? '', si1?.branch ?? '') &&
    hasValidPillar(si2?.stem ?? '', si2?.branch ?? '')

  const iljuScore    = calcIljuScore(dayStem1, dayBranch1, dayStem2, dayBranch2, details)
  const yongsinScore = calcYongsinScore(saju1, saju2, dayStem1, dayStem2, details, dates)
  const yeonScore    = calcYeonScore(
    yeon1?.stem ?? '', yeon1?.branch ?? '',
    yeon2?.stem ?? '', yeon2?.branch ?? '',
    details
  )
  const wolScore     = calcWolScore(
    wol1?.stem ?? '', wol1?.branch ?? '',
    wol2?.stem ?? '', wol2?.branch ?? '',
    details
  )
  const gongmangScore = calcGongmangScore(
    gm1, gm2,
    dayBranch1, dayBranch2,
    yeon1?.branch ?? '', yeon2?.branch ?? '',
    details
  )
  const ohaengScore = calcOhaengScore(saju1, saju2, details)
  const johuScore   = calcJohuScore(wol1?.branch ?? '', wol2?.branch ?? '', details)

  let sijuScore = 0
  if (hasSiju) {
    sijuScore = calcSijuScore(
      si1!.stem, si1!.branch,
      si2!.stem, si2!.branch,
      details
    )
  } else {
    details.push({ category: '시주', item: '시주 생략', score: 0, reason: '태어난 시간을 몰라 시주는 빼고, 나머지로 100점 기준으로 맞췄어요' })
  }

  // 항목 상한(시 있을 때): 28+18+10+8+6+10+8+12 = 100
  const rawTotal = iljuScore + yongsinScore + yeonScore + wolScore + gongmangScore + ohaengScore + johuScore + sijuScore

  const baseline = 28 + 18 + 8
  let normalized = Math.min(100, Math.max(0, rawTotal + baseline))

  // 시 모를 때: 시주(12점) 제외한 88점 만점 → 100점으로 비율 환산
  if (!hasSiju) {
    normalized = normalized * (100 / 88)
  }

  const totalScore = Math.min(100, Math.max(0, Math.round(normalized)))
  const { grade, gradeDesc } = getGrade(totalScore)

  return {
    totalScore,
    details,
    iljuScore,
    yongsinScore,
    yeonScore,
    wolScore,
    gongmangScore,
    ohaengScore,
    johuScore,
    sijuScore,
    hasSiju,
    grade,
    gradeDesc,
  }
}
