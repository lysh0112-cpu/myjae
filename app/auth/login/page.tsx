'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') || 'customer'
  const isConsultant = type === 'consultant'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }
    if (isConsultant) {
      const { data: consultant } = await supabase
        .from('consultants').select('id').eq('email', email).single()
      if (consultant) {
        router.push(`/manseryeok/consultant?consultantId=${consultant.id}`)
      } else {
        setError('상담사 계정이 아닙니다.')
        setLoading(false)
      }
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#1a1a18' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#FAC775' }}>명연재</h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {isConsultant ? '🔮 상담사 로그인' : '👤 일반 고객 로그인'}
          </p>
        </div>
        <div className="rounded-2xl p-8"
          style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.08)' }}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>이메일</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}
                placeholder="example@email.com" />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>비밀번호</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}
                placeholder="비밀번호 입력" />
            </div>
            {error && <p className="text-sm" style={{ color: '#ff8080' }}>{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #FAC775, #f0a030)', color: '#1a1a18' }}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
          <button onClick={() => router.back()}
            className="w-full mt-3 py-3 rounded-xl text-sm"
            style={{ color: '#8a88a0' }}>
            ← 돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
