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
      /* ★2026-09-10 — 「왔던 자리」를 welcome 까지 «들고» 갑니다.
       *   [까닭]  큐보드·골프온에서 지갑으로 넘어온 분이 카카오로 처음 로그인하면
       *      여기서 welcome 으로 가는데, ★어디서 왔는지 몰라 사주를 «다» 물었습니다.
       *      당구 치러 오신 분에게 태어난 시를 묻는 꼴이었습니다.
       *   ⇒ next 를 넘겨 주면 welcome 이 ★from=bil/glf 를 보고 사주를 «선택» 으로 냅니다.
       *
       *   ⛔⛔ ★「/」로 시작하는 «우리 집 주소» 만 받습니다 (「//」도 막습니다) —
       *      그대로 받으면 ★남의 사이트로 손님을 보낼 수 있습니다 (열린 넘기기).
       *      /login 의 nextPath() 와 «같은» 규칙입니다. ⛔ 한쪽만 풀지 마십시오.
       */
      const rawNext = requestUrl.searchParams.get('next')
      const safeNext = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
        ? rawNext
        : null

      // 2) 프로필 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, role, privacy_agreed')
        .eq('id', user.id)
        .single()

      // 3) 닉네임·동의 미완 → 환영 화면(최초 1회)
      if (!profile || !profile.nickname || !profile.privacy_agreed) {
        return NextResponse.redirect(
          `${origin}/auth/welcome` + (safeNext ? `?next=${encodeURIComponent(safeNext)}` : '')
        )
      }

      // 3-1) ★프로필이 다 찼으면 «왔던 자리» 로 곧장 보냅니다
      if (safeNext) return NextResponse.redirect(`${origin}${safeNext}`)

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
