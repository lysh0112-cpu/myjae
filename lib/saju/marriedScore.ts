// lib/saju/marriedScore.ts
// ============================================================================
// 부부(장기·해로) 전용 궁합 계산식.
// 연인 계산식(coupleScore.ts)은 그대로 두고, 부부에 맞게 배점을 재조정 +
// 부부 특화 항목(원진·귀문 감점 / 일지 충·형 상신구응 감면)을 추가한다.
//
// [설계 근거] NotebookLM(적천수·궁통보감·자평진전·소무승 물상론) 검토 소견:
//   연인 궁합은 '일시적 끌림'에 치우쳐 있어, 장기 해로 부부에는
//   조후(정서·속궁합)와 월주(가치관·양가)를 크게 가중해야 체감과 맞다.
//   → 년주·공망은 낮추고, 조후·월주는 대폭 높인다.
//   ★연재쌤 최종 검수 대상(원칙 12) — 배점·감점 수치는 조정 가능.
//
// [재사용] coupleScore.ts의 검증된 항목 판정 로직을 그대로 호출하고(원칙 9),
//   반환 점수에 부부 가중치를 곱해 스케일링한다. 판정 근거(details)는
//   각 함수가 채워주므로 통변 재료로 그대로 쓰인다.
//
// [부부 목표 배점 100점] (검토 소견 최종 추천)
//   일주 30 · 조후 15 · 월주 15 · 용신 15 · 시주 10 · 오행 8 · 년주 5 · 공망 2
//   + 원진/귀문 감점(최대 -8, 별도) + 일지 충·형 상신구응 감면
// ============================================================================

import {
  calcIljuScore, calcYongsinScore, calcYeonScore, calcWolScore,
  calcGongmangScore, calcOhaengScore, calcJohuScore, calcSijuScore,
  isPair, hasValidPillar,
  type ScoreDetail, type CoupleScoreResult, type SajuPillarSimple,
} from './coupleScore'

// ── 부부용 항목 배점 상한(가중 목표) ──
// 연인(couple)의 원래 상한 대비 비율로 스케일링한다.
//   연인 원상한: 일주28 용신18 년주10 월주8 공망6 오행10 조후8 시주12
const CAP = {
  ilju:    { couple: 28, married: 30 },
  yongsin: { couple: 18, married: 15 },
  yeon:    { couple: 10, married: 5 },
  wol:     { couple: 8,  married: 15 },
  gongmang:{ couple: 6,  married: 2 },
  ohaeng:  { couple: 10, married: 8 },
  johu:    { couple: 8,  married: 15 },
  siju:    { couple: 12, married: 10 },
}

// 원점수를 (부부상한/연인상한) 비율로 스케일. 음수(감점)도 같은 비율로 커진다.
function scale(raw: number, cap: { couple: number; married: number }): number {
  if (cap.couple === 0) return raw
  return raw * (cap.married / cap.couple)
}

// ── 부부 특화 ① 원진살·귀문관살 ──
// 지지 12개 쌍. 겉으론 멀쩡해도 속으로 예민하게 얽혀 애증·집착·미묘한 갈등을 부르는 관계.
// 부부는 매일 부대끼므로 이 예민성을 감점(최대 -8)으로 반영한다.
const WONJIN_PAIRS: string[][] = [
  ['子', '未'], ['丑', '午'], ['寅', '酉'], ['卯', '申'], ['辰', '亥'], ['巳', '戌'],
]
// 귀문관살(대표 조합). 유파마다 조금씩 달라 대표적인 것만.
const GWIMUN_PAIRS: string[][] = [
  ['子', '酉'], ['丑', '午'], ['寅', '未'], ['卯', '申'], ['辰', '亥'], ['巳', '戌'],
]

// 일지·시지 등 배우자 근처 지지에서 원진/귀문을 훑어 감점.
function calcWonjinGwimun(
  dayBranch1: string, dayBranch2: string,
  details: ScoreDetail[]
): number {
  let score = 0
  if (isPair(dayBranch1, dayBranch2, WONJIN_PAIRS)) {
    score -= 6
    details.push({
      category: '신살', item: `원진살 (${dayBranch1}${dayBranch2})`, score: -6,
      reason: '겉으론 괜찮아도 속으로 예민하게 얽히기 쉬운 결이에요. 서로의 예민함을 알아채고 먼저 다독이면 오히려 애틋해져요',
    })
  }
  if (isPair(dayBranch1, dayBranch2, GWIMUN_PAIRS)) {
    score -= 3
    details.push({
      category: '신살', item: `귀문관살 (${dayBranch1}${dayBranch2})`, score: -3,
      reason: '생각이 깊고 섬세해 가끔 서로를 곱씹게 되는 사이예요. 마음을 말로 자주 확인해 주면 편안해져요',
    })
  }
  // 부부 특화 감점 총합은 -8로 제한 (과도한 감점 방지)
  return Math.max(-8, score)
}

