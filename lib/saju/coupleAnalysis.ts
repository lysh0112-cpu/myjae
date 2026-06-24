import { findRelations } from './relations'
import { getGongmang } from './gongmang'
import { calcYongsin } from './yongsin'
import { calcCoupleScore } from './coupleScore'

export interface SajuPillar {
  pillar: string
  stem: string
  branch: string
}

export interface CoupleAnalysis {
  person1Relations: string[]
  person2Relations: string[]
  person1Yongsin: string
  person2Yongsin: string
  person1Gongmang: [string, string]
  person2Gongmang: [string, string]
  iljji1: string
  iljji2: string
  iljjiRelation: string
  yongsinHarmony: string
  sajuScore: number
  grade: string
  gradeDesc: string
  scoreDetails: string
  summary: string
}

const CHUNG_PAIRS = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']]
const JI_HAP_PAIRS = [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']]
const GENERATES: Record<string,string> = {목:'화',화:'토',토:'금',금:'수',수:'목'}
const CONTROLS: Record<string,string> = {목:'토',화:'금',토:'수',금:'목',수:'화'}

function getIljjiRelation(b1: string, b2: string): string {
  for (const [a, b] of CHUNG_PAIRS) {
    if ((b1===a&&b2===b)||(b1===b&&b2===a)) return `${b1}${b2}충 (갈등 주의)`
  }
  for (const [a, b] of JI_HAP_PAIRS) {
    if ((b1===a&&b2===b)||(b1===b&&b2===a)) return `${b1}${b2}합 (천생연분)`
  }
  return '중립'
}

function getYongsinHarmony(y1: string, y2: string): string {
  if (!y1 || !y2) return '분석 불가'
  if (y1 === y2) return `두 사람 용신이 같아(${y1}) 서로 잘 맞아요`
  if (GENERATES[y1] === y2) return `${y1}이 ${y2}을 생해줘 상생 관계예요`
  if (GENERATES[y2] === y1) return `${y2}이 ${y1}을 생해줘 상생 관계예요`
  if (CONTROLS[y1] === y2 || CONTROLS[y2] === y1) return `용신이 상극 관계 — 보완이 필요해요`
  return '중립적인 용신 관계예요'
}

// "甲子" → { stem: "甲", branch: "子" }
export function parseGanji(ganji: string): { stem: string; branch: string } {
  if (!ganji || ganji.length < 2) return { stem: '?', branch: '?' }
  return { stem: ganji[0], branch: ganji[1] }
}

// API 응답으로 SajuPillar[] 생성
export function buildSajuPillars(
  yearGanji: string,
  monthGanji: string,
  dayGanji: string,
  hourGanji?: string
): SajuPillar[] {
  const year = parseGanji(yearGanji)
  const month = parseGanji(monthGanji)
  const day = parseGanji(dayGanji)
  const hour = hourGanji ? parseGanji(hourGanji) : { stem: '?', branch: '?' }
  return [
    { pillar: '시주', stem: hour.stem, branch: hour.branch },
    { pillar: '일주', stem: day.stem, branch: day.branch },
    { pillar: '월주', stem: month.stem, branch: month.branch },
    { pillar: '년주', stem: year.stem, branch: year.branch },
  ]
}

export function analyzeCoupleFromPillars(
  saju1: SajuPillar[],
  saju2: SajuPillar[],
): CoupleAnalysis {
  const ilju1 = saju1.find(p => p.pillar === '일주')
  const ilju2 = saju2.find(p => p.pillar === '일주')
  const dayStem1 = ilju1?.stem ?? ''
  const dayStem2 = ilju2?.stem ?? ''
  const iljji1 = ilju1?.branch ?? ''
  const iljji2 = ilju2?.branch ?? ''

  const person1Relations = findRelations(saju1)
  const person2Relations = findRelations(saju2)

  const yongsin1Result = dayStem1 ? calcYongsin(saju1, dayStem1) : null
  const yongsin2Result = dayStem2 ? calcYongsin(saju2, dayStem2) : null

  const person1Yongsin = yongsin1Result?.yongsin ?? ''
  const person2Yongsin = yongsin2Result?.yongsin ?? ''

  const person1Gongmang = dayStem1 && iljji1
    ? getGongmang(dayStem1, iljji1) : ['?','?'] as [string,string]
  const person2Gongmang = dayStem2 && iljji2
    ? getGongmang(dayStem2, iljji2) : ['?','?'] as [string,string]

  const iljjiRelation = getIljjiRelation(iljji1, iljji2)
  const yongsinHarmony = getYongsinHarmony(person1Yongsin, person2Yongsin)

  // ✅ coupleScore.ts 정교한 고정값 계산 사용
  const scoreResult = calcCoupleScore(
    saju1, saju2,
    person1Gongmang,
    person2Gongmang
  )
  const sajuScore = scoreResult.totalScore
  const grade = scoreResult.grade
  const gradeDesc = scoreResult.gradeDesc

  // 점수 상세 내역 텍스트
  const scoreDetails = [
    `일주관계: ${scoreResult.iljuScore}점`,
    `용신조화: ${scoreResult.yongsinScore}점`,
    `년주관계: ${scoreResult.yeonScore}점`,
    `월주관계: ${scoreResult.wolScore}점`,
    `공망: ${scoreResult.gongmangScore}점`,
    `오행균형: ${scoreResult.ohaengScore}점`,
  ].join(' / ')

  const summary = `
[명리학 계산 결과]
총점: ${sajuScore}점 (${grade})
${scoreDetails}
일지 관계: ${iljjiRelation}
용신 조화: ${yongsinHarmony}
사람1 사주 내 형충회합파해: ${person1Relations.join(', ') || '특이사항 없음'}
사람2 사주 내 형충회합파해: ${person2Relations.join(', ') || '특이사항 없음'}
사람1 공망: ${person1Gongmang.join(',')} / 용신: ${person1Yongsin} (${yongsin1Result?.description ?? ''})
사람2 공망: ${person2Gongmang.join(',')} / 용신: ${person2Yongsin} (${yongsin2Result?.description ?? ''})
  `.trim()

  return {
    person1Relations, person2Relations,
    person1Yongsin, person2Yongsin,
    person1Gongmang, person2Gongmang,
    iljji1, iljji2,
    iljjiRelation, yongsinHarmony,
    sajuScore, grade, gradeDesc,
    scoreDetails, summary,
  }
}
