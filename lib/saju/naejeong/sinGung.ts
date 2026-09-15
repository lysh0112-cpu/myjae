/**
 *  일진내정법 — ★12신궁 셈  (2026-09-15 · 9부 신설)
 *  교재 : 「일진으로 푸는 사주 명리(삶)」 · 명리 일진내정법(초고)
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │  🔴 [셈법]  교재 2~3쪽                                            │
 *  │    문점일(방문일) 일진의 ★지지를 「강일진」 으로 놓고,              │
 *  │    12지지를 ★순행하며 이름을 붙인다 —                             │
 *  │                                                                  │
 *  │      강일진 → 천록 → 상문 → 목적 → 비부 → 공망                    │
 *  │            → 약일충 → 원진 → 해결 → 퇴식 → 금조건 → 백병주         │
 *  │                                                                  │
 *  │  ⇒ ★일진 하나만 알면 12지지에 이름이 «다» 정해집니다.              │
 *  │    AI 도 바깥 창구도 ★한 번도 안 부릅니다.                         │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 *  ⚠️ 교재 4쪽 — 「★공망과 원진을 찾는 법은 «저자에 따라 차이가 있음»」
 *     ⇒ 우리는 ★«순행 12자리» 방식을 씁니다 (이 교재의 방식).
 *     ⛔ 다른 방식(예: 순중공망)으로 «바꾸지» 마십시오 —
 *       바꾸려면 연재쌤 확인을 먼저 받으십시오.
 *
 *  ⚠️ 교재 1쪽 — 「★문의자가 상담을 «의뢰하는 상황» 이라야 적중률이 높다」
 *     ⇒ 그래서 이 셈은 ★연재쌤이 «상담 중에» 보시는 도구입니다.
 *
 *  ⛔ 이 파일은 ★«셈» 만 합니다. 풀이 글은 tables/sinGung.ts 에 있습니다.
 */

/** 지지 열둘 — ⛔ 차례를 바꾸지 마십시오 (순행이 이 차례입니다) */
export const JIJI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
export type Jiji = typeof JIJI[number]

/**
 *  ★12신궁 — 강일진에서 «순행» 하는 차례 그대로
 *  ⛔ 차례를 바꾸면 모든 풀이가 어긋납니다. 교재 2~3쪽입니다.
 */
export const SINGUNG = [
  '강일진', '천록', '상문', '목적', '비부', '공망',
  '약일충', '원진', '해결', '퇴식', '금조건', '백병주',
] as const
export type SinGung = typeof SINGUNG[number]

/**
 *  ★좋은 신궁 · 나쁜 신궁 — 교재 7쪽
 *  ⚠️ 「강일진」 은 교재가 «좋은 신궁» 에 넣었지만,
 *     뜻은 ★「두 마음으로 갈등한다」 입니다 (교재 3쪽). 마냥 좋은 것이 아닙니다.
 */
export const GOOD_SIN: readonly SinGung[] = ['해결', '천록', '목적', '금조건', '강일진']
export const BAD_SIN: readonly SinGung[] = ['상문', '비부', '백병주', '퇴식', '공망', '약일충', '원진']

/** 좋은 쪽인가 — 교재 7쪽 그대로 */
export function isGoodSin(s: SinGung): boolean {
  return GOOD_SIN.includes(s)
}

/**
 *  🔴 ★어느 지지가 무슨 신궁인가.
 *
 *  @param ilJi   문점일 일진의 ★지지 (이것이 「강일진」 이 됩니다)
 *  @param target 알고 싶은 지지
 *  ⛔ 못 읽는 글자면 null — «지어내지» 않습니다.
 */
export function sinGungOf(ilJi: string, target: string): SinGung | null {
  const a = JIJI.indexOf(ilJi as Jiji)
  const b = JIJI.indexOf(target as Jiji)
  if (a < 0 || b < 0) return null
  return SINGUNG[(b - a + 12) % 12]
}

/**
 *  ★열두 지지에 이름을 «다» 붙입니다 — 교재 3쪽의 표 그대로.
 *  ⇒ 강일진부터 순행 차례로 돌려줍니다 (子부터가 아닙니다).
 */
export function sinGungTable(ilJi: string): { ji: Jiji; sin: SinGung }[] {
  const a = JIJI.indexOf(ilJi as Jiji)
  if (a < 0) return []
  return SINGUNG.map((sin, i) => ({ ji: JIJI[(a + i) % 12], sin }))
}

/**
 *  ★사주 네 자리 — 교재 4쪽
 *  ⛔ 자리마다 «무엇을 보는지» 가 다릅니다. 섞지 마십시오.
 */
export const JARI = ['연지', '월지', '일지', '시지'] as const
export type Jari = typeof JARI[number]

/** 자리가 뜻하는 것 — 교재 4쪽 「명리 일진내정법에서 사주의 의미」 그대로 */
export const JARI_MEANING: Record<Jari, string> = {
  연지: '토지, 선산, 큰 부동산 등',
  월지: '집(가옥), 가정, 직장, 학교 등',
  일지: '안방, 배우자, 이성 관계 등',
  시지: '가게, 사업장, 자식 등',
}

export interface JariHit {
  jari: Jari
  /** 그 자리의 지지 — ★태어난 시를 모르면 시지는 null */
  ji: string | null
  sin: SinGung | null
  good: boolean | null
}

/**
 *  🔴 사주 네 지지에 신궁을 대입합니다 — 교재 3쪽 둘째 예시의 방식.
 *  ⚠️ ★시지는 «태어난 시를 모르면» null 입니다.
 *     ⛔ 모르는 채로 «지어내지» 마십시오 — 사업·자식 자리가 통째로 어긋납니다.
 */
export function judgeWonguk(
  ilJi: string,
  ji: { yeon: string; wol: string; il: string; si: string | null },
): JariHit[] {
  const one = (jari: Jari, j: string | null): JariHit => {
    if (!j) return { jari, ji: null, sin: null, good: null }
    const sin = sinGungOf(ilJi, j)
    return { jari, ji: j, sin, good: sin ? isGoodSin(sin) : null }
  }
  return [
    one('연지', ji.yeon),
    one('월지', ji.wol),
    one('일지', ji.il),
    one('시지', ji.si),
  ]
}

/**
 *  ★신년 운세 — 교재 10~11쪽
 *  문점일 일진에서 ★음력 달의 지지에 이름을 붙입니다.
 *  ⚠️ 교재 예시는 ★1월=寅 … 12월=丑 입니다 (인월부터).
 */
export const WOL_JI: Jiji[] = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']

export function sinGungByMonth(ilJi: string): { wol: number; ji: Jiji; sin: SinGung | null }[] {
  return WOL_JI.map((ji, i) => ({ wol: i + 1, ji, sin: sinGungOf(ilJi, ji) }))
}
