'use client'
import { useState } from 'react'
import ConsultantManager from './components/ConsultantManager'
import SettlementManager from './components/SettlementManager'
import ConsultationHistory from './components/ConsultationHistory'
import Dashboard from './components/Dashboard'
import KnowledgeManager from './components/KnowledgeManager'
import SiteSettings from './components/SiteSettings'

type Tab = 'dashboard' | 'consultant' | 'settlement' | 'history' | 'knowledge' | 'settings'

const TABS = [
  { key: 'dashboard', label: '📊 대시보드' },
  { key: 'consultant', label: '👤 상담사' },
  { key: 'settlement', label: '💰 정산' },
  { key: 'history', label: '📋 상담내역' },
  { key: 'knowledge', label: '🧠 지식관리' },
  { key: 'settings', label: '⚙️ 사이트설정' },
]

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  return (
    <div className="min-h-screen" style={{ background: '#1a1a18', maxWidth: '430px', margin: '0 auto' }}>
      <header className="fixed top-0 z-50 px-4 py-3 w-full"
        style={{ background: 'rgba(26,26,24,0.97)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)', maxWidth: '430px', left: '50%', transform: 'translateX(-50%)' }}>
        <div className="text-sm font-bold text-white text-center mb-3">🔐 관리자 페이지</div>
        <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as Tab)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={tab === t.key
                ? { background: 'rgba(250,199,117,0.3)', color: '#FAC775', border: '1px solid rgba(250,199,117,0.4)' }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <main className="pt-32 pb-10 px-4">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'consultant' && <ConsultantManager />}
        {tab === 'settlement' && <SettlementManager />}
        {tab === 'history' && <ConsultationHistory />}
        {tab === 'knowledge' && <KnowledgeManager />}
        {tab === 'settings' && <SiteSettings />}
      </main>
    </div>
  )
}
