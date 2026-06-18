'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
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

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
            <div className="text-4xl mb-4">✉️</div>
            <h2 className="text-xl font-semibold text-white mb-2">이메일을 확인해주세요</h2>
            <p className="text-gray-400 text-sm">
              {email} 로 인증 메일을 보냈어요.<br />
              메일 확인 후 로그인해주세요.
            </p>
            <Link
              href="/auth/login"
              className="mt-6 inline-block bg-amber-400 text-gray-950 font-semibold rounded-lg px-6 py-3 hover:bg-amber-300 transition"
            >
              로그인 하러 가기
            </Link>
          </div>
        </div>
      </div>
    )
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
              <label className="block text-sm text-gray-400 mb-1">이메일</label>
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-amber-400 focus:outline-none"
                placeholder="6자 이상"
              />
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
