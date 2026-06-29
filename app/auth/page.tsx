'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  // 이미 로그인돼 있으면 분기 처리
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) routeAfterLogin(data.user.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 로그인 후 어디로 보낼지 결정
  const routeAfterLogin = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname, role, privacy_agreed')
      .eq('id', userId)
      .single()

    // 프로필 없거나 닉네임·동의 미완 → 최초 설정 화면으로
    if (!profile || !profile.nickname || !profile.privacy_agreed) {
      router.push('/auth/welcome')
      return
    }
    // 역할에 따라 분기
    if (profile.role === 'consultant' || profile.role === 'master') {
      router.push('/manseryeok/consultant')
    } else {
      router.push('/')
    }
  }

  const handleLogin = async () => {
    setMsg(''); setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setMsg('로그인 실패: ' + error.message); return }
    if (data.user) routeAfterLogin(data.user.id)
  }

  const handleSignup = async () => {
    setMsg(''); setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) { setMsg('가입 실패: ' + error.message); return }
    if (data.user) {
      // 가입 직후 바로 환영(닉네임·동의) 화면으로
      router.push('/auth/welcome')
    } else {
      setMsg('가입 확인 메일을 보냈어요. 메일을 확인해주세요.')
    }
  }

  const submit = () => {
    if (!email || !password) { setMsg('이메일과 비밀번호를 입력해주세요.'); return }
    if (mode === 'login') handleLogin()
    else handleSignup()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#FAC775', marginBottom: 6 }}>명연재 明然載</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            {mode === 'login' ? '로그인하고 시작하세요' : '회원가입'}
          </div>
        </div>

        {/* 로그인/가입 탭 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setMsg('') }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
                background: mode === m ? '#FAC775' : 'rgba(255,255,255,0.06)',
                color: mode === m ? '#1a1a18' : 'rgba(255,255,255,0.5)',
              }}>
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="이메일" style={inputStyle} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호 (6자 이상)" style={inputStyle}
            onKeyDown={e => { if (e.key === 'Enter') submit() }} />

          <button onClick={submit} disabled={loading}
            style={{ padding: '12px 0', borderRadius: 10, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: loading ? 0.6 : 1, marginTop: 4 }}>
            {loading ? '처리 중…' : (mode === 'login' ? '로그인' : '가입하기')}
          </button>
        </div>

        {msg && <div style={{ marginTop: 14, color: '#fca5a5', fontSize: 13, textAlign: 'center' }}>{msg}</div>}

        {/* 소셜 로그인 자리 (나중에 켜기) */}
        <div style={{ margin: '24px 0 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>간편 로그인 (준비 중)</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button disabled title="준비 중"
            style={{ padding: '11px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: 14, cursor: 'not-allowed' }}>
            구글로 시작하기 (준비 중)
          </button>
          <button disabled title="준비 중"
            style={{ padding: '11px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: 14, cursor: 'not-allowed' }}>
            카카오로 시작하기 (준비 중)
          </button>
        </div>
      </div>
    </div>
  )
} 

const inputStyle: React.CSSProperties = {
  padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 15, outline: 'none',
}
