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
 *  ⛔ AI 를 한 번도 부르지 않습니다. 바깥 창구(KASI)도 안 부릅니다.
 *     ⇒ 부본(lunar-javascript)만으로 셉니다. 값이 늘 같습니다.
 */

import { getDayGanji } from '@/lib/saju/ganji'
import { solarToLunar, lunarToSolar } from '@/lib/saju/lunarConvert'
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
 *  ⛔ 부본만 씁니다 (바깥 창구를 안 부릅니다).
 * ─────────────────────────────────────────────────────────────── */
export async function ilGanjiOf(year: number, eumWol: number, eumIl: number, isLeap = false): Promise<string> {
  //  ⚠️ 이 부품은 { value, source, … } 를 줍니다. ★ok 가 «없습니다».
  //     키를 안 넘기면 부본(lunar-javascript)으로 셉니다 — 바깥 창구를 안 부릅니다.
  const r = await lunarToSolar({ year, month: eumWol, day: eumIl, isLeap }, '')
  const s = r.value
  if (!s) return ''
  return getDayGanji(s.year, s.month, s.day)
}

/* ── ④ 그 음력 달의 «마지막 날» ────────────────────────────────────
 *  ✅ ★규칙 확정 [연재쌤 · 대표님 2026-09-14]
 *     「★볼 해(올해나 내년)의 달력에서, ★태어난 음력 달이
 *       큰달(30)인지 작은달(29)인지를 본다」
 *     ⇒ 태어난 «달 번호» 는 평생 고정이고, 그 달의 «대소» 는 해마다 달력이 정합니다.
 *     ⇒ ★달력만 있으면 누구든 셀 수 있는 값입니다. 사람이 적어 넣지 않습니다.
 *  ⛔ ★29 또는 30 뿐입니다. 31은 «없습니다» — 음력에는 31일이 아예 없습니다.
 *  ⚠️ ★손글씨 노트 일곱 건 중 «넷» 이 이 규칙과 어긋납니다.
 *     ⇒ 연재쌤이 ★「노트 쪽 착오」 라 확인해 주셨습니다 (2026-09-14).
 *     ⇒ ⛔ 노트에 맞추려고 이 셈을 비틀지 마십시오.
 *  [어떻게]  그 달 30일이 «있는지» 물어봅니다.
 *     30일을 양력으로 옮겼다가 다시 음력으로 되돌렸을 때
 *     ★그대로 30일이면 큰달(30) · 아니면 작은달(29) 입니다.
 * ─────────────────────────────────────────────────────────────── */
export async function wolLastDayOf(year: number, eumWol: number, isLeap = false): Promise<29 | 30> {
  const r = await lunarToSolar({ year, month: eumWol, day: 30, isLeap }, '')
  if (!r.value) return 29
  const back = await solarToLunar(r.value, '')
  const b = back.value
  if (!b) return 29
  const same = b.year === year && b.month === eumWol && b.day === 30 && b.isLeap === isLeap
  return same ? 30 : 29
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
}): Promise<HaerakJaeryo | null> {
  const { eumWol, eumIl, birthSolarYear, year, todayYear } = args
  if (eumWol < 1 || eumWol > 12) return null
  if (eumIl < 1 || eumIl > 30) return null

  const nyeonGanji = nyeonGanjiOf(year)
  const wolGanji = wolGanjiOf(year, eumWol)
  //  ⚠️ «볼 해» 의 그 달을 봅니다. 태어난 해가 윤달이었어도 볼 해에는 없을 수 있어
  //     ★윤달을 들고 가지 «않습니다» (평달로 봅니다).
  const ilGanji = await ilGanjiOf(year, eumWol, eumIl, false)
  const wolLastDay = await wolLastDayOf(year, eumWol, false)
  if (!nyeonGanji || !wolGanji || !ilGanji) return null

  return { nyeonGanji, wolGanji, ilGanji, nai: naiOf(birthSolarYear, todayYear), wolLastDay, eumIl }
}
