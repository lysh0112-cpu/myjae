/**
 *  하락이수 1단계 — 수리 변환 · 분배 · 선천괘 · 후천괘 · 동효
 *  2026-09-14 (8부)
 *
 *  ★노트 「하락이수3」 ②장의 «차례 열두 가지» 를 그대로 옮긴 것입니다.
 *
 *     1~4  천간 · 월지 · 년지 · 일지 를 수로 바꾼다      (표는 tables/suri)
 *     5    년칸 윗수 = ★나이
 *     6    월칸 윗수 = ★그 음력 달의 «마지막 날짜» (29 또는 30)
 *          일칸 윗수 = ★음력 생일의 «날짜»
 *     7    년 다 더해 ÷8 · 월 다 더해 ÷6 · 일 다 더해 ÷3 — ★나머지
 *     8    년 → 내괘 · 월 → 외괘 · 일 → 동효(1·2·3)
 *     9    ★내괘를 먼저 부르고 외괘를 부른다   ⇒ 주역의 «상괘 + 하괘» 차례
 *    10    ★외괘에서 동효를 만든다
 *    11    내괘 + 동효를 만든 외괘 = ★후천괘
 *    12    동효에서 찾는다
 *
 *  🔴 ★말이 헷갈리는 자리입니다 —
 *     하락이수의 「내괘」 = 년에서 나온 괘 = 주역의 ★상괘(위)
 *     하락이수의 「외괘」 = 월에서 나온 괘 = 주역의 ★하괘(아래)
 *     ⇒ 노트 ⑨번 「내괘를 먼저 부른다」 가 그 증거입니다 (뇌풍항 = 뢰가 위).
 *     ⛔ 뒤집지 마십시오 — 뒤집으면 일곱 건이 «전부» 다른 괘가 됩니다.
 *
 *  ⚠️ 노트가 ★년·월·일 «세 칸» 뿐입니다. 시주(時柱)를 쓰지 않습니다.
 *     ⇒ 태어난 시를 모르는 손님도 ★그대로 보실 수 있습니다.
 *
 *  ⛔ 이 파일은 AI 를 ★한 번도 부르지 않습니다. 순수 계산입니다.
 */

import {
  GAN_SU, WOLJI_SU, nyeonjiSu, iljiSu, EUMNYEOK_WOL_JI,
  PALGWAE, PALGWAE_HYO, PALGWAE_KO, palgwaeOfHyo, gwaeName, GWAE_KO, GWAE_NO,
} from './tables/suri'

/* ── 간지 읽기 ──────────────────────────────────────────────────
 *  ★기존 splitGanji(lib/saju/career/calcPerson.ts)와 «같은 방식» 입니다.
 *    「甲子」 · 「갑자(甲子)」 둘 다 받습니다.
 * ─────────────────────────────────────────────────────────────── */
export interface GanJi { gan: string; ji: string }

export function splitGanjiHaerak(g: string): GanJi | null {
  if (!g) return null
  const m = g.match(/\(([^)]+)\)/)
  const s = m && m[1].length >= 2 ? m[1] : g
  const gan = s[0] ?? '', ji = s[1] ?? ''
  if (!(gan in GAN_SU)) return null
  if (!(ji in WOLJI_SU)) return null
  return { gan, ji }
}

/** 음력 달(1~12)이 어느 지지인지 — ⛔ 절기가 아니라 «음력 달» 입니다 */
export function jiOfEumnyeokWol(wol: number): string {
  return (wol >= 1 && wol <= 12) ? EUMNYEOK_WOL_JI[wol] : ''
}

/* ── 나머지 셈 ──────────────────────────────────────────────────
 *  ⛔ 0 을 그대로 두지 마십시오 — 괘에 0번, 효에 0번은 «없습니다».
 *     노트 ④장 「딱 떨어지면 0」 은 계산기 눈금 이야기입니다.
 *     실제로는 ★나눈 수 그대로(8·6·3)를 씁니다 (일곱 건이 그렇습니다).
 * ─────────────────────────────────────────────────────────────── */
export function namuji(total: number, divisor: number): number {
  const r = total % divisor
  return r === 0 ? divisor : r
}

/* ── 한 칸 ──────────────────────────────────────────────────────── */
export type KanKind = 'nyeon' | 'wol' | 'il'

export interface KanSu {
  kind: KanKind
  ganj: GanJi
  top: number
  ganSu: number
  jiSu: number
  total: number
}

/**
 *  한 칸을 수로 바꿉니다.
 *  ⛔ kind 를 반드시 넣으십시오 — ★지지 표가 칸마다 «다릅니다».
 */
export function kanSu(kind: KanKind, ganji: string, top: number): KanSu | null {
  const ganj = splitGanjiHaerak(ganji)
  if (!ganj) return null
  if (!Number.isFinite(top)) return null

  const jiSu =
    kind === 'wol' ? WOLJI_SU[ganj.ji]
    : kind === 'nyeon' ? nyeonjiSu(ganj.ji)
    : iljiSu(ganj.ji)
  if (jiSu === null || jiSu === undefined) return null

  const ganSu = GAN_SU[ganj.gan]
  return { kind, ganj, top, ganSu, jiSu, total: top + ganSu + jiSu }
}

