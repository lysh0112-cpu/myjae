import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireMaster } from '../../_guard'

// ============================================================================
// 관리자 — 회원 지갑 «읽기» 길    ★2026-09-10 (밤) 신설
//
// [왜 만들었나]
//   🔴 관리자 화면의 「회원 지갑」이 ★«그 회원을 못 찾았습니다» 만 띄웠습니다.
//      [겪은 일] 회원 목록에서 이름을 눌렀는데 지갑 화면이 못 찾았습니다.
//      [까닭]    화면이 ★브라우저에서 «곧장» profiles 를 불렀는데,
//                RLS 정책이 ★profiles_select_own = (auth.uid() = id) 입니다.
//                ⇒ ★«본인 것만» 읽힙니다. 관리자라도 남의 줄은 «안 보입니다».
//                ⇒ null 이 와서 「못 찾았습니다」가 뜬 것입니다.
//      ⚠️ ★정책이 잘못된 것이 «아닙니다». 손님이 남의 사주를 못 보게 막는 자리입니다.
//         ⛔ 그 정책을 풀지 마십시오 — 푸는 순간 손님이 남의 사주를 봅니다.
//      ⇒ ★그래서 «서버가 대신 읽어» 줍니다. 58부가 관리자 API 에 붙인 방식 그대로입니다.
//
//   ⚠️ 4부 0-5 의 「관리자 화면이 «조용히 0줄»」과 ★같은 뿌리입니다 —
//      브라우저에서 곧장 DB 를 부르는 자리들이 아직 남아 있습니다.
//
// [지키는 것]
//   ⛔⛔ service_role 은 RLS 를 «완전히 무시» 합니다.
//        ⇒ ★requireMaster() 를 «맨 앞» 에 둡니다. 빼면 ★남의 지갑이 열립니다.
//   ⛔ 이 길은 ★«읽기만» 합니다. 충전은 wallet_charge 함수가 합니다.
//      ⇒ 여기에 돈을 «넣는» 코드를 만들지 마십시오.
//
// [무엇을 하나]  what 으로 갈립니다
//   one     회원 하나 — id 로 (회원 목록에서 눌러 들어올 때)
//   search  닉네임·이름으로 찾기
//   ledger  그 회원의 지갑 내역
// ============================================================================

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function POST(request: Request) {
  try {
    /* ⛔⛔ 이 두 줄을 «맨 앞» 에서 빼지 마십시오 — 남의 지갑이 열립니다. */
    const g = await requireMaster()
    if (!g.ok) return g.res

    const { what, userId, keyword } = await request.json()
    const sb = admin()

    // ── 회원 하나 (id 로) ──────────────────────────────────────────
    if (what === 'one') {
      if (!userId) return NextResponse.json({ error: '회원 ID 가 필요합니다.' }, { status: 400 })
      const { data: p, error } = await sb
        .from('profiles').select('id, nickname, hangul_name').eq('id', userId).maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!p) return NextResponse.json({ error: '그 회원을 못 찾았습니다.' }, { status: 404 })

      /* ⚠️ 잔액 줄이 «없는» 분은 mc_wallet 에 줄이 아직 없습니다 → 0원으로 봅니다.
         ⛔ 오류로 다루지 마십시오. 충전을 «한 번도 안 받은» 분입니다. */
      const { data: w } = await sb
        .from('mc_wallet').select('balance').eq('user_id', userId).maybeSingle()
      return NextResponse.json({ member: { ...p, balance: w?.balance ?? 0 } })
    }

    // ── 닉네임·이름으로 찾기 ───────────────────────────────────────
    if (what === 'search') {
      const key = (keyword ?? '').trim()
      if (!key) return NextResponse.json({ list: [] })

      /* ⚠️ 두 칸을 «다» 훑습니다 — 화면엔 닉네임이 떠도
         대표님은 통장에 찍힌 «이름» 으로 치실 수 있습니다. */
      const { data, error } = await sb
        .from('profiles').select('id, nickname, hangul_name')
        .or(`hangul_name.ilike.%${key}%,nickname.ilike.%${key}%`)
        .limit(20)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const ids = (data ?? []).map(r => r.id)
      const { data: wallets } = ids.length
        ? await sb.from('mc_wallet').select('user_id, balance').in('user_id', ids)
        : { data: [] as { user_id: string; balance: number }[] }

      const bal = new Map((wallets ?? []).map(w => [w.user_id, w.balance]))
      return NextResponse.json({
        list: (data ?? []).map(r => ({ ...r, balance: bal.get(r.id) ?? 0 })),
      })
    }

    // ── 지갑 내역 ─────────────────────────────────────────────────
    if (what === 'ledger') {
      if (!userId) return NextResponse.json({ error: '회원 ID 가 필요합니다.' }, { status: 400 })
      const { data, error } = await sb
        .from('mc_ledger')
        .select('id, service, kind, item, amount, after, memo, at')
        .eq('user_id', userId)
        .order('at', { ascending: false })
        .limit(50)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ledger: data ?? [] })
    }

    return NextResponse.json({ error: '무엇을 할지(what)가 없습니다.' }, { status: 400 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    return NextResponse.json({ error: '서버 오류: ' + (msg || '알 수 없음') }, { status: 500 })
  }
}
