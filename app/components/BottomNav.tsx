'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LoginSheet from './BottomNav/LoginSheet'
import { NAV_TABS } from './BottomNav/navData'

function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const c = active ? '#FAC775' : '#8a88a0'
  if (icon === 'home') return <svg viewBox="0 0 24 24" fill={c} className="w-6 h-6"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
  if (icon === 'grid') return <svg viewBox="0 0 24 24" fill={c} className="w-6 h-6"><path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/></svg>
  if (icon === 'user') return <svg viewBox="0 0 24 24" fill={c} className="w-6 h-6"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
  if (icon === 'coin') return <svg viewBox="0 0 24 24" fill={c} className="w-6 h-6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
  return null
}

export default function BottomNav() {
  const pathname = usePathname()
  const [showLogin, setShowLogin] = useState(false)

  return (
    <>
      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
      <nav className="fixed bottom-0 z-50 flex items-stretch"
        style={{ background: '#2C2C2A', borderTop: '1px solid rgba(255,255,255,0.08)',
          width: '100%', maxWidth: '430px', left: '50%', transform: 'translateX(-50%)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {NAV_TABS.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          const isLogin = tab.icon === 'user'
          const inner = (
            <div className="flex flex-col items-center justify-center gap-1 py-3 relative w-full"
              style={{ color: active ? '#FAC775' : '#8a88a0' }}>
              {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ background: '#FAC775' }} />}
              <NavIcon icon={tab.icon} active={active} />
              <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400 }}>{tab.label}</span>
            </div>
          )
          return isLogin ? (
            <button key={tab.href} className="flex-1" onClick={() => setShowLogin(true)}>{inner}</button>
          ) : (
            <Link key={tab.href} href={tab.href} className="flex-1">{inner}</Link>
          )
        })}
      </nav>
    </>
  )
}
