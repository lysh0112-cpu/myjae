// lib/saju/sipsungDist.ts
//
// 십성(十星) 분포 — 여덟 글자에서 십성이 몇 자리씩인가
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-07-31 — app/manseryeok/result-new/page.tsx 안에 있던 calcSipsung 을
//    여기로 «옮겼습니다». 값도 로직도 그대로입니다.
//
//  [왜 옮겼나]
//    진로적성 화면에도 십성표를 얹게 되면서 «같은 계산이 두 벌» 이 될 뻔했습니다.
//    화면 파일 안에 있으면 밖에서 가져다 쓸 수 없어 복사하게 됩니다.
//    ★한 벌만 두어야 언젠가 갈리지 않습니다 (교훈 CJ — 판정기를 둘로 두지 말 것).
//
//  ⚠️ 일간(日干) 자신은 세지 않습니다. saju 배열의 «두 번째(i===1)» 가 일주입니다.
//     그 순서는 부르는 쪽이 지켜 주어야 합니다 — [년주, 일주, 월주, 시주] 가 아니라
//     result-new 가 쓰던 배열 순서를 그대로 따릅니다.
// ══════════════════════════════════════════════════════════════════

// ⚠️ 아래 두 헬퍼는 app/manseryeok/result-new/page.tsx 안에만 있던 것을 옮긴 것입니다.
//    화면 파일 안에 있으면 밖에서 못 씁니다. 여기서 «한 벌» 로 두고 그쪽도 이걸 씁니다.
const HEAVENLY_STEMS = '甲乙丙丁戊己庚辛壬癸'.split('')
const STEM_ELEMENT: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_ELEMENT: Record<string, string> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}
/** 지지의 음양 — true 면 음 */
const BRANCH_YIN: Record<string, boolean> = {
  子: false, 丑: true, 寅: false, 卯: true, 辰: false, 巳: true,
  午: false, 未: true, 申: false, 酉: true, 戌: false, 亥: true,
}
const GEN: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CTL: Record<string, string> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' }

/** 일간 기준 «천간» 의 십성 */
export function getSipsin(dayStem: string, targetStem: string): string {
  if (!targetStem || targetStem === '?') return ''
  const dayIdx = HEAVENLY_STEMS.indexOf(dayStem), targetIdx = HEAVENLY_STEMS.indexOf(targetStem)
  const de = STEM_ELEMENT[dayStem], te = STEM_ELEMENT[targetStem]
  const sameYin = (dayIdx % 2) === (targetIdx % 2)
  if (de === te) return sameYin ? '비견' : '겁재'
  if (GEN[de] === te) return sameYin ? '식신' : '상관'
  if (CTL[de] === te) return sameYin ? '편재' : '정재'
  if (CTL[te] === de) return sameYin ? '편관' : '정관'
  if (GEN[te] === de) return sameYin ? '편인' : '정인'
  return ''
}

/** 일간 기준 «지지» 의 십성 */
export function getSipsinBranch(dayStem: string, branch: string): string {
  if (!branch || branch === '?') return ''
  const be = BRANCH_ELEMENT[branch], de = STEM_ELEMENT[dayStem]
  const dayYin = HEAVENLY_STEMS.indexOf(dayStem) % 2 === 1
  const sameYin = dayYin === BRANCH_YIN[branch]
  if (de === be) return sameYin ? '비견' : '겁재'
  if (GEN[de] === be) return sameYin ? '식신' : '상관'
  if (CTL[de] === be) return sameYin ? '편재' : '정재'
  if (CTL[be] === de) return sameYin ? '편관' : '정관'
  if (GEN[be] === de) return sameYin ? '편인' : '정인'
  return ''
}

export interface SipsungShare {
  ss: string
  /** 0~100 (소수 한 자리) */
  pct: number
}

/**
 * 십성 분포. 많은 차례로 돌려줍니다.
 *
 * @param saju    기둥 배열. ★i===1 이 일주여야 합니다 (일간은 세지 않습니다)
 * @param dayStem 일간
 */
export function calcSipsungDist(
  saju: { stem: string; branch: string }[], dayStem: string,
): SipsungShare[] {
  const cnt: Record<string, number> = {}
  saju.forEach(({ stem, branch }, i) => {
    const isDay = i === 1
    if (!isDay) {
      const ss = getSipsin(dayStem, stem)
      if (ss) cnt[ss] = (cnt[ss] || 0) + 1
    }
    const bs = getSipsinBranch(dayStem, branch)
    if (bs) cnt[bs] = (cnt[bs] || 0) + 1
  })
  const total = Object.values(cnt).reduce((a, b) => a + b, 0)
  return Object.entries(cnt)
    .map(([ss, n]) => ({ ss, pct: total ? Math.round((n / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.pct - a.pct)
}
