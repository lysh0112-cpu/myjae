'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ConsultantManager from './components/ConsultantManager'
import SettlementManager from './components/SettlementManager'
import Dashboard from './components/Dashboard'
import KnowledgeManager from './components/KnowledgeManager'
import SiteSettings from './components/SiteSettings'
import ReviewManager from './components/ReviewManager'
import ExpenseManager from './components/ExpenseManager'
import ExpenseApproval from './components/ExpenseApproval'
import MemberManager from './components/MemberManager'
import ToneManager from './components/ToneManager'
import PriceManager from './components/PriceManager'
type Tab = 'dashboard' | 'consultant' | 'price' | 'member' | 'settlement' | 'knowledge' | 'review' | 'accounting' | 'approval' | 'tone' | 'settings'
const TABS = [
  { key: 'dashboard', label: '📊 대시보드' },
  { key: 'consultant', label: '👤 상담사 관리' },
  { key: 'price', label: '💰 가격 관리' },
  { key: 'member', label: '👥 회원 관리' },
  { key: 'settlement', label: '💰 정산 관리' },
  { key: 'knowledge', label: '🧠 연구 자료' },
  { key: 'review', label: '📝 후기 관리' },
  { key: 'accounting', label: '💳 관리회계' },
  { key: 'approval', label: '🧾 지출결의서' },
  { key: 'tone', label: '💬 어투 관리' },
  { key: 'settings', label: '⚙️ 사이트 설정' },
]
export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [adminName, setAdminName] = useState<string>('')

  useEffect(() => {
    let mounted = true
    async function loadAdmin() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', user.id)
          .maybeSingle()
        if (mounted && data?.nickname) setAdminName(data.nickname)
      } catch {
        // 무시 (이름 표시는 부가 기능이므로 실패해도 화면은 정상)
      }
    }
    loadAdmin()
    return () => { mounted = false }
  }, [])

  const handleLogout = async () => {
    if (!confirm('로그아웃 할까요?')) return
    try {
      await supabase.auth.signOut()
    } catch {
      // 무시
    }
    router.push('/')
  }

  return (
    <div className="min-h-screen" style={{ background: '#1a1a18' }}>
      <header className="fixed top-0 z-50 w-full"
        style={{ background: 'rgba(26,26,24,0.97)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-6">
          <div className="whitespace-nowrap">
            <div className="text-base font-bold" style={{ color: '#FAC775' }}>
              🔐 명카페 관리자
            </div>
            {adminName && (
              <div className="text-xs font-bold mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                👤 {adminName} 님
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
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
          <button onClick={handleLogout}
            className="ml-auto px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
            style={{ background: 'rgba(255,80,80,0.12)', color: '#ff8080', border: '1px solid rgba(255,80,80,0.4)' }}>
            로그아웃
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-10">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'consultant' && <ConsultantManager />}
        {tab === 'price' && <PriceManager />}
        {tab === 'member' && <MemberManager />}
        {tab === 'settlement' && <SettlementManager />}
        {tab === 'knowledge' && <KnowledgeManager />}
        {tab === 'review' && <ReviewManager />}
        {tab === 'accounting' && <ExpenseManager />}
        {tab === 'approval' && <ExpenseApproval />}
        {tab === 'tone' && <ToneManager />}
        {tab === 'settings' && <SiteSettings />}
      </main>
    </div>
  )
}
