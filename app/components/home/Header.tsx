'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Header() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string; nickname?: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser({
          email: data.user.email,
          nickname: data.user.user_metadata?.nickname || data.user.email?.split('@')[0],
        })
        const { data: consultant } = await supabase
          .from('consultants')
          .select('id')
          .eq('email', data.user.email)
          .single()
        if (consultant) {
          router.push(`/manseryeok/consultant?consultantId=${consultant.id}`)
        }
      }
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.refresh()
  }

  return (
    <header className="fixed top-0 z-50 flex items-center justify-between px-5 py-4"
      style={{ background: 'rgba(44,44,42,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)', width: '100%',
        maxWidth: '430px', left: '50%', transform: 'translateX(-50%)' }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #3C3489, #FAC775)' }}>명</div>
        <span className="text-lg font-bold tracking-wider" style={{ color: '#FAC775' }}>명연재연구소</span>
      </div>
      {user ? (
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: '#FAC775' }}>{user.nickname}</span>
          <button onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-full border font-medium"
            style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#8a88a0' }}>
            로그아웃
          </button>
        </div>
      ) : (
        <Link href="/auth/login">
          <button className="text-sm px-4 py-1.5 rounded-full border font-medium"
            style={{ borderColor: '#FAC775', color: '#FAC775' }}>
            로그인
          </button>
        </Link>
      )}
    </header>
  )
}
