// useCoupleResult v6 — 모드별 성별 기반 호칭 적용
import { useState, useEffect } from 'react'
import { buildSajuPillars, analyzeCoupleFromPillars } from '@/lib/saju/coupleAnalysis'
import { calcHourPillar } from '@/lib/saju/hourPillar'
import { buildToneBlock, wonjinAdviceBlock, noHourAdviceBlock, mbtiAdviceBlock } from '@/lib/ai/tonePrompt'
import { calcYongsin } from '@/lib/saju/yongsin'
import { generateTaegilCandidates } from '@/lib/saju/taegil'
import { getYeonJi } from '@/lib/saju/samjae'
import { calcJobScoreDetailed } from '@/lib/saju/jobScore'
import { calcMbtiScoreDetailed } from '@/lib/saju/mbtiScore'

export interface PersonInput {
  year: string
  month: string
  day: string
  hour: string
  leapMonth: string
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
  scoreDetails?: {
    iljuScore: number
    yongsinScore: number
    yeonScore: number
    wolScore: number
    gongmangScore: number
    ohaengScore: number
    johuScore: number
    sijuScore: number
    hasSiju: boolean
  }
}

// =============================================
// 모드별 성별 호칭표 — [남자 호칭, 여자 호칭]
// =============================================
const ROLE_LABELS: Record<string, { male: string; female: string }> = {
  married:    { male: '남편분', female: '아내분' },
  couple:     { male: '남자분', female: '여자분' },
  prewedding: { male: '신랑분', female: '신부분' },
  birth:      { male: '아빠',   female: '엄마'   },
}

// 두 사람의 성별을 보고 각자의 호칭을 정한다.
// 입력 순서가 아니라 "성별"로 정하므로, 누가 먼저 입력되든 안 꼬인다.
// 성별이 같거나 비어 있으면 안전하게 '첫 번째 분 / 두 번째 분'.
function getRoleNames(
  mode: string,
  gender1: string,
  gender2: string
): { label1: string; label2: string } {
  const labels = ROLE_LABELS[mode]
  // 호칭표에 없는 모드거나, 성별이 같거나, 한쪽이 비면 중립 호칭
  const usable =
    !!labels &&
    ((gender1 === '남' && gender2 === '여') || (gender1 === '여' && gender2 === '남'))
  if (!usable) {
    return { label1: '첫 번째 분', label2: '두 번째 분' }
  }
  return {
    label1: gender1 === '남' ? labels.male : labels.female,
    label2: gender2 === '남' ? labels.male : labels.female,
  }
}

// =============================================
// sessionStorage 캐시 키 생성
// =============================================
function makeCacheKey(
  person1: PersonInput,
  person2: PersonInput,
  mode: string,
  userQuestion: string
): string {
  return `couple_result_${person1.year}${person1.month}${person1.day}_${person2.year}${person2.month}${person2.day}_${mode}_${userQuestion.slice(0, 20)}`
}

