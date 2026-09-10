'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import WalletPanel from '@/app/components/common/WalletPanel'
import { APPS } from '@/app/components/common/companyInfo'

/* ══════════════════════════════════════════════════════════════════
 *  ★공용 지갑 화면 — 2026-09-08 신설 [대표님 지시]
 *
 *  세 앱(명카페·큐보드·골프온)이 ★«같은 지갑» 을 씁니다 (mc_wallet 줄 하나).
 *  ⇒ 잔액·내역을 보는 화면도 ★한 벌만 둡니다.
 *
 *  [다른 앱에서 부르는 법]  단추 하나에 이 주소만 걸면 됩니다 —
 *      https://myjae.kr/wallet?from=glf   (골프온)
 *      https://myjae.kr/wallet?from=bil   (큐보드)
 *      ⚠️ 2026-09-09 — 도메인을 사서 주소가 바뀌었습니다 (전 myjae.vercel.app).
 *         ⇒ 큐보드·골프온 쪽 코드에도 ★이 주소로 고쳐야 합니다 (그쪽 창에서).
 *  ⛔⛔ ★큐보드·골프온에 지갑 화면을 «따로 만들지» 마십시오.
 *      같은 것을 셋 만들고 셋 고치게 됩니다 [1부 4-1과 같은 결].
 *
 *  ⚠️ ★돌아갈 주소를 BACK 한 곳에 모아 두었습니다.
 *     도메인을 사시면(myjae.kr) ★이 표만 고치면 됩니다.
 *
 *  ⚠️ 로그인을 안 했으면 ★로그인 화면으로 보냅니다.
 *     ⛔ 빈 화면을 보여 주지 마십시오 — 「내 돈이 사라졌나」 하십니다.
 *
 *  ⚠️ useSearchParams 는 ★Suspense 안에 있어야 합니다 (Next.js 규칙).
 *     ⛔ Suspense 를 빼지 마십시오 — 빌드가 깨집니다.
 * ══════════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════════════════════════
//  🔴 ★2026-09-09 — 새 주소로 바꿨습니다  [대표님이 도메인을 사셨습니다]
//    myjae.kr  ·  cue.myjae.kr  ·  golf.myjae.kr   (2026-09-09 · 3년 · 법인 명의)
//
//   [까닭]  세 앱이 ★서브도메인으로 한 지붕에 들어왔습니다.
//      ⇒ 「한 번 로그인하면 셋 다 열림」 이 되는 바탕입니다 (1부 10-2).
//   ⚠️ 옛 주소(vercel.app)도 ★여전히 열립니다 — 그래서 없애도 손님이 막히진 않습니다.
//      다만 지갑에서 돌아갈 때는 ★새 주소로 보내는 것이 맞습니다.
//
//   ⛔⛔ ★이 표가 «세 앱 주소를 적어 두는 유일한 자리» 입니다.
//      주소가 또 바뀌면 여기만 고치십시오. 다른 곳에 적지 마십시오.
//   ⚠️ 낱말(glf·bil)은 ★mc_ledger.service 와 같은 것입니다. ⛔ 바꾸지 마십시오 (1부 3-1).
// ══════════════════════════════════════════════════════════════════
//  🔴🔴 ★2026-09-10 — 이 표를 ★app/components/common/companyInfo.ts 의 APPS 로 «옮겼습니다».
//
//   [까닭]  약관 화면(/terms · /privacy)과 자매 바로가기도 «같은 주소» 를 쓰게 되어
//      세 곳에 같은 주소가 적히려 했습니다. ⇒ 한 표로 합쳤습니다.
//   ⛔⛔ 주소가 또 바뀌면 ★companyInfo.ts 의 APPS «한 곳» 만 고치십시오.
//   ⚠️ 낱말(glf·bil)은 ★mc_ledger.service 와 같은 것입니다. ⛔ 바꾸지 마십시오 (1부 3-1).
// ══════════════════════════════════════════════════════════════════
const BACK: Record<string, { label: string; href: string }> = {
  glf: { label: APPS.glf.back, href: APPS.glf.href },
  bil: { label: APPS.bil.back, href: APPS.bil.href },
}

function WalletInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [ready, setReady] = useState(false)

  const from = params.get('from') ?? ''
  const back = BACK[from]

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace(`/login?next=${encodeURIComponent('/wallet?from=' + from)}`)
        return
      }
      setReady(true)
    })
  }, [router, from])

  if (!ready) {
    return (
      <main style={{ minHeight: '100vh', background: '#FDF6F0', padding: 24 }}>
        <div style={{ fontSize: 13, color: '#8a7565', textAlign: 'center', marginTop: 60 }}>
          불러오는 중…
        </div>
      </main>
    )
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#FDF6F0',
      maxWidth: 430, margin: '0 auto', padding: '14px 16px 40px',
    }}>
      <button
        onClick={() => { if (back) window.location.href = back.href; else router.push('/mypage-new') }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 4px',
          background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8,
        }}>
        <span style={{ fontSize: 13, color: '#96502e' }}>←</span>
        <span style={{ fontSize: 12, color: '#5a4a3e' }}>
          {back ? back.label : '마이페이지로'}
        </span>
      </button>

      <div style={{
        background: '#FFFBF7', border: '0.5px solid #9c7a58',
        borderRadius: 14, padding: 16,
      }}>
        <WalletPanel big />
      </div>
    </main>
  )
}

export default function WalletPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', background: '#FDF6F0' }} />
    }>
      <WalletInner />
    </Suspense>
  )
}
