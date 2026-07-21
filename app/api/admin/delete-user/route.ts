import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireMaster } from '../_guard'

export async function POST(request: Request) {
  try {
    // ★관리자 권한 확인 (2026-07-21) — service_role 을 쓰므로 RLS 가 막아주지 않는다
    const g = await requireMaster()
    if (!g.ok) return g.res

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: '삭제할 회원 ID가 없습니다.' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    await supabaseAdmin.from('profiles').delete().eq('id', userId)

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      return NextResponse.json({ error: '삭제 중 오류: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: '서버 오류: ' + (e?.message || '알 수 없음') }, { status: 500 })
  }
}
