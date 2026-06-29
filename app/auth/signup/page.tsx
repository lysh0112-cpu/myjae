'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showPw2, setShowPw2] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 비밀번호 확인
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않아요. 다시 확인해주세요.')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상으로 정해주세요.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname },
      },
    })

    if (error) {
      setError('회원가입 중 오류가 발생했습니다: ' + error.message)
      setLoading(false)
      return
    }

    // 가입 성공 → 환영 화면(닉네임·약관 동의)으로
    router.push('/auth/welcome')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-400">명연재</h1>
          <p className="text-gray-400 mt-2">명리 학습·상담 통합 플랫폼</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-6">회원가입</h2>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">닉네임</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-amber-400 focus:outline-none"
                placeholder="사용할 닉네임"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">이메일 (아이디로 사용돼요)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-amber-400 focus:outline-none"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">비밀번호</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 pr-12 border border-gray-700 focus:border-amber-400 focus:outline-none"
                  placeholder="6자 이상"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
                  aria-label="비밀번호 보기"
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="text-xs mt-1.5 px-1" style={{ color: '#FAC775' }}>
                💡 이 비밀번호는 명연재 전용이에요. 실제 이메일 비밀번호와 달라도 괜찮아요!
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">비밀번호 확인</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw2 ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 pr-12 border border-gray-700 focus:border-amber-400 focus:outline-none"
                  placeholder="비밀번호를 한 번 더 입력해주세요"
                />
                <button
                  type="button"
                  onClick={() => setShowPw2(!showPw2)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
                  aria-label="비밀번호 확인 보기"
                >
                  {showPw2 ? '🙈' : '👁️'}
                </button>
              </div>
              {passwordConfirm.length > 0 && password !== passwordConfirm && (
                <p className="text-xs mt-1.5 px-1" style={{ color: '#ff8080' }}>
                  비밀번호가 일치하지 않아요.
                </p>
              )}
              {passwordConfirm.length > 0 && password === passwordConfirm && (
                <p className="text-xs mt-1.5 px-1" style={{ color: '#7ee787' }}>
                  ✓ 비밀번호가 일치해요.
                </p>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-400 text-gray-950 font-semibold rounded-lg py-3 hover:bg-amber-300 transition disabled:opacity-50"
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            이미 회원이신가요?{' '}
            <Link href="/auth/login" className="text-amber-400 hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
