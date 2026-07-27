// app/api/dayun/route.ts
// 대운 계산 API — 서버에서 절기(KASI) 조회 + 대운수 정확 계산
// 반드시 '양력' 생년월일(solarYear/Month/Day)을 받는다.

import { NextRequest, NextResponse } from 'next/server'
import { calcDayunList, calcDayunStartAgeByHour, isForwardDayun } from '@/lib/saju/dayun'
import { hourRepMinute } from '@/lib/saju/birthInput'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      solarYear, solarMonth, solarDay,
      monthGanji, yearStem, gender, dayStem,
      // ★2026-07-27 — 태어난 시(時) 인덱스(0~11). 절입일 당일 태생의 대운수를 가린다.
      hourIdx,
    } = body || {}

    if (
      !solarYear || !solarMonth || !solarDay ||
      !monthGanji || !yearStem || !gender || !dayStem
    ) {
      return NextResponse.json({ error: 'missing_params', dayunList: [] }, { status: 400 })
    }

    const apiKey = process.env.KASI_API_KEY || ''

    const dayunList = await calcDayunList(
      Number(solarYear),
      Number(solarMonth),
      Number(solarDay),
      String(monthGanji),
      String(yearStem),
      String(gender),
      String(dayStem),
      apiKey,
      hourIdx == null ? null : hourRepMinute(Number(hourIdx)),
    )

    // ★2026-07-27 — 열두 시진 각각의 대운수를 함께 준다.
    //   출산택일은 후보 날짜 하나에 시진 여럿을 본다. 절입일 당일이면 시진에 따라
    //   대운수가 갈리는데, 예전에는 날짜당 한 번만 부르고 시진을 안 봤다.
    //   절기 조회는 여기서 한 번 더 할 뿐이라 KASI 부담이 거의 없다.
    const startAgeByHour = await calcDayunStartAgeByHour(
      Number(solarYear), Number(solarMonth), Number(solarDay),
      isForwardDayun(String(yearStem), String(gender)), apiKey,
    )

    return NextResponse.json({ dayunList, startAgeByHour })
  } catch (e) {
    console.error('dayun api error:', e)
    return NextResponse.json({ error: 'internal', dayunList: [] }, { status: 200 })
  }
}
