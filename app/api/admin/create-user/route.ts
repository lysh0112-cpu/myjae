import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password, nickname, role } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: '이메일과 비밀번호는 필수입니다.' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1) 금고(Authentication)에 계정 생성 (이메일 인증 없이 바로 활성화)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nickname },
    })

    if (createErr) {
      return NextResponse.json({ error: '계정 생성 실패: ' + createErr.message }, { status: 500 })
    }

    const newId = created.user.id

    // 2) 서랍(profiles)에 정보 저장
    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
      id: newId,
      nickname: nickname || null,
      role: role || 'customer',
      privacy_agreed: true,
      privacy_agreed_at: new Date().toISOString(),
      terms_agreed: true,
    })

    if (profileErr) {
      return NextResponse.json({ error: '프로필 저장 실패: ' + profileErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: '서버 오류: ' + (e?.message || '알 수 없음') }, { status: 500 })
  }
}
