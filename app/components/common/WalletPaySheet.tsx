'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { checkAiBalance, WALLET_GATE_ON, won } from '@/lib/wallet/consultGate'

// ══════════════════════════════════════════════════════════════════
//  🔴🔴 ★2026-09-09 — 결제 시트 «한 벌»  [대표님 지시]
//    「방금 네가 만든 진로적성의 ai결제화면과 ★기존에 있던 결제화면이 다르다」
//    「★통일시켜야 하는 것 아닌가?」
//
//   [무엇이 있었나 — 값으로 잰 것]
//     결제 팝업을 ★«아홉 화면» 이 «저마다» 갖고 있었습니다 —
//       사주그림 · 출산택일 · 이름 풀이 · 한자 바꾸기 · 개명 결과
//       결혼 진단 · 결혼 택일 · 마이페이지 · 상담 결제단계
//     거기에 제가 ★열 번째(브라우저 confirm)를 얹었습니다.
//     ⚠️ 붙이기 «전» 에 「이미 있는가」를 봤어야 했습니다.
//
//   [모양은 어디서 왔나]
//     ★사주그림(mulsang)의 PayPopup 을 그대로 따랐습니다 —
//     손님이 «이미 보던» 모양입니다. ⛔ 새 모양을 지어내지 않았습니다.
//
//   [무엇이 늘었나]
//     ★지갑 잔액과 «보시고 나면 남을» 값을 함께 보입니다.
//     ⇒ 아홉 벌 모두 「결제 금액」만 있고 잔액이 «없었습니다».
//        지갑에서 빼기로 정하셨으니 [1부 3-1] 남는 값이 보여야 합니다.
//
//   ⛔⛔ ★화면마다 결제 팝업을 «다시 만들지» 마십시오. 여기 한 곳입니다.
//   ⛔ 모자랄 때 «다른 창» 을 띄우지 마십시오 —
//      ★같은 시트가 «말만 바꿔» 보입니다. 창이 둘이면 손님이 헷갈립니다.
//   ⛔⛔ ★[그냥 닫기] 를 «꼭» 두십시오 [2부 4장 원칙 ③] — 가두면 화가 납니다.
//
//   ⚠️ WALLET_GATE_ON 이 false 인 동안에는 ★잔액 줄이 «안 보입니다» —
//      값만 보이고 그대로 진행합니다 (카카오 전 상태).
// ══════════════════════════════════════════════════════════════════

const C = {
  dim: 'rgba(0,0,0,0.4)',
  sheet: '#fffbf7',
  grab: '#e4d4be',
  title: '#96502e',
  ink: '#3a2e28',
  sub: '#5c3a1e',
  box: '#fdf6f0',
  line: '#9c7a58',
  soft: '#e4d4be',
  gold: '#8f3d0e',
  btn: '#b46e46',
  red: '#c05a5a',
}

