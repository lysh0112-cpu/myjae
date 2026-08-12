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
// [주의] ①② 는 ANON_KEY 를 쓴다. "이 쿠키의 주인이 누구인지" 만 묻기 때문이다.
//   ★③ 등급 읽기만 2026-08-12 에 service_role 로 바꿨다 (아래 roleReader 주석).
//   ⛔ ①② 를 service_role 로 바꾸지 마십시오 — 쿠키를 «검증하는» 자리입니다.
//
// [쓰는 법] 각 route.ts 맨 앞에 두 줄:
//     const g = await requireMaster()
//     if (!g.ok) return g.res
//
// ----------------------------------------------------------------------------
// [requireUser — 2026-07-21 2차 추가]
//   매니저 전용이 아니라 "로그인한 회원이면 누구나" 쓸 수 있어야 하는 API 용.
//   예: 커플 회원 검색(고객이 직접 쓴다). 여기에 requireMaster 를 붙이면
//       고객이 기능을 못 쓴다.
//
//   막는 것: 로그인 안 한 외부인 (등급은 보지 않는다)
//
//     const g = await requireUser()
//     if (!g.ok) return g.res
// ============================================================================

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

type GuardResult =
  | { ok: true; userId: string }
  | { ok: false; res: NextResponse }

// ----------------------------------------------------------------------------
// ★2026-08-12 — 등급만 service_role 로 읽는다 (48부 10-2 「아침마다 막힘」)
//
// [겪은 일]  「어제 밤까지 됐는데 아침에 안 되네」 → 재로그인하면 됨.
//    화면(/admin)은 «열리는데» 관리자 API 여덟 개만 403 이 났다.
//
// [왜]  문지기가 «둘» 인데 읽는 방식이 달랐다 —
//    화면  hooks/useRoleGate.tsx  브라우저 supabase-js  → ★토큰을 스스로 되살림
//    API   이 파일               서버 anon 키 + 쿠키    → ★되살리는 길이 없음
//    ⇒ 밤새 토큰이 만료되면 profiles 조회에 uid 가 안 실려
//      RLS(auth.uid() = id)에 걸려 profile 이 null → 「매니저가 아니다」 → 403.
//
// [고침]  «누구인지»(①②)는 ★여전히 쿠키 세션으로 검증한다. 그대로다.
//    바뀐 것은 ③ «그 사람의 등급을 읽는 길» 하나뿐이다.
//    user.id 는 Supabase 가 서명해 발급한 토큰에서 나온 값이라 위조할 수 없고,
//    요청 본문은 여전히 «믿지 않는다». ⇒ ★보안 수준은 그대로다.
//
// ⛔⛔ profiles 의 RLS 정책을 «풀지» 마십시오 — 전 회원의 생년월일이 들어 있습니다.
//    이 파일이 service_role 로 읽는 것은 ★role 한 칸뿐입니다.
// ⛔ 이 클라이언트를 «다른 표» 를 읽는 데 돌려쓰지 마십시오.
// ----------------------------------------------------------------------------
function roleReader() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null   // ★열쇠가 없으면 null — 부르는 쪽이 anon 으로 내려간다
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

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

    // ③ 등급 확인 — ★RLS 를 안 타는 길로 읽는다 (위 roleReader 주석 참조)
    //   ⚠️ single() 이 아니라 maybeSingle() 이다.
    //      profiles 줄이 «없는» 사람(가입 직후 등)은 «오류» 가 아니라 «손님» 이다.
    const reader = roleReader() ?? supabase
    const { data: profile } = await reader
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

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

// ============================================================================
// requireUser — 로그인만 확인 (등급은 보지 않는다)
//
//   requireMaster 와 다른 점은 ③ 등급 확인이 없다는 것뿐이다.
//   고객이 직접 쓰는 기능인데 service_role 로 Supabase 를 부르는 API 에 쓴다.
// ============================================================================
export async function requireUser(): Promise<GuardResult> {
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
          setAll() {},
        },
      }
    )

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

    return { ok: true, userId: user.id }
  } catch {
    // 보안 검사는 실패했을 때 통과시키면 안 된다. (requireMaster 와 동일)
    return {
      ok: false,
      res: NextResponse.json(
        { error: '권한을 확인하지 못했습니다.' },
        { status: 401 },
      ),
    }
  }
}
