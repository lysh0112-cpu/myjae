import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// 이메일 가리기: jiyoung@gmail.com → jiy***@gmail.com
function maskEmail(email: string): string {
  const [id, domain] = email.split('@')
  if (!domain) return '***'
  const head = id.slice(0, Math.min(3, id.length))
  return `${head}***@${domain}`
}

// 회원 이름(nickname) 검색 — 서버 권한(service_role)으로 RLS 우회
// body: { name: string, excludeUserId?: string }
// 반환: { members: [{ userId, nickname, maskedEmail, joinedYear }] }
export async function POST(req: Request) {
  try {
    const { name, excludeUserId } = await req.json()
    const q = (name || '').trim()
    if (!q) return NextResponse.json({ members: [] })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // 이름 부분 일치로 profiles 검색 (최대 10명)
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, nickname, created_at')
      .ilike('nickname', `%${q}%`)
      .limit(10)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ members: [] })
    }

    // 이메일은 auth.users에서 가져와 id로 매칭
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const emailMap = new Map((authData?.users || []).map((u) => [u.id, u.email || '']))

    const members = profiles
      .filter((p) => p.id !== excludeUserId)
      .map((p) => {
        const email = emailMap.get(p.id) || ''
        return {
          userId: p.id,
          nickname: p.nickname || '회원',
          maskedEmail: email ? maskEmail(email) : '(이메일 없음)',
          joinedYear: p.created_at ? new Date(p.created_at).getFullYear().toString() : '',
        }
      })

    return NextResponse.json({ members })
  } catch (e: any) {
    return NextResponse.json({ error: '서버 오류: ' + (e?.message || '알 수 없음') }, { status: 500 })
  }
}
