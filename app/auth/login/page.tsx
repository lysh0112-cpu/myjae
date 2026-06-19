'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }

    // 상담사 여부 확인
    const { data: consultant } = await supabase
      .from('consultants')
      .select('id')
      .eq('phone', data.user?.user_metadata?.phone || '')
      .single()

    // 이메일로도 확인 (상담사 테이블에 이메일 컬럼 추가 전까지 임시로 이름으로 확인)
    const { data: consultantByEmail } = await supabase
      .from('consultants')
      .select('id')
      .eq('phone', email.split('@')[0])
      .single()

    if (consultant || consultantByEmail) {
      // 상담사 → 4화면으로 이동
      router.push('/manseryeok/consultant')
    } else {
      // 일반 고객 → 홈으로 이동
      router.push('/')
    }
    router.refresh()
  }

  const handleKakaoLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'profile_nickname profile_image',
      },
    })
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-400">명연재</h1>
          <p className="text-gray-400 mt-2">명리 학습·상담 통합 플랫폼</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-6">로그인</h2>

          <button
            onClick={handleKakaoLogin}
            className="w-full flex items-center justify-center gap-3 bg-[#FEE500] text-[#191919] font-semibold rounded-lg py-3 hover:bg-[#F0D900] transition mb-4"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C7.03 3 3 6.36 3 10.5c0 2.64 1.67 4.96 4.2 6.33l-.87 3.2a.3.3 0 0 0 .44.33L10.5 18.1A10.6 10.6 0 0 0 12 18c4.97 0 9-3.36 9-7.5S16.97 3 12 3z" fill="#191919"/>
            </svg>
            카카오로 시작하기
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-700"/>
            <span className="text-gray-500 text-sm">또는</span>
            <div className="flex-1 h-px bg-gray-700"/>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-amber-400 focus:outline-none"
                placeholder="비밀번호 입력"
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
              {loading ? '로그인 중...' : '이메일로 로그인'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            아직 회원이 아니신가요?{' '}
            <Link href="/auth/signup" className="text-amber-400 hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
