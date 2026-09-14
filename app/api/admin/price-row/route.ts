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
 *  🔴 ★mc_price 줄도 «함께» 만듭니다 (service='myc' · item=낱말).
 *     [까닭]  실제 차감은 ★mc_price 를 봅니다. 그 줄이 없으면 저장할 때
 *       「지갑 요금표 반영에 실패했습니다」 가 뜹니다 (2026-09-14 대표님 화면에서 확인).
 *     ⛔ 세 표를 «다» 만들어야 끝납니다 — 하나라도 빠지면 저장이 안 끝납니다.
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

    const body = (await request.json().catch(() => ({}))) as { key?: unknown; fill?: unknown }

    /*  🔴 ★2026-09-14 (8부) — 「지갑 요금표 채우기」
     *    [까닭]  가격 표에 줄이 있어도 ★mc_price 에 줄이 없으면 —
     *      · 저장할 때 「지갑 요금표 반영에 실패」 가 뜨고
     *      · 손님 결제 시트가 ★얼마인지 몰라 «안 열립니다» (지갑에 돈이 있어도)
     *      ⇒ 2026-09-14 대표님이 겪으신 일입니다.
     *    [무엇을]  ★이미 가격 표에 «있는» 낱말만 골라 mc_price 줄을 만듭니다.
     *      ⛔ 없던 낱말을 지어내지 않습니다. 값은 가격 표의 값을 그대로 옮깁니다.
     *      ⛔ 이미 있는 mc_price 줄은 «건드리지» 않습니다. */
    if (body.fill === true) {
      const sbF = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
      const [c, a, mc] = await Promise.all([
        sbF.from('consult_prices').select('price_key, label, price'),
        sbF.from('analysis_prices').select('price_key, label, price'),
        sbF.from('mc_price').select('item').eq('service', 'myc'),
      ])
      const have = new Set((mc.data ?? []).map(r => r.item))
      const want = [...(c.data ?? []), ...(a.data ?? [])].filter(r => !have.has(r.price_key))
      if (want.length === 0) return NextResponse.json({ ok: true, made: 0, names: [] })
      const { error } = await sbF.from('mc_price').insert(
        want.map(r => ({
          service: 'myc', item: r.price_key, label: r.label,
          price: r.price ?? 0, up_at: new Date().toISOString(),
        })),
      )
      if (error) {
        return NextResponse.json({ error: '지갑 요금표를 채우지 못했어요: ' + error.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, made: want.length, names: want.map(r => r.label) })
    }

    const { key } = body
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
    /*  🔴 ★지갑 요금표(mc_price) 줄도 «함께» 봅니다.
     *     보이기용 표에 줄이 있어도 여기가 비어 있으면 저장이 안 끝납니다. */
    const { data: hadMc, error: mcReadErr } = await sb.from('mc_price')
      .select('item').eq('service', 'myc').eq('item', key).maybeSingle()
    if (mcReadErr) {
      return NextResponse.json({ error: '지갑 요금표를 읽지 못했어요: ' + mcReadErr.message }, { status: 500 })
    }
    if (!hadMc) {
      const { error: mcErr } = await sb.from('mc_price')
        .insert({ service: 'myc', item: key, label: spec.label, price: 0, up_at: new Date().toISOString() })
      if (mcErr) {
        return NextResponse.json({ error: '지갑 요금표 줄을 만들지 못했어요: ' + mcErr.message }, { status: 500 })
      }
    }

    if (had) return NextResponse.json({ ok: true, made: !hadMc })

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
