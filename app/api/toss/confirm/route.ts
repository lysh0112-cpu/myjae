// ══════════════════════════════════════════════════════════════════════
//  POST /api/toss/confirm — ★결제를 «승인» 하고 지갑에 넣습니다  2026-09-22 (10부)
//
//  ┌──────────────────────────────────────────────────────────────────┐
//  │  토스 결제창에서 손님이 «결제» 를 누르면 돈이 «묶이기만» 합니다.    │
//  │  ★가맹점이 «승인» 을 해야 «진짜» 결제가 됩니다.                    │
//  │  ⇒ 이 창구가 그 승인을 하고, 성공하면 ★지갑에 넣습니다.            │
//  └──────────────────────────────────────────────────────────────────┘
//
//  🔴🔴 ★«화면» 에서 승인하면 안 됩니다 — 시크릿 키가 손님에게 드러납니다.
//     ⇒ 그래서 이 창구가 있습니다. 시크릿 키는 ★서버에만 있습니다.
//
//  🔴🔴 ★금액을 «손님이 보낸 값» 으로 믿으면 안 됩니다.
//     ⇒ 손님이 100원만 내고 「10만원 넣어 달라」 고 보낼 수 있습니다.
//     ⇒ ★토스가 «승인 결과로 돌려준» 금액만 씁니다. 그것이 진짜입니다.
//
//  ⚠️ 충전은 ★wallet_charge 함수가 합니다 (이미 있습니다).
//     ⛔ mc_wallet 을 «직접 고치지» 마십시오 — 표에 쓰기 정책이 아예 없어
//        조용히 0줄이 바뀝니다 (WalletMember.tsx:10).
//
//  ⚠️ 라이브로 바꾸실 때 —
//     Vercel 의 TOSS_SECRET_KEY 와 충전 화면의 CLIENT_KEY 를 ★«함께» 바꾸십시오.
//     섞으면 INVALID_API_KEY 입니다.
// ══════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** ⛔ 손님에게는 «왜» 안 됐는지 짧게만 알려 줍니다 */
function fail(msg: string, status = 400) {
  return NextResponse.json({ ok: false, message: msg }, { status })
}

