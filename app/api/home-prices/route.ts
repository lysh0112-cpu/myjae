// ══════════════════════════════════════════════════════════════════
//  GET /api/home-prices — ★2026-09-18 (10부) 신설 · 손님 «누구나»
//  홈 카드에 「10,000원~」 을 보여 줄지, 얼마로 보여 줄지 알려 줍니다
//
//  🔴 ★비회원도 보여야 합니다 [대표님] —
//     PG 카드사 심사관이 ★로그인 없이 가격을 봅니다.
//     FAQ — 「가격 명시 없이 문의나 상담 창구만 확인되는 경우 입점 불가」
//
//  ⚠️ /api/home-flags 와 ★«같은 결» 로 만들었습니다. 문지기가 없는 대신 —
//     ① ★정해진 낱말(HOME_PRICE_SERVICES) «만» 읽습니다.
//        손님이 다른 표나 다른 줄을 골라 읽을 수 없습니다.
//     ② ★읽기만 합니다. 쓰는 길은 관리 화면(master)뿐입니다.
//     ③ 줄이 없거나 못 읽으면 ★«안 보임» — 없는 것을 켜진 것으로 보지 않습니다.
//  ⚠️ service_role 로 읽습니다 — 표의 권한 설정과 상관없이 늘 같은 답을 주려는 것입니다.
//     ⛔ 그래서 ①②를 풀면 안 됩니다 (검사 58 ④).
//
//  ⛔ 값은 ★analysis_prices 에서 «저절로» 옵니다. 홈용 값을 따로 두지 않습니다.
//     까닭은 lib/homePrices.ts 머리글에 적었습니다 (가격이 네 곳이 되는 것을 막습니다).
// ══════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  HOME_PRICE_SERVICES, HOME_PRICES_NONE, cheapestAi, type HomePriceMap,
} from '@/lib/homePrices'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json(HOME_PRICES_NONE, { headers: NO_STORE })

    const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

    //  ⛔ ★정해진 낱말만 — in() 에 우리 표의 값만 넘깁니다
    const aiKeys = HOME_PRICE_SERVICES.flatMap(s => s.ai)
    const svcKeys = HOME_PRICE_SERVICES.map(s => s.key)

    const [ai, home] = await Promise.all([
      sb.from('analysis_prices').select('price_key, price, active').in('price_key', aiKeys),
      sb.from('home_prices').select('service_key, show_price').in('service_key', svcKeys),
    ])

    const aiRows = (ai.data ?? []) as { price_key: string; price: number; active: boolean }[]
    const shown = new Set(
      ((home.data ?? []) as { service_key: string; show_price: boolean }[])
        .filter(r => r.show_price).map(r => r.service_key),
    )

    const out: HomePriceMap = {}
    for (const s of HOME_PRICE_SERVICES) {
      const won = cheapestAi(aiRows, s.ai)
      //  ⛔ 값이 없으면 «아예 안 담습니다» — 홈이 빈 줄을 그리지 않게
      if (won === null) continue
      out[s.name] = { won, show: shown.has(s.key) }
    }
    return NextResponse.json(out, { headers: NO_STORE })
  } catch {
    return NextResponse.json(HOME_PRICES_NONE, { headers: NO_STORE })
  }
}
