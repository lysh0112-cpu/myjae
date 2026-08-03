// lib/saju/career/sajuMbti.ts
//
// ┌──────────────────────────────────────────────────────────────────┐
// │  사주 점수로 MBTI 네 축을 잰다                                      │
// │  2026-07-29                                                       │
// └──────────────────────────────────────────────────────────────────┘
//
// ── ⚠️ 먼저 밝혀 둘 것 ────────────────────────────────────────────────
//   이 산식은 **교재에 없습니다.** 대표님이 정해 주신 것을 그대로 옮긴 것입니다.
//   명리와 MBTI 는 뿌리가 다른 체계라, 교재 어디에도 짝짓는 근거가 없습니다.
//   ★그러니 이것은 «재미와 이해를 돕는 참고»이지 판정이 아닙니다.
//     화면 문구와 통변 지시에도 그렇게 적어 두었습니다. 단정하지 마십시오.
//
//   대표님 확정 산식 (2026-07-29)
//     E : (양의 오행 + 화·목 + 식상·비겁)   vs  I : (음의 오행 + 수·금 + 인성)
//     S : (재성 + 관성 + 토)                vs  N : (식상 + 인성 + 화)
//     T : (금 + 관성 + 양인·백호)           vs  F : (수 + 목 + 인성 + 도화)
//     J : (관성 + 정재)                     vs  P : (비겁 + 식상 + 편재)
//
// ── ⚠️ 여기서 새로 계산하지 않는 것 ───────────────────────────────────
//   오행 100점   calcCareerScore (그 안에서 simsanOhaeng) — 한 곳에서만 잰다
//   육친 묶음    yukchinOf
//   신살         checkSinsal9
//   이 파일은 **그것들을 받아 네 축으로 접기만** 합니다. (교훈 BQ)
//
// ── 산식을 읽는 법 ────────────────────────────────────────────────────
//   각 축은 «양쪽 점수»를 모아 비율을 냅니다. 어느 쪽도 0 이 아니게 하려고
//   최소 1점을 깔아 둡니다(0 나누기 방지 + 100:0 같은 극단 표시 방지).
//   ★사람은 어느 한쪽으로만 되어 있지 않습니다. 화면에도 그렇게 보여야 합니다.

import type { Ohaeng, Pillar } from './types'
import { calcCareerScore } from './careerScore'
import { yukchinOf } from './yukchin'
import { checkSinsal9 } from './sinsal9'

export type MbtiAxis = 'EI' | 'SN' | 'TF' | 'JP'

export interface AxisResult {
  axis: MbtiAxis
  /** 왼쪽 글자 (E·S·T·J) */
  left: string
  /** 오른쪽 글자 (I·N·F·P) */
  right: string
  leftScore: number
  rightScore: number
  /** 왼쪽이 차지하는 비율 0~100 (화면 막대에 쓴다) */
  leftPct: number
  /** 이긴 쪽 글자 */
  pick: string
  /** 왜 그렇게 나왔는지 한 줄 — 화면에 그대로 나간다 */
  why: string
}

export interface SajuMbtiResult {
  /** 네 글자 (예: 'ISTP') */
  code: string
  /** 칭호 (예: '냉철한 자율 전문가') */
  title: string
  axes: AxisResult[]
  /** 어느 축도 뚜렷하지 않은가 — 45~55% 사이가 둘 이상 */
  balanced: boolean
}

/** 천간 음양 — 甲丙戊庚壬이 양 */
const YANG_STEM = new Set(['甲', '丙', '戊', '庚', '壬'])
/** 지지 음양 — 子寅辰午申戌이 양 */
const YANG_BRANCH = new Set(['子', '寅', '辰', '午', '申', '戌'])
const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
/**
 * ★지지의 «본기 천간» — 교재 48쪽 도표 (2026-08-03 확인)
 *
 *  ⚠️⚠️ 위 YANG_BRANCH 와 «다른 것을 잽니다». 하나로 합치지 마십시오.
 *    음양 «비율» 을 셀 때   → YANG_BRANCH (子=양)  — 260쪽 양팔통 사례 甲辰·甲戌·壬寅·庚子
 *    ★십성 을 가릴 때       → 이 표 (子=癸 음)      — 48쪽 도표 · 96쪽 壬 양인=子
 *  ★쓰임이 다르면 잣대도 다릅니다. (지장간 표를 «일부러» 둘 둔 것과 같은 결)
 */
