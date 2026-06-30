// app/api/holidays/route.ts
// 결혼택일용 공휴일 조회 API
// 한국천문연구원 특일정보(getRestDeInfo)를 호출해, 기간 내 법정공휴일·대체공휴일 날짜를 돌려준다.
// 키는 기존 음양력과 동일한 KASI_API_KEY 를 그대로 재사용한다(공공데이터포털은 계정당 인증키 공용).
// 호출/파싱 방식은 app/api/lunar/route.ts 와 동일하게 맞춤(ServiceKey 직접 부착, 정규식 XML 파싱).

import { NextRequest, NextResponse } from "next/server"

// YYYY-MM-DD 또는 YYYYMMDD 입력에서 연/월 추출
function ymOf(dateStr: string): { y: number; m: number } | null {
  const s = dateStr.replace(/-/g, "")
  if (s.length < 6) return null
  const y = parseInt(s.slice(0, 4))
  const m = parseInt(s.slice(4, 6))
  if (isNaN(y) || isNaN(m)) return null
  return { y, m }
}

// 시작~끝 사이의 (연,월) 목록 생성 (최대 24개월 안전상한)
function monthsBetween(start: string, end: string): { y: number; m: number }[] {
  const s = ymOf(start)
  const e = ymOf(end)
  if (!s || !e) return []
  const out: { y: number; m: number }[] = []
  let y = s.y, m = s.m
  let guard = 0
  while ((y < e.y || (y === e.y && m <= e.m)) && guard < 24) {
    out.push({ y, m })
    m++
    if (m > 12) { m = 1; y++ }
    guard++
  }
  return out
}

// 특일정보 한 달치 조회 → 휴일(Y)인 locdate 배열
async function fetchHolidaysOfMonth(y: number, m: number, apiKey: string): Promise<{ date: string; name: string }[]> {
  const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?solYear=${y}&solMonth=${String(m).padStart(2, "0")}&numOfRows=50&ServiceKey=${apiKey}`
  try {
    const res = await fetch(url)
    const xmlText = await res.text()
    const items: { date: string; name: string }[] = []
    const itemMatches = xmlText.match(/<item>[\s\S]*?<\/item>/g) || []
    for (const block of itemMatches) {
      const get = (tag: string) => {
        const mm = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))
        return mm ? mm[1].trim() : ""
      }
      const locdate = get("locdate")
      const isHoliday = get("isHoliday")
      const dateName = get("dateName")
      if (locdate && isHoliday === "Y") {
        items.push({ date: locdate, name: dateName })
      }
    }
    return items
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const start = searchParams.get("start") // YYYY-MM-DD
  const end = searchParams.get("end")     // YYYY-MM-DD
  const apiKey = process.env.KASI_API_KEY ?? ""

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 400 })
  }
  if (!start || !end) {
    return NextResponse.json({ error: "Missing start/end" }, { status: 400 })
  }

  const months = monthsBetween(start, end)
  if (months.length === 0) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
  }

  try {
    const lists = await Promise.all(months.map(({ y, m }) => fetchHolidaysOfMonth(y, m, apiKey)))
    const map = new Map<string, string>()
    for (const list of lists) {
      for (const h of list) map.set(h.date, h.name) // YYYYMMDD → 이름
    }
    // 시작~끝 범위 안의 것만 (월 단위 조회라 경계월의 범위 밖 날짜가 섞일 수 있음)
    const s = start.replace(/-/g, "")
    const e = end.replace(/-/g, "")
    const holidays = Array.from(map.entries())
      .filter(([date]) => date >= s && date <= e)
      .map(([date, name]) => ({ date, name }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({ holidays })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
