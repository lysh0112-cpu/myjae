// ══════════════════════════════════════════════════════════════════
//  app/api/golf/read-photo/route.ts
//  ★2026-09-10 — 골프온 「사진으로 읽기」를 ★서버가 대신 부릅니다
//
//  [왜 만들었나]
//    전에는 골프온이 ★AI 열쇠를 «기기마다» 들고 있었습니다 (golf:aikey:v1).
//    ⇒ 회원 전체에게 열려면 열쇠를 나눠 줄 수 없습니다.
//    ⇒ 서버가 열쇠를 갖고, ★로그인·잔액을 본 뒤에만 부릅니다.
//
//  ⚠️⚠️ 1부 10-6 —
//     「★서버가 열쇠를 갖는 순간 «누가 부르든 사장님 돈» 입니다.
//       ⇒ ★로그인과 잔액 확인을 «반드시» 거치게 하십시오.」
//     ⇒ 그래서 이 길은 ★할 일이 «박혀» 있습니다. 앱이 프롬프트를 못 보냅니다.
//     ⛔ 「무엇을 시킬지」를 몸통으로 받도록 «절대» 바꾸지 마십시오 —
//        그 순간 누구든 사장님 열쇠로 아무거나 시킬 수 있습니다.
//
//  ★골프온이 보내는 것 (2026-09-10 골프온 회신 · 값 그대로)
//     헤더  Authorization: Bearer <Supabase access_token>
//     몸통  { image: "<base64 알맹이>", full: true|false, holes: 9|18 }
//     ⛔ 열쇠는 «안 보냅니다». ⛔ 프롬프트도 «안 보냅니다».
//
//  ★돌려주는 것
//     성공 — ★Anthropic 응답을 «그대로» (골프온은 fetch 주소 한 줄만 바꿉니다)
//     실패 — { error: { message: "…" } }  ⇒ 그 글이 손님 화면에 그대로 뜹니다
//
//  ⚠️ 값 — mc_price 의 ★glf/photo (2026-09-10 현재 200원)
//     ⛔ 금액을 여기에 적지 마십시오. 서버 함수가 mc_price 를 보고 정합니다.
//
//  ⚠️ 차감 시점 — ★일이 «끝난 뒤» 입니다 (2부 4장 원칙 ①의 결).
//     읽기가 실패하면 ⛔ «안 뺍니다». 뺀 뒤에 터지면 ★되돌립니다.
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { WALLET_GATE_ON_SERVER, SERVICE_GLF } from '@/lib/wallet/serverGate'

// ★2026-07-21 자국 — maxDuration 이 없으면 Vercel 기본 10초에 잘립니다.
//   사진 읽기는 오래 걸립니다. ⛔ 줄이지 마십시오.
export const runtime = 'nodejs'
export const maxDuration = 60

/** 손님 화면에 그대로 뜨는 모양입니다 (골프온이 j.error.message 를 읽습니다). */
function fail(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status })
}

/* ── 프롬프트 — ★골프온이 쓰던 것을 «글자 그대로» 옮겼습니다 (2026-09-10 회신)
 *   ⛔ 한 글자도 고치지 마십시오 — 읽기 결과가 갈립니다.
 *   ⚠️ 고치실 일이 생기면 ★골프온 창과 «함께» 고치십시오. 화면이 이 모양을 읽습니다.
 */
function promptFull(): string {
  return `이것은 골프장에서 인쇄해 준 스코어카드입니다.
아래 형태의 JSON 만 답하세요. 설명도 백틱도 붙이지 마세요.

{"date":"2026-09-05","place":"골프장 이름","courseA":"전반 코스","courseB":"후반 코스",
 "holes":18,"pars":[홀별 파],"players":[{"name":"이름","scores":[홀별 타수]}]}

규칙
- 확실히 못 읽은 칸은 숫자 대신 null 을 넣으세요. 짐작해서 채우지 마세요.
- 못 읽은 글자는 빈 문자열 "" 로 두세요.
- 이름은 사람 이름만. 합계 · OUT · IN · TOTAL · 파 같은 줄은 선수가 아닙니다.
- holes 는 홀 수입니다. 9 또는 18 입니다.
- pars 와 scores 는 1번 홀부터 순서대로 holes 개를 채우세요.
- courseA · courseB 는 전반 · 후반 코스 이름입니다 (동 · 서 · WEST 같은 것).
  9홀이면 courseB 는 "" 로 두세요.
- date 는 2026-09-05 모양으로. 사진에 없으면 "" 로 두세요.`
}

