import { useState, useEffect } from 'react'

export interface PersonInput {
  year: string
  month: string
  day: string
  hour: string
  gender: string
  calType: string
  job: string
  mbti: string
}

export interface CoupleResultData {
  totalScore: number
  grade: string
  gradeDesc: string
  sajuScore: number
  jobScore: number
  mbtiScore: number
  maxScore: number
  sajuMsg: string
  jobMsg: string
  mbtiMsg: string
  commonMsg: string
  person1Summary: string
  person2Summary: string
  hasMbti: boolean
}

const JOB_OHAENG: Record<string, string> = {
  wood: 'WOOD', fire: 'FIRE', earth: 'EARTH', metal: 'METAL', water: 'WATER'
}

const SANGSAENG: Record<string, boolean> = {
  WOOD_FIRE: true, FIRE_EARTH: true, EARTH_METAL: true,
  METAL_WATER: true, WATER_WOOD: true,
  FIRE_WOOD: true, EARTH_FIRE: true, METAL_EARTH: true,
  WATER_METAL: true, WOOD_WATER: true,
}

function calcSajuScore(job1: string, job2: string): number {
  if (!job1 || !job2) return 40
  return Math.floor(Math.random() * 15) + 45
}

function calcJobScore(job1: string, job2: string): number {
  if (!job1 || !job2) return 8
  const key = `${JOB_OHAENG[job1]}_${JOB_OHAENG[job2]}`
  return SANGSAENG[key] ? 15 : 8
}

function calcMbtiScore(mbti1: string, mbti2: string): number {
  if (!mbti1 || !mbti2 || mbti1.length < 4 || mbti2.length < 4) return 0
  let score = 0
  for (let i = 0; i < 4; i++) {
    if (mbti1[i] !== mbti2[i]) score += 6
  }
  return Math.min(score, 25)
}

function getGrade(score: number): { grade: string; gradeDesc: string } {
  if (score >= 95) return { grade: '운명이 점지한 천생연분 💫', gradeDesc: '이런 조합은 평생 한 번 만나기도 힘들어요' }
  if (score >= 85) return { grade: '소울메이트형 ✨', gradeDesc: '만나기 힘든 최고의 조합이에요' }
  if (score >= 75) return { grade: '서로를 성장시키는 황금 커플 🌟', gradeDesc: '함께할수록 더 빛나는 인연이에요' }
  if (score >= 60) return { grade: '다름이 매력인 탐구형 커플 💡', gradeDesc: '서로의 다름이 오히려 큰 매력이에요' }
  if (score >= 45) return { grade: '노력으로 완성되는 드라마틱 커플 🔥', gradeDesc: '함께 만들어가는 사랑이 더 특별해요' }
  return { grade: '극과 극, 반전 매력 커플 ⚡', gradeDesc: '가장 강렬하고 잊지 못할 인연이에요' }
}

function getSajuMsg(score: number): string {
  if (score >= 50) return '두 분의 오행이 서로의 부족함을 완벽하게 채워줍니다. 만남 자체가 운명이에요 💫'
  if (score >= 40) return '약간의 기운 차이가 있지만, 오히려 서로를 자극하고 성장시키는 에너지예요 🌱'
  return '사주의 기운이 다른 만큼 서로에게 없는 것을 채워줄 수 있어요. 상담으로 조화롭게 만들어 드릴게요 🙏'
}

function getJobMsg(score: number): string {
  if (score >= 12) return '두 분의 삶의 리듬이 잘 맞아요. 함께하는 일상이 편안하고 안정적일 거예요 🏡'
  return '라이프스타일 차이가 있지만, 이것이 오히려 서로에게 새로운 세계를 열어줄 거예요 🌍'
}

function getMbtiMsg(score: number): string {
  if (score >= 20) return '대화가 물 흐르듯 자연스러워요. 싸워도 금방 화해하는 천생 파트너예요 😄'
  if (score >= 12) return '소통 방식이 조금 달라요. 하지만 그 차이가 대화를 더 풍부하게 만들어줘요 💬'
  return '성격 차이가 크지만 논리와 감성이 만날 때 가장 완벽한 팀이 돼요 🤝'
}

export function useCoupleResult(person1: PersonInput, person2: PersonInput) {
  const [result, setResult] = useState<CoupleResultData | null>(null)

  useEffect(() => {
    if (!person1.year || !person2.year) return

    const sajuScore = calcSajuScore(person1.job, person2.job)
    const jobScore = calcJobScore(person1.job, person2.job)
    const hasMbti = !!(person1.mbti && person2.mbti && person1.mbti.length >= 4 && person2.mbti.length >= 4)
    const mbtiScore = hasMbti ? calcMbtiScore(person1.mbti, person2.mbti) : 0

    // MBTI 없으면 75점 만점 → 100점으로 환산
    const maxScore = hasMbti ? 100 : 75
    const rawTotal = sajuScore + jobScore + mbtiScore
    const totalScore = Math.min(Math.round(rawTotal / maxScore * 100), 100)

    const { grade, gradeDesc } = getGrade(totalScore)

    setResult({
      totalScore,
      grade,
      gradeDesc,
      sajuScore,
      jobScore,
      mbtiScore,
      maxScore,
      sajuMsg: getSajuMsg(sajuScore),
      jobMsg: getJobMsg(jobScore),
      mbtiMsg: getMbtiMsg(mbtiScore),
      commonMsg: '점수보다 중요한 건 두 분의 의지예요. 더 깊은 이야기가 궁금하시다면 전문가와 함께해 보세요',
      person1Summary: `${person1.gender} · ${person1.calType} · ${person1.year}년 ${person1.month}월 ${person1.day}일`,
      person2Summary: `${person2.gender} · ${person2.calType} · ${person2.year}년 ${person2.month}월 ${person2.day}일`,
      hasMbti,
    })
  }, [person1.year, person1.month, person1.day, person2.year, person2.month, person2.day])

  return result
}
