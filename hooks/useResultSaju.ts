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
    // ══════════════════════════════════════════════════════════════
    //  🔴 2026-08-02 — 「사주 불러오는 중…」 이 «영영» 멈춰 있던 자리
    //
    //  [무엇이 있었나]  converting 은 true 로 시작합니다.
    //    그런데 생년월일이 없으면 여기서 «그냥 나가» 버렸습니다.
    //    → setConverting(false) 를 지나갈 길이 없어 true 로 남았고,
    //      손님은 「곧 나오겠지」 하며 빈 화면을 계속 보고 계셨습니다.
    //
    //  ★[이제]  «불러올 것이 없다» 는 것도 «끝난 것» 입니다.
    //    끝났다고 알려야 부르는 쪽이 「사주 정보가 필요해요」 안내를 낼 수 있습니다.
    //
    //  ⚠️ 이 훅은 여섯 화면이 나눠 씁니다. 전부 «생년월일이 없을 때»
    //     따로 안내를 갖고 있습니다 (result-new 의 !info, 오늘운세의 !saju_saved).
    //     로딩을 붙잡아 두는 것이 그 안내를 «가리고» 있었습니다.
    // ══════════════════════════════════════════════════════════════
    //  ⚠️⚠️ 아래 한 줄만 eslint 규칙(set-state-in-effect)을 풉니다.
    //     [까닭]  그 규칙은 «다른 값에서 끌어낼 수 있는 것을 effect 로 만들지 말라» 는
    //       뜻입니다. 옳은 말입니다. 다만 여기 converting 은 «불러오는 일» 그 자체의
    //       처음과 끝이고, 그 일이 이 effect 안에 있습니다.
    //       ★「부를 것이 없다」는 것도 그 일의 «끝» 입니다. 여기서 알리지 않으면
    //         알릴 자리가 없습니다.
    //     ⚠️ 규칙을 따르려면 converting 을 걷어내고 「끝났는가」를 부르는 쪽에서
    //        따져야 하는데, 이 훅은 «여섯 화면» 이 나눠 씁니다.
    //        한꺼번에 손대면 멈춤을 고치려다 여섯 곳을 흔듭니다. (교훈 CJ)
    //     ⚠️ 이 줄을 지우실 때는 여섯 화면을 «모두» 세고 함께 옮기십시오.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!yearParam || !monthParam || !dayParam) { setConverting(false); return }
    async function loadSaju() {
      setConverting(true)
      try {
        // ✅ 한 번의 API 호출로 처리
        const apiUrl = `/api/lunar?year=${yearParam}&month=${monthParam}&day=${dayParam}&calType=${calType}&leapMonth=${leapMonth}`
          // ★2026-07-27 — 태어난 시를 함께 넘긴다. 절입일 당일 태생의 년주·월주가 갈린다.
          + (hourIdx !== null ? `&hour=${hourIdx}` : '')
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
