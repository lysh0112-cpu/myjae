'use client'
import Link from 'next/link'

export default function ConsultantHeader({
  tab,
  setTab,
  consultationId,
  customerPhone,
}: {
  tab: 'saju' | 'chat'
  setTab: (t: 'saju' | 'chat') => void
  consultationId: string | null
  customerPhone: string
}) {
  return (
    <header className="fixed top-0 z-50 flex items-center justify-between px-4 py-4"
      style={{background:'rgba(26,26,24,0.97)', backdropFilter:'blur(12px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        width:'100%', maxWidth:'430px', left:'50%', transform:'translateX(-50%)'}}>
      <Link href="/manseryeok">
        <button className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{background:'rgba(255,255,255,0.06)'}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </Link>
      <div className="text-center">
        <div className="text-sm font-bold text-white">전문가 분석 화면</div>
        {consultationId && (
          <div className="text-xs mt-0.5" style={{color:'#4caf50'}}>
            ● {customerPhone} 연결됨
          </div>
        )}
      </div>
      <div className="flex rounded-xl overflow-hidden"
        style={{border:'1px solid rgba(255,255,255,0.15)'}}>
        <button onClick={() => setTab('saju')}
          className="px-3 py-1.5 text-xs font-bold transition-all"
          style={tab==='saju'
            ? {background:'rgba(250,199,117,0.3)', color:'#FAC775'}
            : {background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.5)'}}>
          사주
        </button>
        <button onClick={() => setTab('chat')}
          className="px-3 py-1.5 text-xs font-bold transition-all"
          style={tab==='chat'
            ? {background:'rgba(250,199,117,0.3)', color:'#FAC775'}
            : {background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.5)'}}>
          채팅
        </button>
      </div>
    </header>
  )
}
