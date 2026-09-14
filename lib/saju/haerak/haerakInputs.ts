/**
 *  하락이수 — 셈에 넣을 ★«재료» 를 만드는 곳
 *  2026-09-14 (8부)
 *
 *  calcHaerak 이 받는 여섯 가지를 여기서 만듭니다 —
 *     년 간지 · 월 간지 · 일 간지 · 나이 · 그 달 마지막 날 · 음력 생일
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │  ⛔⛔ ★절기(節氣)를 쓰지 마십시오.                                  │
 *  │     하락이수 달력은 ★«음력 달» 이 그대로 지지입니다 (1월=寅 … 12월=丑).│
 *  │     ⇒ 기존 getMonthGanji() 는 ★절기 기준이라 «다른 물건» 입니다.    │
 *  │       끌어다 쓰면 달이 통째로 어긋납니다.                          │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 *  ★맞춰 본 것 — 손글씨 노트 일곱 건의 «간지 스물한 개» 와 «윗수 스물한 개»
 *     (검사 54 에서 값으로 잽니다)
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │  🔴🔴 ★2026-09-14 (9부) — «부본만 쓰던 것» 을 고쳤습니다          │
 *  │                                                                  │
 *  │  [8부에 있던 일]  이 파일이 ★일부러 빈 키('')를 넘겨              │
 *  │     부본(lunar-javascript)만으로 셈했습니다.                      │
 *  │     「바깥을 안 부르니 값이 늘 같다」 는 까닭이었습니다.            │
 *  │                                                                  │
 *  │  [무엇이 틀렸나]  ★그 부본이 «한국천문연구원 달력과 다릅니다».     │
 *  │     · 양 2026-10-10 → 부본 「음 9.1」 · ★한국 「음 8.30」          │
 *  │     · 양 2027-02-06 → 부본 「음 1.1」 · ★한국 「음 12.30」(섣달그믐)│
 *  │     ⇒ 손글씨 노트 일곱 건 중 ★월말 넷 · 일진 하나가 어긋났습니다.  │
 *  │     ⇒ 괘가 통째로 바뀝니다 (희준 26년은 선천·후천이 «맞바뀜»).     │
 *  │                                                                  │
 *  │  [누가 찾았나]  ★대표님이 「초하루 9/11, 말일 10/10 — 30일 아니냐」 │
 *  │     한 줄 물어 주셔서 드러났습니다 (2026-09-14).                   │
 *  │                                                                  │
 *  │  ⛔ ★규칙은 «처음부터 맞았습니다». 틀린 것은 «달력» 이었습니다.    │
 *  │     ⇒ 8부에 적힌 「−2달 · +2달」 따위로 ⛔ 규칙을 비틀지 마십시오. │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 *  ⛔ AI 는 한 번도 부르지 않습니다.
 *  🔴 ★달력은 «정본(KASI)» 을 씁니다 — apiKey 를 ★반드시 넘기십시오.
 *     ⇒ 빈 키를 넘기면 부본으로 떨어지고 ★괘가 틀립니다.
 *     ⇒ 그래서 apiKey 를 «기본값 없는 필수 인자» 로 두었습니다.
 *       (빠뜨리면 tsc 가 잡습니다 — 말이 아니라 값으로 막습니다)
 */

import { getDayGanji } from '@/lib/saju/ganji'
import { solarToLunar, lunarToSolar, type LunarSource, type SolarYmd } from '@/lib/saju/lunarConvert'
import { EUMNYEOK_WOL_JI } from './tables/suri'

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
const JI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

/* ── ① 그 해의 간지 (세운) ────────────────────────────────────────
 *  ⛔ 입춘을 «안 봅니다». 하락이수는 «그 해» 를 통째로 봅니다.
 *     노트 — 26년 丙午 · 27년 丁未 (입춘 전후를 가르지 않았습니다)
 * ─────────────────────────────────────────────────────────────── */
export function nyeonGanjiOf(year: number): string {
  const g = ((year - 4) % 10 + 10) % 10
  const j = ((year - 4) % 12 + 12) % 12
  return GAN[g] + JI[j]
}

/* ── ② 그 해 · 그 음력 달의 간지 (월운) ────────────────────────────
 *  오호둔(五虎遁) — 년간으로 «정월(寅)의 천간» 이 정해지고 거기서 이어 셉니다.
 *     甲己년 → 丙寅  ·  乙庚년 → 戊寅  ·  丙辛년 → 庚寅
 *     丁壬년 → 壬寅  ·  戊癸년 → 甲寅
 *  ⛔ 음력 1월이 寅 입니다. 절기와 무관합니다.
 * ─────────────────────────────────────────────────────────────── */
