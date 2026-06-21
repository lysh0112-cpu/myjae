// app/api/lunar/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getYearGanji, getMonthGanji, getDayGanji } from "@/lib/saju/ganji"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = searchParams.get("year")
  const month = searchParams.get("month")
  const day = searchParams.get("day")
  const calType = searchParams.get("calType") || "양력"
  const leapMonth = searchParams.get("leapMonth") || "0"
  const apiKey = process.env.KASI_API_KEY

  if (!apiKey || !year || !month || !day) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  const y = parseInt(year)
  const m = parseInt(month)
  const d = parseInt(day)

  try {
    let solarYear = y, solarMonth = m, solarDay = d

    if (calType === "음력") {
      const leapParam = leapMonth === "1" ? "윤" : ""
      const url = `https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getSolCalInfo?lunYear=${y}&lunMonth=${String(m).padStart(2,"0")}&lunDay=${String(d).padStart(2,"0")}&lunLeapmonth=${leapParam}&ServiceKey=${apiKey}`
      const res = await fetch(url)
      const xmlText = await res.text()
      const getValue = (tag: string) => {
        const match = xmlText.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))
        return match ? match[1].trim() : ""
      }
      solarYear = parseInt(getValue("solYear"))
      solarMonth = parseInt(getValue("solMonth"))
      solarDay = parseInt(getValue("solDay"))
    }

    const yearGanji = getYearGanji(solarYear, solarMonth, solarDay)
    const monthGanji = getMonthGanji(solarYear, solarMonth, solarDay)
    const dayGanji = getDayGanji(solarYear, solarMonth, solarDay)

    let lunarYear = 0, lunarMonth = 0, lunarDay = 0
    if (calType === "양력") {
      const url2 = `https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getLunCalInfo?solYear=${solarYear}&solMonth=${String(solarMonth).padStart(2,"0")}&solDay=${String(solarDay).padStart(2,"0")}&ServiceKey=${apiKey}`
      const res2 = await fetch(url2)
      const xmlText2 = await res2.text()
      const getValue2 = (tag: string) => {
        const match = xmlText2.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))
        return match ? match[1].trim() : ""
      }
      lunarYear = parseInt(getValue2("lunYear"))
      lunarMonth = parseInt(getValue2("lunMonth"))
      lunarDay = parseInt(getValue2("lunDay"))
    }

    return NextResponse.json({
      solarYear, solarMonth, solarDay,
      lunarYear, lunarMonth, lunarDay,
      yearGanji, monthGanji, dayGanji,
      isLeapMonth: leapMonth === "1",
    })

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
