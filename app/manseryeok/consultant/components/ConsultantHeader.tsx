'use client'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ConsultantHeader({
  tab,
  setTab,
  consultationId,
  customerPhone,
  onGoToChat,
}: {
  tab: 'saju' | 'chat'
  setTab: (t: 'saju' | 'chat') => void
  consultationId: string | null
  customerPhone: string
  onGoToChat?: () => void
}) {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <header className="fixed top-0 z-50 flex items-center justify-between px-4 py-3"
      style={{background:'rgba(26,26,24,0.97)', backdropFilter:'blur(12px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        width:'100%', maxWidth:'430px', left:'50%', transform:'translateX(-50%)'}}>
      <button onClick={handleLogout}
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{background:'rgba(255,255,255,0.06)'}}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div className="text-center">
        <div className="text-sm font-bold text-white">전문가 분석 화면</div>
        {consultationId && (
          <div className="text-xs mt-0.5" style={{color:'#4caf50'}}>
            ● {customerPhone} 연결됨
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {consultationId && tab === 'saju' && onGoToChat && (
          <button onClick={onGoToChat}
            className="text-xs px-2 py-1.5 rounded-xl font-semibold"
            style={{background:'rgba(250,199,117,0.15)', color:'#FAC775', border:'1px solid rgba(250,199,117,0.3)'}}>
            💬
          </button>
        )}
        <div className="flex rounded-xl overflow-hidden"
          style={{border:'1px solid rgba(255,255,255,0.15)'}}>
          <button onClick={() => setTab('saju')}
            className="px-2.5 py-1.5 text-xs font-bold transition-all"
            style={tab==='saju'
              ? {background:'rgba(250,199,117,0.3)', color:'#FAC775'}
              : {background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.5)'}}>
            사주분석
          </button>
          <button onClick={() => setTab('chat')}
            className="px-2.5 py-1.5 text-xs font-bold transition-all"
            style={tab==='chat'
              ? {background:'rgba(250,199,117,0.3)', color:'#FAC775'}
              : {background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.5)'}}>
            상담목록
          </button>
        </div>
      </div>
    </header>
  )
}
