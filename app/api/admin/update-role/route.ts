import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId, role } = await request.json()
    if (!userId || !role) {
      return NextResponse.json({ error: '회원 ID와 등급이 필요합니다.' }, { status: 400 })
    }
    if (!['customer', 'consultant', 'master'].includes(role)) {
      return NextResponse.json({ error: '올바르지 않은 등급입니다.' }, { status: 400 })
    }
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', userId)
    if (error) {
      return NextResponse.json({ error: '등급 변경 중 오류: ' + error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: '서버 오류: ' + (e?.message || '알 수 없음') }, { status: 500 })
  }
}
