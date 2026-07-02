import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, birth_year, birth_month, birth_day, birth_hour, cal_type, gender, leap_month } = body

    if (!userId) {
      return NextResponse.json({ error: '회원 ID가 없습니다.' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 사주 정보 업데이트 (사주가 하나라도 채워지면 saju_saved = true)
    const hasSaju = !!(birth_year && birth_month && birth_day)

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        birth_year: birth_year ?? null,
        birth_month: birth_month ?? null,
        birth_day: birth_day ?? null,
        birth_hour: birth_hour ?? null,
        cal_type: cal_type ?? null,
        gender: gender ?? null,
        leap_month: leap_month ?? false,
        saju_saved: hasSaju,
      })
      .eq('id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: '서버 오류: ' + (e?.message || '알 수 없음') }, { status: 500 })
  }
}