function promptQuick(holes: number): string {
  return `이것은 골프장에서 인쇄해 준 스코어카드입니다. ${holes}홀입니다.
아래 형태의 JSON 만 답하세요. 설명도 백틱도 붙이지 마세요.

{"pars":[홀별 파 ${holes}개],"players":[{"name":"이름","scores":[홀별 타수 ${holes}개]}]}

규칙
- 숫자를 확실히 못 읽은 칸은 숫자 대신 null 을 넣으세요. 짐작해서 채우지 마세요.
- 이름은 사람 이름만. 합계·OUT·IN·TOTAL 같은 줄은 선수가 아닙니다.
- 홀별 타수는 왼쪽 홀부터 순서대로 ${holes}개를 채우세요.`
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return fail('서버 설정이 아직 안 됐어요. 관리자에게 알려 주세요.', 500)

    // ── ① 누구세요 ─────────────────────────────────────────────
    //   ⛔ 이 자리를 빼지 마십시오 — 빼는 순간 «누가 부르든 사장님 돈» 입니다.
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    if (!token) return fail('로그인이 필요해요.', 401)

    /* ★손님의 토큰을 «그대로» 들고 도는 창구를 만듭니다.
     *   ⇒ 그래야 wallet_* 함수 안의 auth.uid() 가 ★그 손님이 됩니다.
     *   ⛔⛔ service_role 키를 쓰지 마십시오 — RLS 를 무시해 ★남의 지갑을 만집니다.
     */
    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { data: userData } = await supa.auth.getUser()
    if (!userData?.user) return fail('로그인이 풀렸어요. 다시 로그인해 주세요.', 401)

    // ── ② 무엇을 보내셨나 ───────────────────────────────────────
    const body = await req.json().catch(() => null)
    const image = typeof body?.image === 'string' ? body.image : ''
    const full = body?.full === true
    const holes = body?.holes === 9 ? 9 : 18

    if (!image) return fail('사진이 없어요.', 400)
    // ⚠️ 골프온은 1600px·품질 0.8 로 줄여 보냅니다 (300KB 안팎 · base64 로 400KB쯤).
    //    ⛔ 상한을 올리지 마십시오 — 크면 느려지고 값도 오릅니다.
    if (image.length > 8_000_000) return fail('사진이 너무 커요. 다시 찍어 주세요.', 400)

    // ── ③ 잔액이 되나 (일 «전» 에 한 번) ────────────────────────
    //   ⚠️ 관문이 꺼져 있으면 «묻지도 빼지도» 않습니다 — 지금까지와 똑같이 돕니다.
    if (WALLET_GATE_ON_SERVER) {
      const { data: chk, error: chkErr } = await supa.rpc('wallet_check', {
        p_service: SERVICE_GLF, p_item: 'photo', p_qty: 1,
      })
      if (chkErr) return fail('잔액을 확인하지 못했어요. 잠시 뒤 다시 해주세요.', 500)
      if (chk && chk.ok === false) {
        const need = Number(chk.need ?? 0)
        const bal = Number(chk.balance ?? 0)
        return fail(
          `잔액이 모자라요. 사진 읽기에 ${need.toLocaleString()}원이 들어요. ` +
          `지금 ${bal.toLocaleString()}원이에요.`,
          402
        )
      }
    }

    // ── ④ AI 에게 읽히기 ────────────────────────────────────────
    //   ⚠️ ★이미지가 «먼저», 글이 «나중» 입니다 [골프온 회신]. ⛔ 순서를 바꾸지 마십시오.
    //   ⚠️ model 은 ★골프온이 쓰던 것 그대로입니다 (도는 것이 확인된 값).
    //      ⚠️ 명카페의 다른 열두 길은 claude-sonnet-4-6 을 씁니다. ★일부러 다릅니다.
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: full ? promptFull() : promptQuick(holes) },
          ],
        }],
      }),
    })

    const aiJson = await aiRes.json().catch(() => null)

    /* ⛔⛔ ★실패했으면 «한 푼도» 빼지 않습니다.
     *   ⚠️ 1부 8-3 「API 셋이 실패해도 status 200」 — 그 자국을 여기서 되풀이하지 않습니다.
     *      ok 가 아니면 그대로 돌려보내고 ★차감 자리로 «안 내려갑니다».
     */
    if (!aiRes.ok || !aiJson) {
      const m = aiJson?.error?.message
      return fail(m ? `사진을 읽지 못했어요. (${m})` : '사진을 읽지 못했어요.', 502)
    }

    // ── ⑤ 일이 «끝났으니» 뺍니다 ────────────────────────────────
    //   ⚠️ 여기서 실패해도 ★손님에게는 결과를 드립니다.
    //      「읽어 놓고 돈 때문에 안 준다」가 «가장 나쁩니다». 못 뺀 것은 기록에 남습니다.
    if (WALLET_GATE_ON_SERVER) {
      const { error: useErr } = await supa.rpc('wallet_use', {
        p_service: SERVICE_GLF, p_item: 'photo', p_qty: 1,
        p_ref: null, p_memo: '골프온 사진으로 읽기',
      })
      if (useErr) console.warn('[golf/read-photo] 차감 실패 — 결과는 드림', useErr.message)
    }

    // ★Anthropic 응답을 «그대로» 돌려줍니다 [골프온 회신 ③]
    //   ⛔ 여기서 JSON 을 골라내지 마십시오 — 골프온이 지금 쓰는 코드가 그대로 돕니다.
    return NextResponse.json(aiJson)
  } catch (e: unknown) {
    const m = e instanceof Error ? e.message : ''
    console.error('[golf/read-photo]', m)
    return fail('사진을 읽지 못했어요. 잠시 뒤 다시 해주세요.', 500)
  }
}
