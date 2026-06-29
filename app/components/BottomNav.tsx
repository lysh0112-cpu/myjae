'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LoginSheet from './BottomNav/LoginSheet'
import { NAV_TABS } from './BottomNav/navData'
function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const c = active ? '#FAC775' : '#8a88a0'
  if (icon === 'home') return <svg viewBox="0 0 24 24" fill={c} className="w-6 h-6"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
  if (icon === 'grid') return <svg viewBox="0 0 24 24" fill={c} className="w-6 h-6"><path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/></svg>
  if (icon === 'heart') return <svg viewBox="0 0 24 24" fill={c} className="w-6 h-6"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
  if (icon === 'user') return <svg viewBox="0 0 24 24" fill={c} className="w-6 h-6"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
  // 마이페이지 전용: 채워진 원 안에 사람 (프로필)
  if (icon === 'profile') return (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <circle cx="12" cy="12" r="11" fill={c} />
      <circle cx="12" cy="9.5" r="3.2" fill="#2C2C2A" />
      <path d="M6 18.5 q0 -5.5 6 -5.5 q6 0 6 5.5 z" fill="#2C2C2A" />
    </svg>
  )
  if (icon === 'logout') return <svg viewBox="0 0 24 24" fill={c} className="w-6 h-6"><path d="M16 13v-2H7V8l-5 4 5 4v-3zM20 3h-9c-1.1 0-2 .9-2 2v4h2V5h9v14h-9v-4H9v4c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
  if (icon === 'coin') return <svg viewBox="0 0 24 24" fill={c} className="w-6 h-6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
  return null
}
export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [showLogin, setShowLogin] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // 로그인 상태 확인
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
    })
    // 로그인/로그아웃 변화 감지
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user)
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  const handleLogout = async () => {
    if (!confirm('로그아웃 할까요?')) return
    await supabase.auth.signOut()
    // 공용기기 대비: 브라우저에 남는 모든 흔적(사주·작명·궁합·분석 등) 완전 삭제
    try {
      sessionStorage.clear()
      localStorage.clear()
    } catch {}
    setIsLoggedIn(false)
    // 홈을 통째로 새로 불러와 화면에 남은 정보까지 초기화
    window.location.href = '/'
  }

  return (
    <>
      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
      <nav className="fixed bottom-0 z-50 flex items-stretch"
        style={{ background: '#2C2C2A', borderTop: '1px solid rgba(255,255,255,0.08)',
          width: '100%', maxWidth: '430px', left: '50%', transform: 'translateX(-50%)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {NAV_TABS.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          const isAuthTab = tab.icon === 'user'
          const isMyPage = tab.href === '/mypage'

          // 로그인 탭은 상태에 따라 반전
          const displayLabel = isAuthTab ? (isLoggedIn ? '로그아웃' : '로그인') : tab.label
          const displayIcon = isAuthTab ? (isLoggedIn ? 'logout' : 'user') : tab.icon

          const inner = (
            <div className="flex flex-col items-center justify-center gap-1 py-3 relative w-full"
              style={{ color: active ? '#FAC775' : '#8a88a0' }}>
              {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ background: '#FAC775' }} />}
              <NavIcon icon={displayIcon} active={active} />
              <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400 }}>{displayLabel}</span>
            </div>
          )

          // 로그인/로그아웃 버튼
          if (isAuthTab) {
            return (
              <button key={tab.href} className="flex-1"
                onClick={() => isLoggedIn ? handleLogout() : setShowLogin(true)}>
                {inner}
              </button>
            )
          }

          // 마이페이지: 무조건 마이페이지로 이동 (로그인 여부는 마이페이지가 처리)
          if (isMyPage) {
            return (
              <Link key={tab.href} href="/mypage" className="flex-1">{inner}</Link>
            )
          }

          return (
            <Link key={tab.href} href={tab.href} className="flex-1">{inner}</Link>
          )
        })}
      </nav>
    </>
  )
}
