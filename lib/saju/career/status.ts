// lib/saju/career/status.ts
//
// ┌──────────────────────────────────────────────────────────────────┐
// │  진로적성 — 지금 신분·직업                                          │
// │  2026-07-29                                                       │
// └──────────────────────────────────────────────────────────────────┘
//
// ★2026-07-29 대표님 지시로 「학생/성인」 둘을 여섯으로 넓혔습니다.
//
//   [왜 넓혔나]
//     취업준비생과 직장인은 둘 다 '성인'이지만 묻는 것이 아주 다릅니다.
//       취준생   어디로 들어갈까 · 어느 직무가 맞을까
//       직장인   여기 남을까 옮길까 · 내 전문성은 어디에 있나
//       사업가   조직을 어떻게 꾸릴까 · 혼자가 맞나 함께가 맞나
//     한 덩이로 묶어 두면 리포트가 두루뭉술해집니다.
//
//   ⚠️ 기존 `target: 'student' | 'adult'` 를 **없애지 않았습니다.**
//      카드 판정 부품 열 개가 이미 그 값을 받고 있습니다(교재가 학생/성인만 가릅니다).
//      신분에서 target 을 자동으로 뽑아 그대로 넘깁니다. 부품은 안 고쳐도 됩니다.

export type CareerStatus =
  | 'middle_high'   // 중·고등학생
  | 'university'    // 대학(원)생
  | 'jobseeker'     // 취업준비생
  | 'worker'        // 직장인
  | 'business'      // 자영업·프리랜서·사업가
  | 'other'         // 기타

export interface StatusOption {
  key: CareerStatus
  icon: string
  title: string
  sub: string
}

export const STATUS_OPTIONS: StatusOption[] = [
  { key: 'middle_high', icon: '🎒', title: '중·고등학생', sub: '문·이과와 학과, 고교 선택, 학업운까지' },
  { key: 'university', icon: '🎓', title: '대학(원)생', sub: '전공 적성과 앞으로 갈 길을 함께' },
  { key: 'jobseeker', icon: '📝', title: '취업준비생', sub: '어느 직무·어느 조직이 맞는지' },
  { key: 'worker', icon: '💼', title: '직장인', sub: '지금 자리와 이직·전직, 전문성의 방향' },
  { key: 'business', icon: '🏪', title: '자영업 · 프리랜서 · 사업가', sub: '혼자 가는 결인지, 함께 꾸리는 결인지' },
  { key: 'other', icon: '🧭', title: '기타', sub: '지금 자리에 얽매이지 않고 넓게' },
]

/**
 * 카드 판정 부품이 받는 옛 값으로 접는다.
 *   ★교재가 학생(입시)과 성인(직업)만 가르기 때문입니다. (126~139쪽 vs 162~191쪽)
 *   대학(원)생은 «학생» 쪽입니다. 전공·계열 이야기가 아직 살아 있는 자리입니다.
 */
export function statusToTarget(s: CareerStatus): 'student' | 'adult' {
  return s === 'middle_high' || s === 'university' ? 'student' : 'adult'
}

/** 「계열과 학과」 카드를 보여 줄 신분인가 — 학생 쪽만 */
export function showsGyeyeol(s: CareerStatus): boolean {
  return statusToTarget(s) === 'student'
}

export const STATUS_LABEL: Record<CareerStatus, string> = Object.fromEntries(
  STATUS_OPTIONS.map(o => [o.key, o.title]),
) as Record<CareerStatus, string>

/** 통변 프롬프트에 넘길 한 줄 — AI 가 누구에게 말하는지 알아야 합니다 */
export const STATUS_PROMPT: Record<CareerStatus, string> = {
  middle_high: '중·고등학생입니다. 부모가 함께 읽습니다. 계열·학과와 공부하는 결을 중심으로 말하고, 성적이나 형편을 탓하는 말로 들리지 않게 하세요.',
  university: '대학(원)생입니다. 전공을 이미 골랐을 수 있으니 "바꿔라"보다 "그 전공을 어떻게 쓰면 좋은가"로 풀어 주세요.',
  jobseeker: '취업준비생입니다. 어느 직무·어느 조직이 맞는지를 중심으로, 지금 당장 지원할 수 있는 결로 좁혀 주세요. 조급함을 나무라지 마세요.',
  worker: '직장인입니다. 이직·전직을 저울질할 수 있는 자리이니, 지금 자리에서 키울 전문성과 옮길 때 볼 것을 함께 짚어 주세요.',
  business: '자영업·프리랜서·사업가입니다. 조직을 꾸리는 결(혼자가 맞는지 함께가 맞는지)과 확장·수성의 때를 중심으로 봐 주세요.',
  other: '지금 신분을 따로 밝히지 않으셨습니다. 어느 자리에도 얽매이지 않게 넓게 풀어 주세요.',
}
