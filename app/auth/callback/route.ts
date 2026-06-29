import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          },
        },
      }
    )

    // 1) 소셜 로그인 코드를 세션으로 교환
    const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code)
    const user = sessionData?.user

    if (user) {
      // 2) 프로필 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, role, privacy_agreed')
        .eq('id', user.id)
        .single()

      // 3) 닉네임·동의 미완 → 환영 화면(최초 1회)
      if (!profile || !profile.nickname || !profile.privacy_agreed) {
        return NextResponse.redirect(`${origin}/auth/welcome`)
      }

      // 4) 역할에 따라 분기
      if (profile.role === 'consultant' || profile.role === 'master') {
        return NextResponse.redirect(`${origin}/manseryeok/consultant`)
      }
      return NextResponse.redirect(`${origin}/`)
    }
  }

  // 코드가 없거나 실패하면 홈으로
  return NextResponse.redirect(`${origin}/`)
}
