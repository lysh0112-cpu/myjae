'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthMainPage() {
  const router = useRouter()
  const [msg, setMsg] = useState('')

  // 구글 로그인 (실제 작동)
  const loginGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) setMsg('구글 로그인 오류: ' + error.message)
  }

  // 준비 중 안내
  const notReady = (name: string) => {
    setMsg(`${name} 로그인은 준비 중이에요. 지금은 구글 또는 이메일로 로그인해주세요.`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a18', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* 상단 안내 */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#FAC775', marginBottom: 14 }}>명연재 明然載</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#fff', lineHeight: 1.4, marginBottom: 8 }}>
            나를 비추는 명리,<br />로그인하고 시작하세요
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            가입은 30초면 충분해요 · 회원이면 자동 로그인
          </div>
        </div>

        {/* 소셜 버튼들 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* 카카오 (준비 중) */}
          <button onClick={() => notReady('카카오')}
            style={{ ...btnBase, background: '#FEE500', color: '#3A1D1D' }}>
            <span style={{ fontWeight: 800 }}>💬 카카오로 시작하기</span>
            <span style={badgeSoon}>준비 중</span>
          </button>

          {/* 네이버 (준비 중) */}
          <button onClick={() => notReady('네이버')}
            style={{ ...btnBase, background: '#03C75A', color: '#fff' }}>
            <span style={{ fontWeight: 800 }}>Ⓝ 네이버로 시작하기</span>
            <span style={badgeSoon}>준비 중</span>
          </button>

          {/* 구글 (작동) */}
          <button onClick={loginGoogle}
            style={{ ...btnBase, background: '#fff', color: '#1f1f1f', border: '1px solid #ddd' }}>
            <span style={{ fontWeight: 700 }}>Ⓖ 구글로 시작하기</span>
          </button>
        </div>

        {/* 이메일 로그인 (작게) */}
        <button onClick={() => router.push('/auth/login')}
          style={{ width: '100%', marginTop: 18, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer' }}>
          ✉️ 이메일로 로그인 / 회원가입
        </button>

        {msg && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(250,199,117,0.1)', border: '1px solid rgba(250,199,117,0.25)', borderRadius: 10, color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center' }}>
            {msg}
          </div>
        )}

        {/* 하단 안내 */}
        <div style={{ marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.6 }}>
          로그인 시 명연재 이용약관 및 개인정보 수집·이용에 동의하게 됩니다.<br />
          민감정보(생년월일·출생시간)는 사주 분석 목적에만 사용됩니다.
        </div>
      </div>
    </div>
  )
}

const btnBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  width: '100%', padding: '15px 0', borderRadius: 12, border: 'none',
  fontSize: 15, cursor: 'pointer', position: 'relative',
}
const badgeSoon: React.CSSProperties = {
  position: 'absolute', right: 14, fontSize: 11, fontWeight: 700,
  background: 'rgba(0,0,0,0.15)', padding: '2px 8px', borderRadius: 10,
}
