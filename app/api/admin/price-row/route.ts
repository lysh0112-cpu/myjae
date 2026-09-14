/**
 *  POST /api/admin/price-row — ★가격 표에 «없는 줄» 을 만들어 줍니다
 *  2026-09-14 (8부)
 *
 *  [왜 필요한가]  가격 관리 화면은 ★DB 에 «이미 있는 줄» 만 그립니다.
 *     consult_prices / analysis_prices 에 줄이 없으면 토글을 켜도 ★아무것도 안 보입니다.
 *     ⇒ 6부에 합격운을 넣을 때는 대표님이 Supabase 에서 손으로 넣으셨습니다.
 *       ⛔ 그건 다음 사람이 «모르는 일» 입니다. 그래서 화면에서 만들 수 있게 합니다.
 *
 *  ⛔ ★정해진 낱말만 만듭니다 (ALLOW). 아무 줄이나 못 만듭니다.
 *  ⛔ ★이미 있으면 «건드리지» 않습니다 — 넣어 두신 값이 0으로 덮이지 않게.
 *  ⚠️ 실제 차감은 ★mc_price 를 봅니다 — 여기서는 «보이기용 두 표» 만 만듭니다.
 *     mc_price 줄은 지금까지처럼 대표님이 따로 넣으셔야 합니다.
 */
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireMaster } from '../_guard'

/** ⛔ 여기 적힌 낱말만 만들 수 있습니다 */
const ALLOW: Record<string, { table: 'consult_prices' | 'analysis_prices'; label: string }> = {
  haerak: { table: 'consult_prices', label: '하락이수' },
  haerak_ai: { table: 'analysis_prices', label: '하락이수 분석' },
}

export async function POST(request: Request) {
  try {
    const g = await requireMaster()
    if (!g.ok) return g.res

    const { key } = (await request.json().catch(() => ({}))) as { key?: unknown }
    const spec = typeof key === 'string' ? ALLOW[key] : undefined
    if (!spec) {
      return NextResponse.json({ error: '만들 수 없는 낱말이에요.' }, { status: 400 })
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    //  ⛔ 이미 있으면 그대로 둡니다 — 넣어 두신 값을 «덮지» 않습니다
    const { data: had, error: readErr } = await sb.from(spec.table)
      .select('price_key').eq('price_key', key).maybeSingle()
    if (readErr) {
      return NextResponse.json({ error: '표를 읽지 못했어요: ' + readErr.message }, { status: 500 })
    }
    if (had) return NextResponse.json({ ok: true, made: false })

    /*  ★처음 값 — 가격 0 · 꺼짐.
     *  ⛔ 0 으로 두는 것은 «공짜» 가 아니라 «아직 안 정했다» 는 뜻입니다.
     *     대표님이 값을 넣고 켜셔야 손님께 보입니다. */
    const row = spec.table === 'consult_prices'
      ? { price_key: key, label: spec.label, price: 0, active: false }
      : { price_key: key, label: spec.label, price: 0, active: false }
    const { data, error } = await sb.from(spec.table).insert(row).select('price_key')
    if (error) {
      return NextResponse.json({ error: '만들지 못했어요: ' + error.message }, { status: 500 })
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: '만들어지지 않았어요. 다시 해 주세요.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, made: true })
  } catch {
    return NextResponse.json({ error: '만들지 못했어요.' }, { status: 500 })
  }
}
