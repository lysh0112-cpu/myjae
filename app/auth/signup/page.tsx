'use client'

// ==========================================================================
// /auth/signup — ★2026-09-11 (6부) «/login 으로 보내는 자리» 로 바꿨습니다
//
//   [있던 일]  이 화면이 ★이메일 가입을 그대로 받고 있었습니다.
//              가리키는 링크는 0곳이었지만 «주소를 치면» 열렸습니다.
//              ⇒ 그렇게 가입하면 ★로그인할 문이 없고(이메일 로그인은 5부에 걷음)
//                계정만 갈라집니다 — 카카오로 들어온 같은 분과 지갑·보관함이 나뉩니다 (5부 0-1).
//   [지금]     /signup 과 «같은 모양» — 곧장 /login 으로 보냅니다.
//
//   ⛔ 파일을 «지우지» 마십시오 — 북마크하신 분이 404 를 봅니다 (5부 2-1 과 같은 까닭).
//   ⛔ 이메일 가입을 «되살리지» 마십시오 — 계정이 갈라집니다 (5부 10장). 검사 ㉒-s 가 봅니다.
//   ⚠️ 돌아갈 주소(next)는 lib/safeNext.ts «한 곳» 규칙으로 거릅니다 (검사 ㉒-q).
// ==========================================================================

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { safeNextPath } from '@/lib/safeNext'

function Redirect() {
  const router = useRouter()
  const sp = useSearchParams()

  useEffect(() => {
    const safe = safeNextPath(sp.get('next'))
    router.replace(safe ? `/login?next=${encodeURIComponent(safe)}` : '/login')
  }, [router, sp])

  return null
}

export default function AuthSignupRedirect() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <div style={{ minHeight: '100vh', background: '#FDF6F0' }}>
        <Redirect />
      </div>
    </Suspense>
  )
}
