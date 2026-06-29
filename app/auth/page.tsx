'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthMainPage() {
  const router = useRouter()

  // 소셜 로그인은 준비 중이라, 이 화면은 이메일 로그인으로 자동 이동시킵니다.
  // (소셜 로그인을 다시 쓸 때는 아래 useEffect만 지우면 됩니다.)
  useEffect(() => {
    router.replace('/auth/login')
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
      이동 중...
    </div>
  )
}
