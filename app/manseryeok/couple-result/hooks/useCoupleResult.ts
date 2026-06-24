import { useState, useEffect } from 'react'
import { buildSajuPillars, analyzeCoupleFromPillars } from '@/lib/saju/coupleAnalysis'
import { calcYongsin } from '@/lib/saju/yongsin'
import { generateTaegilCandidates } from '@/lib/saju/taegil'
import { getYeonJi } from '@/lib/saju/samjae'
import { calcJobScoreDetailed } from '@/lib/saju/jobScore'

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

function calcMbtiScore(mbti1: string, mbti2: string): number {
  if (!mbti1 || !mbti2 || mbti1.length < 4 || mbti2.length < 4) return 0
  let score = 0
  for (let i = 0; i < 4; i++) {
    if (mbti1[i] !== mbti2[i]) score += 6
  }
  return Math.min(score, 25)
}

function getGrade(score: number): { grade: string; gradeDesc: string } {
  if (score >= 90) return { grade: '운명이 점지한 천생연분 💫', gradeDesc: '이런 조합은 평생 한 번 만나기도 힘들어요' }
  if (score >= 80) return { grade: '소울메이트형 ✨', gradeDesc: '만나기 힘든 최고의 조합이에요' }
  if (score >= 70) return { grade: '서로를 성장시키는 황금 커플 🌟', gradeDesc: '함께할수록 더 빛나는 인연이에요' }
  if (score >= 55) return { grade: '다름이 매력인 탐구형 커플 💡', gradeDesc: '서로의 다름이 오히려 큰 매력이에요' }
  if (score >= 40) return { grade: '노력으로 완성되는 드라마틱 커플 🔥', gradeDesc: '함께 만들어가는 사랑이 더 특별해요' }
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
