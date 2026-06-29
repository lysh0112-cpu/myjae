import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // profiles 목록 (닉네임, 등급, 가입일)
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, nickname, role, created_at')

    // Authentication 목록 (이메일, 마지막 로그인) — 최대 1000명
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // 두 정보를 id 기준으로 합치기
    const profileMap = new Map((profiles || []).map(p => [p.id, p]))
    const members = (authData?.users || []).map(u => {
      const p = profileMap.get(u.id)
      return {
        id: u.id,
        email: u.email || '',
        nickname: p?.nickname || null,
        role: p?.role || 'customer',
        created_at: p?.created_at || u.created_at || null,
        last_sign_in_at: u.last_sign_in_at || null,
      }
    })

    // 가입 최신순 정렬
    members.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0
      const db = b.created_at ? new Date(b.created_at).getTime() : 0
      return db - da
    })

    return NextResponse.json({ members })
  } catch (e: any) {
    return NextResponse.json({ error: '서버 오류: ' + (e?.message || '알 수 없음') }, { status: 500 })
  }
}
