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
import { HOME_FLAG_KEYS, HOME_FLAGS_OFF } from '@/lib/homeFlags'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json(HOME_FLAGS_OFF, { headers: NO_STORE })

    const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    /*  🔴 ★2026-09-14 (8부) — 낱말이 «둘» 이 되었습니다 (examLuck · haerak).
     *    ⛔ 하나만 읽으면 ★나머지가 «말없이 꺼짐» 이 됩니다 —
     *       홈에서 하락이수 카드가 안 뜬 까닭이 이것이었습니다 (대표님 화면에서 확인).
     *    ⚠️ 낱말을 더하시거든 ★여기도 «함께» 고치십시오. keys 가 곧 답입니다.
     *    ⛔ 정해진 낱말만 읽는 규칙은 그대로입니다 — in() 에 HOME_FLAG_KEYS 값만 넘깁니다. */
    /*  ★2026-09-21 (10부) — 낱말이 «셋» 이 되었습니다 (+ reviewLogin).
     *    🔴 낱말만 더하고 여기를 안 고쳤다가 ★검사 28 이 저를 «멈춰 세웠습니다».
     *       9부 ⑥ 「낱말을 더하면 읽는 창구도 «함께» 고치십시오」 그대로였습니다. */
    const keys = [HOME_FLAG_KEYS.examLuck, HOME_FLAG_KEYS.haerak, HOME_FLAG_KEYS.reviewLogin, HOME_FLAG_KEYS.sisterLinks]
    const { data } = await sb.from('app_settings').select('key, value').in('key', keys)
    const on = (k: string) => Number((data ?? []).find(r => r.key === k)?.value) === 1

    return NextResponse.json(
      {
        examLuck: on(HOME_FLAG_KEYS.examLuck),
        haerak: on(HOME_FLAG_KEYS.haerak),
        //  ★심사용 문 — ⛔ 줄이 없으면 «닫힘» 입니다 (on() 이 false 를 돌려줍니다)
        reviewLogin: on(HOME_FLAG_KEYS.reviewLogin),
        //  ★자매 앱 바로가기 — ⛔ 줄이 없으면 «숨김» 입니다
        sisterLinks: on(HOME_FLAG_KEYS.sisterLinks),
      },
      { headers: NO_STORE },
    )
  } catch {
    return NextResponse.json(HOME_FLAGS_OFF, { headers: NO_STORE })
  }
}
