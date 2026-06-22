'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Header() {
  const router = useRouter()
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: consultant } = await supabase
          .from('consultants').select('id')
          .eq('email', data.user.email).single()
        if (consultant) {
          router.push(`/manseryeok/consultant?consultantId=${consultant.id}`)
        }
      }
    })
  }, [])

  return (
    <header className="fixed top-0 z-50 flex items-center justify-between px-5 py-4"
      style={{ background: 'rgba(44,44,42,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        width: '100%', maxWidth: '430px', left: '50%', transform: 'translateX(-50%)' }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #3C3489, #FAC775)' }}>명</div>
        <span className="text-lg font-bold tracking-wider" style={{ color: '#FAC775' }}>명연재연구소</span>
      </div>
    </header>
  )
}
