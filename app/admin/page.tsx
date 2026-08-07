'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ConsultantManager from './components/ConsultantManager'
import SettlementManager from './components/SettlementManager'
import Dashboard from './components/Dashboard'
import CancelledHistory from './components/CancelledHistory'
import KnowledgeManager from './components/KnowledgeManager'
import SiteSettings from './components/SiteSettings'
import AiErrorLog from './components/AiErrorLog'
import ReviewManager from './components/ReviewManager'
import InquiryManager from './components/InquiryManager'
import ExpenseManager from './components/ExpenseManager'
import ExpenseApproval from './components/ExpenseApproval'
import MemberManager from './components/MemberManager'
import ToneManager from './components/ToneManager'
import PromptViewer from './components/PromptViewer'
import PriceManager from './components/PriceManager'
import { useRoleGate, RoleGateScreen, type AppRole } from '@/hooks/useRoleGate'

// 이 화면에 들어올 수 있는 등급 — 매니저만
const ADMIN_ROLES: AppRole[] = ['master']

type Tab = 'dashboard' | 'cancelled' | 'consultant' | 'price' | 'member' | 'settlement' | 'knowledge' | 'review' | 'inquiry' | 'accounting' | 'approval' | 'tone' | 'prompt' | 'aierror' | 'settings'
const TABS = [
  { key: 'dashboard', label: '📊 대시보드' },
  { key: 'cancelled', label: '🗑 취소 내역' },
  { key: 'consultant', label: '👤 상담사 관리' },
  { key: 'price', label: '💰 가격 관리' },
  { key: 'member', label: '👥 회원 관리' },
  { key: 'settlement', label: '💰 정산 관리' },
  { key: 'knowledge', label: '🧠 연구 자료' },
  { key: 'review', label: '📝 후기 관리' },
  // ★48부 8차 — 문의 관리 [대표님 「관리자 화면에 문의관리탭도 별도로」]
  { key: 'inquiry', label: '💬 문의 관리' },
  { key: 'accounting', label: '💳 관리회계' },
  { key: 'approval', label: '🧾 지출결의서' },
  { key: 'tone', label: '💬 어투 관리' },
  { key: 'prompt', label: '🔍 AI 통변 구조' },
  { key: 'aierror', label: '🚨 AI 오류' },
  { key: 'settings', label: '⚙️ 사이트 설정' },
]
export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('dashboard')

  // ══════════════════════════════════════════════════════════════════
  //  ★2026-08-07 (48부 10차) — 주소로 «탭을 가리켜» 열 수 있습니다 [대표님 지시]
  //    「관리자화면으로 돌아가기를 누르면 ★상담사관리 화면으로 바로 가게」
  //
  //  ★쓰는 법 — /admin#consultant  ·  /admin#inquiry  …
  //     TABS 의 key 를 그대로 씁니다.
  //
  //  ⚠️ ★«물음표(?tab=)» 가 아니라 «우물정(#)» 을 쓴 까닭 —
  //     Next 의 «검색어 훅» 을 쓰면 ★Suspense 로 감싸라고 요구해
  //     이 화면을 통째로 손봐야 합니다. 해시는 그럴 필요가 없습니다.
  //  ⚠️⚠️ ★그 훅의 «이름» 을 주석에 적지 마십시오 —
  //     검사 ⑯이 «주석까지» 읽어 「쓰면서 안 감쌌다」며 ★실패로 잡습니다.
  //     (47부 9-1 「옛 줄을 주석으로 남기지 마십시오」와 같은 자리입니다)
  //
  //  ⚠️ ★useEffect 를 «안» 씁니다 — 안에서 setState 를 부르면
  //     react-hooks 가 «오류» 로 잡아 기준선이 깨집니다 (47부 1-7).
  //     ⇒ ★«그릴 때» 한 번만 견줍니다.
  //  ⛔ useEffect 로 바꾸지 마십시오.
  // ══════════════════════════════════════════════════════════════════
  const [hashRead, setHashRead] = useState(false)
  if (!hashRead && typeof window !== 'undefined') {
    setHashRead(true)
    const h = window.location.hash.replace('#', '')
    if (h && TABS.some(t => t.key === h)) setTab(h as Tab)
  }
  // ★권한 확인 (2026-07-21)
  //   이 화면은 지금까지 role 을 전혀 보지 않아 URL 만 알면 누구나 들어왔다.
  const gate = useRoleGate(ADMIN_ROLES)
  const adminName = gate.nickname

  const handleLogout = async () => {
    if (!confirm('로그아웃 할까요?')) return
    try {
      await supabase.auth.signOut()
    } catch {
      // 무시
    }
    router.push('/')
  }

  // 매니저가 아니면 화면 자체를 그리지 않는다
  if (gate.state !== 'ok') return <RoleGateScreen gate={gate} />

  return (
    <div className="min-h-screen" style={{ background: '#1a1a18' }}>
      {/* sticky로 둔다. fixed면 탭이 두 줄이 될 때 아래 본문을 덮어버린다.
          (2026-07-20 "AI 오류" 탭을 늘리면서 제목이 가려지는 일이 있었음) */}
      <header className="sticky top-0 z-50 w-full"
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
              <button key={t.key}
                onClick={() => {
                  setTab(t.key as Tab)
                  // ★48부 10차 — 주소도 함께 바꿉니다.
                  //   ⇒ 새로고침하거나 즐겨찾기로 와도 «그 탭» 이 열립니다.
                  if (typeof window !== 'undefined') {
                    window.history.replaceState(null, '', `#${t.key}`)
                  }
                }}
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
      <main className="max-w-7xl mx-auto px-6 pt-6 pb-10">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'cancelled' && <CancelledHistory />}
        {tab === 'consultant' && <ConsultantManager />}
        {tab === 'price' && <PriceManager />}
        {tab === 'member' && <MemberManager />}
        {tab === 'settlement' && <SettlementManager />}
        {tab === 'knowledge' && <KnowledgeManager />}
        {tab === 'review' && <ReviewManager />}
        {tab === 'inquiry' && <InquiryManager />}
        {tab === 'accounting' && <ExpenseManager />}
        {tab === 'approval' && <ExpenseApproval />}
        {tab === 'tone' && <ToneManager />}
        {tab === 'prompt' && <PromptViewer />}
        {tab === 'aierror' && <AiErrorLog />}
        {tab === 'settings' && <SiteSettings />}
      </main>
    </div>
  )
}
