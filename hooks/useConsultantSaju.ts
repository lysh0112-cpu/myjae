import { useState, useEffect } from 'react'
import { calcSeyunList } from '@/lib/saju/dayun'
import type { DayunItem } from '@/lib/saju/dayun'

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
  // 대운 계산용 양력 날짜(음력이면 변환값, 양력이면 입력값)
  const [solarDate, setSolarDate] = useState<{year:number;month:number;day:number}|null>(null)
  const [dayunList, setDayunList] = useState<DayunItem[]>([])

  useEffect(() => {
    if (!yearParam || !monthParam || !dayParam) return
    async function loadSaju() {
      setConverting(true)
      try {
        let apiUrl = ''
        let sYear = yearParam, sMonth = monthParam, sDay = dayParam
        if (calType === '음력') {
          const res1 = await fetch(`/api/lunar?year=${yearParam}&month=${monthParam}&day=${dayParam}&calType=음력&leapMonth=${leapMonth}`)
          const d1 = await res1.json()
          sYear = d1.solarYear; sMonth = d1.solarMonth; sDay = d1.solarDay
          apiUrl = `/api/lunar?year=${sYear}&month=${sMonth}&day=${sDay}&calType=양력`
        } else {
          apiUrl = `/api/lunar?year=${yearParam}&month=${monthParam}&day=${dayParam}&calType=양력`
        }
        setSolarDate({ year: sYear, month: sMonth, day: sDay })

        const res = await fetch(apiUrl)
        const d = await res.json()
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

  // 대운 계산 — 서버 API 호출(절기 기반 정확 계산, 양력 날짜 사용)
  useEffect(() => {
    if (!dayStem || !monthGanji || !yearStem || !solarDate) return
    let alive = true
    fetch('/api/dayun', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        solarYear: solarDate.year, solarMonth: solarDate.month, solarDay: solarDate.day,
        monthGanji, yearStem, gender, dayStem,
      }),
    })
      .then(r => r.json())
      .then(d => { if (alive) setDayunList(d.dayunList || []) })
      .catch(e => { console.error('대운 로딩 실패:', e); if (alive) setDayunList([]) })
    return () => { alive = false }
  }, [dayStem, monthGanji, yearStem, solarDate, gender])

  const iljji = saju[1]?.branch ?? ''
  const yeonjji = saju[3]?.branch ?? ''
  const yeangan = saju[3]?.stem ?? ''
  const seyunList = dayStem ? calcSeyunList(dayStem, 2026) : []

  return { saju, dayStem, converting, iljji, yeonjji, yeangan, dayunList, seyunList }
}
