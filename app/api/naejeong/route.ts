// app/api/naejeong/route.ts
//
//  POST /api/naejeong — 일진내정법 셈 창구  ★2026-09-15 (9부) 신설
//
//  ┌──────────────────────────────────────────────────────────────────┐
//  │  ⛔⛔ ★«연재쌤 전용» 입니다 [대표님 2026-09-15].                   │
//  │     맨 앞에서 ★requireMaster() 로 «누가 부르는지» 를 확인합니다.   │
//  │     ⛔ 이 두 줄을 빼지 마십시오 —                                  │
//  │       화면만 숨기는 것은 «막는 것이 아닙니다». 주소를 치면 열립니다.│
//  │                                                                  │
//  │  ⛔ 말을 ★«순화하지 않습니다». 교재 그대로 내보냅니다.             │
//  │     ⇒ 손님용을 만드실 때는 ★새 창구를 만들고 거기서 순화하십시오.  │
//  └──────────────────────────────────────────────────────────────────┘
//
//  ⛔ AI 는 ★한 번도 안 부릅니다.
//  ⚠️ 다만 ★KASI 는 «부릅니다» — 년·월 간지가 ★절기를 봐야 하기 때문입니다.
//     (처음에 「호출 0」 이라 적었다가 ★tsc 가 인자를 잡아 주어 알았습니다)
//     · 일진   getDayGanji        — 바깥 안 부름
//     · 음력   koreanLunarTable   — 바깥 안 부름 (오프라인 한국 표)
//     · 년·월  getYearGanji/getMonthGanji — ★절기 때문에 KASI
//     ⇒ ★연재쌤 한 분이 쓰시는 도구라 호출량은 적습니다.
//     ⛔ 손님용으로 넓히실 때는 ★호출 횟수를 «값으로» 세십시오 (7부 0-1).

import { NextResponse } from 'next/server'
import { requireMaster } from '../admin/_guard'
import { getDayGanji, getYearGanji, getMonthGanji } from '@/lib/saju/ganji'
import { calcHourPillar } from '@/lib/saju/hourPillar'
import { solarToLunarKR, lunarToSolarKR, lunarRangeKR } from '@/lib/saju/koreanLunarTable'
import { judgeWonguk, sinGungTable, sinGungByMonth, sinGungOf, JARI_MEANING } from '@/lib/saju/naejeong/sinGung'
import { SINGUNG_TEXT } from '@/lib/saju/naejeong/tables/sinGungText'
//  ★교재 9쪽(띠로 보는 오늘) · 10~11쪽(달로 보는 한 해) 글
import { TTI_TEXT, WOL_TEXT } from '@/lib/saju/naejeong/tables/dayYearText'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

