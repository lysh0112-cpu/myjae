// app/api/lunar/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getYearGanji, getMonthGanji, getDayGanji } from "@/lib/saju/ganji"
import { hourRepMinute } from "@/lib/saju/birthInput"
// ★2026-07-31 (41부) 음력 변환 단일 창구 — KASI 정본 + 부본 폴백 + 대조
import { lunarToSolar, solarToLunar, type LunarSource } from "@/lib/saju/lunarConvert"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = searchParams.get("year")
  const month = searchParams.get("month")
  const day = searchParams.get("day")
  const calType = searchParams.get("calType") || "양력"
  const leapMonth = searchParams.get("leapMonth") || "0"
  // ★2026-07-27 — 태어난 시(時) 인덱스(0~11). 없으면 모름.
  //   절입일 당일 태생의 년주·월주를 가리는 데 쓴다.
  const hourParam = searchParams.get("hour")
  const hourIdx = hourParam == null || hourParam === '' || hourParam === '모름'
    ? null : parseInt(hourParam)
  const birthMinute = hourIdx != null && !isNaN(hourIdx) ? hourRepMinute(hourIdx) : null
  const apiKey = process.env.KASI_API_KEY ?? ""

  // ★2026-07-31 (41부) — 키가 «없어도» 죽지 않습니다.
  //   예전에는 KASI_API_KEY 가 비면 여기서 400 으로 서비스가 통째로 막혔습니다.
  //   이제 부본(lunar-javascript)이 대신 답합니다. 절기는 이미 계산 폴백이 있습니다(26부).
  if (!year || !month || !day) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  const y = parseInt(year)
  const m = parseInt(month)
  const d = parseInt(day)

  try {
    let solarYear = y, solarMonth = m, solarDay = d
    // ★어디서 나온 값인가 · 왜 부본으로 갔나 · 정본과 부본이 어긋났나
    const sources: LunarSource[] = []
    const reasons: string[] = []
    const mismatches: string[] = []

    if (calType === "음력") {
      const r = await lunarToSolar(
        { year: y, month: m, day: d, isLeap: leapMonth === "1" }, apiKey)
      if (!r.value) {
        return NextResponse.json({ error: "음력을 양력으로 옮기지 못했습니다" }, { status: 502 })
      }
      solarYear = r.value.year; solarMonth = r.value.month; solarDay = r.value.day
      sources.push(r.source)
      if (r.reason) reasons.push(r.reason)
      if (r.mismatch) mismatches.push(`음→양 ${r.mismatch}`)
    }

    // ✅ apiKey를 직접 넘겨서 KASI 절기 API 호출
    const [yearGanji, monthGanji] = await Promise.all([
      // ★2026-07-27 — 태어난 시각을 넘긴다.
      //   절기는 하루 중 어느 순간에 든다(2027 입춘 2/4 10:52).
      //   절입일 당일 태생은 시각을 봐야 년주·월주가 갈린다.
      //   hour 가 없으면(시 모름) 예전처럼 당일=이전 달·이전 해로 본다.
      getYearGanji(solarYear, solarMonth, solarDay, apiKey, birthMinute),
      getMonthGanji(solarYear, solarMonth, solarDay, apiKey, birthMinute),
    ])
    const dayGanji = getDayGanji(solarYear, solarMonth, solarDay)

    let lunarYear = 0, lunarMonth = 0, lunarDay = 0
    let lunarIsLeap = leapMonth === "1"
    if (calType === "양력") {
      const r = await solarToLunar({ year: solarYear, month: solarMonth, day: solarDay }, apiKey)
      if (r.value) {
        lunarYear = r.value.year; lunarMonth = r.value.month; lunarDay = r.value.day
        lunarIsLeap = r.value.isLeap
      }
      sources.push(r.source)
      if (r.reason) reasons.push(r.reason)
      if (r.mismatch) mismatches.push(`양→음 ${r.mismatch}`)
    }

    // ⚠️ 정본과 부본이 어긋나면 «조용히 넘기지 않습니다».
    //    한쪽이 틀린 것입니다. 쌓이면 어느 쪽인지 살펴야 합니다.
    if (mismatches.length > 0) {
      console.warn("[lunar] KASI ↔ 부본 어긋남:", mismatches.join(" / "))
    }

    return NextResponse.json({
      solarYear, solarMonth, solarDay,
      lunarYear, lunarMonth, lunarDay,
      yearGanji, monthGanji, dayGanji,
      isLeapMonth: lunarIsLeap,
      // ★2026-07-31 (41부) 출처 추적 — 화면은 안 써도 됩니다. 기록·점검용입니다
      source: sources.includes("KASI") ? "KASI" : (sources[0] ?? "KASI"),
      sources,
      fallbackReason: reasons.length ? reasons.join(" / ") : null,
      mismatch: mismatches.length ? mismatches.join(" / ") : null,
    })

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