/* ── 괘 한 벌 ───────────────────────────────────────────────────── */
export interface Gwae {
  sang: string
  ha: string
  sangKo: string
  haKo: string
  /** 64괘 이름 (한자) */
  name: string
  /** 64괘 이름 (한글) */
  nameKo: string
  /** ★하락이수 도표 번호 — 풀이 글을 찾을 때 씁니다 (주역 차례와 «다릅니다») */
  no: number
}

function makeGwae(sang: string, ha: string): Gwae | null {
  const name = gwaeName(sang, ha)
  if (!name) return null
  return {
    sang, ha,
    sangKo: PALGWAE_KO[sang] ?? '',
    haKo: PALGWAE_KO[ha] ?? '',
    name, nameKo: GWAE_KO[name] ?? '',
    no: GWAE_NO[name] ?? 0,
  }
}

/**
 *  동효를 밟아 «하괘» 한 줄을 뒤집습니다 (노트 ⑩번).
 *  ⛔ 상괘를 바꾸지 마십시오 — 노트는 «외괘(=하괘)» 에서 만듭니다.
 */
export function bakkunHagwae(ha: string, hyo: number): string {
  const src = PALGWAE_HYO[ha]
  if (!src || hyo < 1 || hyo > 3) return ''
  const next: [number, number, number] = [src[0], src[1], src[2]]
  next[hyo - 1] = next[hyo - 1] === 1 ? 0 : 1
  return palgwaeOfHyo(next)
}

/* ── 온 셈 ──────────────────────────────────────────────────────── */
export interface HaerakInput {
  /** 그 해의 간지 — 「丙午」 (세운) */
  nyeonGanji: string
  /** 그 해 · 손님 음력 생월의 간지 — 「丁酉」 */
  wolGanji: string
  /** 그 해 · 손님 음력 생일의 간지 — 「乙未」 */
  ilGanji: string
  /**
   *  ★나이 (노트 ⑤번) — 세는나이
   *  🔴 ★«보러 오시는 그때» 의 나이입니다 [대표님 2026-09-14]
   *     ⇒ 한 분이 «올해와 내년» 을 함께 보셔도 나이는 ★하나입니다.
   *     ⇒ 해가 바뀌어 «다시» 보러 오시면 그때 한 살 올립니다.
   *  ⛔ «보는 해» 마다 한 살씩 더하지 마십시오 — 괘가 달라집니다.
   */
  nai: number
  /**
   *  ★그 음력 달의 마지막 날짜 — ⛔ «29 또는 30» 뿐입니다 [대표님 2026-09-14]
   *     음력에 31일은 «없습니다». 작은달은 29 그대로 · 큰달은 30 으로만 셉니다.
   */
  wolLastDay: number
  /** ★음력 생일의 날짜 (1~30) */
  eumIl: number
  /** 시를 모르는 손님. ★이 셈은 시주를 안 쓰므로 답이 달라지지 않습니다. */
  hourUnknown?: boolean
}

export interface HaerakResult {
  su: { nyeon: number; wol: number; il: number }
  kan: { nyeon: KanSu; wol: KanSu; il: KanSu }
  /**
   *  동효(動爻) — 1·2·3 (노트 ⑦번 「일 ÷3」)
   *  🔴 ★원당(元堂)과 «같은 것» 으로 봅니다 [대표님 2026-09-14]
   *     원당 = 그 괘에서 «나를 대표하는 중심 효».
   *  ⛔ ★손님 화면에 「원당」 이라는 낱말을 «쓰지 마십시오» [대표님 2026-09-14]
   *     ⇒ 손님이 뜻을 모르는 말입니다. 6부 「한자말을 쓰지 마십시오」 와 같은 결입니다.
   *     ⇒ 화면에는 「세 번째 자리」 처럼 «숫자와 쉬운 말» 로만 보이십시오.
   */
  dongHyo: number
  seoncheon: Gwae
  hucheon: Gwae
  hourUnknown: boolean
}

export function calcHaerak(input: HaerakInput): HaerakResult | null {
  //  ⛔ 음력에 31일은 없습니다 — 조용히 넘기지 않고 «막습니다»
  if (input.wolLastDay !== 29 && input.wolLastDay !== 30) return null

  const nyeon = kanSu('nyeon', input.nyeonGanji, input.nai)
  const wol = kanSu('wol', input.wolGanji, input.wolLastDay)
  const il = kanSu('il', input.ilGanji, input.eumIl)
  if (!nyeon || !wol || !il) return null

  //  ⑧ 년 → 내괘(주역의 상괘) · 월 → 외괘(주역의 하괘) · 일 → 동효
  const sang = PALGWAE[namuji(nyeon.total, 8)] ?? ''
  const ha = PALGWAE[namuji(wol.total, 6)] ?? ''
  const dongHyo = namuji(il.total, 3)

  const seoncheon = makeGwae(sang, ha)
  if (!seoncheon) return null

  //  ⑩⑪ 외괘(=하괘)에서 동효를 만들고, 내괘와 이어 부른다
  const ha2 = bakkunHagwae(ha, dongHyo)
  const hucheon = makeGwae(sang, ha2)
  if (!hucheon) return null

  return {
    su: { nyeon: nyeon.total, wol: wol.total, il: il.total },
    kan: { nyeon, wol, il },
    dongHyo, seoncheon, hucheon,
    hourUnknown: !!input.hourUnknown,
  }
}
