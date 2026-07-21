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
        // solar = "양력 생년월일". 심산 오행 점수의 월지 계절 치환에 필요하다.
        //   음력 입력이면 변환 결과를, 양력 입력이면 입력값을 그대로 담는다.
        //   ★양력일 때 비워 두면 호출부의 solar?.month 가 undefined 가 되어
        //     심산 점수가 조용히 옛 배점으로 되돌아간다. (2026-07-21 수정)
        //   useConsultantSaju 의 solarDate 와 같은 의미로 맞췄다.
        if (calType === "음력") {
          setSolar({ year: d.solarYear, month: d.solarMonth, day: d.solarDay })
        } else {
          setSolar({ year: yearParam, month: monthParam, day: dayParam })
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
