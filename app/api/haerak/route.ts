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
import { calcHaerak, namuji } from '@/lib/saju/haerak/haerakSuri'
import { jaeryoOf } from '@/lib/saju/haerak/haerakInputs'
import { hyoTextOf, type GwaePart } from '@/lib/saju/haerak/tables/gwaeText'
import { solarToLunarKR, lunarRangeKR } from '@/lib/saju/koreanLunarTable'
import { PALGWAE_HYO } from '@/lib/saju/haerak/tables/suri'
//  🔴 ★손님께 나가는 말을 순화합니다 — 표는 tables/plainMap.ts «한 곳» 입니다
import { plainWho, plainText, plainLead } from '@/lib/saju/haerak/tables/plainMap'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }

interface Body {
  year?: unknown; month?: unknown; day?: unknown
  calType?: unknown; leapMonth?: unknown
  target?: unknown
  /**
   * ⚠️ ★2026-09-14 (9부) — 이제 «안 씁니다».
   *    나이를 «보려는 해» 로 세도록 바뀌어, 볼 해(target)가 정해지면 나이도 정해집니다.
   *    ⇒ 옛 주소에 붙어 오더라도 ★조용히 무시합니다 (깨지지 않게 칸만 남겨 둡니다).
   */
  baseYear?: unknown
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

    /*  🔴🔴 ★나이는 «보려는 해» 의 나이입니다 — 2026-09-14 (9부) [연재쌤 확정]
     *
     *  [어떻게 밝혀졌나]  연재쌤이 ★2028년을 «34세» 로 셈해 주셨습니다.
     *     (희준 님 1995년생 ⇒ 2028년 세는나이 34)
     *     ⇒ 프로그램은 «상담 시점» 32세로 셈해 ★송/이 가 나왔고,
     *       34세로 넣으니 ★미제(94)/규(55) — 노트와 «한 글자도» 안 달랐습니다.
     *     ⇒ 간지 셋 · 월말 · 일수 · 동효는 ★처음부터 다 맞았습니다. 나이 하나였습니다.
     *
     *  ⚠️ ★8부에는 「보러 오시는 그때 기준 하나」 라 되어 있었습니다.
     *     옛 노트의 «두 해째» 세 장(희준·도이·류 2027)이 나이를 «안 올린 채» 였고,
     *     그걸 규칙으로 읽은 것입니다.
     *     ⇒ ★연재쌤이 「나이를 먹은 만큼 모두 고쳐야 한다」 고 확정해 주셨습니다.
     *
     *  ⛔⛔ ★todayYear 에 «오늘» 이나 «상담 시점» 을 넣지 마십시오.
     *     2027년부터 괘가 통째로 달라집니다. 검사 54 ㉕ 가 지킵니다.
     *  ⚠️ baseYear 를 «받던» 칸은 없앴습니다 — 볼 해가 정해지면 나이도 정해지므로
     *     다시보기에 따로 넘길 것이 없습니다 (옛 주소로 와도 그냥 무시됩니다). */
    const baseYear = target

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
      //  🔴 ★나이는 «보려는 해» 의 나이입니다 [연재쌤 2026-09-14 확정]
      //     ⛔ «오늘» 로 세지 마십시오 — 2027년부터 괘가 통째로 달라집니다.
      todayYear: baseYear,
    })
    if (!jae) {
      //  ⛔ 볼 해가 표 밖일 수도 있습니다 — 「셈 못 함」 보다 ★까닭을 말해 드립니다
      const g = lunarRangeKR()
      return NextResponse.json(
        { error: `${g.start.getUTCFullYear()}년 ~ ${g.end.getUTCFullYear()}년 사이만 볼 수 있어요.` },
        { status: 400, headers: NO_STORE })
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
        //  🔴 ⛔ ★머리글도 «반드시» 순화를 거칩니다 —
        //     9부에 이 한 줄을 빠뜨려 「부모의 상을 당해…」 가 그대로 나갔습니다.
        lead: t?.lead ? plainLead(no, r.dongHyo, t.lead) : null,
        /*  🔴 ★2026-09-14 (9부) [대표님] — «교재 원문» 이 아니라 «순화한 말» 을 내보냅니다.
         *     ⛔ 교재 파일은 «한 글자도» 안 고쳤습니다 — 원문은 거기 그대로 있습니다.
         *     ⛔ 여기서 p.who · p.text 를 «그대로» 내보내던 것으로 되돌리지 마십시오.
         *       되돌리면 손님께 「오래지 않아 수명을 다하게 된다」 가 그대로 나갑니다.
         *     ⇒ 검사 54 ㉘ 이 지킵니다. */
        parts: t ? keep.map(p => ({
          who: plainWho(p.who),
          text: plainText(no, r.dongHyo, p.who, p.text),
        })) : null,
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
      /*  🔴 ★나머지 수 — 2026-09-14 (9부) [대표님·연재쌤]
       *     연재쌤 노트에 붉게 동그라미 친 ★③⑥① 이 이것입니다.
       *  ⚠️ ★딱 떨어지면 «나눈 수» 를 그대로 씁니다 (42÷6 은 0 이 아니라 ★6).
       *     ⇒ namuji() 가 그 규칙을 갖고 있습니다. ⛔ 화면에서 다시 셈하지 마십시오.
       *  ⚠️ 일의 나머지는 ★동효와 «같은 값» 입니다 (따로 보내는 것은 대조를 쉽게 하려는 것). */
      namu: {
        nyeon: namuji(r.su.nyeon, 8),
        wol: namuji(r.su.wol, 6),
        il: namuji(r.su.il, 3),
      },
      seoncheon: dress(r.seoncheon.no, r.seoncheon.name, r.seoncheon.nameKo,
        r.seoncheon.sangKo, r.seoncheon.haKo, sixOf(r.seoncheon.sang, r.seoncheon.ha)),
      hucheon: dress(r.hucheon.no, r.hucheon.name, r.hucheon.nameKo,
        r.hucheon.sangKo, r.hucheon.haKo, sixOf(r.hucheon.sang, r.hucheon.ha)),
      //  ★대표님 대조용 — 화면 맨 아래에 작게 보입니다
      geunggeo: {
        nyeonGanji: jae.nyeonGanji, wolGanji: jae.wolGanji, ilGanji: jae.ilGanji,
        nai: jae.nai, wolLastDay: jae.wolLastDay, eumWol, eumIl,
        //  ★«몇 년 기준 몇 세» 로 보았는지 — 화면이 이 둘을 손님께 보여 드립니다
        baseYear,
      },
    }
    return NextResponse.json(out, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ error: '셈하지 못했어요.' }, { status: 500, headers: NO_STORE })
  }
}