export async function POST(req: Request) {
  //  🔴 ⛔ 맨 앞 — «누가 부르는지» 를 먼저 봅니다
  const g = await requireMaster()
  if (!g.ok) return g.res

  try {
    const b = (await req.json()) as Record<string, unknown>

    /* ── ① 문점일 (상담하러 오신 날) — 기본은 오늘 ────────────────── */
    const now = new Date()
    const my = num(b.munYear) || now.getFullYear()
    const mm = num(b.munMonth) || now.getMonth() + 1
    const md = num(b.munDay) || now.getDate()
    const munGanji = getDayGanji(my, mm, md)
    if (!munGanji) {
      return NextResponse.json({ error: '문점일 일진을 셈하지 못했어요.' }, { status: 400, headers: NO_STORE })
    }
    const ilJi = munGanji[1]

    /* ── ② 손님 사주 — 생년월일(양/음) + 시 ────────────────────────
     *  ⚠️ ★태어난 시를 모르면 시지는 «없는 채로» 둡니다.
     *     ⛔ 지어내면 사업·자식 자리가 통째로 어긋납니다. */
    const by = num(b.birthYear), bm = num(b.birthMonth), bd = num(b.birthDay)
    if (!Number.isInteger(by) || !Number.isInteger(bm) || !Number.isInteger(bd)) {
      return NextResponse.json({ error: '생년월일을 확인해 주세요.' }, { status: 400, headers: NO_STORE })
    }

    let sy = by, sm = bm, sd = bd
    if (String(b.calType ?? '양력') === '음력') {
      const r = lunarToSolarKR(by, bm, bd, b.leapMonth === true || b.leapMonth === '1')
      if (!r) {
        const g2 = lunarRangeKR()
        return NextResponse.json(
          { error: `${g2.start.getUTCFullYear()}년 ~ ${g2.end.getUTCFullYear()}년 사이만 볼 수 있어요.` },
          { status: 400, headers: NO_STORE })
      }
      sy = r.year; sm = r.month; sd = r.day
    }

    //  ⚠️ 년·월 간지는 ★절기를 봅니다 — 공용 부품에 맡깁니다 (여기서 다시 셈하지 않습니다)
    //  ⚠️ ★절기를 보려면 KASI 키가 필요합니다 — 만세력과 «같은 창구» 를 씁니다
    const apiKey = process.env.KASI_API_KEY ?? ''
    const yearGanji = await getYearGanji(sy, sm, sd, apiKey)
    const monthGanji = await getMonthGanji(sy, sm, sd, apiKey)
    const dayGanji = getDayGanji(sy, sm, sd)
    if (!yearGanji || !monthGanji || !dayGanji) {
      return NextResponse.json({ error: '사주를 셈하지 못했어요.' }, { status: 500, headers: NO_STORE })
    }

    const hIdx = b.hourIdx === null || b.hourIdx === undefined || b.hourIdx === '' ? null : num(b.hourIdx)
    const hourGanji = hIdx !== null && Number.isInteger(hIdx) && hIdx >= 0 && hIdx <= 11
      ? calcHourPillar(dayGanji[0], hIdx) : null

    /* ── ③ 신궁 대입 ──────────────────────────────────────────── */
    const hits = judgeWonguk(ilJi, {
      yeon: yearGanji[1], wol: monthGanji[1], il: dayGanji[1],
      si: hourGanji ? hourGanji.branch : null,
    })

    //  ⛔ 교재 글을 «그대로» 실어 보냅니다 — 순화 없습니다
    const dressed = hits.map(h => {
      const t = h.sin ? SINGUNG_TEXT[h.sin] : null
      return {
        ...h,
        jariMeaning: JARI_MEANING[h.jari],
        hanja: t?.hanja ?? null,
        alias: t?.alias ?? [],
        tteut: t?.tteut ?? null,
        /*  ⚠️ 교재에 «자리별 풀이가 없는» 신궁이 넷 있습니다 (공망·원진·해결·퇴식).
         *     ⇒ null 로 보냅니다. 화면이 ★사실대로 말합니다. ⛔ 지어내지 않습니다. */
        jariText: t && t.jari && h.jari ? t.jari[h.jari] : null,
        lead: t?.lead ?? null,
      }
    })

    /* ── ④ 곁들이 — 오늘의 운세(띠)와 신년 운세(달) ─────────────
     *  교재 9쪽 · 10~11쪽. ★같은 셈을 씁니다. */
    const ttiSin = sinGungOf(ilJi, yearGanji[1])

    return NextResponse.json({
      mun: { year: my, month: mm, day: md, ganji: munGanji, ilJi },
      saju: {
        yeon: yearGanji, wol: monthGanji, il: dayGanji,
        si: hourGanji ? `${hourGanji.stem}${hourGanji.branch}` : null,
        solar: { year: sy, month: sm, day: sd },
        lunar: solarToLunarKR(sy, sm, sd),
      },
      hits: dressed,
      /** 열두 지지 표 — 교재 3쪽 */
      table: sinGungTable(ilJi).map(x => ({ ...x, good: SINGUNG_TEXT[x.sin] ? undefined : undefined })),
      /**
       * 오늘의 운세 — 띠(연지)로 보는 것 (교재 9쪽)
       * ⚠️ 교재 제목이 ★「그날에만 유용」 입니다 — 문점일이 바뀌면 값도 바뀝니다.
       * ⛔ 교재에 «줄이 없는» 신궁(상문·공망)은 ★null 입니다. 지어내지 않습니다.
       */
      tti: { ji: yearGanji[1], sin: ttiSin, text: ttiSin ? TTI_TEXT[ttiSin] : null },
      /**
       * 신년 운세 — 달마다 (교재 10~11쪽)
       * ⚠️ 교재가 ★「상담하러 방문한 날을 기준으로 한다」 고 못 박았습니다.
       */
      months: sinGungByMonth(ilJi).map(m => ({
        ...m, text: m.sin ? WOL_TEXT[m.sin] : null,
      })),
    }, { headers: NO_STORE })

  } catch {
    return NextResponse.json({ error: '셈하지 못했어요.' }, { status: 500, headers: NO_STORE })
  }
}
