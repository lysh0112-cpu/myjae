'use client'

// ══════════════════════════════════════════════════════════════════════
//  /wallet/charge/fail — ★결제가 안 됐을 때  2026-09-22 (10부)
//
//  ⚠️ 토스가 ?code=… &message=… 로 보냅니다.
//  ⛔ ★돈은 «안» 빠졌습니다. 손님을 놀라게 하지 않습니다.
//  ⚠️ 손님이 «직접 닫은» 경우(USER_CANCEL)가 가장 많습니다 —
//     그때는 ★«실패» 라고 말하지 않습니다. 그냥 돌아가시게 합니다.
// ══════════════════════════════════════════════════════════════════════

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const C = {
  bg: '#FDF6F0', card: '#FFFBF7', thin: '#e8dccf',
  ink: '#5a4a3e', sub: '#8a7565', btn: '#b46e46',
}

function Fail() {
  const router = useRouter()
  const q = useSearchParams()
  const code = q.get('code') ?? ''
  const raw = q.get('message') ?? ''
  /** ★손님이 스스로 닫은 것 — 「실패」 가 아닙니다 */
  const cancelled = /USER_CANCEL|PAY_PROCESS_CANCELED/i.test(code)

  return (
    <main style={{
      minHeight: '100vh', background: C.bg, maxWidth: 430, margin: '0 auto',
      padding: '60px 20px 40px', textAlign: 'center',
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif", color: C.ink,
    }}>
      <div style={{ fontSize: 34, marginBottom: 12 }}>{cancelled ? '🙂' : '⚠️'}</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
        {cancelled ? '충전을 그만두셨어요' : '결제가 되지 않았어요'}
      </div>
      <div style={{
        fontSize: 12.5, color: C.sub, lineHeight: 1.8, marginBottom: 22,
        background: C.card, border: `0.5px solid ${C.thin}`,
        borderRadius: 12, padding: '12px 14px',
      }}>
        {/*  ⛔ ★돈이 안 빠졌다는 것을 «먼저» 말합니다. 그것이 가장 궁금하십니다. */}
        <b>결제된 금액은 없어요.</b>
        {!cancelled && raw && (
          <>
            <br /><br />
            {raw}
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => router.replace('/wallet/charge')}
          style={{
            flex: 1, height: 50, borderRadius: 14, border: 'none',
            background: C.btn, color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>다시 충전하기</button>
        <button type="button" onClick={() => router.replace('/wallet')}
          style={{
            width: 120, height: 50, borderRadius: 14,
            border: `0.5px solid ${C.thin}`, background: '#fff',
            color: C.ink, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
          }}>내 지갑</button>
      </div>
    </main>
  )
}

export default function ChargeFailPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: C.bg }} />}>
      <Fail />
    </Suspense>
  )
}
