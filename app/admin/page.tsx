'use client'

import { useState } from 'react'
import ConsultantManager from './components/ConsultantManager'
import SettlementManager from './components/SettlementManager'
import ConsultationHistory from './components/ConsultationHistory'

type Tab = 'consultant' | 'settlement' | 'history'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('consultant')

  const tabs = [
    { key: 'consultant', label: '상담사 관리' },
    { key: 'settlement', label: '정산 관리' },
    { key: 'history', label: '상담 내역' },
  ]

  return (
    <div className="min-h-screen" style={{background:'#1a1a18',maxWidth:'430px',margin:'0 auto'}}>
      {/* 헤더 */}
      <header className="fixed top-0 z-50 px-4 py-4 w-full"
        style={{background:'rgba(26,26,24,0.97)',backdropFilter:'blur(12px)',
          borderBottom:'1px solid rgba(255,255,255,0.06)',maxWidth:'430px',left:'50%',transform:'translateX(-50%)'}}>
        <div className="text-sm font-bold text-white text-center mb-3">관리자 페이지</div>
        {/* 탭 */}
        <div className="flex rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.1)'}}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as Tab)}
              className="flex-1 py-2 text-xs font-bold transition-all"
              style={tab === t.key
                ? {background:'rgba(250,199,117,0.3)',color:'#FAC775'}
                : {background:'rgba(255,255,255,0.03)',color:'rgba(255,255,255,0.4)'}}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="pt-28 pb-10 px-4">
        {tab === 'consultant' && <ConsultantManager />}
        {tab === 'settlement' && <SettlementManager />}
        {tab === 'history' && <ConsultationHistory />}
      </main>
    </div>
  )
}