// ── 부부 특화 ② 일지 충·형 상신구응 감면 ──
// 배우자궁(일지)이 충·형이라도, 두 사람 원국에 그 충을 다정하게 묶어주는
// 삼합·육합이 살아 있으면 감점을 절반 이상 경감(구응, 救應)한다.
//   → 여기서는 '두 사람 년지/월지/시지 중에 일지를 합으로 감싸는 글자가 있으면 구응'으로 본다.
const YUKHAP: string[][] = [
  ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未'],
]
const SAMHAP: string[][] = [
  ['申', '子', '辰'], ['亥', '卯', '未'], ['寅', '午', '戌'], ['巳', '酉', '丑'],
]
const CHUNG: string[][] = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
]

function branchInAnyHapWith(target: string, pool: string[]): boolean {
  for (const b of pool) {
    if (!b || b === target) continue
    if (isPair(target, b, YUKHAP)) return true
    for (const trio of SAMHAP) {
      if (trio.includes(target) && trio.includes(b)) return true
    }
  }
  return false
}

// 일지 충이 있을 때 구응 여부를 보고 감면 가점을 돌려준다(+로 상쇄).
function calcGueung(
  dayBranch1: string, dayBranch2: string,
  otherBranches: string[],   // 두 사람의 년지·월지·시지 모음
  details: ScoreDetail[]
): number {
  // 일지끼리 충인지 확인
  if (!isPair(dayBranch1, dayBranch2, CHUNG)) return 0
  // 일지를 감싸주는 합이 주변에 있으면 구응 성립
  const saved =
    branchInAnyHapWith(dayBranch1, otherBranches) ||
    branchInAnyHapWith(dayBranch2, otherBranches)
  if (saved) {
    details.push({
      category: '구응', item: '일지 충 → 구응(합)으로 완화', score: 10,
      reason: '안방 자리가 부딪히는 결이 있지만, 곁의 다정한 기운이 이를 감싸 크게 흔들리지 않아요. 서로를 묶어주는 인연이 살아 있어요',
    })
    return 10   // 앞서 일주에서 충으로 크게 감점된 것을 절반 이상 상쇄
  }
  return 0
}

// ── 부부용 등급 (연인과 표현을 부부답게) ──
function getMarriedGrade(score: number): { grade: string; gradeDesc: string } {
  if (score >= 88) return { grade: '천생연분 백년해로 💫', gradeDesc: '평생을 함께 늙어갈 깊고 귀한 인연이에요' }
  if (score >= 78) return { grade: '천생 소울메이트 부부 ✨', gradeDesc: '서로가 서로의 가장 든든한 짝이에요' }
  if (score >= 68) return { grade: '함께 자라는 동반자 부부 🌿', gradeDesc: '살아갈수록 더 단단해지는 사이예요' }
  if (score >= 54) return { grade: '다름으로 채우는 부부 💡', gradeDesc: '서로 다른 결을 맞춰가며 완성되는 인연이에요' }
  if (score >= 40) return { grade: '노력으로 여무는 부부 🔥', gradeDesc: '함께 가꿔갈수록 정이 깊어지는 사이예요' }
  return { grade: '서로를 배워가는 부부 🌙', gradeDesc: '천천히 이해하며 맞춰갈 인연이에요' }
}

