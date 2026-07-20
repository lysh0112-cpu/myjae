// app/manseryeok/wedding-timing/lib/diagnose.ts
// 결혼택일 B기능: 사용자가 점찍은 날짜(1~3개)를 채점해 "이 날 괜찮은지" 진단
//
// 추천(recommend.ts)이 아니라 진단. 후보를 생성하지 않고, 입력 날짜를 그대로 채점한다.
// 채점 엔진은 score.ts(applyFilters + scoreWedding)를 100% 그대로 재사용한다.
// recommend.ts 는 손대지 않기 위해, 사람 사주·공망 계산은 여기서 자체 구현한다(검증된 로직 복제).

import {
  applyFilters, scoreWedding, gradeOf,
  type PersonSaju, type ScoreInput, type WeddingBreakdown,
} from './score'
// 용신은 새 억부용신(정확한 100점 계산)을 쓴다. (궁합과 동일 부품으로 통일)
import { calcYongsinCompat as calcYongsin } from '@/lib/saju/yongsinNew'

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

interface Pillar { stem: string; branch: string }

function split(g: string): Pillar {
  if (!g) return { stem: '?', branch: '?' }
  const m = g.match(/\(([^)]+)\)/)
  if (m && m[1].length >= 2) return { stem: m[1][0], branch: m[1][1] }
  if (g.length >= 2) return { stem: g[0], branch: g[1] }
  return { stem: '?', branch: '?' }
}

// 일주 60갑자 → 공망 지지 2개 (recommend.ts 와 동일 로직)
function gongmangBranches(ganji: string): string[] {
  if (!ganji || ganji.length < 2) return []
  const s = STEMS.indexOf(ganji[0])
  const b = BRANCHES.indexOf(ganji[1])
  if (s < 0 || b < 0) return []
  const xun = ((b - s) % 12 + 12) % 12
  return [BRANCHES[(xun + 10) % 12], BRANCHES[(xun + 11) % 12]]
}

interface RawPerson {
  year: string; month: string; day: string; hour: string
  gender: string; calType: string
}

// 한 사람의 사주(년·월·일 간지 + 용신) 가져오기 (recommend.ts 와 동일)
async function fetchPersonSaju(p: RawPerson | null): Promise<PersonSaju | null> {
  if (!p || !p.year || !p.month || !p.day) return null
  try {
    const url = `/api/lunar?year=${p.year}&month=${p.month}&day=${p.day}&calType=${p.calType || '양력'}&leapMonth=0`
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) return null

    const year = split(data.yearGanji)
    const month = split(data.monthGanji)
    const day = split(data.dayGanji)

    const hourIdx = p.hour === '-1' || p.hour === '' || p.hour == null ? null : parseInt(p.hour)
    const calcHour = (dayStem: string, hi: number): Pillar => {
      const dg = STEMS.indexOf(dayStem)
      if (dg < 0) return { stem: '?', branch: '?' }
      const groupBase = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]
      return { stem: STEMS[(groupBase[dg] + hi) % 10], branch: BRANCHES[hi] }
    }
    const hour = hourIdx !== null ? calcHour(day.stem, hourIdx) : { stem: '?', branch: '?' }

    const sajuPillars = [
      { pillar: '시주', stem: hour.stem, branch: hour.branch },
      { pillar: '일주', stem: day.stem, branch: day.branch },
      { pillar: '월주', stem: month.stem, branch: month.branch },
      { pillar: '년주', stem: year.stem, branch: year.branch },
    ].filter(pp => pp.stem !== '?' && pp.branch !== '?')

    // 심산 오행 점수로 용신 계산 (월지 계절 치환 반영).
    //   /api/lunar 가 돌려주는 양력 월·일을 그대로 쓴다.
    //   시를 모르면(hour.branch === '?') 시지는 null로 넘긴다.
    const hb = hour.branch === '?' ? null : hour.branch
    const ys = calcYongsin(sajuPillars, day.stem, data.solarMonth, data.solarDay, hb)

    return {
      dayStem: day.stem,
      dayBranch: day.branch,
      yearBranch: year.branch,
      ganji: day.stem + day.branch,
      yongsin: ys.yongsin,
    }
  } catch {
    return null
  }
}

