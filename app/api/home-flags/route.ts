// ══════════════════════════════════════════════════════════════════
//  GET /api/home-flags — ★2026-09-11 (6부) 신설 · 손님 누구나
//  홈에 「합격운/취업운」 카드를 보일지 알려 줍니다
//
//  ⚠️ 로그인 안 한 손님도 홈을 보므로 «문지기가 없습니다». 대신 —
//     ① ★정해진 낱말(HOME_FLAG_KEYS) «만» 읽습니다. 손님이 다른 설정을 골라 읽을 수 없습니다.
//     ② ★읽기만 합니다. 쓰는 길은 /api/admin/home-flags (관리자만) 입니다.
//     ③ 값이 «정확히 1» 일 때만 켜짐. 줄이 없거나 못 읽으면 ★꺼짐.
//        ⚠️ app_settings.value 는 ★숫자 칸입니다 — 켜짐 1 · 꺼짐 0 (2026-09-11 값으로 확인).
//  ⚠️ service_role 로 읽습니다 — 표의 권한 설정과 상관없이 늘 같은 답을 주려는 것입니다.
//     ⛔ 그래서 ①②를 풀면 안 됩니다 (검사 ㉒-u).
// ══════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { HOME_FLAG_KEYS } from '@/lib/homeFlags'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json({ examLuck: false }, { headers: NO_STORE })

    const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data } = await sb.from('app_settings')
      .select('value').eq('key', HOME_FLAG_KEYS.examLuck).maybeSingle()

    return NextResponse.json({ examLuck: Number(data?.value) === 1 }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ examLuck: false }, { headers: NO_STORE })
  }
}