const BRANCH_BONGI: Record<string, string> = {
  子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙',
  午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬',
}

/** 16유형 칭호 — 사주 결로 지은 이름입니다 (MBTI 공식 명칭이 아닙니다) */
const TITLE: Record<string, string> = {
  ISTJ: '묵묵한 원칙주의자', ISFJ: '조용히 지키는 사람', INFJ: '깊이 헤아리는 사람', INTJ: '멀리 보는 설계자',
  ISTP: '냉철한 자율 전문가', ISFP: '결이 고운 실행가', INFP: '마음이 넓은 이상가', INTP: '파고드는 탐구자',
  ESTP: '판을 읽는 승부사', ESFP: '분위기를 여는 사람', ENFP: '불을 지피는 사람', ENTP: '길을 새로 내는 사람',
  ESTJ: '판을 세우는 관리자', ESFJ: '두루 챙기는 조력자', ENFJ: '사람을 이끄는 사람', ENTJ: '앞장서는 지휘자',
}

/**
 * 왜 그렇게 나왔는지 — ★«이름만» 옮깁니다. 숫자를 보이지 않습니다.
 *
 *  🔴 [무엇이 있었나]  「목 55 · 비겁 55 · 양의 기운 36」처럼 «점수» 를 찍었습니다.
 *    ⚠️ ① 그 숫자를 아무리 더해도 막대의 「81 : 19」가 나오지 «않습니다» —
 *          바닥 15%·큰 것 셋만 보이기·층별 평균을 거치기 때문입니다.
 *       ② 「55」가 무슨 단위인지 화면 어디에도 없습니다.
 *       ③ 일간이 목이면 «목 = 비겁» 이라 ★같은 수가 나란히 찍혀 오류로 보입니다.
 *    ⇒ ★2026-08-03 대표님 지시 — 「숫자를 걷어내고 말로 바꾸자」 (44부 28차)
 *
 *  ⚠️ 「지운」 것이 아니라 «감춘» 것입니다 — leftScore·rightScore 는 그대로 넘어갑니다.
 *     되살리려면 대표님께 여쭈십시오. (44부 21차 별점을 걷어낸 것과 같은 결)
 *  ★이 카드는 「재미로 보는 참고」입니다. 계산기처럼 보이면 안 됩니다.
 */
function reason(parts: Array<[string, number]>): string {
  const shown = parts.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  if (!shown.length) return '뚜렷하게 기운 곳이 없어요'
  // ★같은 것을 두 번 말하지 않습니다 (목·비겁이 같은 오행일 때)
  const seen = new Set<string>()
  const names: string[] = []
  for (const [k] of shown) {
    const w = LABEL[k] ?? k
    if (seen.has(w)) continue
    seen.add(w); names.push(w)
    if (names.length >= 3) break
  }
  // ⚠️ 「…기운이 도드라집니다」를 네 줄 모두 붙이면 지겹고,
  //    「양(陽)의 기운 기운이…」처럼 ★말이 겹치기도 합니다. 이름만 잇습니다.
  return names.join(' · ')
}

/** 재료 이름 → ★손님이 읽는 말 */
const LABEL: Record<string, string> = {
  목: '목(木)', 화: '화(火)', 토: '토(土)', 금: '금(金)', 수: '수(水)',
  비겁: '주체성', 식상: '표현력', 재성: '현실 감각', 관성: '책임감', 인성: '사고력',
  정재: '꼼꼼함', 편재: '판을 읽는 힘',
  '양의 기운': '양(陽)', '음의 기운': '음(陰)',
  양인: '결단', 도화: '매력',
}

/**
 * 사주 점수로 MBTI 네 축을 잰다.
 *
 * @param saju 네 기둥
 * @param solarMonth·solarDay·hourBranch  오행 점수를 내는 데 필요 (calcCareerScore 와 같은 인자)
 */
