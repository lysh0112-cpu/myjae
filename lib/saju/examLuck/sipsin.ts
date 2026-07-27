// lib/saju/examLuck/sipsin.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  천간이든 지지든 십신을 읽어 주는 한 겹                            │
// └───────────────────────────────────────────────────────────────┘
//
// ★왜 필요한가 (2026-07-27)
//   yongsinNew.ts 의 sipsinOf() 는 **천간끼리 비교하는 함수**다.
//
//     const de = STEM_EL[dayStem], oe = STEM_EL[other]
//     if (!de || !oe) return ''        ← 지지는 STEM_EL 에 없다
//
//   지지를 넣으면 예외도 로그도 없이 빈 문자열을 돌려준다.
//   일간 10 × 지지 12 = 120 조합이 **전부** '' 로 떨어지는 것을 확인했다.
//   받는 쪽은 `both.includes('정관')` 이 그냥 false 가 될 뿐이라 티가 안 난다.
//   (14부 「조용히 실패하는 코드」)
//
//   examLuck 은 이걸 모르고 지지를 날것으로 넣고 있었다.
//     examScore.ts   jiSipsin = sipsinOf(dayStem, yBranch)   → 언제나 ''
//     hapchung.ts    readNatal() 이 p.branch 를 그대로 넣음   → 관성·인성·비겁
//                                                              글자에 지지가 하나도 안 담김
//   관성이 지지에만 있는 사람은 "원국에 관성이 없는 사람"으로 처리되어
//   상관정관(−5)·관인상생(+4)·재극인·식상극관·합거·형충이 줄줄이 죽었다.
//
// ★저장소의 약속을 따른다
//   다른 곳은 전부 지지를 **본기(本氣)로 바꿔서** sipsinOf 에 넣고 있었다.
//     career/gyeokguk.ts:62      sipsinOf(dayStem, BONGI[month.branch])
//     birth-timing/…/babyDescribeV7.ts:221  BRANCH_MAIN_STEM[du.branch]
//     coupleFilterV1.ts:800      HIDDEN[dayBranch]?.[2]   (지장간 정기)
//   examLuck 만 그 약속을 몰랐다. 여기서 같은 방식으로 감싼다.
//
// ★공용 파일은 건드리지 않는다 (작업지시 12장)
//   dayun.ts 에 getSipsinBranch() 가 이미 있지만 export 가 안 돼 있고,
//   그 파일은 사주보기·궁합·출산택일이 함께 쓴다.
//   hapchung.ts 가 삼합·방합 표를 다시 적어 둔 것과 같은 방식으로 여기서 해결한다.
//
// ★두 길이 같은 답을 내는지 확인했다
//   본기 방식과 dayun.ts 의 BRANCH_EL + BRANCH_YIN 방식은
//   120 조합 전부에서 답이 같다. 子(癸·음)·午(丁·음)·巳(丙·양)·亥(壬·양) 의
//   체용(體用)까지 어긋나지 않는다.

import { sipsinOf } from '../yongsinNew'

/**
 * 지지의 본기(本氣) — 그 지지의 본래 기운이 되는 천간.
 * career/gyeokguk.ts 의 BONGI, birth-timing 의 BRANCH_MAIN_STEM 과 같은 표다.
 */
export const BONGI: Record<string, string> = {
  子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙',
  午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬',
}

/** 이 글자가 지지인가 */
export const isBranch = (ch: string): boolean => !!ch && ch in BONGI

/**
 * 한 글자의 십신을 읽는다. **천간이든 지지든 받는다.**
 *
 *   sipsinOfChar('庚', '丙')  →  '편관'   (천간은 그대로 넘긴다)
 *   sipsinOfChar('庚', '午')  →  '정관'   (지지는 본기 丁 으로 바꿔서)
 *
 * ⚠️ examLuck 안에서는 sipsinOf 를 직접 부르지 말고 반드시 이것을 쓸 것.
 *    지지가 섞여 들어오는 자리가 많고, 틀려도 조용히 지나간다.
 */
export function sipsinOfChar(dayStem: string, ch: string): string {
  if (!dayStem || dayStem === '?' || !ch || ch === '?') return ''
  return sipsinOf(dayStem, BONGI[ch] ?? ch)
}
