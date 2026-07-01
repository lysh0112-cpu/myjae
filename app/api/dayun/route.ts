// app/api/dayun/route.ts
// 대운 계산 API — 서버에서 절기(KASI) 조회 + 대운수 정확 계산
// 반드시 '양력' 생년월일(solarYear/Month/Day)을 받는다.

import { NextRequest, NextResponse } from 'next/server'
import { calcDayunList } from '@/lib/saju/dayun'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      solarYear, solarMonth, solarDay,
      monthGanji, yearStem, gender, dayStem,
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
      apiKey
    )

    return NextResponse.json({ dayunList })
  } catch (e) {
    console.error('dayun api error:', e)
    return NextResponse.json({ error: 'internal', dayunList: [] }, { status: 200 })
  }
}
