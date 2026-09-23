'use client'

// ══════════════════════════════════════════════════════════════════════
//  /wallet/charge — ★충전 화면 (토스페이먼츠 결제위젯)   2026-09-22 (10부)
//
//  ┌──────────────────────────────────────────────────────────────────┐
//  │  [까닭]  지금까지 지갑은 ★«빼는» 것만 있었습니다.                  │
//  │    «넣는» 길은 관리자가 손으로 [+5천] 을 누르는 것뿐이었습니다.     │
//  │    ⇒ 손님이 «스스로» 충전할 길이 «한 곳도» 없었습니다.             │
//  └──────────────────────────────────────────────────────────────────┘
//
//  ⚠️ ★충전 금액은 «대표님이 2026-09-08 에 정하신» 다섯 그대로입니다 —
//     CHARGE_AMOUNTS (WalletPanel.tsx:45). ⛔ 여기에 숫자를 «다시 적지» 마십시오.
//     ⇒ 화면 아래 안내 줄도 «같은 표» 를 봅니다. 한쪽만 고치면 어긋납니다.
//
//  🔴 흐름 —
//     ① 금액 고르기 → ② 토스 결제창 → ③ 성공하면 /wallet/charge/done 으로
//     ④ 거기서 ★/api/toss/confirm 을 불러 «승인» 하고 지갑에 넣습니다
//     ⛔ ★«승인» 을 화면에서 하지 마십시오 — 시크릿 키가 드러납니다. 서버 몫입니다.
//
//  ⚠️ ★테스트 키(test_gck_…)입니다. 진짜 돈은 «안» 빠집니다.
//     라이브로 바꾸실 때는 ★이 파일의 CLIENT_KEY 와
//     Vercel 의 TOSS_SECRET_KEY 를 «함께» 바꾸십시오. 섞으면 INVALID_API_KEY 입니다.
// ══════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import CompanyFooter from '@/app/components/common/CompanyFooter'
import { useRouter } from 'next/navigation'
import { loadTossPayments, type TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk'
import { supabase } from '@/lib/supabase'
import { CHARGE_AMOUNTS } from '@/app/components/common/WalletPanel'
import { useSisterLinks } from '@/app/components/common/useSisterLinks'

/**
 *  ★결제위젯 «클라이언트» 키 (test_gck_…).
 *  ⚠️ 이 값은 ★손님 브라우저에 «드러나는» 것이 정상입니다. 숨길 값이 아닙니다.
 *  ⛔ «시크릿» 키(test_gsk_…)는 ★여기에 «절대» 적지 마십시오 —
 *     그것은 Vercel 의 TOSS_SECRET_KEY 에만 있고, 서버만 씁니다.
 *  ⚠️ ★주문서형·결제창형 키(gck)입니다. 구버전 키(ck)와 «섞으면» INVALID_API_KEY.
 */
const CLIENT_KEY = 'test_gck_Poxy1XQL8RJvqkojNak587nO5Wml'

const C = {
  bg: '#FDF6F0', card: '#FFFBF7', line: '#9c7a58', thin: '#e8dccf',
  ink: '#5a4a3e', sub: '#8a7565', gold: '#96502e', btn: '#b46e46',
}

export default function ChargePage() {
  const router = useRouter()
  const [amount, setAmount] = useState<number>(CHARGE_AMOUNTS[1])
  /** 🔴 ★승인 전에는 큐보드·골프온 이름을 «안» 보입니다 [대표님 2026-09-22] */
  const sisterOn = useSisterLinks()
  const [widgets, setWidgets] = useState<TossPaymentsWidgets | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  /** ★손님마다 다른 열쇠 — 토스가 «누구의 결제인지» 를 가릅니다 */
  const custKey = useRef<string>('')
  /**
   *  ⛔ ★결제수단·약관은 «한 번만» 그립니다.
   *  🔴 토스는 ★한 페이지에 결제 UI 를 «두 번» 못 그립니다 —
   *     두 번째 render 는 ★PaymentMethodsWidgetAlreadyRenderedError 로 «던집니다»
   *     (tosspayments-sdk/types/index.d.ts:528 · 약관은 561).
   *  ⇒ 다시 그리려면 ★destroy() 부터 해야 합니다. 우리는 «안 그립니다».
   */
  const drawn = useRef(false)
  /** ★지금 고른 금액 — 그리는 effect 가 «다시 돌지» 않게 값만 들고 다닙니다 */
  const amountRef = useRef(CHARGE_AMOUNTS[1])

  /*  ① 로그인 확인 + 결제위젯 준비
   *  ⚠️ ★로그인해야 합니다 — 누구 지갑에 넣을지 알아야 하기 때문입니다. */
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.replace('/login?next=' + encodeURIComponent('/wallet/charge'))
        return
      }
      if (!alive) return
      custKey.current = data.user.id
      try {
        const toss = await loadTossPayments(CLIENT_KEY)
        const w = toss.widgets({ customerKey: data.user.id })
        if (!alive) return
        setWidgets(w)
      } catch {
        if (alive) setErr('결제 창을 불러오지 못했어요. 잠시 뒤 다시 해 주세요.')
      }
    })()
    return () => { alive = false }
  }, [router])

  /*  ② 결제수단·약관을 ★«한 번만» 그립니다
   *  ⚠️ ★금액을 «먼저» 알려 줘야 합니다 (setAmount). 안 그러면 NotSetupAmountError.
   *
   *  🔴🔴 [2026-09-22 대표님] 「카드는 여기서 막히네」 —
   *     금액 단추(10만원)를 누르면 ★「결제 수단을 불러오지 못했어요」 가 뜨고
   *     [충전하기] 가 ★«영영» 안 켜졌습니다.
   *     [까닭] 이 effect 가 ★amount 를 목록에 달고 있어, 금액이 바뀔 때마다
   *       ★render 를 «다시» 불렀습니다 ⇒ 토스가 «이미 그렸다» 며 던졌고,
   *       catch 로 빠져 ★setReady(true) 를 «못» 지났습니다.
   *     ⇒ 처음 뜬 금액(10,000)으로는 되고, ★«바꾸면» 막혔습니다.
   *  ⛔ 이 목록에 ★amount 를 «다시 넣지» 마십시오. 같은 자리가 다시 막힙니다.
   *  ⇒ 금액이 바뀌면 ★setAmount 만 부릅니다 (아래 ③). */
  useEffect(() => {
    if (!widgets || drawn.current) return
    drawn.current = true
    let alive = true
    ;(async () => {
      try {
        await widgets.setAmount({ currency: 'KRW', value: amountRef.current })
        await Promise.all([
          //  ⚠️ ★variantKey 를 안 줍니다 — 토스가 «주는 대로 다» 보여 줍니다 [대표님]
          widgets.renderPaymentMethods({ selector: '#toss-methods' }),
          widgets.renderAgreement({ selector: '#toss-agreement' }),
        ])
        if (alive) { setReady(true); setErr('') }
      } catch {
        //  ⚠️ ★자물쇠를 풀어 둡니다 — 다시 들어올 길이 «막히지» 않게
        drawn.current = false
        if (alive) setErr('결제 수단을 불러오지 못했어요.')
      }
    })()
    return () => { alive = false }
  }, [widgets])

  /*  ③ 금액이 바뀌면 ★«알려만» 줍니다 — 다시 «그리지» 않습니다
   *  ⚠️ 직접 입력은 글자마다 바뀌므로 ★조금 기다렸다 보냅니다 (250ms).
   *  ⛔ 여기에 render 를 부르지 마십시오 — ②의 까닭 그대로입니다. */
  useEffect(() => {
    if (!widgets || !ready || amount < 1000) return
    let alive = true
    const t = setTimeout(() => {
      widgets.setAmount({ currency: 'KRW', value: amount })
        .then(() => { if (alive) setErr('') })
        .catch(() => { if (alive) setErr('금액을 바꾸지 못했어요. 새로고침한 뒤 다시 해 주세요.') })
    }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [widgets, ready, amount])

  /*  ③ 결제창 띄우기
   *  ⚠️ orderId 는 ★«겹치지 않는» 값이라야 합니다 (토스 규칙 6~64자).
   *  ⛔ 손님 이름·사주를 ★orderId 나 orderName 에 싣지 마십시오 (9부 ⑨). */
  async function pay() {
    if (!widgets || busy) return
    setBusy(true)
    setErr('')
    const orderId = `myjae_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    try {
      //  🔴 ⛔ ★결제 «직전» 에 금액을 한 번 더 알려 줍니다 —
      //     ③이 조금 기다렸다 보내므로, 바꾸자마자 누르면 ★«옛 금액» 이 갈 수 있습니다.
      await widgets.setAmount({ currency: 'KRW', value: amount })
      await widgets.requestPayment({
        orderId,
        orderName: `명연재 지갑 충전 ${amount.toLocaleString()}원`,
        successUrl: `${window.location.origin}/wallet/charge/done`,
        failUrl: `${window.location.origin}/wallet/charge/fail`,
      })
    } catch (e: unknown) {
      //  ⚠️ 손님이 «닫은» 것도 여기로 옵니다 — ⛔ 놀라게 하지 않습니다
      setBusy(false)
      const m = e instanceof Error ? e.message : ''
      if (m && !/취소|USER_CANCEL/i.test(m)) setErr('결제를 시작하지 못했어요. 잠시 뒤 다시 해 주세요.')
    }
  }

  /*  ⛔ ★ready 를 «내리지» 않습니다 — 위젯은 그대로 있고 «금액만» 바뀝니다.
   *     내리면 ②가 다시 안 돌아 [충전하기] 가 ★영영 안 켜집니다 (대표님이 밟으신 자리). */
  const pick = (n: number) => {
    setAmount(n)
    amountRef.current = n
    setErr('')
  }

  return (
    <main style={{
      minHeight: '100vh', background: C.bg, maxWidth: 430, margin: '0 auto',
      padding: '14px 16px 40px',
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif", color: C.ink,
    }}>
      <button onClick={() => router.push('/wallet')}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 4px',
          background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8,
          fontFamily: 'inherit',
        }}>
        <span style={{ fontSize: 13, color: C.gold }}>←</span>
        <span style={{ fontSize: 12, color: C.ink }}>내 지갑으로</span>
      </button>

      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 3 }}>지갑 충전</div>
      {/*  🔴 ★2026-09-22 (11부) [대표님] — 승인 «전» 에는 두 이름을 «안» 보입니다.
        *     ⛔ 글귀를 지우지 마십시오. 토글(sisterLinks)을 켜면 돌아옵니다. */}
      <div style={{ fontSize: 12, color: C.sub, marginBottom: 16, lineHeight: 1.7 }}>
        {sisterOn
          ? '충전하신 금액은 명연재·큐보드·골프온에서 함께 쓰실 수 있어요.'
          : '충전하신 금액은 명연재에서 쓰실 수 있어요.'}
      </div>

      {/*  ★금액 고르기 — ⛔ 숫자를 여기 적지 «않습니다». CHARGE_AMOUNTS 를 봅니다. */}
      <div style={{
        background: C.card, border: `0.5px solid ${C.line}`, borderRadius: 14,
        padding: 14, marginBottom: 12,
      }}>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 9 }}>얼마를 충전하실까요?</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
          {CHARGE_AMOUNTS.map(n => {
            const on = amount === n
            return (
              <button key={n} type="button" onClick={() => pick(n)}
                style={{
                  padding: '11px 4px', borderRadius: 10, cursor: 'pointer',
                  border: `${on ? 1.5 : 0.5}px solid ${on ? C.gold : C.thin}`,
                  background: on ? '#fff3ec' : '#fff',
                  color: on ? C.gold : C.ink, fontWeight: on ? 700 : 500,
                  fontSize: 13.5, fontFamily: 'inherit',
                }}>
                {n.toLocaleString()}
              </button>
            )
          })}
        </div>

        {/*  ⛔⛔ ★2026-09-23 (11부) — «직접 입력» 칸을 «걷어냈습니다».
          *  [토스 충전업종 가이드 4쪽 · 3번]
          *    「★임의 금액 입력 후 충전하는 결제 방식은 이용이 «불가능» 해요.
          *      반드시 ★10만원 이하의 금액을 «선택» 하도록 구현해 주세요.」
          *  [토스 회신 2026-09-23] 「충전금액 한도를 ★1회 10만원으로 제한해 주세요.」
          *  ⇒ 🔴 손님이 «적어 넣는» 길을 두면 ★심사에서 반려됩니다.
          *  ⛔ 다시 만들지 «마십시오». 금액은 ★CHARGE_AMOUNTS 다섯 개 «중에서만» 고릅니다.
          *  ⚠️ 다섯 개의 «맨 위» 가 정확히 100,000 이라야 합니다 (그 이상은 안 됩니다). */}
        <div style={{ fontSize: 11, color: C.sub, marginTop: 9, lineHeight: 1.7 }}>
          한 번에 최대 100,000원까지 충전하실 수 있어요.
        </div>
      </div>

      {/*  ★결제수단 · 약관 — 토스가 그립니다 */}
      <div id="toss-methods" />
      <div id="toss-agreement" />

      {err && (
        <div style={{
          fontSize: 12.5, color: '#A32D2D', background: '#fff3ec',
          border: `0.5px solid ${C.thin}`, borderRadius: 10,
          padding: '10px 12px', margin: '10px 0', lineHeight: 1.6,
        }}>{err}</div>
      )}

      {/*  ⚠️ ★충전은 «물건» 이 아니라 «돈을 넣는» 것이라 청약철회 문구가 다릅니다.
        *     ⇒ 약관 제8조 1항 — 충전일로부터 7일 이내 «미사용» 충전금 청약철회.
        *  ⛔ 「결과를 확인하신 뒤에는」 같은 말을 여기에 쓰지 마십시오. 물건이 아닙니다.
        *
        *  🔴🔴 ★2026-09-23 (11부) — 토스 «포인트충전 업종» 요건 [회신 2026-09-23]
        *    「홈페이지 «내» 에 충전된 포인트에 대한 ★환불 정책을 기재해 주세요」
        *    ⇒ 약관에만 두지 «않고» ★손님이 «결제하는 그 화면» 에 적습니다.
        *  ⛔ 아래 네 줄을 지우지 «마십시오» — 심사가 이 자리를 봅니다.
        *     · 이용·환불 기한 ★«결제시점으로부터 1년»   (약관 제7조 3항)
        *     · 7일 이내 청약철회                      (제8조 1항)
        *     · 환불은 ★«결제하신 수단» 으로            (제7조 4항 · 제8조 3항)
        *     · ★양도 불가                             (제7조 1항)
        *  ⚠️ 약관을 고치면 ★이 글도 «함께» 고치십시오 (말이 달라지면 심사에서 걸립니다). */}
      <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.75, margin: '12px 2px' }}>
        충전금은 결제하신 날로부터 1년간 쓰실 수 있어요.
        <br />
        쓰지 않은 충전금은 충전일로부터 7일 안에 취소하실 수 있고, 그 뒤에도 환불을 요청하실 수 있어요.
        <br />
        환불은 결제하신 수단으로 돌려드려요.
        <br />
        충전금은 다른 회원에게 넘기실 수 없어요.
      </div>

      <button type="button" onClick={pay}
        disabled={!ready || busy || amount < 1000}
        style={{
          width: '100%', height: 52, borderRadius: 14, border: 'none',
          background: C.btn, color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: !ready || busy || amount < 1000 ? 'default' : 'pointer',
          opacity: !ready || busy || amount < 1000 ? 0.5 : 1, fontFamily: 'inherit',
        }}>
        {busy ? '결제창을 여는 중…'
          : amount >= 1000 ? `${amount.toLocaleString()}원 충전하기` : '금액을 골라 주세요'}
      </button>
    
        {/*  🔴 ★2026-09-23 (11부) [대표님 「홈이 아닌 화면에 사업자정보는 없는데」]
          *  ⛔ PG 심사가 ★«모든 화면 하단» 을 봅니다. 지우지 마십시오.
          *  ⛔ 값을 여기에 적지 마십시오 — companyInfo.ts 한 곳에서 옵니다.
          *  ⚠️ ★자리를 «세어» 넣었습니다 — 바깥 상자가 닫히기 «직전» 입니다.
          *     처음에 «맨 마지막 </div> 앞» 에 기계로 밀어 넣었다가
          *     ★회원 카드 «안» 에 들어가 화면이 깨졌습니다 (대표님이 찾으심). */}
        <CompanyFooter />
      </main>
  )
}
