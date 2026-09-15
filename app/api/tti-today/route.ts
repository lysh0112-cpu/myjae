// app/api/tti-today/route.ts
//
//  GET /api/tti-today — ★띠로 보는 오늘 (홈 화면용)  · 2026-09-15 (9부) 신설
//
//  ┌──────────────────────────────────────────────────────────────────┐
//  │  🔴 [대표님 2026-09-15]                                           │
//  │   「하루 동안은 ★모든 손님에게 결과가 동일하다.                     │
//  │     오늘 하루 딱 한 번만 셈해서 «담아 두고» 모두가 가볍게 쓰게」    │
//  │                                                                  │
//  │  ⇒ ★문점일 일진 하나로 12띠가 «다» 정해집니다.                    │
//  │    손님이 달라도 «같은 날» 이면 ★값이 똑같습니다.                  │
//  │    ⇒ 그래서 ★하루에 한 번만 셈하고 서버 메모리에 담아 둡니다.      │
//  └──────────────────────────────────────────────────────────────────┘
//
//  ⛔ AI 도 KASI 도 ★한 번도 안 부릅니다 —
//     일진은 getDayGanji(계산) 하나면 됩니다. 절기도 음력도 필요 없습니다.
//     ⇒ 담아 두지 않아도 가볍지만, 대표님 지시대로 ★한 번만 셈합니다.
//
//  ⚠️ ★로그인을 안 하셔도 볼 수 있습니다 — 띠만 있으면 되는 자리입니다.
//     ⛔ 손님의 «생년월일» 을 여기서 받지 «않습니다». 띠는 화면이 정해서 보냅니다.
//
//  ⛔ 말은 ★«순화한» 것을 내보냅니다 (tables/homeText.ts).
//     ⇒ 교재 원문은 ★/naejeong(연재쌤 전용)에서만 봅니다.

import { NextResponse } from 'next/server'
import { getDayGanji } from '@/lib/saju/ganji'
import { sinGungOf, JIJI } from '@/lib/saju/naejeong/sinGung'
import { TTI_HOME, WOL_HOME, HOME_PLAIN_NOTE } from '@/lib/saju/naejeong/tables/homeText'

export const dynamic = 'force-dynamic'

interface Row { ji: string; sin: string | null; head: string | null; body: string | null; good: boolean | null }
interface Payload {
  dayKey: string
  ilGanji: string
  ilJi: string
  /** 열두 띠 — ★하루 동안 «모두에게 같은» 값입니다 */
  tti: Row[]
  /** 이번 달 — 교재 10~11쪽 (홈에서는 «이번 달 하나» 만) [대표님] */
  month: { wol: number; ji: string; sin: string | null; head: string; body: string; good: boolean } | null
  note: string
}

/*  🔴 ★하루치 담아 두기 — 대표님 지시
 *  ⚠️ 서버 «메모리» 입니다. 서버가 새로 뜨면 사라집니다 —
 *     그때 한 번 더 셈할 뿐이라 ★탈이 없습니다 (셈이 가볍습니다).
 *  ⛔ 담는 열쇠에 ★«날짜» 를 넣으십시오. 안 넣으면 다음 날에도 옛것이 나갑니다.
 *  ⛔ 손님마다 다른 값을 여기 담지 마십시오 — ★모두가 같은 것을 봅니다. */
let cache: { key: string; body: Payload } | null = null

/** 음력 달의 지지 — 1월=寅 … 12월=丑 (교재 10쪽) */
const WOL_JI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']

function build(now: Date): Payload {
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate()
  const ilGanji = getDayGanji(y, m, d)
  const ilJi = ilGanji ? ilGanji[1] : ''

  const tti: Row[] = JIJI.map(ji => {
    const sin = ilJi ? sinGungOf(ilJi, ji) : null
    const t = sin ? TTI_HOME[sin] : null
    //  ⛔ 교재 9쪽에 «줄이 없는» 신궁(상문·공망)은 ★null 입니다. 지어내지 않습니다.
    return { ji, sin, head: t?.head ?? null, body: t?.body ?? null, good: t?.good ?? null }
  })

  /*  ⚠️ ★이번 «달» — 홈에서는 하나만 보여 드립니다 [대표님].
   *     ⛔ 양력 달을 그대로 쓰지 않습니다. 교재는 ★음력 달(1월=寅) 기준입니다.
   *     ⚠️ 여기서는 «오늘이 몇 번째 달인가» 를 ★양력 달로 어림합니다 —
   *       홈 카드는 «가볍게 보는» 자리이고, 정확한 달은 /naejeong 에서 봅니다.
   *       ⇒ 🔴 이 어림을 «정확히» 하려면 음력 달이 필요하고 그러면 표를 봐야 합니다.
   *         대표님이 원하시면 그때 바꾸십시오. 지금은 ★어림임을 화면에 밝힙니다. */
  const wolIdx = m - 1
  const wolJi = WOL_JI[wolIdx]
  const wolSin = ilJi ? sinGungOf(ilJi, wolJi) : null
  const wolText = wolSin ? WOL_HOME[wolSin] : null

  return {
    dayKey: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    ilGanji, ilJi, tti,
    month: wolSin && wolText
      ? { wol: m, ji: wolJi, sin: wolSin, head: wolText.head, body: wolText.body, good: wolText.good }
      : null,
    note: HOME_PLAIN_NOTE,
  }
}

export async function GET() {
  const now = new Date()
  const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`

  //  🔴 ★오늘 것을 이미 담아 두었으면 그것을 그대로 (셈하지 않습니다)
  if (cache && cache.key === key) {
    return NextResponse.json(
      { ...cache.body, cached: true },
      //  ⚠️ ★자정까지만 삽니다 — 날이 바뀌면 새로 받아 가게 합니다
      { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' } })
  }

  const body = build(now)
  cache = { key, body }
  return NextResponse.json(
    { ...body, cached: false },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' } })
}