function getCache(key: string): CoupleResultData | null {
  try {
    const saved = sessionStorage.getItem(key)
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

function setCache(key: string, data: CoupleResultData) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

function getGrade(score: number): { grade: string; gradeDesc: string } {
  if (score >= 90) return { grade: '운명이 점지한 천생연분 💫', gradeDesc: '이런 조합은 평생 한 번 만나기도 힘들어요' }
  if (score >= 80) return { grade: '소울메이트형 ✨', gradeDesc: '만나기 힘든 최고의 조합이에요' }
  if (score >= 70) return { grade: '서로를 성장시키는 황금 커플 🌟', gradeDesc: '함께할수록 더 빛나는 인연이에요' }
  if (score >= 55) return { grade: '다름이 매력인 탐구형 커플 💡', gradeDesc: '서로의 다름이 오히려 큰 매력이에요' }
  if (score >= 40) return { grade: '노력으로 완성되는 드라마틱 커플 🔥', gradeDesc: '함께 만들어가는 사랑이 더 특별해요' }
  return { grade: '극과 극, 반전 매력 커플 ⚡', gradeDesc: '가장 강렬하고 잊지 못할 인연이에요' }
}

function calcTotalScore(
  sajuScore: number,
  jobScore: number,
  mode: string
): number {
  // MBTI는 점수에서 제외한다 (명리와 근거가 다른 체계 → 해설 참고로만 사용).
  // 연인(couple): 사주 70% + 직업 30%.  그 외(부부/택일/출산): 사주 100%.
  let total = 0
  if (mode === 'couple') {
    total = Math.round(
      (sajuScore * 0.7) +
      (jobScore / 30 * 100 * 0.3)
    )
  } else {
    total = sajuScore
  }
  return Math.min(100, Math.max(0, total))
}

// person.hour: '-1'~'11' 문자열 또는 '모름'. 시를 알면 시주 간지를 만들어 넘긴다.
// 원진살 6쌍 (일지 기준) — 점수엔 반영 안 하고 해설 조언에만 쓴다.
const WONJIN_PAIRS = [['子','未'],['丑','午'],['寅','酉'],['卯','申'],['辰','亥'],['巳','戌']]
function isWonjin(branch1: string, branch2: string): boolean {
  if (!branch1 || !branch2) return false
  return WONJIN_PAIRS.some(([a, b]) => (branch1 === a && branch2 === b) || (branch1 === b && branch2 === a))
}
// person.hour가 '모름'인지 (시주 없음 판정)
function isHourUnknown(hour: string): boolean {
  return hour === '모름' || hour == null || hour === '' || hour === '-1'
}

function hourIdxOf(hour: string): number | null {
  if (hour === '모름' || hour == null || hour === '' || hour === '-1') return null
  const n = parseInt(String(hour))
  return Number.isNaN(n) || n < 0 || n > 11 ? null : n
}

async function fetchSajuPillars(person: PersonInput) {
  try {
    const res = await fetch(
      `/api/lunar?year=${person.year}&month=${person.month}&day=${person.day}&calType=${person.calType}&leapMonth=${person.leapMonth || '0'}`
    )
    const d = await res.json()
    if (d.error) return null

    // 일간을 구해 시주 간지를 계산 (시를 아는 경우에만).
    // dayGanji 예: '갑자(甲子)' 또는 '甲子' → 앞 글자가 일간.
    const hourIdx = hourIdxOf(person.hour)
    let hourGanji: string | undefined = undefined
    if (hourIdx !== null) {
      const dm = String(d.dayGanji || '').match(/\(([^)]+)\)/)
      const dayStem = dm && dm[1].length >= 1 ? dm[1][0] : String(d.dayGanji || '')[0]
      if (dayStem) {
        const h = calcHourPillar(dayStem, hourIdx)
        if (h.stem !== '?' && h.branch !== '?') hourGanji = h.stem + h.branch
      }
    }

    return buildSajuPillars(d.yearGanji, d.monthGanji, d.dayGanji, hourGanji)
  } catch {
    return null
  }
}

async function fetchLunarDayMap(dates: string[]): Promise<Map<string, { lunarDay: number; yeonji: string }>> {
  const map = new Map<string, { lunarDay: number; yeonji: string }>()
  await Promise.all(
    dates.map(async (dateStr) => {
      try {
        const [year, month, day] = dateStr.split('-')
        const res = await fetch(`/api/lunar?year=${year}&month=${month}&day=${day}&calType=양력&leapMonth=0`)
        const d = await res.json()
        if (!d.error) {
          map.set(dateStr, {
            lunarDay: d.lunarDay ?? 0,
            yeonji: d.yearGanji?.[1] ?? '',
          })
        }
      } catch {}
    })
  )
  return map
}

const FIXED_HOLIDAYS = ['01-01','03-01','05-05','06-06','08-15','10-03','10-09','12-25']
const SUBSTITUTE_HOLIDAYS: Record<string, string[]> = {
  '2026': ['2026-02-02','2026-05-06','2026-09-28','2026-09-29','2026-09-30','2026-10-01'],
  '2027': ['2027-01-28','2027-01-29','2027-03-01','2027-05-05','2027-09-20','2027-09-21','2027-09-22'],
  '2028': ['2028-02-16','2028-02-17','2028-02-18','2028-05-05','2028-09-30','2028-10-02'],
}

function getHolidayDates(monthsAhead: number, targetYear?: number): string[] {
  const dates: string[] = []
  const today = new Date()
  const end = new Date(today)
  end.setMonth(end.getMonth() + monthsAhead)
  const cur = new Date(today)
  cur.setDate(cur.getDate() + 14)
  while (cur <= end) {
    const dateStr = cur.toISOString().slice(0, 10)
    const year = String(cur.getFullYear())
    const mmdd = dateStr.slice(5)
    const dow = cur.getDay()
    if (targetYear && cur.getFullYear() !== targetYear) {
      cur.setDate(cur.getDate() + 1)
      continue
    }
    const isWeekend = dow === 0 || dow === 6
    const isFixed = FIXED_HOLIDAYS.includes(mmdd)
    const isSub = SUBSTITUTE_HOLIDAYS[year]?.includes(dateStr) ?? false
    if (isWeekend || isFixed || isSub) dates.push(dateStr)
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function isDateQuestion(q: string): boolean {
  if (!q) return false
  const keywords = ['날','날짜','결혼','택일','언제','일정','혼인','예식','웨딩','좋은날','길일']
  return keywords.some(k => q.includes(k))
}

function extractYearHint(q: string, currentYear: number): number | null {
  if (q.includes('내년')) return currentYear + 1
  if (q.includes('올해')) return currentYear
  if (q.includes('내후년')) return currentYear + 2
  const match = q.match(/(\d{4})년/)
  if (match) return parseInt(match[1])
  return null
 }
function buildPrompt(
  mode: string,
  person1: PersonInput,
  person2: PersonInput,
  saju1Str: string,
  saju2Str: string,
  analysisStr: string,
  todayStr: string,
  currentYear: number,
  userQuestion: string,
  candidateDatesStr: string,
  myPrevAnalysis: string,
  label1: string,
  label2: string,
  toneAndAdvice: string
): string {
  // 호칭 안내 — AI가 분석 텍스트의 '사람1/사람2'를 올바른 호칭으로 바꿔 부르게 한다.
  const roleGuide = `[호칭 안내 — 매우 중요]
아래 분석에서 '사람1'은 ${label1}(${person1.gender}), '사람2'는 ${label2}(${person2.gender})를 가리킵니다.
답변에서는 '사람1', '사람2'라는 표현을 절대 쓰지 말고, 반드시 '${label1}', '${label2}'라고 불러 주세요.`

  const scoreRule = `[중요] 점수 숫자(예: 89점, 71점 등)를 해설에 절대 쓰지 마세요.
"몇 점"이라는 표현 없이, 두 분이 왜 그런 관계인지·어떤 인연인지를 따뜻하게 풀어주세요.
등급 표현(소울메이트형 등)도 숫자와 함께 단정하지 말고, 관계의 느낌으로 자연스럽게 녹이세요.`

  const baseInfo = `${toneAndAdvice}

${scoreRule}

${roleGuide}

${label1} (${person1.gender}): 사주 ${saju1Str} · 직업오행: ${person1.job} · MBTI: ${person1.mbti || '미입력'}
${label2} (${person2.gender}): 사주 ${saju2Str} · 직업오행: ${person2.job} · MBTI: ${person2.mbti || '미입력'}

${analysisStr}
${myPrevAnalysis ? `\n[나의 기존 사주 분석 참고]\n${myPrevAnalysis}` : ''}`

  const yearHint = userQuestion ? extractYearHint(userQuestion, currentYear) : null
  const yearInstruction = yearHint ? `반드시 ${yearHint}년 날짜만 추천하세요.` : ''

  if (mode === 'prewedding') {
    const needsDate = !userQuestion || isDateQuestion(userQuestion)
    if (needsDate) {
      return `당신은 명리학 전문가입니다. 오늘 날짜는 ${todayStr}입니다.
${baseInfo}

⭐ 임무: 아래 사전 계산된 택일 후보에서 최적의 결혼 길일을 추천해주세요.
${yearInstruction}

[사전 계산된 택일 후보 — 점수 높은 순, 손없는날/삼재/일진 반영됨]
${candidateDatesStr}

위 후보에서 4~6개를 선택하고 각 날짜마다:
1. 날짜(요일) · 일진
2. 손없는날 여부
3. 삼재 여부
4. 명리학적 길한 이유 상세 설명

JSON 형식으로만 응답 (다른 텍스트 없이):
{
  "sajuMsg": "${label1} 사주 특성 1문장 + ${label2} 사주 특성 1문장",
  "jobMsg": "직업 오행 조화 1문장",
  "mbtiMsg": "MBTI 조화 1문장",
  "questionAnswer": "결혼 길일 4~6개 추천 (각 날짜마다 상세 이유 포함)",
  "commonMsg": "마무리 1문장"
}`
    } else {
      return `당신은 명리학 전문가입니다. 오늘 날짜는 ${todayStr}입니다.
${baseInfo}

⭐ 핵심 질문: "${userQuestion}" — 이 질문에 가장 먼저 구체적으로 답해주세요.

JSON 형식으로만 응답 (다른 텍스트 없이):
{
  "sajuMsg": "${label1} 사주 특성 1문장 + ${label2} 사주 특성 1문장",
  "jobMsg": "직업 오행 조화 1문장",
  "mbtiMsg": "MBTI 조화 1문장",
  "questionAnswer": "질문에 대한 명리학적 답변 3~4문장",
  "commonMsg": "마무리 1문장"
}`
    }
  }

  if (mode === 'birth') {
    return `당신은 명리학 전문가입니다. 오늘 날짜는 ${todayStr}입니다.
${baseInfo}

⭐ 임무: 두 사람 사주를 바탕으로 최적의 출산 시기를 추천해주세요.
${yearInstruction}
${userQuestion ? `추가 요청: "${userQuestion}"` : ''}

JSON 형식으로만 응답 (다른 텍스트 없이):
{
  "sajuMsg": "${label1} 사주 특성 1문장 + ${label2} 사주 특성 1문장",
  "jobMsg": "직업 오행 조화 1문장",
  "mbtiMsg": "MBTI 조화 1문장",
  "questionAnswer": "최적 출산 시기 3~4개, 각 시기마다 명리학적 이유 포함",
  "commonMsg": "마무리 1문장"
}`
  }

  if (mode === 'married') {
    return `당신은 명리학 전문가입니다. 오늘 날짜는 ${todayStr}입니다.
${baseInfo}

⭐ 임무: 부부 궁합 분석 + 관계 개선 방향을 제시해주세요.
${userQuestion ? `추가 요청: "${userQuestion}"` : ''}

JSON 형식으로만 응답 (다른 텍스트 없이):
{
  "sajuMsg": "${label1} 사주 특성 1문장 + ${label2} 사주 특성 1문장",
  "jobMsg": "직업 오행 조화 1문장",
  "mbtiMsg": "MBTI 소통 방식 1문장",
  "questionAnswer": "관계 개선을 위한 구체적 방향 3~4문장${userQuestion ? ` + "${userQuestion}" 답변` : ''}",
  "commonMsg": "마무리 1문장"
}`
  }

  return `당신은 명리학 전문가입니다. 오늘 날짜는 ${todayStr}입니다.
${baseInfo}

${userQuestion ? `⭐ 핵심 질문: "${userQuestion}" — 이 질문에 가장 먼저 구체적으로 답해주세요.` : ''}

JSON 형식으로만 응답 (다른 텍스트 없이):
{
  "sajuMsg": "${label1} 사주 특성 1문장 + ${label2} 사주 특성 1문장",
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

    // ✅ 캐시 확인 — 같은 조합이면 즉시 표시
    const cacheKey = makeCacheKey(person1, person2, mode, userQuestion)
    const cached = getCache(cacheKey)
    if (cached) {
      setResult(cached)
      return
    }

    const callClaude = async () => {
      const [pillars1, pillars2] = await Promise.all([
        fetchSajuPillars(person1),
        fetchSajuPillars(person2),
      ])

      let analysisStr = ''
      let sajuScore = 50
      let scoreDetails: CoupleResultData['scoreDetails'] = undefined
      if (pillars1 && pillars2) {
        const analysis = analyzeCoupleFromPillars(pillars1, pillars2)
        // 해설에서 점수 숫자를 언급하지 않도록, summary에서 "총점: N점" 줄을 제거해 AI에 넘긴다.
        analysisStr = analysis.summary.replace(/^총점:.*$/m, '').replace(/\n{3,}/g, '\n\n')
        sajuScore = analysis.sajuScore
        scoreDetails = {
          iljuScore: analysis.scoreNumbers.iljuScore,
          yongsinScore: analysis.scoreNumbers.yongsinScore,
          yeonScore: analysis.scoreNumbers.yeonScore,
          wolScore: analysis.scoreNumbers.wolScore,
          gongmangScore: analysis.scoreNumbers.gongmangScore,
          ohaengScore: analysis.scoreNumbers.ohaengScore,
          johuScore: analysis.scoreNumbers.johuScore,
          sijuScore: analysis.scoreNumbers.sijuScore,
          hasSiju: analysis.scoreNumbers.hasSiju,
        }
      }

      const ilju1 = pillars1?.find(p => p.pillar === '일주')
      const ilju2 = pillars2?.find(p => p.pillar === '일주')
      const yongsin1 = pillars1 && ilju1 ? calcYongsin(pillars1, ilju1.stem).yongsin : ''
      const yongsin2 = pillars2 && ilju2 ? calcYongsin(pillars2, ilju2.stem).yongsin : ''

      let jobScore = 0
      if (mode === 'couple') {
        const jobScoreResult = calcJobScoreDetailed(person1.job, person2.job, yongsin1, yongsin2)
        jobScore = jobScoreResult.totalScore
        analysisStr += `\n직업 오행 분석: ${jobScoreResult.reasons.join(' / ')}`
      }

      const mbtiResult = calcMbtiScoreDetailed(person1.mbti, person2.mbti)
      const hasMbti = mbtiResult.hasMbti
      const mbtiScore = mbtiResult.totalScore
      if (mbtiResult.hasMbti) {
        analysisStr += `\nMBTI 분석: ${mbtiResult.reasons.join(' / ')}`
      }

      const totalScore = calcTotalScore(sajuScore, jobScore, mode)
      const { grade, gradeDesc } = getGrade(totalScore)

      const saju1Str = pillars1
        ? pillars1.map(p => `${p.pillar}:${p.stem}${p.branch}`).join(' ')
        : `${person1.year}년 ${person1.month}월 ${person1.day}일`
      const saju2Str = pillars2
        ? pillars2.map(p => `${p.pillar}:${p.stem}${p.branch}`).join(' ')
        : `${person2.year}년 ${person2.month}월 ${person2.day}일`

      const myPrevAnalysis = typeof window !== 'undefined'
        ? ((localStorage.getItem('saju_free_analysis') ?? '') + ' ' +
           (localStorage.getItem('saju_paid_analysis') ?? '')).trim()
        : ''

      const today = new Date()
      const currentYear = today.getFullYear()
      const todayStr = `${currentYear}년 ${today.getMonth() + 1}월 ${today.getDate()}일`
      const yearHint = userQuestion ? extractYearHint(userQuestion, currentYear) : null

      let candidateDatesStr = ''
      if (mode === 'prewedding' && (!userQuestion || isDateQuestion(userQuestion))) {
        const yeonji1 = pillars1 ? getYeonJi(pillars1) : ''
        const yeonji2 = pillars2 ? getYeonJi(pillars2) : ''
        const ilji1 = ilju1?.branch ?? ''
        const ilji2 = ilju2?.branch ?? ''
        const top40 = getHolidayDates(24, yearHint ?? undefined).slice(0, 40)
        const lunarDayMap = await fetchLunarDayMap(top40)
        const taegilCandidates = generateTaegilCandidates(
          top40, lunarDayMap,
          { yongsin1, yongsin2, ilji1, ilji2, yeonji1, yeonji2 }
        )
        candidateDatesStr = taegilCandidates.slice(0, 10).map(c =>
          `${c.date}(${c.dayOfWeek}) 일진:${c.dayGanji} 점수:${c.score}점` +
          (c.isSonEomneun ? ' ✅손없는날' : '') +
          (c.warnings.length > 0 ? ` ⚠️${c.warnings.join(',')}` : '') +
          (c.reasons.length > 0 ? ` 💡${c.reasons.slice(0, 2).join(',')}` : '')
        ).join('\n')
      } else {
        candidateDatesStr = getHolidayDates(24, yearHint ?? undefined).slice(0, 60).join(', ')
      }

      // 모드 + 성별로 호칭 결정 (입력 순서가 아니라 성별 기준)
      const { label1, label2 } = getRoleNames(mode, person1.gender, person2.gender)

      // 공통 말투 헌법 + 상황별 조언 블록 조립 (원진/시모름/MBTI)
      let toneAndAdvice = buildToneBlock()
      const ilji1ForTone = ilju1?.branch ?? ''
      const ilji2ForTone = ilju2?.branch ?? ''
      if (isWonjin(ilji1ForTone, ilji2ForTone)) {
        toneAndAdvice += `\n\n${wonjinAdviceBlock()}`
      }
      if (isHourUnknown(person1.hour) || isHourUnknown(person2.hour)) {
        toneAndAdvice += `\n\n${noHourAdviceBlock()}`
      }
      if (person1.mbti && person2.mbti) {
        toneAndAdvice += `\n\n${mbtiAdviceBlock(person1.mbti, person2.mbti)}`
      }

      const prompt = buildPrompt(
        mode, person1, person2,
        saju1Str, saju2Str, analysisStr,
        todayStr, currentYear, userQuestion,
        candidateDatesStr,
        myPrevAnalysis.slice(0, 500),
        label1, label2,
        toneAndAdvice
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

        const finalResult: CoupleResultData = {
          totalScore, grade, gradeDesc,
          sajuScore, jobScore, mbtiScore,
          maxScore: 100,
          sajuMsg: parsed.sajuMsg || '',
          jobMsg: parsed.jobMsg || '',
          mbtiMsg: parsed.mbtiMsg || '',
          questionAnswer: parsed.questionAnswer || '',
          commonMsg: parsed.commonMsg || '더 깊은 이야기는 전문가와 함께해 보세요',
          person1Summary: `${person1.gender} · ${person1.calType} · ${person1.year}년 ${person1.month}월 ${person1.day}일`,
          person2Summary: `${person2.gender} · ${person2.calType} · ${person2.year}년 ${person2.month}월 ${person2.day}일`,
          hasMbti, scoreDetails,
        }
        // ✅ 결과 캐시 저장
        setCache(cacheKey, finalResult)
        setResult(finalResult)

      } catch {
        const fallbackResult: CoupleResultData = {
          totalScore, grade, gradeDesc,
          sajuScore, jobScore, mbtiScore,
          maxScore: 100,
          sajuMsg: '두 분의 사주 기운이 조화롭게 어우러져 있어요 💫',
          jobMsg: '두 분의 삶의 리듬이 잘 맞아요 🏡',
          mbtiMsg: '성격의 차이가 오히려 매력이 돼요 💬',
          questionAnswer: '',
          commonMsg: '더 깊은 이야기는 전문가와 함께해 보세요',
          person1Summary: `${person1.gender} · ${person1.calType} · ${person1.year}년 ${person1.month}월 ${person1.day}일`,
          person2Summary: `${person2.gender} · ${person2.calType} · ${person2.year}년 ${person2.month}월 ${person2.day}일`,
          hasMbti, scoreDetails,
        }
        setCache(cacheKey, fallbackResult)
        setResult(fallbackResult)
      }
    }

    callClaude()
  }, [person1.year, person1.month, person1.day, person2.year, person2.month, person2.day, userQuestion, mode])

  return result
}
