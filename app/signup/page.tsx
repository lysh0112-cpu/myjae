'use client'

// ==========================================================================
// /signup — ★옛 «이메일 회원가입» 화면이 있던 자리입니다.
//
//   🔴 [2026-09-10 밤 · 대표님] 「카카오 하나로 통일하자」 · 「아예 없애버려」
//
//   [무엇이 문제였나]
//      같은 분이 ★카카오와 이메일로 «따로» 가입하면 auth.users 가 «둘» 이 되어
//      ★user_id 가 갈립니다.
//      ⇒ 지갑(mc_wallet)·보관함·사주·상담 내역이 ★통째로 갈라집니다.
//      ⇒ 큐보드·골프온에서도 «다른 사람» 으로 보입니다.
//      ⇒ 4부 5장의 「카카오 앱을 셋으로 만들면 지갑이 셋으로 갈라집니다」와
//         ★같은 종류의 사고입니다. 되돌리기 매우 어렵습니다.
//
//   [고침]  가입·로그인을 ★/login «하나» 로 모았습니다.
//      ⚠️ 카카오는 ★가입과 로그인이 «같은 길» 입니다 —
//         profiles 가 없으면 환영 화면(가입), 있으면 홈(로그인)으로 갈립니다.
//         ⇒ 따로 가입할 화면이 «필요 없습니다».
//
//   ⚠️ 파일을 «지우지» 않았습니다 — 이 주소를 아시는 분이 있을 수 있습니다.
//      ⇒ 지우면 404 를 봅니다. 여기서 조용히 /login 으로 보냅니다.
//
//   ⛔ 여기에 가입 화면을 다시 만들지 마십시오 — 계정이 또 갈라집니다.
//   ⛔ Supabase 의 «Email» Provider 는 «끄지» 마십시오 —
//      화면만 없앤 것입니다. 관리자용으로 되살릴 때 씁니다.
//
//   ⚠️ ★master 둘이 이메일 계정입니다 (a@naver.com · b@naver.com).
//      ⇒ 대표님 카카오(류버럭)는 이미 master 라 괜찮습니다.
//      🔴 ★연재쌤은 카카오 계정을 만들고 role 을 master 로 바꿔 주셔야 합니다.
// ==========================================================================

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function Redirect() {
  const router = useRouter()
  const sp = useSearchParams()

  useEffect(() => {
    const raw = sp.get('next')
    /* ⛔ 「/」로 시작하는 «우리 집 주소» 만 실어 보냅니다 (「//」도 막습니다).
       ★열린 넘기기(open redirect)를 막는 자리입니다 — /login 과 같은 규칙입니다. */
    const safe = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null
    router.replace(safe ? `/login?next=${encodeURIComponent(safe)}` : '/login')
  }, [router, sp])

  return null
}

export default function SignupRedirect() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <div style={{ minHeight: '100vh', background: '#FDF6F0' }}>
        <Redirect />
      </div>
    </Suspense>
  )
}
