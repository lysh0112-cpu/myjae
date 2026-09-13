// lib/saju/career/yukchin.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  진로적성 카드 ②  —  육친이 가리키는 곳                           │
// │  출전: 『명리적성 비법노트』(심산) 79~89쪽                          │
// └───────────────────────────────────────────────────────────────┘
//
// ★교재 40쪽이 못박은 것
//   "오행으로 판단 = 건강과 궁합. 격과 용신도 오행으로 본다."
//   "육친으로 판단 = 진로와 직업적성 (강점 지능 찾기)"
//   → 진로적성의 본체는 이 카드다.
//
// ★점수는 한 벌이고 이름만 둘이다.
//   책 사례가 "육친별 점수 목40 화30 토10 금15 수15" 처럼 오행 이름으로
//   적는 것이 그 증거다. 일간을 기준으로 오행을 십신으로 바꿔 부를 뿐이다.
//   그래서 따로 계산하지 않고 careerScore 를 그대로 받아 이름만 바꾼다.

import { calcCareerScore, gradeAll, pickStrong, EL5, type CareerScoreResult, type GradeResult, type Ohaeng } from './careerScore'
import type { CareerCard, CareerInput, Pillar } from './types'
import { iga, eunneun } from '../josa'
import { YUKCHIN_GIJIL, GRID25, YUKCHIN_ORDER, type YukchinGroup } from './tables/yukchin'
import { jobKey, okForStudent } from './tables/jobs'

const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const GEN: Record<Ohaeng, Ohaeng> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CON: Record<Ohaeng, Ohaeng> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }

/** 일간 오행 기준으로 오행 → 육친 묶음 */
export function yukchinOf(dayEl: Ohaeng, el: Ohaeng): YukchinGroup {
  if (el === dayEl) return '비겁'
  if (GEN[dayEl] === el) return '식상'
  if (CON[dayEl] === el) return '재성'
  if (CON[el] === dayEl) return '관성'
  return '인성'
}

export interface YukchinScore {
  group: YukchinGroup
  el: Ohaeng
  points: number
  count: number
  grade: GradeResult['grade']
}

/** 오행 점수를 육친 이름으로 바꿔 담는다 */
export function toYukchin(
  r: CareerScoreResult, g: Record<Ohaeng, GradeResult>, dayEl: Ohaeng,
): YukchinScore[] {
  return EL5.map(el => ({
    group: yukchinOf(dayEl, el), el,
    points: r.score[el] ?? 0, count: g[el].count, grade: g[el].grade,
  })).sort((a, b) => b.points - a.points)
}