export async function POST(request: Request) {
  try {
    const secret = process.env.TOSS_SECRET_KEY
    if (!secret) {
      console.error('[toss/confirm] TOSS_SECRET_KEY 가 없습니다')
      return fail('결제를 마무리하지 못했어요. 잠시 뒤 다시 해 주세요.', 500)
    }

    const body = await request.json().catch(() => ({})) as {
      paymentKey?: unknown; orderId?: unknown; amount?: unknown
    }
    const paymentKey = typeof body.paymentKey === 'string' ? body.paymentKey : ''
    const orderId = typeof body.orderId === 'string' ? body.orderId : ''
    const amount = Number(body.amount)
    if (!paymentKey || !orderId || !Number.isFinite(amount) || amount <= 0) {
      return fail('결제 정보가 올바르지 않아요.')
    }

    /*  ── ① 누구의 결제인가 ──────────────────────────────────────
     *  ⚠️ ★로그인한 «그 사람» 의 지갑에만 넣습니다.
     *  ⛔ 화면이 보낸 user_id 를 «믿지» 마십시오 — 남의 지갑에 넣을 수 있습니다. */
    const jar = await cookies()
    const me = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => jar.getAll(), setAll: () => {} } },
    )
    const { data: auth } = await me.auth.getUser()
    const userId = auth.user?.id
    if (!userId) return fail('로그인이 풀렸어요. 다시 로그인해 주세요.', 401)

    /*  ── ② 이미 넣은 결제인가 ───────────────────────────────────
     *  🔴 ★손님이 새로고침하면 이 창구가 «두 번» 불립니다.
     *     그대로 두면 ★돈은 한 번 내고 지갑에는 «두 번» 들어갑니다.
     *  ⇒ mc_ledger 에 memo 로 orderId 를 적어 두고, 있으면 «그냥 끝냅니다».
     *  ⛔ 이 검사를 빼지 마십시오. */
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const srv = process.env.SUPABASE_SERVICE_ROLE_KEY!
    /*  ⚠️ ★열쇠가 «없으면» 여기서 말하게 합니다 —
     *     없으면 ②의 조회도 «조용히» 실패하고, 넣기도 실패해
     *     「지갑에 넣지 못했어요」 만 남아 ★무엇이 막혔는지 알 수 없습니다. */
    if (!url || !srv) {
      console.error('[toss/confirm] ★SUPABASE_SERVICE_ROLE_KEY 가 없습니다 (Vercel 환경변수)')
      return fail('결제를 마무리하지 못했어요. 잠시 뒤 다시 해 주세요.', 500)
    }
    const sb = createClient(url, srv, { auth: { autoRefreshToken: false, persistSession: false } })

    const { data: already } = await sb
      .from('mc_ledger').select('id').eq('memo', orderId).limit(1)
    if (already && already.length > 0) {
      return NextResponse.json({ ok: true, already: true })
    }

    /*  ── ③ 토스에 «승인» 요청 ───────────────────────────────────
     *  ⚠️ 시크릿 키 뒤에 ★«콜론» 을 붙여 base64 로 만듭니다. ⛔ 콜론을 빠뜨리지 마십시오.
     *  ⚠️ ★멱등키 — 같은 요청이 두 번 가도 «한 번» 만 처리되게 합니다. */
    const auth64 = Buffer.from(`${secret}:`).toString('base64')
    const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth64}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': orderId,
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
    const paid = await res.json() as {
      totalAmount?: number; status?: string; method?: string
      code?: string; message?: string
    }
    if (!res.ok) {
      console.error('[toss/confirm] 승인 실패', paid.code, paid.message)
      return fail(paid.message || '결제 승인에 실패했어요.', 400)
    }

    /*  ── ④ 🔴🔴 ★«진짜로 받은» 돈인가 ──────────────────────────
     *  [2026-09-22 찾음] 결제수단을 «토스가 주는 대로 다» 보여 주므로
     *    손님이 ★«가상계좌» 를 고를 수 있습니다 (충전 화면에 단추가 있습니다).
     *  🔴 가상계좌는 승인해도 ★status 가 'WAITING_FOR_DEPOSIT' 입니다 —
     *     «아직 입금하지 않은» 것인데 ★totalAmount 는 «적혀서» 옵니다.
     *     ⇒ 그대로 넣으면 ★한 푼도 «안 내고» 지갑이 채워집니다.
     *  ⛔ ★'DONE' 일 때만 넣습니다. 낱말을 느슨하게 풀지 마십시오.
     *  ⚠️ 입금을 «나중에» 받아 넣으려면 ★웹훅이 있어야 합니다 (지금 없습니다).
     *     ⇒ 그 전까지는 결제위젯 어드민에서 ★가상계좌를 «꺼» 두는 편이 낫습니다. */
    if (paid.status !== 'DONE') {
      console.error('[toss/confirm] 아직 받지 못한 결제', orderId, paid.status, paid.method)
      return fail(
        paid.status === 'WAITING_FOR_DEPOSIT'
          ? '아직 입금이 확인되지 않았어요. 입금이 확인되면 넣어 드릴게요.'
          : '결제가 아직 끝나지 않았어요. 잠시 뒤 지갑에서 확인해 주세요.',
        400,
      )
    }

    /*  ── ⑤ 지갑에 넣기 ─────────────────────────────────────────
     *  🔴 ★토스가 «돌려준» 금액만 씁니다 (totalAmount). 손님이 보낸 값이 아닙니다.
     *  🔴🔴 [2026-09-22 고침] 처음에는 ★wallet_charge 를 불렀는데, 그 함수는
     *     ★«master 만» 부를 수 있습니다 (auth.uid() → profiles.role 검사).
     *     서버 열쇠로 부르면 auth.uid() 가 «없어» ★늘 'not_master' 로 거절당했습니다.
     *     ⇒ 「결제는 됐는데 지갑에 넣지 못했어요」 가 그것이었습니다.
     *  ⇒ ★«서버만» 부를 수 있는 함수를 따로 만들어 씁니다 — wallet_charge_paid
     *     (_SQL_wallet_charge_paid.sql · anon·authenticated 에게서 권한을 걷었습니다).
     *  ⛔ ★wallet_charge 로 되돌리지 마십시오. 관리자 화면 몫입니다.
     *  ⛔ 기존 wallet_charge 에 「auth.uid() 가 없으면 통과」 를 넣지 «마십시오» —
     *     로그인 «안 한» 손님도 없습니다 ⇒ ★누구나 무한 충전이 됩니다. */
    const won = Number(paid.totalAmount)
    if (!Number.isFinite(won) || won <= 0) {
      console.error('[toss/confirm] 승인은 됐는데 금액이 이상합니다', paid)
      return fail('결제는 됐는데 금액 확인에 실패했어요. 고객센터로 알려 주세요.', 500)
    }

    const { data: chg, error: chgErr } = await sb.rpc('wallet_charge_paid', {
      p_user_id: userId, p_amount: won, p_service: 'myc', p_memo: orderId,
    })
    const chgRes = chg as { ok?: boolean; reason?: string; balance?: number } | null
    if (chgErr || !chgRes?.ok) {
      /*  🔴 ★가장 나쁜 자리입니다 — 돈은 빠졌는데 지갑에 «안» 들어갔습니다.
       *  ⛔ 손님에게 «성공» 이라 하지 마십시오. 기록을 남기고 사실대로 알립니다.
       *  ⚠️ [2026-09-22] ★«까닭»(reason)을 버리고 있어서 무엇이 막혔는지
       *     로그만 보고는 알 수 없었습니다. ⛔ 이 줄에서 reason 을 빼지 마십시오. */
      console.error('[toss/confirm] 승인됐으나 충전 실패', orderId, won,
        '· 오류:', chgErr?.message ?? '-', '· 까닭:', chgRes?.reason ?? '-')
      return fail(
        '결제는 됐는데 지갑에 넣지 못했어요. 고객센터로 알려 주시면 바로 넣어 드릴게요.',
        500,
      )
    }

    return NextResponse.json({
      ok: true,
      amount: won,
      balance: chgRes.balance ?? null,
    })
  } catch (e: unknown) {
    console.error('[toss/confirm]', e instanceof Error ? e.message : e)
    return fail('결제를 마무리하지 못했어요. 잠시 뒤 다시 해 주세요.', 500)
  }
}
