/**
 *  POST /api/haerak — ★하락이수 셈 창구
 *  2026-09-14 (8부)
 *
 *  [왜 서버인가]  음력 → 양력 부품(lunar-javascript)이 ★서버 것입니다.
 *     화면에서 부르면 꾸러미가 통째로 브라우저로 내려갑니다.
 *
 *  ⛔ AI 를 한 번도 부르지 않습니다.
 *
 *  🔴🔴 ★2026-09-14 (9부) — 달력을 «한국 표» 로 바꿨습니다
 *     8부에는 「바깥을 안 부르니 값이 늘 같습니다」 라 적혀 있었는데,
 *     ★그 «늘 같은 값» 이 «틀린 값» 이었습니다 (부본이 중국 기준).
 *     ⇒ 노트 일곱 건 중 ★월말 넷 · 일진 하나가 틀렸습니다.
 *     ⇒ 이제 ★lib/saju/koreanLunarTable.ts 를 봅니다 —
 *       한국천문연구원 음양력을 담은 ★오프라인 표입니다.
 *
 *  ✅ 바깥 창구를 ★한 번도 안 부릅니다 (KASI 도 안 부릅니다).
 *     ⇒ 호출 0번 · 지연 0 · 일일 한도 걱정 없음 · 값이 늘 같습니다.
 *  ⛔ 표 범위(1900~2051) 밖이면 ★괘를 내보내지 않고 «멈춥니다».
 *     ⇒ 틀린 괘를 드리는 것보다 ★「지금은 못 본다」 가 낫습니다.
 *
 *  ⛔ 못 셈하면 ★빈 값을 «지어내지» 않고 까닭을 적어 돌려줍니다.
 *  ⛔ 손님에게 나가는 값에 ★「원당」 이라는 낱말을 넣지 마십시오 [대표님 2026-09-14]
 */
import { NextResponse } from 'next/server'
import { calcHaerak } from '@/lib/saju/haerak/haerakSuri'
import { jaeryoOf } from '@/lib/saju/haerak/haerakInputs'
import { hyoTextOf, type GwaePart } from '@/lib/saju/haerak/tables/gwaeText'
import { solarToLunarKR, lunarRangeKR } from '@/lib/saju/koreanLunarTable'
import { PALGWAE_HYO } from '@/lib/saju/haerak/tables/suri'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }

interface Body {
  year?: unknown; month?: unknown; day?: unknown
  calType?: unknown; leapMonth?: unknown
  target?: unknown
}

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

/** 손님에게 보내는 한 괘 */
interface GwaeOut {
  no: number
  name: string
  ko: string
  sang: string
  ha: string
  /** 여섯 줄 — 아래(1효)부터 위(6효). true 가 양(⚊) */
  hyo: boolean[]
  /** 글이 아직 없으면 ★null — ⛔ 「준비 중」 을 지어내지 않습니다 */
  lead: string | null
  parts: { who: string; text: string }[] | null
  label: string | null
}

export async function POST(request: Request) {
  try {
    const b = (await request.json().catch(() => ({}))) as Body
    const y = num(b.year), m = num(b.month), d = num(b.day)
    const target = num(b.target)
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
      return NextResponse.json({ error: '생년월일이 이상해요.' }, { status: 400, headers: NO_STORE })
    }
    if (!Number.isInteger(target) || target < 1900 || target > 2200) {
      return NextResponse.json({ error: '볼 해가 이상해요.' }, { status: 400, headers: NO_STORE })
    }

    /*  ── ① 태어난 «음력» 달·날 구하기 ──────────────────────────────
     *  ⛔ 하락이수는 ★음력으로만 셉니다. 양력으로 넣으면 달이 통째로 어긋납니다. */
    let eumWol = m, eumIl = d
    if (String(b.calType ?? '양력') !== '음력') {
      const r = solarToLunarKR(y, m, d)
      //  ⛔ ★표 범위 밖이면 «생일 음력» 부터 알 수 없습니다. 여기서 멈춥니다.
      if (!r) {
        const g = lunarRangeKR()
        return NextResponse.json(
          { error: `${g.start.getUTCFullYear()}년 ~ ${g.end.getUTCFullYear()}년 사이만 볼 수 있어요.` },
          { status: 400, headers: NO_STORE })
      }
      eumWol = r.lunarMonth
      eumIl = r.lunarDay
    }
    //  ⚠️ 윤달에 태어나셨어도 «볼 해» 에는 그 윤달이 없을 수 있어 ★평달로 봅니다.
    void b.leapMonth

    /*  ── ② 재료 여섯 가지 ─────────────────────────────────────── */
    const jae = await jaeryoOf({
      eumWol, eumIl, birthSolarYear: y, year: target,
      //  🔴 나이는 ★«보러 오시는 그때» 기준입니다 [대표님 2026-09-14]
      //     ⛔ target 으로 세지 마십시오 — 괘가 달라집니다.
      todayYear: new Date().getFullYear(),
    })
    if (!jae) {
      return NextResponse.json({ error: '셈에 쓸 값을 만들지 못했어요.' }, { status: 500, headers: NO_STORE })
    }

    /*  ── ③ 괘 짓기 ─────────────────────────────────────────────── */
    const r = calcHaerak(jae)
    if (!r) {
      return NextResponse.json({ error: '괘를 짓지 못했어요.' }, { status: 500, headers: NO_STORE })
    }

    /*  ── ④ 글 붙이기 ───────────────────────────────────────────
     *  ⛔ 손님에게 «가린» 갈래(hide)는 빼고 보냅니다 [대표님 2026-09-14] */
    const dress = (no: number, name: string, ko: string, sang: string, ha: string, hyo: boolean[]): GwaeOut => {
      const t = hyoTextOf(no, r.dongHyo)
      const keep = (t?.parts ?? []).filter((p: GwaePart) => !p.hide)
      return {
        no, name, ko, sang, ha, hyo,
        label: t?.label ?? null,
        lead: t?.lead ?? null,
        parts: t ? keep.map(p => ({ who: p.who, text: p.text })) : null,
      }
    }

    /** 괘 그림 — 아래(1효)부터 위(6효). ★하괘가 «아래» 셋입니다 */
    const sixOf = (sang: string, ha: string): boolean[] =>
      [...(PALGWAE_HYO[ha] ?? []), ...(PALGWAE_HYO[sang] ?? [])].map(v => v === 1)

    const out = {
      target,
      //  ⛔ 「원당」 이라는 낱말을 내보내지 않습니다 — 숫자로만 보냅니다
      dongHyo: r.dongHyo,
      su: r.su,
      seoncheon: dress(r.seoncheon.no, r.seoncheon.name, r.seoncheon.nameKo,
        r.seoncheon.sangKo, r.seoncheon.haKo, sixOf(r.seoncheon.sang, r.seoncheon.ha)),
      hucheon: dress(r.hucheon.no, r.hucheon.name, r.hucheon.nameKo,
        r.hucheon.sangKo, r.hucheon.haKo, sixOf(r.hucheon.sang, r.hucheon.ha)),
      //  ★대표님 대조용 — 화면 맨 아래에 작게 보입니다
      geunggeo: {
        nyeonGanji: jae.nyeonGanji, wolGanji: jae.wolGanji, ilGanji: jae.ilGanji,
        nai: jae.nai, wolLastDay: jae.wolLastDay, eumWol, eumIl,
      },
    }
    return NextResponse.json(out, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ error: '셈하지 못했어요.' }, { status: 500, headers: NO_STORE })
  }
}
