import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireMaster } from '../_guard'
export async function GET() {
  try {
    // ★관리자 권한 확인 (2026-07-21 2차)
    //   이 API 는 전 회원의 이메일·닉네임·생년월일·출생시·성별을
    //   한 번에 돌려준다. 가드가 없으면 URL 만 알면 누구나 받아갈 수 있다.
    const g = await requireMaster()
    if (!g.ok) return g.res

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    // profiles 목록 (닉네임, 등급, 가입일, 사주 정보)
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      // ★2026-09-08 — hangul_name 을 더했습니다.
      //   memberName() 의 차례(nickname → hangul_name → 메타nickname → 이메일앞)에 씁니다.
      //   ⛔ 빼지 마십시오 — 빼면 닉네임 없는 회원이 「회원」으로만 보입니다.
      .select('id, nickname, hangul_name, role, created_at, birth_year, birth_month, birth_day, birth_hour, cal_type, gender')
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
        hangul_name: p?.hangul_name || null,
        //  ★카카오 «첫 로그인» 순간에는 profiles 줄이 아직 없습니다.
        //    그때는 user_metadata 의 닉네임이 그 사람의 «유일한» 이름입니다 [1부 2-3].
        //  ⛔ 이 줄을 빼지 마십시오.
        meta_nickname:
          (u.user_metadata?.nickname as string | undefined) ||
          (u.user_metadata?.name as string | undefined) ||
          null,
        role: p?.role || 'customer',
        created_at: p?.created_at || u.created_at || null,
        last_sign_in_at: u.last_sign_in_at || null,
        birth_year: p?.birth_year ?? null,
        birth_month: p?.birth_month ?? null,
        birth_day: p?.birth_day ?? null,
        birth_hour: p?.birth_hour ?? null,
        cal_type: p?.cal_type ?? null,
        gender: p?.gender ?? null,
      }
    })
    // 가입 최신순 정렬
    members.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0
      const db = b.created_at ? new Date(b.created_at).getTime() : 0
      return db - da
    })
    return NextResponse.json({ members })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    return NextResponse.json({ error: '서버 오류: ' + (msg || '알 수 없음') }, { status: 500 })
  }
}
