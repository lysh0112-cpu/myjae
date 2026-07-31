// lib/saju/career/namingBridge.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  작명 잇기 — 「이 사주에는 어느 자원오행을 담아야 하는가」            │
// └───────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-07-31 (41부 Step 3) — 대표님 확정 지침
//
//  [이 파일이 «하지 않는» 것]
//    · 이름을 «채점하지 않습니다». 그건 lib/saju/resourceJudge.ts 가 합니다.
//    · 오행 등급을 «다시 매기지 않습니다». 그건 career/careerScore.ts 가 합니다.
//    ★두 곳의 값을 «가져다 잇기만» 합니다 (교훈 CJ — 판정기를 둘로 두지 말 것).
//
//  [이 파일이 하는 것]
//    이름 글자를 고를 때 «어느 자원오행을 먼저 볼 것인가» 를 줄 세웁니다.
//
//  [교재 근거]
//    『작명개운법』 4장 107쪽
//      「자원오행은 사주에 필요한 기운을 채우는 것이 본래 목적이다」
//      「어디서든 자원오행이 상극이라 흉하다는 말은 무시하기 바란다」
//    『작명개운법』 2장 51쪽
//      「어떤 기운이 이미 과다한데 그것을 더 살려 주면 오히려 부담이 된다」
//    → ★그래서 «담을 것» 과 «피할 것» 을 나눕니다. 상극은 잣대가 아닙니다.
//
//  ⚠️ 두 등급 체계가 «다릅니다». 일부러 둘 다 보여 줍니다.
//      career      결핍 / 약함 / 발달 / 과다   (심산 100점 + 글자 개수 · 교재 40쪽)
//      resource    결핍 / 고립 / 보통 / 과다   (resourceJudge 의 잣대)
//    어긋나는 자리는 disagree 로 남깁니다 — 조용히 한쪽만 쓰지 않습니다.
// ══════════════════════════════════════════════════════════════════

import type { Ohaeng, CareerCard } from './types'
import type { GradeResult } from './careerScore'
import { buildSajuOhaengProfile, type SajuOhaengProfileFull } from '../resourceJudge'

const EL5: readonly Ohaeng[] = ['목', '화', '토', '금', '수']

/** 이름에 담을 때의 우선순위 — 낮을수록 먼저 */
export type NamingPriority =
  | '용신'      // 사주가 가장 바라는 기운
  | '희신'      // 그다음으로 좋은 기운
  | '채움'      // 결핍·약함 — 비어 있는 자리를 채웁니다
  | '보통'      // 굳이 담을 것도 피할 것도 아닙니다
  | '피함'      // 과다 — 더 보태면 부담이 됩니다 (교재 2장 51쪽)
  | '주의'      // 기신·구신

export interface NamingElementGuide {
  el: Ohaeng
  priority: NamingPriority
  /** 줄 세우기용 — 작을수록 먼저 */
  rank: number
  /** career 쪽 등급 (심산 100점 · 교재 40쪽) */
  careerGrade: string
  /** career 점수 */
  points: number
  /** resourceJudge 쪽 등급 */
  resourceLevel: string
  /** ★두 잣대가 어긋난 자리 */
  disagree: boolean
  /** 왜 이 자리인가 — 화면·통변에 쓸 한 줄 */
  why: string
}

export interface NamingBridgeResult {
  guides: NamingElementGuide[]
  /** ★이름에 «먼저» 담을 오행 (우선순위 순) */
  fill: Ohaeng[]
  /** ★더 보태지 않는 편이 나은 오행 */
  avoid: Ohaeng[]
  yongsin: Ohaeng | null
  heeksin: Ohaeng | null
  /** 두 잣대가 어긋난 오행 */
  disagreed: Ohaeng[]
  problems: string[]
}

export interface NamingBridgeInput {
  /** career/careerScore.ts 의 gradeAll() 결과 */
  grades: Record<Ohaeng, GradeResult>
  yongsin: Ohaeng | null
  heeksin?: Ohaeng | null
  gisin?: Ohaeng | null
  gusin?: Ohaeng | null
  /** ★지장간이 실어 주는 오행 비율 (jijangganBridge). 있으면 참고로 적습니다 */
  jijangganRatio?: Record<Ohaeng, number> | null
}

const RANK: Record<NamingPriority, number> = {
  용신: 0, 희신: 1, 채움: 2, 보통: 3, 피함: 4, 주의: 5,
}

/**
 * ★이름에 담을 자원오행을 줄 세웁니다.
 *
 * ⚠️ 이름을 «채점하지 않습니다». 고르기 전에 «어디를 볼지» 만 알려 줍니다.
 *    실제 채점은 judgeResource(surname, given, profile) 가 합니다.
 */
