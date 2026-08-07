export const BANKS = [
  '국민은행', '신한은행', '우리은행', '하나은행', 'IBK기업은행',
  'NH농협은행', '카카오뱅크', '토스뱅크', 'SC제일은행', '씨티은행',
  '부산은행', '대구은행', '광주은행', '전북은행', '경남은행',
  '새마을금고', '신협', '우체국', '수협은행', '케이뱅크',
]

// ══════════════════════════════════════════════════════════════════
//  ★2026-08-06 (48부 3차) — 전문분야를 «홈 서비스 열 개» 로 갈았습니다
//    [대표님]  「전문분야를 홈서비스 버튼에 맞춰서 각 상담사별로
//                토글로 연결할지 말지 버튼만 만들어 주면 된다」
//              「지금 관리자 페이지에서 고객결과화면에 보여주는
//                전문상담사 연결버튼을 보여줄지 말지를 결정하고 있으니」
//
//  ⚠️ ★옛 여덟(사주·운명 / 궁합·연애 / 재물·사업 / 신살·대운 /
//     개명·작명 / 타로·점술 / 풍수·이사 / 전반적 상담)은 ★버렸습니다
//     [대표님 「버리고 새 열 개로 갈음」]. 홈 서비스와 갈래가 안 맞았습니다.
//
//  ★key 는 ★consult_prices 의 price_key 와 «같은 값» 입니다 (47부 3-1 확정).
//     ⇒ 손님이 어느 화면에서 왔는지(ConsultButton 이 실어 보내는 priceKey)와
//        ★그대로 짝이 맞습니다. 새 배관을 깔 것이 없습니다.
//  ⛔ ★key 를 바꾸지 마십시오. consult_prices · ConsultButton 열두 곳과 어긋납니다.
//
//  ⚠️ 차례는 ★대표님이 적어 주신 그대로입니다. 홈 카드 차례와는 다릅니다.
//  ⚠️ ★2026-08-07 (48부 14차) — 이름을 «줄였습니다» (폼이 6열로 좁아졌습니다).
//     ⛔ 여기 name 은 ★관리자 토글에만 씁니다. 손님 화면 이름이 «아닙니다».
//        손님 화면 이름은 홈 SERVICES 와 consult_prices 에 따로 있습니다.
//  ⛔ 마음대로 정렬하지 마십시오.
//
//  ⚠️ ★한 서비스에 화면이 «둘» 인 것 — 결혼택일·출산택일·이사택일.
//     ★같은 price_key 를 씁니다. 그래서 토글은 «열 개» 입니다 (화면으로 세면 열둘).
// ══════════════════════════════════════════════════════════════════
export const SERVICE_SPECIALTIES = [
  { key: 'mulsang',     name: '사주그림',          icon: '🎨' },
  { key: 'career',      name: '진로적성',          icon: '🧭' },
  { key: 'couple',      name: '궁합',              icon: '💖' },
  { key: 'saju',        name: '사주·운세',        icon: '🔮' },
  { key: 'wedding',     name: '결혼택일',          icon: '💍' },
  { key: 'birth',       name: '출산택일',          icon: '🍼' },
  { key: 'moving',      name: '이사택일',          icon: '🏡' },
  { key: 'naming',      name: '이름 정밀분석',     icon: '📇' },
  { key: 'naming_baby', name: '명품작명',          icon: '👶' },
  { key: 'tarot',       name: '타로',              icon: '🃏' },
] as const

export type ServiceKey = typeof SERVICE_SPECIALTIES[number]['key']

// ★2026-08-06 (48부 4차) — 손님에게 보일 이름은 ★lib/consultantName.ts 에 있습니다.
//   ⚠️ 손님 화면이 «관리자 폴더» 를 들여오지 않도록 옮겼습니다.
export { shownName } from '@/lib/consultantName'

/** key → 이름 (목록·CSV 에서 씁니다) */
export function specialtyName(key: string): string {
  return SERVICE_SPECIALTIES.find(s => s.key === key)?.name ?? key
}

/** 고른 key 들을 사람이 읽는 한 줄로 — 손님 화면의 specialty 칸에 넣습니다 */
export function specialtyLabel(keys: string[]): string {
  if (!keys.length) return ''
  return keys.map(specialtyName).join(' · ')
}

export const REGIONS = [
  '서울', '경기', '인천', '부산', '대구', '광주', '대전',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남',
  '제주', '일본', '중국', '홍콩', '기타해외',
]

export function formatPhone(val: string) {
  return val.replace(/[^0-9]/g, '')
}

export function formatAmount(val: number) {
  return val.toLocaleString('ko-KR')
}