// ── 카드 ────────────────────────────────────────────────────────
export function judgeYukchin(input: CareerInput): CareerCard {
  const { saju, solarMonth, solarDay, hourBranch } = input
  const day = saju.find((p: Pillar) => p.pillar === '일주')
  const dayEl = day && day.stem !== '?' ? STEM_EL[day.stem] : null

  if (!dayEl) {
    return { key: 'yukchin', title: '육친이 가리키는 곳', badge: '', lines: [],
             reasons: ['일간을 알 수 없어 육친을 보지 않았습니다.'] }
  }

  const r = calcCareerScore(saju, solarMonth, solarDay, hourBranch)
  const g = gradeAll(r)
  const rows = toYukchin(r, g, dayEl)
  const strongEls = pickStrong(r, g)
  const strong = strongEls.map(el => rows.find(x => x.el === el)!).filter(Boolean)
  const lack = rows.filter(x => x.grade === '결핍')
  const excess = rows.filter(x => x.grade === '과다')

  const lines: string[] = []
  const reasons: string[] = []

  // ★점수 나열은 화면의 막대그래프가 대신한다 (CareerJudgeCard).
  //   같은 숫자를 글로 또 늘어놓으면 오행 카드와 겹쳐 읽기 나빠진다.
  lines.push(`일간이 ${day!.stem}(${dayEl})이라 오행을 육친으로 바꿔 보면 이렇습니다.`)

  /*  🔴🔴 ★2026-09-13 (7부) [대표님이 «본인 사주» 에서 찾아내심]
   *
   *  [겪은 일]  대표님 사주 — 수 55(과다) · 토 25(발달)
   *    화면이  「비겁(比劫)과 관성(官星)이 ★강점 지능입니다」
   *            「독립심과 경쟁심과 ★추진력과 결단력이 있습니다」
   *    그런데 바로 아래에서
   *            「수 비겁 — 생각은 많은데 ★실천력이 부족해요」
   *            「비겁이 55점으로 힘이 많이 실렸어요 … ★독선적으로 일을 처리해요」
   *    ⇒ 🔴 ★같은 비겁을 두고 «추진력 있다» 와 «실천력 부족» 이 나란히 났습니다.
   *    ⇒ 게다가 위 오행 칸은 「수 55 → ★우유부단·추진력 부족」 이라 ★정반대로 말했습니다.
   *
   *  [까닭]  pickStrong 이 ★«발달» 과 «과다» 를 «함께» 강점 후보로 줍니다
   *    (careerScore.ts — 책 사례 아홉 건을 맞추려고 그렇게 되어 있습니다).
   *    그런데 교재 40쪽은 ★25~45(발달)만 «강점 지능» 이라 부릅니다. 50↑ 은 «과다» 입니다.
   *
   *  [고침]  ⛔ 뽑는 규칙(pickStrong)은 ★«안 건드립니다» — 책 사례 아홉 건이 걸려 있습니다.
   *    ★«부르는 말» 과 «붙이는 설명» 만 가릅니다 —
   *      발달 → 「강점 지능」 + 일반 강점 설명 (교재 그대로)
   *      과다 → 「★가장 크게 타고난 결」 + ⛔일반 강점 설명을 «붙이지 않습니다»
   *             (붙이면 바로 다음 줄의 «넘칠 때» 와 어긋납니다)
   *
   *  ⚠️ 오행 칸(tables/ohaeng.ts:79)은 ★이미 제대로 되어 있습니다 —
   *     「장점이 넘쳐서 오히려 걸림돌이 될 때가 있습니다」.
   *     ⇒ 육친 칸도 ★«같은 말» 을 하게 맞췄습니다. 두 칸이 갈리면 손님이 헷갈립니다. */
  /*  ★2026-09-13 (7부) [대표님] — 「과다는 ★강점이기는 하지만 단점으로 작용할 수도
   *    있으니 ★주의해야 한다」
   *    ⇒ ⛔ 과다를 «강점 지능» 에서 «빼지» 않습니다. 그대로 둡니다.
   *      대신 ★«주의 한 줄» 을 붙이고, 79쪽 묶음 설명은 아래 과다 줄에서 다룹니다. */
  if (strong.length) {
    const names = strong.slice(0, 2).map(x => `${x.group}(${YUKCHIN_GIJIL[x.group].hanja})`).join('과 ')
    lines.push(`${names}${iga(strong[0].group)} 강점 지능입니다.`)
    for (const x of strong.slice(0, 2)) {
      //  ⚠️ 과다면 79쪽 «묶음 강점» 을 붙이지 않습니다 —
      //     바로 아래 오행별 설명과 어긋나는 칸이 있습니다 (비겁×수 · 재성×수 · 식상×금).
      //     대신 아래 «과다» 줄에서 «강점이지만 주의» 로 한 번에 말합니다.
      if (x.grade !== '과다') lines.push(YUKCHIN_GIJIL[x.group].strong)
      const cell = GRID25[x.group][x.el]
      if (cell) {
        lines.push(`${x.el} ${x.group} — ${cell.gijil}`)
        //  ★교재의 «다른 해석» 을 가려서 전합니다 [대표님 2026-09-13]
        if (cell.note) lines.push(cell.note)
      }
    }
  }

  // 과다는 단점을 함께 (교재 40쪽 "50점 이상: 모험적 성향(단점)")
  //   ⚠️ ★«장점이 넘쳐 단점으로 나타날 수도 있다» — 교재의 뜻을 그대로 씁니다 [대표님 2026-09-13].
  //      오행 칸(ohaeng.ts:79)과 ★같은 말입니다.
  for (const x of excess) {
    lines.push(`${x.group}${iga(x.group)} ${x.points}점으로 힘이 많이 실렸어요. 강점이기는 하지만 장점이 넘쳐 단점으로 나타날 수도 있으니 살펴 두시면 좋습니다. ${YUKCHIN_GIJIL[x.group].weak}`)
  }
  // 없는 육친
  for (const x of lack) {
    lines.push(`${x.group}(${x.el})${iga(x.group)} 타고나지 않았어요 — ${YUKCHIN_GIJIL[x.group].keyword}. 곁에 두거나 살면서 길러 가면 되는 자리입니다.`)
  }

  // ── AI 재료 ───────────────────────────────────────────────────
  reasons.push(`일간 ${day!.stem}(${dayEl}) 기준 육친 점수 — ` +
    rows.map(x => `${x.group}(${x.el}) ${x.points}점/${x.count}자 ${x.grade}`).join(' · '))
  reasons.push(`강점 지능 : ${strong.slice(0, 2).map(x => x.group).join('·') || '뚜렷하지 않음'}`)
  if (excess.length) reasons.push(`과다(모험적 성향·단점) : ${excess.map(x => x.group).join('·')}`)
  if (lack.length) reasons.push(`없는 육친 : ${lack.map(x => `${x.group}(${x.el})`).join('·')}`)
  // ★2026-07-27 — 학생이면 어른용 직업을 재료에서도 뺀다.
  //   reasons 는 화면에 안 그려지지만 통변 프롬프트의 유일한 재료다.
  //   재료에 '유흥업'을 넣어 두고 프롬프트로 "쓰지 말라"고 하는 건
  //   6장 ①(지시 모순 금지)이 경계한 바로 그 형태다.
  const forStudent = input.target === 'student'
  const sift = (list: string[]) =>
    forStudent ? list.filter(j => okForStudent(jobKey(j))) : list

  for (const x of strong.slice(0, 2)) {
    const cell = GRID25[x.group][x.el]
    reasons.push(`${x.el}${x.group} 격자 — ${cell.gijil} 어울리는 일 : ${sift(cell.jobs).join(', ')}`)
    reasons.push(`${x.group} 어울리는 일 : ${sift(YUKCHIN_GIJIL[x.group].jobs).slice(0, 12).join(', ')} …`)
  }
  reasons.push('근거 : 교재 79~81쪽(육친 기질) · 82~89쪽(오행×육친 25칸) · 40쪽(발달·과다 기준)')
  reasons.push('이 대목("육친이 가리키는 곳")의 통변 재료입니다. 성향과 강점만 다루고, 학과·대학 이야기는 뒤 대목으로 넘기세요.')
  reasons.push('과다는 "나쁘다"가 아니라 "장점이 넘쳐 단점으로 나타난다"로 풀어 주세요.')

  const badge = strong.length ? strong[0].group : ''
  return {
    key: 'yukchin', title: '육친이 가리키는 곳', badge, lines, reasons,
    data: { dayEl, rows, strong: strong.map(x => x.group), excess: excess.map(x => x.group), lack: lack.map(x => x.group) } as unknown as Record<string, unknown>,
  }
}

export { YUKCHIN_ORDER }
