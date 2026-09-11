import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireMaster } from '../_guard'

export async function POST(request: Request) {
  try {
    /* ★관리자 권한 확인 (2026-09-11 · 6부) — service_role 을 쓰므로 RLS 가 막아 주지 않습니다.
     *   ⚠️ 이 줄이 «없었습니다». 로그인 없이 불러도 DB 까지 들어갔습니다 (쿠키 없이 불러 잼).
     *   ⛔ 몸통을 읽기 «전» 에 둡니다 — 검사 ㉒-n 이 순서를 봅니다. */
    const g = await requireMaster()
    if (!g.ok) return g.res

    const { userId, nickname } = await request.json()
    if (!userId || !nickname || !nickname.trim()) {
      return NextResponse.json({ error: '회원 ID와 닉네임이 필요합니다.' }, { status: 400 })
    }
    if (nickname.trim().length > 20) {
      return NextResponse.json({ error: '닉네임은 20자 이내로 입력해주세요.' }, { status: 400 })
    }
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ nickname: nickname.trim() })
      .eq('id', userId)
    if (error) {
      return NextResponse.json({ error: '닉네임 변경 중 오류: ' + error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    return NextResponse.json({ error: '서버 오류: ' + (msg || '알 수 없음') }, { status: 500 })
  }
}
