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
  questionAnswer: string
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

export function useCoupleResult(person1: PersonInput, person2: PersonInput, userQuestion: string = '') {
  const [result, setResult] = useState<CoupleResultData | null>(null)

  useEffect(() => {
    if (!person1.year || !person2.year) return

    const jobScore = calcJobScore(person1.job, person2.job)
    const hasMbti = !!(person1.mbti && person2.mbti && person1.mbti.length >= 4 && person2.mbti.length >= 4)
    const mbtiScore = hasMbti ? calcMbtiScore(person1.mbti, person2.mbti) : 0

    const callClaude = async () => {
      const prompt = `당신은 명리학 전문가입니다. 두 사람의 궁합을 분석해주세요.

사람1: ${person1.gender} · ${person1.calType} · ${person1.year}년 ${person1.month}월 ${person1.day}일 · 직업오행: ${person1.job} · MBTI: ${person1.mbti || '미입력'}
사람2: ${person2.gender} · ${person2.calType} · ${person2.year}년 ${person2.month}월 ${person2.day}일 · 직업오행: ${person2.job} · MBTI: ${person2.mbti || '미입력'}

${userQuestion ? `⭐ 가장 중요: 사용자의 핵심 질문 → "${userQuestion}" 이 질문에 대한 답변을 가장 먼저, 가장 구체적으로 답해주세요.` : ''}

아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "sajuScore": 사주 점수 45~60 사이 숫자,
  "sajuMsg": "사주 분석 메시지 (2문장)",
  "jobMsg": "직업 오행 분석 메시지 (1문장)",
  "mbtiMsg": "MBTI 분석 메시지 (1문장)",
  "questionAnswer": "${userQuestion ? '질문에 대한 구체적 답변 3~4문장' : ''}",
  "commonMsg": "전체 마무리 메시지 (1문장)"
}`

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }]
          }),
        })
        const data = await res.json()
        const text = data.content?.[0]?.text || ''
        const clean = text.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(clean)

        const sajuScore = parsed.sajuScore || 50
        const maxScore = hasMbti ? 100 : 75
        const rawTotal = sajuScore + jobScore + mbtiScore
        const totalScore = Math.min(Math.round(rawTotal / maxScore * 100), 100)
        const { grade, gradeDesc } = getGrade(totalScore)

        setResult({
          totalScore, grade, gradeDesc,
          sajuScore, jobScore, mbtiScore, maxScore,
          sajuMsg: parsed.sajuMsg || '',
          jobMsg: parsed.jobMsg || '',
          mbtiMsg: parsed.mbtiMsg || '',
          questionAnswer: parsed.questionAnswer || '',
          commonMsg: parsed.commonMsg || '더 깊은 이야기는 전문가와 함께해 보세요',
          person1Summary: `${person1.gender} · ${person1.calType} · ${person1.year}년 ${person1.month}월 ${person1.day}일`,
          person2Summary: `${person2.gender} · ${person2.calType} · ${person2.year}년 ${person2.month}월 ${person2.day}일`,
          hasMbti,
        })
      } catch {
        const sajuScore = 50
        const maxScore = hasMbti ? 100 : 75
        const rawTotal = sajuScore + jobScore + mbtiScore
        const totalScore = Math.min(Math.round(rawTotal / maxScore * 100), 100)
        const { grade, gradeDesc } = getGrade(totalScore)

        setResult({
          totalScore, grade, gradeDesc,
          sajuScore, jobScore, mbtiScore, maxScore,
          sajuMsg: '두 분의 사주 기운이 조화롭게 어우러져 있어요 💫',
          jobMsg: '두 분의 삶의 리듬이 잘 맞아요 🏡',
          mbtiMsg: '성격의 차이가 오히려 매력이 돼요 💬',
          questionAnswer: '',
          commonMsg: '더 깊은 이야기는 전문가와 함께해 보세요',
          person1Summary: `${person1.gender} · ${person1.calType} · ${person1.year}년 ${person1.month}월 ${person1.day}일`,
          person2Summary: `${person2.gender} · ${person2.calType} · ${person2.year}년 ${person2.month}월 ${person2.day}일`,
          hasMbti,
        })
      }
    }

    callClaude()
  }, [person1.year, person1.month, person1.day, person2.year, person2.month, person2.day, userQuestion])

  return result
}