export function wolGanjiOf(year: number, eumWol: number): string {
  if (eumWol < 1 || eumWol > 12) return ''
  const ji = EUMNYEOK_WOL_JI[eumWol]
  if (!ji) return ''
  const yGan = GAN.indexOf(nyeonGanjiOf(year)[0] as typeof GAN[number])
  if (yGan < 0) return ''
  //  甲(0)·己(5) → 丙(2) 에서 시작. 년간을 5로 나눈 나머지로 정해집니다.
  const head = (2 + (yGan % 5) * 2) % 10        // 丙 戊 庚 壬 甲
  const step = (JI.indexOf(ji as typeof JI[number]) - 2 + 12) % 12   // 寅 부터 몇 칸
  return GAN[(head + step) % 10] + ji
}

/* ── ③ 그 해 · 그 음력 날의 간지 (일진) ────────────────────────────
 *  음력 → 양력으로 옮긴 뒤 일진을 셉니다.
 *  🔴 ★달력이 하루만 어긋나도 일진이 통째로 바뀝니다.
 *     류 님 27년 — 음 2027.1.12 를
 *        부본 「양 2.17」 ⇒ 丁卯   ❌
 *        ★한국 「양 2.18」 ⇒ 戊辰  ✅ 노트와 같습니다
 *     ⇒ 8부에 「연재쌤께 여쭐 것」 으로 남아 있던 자리가 ★이것이었습니다.
 * ─────────────────────────────────────────────────────────────── */
export async function ilGanjiOf(
  year: number, eumWol: number, eumIl: number, isLeap: boolean,
  /** ⛔ 빈 문자열이면 부본으로 떨어집니다 — source 를 «반드시» 보십시오 */
  apiKey: string,
): Promise<{ ganji: string; source: LunarSource }> {
  const r = await lunarToSolar({ year, month: eumWol, day: eumIl, isLeap }, apiKey)
  const s = r.value
  if (!s) return { ganji: '', source: r.source }
  return { ganji: getDayGanji(s.year, s.month, s.day), source: r.source }
}

/* ── ④ 그 음력 달의 «마지막 날» ────────────────────────────────────
 *  ✅ ★규칙 확정 [연재쌤 · 대표님 2026-09-14]
 *     「★볼 해(올해나 내년)의 달력에서, ★태어난 음력 달이
 *       큰달(30)인지 작은달(29)인지를 본다」
 *     ⇒ 태어난 «달 번호» 는 평생 고정이고, 그 달의 «대소» 는 해마다 달력이 정합니다.
 *     ⇒ ★달력만 있으면 누구든 셀 수 있는 값입니다. 사람이 적어 넣지 않습니다.
 *  ⛔ ★29 또는 30 뿐입니다. 31은 «없습니다» — 음력에는 31일이 아예 없습니다.
 *
 *  🔴🔴 ★2026-09-14 (9부) — 8부의 기록을 «바로잡습니다»
 *     8부에는 「노트 넷이 규칙과 어긋난다 · 연재쌤이 ★노트 쪽 착오라 확인」
 *     이라 적혀 있었습니다. ⛔ ★그것이 틀렸습니다.
 *     ⇒ ★노트가 «다 맞았습니다». 틀린 것은 ★부본 달력이었습니다 —
 *        희준26 음8월  30 ✅  (양 2026-10-10 이 음 8.30 · 한국천문연구원)
 *        도이26 음12월 30 ✅  (양 2027-02-06 이 음 12.30 · 섣달그믐)
 *        도이27 음12월 30 ✅  (2028 설날 1/27 · 그 전날 1/26 이 음 12.30)
 *        류  27 음1월  29 ✅  (음 2월 1일이 양 2027-03-08)
 *     ⇒ ⛔ 연재쌤께 ★틀린 전제로 여쭈어 틀린 확인을 받은 것입니다.
 *       답을 «듣고 닫지» 말고 ★그 자리에서 값으로 재라 — 8부 §2② 그대로였습니다.
 *
 *  [어떻게]  🔴 ★«있는 날짜» 만 물어봅니다.
 *     초하루 → 양력 A  ·  A 에서 29일 뒤 → 양력 C
 *     C 를 음력으로 되돌려 ★아직 그 달 30일이면 큰달 · 다음 달이면 작은달.
 *  ⛔ ★「그 달 30일이 있느냐」 고 «묻지» 마십시오 (8부 방식) —
 *     ★없는 날짜입니다. 부본은 null 을 주지만 ★KASI 는 그렇게 답해 주지 않습니다.
 *     ⇒ 정본이 못 알아듣고 «부본으로 떨어져» 고친 보람이 사라집니다.
 *     ⇒ 검사 54 ㉓ 이 day: 30 을 «묻는 코드» 가 되살아나는지 봅니다.
 * ─────────────────────────────────────────────────────────────── */