export function calcSajuMbti(
  saju: Pillar[], solarMonth: number, solarDay: number, hourBranch: string | null,
): SajuMbtiResult {
  const r = calcCareerScore(saju, solarMonth, solarDay, hourBranch)
  const S = r.score                       // 오행 점수 (합 100)
  const dayStem = saju.find(p => p.pillar === '일주')?.stem ?? ''
  const dayEl = STEM_EL[dayStem] ?? '토'

  // ── 육친 묶음별 점수 ──
  const Y: Record<string, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 }
  for (const el of ['목', '화', '토', '금', '수'] as Ohaeng[]) {
    Y[yukchinOf(dayEl, el)] += S[el] ?? 0
  }

  // ── 음양 — 여덟 글자 가운데 양이 몇인가 ──
  let yang = 0, eum = 0
  for (const p of saju) {
    if (p.stem && p.stem !== '?') { if (YANG_STEM.has(p.stem)) yang++; else eum++ }
    if (p.branch && p.branch !== '?') { if (YANG_BRANCH.has(p.branch)) yang++; else eum++ }
  }
  // 글자 수를 점수 결로 맞춘다 (8글자 → 100 기준)
  const yangPt = yang * 6
  const eumPt = eum * 6

  // ── 신살 — 양인·백호 / 도화 ──
  const hits = checkSinsal9(saju)
  const hasName = (n: string) => hits.some(h => h.name.includes(n))
  const yangin = hasName('양인') ? 10 : 0
  // ⚠️ 2026-08-03 (44부 27차) — ★백호를 «뺐습니다».
  //    교재 95쪽은 백호의 «성격» 을 말하지 않습니다 ("2~3개 이상이면 큰 사주이고
  //    활동을 크게 해야 함" 뿐). 양인과 같은 10점을 준 것은 근거가 없었습니다.
  //    ★184~257쪽에서 백호의 성격 설명이 나오면 되살리십시오.
  const dohwa = hasName('도화') ? 12 : 0

  // ── 정재/편재 가르기 ────────────────────────────────────────────
  //  ★2026-08-03 (44부 27차) — «지지도» 셉니다. 교재 대조로 고친 자리입니다.
  //
  //   [무엇이 있었나]  천간 넉 자만 세고 있었습니다.
  //     const el = isStem ? STEM_EL[ch] : undefined; if (!el) continue
  //     ⇒ 지지가 «한 글자도» 세어지지 않았습니다.
  //   [교재]  ★36쪽 "天干보다 地支는 매우 중요한 위치를 차지한다"
  //           ★159쪽 "천간은 정신적인 측면(40% 정도), 지지는 현실적·실질적(60~70%)"
  //           ★259쪽 "오행의 개수는 본래의 오행에 해당하는 개수를 쓴다"
  //             ⇒ 지지는 «본기 하나» 로 «한 개» 를 셉니다 (지장간 셋을 다 세지 않습니다)
  //   ⚠️⚠️ 지지의 음양은 ★48쪽 «본기 천간» 으로 봅니다 — 子=癸(음) · 午=丁(음).
  //      근거: ★96쪽이 壬 일간의 양인(겁재)을 子라 합니다.
  //            壬(양)의 겁재는 «음» 이라야 하므로, 子를 癸(음)로 본 것입니다.
  //      ⛔ 위 YANG_BRANCH(子=양) 를 여기에 쓰지 «마십시오». 재는 것이 다릅니다 —
  //         음양 «비율» 은 260쪽 양팔통 사례가 子를 «양» 으로 봅니다.
  //         ★한 파일에 두 잣대가 있는 것이 «맞습니다». 하나로 합치지 마십시오.
  const dayYang = YANG_STEM.has(dayStem)
  let jaeJeong = 0, jaePyeon = 0
  for (const p of saju) {
    for (const [ch, isStem] of [[p.stem, true], [p.branch, false]] as Array<[string, boolean]>) {
      if (!ch || ch === '?') continue
      // ★지지는 48쪽 본기 천간으로 바꿔서 봅니다
      const asStem = isStem ? ch : BRANCH_BONGI[ch]
      const el = STEM_EL[asStem]
      if (!el) continue
      if (yukchinOf(dayEl, el) !== '재성') continue
      if (YANG_STEM.has(asStem) !== dayYang) jaeJeong++   // 음양이 다르면 정재
      else jaePyeon++
    }
  }
  const jaeTotal = Math.max(1, jaeJeong + jaePyeon)
  const jeongJae = (Y['재성'] * jaeJeong) / jaeTotal
  const pyeonJae = (Y['재성'] * jaePyeon) / jaeTotal

  // ── 네 축 ──────────────────────────────────────────────────────
  //
  //  ★2026-08-03 (44부 27차) — 대표님 승인으로 «접는 방식» 을 고쳤습니다.
  //    ⚠️ 재료를 고른 것(어느 성분이 어느 쪽인가)은 2026-07-29 대표님 산식 그대로입니다.
  //       바꾼 것은 «어떻게 합치는가» 입니다. 아래 셋입니다.
  //
  //   A  ★오행 몫 · 육친 몫 · 음양(신살) 몫을 «층으로 갈라» 재고 평균 냅니다.
  //      [까닭] 교재 ★40쪽 "오행과 육친을 «분리해서» 해석해야 하는데 분리하지 않고
  //             두리뭉실하게 대충 해석하기 때문에 … 오류가 발생한다"
  //      [무엇이 있었나] 육친 점수는 «오행 점수를 그대로 부은 것» 이라,
  //             목 일간의 목 55점이 「목」으로 한 번 + 「비겁」으로 또 한 번,
  //             ★같은 55점이 한 축에 «두 번» 실렸습니다.
  //
  //   C-1 ★50점 넘는 몫은 «세지 않습니다» (뚜껑).
  //      [까닭] 교재 ★259쪽 "점수가 50점 이상이 되면 이때부터는 장점보다는 단점으로
  //             발현이 된다" · ★25쪽 「오행이 과다할 때」 (목=안하무인·용두사미 …)
  //      ⚠️ 교재는 「단점이 된다」고만 하지 «반대 성향이 된다» 고 하지 «않습니다».
  //         그래서 뒤집지 «않고» 멈추기만 합니다. 뒤집는 것은 우리 발명이 됩니다.
  //      ⚠️ 실효는 작습니다(측정 1.68%). 그래도 교재 근거가 가장 분명한 자리입니다.
  //
  //   D  ★교재에서 못 찾은 재료 셋을 뺐습니다.
  //        S쪽 관성  — 「현실적」이라는 말이 관성에 없습니다 (144쪽 「현실 감각」은 «정인격»)
  //        N쪽 화    — 화는 "열정·표현·예의·행동"(21·25쪽). 상상력·직관이 아닙니다
  //        T쪽 백호  — 95쪽은 «성격» 을 말하지 않습니다 ("큰 사주·활동을 크게" 뿐)
  //      ⚠️ 「없다」가 아니라 ★「2026-08-03 에 확인한 범위(20~183·232·233·238·258~269쪽)
  //         에서 못 찾았다」 입니다. 184~257쪽 대부분을 아직 못 봤습니다.
  //         ★그 쪽이 확인되면 되살릴 수 있습니다.
  //
  //   γ  ★층 안에서는 «합» 이 아니라 «세기 평균» 으로 견줍니다.
  //      [까닭] D 로 재료를 빼면 한쪽 성분이 둘, 다른 쪽이 하나가 되어
  //             ★«많은 쪽이 그냥 이기는» 일이 납니다.
  //      [실측] 합으로 견주면 ENFP 가 27.46% → ★32.14% 로 «더 몰렸습니다».
  //             세기 평균으로 견주니 ★17.78% 로 내려갔습니다. (5,000벌)
  //      ⚠️⚠️ γ 는 «교재에 없습니다». 우리가 정한 것입니다. (2026-08-03 대표님 승인)
  //
  //   ★층 건너뛰기 — 한쪽에 재료가 «없는» 층은 «세지 않습니다».
  //      D 로 화를 빼자 S/N 의 오행 층이 「토 ↔ 아무것도 없음」이 되었습니다.
  //      그대로 세면 «토가 조금만 있어도 언제나 S» 가 됩니다 (실측 ESFP 38.56%).
  //      ⚠️⚠️ 그 바람에 ★토(45쪽 "실질적")가 산식에서 «빠졌습니다».
  //         교재 근거가 있는 재료인데 자리를 잃은 것입니다.
  //         ★184~257쪽에서 N 쪽 오행 재료가 나오면 층을 되살리고 토를 넣으십시오.
  //
  //  [2026-08-03 처음 잰 값 — 다음에 견줄 잣대 · npm run measure:mbti]
  //     가장 많은 유형   ENFP 27.46% → ★17.78%
  //     위 셋 합         50.42%      → ★42.52%
  //     INTJ            0.36%       → ★3.10%  (8.6배)
  //     INFJ            1.18%       → ★4.60%
  //     ★유형 뒤집힘     52.00% — 두 분 중 한 분의 네 글자가 바뀝니다
  // ────────────────────────────────────────────────────────────────

  /** ★C-1 — 50점을 넘는 몫은 세지 않는다 (교재 259쪽) */
  const cap = (v: number) => Math.min(v, 50)
  /** 한 층 = 「왼쪽 재료들 ↔ 오른쪽 재료들」 */
  type Layer = { L: Array<[string, number]>; R: Array<[string, number]> }

  const axes: AxisResult[] = []
  const push = (axis: MbtiAxis, left: string, right: string, layers: Layer[]) => {
    const ratios: number[] = []
    for (const ly of layers) {
      // ★층 건너뛰기 — 한쪽에 재료가 «없으면» 대립이 아닙니다
      if (!ly.L.length || !ly.R.length) continue
      const sum = (a: Array<[string, number]>) => a.reduce((x, [, v]) => x + v, 0)
      // ★γ — 성분 «개수» 가 아니라 «세기» 로 견줍니다
      const l = sum(ly.L) / ly.L.length
      const r = sum(ly.R) / ly.R.length
      if (l + r <= 0) continue
      // ★바닥 — 한쪽이 0이어도 «1:99» 같은 막대를 내지 않습니다.
      //   [얼마나] 그 층 총합의 15%. ⚠️ 교재가 아니라 우리가 정한 값입니다.
      const floor = (l + r) * 0.15
      ratios.push((l + floor) / (l + floor + r + floor))
    }
    const p = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0.5
    const leftPct = Math.round(p * 100)
    const pick = leftPct >= 50 ? left : right
    // ★화면에 보이는 숫자는 «날점수 합» 입니다 (뚜껑·평균을 거치기 전).
    //   ⚠️ 막대(leftPct)와 아래 숫자가 딱 맞아떨어지지 않는 것은 그 때문입니다.
    const flatL = layers.flatMap(x => x.L)
    const flatR = layers.flatMap(x => x.R)
    axes.push({
      axis, left, right,
      leftScore: Math.round(flatL.reduce((a, [, v]) => a + v, 0)),
      rightScore: Math.round(flatR.reduce((a, [, v]) => a + v, 0)),
      leftPct, pick,
      why: leftPct >= 50 ? reason(flatL) : reason(flatR),
    })
  }

  // E vs I — 밖으로 뻗는 기운 vs 안으로 모으는 기운
  //   ★교재 260쪽 "陽의 기운+木火: 외향적 … 활동적인 사람 /
  //                陰의 기운+金水: 내성적이고 차분하고 행동보다는 생각이 많은 유형"
  //   ★비겁 = "활동성 · 대인 관계 활발" · 식상 = "언변술 · 발산"
  //   ★인성 = "산속에서 혼자 사는 것이 좋다 · 고독"(과다) · "생각만 많고 실행력이 약함"
  push('EI', 'E', 'I', [
    { L: [['화', cap(S['화'])], ['목', cap(S['목'])]], R: [['수', cap(S['수'])], ['금', cap(S['금'])]] },
    { L: [['식상', cap(Y['식상'])], ['비겁', cap(Y['비겁'])]], R: [['인성', cap(Y['인성'])]] },
    { L: [['양의 기운', yangPt]], R: [['음의 기운', eumPt]] },
  ])

  // S vs N — 눈앞의 실제 vs 그림과 뜻
  //   ★재성 111쪽 "구체적이고 현실적인 것 좋아한다 · 실리주의자"
  //   ★식상 109쪽 "아이디어와 상상력이 풍부" · 인성 115·130쪽 "학문 · 이론 중시"
  //   ⚠️ 오행 층은 D 로 «대립이 사라져» 건너뜁니다 (위 설명 참고)
  push('SN', 'S', 'N', [
    { L: [['재성', cap(Y['재성'])]], R: [['식상', cap(Y['식상'])], ['인성', cap(Y['인성'])]] },
  ])

  // T vs F — 잣대로 자르는 결 vs 마음으로 품는 결
  //   ★금 23·25쪽 "결단력 · 의리 · 냉철한 분별" · 목 20쪽 "배려 지향 · 인간 중심"
  //   ★양인 96쪽 "고집, 오만, 욱기, 냉혹함" · 도화 40·43·94쪽 "매력 · 예술적 직업"
  //   ⚠️ 금 23쪽은 "겉으로는 냉정해 보이지만 내면은 따뜻하고 정이 있다" 고도 합니다.
  //      ★오행은 «양쪽 결» 을 지녀 한 축에 온전히 붙지 않습니다. 그래서 층을 나눕니다.
  push('TF', 'T', 'F', [
    { L: [['금', cap(S['금'])]], R: [['수', cap(S['수'])], ['목', cap(S['목'])]] },
    { L: [['관성', cap(Y['관성'])]], R: [['인성', cap(Y['인성'])]] },
    { L: [['양인', yangin]], R: [['도화', dohwa]] },
  ])

  // J vs P — 정해 두고 가는 결 vs 열어 두고 가는 결
  //   ★관성 112·113쪽 "계획성이 투철하다 · 룰과 법칙을 중요시"
  //   ★정재 111·43쪽 "안정과 안전을 추구 · 매사에 정확 · 치밀하고 세밀하고 꼼꼼"
  //   ★식상 124쪽 "식신 상관은 관성을 극하므로 룰과 법과 고정 관념을 싫어한다. 자유방임주의"
  //     ⇒ ★교재가 «극이니까 반대» 라는 논리까지 밝힌 유일한 자리입니다
  push('JP', 'J', 'P', [
    { L: [['관성', cap(Y['관성'])], ['정재', cap(jeongJae)]],
      R: [['비겁', cap(Y['비겁'])], ['식상', cap(Y['식상'])], ['편재', cap(pyeonJae)]] },
  ])

  const code = axes.map(a => a.pick).join('')
  const balanced = axes.filter(a => a.leftPct >= 45 && a.leftPct <= 55).length >= 2

  return { code, title: TITLE[code] ?? '고유한 결', axes, balanced }
}

