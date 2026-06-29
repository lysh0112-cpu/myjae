'use client'
import { useState } from 'react'
import ConsultantManager from './components/ConsultantManager'
import SettlementManager from './components/SettlementManager'
import ConsultationHistory from './components/ConsultationHistory'
import Dashboard from './components/Dashboard'
import KnowledgeManager from './components/KnowledgeManager'
import SiteSettings from './components/SiteSettings'
import ReviewManager from './components/ReviewManager'
type Tab = 'dashboard' | 'consultant' | 'settlement' | 'history' | 'knowledge' | 'review' | 'settings'
const TABS = [
  { key: 'dashboard', label: '📊 대시보드' },
  { key: 'consultant', label: '👤 상담사 관리' },
  { key: 'settlement', label: '💰 정산 관리' },
  { key: 'history', label: '📋 상담 내역' },
  { key: 'knowledge', label: '🧠 연구 자료' },
  { key: 'review', label: '📝 후기 관리' },
  { key: 'settings', label: '⚙️ 사이트 설정' },
]
export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  return (
    <div className="min-h-screen" style={{ background: '#1a1a18' }}>
      <header className="fixed top-0 z-50 w-full"
        style={{ background: 'rgba(26,26,24,0.97)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-6">
          <div className="text-base font-bold whitespace-nowrap" style={{ color: '#FAC775' }}>
            🔐 명카페 관리자
          </div>
          <div className="flex gap-2">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key as Tab)}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                style={tab === t.key
                  ? { background: 'rgba(250,199,117,0.3)', color: '#FAC775', border: '1px solid rgba(250,199,117,0.4)' }
                  : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-10">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'consultant' && <ConsultantManager />}
        {tab === 'settlement' && <SettlementManager />}
        {tab === 'history' && <ConsultationHistory />}
        {tab === 'knowledge' && <KnowledgeManager />}
        {tab === 'review' && <ReviewManager />}
        {tab === 'settings' && <SiteSettings />}
      </main>
    </div>
  )
}
