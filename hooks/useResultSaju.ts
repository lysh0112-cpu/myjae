import { useState, useEffect } from 'react'
import { calcHourPillar } from '@/lib/saju/hourPillar'

function splitGanji(ganji: string) {
  if (!ganji) return { stem: "?", branch: "?" }
  const match = ganji.match(/\(([^)]+)\)/)
  if (match && match[1].length >= 2) return { stem: match[1][0], branch: match[1][1] }
  if (ganji.length >= 2) return { stem: ganji[0], branch: ganji[1] }
  return { stem: "?", branch: "?" }
}

export function useResultSaju(
  calType: string, yearParam: number, monthParam: number,
  dayParam: number, leapMonth: string, hourIdx: number | null
) {
  const [saju, setSaju] = useState<{pillar:string;stem:string;branch:string}[]>([])
  const [solar, setSolar] = useState<{year:number;month:number;day:number}|null>(null)
  const [converting, setConverting] = useState(true)
  const [dayStem, setDayStem] = useState("")
  const [monthGanji, setMonthGanji] = useState("")
  const [yearStem, setYearStem] = useState("")
  useEffect(() => {
    if (!yearParam || !monthParam || !dayParam) return
    async function loadSaju() {
      setConverting(true)
      try {
        // ✅ 한 번의 API 호출로 처리
        const apiUrl = `/api/lunar?year=${yearParam}&month=${monthParam}&day=${dayParam}&calType=${calType}&leapMonth=${leapMonth}`
        const res = await fetch(apiUrl)
        const d = await res.json()
        if (d.error) { console.error('API 오류:', d.error); return }
        if (calType === "음력") {
          setSolar({ year: d.solarYear, month: d.solarMonth, day: d.solarDay })
        }
        const year = splitGanji(d.yearGanji)
        const month = splitGanji(d.monthGanji)
        const day = splitGanji(d.dayGanji)
        const hour = hourIdx !== null ? calcHourPillar(day.stem, hourIdx) : { stem: "?", branch: "?" }
        setDayStem(day.stem)
        setMonthGanji(month.stem + month.branch)
        setYearStem(year.stem)
        setSaju([
          { pillar: "시주", stem: hour.stem, branch: hour.branch },
          { pillar: "일주", stem: day.stem, branch: day.branch },
          { pillar: "월주", stem: month.stem, branch: month.branch },
          { pillar: "년주", stem: year.stem, branch: year.branch },
        ])
      } catch(e) {
        console.error(e)
      } finally {
        setConverting(false)
      }
    }
    loadSaju()
  }, [calType, yearParam, monthParam, dayParam, leapMonth, hourIdx])
  const iljji = saju[1]?.branch ?? ""
  const yeonjji = saju[3]?.branch ?? ""
  return { saju, solar, converting, dayStem, monthGanji, yearStem, iljji, yeonjji }
}
