// ==========================================================================
//  홈 카드에 보이는 가격 — ★2026-09-18 (10부) 신설  [대표님]
//
//  ┌──────────────────────────────────────────────────────────────────┐
//  │  「홈화면 가격표도 만들어줘. 토글버튼이 있어야 해.                 │
//  │    나중에 토글을 꺼서 홈화면의 가격을 숨길 수도 있어야 해.」       │
//  │  · 서비스 ★전부 (열둘)                                            │
//  │  · 보여 줄 값은 ★AI 분석값 — 「10,000원~」                        │
//  │  · ★비회원(PG 심사관)도 보여야 함                                 │
//  └──────────────────────────────────────────────────────────────────┘
//
//  🔴🔴 ★왜 값을 «따로 적지» 않는가
//     홈에 보일 값을 ★따로 적어 두면 가격이 «네 곳» 이 됩니다 —
//       consult_prices · analysis_prices · mc_price · 그리고 홈 표.
//     ⇒ 대표님이 AI 값을 고치셔도 ★홈은 «옛 값» 을 계속 보여 줍니다.
//       화면은 멀쩡하고 «숫자만 조용히» 어긋납니다. (PriceManager 183행이
//       mc_price 를 두고 경고하는 것과 «똑같은» 결입니다)
//  ⇒ ★그래서 홈 값은 «AI 분석값에서 저절로» 옵니다 —
//     그 서비스의 AI 줄 중 ★«켜져 있는 것들의 가장 싼 값» 입니다.
//     ⇒ 「10,000원~」 의 «~» 가 그 뜻입니다 (더 비싼 갈래도 있다).
//  ⛔ home_prices.price 칸에 값을 적어 홈에 쓰지 마십시오. 표는 ★토글만 씁니다.
//
//  ⚠️ ★home_prices 표는 «보일지 말지»(show_price) «만» 씁니다.
//     ⛔ 줄이 없으면 ★«안 보임» 입니다 (없는 것을 켜진 것으로 보지 않습니다).
// ==========================================================================

import { EXAM_LUCK_NAME, HAERAK_NAME } from './homeFlags'

export type HomePriceService = {
  /** ★home_prices.service_key · consult_prices.price_key 와 «같은 낱말» */
  key: string
  /** ★홈 카드 이름 — SERVICES 의 name 과 «글자 하나까지» 같아야 합니다 */
  name: string
  /** ★그 서비스의 AI 분석 줄 — analysis_prices.price_key */
  ai: string[]
}

/**
 *  ★홈 카드 열둘.
 *
 *  ⛔⛔ ★PriceManager 의 PAIRS 와 «같은 짝» 이라야 합니다 —
 *      key 가 PAIRS.consult · ai 가 PAIRS.ai 의 k 입니다.
 *      ⇒ 어긋나면 홈이 «엉뚱한 값» 을 보여 줍니다.
 *      ⇒ ★검사 58 ② 가 두 표를 «대조» 합니다. 한쪽만 고치면 멈춥니다.
 *
 *  ⚠️ 이름(name)은 ★붙박이로 적지 «않은» 것이 둘 있습니다 —
 *     합격운·하락이수는 lib/homeFlags.ts 에서 옵니다 (7부 교훈).
 */
export const HOME_PRICE_SERVICES: HomePriceService[] = [
  { key: 'mulsang',     name: '내사주그림',        ai: ['mulsang_ai'] },
  { key: 'career',      name: '진로적성',          ai: ['career_ai'] },
  { key: 'haerak',      name: HAERAK_NAME,         ai: ['haerak_ai'] },
  { key: 'examluck',    name: EXAM_LUCK_NAME,
    ai: ['examluck_ai', 'examluck_pass', 'examluck_job', 'examluck_promo'] },
  { key: 'couple',      name: '궁합',              ai: ['couple_ai'] },
  { key: 'saju',        name: '내 사주와 운세보기', ai: ['saju_deep'] },
  { key: 'wedding',     name: '결혼택일',          ai: ['wedding_check', 'wedding_pick'] },
  { key: 'birth',       name: '출산택일',          ai: ['birth_pick'] },
  { key: 'moving',      name: '이사택일',          ai: ['moving_pick', 'moving_check'] },
  { key: 'naming',      name: '내 이름 정밀분석',   ai: ['naming_read', 'naming_hanja', 'naming_ai'] },
  { key: 'naming_baby', name: '내 아이 명품작명',   ai: ['naming_baby_ai'] },
  { key: 'tarot',       name: '타로',              ai: ['tarot_ai'] },
]

/** 홈이 받는 답 — 카드 이름 → 보여 줄 값 */
export type HomePriceMap = Record<string, { won: number; show: boolean }>

/** ⛔ 못 읽었을 때 — ★아무것도 안 보여 줍니다 (지어내지 않습니다) */
export const HOME_PRICES_NONE: HomePriceMap = {}

/**
 *  ★그 서비스의 «가장 싼 AI 값» 을 고릅니다.
 *
 *  ⚠️ ★«켜져 있는»(active) 줄만 셉니다 —
 *     대표님이 노출을 끄신 갈래의 값을 홈에 내걸면 안 됩니다.
 *  ⛔ 켜진 줄이 없거나 값이 0이면 ★null — 홈에 «안 나옵니다».
 *     ⚠️ 0원 상품은 PG 심사에서 ★심사 불가 사유입니다. 내걸지 않습니다.
 */
export function cheapestAi(
  rows: { price_key: string; price: number; active: boolean }[],
  aiKeys: string[],
): number | null {
  const live = rows
    .filter(r => aiKeys.includes(r.price_key) && r.active && r.price > 0)
    .map(r => r.price)
  return live.length > 0 ? Math.min(...live) : null
}