// 양력 날짜 하나의 연·월·일 간지 + 음력일 가져오기
async function fetchDateInfo(dateStr: string): Promise<{
  y: number; m: number; d: number; weekday: string
  dateLabel: string; ganji: string
  dayStem: string; dayBranch: string; monthBranch: string
  lunarDay: number | null
} | null> {
  const dt = new Date(dateStr + 'T00:00:00')
  if (isNaN(dt.getTime())) return null
  const y = dt.getFullYear(), m = dt.getMonth() + 1, d = dt.getDate()
  try {
    const url = `/api/lunar?year=${y}&month=${m}&day=${d}&calType=양력&leapMonth=0`
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) return null
    const day = split(data.dayGanji)
    const month = split(data.monthGanji)
    if (day.stem === '?') return null
    const lunarDay = typeof data.lunarDay === 'number' ? data.lunarDay
      : typeof data.lunDay === 'number' ? data.lunDay : null
    return {
      y, m, d,
      weekday: WEEKDAY[dt.getDay()],
      dateLabel: `${y}년 ${m}월 ${d}일 (${WEEKDAY[dt.getDay()]})`,
      ganji: day.stem + day.branch,
      dayStem: day.stem,
      dayBranch: day.branch,
      monthBranch: month.branch,
      lunarDay,
    }
  } catch {
    return null
  }
}

export interface DiagnosedDate {
  dateLabel: string
  ganji: string
  passed: boolean
  score: number
  grade: string
  stars: number
  badges: string[]
  breakdown: WeddingBreakdown | null
  avoidReasons: string[]
}

export interface DiagnoseResult {
  results: DiagnosedDate[]
  groomYongsin: string
  brideYongsin: string
  error?: string
}

export interface RunDiagnoseOptions {
  dates: string[]
  groom: RawPerson | null
  bride: RawPerson | null
}

export async function runDiagnose(opts: RunDiagnoseOptions): Promise<DiagnoseResult> {
  const { dates, groom: rawG, bride: rawB } = opts

  const empty = (error: string): DiagnoseResult => ({
    results: [], groomYongsin: '', brideYongsin: '', error,
  })

  const clean = dates.filter(d => d && d.trim())
  if (clean.length === 0) return empty('진단할 날짜를 한 개 이상 입력해 주세요.')

  const [groom, bride] = await Promise.all([fetchPersonSaju(rawG), fetchPersonSaju(rawB)])
  if (!groom || !bride) {
    return empty('두 사람의 사주 정보가 부족해요. 이전 화면에서 생년월일을 확인해 주세요.')
  }

  const gGongmang = gongmangBranches(groom.ganji)
  const bGongmang = gongmangBranches(bride.ganji)

  const results: DiagnosedDate[] = []
  for (const dateStr of clean) {
    const info = await fetchDateInfo(dateStr)
    if (!info) {
      results.push({
        dateLabel: dateStr, ganji: '?', passed: false, score: 0, grade: '-',
        stars: 0, badges: [], breakdown: null, avoidReasons: ['날짜를 읽지 못했어요'],
      })
      continue
    }

    const reasons: string[] = []
    if (gGongmang.includes(info.dayBranch) || bGongmang.includes(info.dayBranch)) {
      reasons.push('공망일 (두 사람 기준)')
    }

    const input: ScoreInput = {
      dayStem: info.dayStem,
      dayBranch: info.dayBranch,
      ganji: info.ganji,
      monthBranch: info.monthBranch,
      lunarDay: info.lunarDay,
      groom, bride,
    }

    const filter = applyFilters(input)
    const allReasons = [...reasons, ...filter.reasons]

    if (allReasons.length > 0) {
      results.push({
        dateLabel: info.dateLabel, ganji: info.ganji, passed: false, score: 0,
        grade: '-', stars: 0, badges: [], breakdown: null, avoidReasons: allReasons,
      })
      continue
    }

    const bd = scoreWedding(input)
    const g = gradeOf(bd.total)
    results.push({
      dateLabel: info.dateLabel, ganji: info.ganji, passed: true, score: bd.total,
      grade: g.grade, stars: g.stars, badges: bd.badges, breakdown: bd, avoidReasons: [],
    })
  }

  return { results, groomYongsin: groom.yongsin, brideYongsin: bride.yongsin }
}
