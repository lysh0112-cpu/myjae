// ══════════════════════════════════════════════════════════════════
//  POST /api/admin/home-flags — ★2026-09-11 (6부) 신설 · 관리자만
//  홈 「합격운/취업운」 카드를 켜고 끕니다  body { examLuck: true | false }
//
//  [왜 서버 길인가]  app_settings 의 이 줄은 «아직 없습니다» — 처음 켤 때 «새로» 만듭니다.
//    화면에서 곧장 쓰면 ① 권한에 막혀 조용히 0줄이 되거나(5부 0-5)
//    ② 줄이 없어 고치기가 0줄이 됩니다. ⇒ 서버가 «있으면 고치고 없으면 만듭니다».
//  ⛔ requireMaster 를 맨 앞에서 빼지 마십시오 — service_role 은 권한을 통째로 무시합니다
//     (5부 10장 · 검사 ㉒-n 이 폴더째 봅니다).
//  ⛔ 참/거짓 «말고는» 받지 않습니다 — 글자 「false」 가 들어가면 «켜짐» 으로 읽힐 수 있습니다.
// ══════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireMaster } from '../_guard'
import { HOME_FLAG_KEYS } from '@/lib/homeFlags'

export async function POST(request: Request) {
  try {
    const g = await requireMaster()
    if (!g.ok) return g.res

    const { examLuck } = await request.json().catch(() => ({ examLuck: undefined }))
    if (typeof examLuck !== 'boolean') {
      return NextResponse.json({ error: '켜기/끄기 값이 이상해요.' }, { status: 400 })
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    const k = HOME_FLAG_KEYS.examLuck
    const now = new Date().toISOString()

    // ── 있으면 고치고, 없으면 만듭니다 (★바뀐 줄을 셉니다) ──────────
    const { data: had, error: readErr } = await sb.from('app_settings').select('key').eq('key', k).maybeSingle()
    if (readErr) return NextResponse.json({ error: '설정을 읽지 못했어요: ' + readErr.message }, { status: 500 })

    const { data, error } = had
      ? await sb.from('app_settings').update({ value: examLuck, updated_at: now }).eq('key', k).select('key')
      : await sb.from('app_settings').insert({ key: k, value: examLuck, updated_at: now }).select('key')
    if (error) return NextResponse.json({ error: '저장하지 못했어요: ' + error.message }, { status: 500 })
    if (!data || data.length === 0) {
      return NextResponse.json({ error: '저장되지 않았어요. 다시 해 주세요.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, examLuck })
  } catch (e: unknown) {
    const m = e instanceof Error ? e.message : ''
    return NextResponse.json({ error: '저장 중 문제가 생겼어요: ' + (m || '알 수 없음') }, { status: 500 })
  }
}
