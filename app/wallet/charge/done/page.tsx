'use client'

// ══════════════════════════════════════════════════════════════════════
//  /wallet/charge/done — ★결제 성공 뒤 «승인» 하는 화면  2026-09-22 (10부)
//
//  ⚠️ 토스가 «결제됐다» 며 여기로 보냅니다 —
//     ?paymentKey=… &orderId=… &amount=…
//  ⇒ 이 화면이 ★/api/toss/confirm 을 불러 «승인» 하고 지갑에 넣습니다.
//  ⛔ 여기서 «승인» 을 직접 하지 마십시오 — 시크릿 키가 드러납니다. 서버 몫입니다.
//
//  🔴 ★새로고침해도 «두 번» 안 들어갑니다 —
//     창구가 orderId 로 이미 넣었는지 봅니다 (confirm/route.ts ②).
//  ⛔ 그 검사를 믿고 화면에서 막지 «않습니다». 서버가 진짜 문지기입니다.
// ══════════════════════════════════════════════════════════════════════

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const C = {
  bg: '#FDF6F0', card: '#FFFBF7', line: '#9c7a58', thin: '#e8dccf',
  ink: '#5a4a3e', sub: '#8a7565', gold: '#96502e', btn: '#b46e46',
}

function Done() {
  const router = useRouter()
  const q = useSearchParams()
  const [state, setState] = useState<'work' | 'ok' | 'bad'>('work')
  const [msg, setMsg] = useState('')
  const [won, setWon] = useState<number | null>(null)
  const [bal, setBal] = useState<number | null>(null)
  /** ⛔ ★한 번만 부릅니다 — 화면이 다시 그려져도 두 번 안 가게 */
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    const paymentKey = q.get('paymentKey') ?? ''
    const orderId = q.get('orderId') ?? ''
    const amount = Number(q.get('amount') ?? 0)
    /*  ⚠️ ★effect 안에서 «바로» setState 하면 eslint 가 막습니다 (9부 기준선).
     *     ⇒ 한 박자 미뤄 «바깥 일» 처럼 알려 줍니다. 눈에는 차이가 없습니다.
     *  ⛔ setState 를 여기로 다시 끌어올리지 마십시오 — 오류가 하나 늘어납니다. */
    if (!paymentKey || !orderId || !amount) {
      queueMicrotask(() => {
        setState('bad')
        setMsg('결제 정보를 찾지 못했어요.')
      })
      return
    }
    fetch('/api/toss/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
      .then(async r => {
        const d = await r.json().catch(() => ({})) as {
          ok?: boolean; message?: string; amount?: number; balance?: number
        }
        if (r.ok && d.ok) {
          setWon(d.amount ?? amount)
          setBal(typeof d.balance === 'number' ? d.balance : null)
          setState('ok')
        } else {
          setState('bad')
          setMsg(d.message || '결제를 마무리하지 못했어요.')
        }
      })
      .catch(() => { setState('bad'); setMsg('연결이 끊겼어요. 잠시 뒤 지갑에서 확인해 주세요.') })
  }, [q])

  return (
    <main style={{
      minHeight: '100vh', background: C.bg, maxWidth: 430, margin: '0 auto',
      padding: '60px 20px 40px', textAlign: 'center',
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif", color: C.ink,
    }}>
      {state === 'work' && (
        <div style={{ fontSize: 14, color: C.sub, marginTop: 40 }}>
          결제를 마무리하고 있어요…
          <br />
          <span style={{ fontSize: 12 }}>⛔ 창을 닫지 말아 주세요.</span>
        </div>
      )}

      {state === 'ok' && (
        <>
          <div style={{ fontSize: 40, marginBottom: 12 }}>☕</div>
          <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>충전됐어요</div>
          <div style={{ fontSize: 26, color: C.gold, fontWeight: 700, marginBottom: 4 }}>
            {(won ?? 0).toLocaleString()}원
          </div>
          {bal !== null && (
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 22 }}>
              지금 잔액 {bal.toLocaleString()}원
            </div>
          )}
          <button type="button" onClick={() => router.replace('/wallet')}
            style={{
              width: '100%', height: 50, borderRadius: 14, border: 'none',
              background: C.btn, color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>내 지갑 보기</button>
        </>
      )}

      {state === 'bad' && (
        <>
          <div style={{ fontSize: 34, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            결제를 마무리하지 못했어요
          </div>
          <div style={{
            fontSize: 12.5, color: C.sub, lineHeight: 1.8, marginBottom: 22,
            background: C.card, border: `0.5px solid ${C.thin}`,
            borderRadius: 12, padding: '12px 14px', textAlign: 'left',
          }}>
            {msg}
            <br /><br />
            {/*  ⚠️ ★돈이 빠졌는데 안 들어간 경우가 있을 수 있습니다.
              *     ⇒ 「괜찮다」 고 «둘러대지» 않습니다. 사실대로 알리고 길을 드립니다. */}
            혹시 결제는 되었는데 잔액이 그대로라면 아래로 알려 주세요. 바로 넣어 드릴게요.
            <br />
            lysh6728@naver.com · 010-6493-2252
          </div>
          <button type="button" onClick={() => router.replace('/wallet')}
            style={{
              width: '100%', height: 50, borderRadius: 14,
              border: `0.5px solid ${C.thin}`, background: '#fff',
              color: C.ink, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
            }}>내 지갑 보기</button>
        </>
      )}
    </main>
  )
}

export default function ChargeDonePage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: C.bg }} />}>
      <Done />
    </Suspense>
  )
}