// ═══════════════════════════════════════════════════════════════
//  사주 MBTI ↔ 실제 MBTI 견주기
// ═══════════════════════════════════════════════════════════════

export interface MbtiCompare {
  /** 네 축 가운데 몇 개가 같은가 */
  same: number
  /** 다른 축의 이름 (예: ['E/I', 'T/F']) */
  diffAxes: string[]
  headline: string
  body: string
}

const AXIS_LABEL: Record<MbtiAxis, string> = {
  EI: '나서는 결', SN: '보는 결', TF: '고르는 결', JP: '맺는 결',
}

/**
 * 타고난 결(사주)과 지금의 결(실제 MBTI)을 견준다.
 *
 *   ★"틀렸다"고 말하지 않습니다. 다른 것은 살아오며 길러 낸 결입니다.
 *     교훈 AX 와 같은 자리입니다 — 겁주거나 깎아내리지 않습니다.
 */
export function compareMbti(saju: SajuMbtiResult, real: string): MbtiCompare | null {
  const R = (real ?? '').toUpperCase().trim()
  if (!/^[EI][SN][TF][JP]$/.test(R)) return null

  const diffAxes: string[] = []
  let same = 0
  saju.axes.forEach((a, i) => {
    if (a.pick === R[i]) same++
    else diffAxes.push(AXIS_LABEL[a.axis])
  })

  if (same === 4) {
    return {
      same, diffAxes,
      headline: '타고난 결과 지금의 결이 그대로 겹칩니다',
      body: '사주가 가리키는 방향과 스스로 아는 성향이 같습니다. 억지로 자신을 바꿔 쓰지 않아도 되는 자리라, 힘이 덜 들고 오래 갑니다. 잘하는 쪽으로 더 밀어도 좋습니다.',
    }
  }
  if (same === 0) {
    return {
      same, diffAxes,
      headline: '타고난 결과 지금의 결이 크게 다릅니다',
      body: '이건 어긋난 것이 아니라, 살아오며 필요해서 다른 쪽 근육을 키우신 것입니다. 두 결을 다 쓸 수 있다는 뜻이라 쓰임이 넓습니다. 다만 오래 쓰면 지치는 쪽이 있으니, 힘들 때 돌아갈 자리가 타고난 쪽이라는 것만 기억해 두십시오.',
    }
  }
  return {
    same, diffAxes,
    headline: `네 결 가운데 ${same}가지가 겹칩니다`,
    body: `${diffAxes.join('과 ')}에서 타고난 쪽과 지금 쪽이 갈립니다. 갈리는 자리가 오히려 반전이 되는 곳입니다. 남들이 예상하지 못한 방식으로 일을 풀 수 있고, 그 자리가 이 분만의 강점이 됩니다.`,
  }
}
