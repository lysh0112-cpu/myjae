import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireMaster } from '../_guard'

export async function POST(request: Request) {
  try {
    // ★관리자 권한 확인 (2026-07-21) — service_role 을 쓰므로 RLS 가 막아주지 않는다
    const g = await requireMaster()
    if (!g.ok) return g.res

    const { userId, role } = await request.json()
    if (!userId || !role) {
      return NextResponse.json({ error: '회원 ID와 등급이 필요합니다.' }, { status: 400 })
    }
    if (!['customer', 'consultant', 'master'].includes(role)) {
      return NextResponse.json({ error: '올바르지 않은 등급입니다.' }, { status: 400 })
    }
    // ★자기 자신을 관리자에서 내리는 것은 막는다 (2026-07-21)
    //   실수로 내리면 관리자 화면에 다시 들어갈 수 없어 SQL 로만 복구된다.
    if (userId === g.userId && role !== 'master') {
      return NextResponse.json(
        { error: '자기 자신의 관리자 권한은 내릴 수 없습니다. 다른 관리자에게 요청하세요.' },
        { status: 400 },
      )
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
