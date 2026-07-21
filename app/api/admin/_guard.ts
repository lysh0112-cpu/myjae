// ============================================================================
// 관리자 API 권한 가드 — 2026-07-21 신설
//
// [왜 필요한가]
//   admin API 들은 SUPABASE_SERVICE_ROLE_KEY 로 Supabase 를 부른다.
//   service_role 은 RLS(행 수준 보안)를 **완전히 무시**하는 마스터키다.
//   그래서 RLS 정책을 아무리 잘 짜 두어도 이 API 들은 보호되지 않는다.
//   → API 문 앞에서 "누가 불렀는지" 를 직접 확인해야 한다.
//
// [무엇을 확인하나]
//   ① 로그인 세션이 있나        없으면 401
//   ② 그 세션이 유효한가         가짜면 401
//   ③ 그 사람의 role 이 master 인가  아니면 403
//
//   ★요청 본문(userId 등)은 보낸 사람이 마음대로 쓸 수 있으므로 믿지 않는다.
//     쿠키의 세션 토큰만 믿는다. 이것은 Supabase 가 서명해 발급한 것이라
//     위조할 수 없다.
//
// [주의] 여기서는 ANON_KEY 를 쓴다. service_role 이 아니다.
//   "이 쿠키의 주인이 누구인지" 만 물어보는 용도이기 때문이다.
//
// [쓰는 법] 각 route.ts 맨 앞에 두 줄:
//     const g = await requireMaster()
//     if (!g.ok) return g.res
// ============================================================================

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

type GuardResult =
  | { ok: true; userId: string }
  | { ok: false; res: NextResponse }

export async function requireMaster(): Promise<GuardResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          // API 라우트에서는 쿠키를 새로 굽지 않는다(세션 갱신은 middleware 담당).
          setAll() {},
        },
      }
    )

    // ①② 세션 확인 — 서버가 Supabase 에 직접 물어보므로 위조 불가
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return {
        ok: false,
        res: NextResponse.json(
          { error: '로그인이 필요합니다.' },
          { status: 401 },
        ),
      }
    }

    // ③ 등급 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'master') {
      return { ok: true, userId: user.id }
    }

    return {
      ok: false,
      res: NextResponse.json(
        { error: '관리자만 사용할 수 있습니다.' },
        { status: 403 },
      ),
    }
  } catch {
    // 예기치 못한 오류는 "막는 쪽"으로 처리한다.
    //   보안 검사는 실패했을 때 통과시키면 안 된다.
    return {
      ok: false,
      res: NextResponse.json(
        { error: '권한을 확인하지 못했습니다.' },
        { status: 401 },
      ),
    }
  }
}
