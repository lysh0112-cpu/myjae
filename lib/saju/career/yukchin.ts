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

  // 강점 지능
  if (strong.length) {
    const names = strong.slice(0, 2).map(x => `${x.group}(${YUKCHIN_GIJIL[x.group].hanja})`).join('과 ')
    lines.push(`${names}${iga(strong[0].group)} 강점 지능입니다.`)
    for (const x of strong.slice(0, 2)) {
      const info = YUKCHIN_GIJIL[x.group]
      lines.push(info.strong)
      const cell = GRID25[x.group][x.el]
      if (cell) lines.push(`${x.el} ${x.group} — ${cell.gijil}`)
    }
  }
  // 과다는 단점을 함께 (교재 40쪽 "50점 이상: 모험적 성향(단점)")
  for (const x of excess) {
    lines.push(`${x.group}${iga(x.group)} ${x.points}점으로 힘이 많이 실렸어요. 그래서 이런 면이 함께 나옵니다. ${YUKCHIN_GIJIL[x.group].weak}`)
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
