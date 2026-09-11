'use client'

// ==========================================================================
// /auth/login — ★옛 «어두운» 로그인 화면이 있던 자리입니다.
//
//   🔴 [2026-09-10 대표님 지적]
//      「명연재의 로그인도 골프온·큐보드와 «동일하게» 떠야 되는 것 아닌가」
//
//   [무엇이 문제였나]
//      · 배경이 ★#1a1a18 어두운 화면이었습니다 (45부가 「흐름이 끊긴다」 한 그 색)
//      · 🔴 ★카카오 단추가 «없었습니다»
//        ⇒ 카카오로 가입하신 분은 비밀번호를 만든 적이 없어
//           ★들어갈 문이 «아예» 없었습니다.
//      · 홈 머리의 [로그인]을 비롯해 ★열 곳이 이리로 오고 있었습니다.
//
//   [고침]  ★/login «하나» 로 모았습니다. 이 자리는 «보내기만» 합니다.
//      ⛔ 여기에 로그인 화면을 다시 만들지 마십시오 —
//         두 벌이 되면 ★한쪽에만 카카오가 빠지는 일이 또 생깁니다.
//         (지갑·약관을 명연재 한 곳으로 모은 것과 «같은 까닭» 입니다)
//
//   ⚠️ 파일을 «지우지» 않았습니다 — 이 주소를 북마크해 두신 분이 있을 수 있습니다.
//      ⇒ 지우면 그분들이 404 를 봅니다.
//   ⚠️ next(왔던 자리)를 ★그대로 실어 보냅니다. 안 그러면 지갑 손님이 길을 잃습니다.
// ==========================================================================

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { safeNextPath } from '@/lib/safeNext'

function Redirect() {
  const router = useRouter()
  const sp = useSearchParams()

  useEffect(() => {
    const raw = sp.get('next')
    /* ⛔ 「/」로 시작하는 «우리 집 주소» 만 실어 보냅니다 (「//」도 막습니다).
       ★열린 넘기기(open redirect)를 막는 자리입니다 — /login 과 같은 규칙입니다. */
    /* ★2026-09-11 (6부) — 규칙은 lib/safeNext.ts «한 곳» (검사 ㉒-q) */
    const safe = safeNextPath(raw)
    router.replace(safe ? `/login?next=${encodeURIComponent(safe)}` : '/login')
  }, [router, sp])

  return null
}

export default function AuthLoginRedirect() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <div style={{ minHeight: '100vh', background: '#FDF6F0' }}>
        <Redirect />
      </div>
    </Suspense>
  )
}
