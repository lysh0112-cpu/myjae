'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { joinCoupleByInvite } from '@/lib/saju/coupleInvite'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [keepLogin, setKeepLogin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 로그인 후 이동: 가입 직후(닉네임·약관 미완료)면 환영 화면, 아니면 신버전 홈
  const routeAfterLogin = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname, privacy_agreed')
      .eq('id', userId)
      .single()

    if (!profile || !profile.nickname || !profile.privacy_agreed) {
      router.push('/auth/welcome')
      return
    }
    // 초대 링크로 온 로그인(?invite=)이면 → 자동 연결 후 채팅방으로.
    const inviteToken =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('invite')
        : null
    if (inviteToken) {
      const joined = await joinCoupleByInvite(inviteToken, userId)
      if (joined.ok) {
        router.push(`/couple-chat?room=${joined.roomId}`)
        return
      }
      // 연결 실패해도 로그인은 됐으니 기존 흐름(홈)으로 폴백
    }

    // 등급과 무관하게 신버전 홈으로. 상담사·관리자 화면은 마이페이지에서 진입.
    router.push('/home-new')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !pw) { setError('이메일과 비밀번호를 입력해주세요.'); return }
    if (!email.includes('@')) { setError('올바른 이메일 형식을 입력해주세요.'); return }
    setError('')
    setLoading(true)
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (authError || !data.user) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }
    await routeAfterLogin(data.user.id)
  }

  const handleSocial = (provider: string) => {
    setError(`${provider} 로그인은 준비 중이에요. 이메일로 로그인해주세요.`)
  }

  const inputWrap: React.CSSProperties = {
    height: 50, background: '#fff', border: '0.5px solid #e8d5c5', borderRadius: 12,
    display: 'flex', alignItems: 'center', padding: '0 14px',
  }
  const inputStyle: React.CSSProperties = {
    flex: 1, border: 'none', outline: 'none', background: 'transparent',
    fontSize: 14, color: '#3a2e28', minWidth: 0,
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#FDF6F0', maxWidth: 430, margin: '0 auto',
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif", color: '#3a2e28',
    }}>
      <style>{`
        @keyframes mcCupSway { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
        @keyframes mcSteamA { 0% { opacity:0; transform:translateY(0) scaleX(1);} 15%{opacity:0.6;} 50%{opacity:0.4; transform:translateY(-9px) scaleX(1.3);} 100%{opacity:0; transform:translateY(-18px) scaleX(0.8);} }
        @keyframes mcSteamB { 0% { opacity:0; transform:translateY(0) scaleX(1);} 20%{opacity:0.5;} 55%{opacity:0.3; transform:translateY(-10px) scaleX(1.4);} 100%{opacity:0; transform:translateY(-20px) scaleX(0.7);} }
        .mc-cup { animation: mcCupSway 3.5s ease-in-out infinite; transform-origin: bottom center; }
        .mc-steam-a { animation: mcSteamA 2.8s ease-out infinite; }
        .mc-steam-b { animation: mcSteamB 2.8s ease-out infinite 0.9s; }
        .mc-steam-c { animation: mcSteamA 2.8s ease-out infinite 1.6s; }
      `}</style>
      {/* 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '14px 18px',
        background: '#FFFBF7', borderBottom: '0.5px solid #f0e0d5',
      }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#b4785a', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>←</button>
      </div>

      <div style={{ padding: '36px 24px 24px' }}>

        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 12 }}>
            <svg width="38" height="42" viewBox="0 0 46 50" style={{ overflow: 'visible' }}>
              <g>
                <path className="mc-steam-a" d="M16 14 q-3 -5 0 -10 q3 -5 0 -10" stroke="#c8a890" strokeWidth="2" fill="none" strokeLinecap="round" transform="translate(0,2)" />
                <path className="mc-steam-b" d="M23 13 q-3 -5 0 -10 q3 -5 0 -10" stroke="#c8a890" strokeWidth="2" fill="none" strokeLinecap="round" transform="translate(0,2)" />
                <path className="mc-steam-c" d="M30 14 q-3 -5 0 -10 q3 -5 0 -10" stroke="#c8a890" strokeWidth="2" fill="none" strokeLinecap="round" transform="translate(0,2)" />
              </g>
              <g className="mc-cup">
                <path d="M8 20 L38 20 L36 40 Q35 45 30 45 L16 45 Q11 45 10 40 Z" fill="#b46e46" />
                <path d="M8 20 L38 20 L37.5 24 L8.5 24 Z" fill="#c8783c" />
                <path d="M38 24 Q45 24 45 30 Q45 36 38 36 L37 32 Q41 32 41 30 Q41 28 37.5 28 Z" fill="#b46e46" />
                <ellipse cx="23" cy="21" rx="14" ry="2.5" fill="#96502e" />
              </g>
            </svg>
            <span style={{ fontSize: 23, fontWeight: 900, fontStyle: 'italic' }}>
              <span style={{ color: '#96502e' }}>Myung</span><span style={{ color: '#b46e46' }}>Cafe</span>
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#b4785a' }}>다시 오신 걸 환영해요 ✦</div>
        </div>

        <form onSubmit={handleLogin}>
          {/* 이메일 */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#b4785a', marginBottom: 6 }}>이메일</div>
            <div style={inputWrap}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com" style={inputStyle} autoComplete="email" />
            </div>
          </div>

          {/* 비밀번호 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#b4785a', marginBottom: 6 }}>비밀번호</div>
            <div style={inputWrap}>
              <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)}
                placeholder="비밀번호 입력" style={inputStyle} autoComplete="current-password" />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ background: 'none', border: 'none', color: '#c0a898', cursor: 'pointer', fontSize: 15 }}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* 로그인 유지 / 비번찾기 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#b4785a', cursor: 'pointer' }}>
              <input type="checkbox" checked={keepLogin} onChange={e => setKeepLogin(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: '#b46e46' }} />
              로그인 유지
            </label>
            <button type="button" style={{ background: 'none', border: 'none', fontSize: 12, color: '#b4785a', cursor: 'pointer' }}>비밀번호 찾기</button>
          </div>

          {error && <div style={{ color: '#c05a5a', fontSize: 12, marginBottom: 14, textAlign: 'center' }}>{error}</div>}

          {/* 로그인 버튼 */}
          <button type="submit" disabled={loading}
            style={{
              width: '100%', height: 52, background: '#b46e46', border: 'none', borderRadius: 14,
              color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              marginBottom: 22, opacity: loading ? 0.6 : 1,
            }}>
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>

        {/* 구분선 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, height: '0.5px', background: '#e8d5c5' }} />
          <span style={{ fontSize: 11, color: '#c0a898' }}>간편하게 로그인</span>
          <div style={{ flex: 1, height: '0.5px', background: '#e8d5c5' }} />
        </div>

        {/* 소셜 (준비중) */}
        <button onClick={() => handleSocial('카카오')}
          style={{ width: '100%', height: 50, background: '#FEE500', border: 'none', borderRadius: 14, color: '#3C1E1E', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>💬 카카오로 로그인</button>
        <button onClick={() => handleSocial('네이버')}
          style={{ width: '100%', height: 50, background: '#03C75A', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>Ｎ 네이버로 로그인</button>
        <button onClick={() => handleSocial('구글')}
          style={{ width: '100%', height: 50, background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: 14, color: '#333', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 8 }}>Ｇ 구글로 로그인</button>
        <div style={{ textAlign: 'center', fontSize: 10, color: '#c0a898', marginBottom: 26 }}>소셜 로그인은 준비 중이에요</div>

        {/* 회원가입 링크 */}
        <div style={{ textAlign: 'center', fontSize: 13, color: '#8a7868', paddingTop: 18, borderTop: '0.5px solid #f0e0d5' }}>
          아직 회원이 아니신가요?{' '}
          <span onClick={() => router.push('/signup')} style={{ color: '#c8783c', fontWeight: 600, cursor: 'pointer' }}>회원가입</span>
        </div>

      </div>
    </div>
  )
}