// ── 부부 전용 궁합 점수 ──
export function calcMarriedScore(
  saju1: SajuPillarSimple[],
  saju2: SajuPillarSimple[],
  gm1: [string, string],
  gm2: [string, string]
): CoupleScoreResult {
  const details: ScoreDetail[] = []

  const ilju1 = saju1.find(p => p.pillar === '일주')
  const ilju2 = saju2.find(p => p.pillar === '일주')
  const yeon1 = saju1.find(p => p.pillar === '년주')
  const yeon2 = saju2.find(p => p.pillar === '년주')
  const wol1  = saju1.find(p => p.pillar === '월주')
  const wol2  = saju2.find(p => p.pillar === '월주')
  const si1   = saju1.find(p => p.pillar === '시주')
  const si2   = saju2.find(p => p.pillar === '시주')

  const dayStem1 = ilju1?.stem ?? ''
  const dayStem2 = ilju2?.stem ?? ''
  const dayBranch1 = ilju1?.branch ?? ''
  const dayBranch2 = ilju2?.branch ?? ''

  const hasSiju =
    hasValidPillar(si1?.stem ?? '', si1?.branch ?? '') &&
    hasValidPillar(si2?.stem ?? '', si2?.branch ?? '')

  // 재사용: 검증된 항목 판정을 그대로 호출(details도 채워짐) → 부부 가중치로 스케일
  const iljuScore    = scale(calcIljuScore(dayStem1, dayBranch1, dayStem2, dayBranch2, details), CAP.ilju)
  const yongsinScore = scale(calcYongsinScore(saju1, saju2, dayStem1, dayStem2, details), CAP.yongsin)
  const yeonScore    = scale(calcYeonScore(yeon1?.stem ?? '', yeon1?.branch ?? '', yeon2?.stem ?? '', yeon2?.branch ?? '', details), CAP.yeon)
  const wolScore     = scale(calcWolScore(wol1?.stem ?? '', wol1?.branch ?? '', wol2?.stem ?? '', wol2?.branch ?? '', details), CAP.wol)
  const gongmangScore = scale(calcGongmangScore(gm1, gm2, dayBranch1, dayBranch2, yeon1?.branch ?? '', yeon2?.branch ?? '', details), CAP.gongmang)
  const ohaengScore  = scale(calcOhaengScore(saju1, saju2, details), CAP.ohaeng)
  const johuScore    = scale(calcJohuScore(wol1?.branch ?? '', wol2?.branch ?? '', details), CAP.johu)

  let sijuScore = 0
  if (hasSiju) {
    sijuScore = scale(calcSijuScore(si1!.stem, si1!.branch, si2!.stem, si2!.branch, details), CAP.siju)
  } else {
    details.push({ category: '시주', item: '시주 생략', score: 0, reason: '태어난 시간을 몰라 시주는 빼고, 나머지로 100점 기준으로 맞췄어요' })
  }

  // 부부 특화 감점/구응
  const wonjinScore = calcWonjinGwimun(dayBranch1, dayBranch2, details)
  const otherBranches = [
    yeon1?.branch ?? '', wol1?.branch ?? '', si1?.branch ?? '',
    yeon2?.branch ?? '', wol2?.branch ?? '', si2?.branch ?? '',
  ]
  const guengScore = calcGueung(dayBranch1, dayBranch2, otherBranches, details)

  // 항목 상한(시 있을 때): 30+15+5+15+2+8+15+10 = 100
  const rawTotal =
    iljuScore + yongsinScore + yeonScore + wolScore +
    gongmangScore + ohaengScore + johuScore + sijuScore +
    wonjinScore + guengScore

  // baseline: 시뮬레이션(3000쌍)으로 등급 분포가 가장 골고루 퍼지는 값.
  //   35 → 천생연분17% 소울15% 동반17% 다름23% 노력17% 배움11% (평균 66점)
  //   (연인의 baseline 문제처럼 높으면 최고등급이 과다해지므로 낮게 잡음)
  //   ★연재쌤 검수 후 조정 가능.
  const baseline = 35
  let normalized = Math.min(100, Math.max(0, rawTotal + baseline))

  // 시 모를 때: 시주(10점) 제외 → 90점 만점을 100점으로 환산
  if (!hasSiju) {
    normalized = normalized * (100 / 90)
  }

  const totalScore = Math.min(100, Math.max(0, Math.round(normalized)))
  const { grade, gradeDesc } = getMarriedGrade(totalScore)

  return {
    totalScore,
    details,
    iljuScore: Math.round(iljuScore),
    yongsinScore: Math.round(yongsinScore),
    yeonScore: Math.round(yeonScore),
    wolScore: Math.round(wolScore),
    gongmangScore: Math.round(gongmangScore),
    ohaengScore: Math.round(ohaengScore),
    johuScore: Math.round(johuScore),
    sijuScore: Math.round(sijuScore),
    hasSiju,
    grade,
    gradeDesc,
  }
}
