import { useState, useEffect } from 'react'
import { calcDayunList, calcSeyunList } from '@/lib/saju/dayun'

const HEAVENLY_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const EARTHLY_BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

function splitGanji(ganji: string) {
  if (!ganji) return { stem: '?', branch: '?' }
  const match = ganji.match(/\(([^)]+)\)/)
  if (match && match[1].length >= 2) return { stem: match[1][0], branch: match[1][1] }
  if (ganji.length >= 2) return { stem: ganji[0], branch: ganji[1] }
  return { stem: '?', branch: '?' }
}

function calcHourPillar(dayStem: string, hourIdx: number) {
  const dg = HEAVENLY_STEMS.indexOf(dayStem)
  // 甲己=0, 乙庚=2, 丙辛=4, 丁壬=6, 戊癸=8
  const groupBase = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]
  const hourStem = HEAVENLY_STEMS[(groupBase[dg] + hourIdx) % 10]
  const hourBranch = EARTHLY_BRANCHES[hourIdx]
  return { stem: hourStem, branch: hourBranch }
}

export function useConsultantSaju(
  calType: string, yearParam: number, monthParam: number,
  dayParam: number, leapMonth: string, hourIdx: number | null,
  gender: string
) {
  const [saju, setSaju] = useState<{pillar:string;stem:string;branch:string}[]>([])
  const [dayStem, setDayStem] = useState('')
  const [monthGanji, setMonthGanji] = useState('')
  const [yearStem, setYearStem] = useState('')
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    if (!yearParam || !monthParam || !dayParam) return
    async function loadSaju() {
      setConverting(true)
      try {
        // ✅ 음력/양력 모두 한 번의 API 호출로 처리
        const apiUrl = `/api/lunar?year=${yearParam}&month=${monthParam}&day=${dayParam}&calType=${calType}&leapMonth=${leapMonth}`
        const res = await fetch(apiUrl)
        const d = await res.json()

        if (d.error) {
          console.error('API 오류:', d.error)
          return
        }

        const year = splitGanji(d.yearGanji)
        const month = splitGanji(d.monthGanji)
        const day = splitGanji(d.dayGanji)
        const hour = hourIdx !== null ? calcHourPillar(day.stem, hourIdx) : { stem: '?', branch: '?' }

        setDayStem(day.stem)
        setMonthGanji(month.stem + month.branch)
        setYearStem(year.stem)
        setSaju([
          { pillar: '시주', stem: hour.stem, branch: hour.branch },
          { pillar: '일주', stem: day.stem, branch: day.branch },
          { pillar: '월주', stem: month.stem, branch: month.branch },
          { pillar: '년주', stem: year.stem, branch: year.branch },
        ])
      } catch(e) {
        console.error(e)
      } finally {
        setConverting(false)
      }
    }
    loadSaju()
  }, [calType, yearParam, monthParam, dayParam, leapMonth, hourIdx])

  const iljji = saju[1]?.branch ?? ''
  const yeonjji = saju[3]?.branch ?? ''
  const yeangan = saju[3]?.stem ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dayunList: any[] = dayStem && monthGanji && yearStem
    ? calcDayunList(yearParam, monthParam, dayParam, monthGanji, yearStem, gender, dayStem)
    : []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seyunList: any[] = dayStem ? calcSeyunList(dayStem, 2026) : []

  return { saju, dayStem, converting, iljji, yeonjji, yeangan, dayunList, seyunList }
}