export default function WalletPaySheet(p: {
  open: boolean
  /** 「사주 그림 생성」 */
  title: string
  /** 한 줄 설명. ⚠️ 글자만이 아니라 «꾸민 글» 도 넣을 수 있습니다 (작명이 씁니다) */
  subtitle?: React.ReactNode
  /** 「포함 내용」 — 없으면 그 칸을 안 그립니다 */
  includes?: string[]
  /** ★mc_price·analysis_prices 의 낱말 (mulsang_ai · career_ai …). ⛔ 지어내지 마십시오 */
  item: string
  /** 「20,000원 내고 ★그림 그리기」 의 뒷말 */
  actionLabel: string
  onConfirm: () => void
  onClose: () => void
  /** 충전하러 갈 곳. 없으면 /wallet 으로 갑니다 */
  onCharge?: () => void
  /**
   *  맨 아래에 덧붙일 것 — ★결혼·출산이 <Disclaimer /> 를 붙입니다.
   *  ⛔ 여기에 «결제 단추» 를 넣지 마십시오. 안내 글만 넣는 자리입니다.
   */
  footer?: React.ReactNode
}) {
  const [price, setPrice] = useState<number | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'short' | 'error' | 'login'>('loading')

  useEffect(() => {
    if (!p.open) return
    let dead = false
    ;(async () => {
      setState('loading')
      //  ⚠️ 관문이 켜져 있으면 ★wallet_check 가 준 값을 씁니다 —
      //     ★확인과 차감이 «같은 표»(mc_price)를 봐야 합니다 [2부 3-5].
      //     ⛔ 화면에 보인 값과 빠지는 값이 다르면 손님이 화를 내십니다.
      if (WALLET_GATE_ON) {
        const r = await checkAiBalance(p.item)
        if (dead) return
        if (r.gate === 'on' && r.ok) {
          setPrice(r.need); setBalance(r.balance); setState('ok'); return
        }
        if (r.gate === 'on' && !r.ok && r.reason === 'not_enough') {
          setPrice(r.need); setBalance(r.balance); setState('short'); return
        }
        /* ★2026-09-11 (6부) — «로그인 안 함» 을 따로 가립니다 (검사 ㉒-t).
         *   [전]  로그인을 안 해도 「잔액을 확인하지 못했어요. 잠시 뒤에 다시 해 주세요」.
         *         ⇒ 잠시 뒤에 해도 «안 됩니다». 손님이 무엇을 해야 할지 몰랐습니다.
         *   ⚠️ 5부 0-5 「가려서 말하기」 · 골프온 1판-49 ④ 와 같은 결입니다. */
        if (r.gate === 'on' && !r.ok && r.reason === 'no_login') { setState('login'); return }
        if (r.gate === 'on' && !r.ok) { setState('error'); return }
      }
      //  관문이 꺼져 있을 때 — 값만 보여 드립니다 (잔액은 안 봅니다).
      const { data } = await supabase
        .from('analysis_prices').select('price').eq('price_key', p.item).maybeSingle()
      if (dead) return
      setPrice(data?.price ?? null)
      setBalance(null)
      setState('ok')
    })()
    return () => { dead = true }
  }, [p.open, p.item])

  if (!p.open) return null

  const short = state === 'short'
  const need = price ?? 0
  const bal = balance ?? 0

  const row = (label: string, value: string, tone?: 'accent' | 'red') => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
      <span style={{ color: C.sub }}>{label}</span>
      <span style={{ fontWeight: tone ? 700 : 400, color: tone === 'red' ? C.red : tone ? C.gold : C.ink }}>
        {value}
      </span>
    </div>
  )

  return (
    <div onClick={p.onClose}
      style={{
        position: 'fixed', inset: 0, background: C.dim, zIndex: 100,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 430, background: C.sheet,
          borderRadius: '20px 20px 0 0', padding: '10px 20px 28px',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.15)',
        }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: C.grab, margin: '0 auto 18px' }} />

        <div style={{ fontSize: 17, fontWeight: 700, color: C.title, marginBottom: 4 }}>{p.title}</div>
        {p.subtitle && (
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 16, lineHeight: 1.6 }}>{p.subtitle}</div>
        )}

        {p.includes && p.includes.length > 0 && (
          <div style={{
            background: C.box, borderRadius: 12, padding: 14,
            marginBottom: 18, border: `0.5px solid ${C.line}`,
          }}>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>포함 내용</div>
            {p.includes.map((t, i) => (
              <div key={i} style={{ fontSize: 13, color: C.ink, lineHeight: 1.9 }}>· {t}</div>
            ))}
          </div>
        )}

        {state === 'loading' && (
          <div style={{ fontSize: 13, color: C.sub, padding: '10px 0 18px' }}>값을 불러오는 중이에요…</div>
        )}

        {state === 'login' && (
          <div style={{ fontSize: 13, color: C.ink, padding: '10px 0 18px', lineHeight: 1.7 }}>
            로그인이 필요해요.<br />카카오로 로그인하시면 이 화면으로 다시 돌아와요.
          </div>
        )}

        {state === 'error' && (
          <div style={{ fontSize: 13, color: C.red, padding: '10px 0 18px', lineHeight: 1.7 }}>
            잔액을 확인하지 못했어요.<br />잠시 뒤에 다시 해 주세요.
          </div>
        )}

        {(state === 'ok' || state === 'short') && (
          <div style={{ borderTop: `0.5px solid ${C.soft}`, paddingTop: 12, marginBottom: 18 }}>
            {row('드는 값', won(need), 'accent')}
            {/* ⚠️ 관문이 꺼져 있으면 balance 가 null 이라 ★잔액 줄이 안 보입니다 */}
            {balance !== null && row('지갑 잔액', won(bal))}
            {balance !== null && !short && row('보시고 나면', won(bal - need), 'accent')}
            {balance !== null && short && row('모자란 값', won(need - bal), 'red')}
          </div>
        )}

        {/* ⛔ 아래 두 단추를 하나로 합치지 마십시오 — «그냥 닫는» 길이 있어야 합니다 */}
        {state !== 'loading' && (
          <button
            onClick={() => {
              if (short) {
                if (p.onCharge) p.onCharge()
                else if (typeof window !== 'undefined') window.location.href = '/wallet'
                return
              }
              if (state === 'error') { p.onClose(); return }
              /* ★로그인하고 «지금 화면» 으로 돌아오게 — /login 이 next 를 거릅니다 (lib/safeNext.ts) */
              if (state === 'login') {
                if (typeof window !== 'undefined') {
                  const here = window.location.pathname + window.location.search
                  window.location.href = `/login?next=${encodeURIComponent(here)}`
                }
                return
              }
              p.onConfirm()
            }}
            style={{
              width: '100%', padding: 15, borderRadius: 12, background: C.btn,
              border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', marginBottom: 8, fontFamily: 'inherit',
            }}>
            {short ? '충전하러 가기' : state === 'error' ? '확인' : state === 'login' ? '카카오로 로그인하러 가기' : `${won(need)} 내고 ${p.actionLabel}`}
          </button>
        )}

        <button onClick={p.onClose}
          style={{
            width: '100%', padding: 12, borderRadius: 12, background: 'transparent',
            border: `0.5px solid ${C.soft}`, color: C.sub, fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          {short ? '그냥 닫기' : '취소'}
        </button>

        {/* ⚠️ 화면이 덧붙이는 안내 (결혼·출산의 고지문 등) */}
        {p.footer && <div style={{ marginTop: 14 }}>{p.footer}</div>}
      </div>
    </div>
  )
}
