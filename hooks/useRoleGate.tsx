'use client'

// ============================================================================
// 화면 접근 권한 확인 (2026-07-21 신설)
//
// [왜 만들었나]
//   /admin 과 /manseryeok/consultant 는 지금까지 role 을 전혀 보지 않아
//   URL 만 알면 누구나 들어올 수 있었다. (개발 편의로 미뤄 두었던 것)
//
// [쓰는 법]
//   const gate = useRoleGate(['master'])                 // 매니저만
//   const gate = useRoleGate(['master', 'consultant'])   // 직원 (상담사 포함)
//
//   if (gate.state !== 'ok') return <RoleGateScreen gate={gate} />
//
// [원칙]
//   확인에 실패하면 "막는 쪽"으로 처리한다.
//   보안 검사는 실패했을 때 통과시키면 안 된다.
// ============================================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export type AppRole = 'master' | 'consultant' | 'customer'

export interface RoleGate {
  state: 'checking' | 'ok' | 'denied'
  /** 확인된 내 등급 (denied 일 때도 알 수 있으면 담는다) */
  role: AppRole | null
  /** 로그인 자체를 안 한 상태인지 */
  loggedOut: boolean
  nickname: string
}

export function useRoleGate(allowed: AppRole[]): RoleGate {
  const [gate, setGate] = useState<RoleGate>({
    state: 'checking', role: null, loggedOut: false, nickname: '',
  })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!mounted) return
        if (!user) {
          setGate({ state: 'denied', role: null, loggedOut: true, nickname: '' })
          return
        }
        const { data } = await supabase
          .from('profiles')
          .select('nickname, role')
          .eq('id', user.id)
          .maybeSingle()
        if (!mounted) return

        const role = (data?.role ?? 'customer') as AppRole
        const nickname = data?.nickname ?? ''
        const ok = allowed.includes(role)
        setGate({ state: ok ? 'ok' : 'denied', role, loggedOut: false, nickname })
      } catch {
        if (mounted) {
          setGate({ state: 'denied', role: null, loggedOut: false, nickname: '' })
        }
      }
    })()
    return () => { mounted = false }
    // allowed 는 호출부에서 리터럴 배열로 넘기므로 매 렌더 새 배열이다.
    //   내용으로 비교해 불필요한 재확인을 막는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed.join(',')])

  return gate
}

// ----------------------------------------------------------------------------
// 안내 화면 — 확인 중 / 권한 없음
// ----------------------------------------------------------------------------

export function RoleGateScreen({ gate, dark = true }: { gate: RoleGate; dark?: boolean }) {
  const router = useRouter()
  const bg = dark ? '#1a1a18' : '#FDF6F0'
  const title = dark ? '#FAC775' : '#96502e'
  const body = dark ? '#8888aa' : '#5c3a1e'

  if (gate.state === 'checking') {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, color: body }}>확인 중…</span>
      </div>
    )
  }

  const btn = (label: string, href: string, primary = false): React.ReactElement => (
    <button type="button" onClick={() => router.push(href)}
      style={{
        fontSize: 12, padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
        fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none',
        touchAction: 'manipulation',
        border: primary
          ? (dark ? '1px solid rgba(250,199,117,0.4)' : '0.5px solid #f5d5b8')
          : (dark ? '1px solid rgba(255,255,255,0.15)' : '0.5px solid #f0e0d5'),
        background: primary
          ? (dark ? 'rgba(250,199,117,0.12)' : '#FFFBF7')
          : 'transparent',
        color: primary ? title : body,
      }}>{label}</button>
  )

  return (
    <div style={{
      minHeight: '100vh', background: bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
    }}>
      <div style={{ fontSize: 15, color: title }}>
        {gate.loggedOut ? '로그인이 필요해요' : '이 화면은 접근 권한이 필요해요'}
      </div>
      <div style={{ fontSize: 12.5, color: body, textAlign: 'center', lineHeight: 1.9 }}>
        {gate.loggedOut
          ? <>먼저 로그인해 주세요.</>
          : gate.role === 'consultant'
            ? <>상담사는 상담사 화면을 이용하시면 돼요.</>
            : <>권한이 있는 계정으로 로그인해 주세요.</>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {gate.loggedOut && btn('로그인', '/login', true)}
        {gate.role === 'consultant' && btn('상담사 화면으로', '/manseryeok/consultant', true)}
        {btn('홈으로', '/')}
      </div>
    </div>
  )
}