export async function wolLastDayOf(
  year: number, eumWol: number, isLeap: boolean,
  /** ⛔ 빈 문자열이면 부본으로 떨어집니다 — source 를 «반드시» 보십시오 */
  apiKey: string,
): Promise<{ last: 29 | 30 | null; source: LunarSource }> {
  //  ① 그 달 «초하루» 의 양력 날짜 — ★있는 날짜입니다
  const first = await lunarToSolar({ year, month: eumWol, day: 1, isLeap }, apiKey)
  if (!first.value) return { last: null, source: first.source }

  //  ② 거기서 «29일 뒤» 도 ★반드시 있는 날짜입니다 (달은 29일보다 짧지 않습니다)
  const c = plusDays(first.value, 29)
  const back = await solarToLunar(c, apiKey)
  const src = worse(first.source, back.source)
  if (!back.value) return { last: null, source: src }

  //  ③ 그날이 «아직 그 달 30일» 이면 큰달, 벌써 다음 달로 넘어갔으면 작은달
  const b = back.value
  const still = b.year === year && b.month === eumWol && b.isLeap === isLeap && b.day === 30
  return { last: still ? 30 : 29, source: src }
}

/** 양력 날짜에 며칠을 더합니다 (⛔ 시간대에 흔들리지 않게 UTC 로 셉니다) */
function plusDays(s: SolarYmd, n: number): SolarYmd {
  const t = Date.UTC(s.year, s.month - 1, s.day) + n * 86400000
  const d = new Date(t)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

/** 둘 중 «못 미더운» 쪽 — 하나라도 부본이면 부본입니다 */
function worse(a: LunarSource, b: LunarSource): LunarSource {
  return a === 'KASI' && b === 'KASI' ? 'KASI' : 'FALLBACK_LUNAR_JS'
}

/* ── ⑤ 나이 ───────────────────────────────────────────────────────
 *  🔴 ★«보러 오시는 그때» 의 세는나이입니다 [대표님 2026-09-14]
 *     ⇒ 한 분이 올해와 내년을 «함께» 보셔도 나이는 ★하나입니다.
 *  ⛔ «보는 해» 로 세지 마십시오. 괘가 달라집니다.
 * ─────────────────────────────────────────────────────────────── */
export function naiOf(birthSolarYear: number, todayYear: number): number {
  return todayYear - birthSolarYear + 1
}

/* ── ⑥ 한 번에 ────────────────────────────────────────────────────── */
export interface HaerakJaeryo {
  nyeonGanji: string
  wolGanji: string
  ilGanji: string
  nai: number
  wolLastDay: 29 | 30
  eumIl: number
  /**
   * 🔴 ★이 재료가 «어느 달력» 에서 나왔는가.
   *    'FALLBACK_LUNAR_JS' 이면 ⛔ 괘가 틀릴 수 있습니다 — 손님에게 내보내지 마십시오.
   */
  dalRyeok: LunarSource
}

/**
 *  손님 한 분 · 볼 해 하나로 재료 여섯 가지를 만듭니다.
 *  ⛔ 하나라도 못 만들면 ★null 입니다. 빈 값으로 넘기지 «않습니다».
 */
export async function jaeryoOf(args: {
  /** 태어난 «음력» 달 (1~12) */
  eumWol: number
  /** 태어난 «음력» 날 (1~30) */
  eumIl: number
  /** 태어난 해 — 양력 (나이 셈에 씁니다) */
  birthSolarYear: number
  /** 볼 해 (2026 · 2027 …) */
  year: number
  /** ★보러 오시는 해 — 나이의 기준 [대표님 2026-09-14] */
  todayYear: number
  /** 태어난 달이 윤달이었는가 */
  birthLeap?: boolean
  /**
   * 🔴 ★KASI 키. ⛔ 빈 문자열을 넘기지 마십시오 — 부본으로 떨어져 괘가 틀립니다.
   *    (검사에서 «부본이 어떻게 다른지» 를 재려고 일부러 '' 를 넘길 때만 씁니다)
   */
  apiKey: string
}): Promise<HaerakJaeryo | null> {
  const { eumWol, eumIl, birthSolarYear, year, todayYear, apiKey } = args
  if (eumWol < 1 || eumWol > 12) return null
  if (eumIl < 1 || eumIl > 30) return null

  const nyeonGanji = nyeonGanjiOf(year)
  const wolGanji = wolGanjiOf(year, eumWol)
  //  ⚠️ «볼 해» 의 그 달을 봅니다. 태어난 해가 윤달이었어도 볼 해에는 없을 수 있어
  //     ★윤달을 들고 가지 «않습니다» (평달로 봅니다).
  const il = await ilGanjiOf(year, eumWol, eumIl, false, apiKey)
  const wl = await wolLastDayOf(year, eumWol, false, apiKey)
  if (!nyeonGanji || !wolGanji || !il.ganji) return null
  //  ⛔ 못 재면 ★29 로 «때려 넣지» 않습니다 (8부는 그랬습니다) — 없는 채로 돌려보냅니다.
  if (wl.last === null) return null

  return {
    nyeonGanji, wolGanji, ilGanji: il.ganji,
    nai: naiOf(birthSolarYear, todayYear),
    wolLastDay: wl.last, eumIl,
    dalRyeok: worse(il.source, wl.source),
  }
}