export function calcNamingBridge(input: NamingBridgeInput): NamingBridgeResult {
  const problems: string[] = []
  const { grades, yongsin } = input
  const heeksin = input.heeksin ?? null

  // resourceJudge 의 잣대도 함께 봅니다 — 점수는 career 것을 그대로 씁니다
  const score: Record<string, number> = {}
  for (const el of EL5) score[el] = grades[el]?.points ?? 0
  let profile: SajuOhaengProfileFull | null = null
  try {
    profile = buildSajuOhaengProfile({
      yongsin: yongsin ?? undefined, heeksin: heeksin ?? undefined,
      gisin: input.gisin ?? undefined, gusin: input.gusin ?? undefined, score,
    } as never)
  } catch {
    problems.push('자원오행 프로필을 만들지 못해 career 등급만으로 줄 세웠습니다')
  }

  const guides: NamingElementGuide[] = []
  const disagreed: Ohaeng[] = []

  for (const el of EL5) {
    const g = grades[el]
    if (!g) { problems.push(`${el} 등급이 없습니다`); continue }
    const careerGrade = g.grade
    const resourceLevel = profile?.level?.[el] ?? '모름'
    // ⚠️ «고립» 은 level 에 없습니다 — resourceJudge 가 따로 셉니다
    const isolated = !!profile?.isolated?.includes(el)

    // ── 우선순위 ──────────────────────────────────────────────
    let priority: NamingPriority
    let why: string
    if (el === yongsin) {
      priority = '용신'
      why = '사주가 가장 바라는 기운입니다. 이름에 먼저 담으십시오.'
    } else if (el === heeksin) {
      priority = '희신'
      why = '용신 다음으로 좋은 기운입니다.'
    } else if (el === input.gisin || el === input.gusin) {
      priority = '주의'
      why = '이 사주가 꺼리는 기운으로 봅니다. 담기 전에 한 번 더 살피십시오.'
    } else if (careerGrade === '과다') {
      // ★교재 2장 51쪽 — 과다한 기운을 더 살리면 오히려 부담이 됩니다
      priority = '피함'
      why = '이미 넉넉한 기운입니다. 더 보태면 오히려 부담이 될 수 있습니다.'
    } else if (careerGrade === '결핍' || careerGrade === '약함') {
      priority = '채움'
      why = careerGrade === '결핍'
        ? '이 사주에 거의 없는 기운입니다. 이름으로 채워 주면 좋습니다.'
        : '옅은 기운입니다. 이름으로 보태 주면 좋습니다.'
    } else {
      priority = '보통'
      why = '넉넉하지도 모자라지도 않습니다.'
    }

    // ★두 잣대가 어긋나는가 — 조용히 한쪽만 쓰지 않습니다
    const careerLow = careerGrade === '결핍' || careerGrade === '약함'
    const resourceLow = resourceLevel === '결핍' || isolated
    const careerHigh = careerGrade === '과다'
    const resourceHigh = resourceLevel === '과다'
    const disagree = (careerLow !== resourceLow) || (careerHigh !== resourceHigh)
    if (disagree && resourceLevel !== '모름') disagreed.push(el)

    guides.push({
      el, priority, rank: RANK[priority],
      careerGrade, points: g.points,
      resourceLevel: isolated ? `${resourceLevel}·고립` : resourceLevel,
      disagree, why,
    })
  }

  guides.sort((a, b) => (a.rank - b.rank) || (a.points - b.points))

  return {
    guides,
    fill: guides.filter((x) => x.priority === '용신' || x.priority === '희신' || x.priority === '채움').map((x) => x.el),
    avoid: guides.filter((x) => x.priority === '피함' || x.priority === '주의').map((x) => x.el),
    yongsin: yongsin ?? null,
    heeksin,
    disagreed,
    problems,
  }
}

// ── 화면 카드 ──────────────────────────────────────────────────────
//  ⚠️ lines 와 reasons 를 갈라 담습니다 (교훈 AV).

export function buildNamingCard(
  r: NamingBridgeResult, jijangganRatio?: Record<Ohaeng, number> | null,
): CareerCard {
  const lines: string[] = []
  const reasons: string[] = []

  if (r.fill.length > 0) {
    lines.push(`이름에 먼저 담아 보실 기운은 ${r.fill.join(' · ')} 입니다.`)
  } else {
    lines.push('특별히 먼저 담아야 할 기운이 두드러지지 않습니다.')
  }
  if (r.avoid.length > 0) {
    lines.push(`${r.avoid.join(' · ')} 는 이미 넉넉하거나 조심스러운 자리라, 굳이 더 보태지 않는 편이 좋겠습니다.`)
  }
  lines.push('상극이 있다 하여 흠으로 볼 일은 아니라는 견해가 실무에서 널리 따릅니다. '
    + '자원오행은 «사주가 바라는 기운을 채우는 것» 이 본래 목적입니다.')

  reasons.push(`담을 것 — ${r.fill.join('·') || '없음'} / 피할 것 — ${r.avoid.join('·') || '없음'}`)
  for (const g of r.guides) {
    reasons.push(`${g.el} ${g.points}점 · career «${g.careerGrade}» · resource «${g.resourceLevel}»`
      + ` → ${g.priority}${g.disagree ? '  ⚠️두 잣대가 어긋남' : ''}`)
  }
  if (r.disagreed.length) {
    reasons.push(`⚠️ 두 잣대가 어긋난 오행 — ${r.disagreed.join('·')}. `
      + '단정하지 말고 «두 관점이 있다» 로 전하십시오.')
  }
  if (jijangganRatio) {
    const s = Object.entries(jijangganRatio)
      .filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
      .map(([el, v]) => `${el} ${Math.round(v * 100)}%`).join(' · ')
    reasons.push(`월지 지장간이 실어 주는 기운 — ${s} (참고)`)
  }
  reasons.push('※ 이 카드는 «고르기 전 안내» 입니다. 실제 이름 채점은 resourceJudge 가 합니다.')
  if (r.problems.length) reasons.push(...r.problems.map((p) => `[살펴볼 점] ${p}`))

  return {
    key: 'naming',
    title: '이름에 담을 기운 (자원오행)',
    badge: r.fill[0] ?? '',
    lines, reasons,
    data: {
      fill: r.fill, avoid: r.avoid,
      yongsin: r.yongsin, heeksin: r.heeksin,
      guides: r.guides, disagreed: r.disagreed,
    },
  }
}
