'use client'

// ══════════════════════════════════════════════════════════════════════
//  /login/review — ★PG 카드사 «심사관» 전용 이메일 로그인  (10부 · 2026-09-21)
//
//  ┌────────────────────────────────────────────────────────────────┐
//  │  [까닭]  토스페이먼츠 계약 메일 —                                │
//  │    「(비회원 구매 불가한 경우) 테스트계정 ID/PW :                 │
//  │      *★소셜 로그인 테스트 계정 사용 불가(카카오톡, 구글 등)」     │
//  │  ⇒ 우리는 ★카카오 로그인 «뿐» 이라 심사관이 들어올 길이 없습니다. │
//  │  ⇒ 이 화면 하나로 «한 번만» 들어오시게 합니다.                   │
//  └────────────────────────────────────────────────────────────────┘
//
//  🔴🔴 ★손님 화면 어디에도 «걸려 있지 않습니다».
//     홈에도, /login 에도, 하단바에도 이 주소로 가는 길이 ★한 곳도 없습니다.
//     ⇒ 주소를 아는 사람만 옵니다. 그 주소는 ★심사 메일로만 알려 드립니다.
//
//  🔴🔴 ★관리자 토글로 «열었다 닫았다» 합니다  [대표님 2026-09-21]
//     관리자 → 사이트 설정 → 「🔑 심사용 이메일 로그인」
//     ⛔ 꺼져 있으면 ★«없는 화면» 처럼 굽니다 — 칸도 단추도 안 그립니다.
//     ⛔ ★심사가 끝나면 반드시 «끄십시오».
//
//  ⚠️ ★막는 곳이 여기«만» 은 아닙니다 —
//     화면을 숨기는 것은 «막는 것이 아닙니다» (9부 ⑥).
//     진짜 막는 곳은 ★Supabase 의 Email 공급자입니다.
//     ⇒ 심사가 끝나면 ★Supabase 에서도 Email 을 끄시거나 그 계정을 지우십시오.
//     ⇒ 이 토글은 «문을 닫는» 것이고, 그쪽은 «자물쇠를 채우는» 것입니다.
//
//  ⛔ 여기에 ★회원가입·비밀번호 찾기를 붙이지 마십시오. 들어오는 길만 있습니다.
// ══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import CompanyFooter from '@/app/components/common/CompanyFooter'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchHomeFlags } from '@/lib/homeFlags'
import BrandLockup from '@/app/components/common/BrandLockup'

export default function ReviewLoginPage() {
  const router = useRouter()
  /** null = 아직 읽는 중 · false = 닫힘 · true = 열림 */
  const [open, setOpen] = useState<boolean | null>(null)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    //  ⛔ 못 읽으면 ★«닫힘» 입니다 (HOME_FLAGS_OFF)
    fetchHomeFlags().then(f => { if (alive) setOpen(f.reviewLogin) })
    return () => { alive = false }
  }, [])

  async function submit() {
    if (busy) return
    setError('')
    setBusy(true)
    const { error: e } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pw,
    })
    if (e) {
      setBusy(false)
      setError('로그인하지 못했습니다. 아이디와 비밀번호를 확인해 주세요.')
      return
    }
    /*  ⚠️ ★카카오와 달리 /auth/callback 을 «안 거칩니다».
     *     ⇒ profiles 줄이 없으면 홈이 빈 채로 뜹니다.
     *     ⇒ 여기서 «직접» 보고 없으면 ★/auth/welcome 으로 보냅니다. */
    const { data: me } = await supabase.auth.getUser()
    const uid = me.user?.id
    if (uid) {
      const { data: row } = await supabase
        .from('profiles').select('id').eq('id', uid).maybeSingle()
      if (!row) { router.replace('/auth/welcome'); return }
    }
    router.replace('/home-new')
  }

  //  ★읽는 중 — 빈 화면 (문이 «깜빡» 열려 보이지 않게)
  if (open === null) {
    return <div style={{ minHeight: '100vh', background: '#FDF6F0' }} />
  }

  /*  🔴 ⛔ ★닫혀 있으면 «없는 화면» 처럼 굽니다.
   *     칸도 단추도 그리지 않습니다. 「왜 안 되는지」 도 말하지 않습니다. */
  if (!open) {
    return (
      <div style={{
        minHeight: '100vh', background: '#FDF6F0', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 24,
        fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif",
      }}>
        <div style={{ textAlign: 'center', color: '#a8927e', fontSize: 14, lineHeight: 1.8 }}>
          찾으시는 화면이 없어요.
          <br />
          <button type="button" onClick={() => router.replace('/home-new')}
            style={{
              marginTop: 14, background: 'none', border: '0.5px solid #e0cdbb',
              borderRadius: 999, padding: '7px 16px', color: '#96502e',
              fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}>홈으로</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#FDF6F0', maxWidth: 430, margin: '0 auto',
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif", color: '#3a2e28',
    }}>
      <div style={{ padding: '44px 24px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <BrandLockup variant="hero" />
          </div>
          <div style={{ fontSize: 13, color: '#5c3a1e' }}>이메일로 로그인</div>
        </div>

        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="이메일" autoComplete="username" inputMode="email"
          style={{
            width: '100%', height: 50, borderRadius: 12, padding: '0 14px',
            border: '1px solid #e0cdbb', background: '#fff', fontSize: 15,
            fontFamily: 'inherit', color: '#3a2e28', marginBottom: 9,
          }}
        />
        <input
          type="password" value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          placeholder="비밀번호" autoComplete="current-password"
          style={{
            width: '100%', height: 50, borderRadius: 12, padding: '0 14px',
            border: '1px solid #e0cdbb', background: '#fff', fontSize: 15,
            fontFamily: 'inherit', color: '#3a2e28', marginBottom: 14,
          }}
        />

        {/*  ⛔ 무엇이 틀렸는지 «가려서» 말합니다 — 아이디가 있는지 없는지 알려 주지 않습니다 */}
        {error && (
          <div style={{
            fontSize: 12.5, color: '#A32D2D', background: '#fff3ec',
            border: '0.5px solid #e9d9ca', borderRadius: 10,
            padding: '10px 12px', marginBottom: 12, lineHeight: 1.6,
          }}>{error}</div>
        )}

        <button type="button" onClick={submit} disabled={busy || !email || !pw}
          style={{
            width: '100%', height: 52, borderRadius: 14, border: 'none',
            background: '#96502e', color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: busy || !email || !pw ? 'default' : 'pointer',
            opacity: busy || !email || !pw ? 0.5 : 1, fontFamily: 'inherit',
          }}>
          {busy ? '들어가는 중…' : '로그인'}
        </button>

        {/*  ⛔ ★들어오는 길만 둡니다. 가입하거나 비밀번호를 찾는 길은 없습니다. */}
      </div>
      {/*  🔴 ★2026-09-23 (11부) [대표님 「홈이 아닌 화면에 사업자정보는 없는데」]
          *  ⛔ PG 심사가 ★«모든 화면 하단» 을 봅니다. 지우지 마십시오.
          *  ⛔ 값을 여기에 적지 마십시오 — companyInfo.ts 한 곳에서 옵니다. */}
        <CompanyFooter />
      </div>
  )
}
