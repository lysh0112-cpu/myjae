import { useState, useEffect } from 'react'
import { buildSajuPillars, analyzeCoupleFromPillars } from '@/lib/saju/coupleAnalysis'

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

async function fetchSajuPillars(person: PersonInput) {
  try {
    const res = await fetch(
      `/api/lunar?year=${person.year}&month=${person.month}&day=${person.day}&calType=${person.calType}&leapMonth=0`
    )
    const d = await res.json()
    if (d.error) return null
    return buildSajuPillars(d.yearGanji, d.monthGanji, d.dayGanji)
  } catch {
    return null
  }
}

const HOLIDAYS = ['01-01','03-01','05-05','06-06','08-15','10-03','10-09','12-25']

function getWeekendAndHolidayDates(monthsAhead: number = 18): string[] {
  const dates: string[] = []
  const today = new Date()
  const end = new Date(today)
  end.setMonth(end.getMonth() + monthsAhead)
  const cur = new Date(today)
  cur.setDate(cur.getDate() + 7)
  while (cur <= end) {
    const str = cur.toISOString().slice(0, 10)
    const day = cur.getDay()
    const mmdd = str.slice(5)
    if (day === 0 || day === 6 || HOLIDAYS.includes(mmdd)) dates.push(str)
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function buildPrompt(
  mode: string,
  person1: PersonInput,
  person2: PersonInput,
  saju1Str: string,
  saju2Str: string,
  analysisStr: string,
  todayStr: string,
  userQuestion: string,
  candidateDates: string
): string {
  const baseInfo = `
사람1 (${person1.gender}): 사주 ${saju1Str} · 직업오행: ${person1.job} · MBTI: ${person1.mbti || '미입력'}
사람2 (${person2.gender}): 사주 ${saju2Str} · 직업오행: ${person2.job} · MBTI: ${person2.mbti || '미입력'}

${analysisStr}`

  if (mode === 'prewedding') {
    return `당신은 명리학 전문가입니다. 오늘 날짜는 ${todayStr}입니다.
${baseInfo}

⭐ 임무: 위 명리학 계산 결과를 바탕으로 결혼 길일을 추천해주세요.
${userQuestion ? `추가 요청: "${userQuestion}"` : ''}

주말/공휴일 우선 후보 날짜:
${candidateDates}

위 목록에서 두 사람 사주와 가장 잘 맞는 날 4~6개를 선택하고,
각 날짜마다 명리학적 이유(오행, 천간지지, 충극 여부 등)를 구체적으로 설명하세요.

JSON 형식으로만 응답 (다른 텍스트 없이):
{
  "sajuMsg": "두 사람 사주 총평 2문장",
  "jobMsg": "직업 오행 조화 1문장",
  "mbtiMsg": "MBTI 조화 1문장",
  "questionAnswer": "결혼 길일 추천 (날짜별 명리학적 이유 포함, 주말/공휴일 우선)",
  "commonMsg": "마무리 1문장"
}`
  }

  if (mode === 'birth') {
    return `당신은 명리학 전문가입니다. 오늘 날짜는 ${todayStr}입니다.
${baseInfo}

⭐ 임무: 위 명리학 계산 결과를 바탕으로 최적의 출산 시기를 추천해주세요.
${userQuestion ? `추가 요청: "${userQuestion}"` : ''}

JSON 형식으로만 응답 (다른 텍스트 없이):
{
  "sajuMsg": "두 사람 사주 총평 2문장",
  "jobMsg": "직업 오행 조화 1문장",
  "mbtiMsg": "MBTI 조화 1문장",
  "questionAnswer": "최적 출산 시기 3~4개, 각 시기마다 명리학적 이유 포함",
  "commonMsg": "마무리 1문장"
}`
  }

  if (mode === 'married') {
    return `당신은 명리학 전문가입니다. 오늘 날짜는 ${todayStr}입니다.
${baseInfo}

⭐ 임무: 위 명리학 계산 결과를 바탕으로 부부 궁합과 관계 개선 방향을 제시해주세요.
${userQuestion ? `추가 요청: "${userQuestion}"` : ''}

JSON 형식으로만 응답 (다른 텍스트 없이):
{
  "sajuMsg": "부부 사주 궁합 분석 2문장",
  "jobMsg": "직업 오행 조화 1문장",
  "mbtiMsg": "MBTI 소통 방식 1문장",
  "questionAnswer": "관계 개선을 위한 구체적 방향 3~4문장",
  "commonMsg": "마무리 1문장"
}`
  }

  // couple (기본)
  return `당신은 명리학 전문가입니다. 오늘 날짜는 ${todayStr}입니다.
${baseInfo}

${userQuestion ? `⭐ 핵심 질문: "${userQuestion}" — 이 질문에 가장 먼저 구체적으로 답해주세요.` : ''}

JSON 형식으로만 응답 (다른 텍스트 없이):
{
  "sajuMsg": "사주 궁합 분석 2문장 (형충회합 결과 반영)",
  "jobMsg": "직업 오행 분석 1문장",
  "mbtiMsg": "MBTI 분석 1문장",
  "questionAnswer": "${userQuestion ? '질문 답변 3~4문장' : ''}",
  "commonMsg": "마무리 1문장"
}`
}

export function useCoupleResult(
  person1: PersonInput,
  person2: PersonInput,
  userQuestion: string = '',
  mode: string = 'couple'
) {
  const [result, setResult] = useState<CoupleResultData | null>(null)

  useEffect(() => {
    if (!person1.year || !person2.year) return

    const jobScore = calcJobScore(person1.job, person2.job)
    const hasMbti = !!(person1.mbti && person2.mbti && person1.mbti.length >= 4 && person2.mbti.length >= 4)
    const mbtiScore = hasMbti ? calcMbtiScore(person1.mbti, person2.mbti) : 0

    const callClaude = async () => {
      // 1. 두 사람 사주 8글자 계산
      const [pillars1, pillars2] = await Promise.all([
        fetchSajuPillars(person1),
        fetchSajuPillars(person2),
      ])

      // 2. 명리학 계산 (형충회합파해, 용신, 공망, 일지 관계)
      let analysisStr = ''
      let sajuScore = 50
      if (pillars1 && pillars2) {
        const analysis = analyzeCoupleFromPillars(pillars1, pillars2)
        analysisStr = analysis.summary
        sajuScore = analysis.sajuScore
      }

      // 3. 사주 텍스트 표현
      const saju1Str = pillars1
        ? pillars1.map(p => `${p.pillar}:${p.stem}${p.branch}`).join(' ')
        : `${person1.year}년 ${person1.month}월 ${person1.day}일`
      const saju2Str = pillars2
        ? pillars2.map(p => `${p.pillar}:${p.stem}${p.branch}`).join(' ')
        : `${person2.year}년 ${person2.month}월 ${person2.day}일`

      // 4. 오늘 날짜 + 후보 날짜
      const today = new Date()
      const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`
      const candidateDates = getWeekendAndHolidayDates(18).slice(0, 80).join(', ')

      // 5. 프롬프트 생성
      const prompt = buildPrompt(
        mode, person1, person2,
        saju1Str, saju2Str, analysisStr,
        todayStr, userQuestion, candidateDates
      )

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
        })
        const data = await res.json()
        const text = data.content?.[0]?.text || ''
        const clean = text.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(clean)

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
  }, [person1.year, person1.month, person1.day, person2.year, person2.month, person2.day, userQuestion, mode])

  return result
}
