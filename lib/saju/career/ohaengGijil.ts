// lib/saju/career/ohaengGijil.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  진로적성 카드 ①  —  타고난 오행의 결                             │
// │  출전: 『명리적성 비법노트』(심산) 74~78쪽(기질) · 40쪽(발달·과다)    │
// └───────────────────────────────────────────────────────────────┘
//
// ★2026-07-28 연재쌤 확정에 맞춰 다시 짰다.
//   ① 배점 100점 (현재 프로그램)  ② 시지 계절치환 적용  ③ 寅월 수25·목10
//   ④ 발달 25~45점 / 과다 50점 이상  ⑤ 글자 개수 잣대 병행 (교재 40쪽)
//
//   → 점수 계산은 careerScore.ts 가 맡는다. 이 파일은 문장만 만든다.
//
// ⚠️ 이 카드는 "오행"의 결을 말한다. 진로·직업 판단의 본체는 카드②(육친)다.
//    교재 40쪽 "오행으로 판단 = 건강과 궁합, 격과 용신 / 육친으로 판단 = 진로와 직업적성"

import {
  calcCareerScore, gradeAll, pickStrong, EL5, GRADE_RULE, TIE_GAP,
  type CareerScoreResult, type GradeResult, type Ohaeng,
} from './careerScore'
import { seasonConvertNote } from '../simsanOhaeng'
import type { CareerCard, CareerInput } from './types'
import { isHourUnknown } from './types'
import { iga } from '../josa'
import { OHAENG_GIJIL, GRADE_NOTE, OHAENG_ORDER } from './tables/ohaeng'

export interface OhaengGijilData {
  score: Record<Ohaeng, number>
  grades: Record<Ohaeng, GradeResult>
  top: Ohaeng[]        // 강점 (점수 순, 동점이면 글자 많은 쪽)
  excess: Ohaeng[]     // 과다
  lack: Ohaeng[]       // 결핍
  weak: Ohaeng[]       // 약함
  gap: number          // 1위-2위 점수 차
  monthNote: string | null
  hourNote: string | null
  hourUnknown: boolean
  total: number
}

export function judgeOhaengGijil(input: CareerInput): CareerCard {
  const { saju, solarMonth, solarDay, hourBranch } = input
  const r: CareerScoreResult = calcCareerScore(saju, solarMonth, solarDay, hourBranch)
  const g = gradeAll(r)
  const strong = pickStrong(r, g)

  const excess = EL5.filter(e => g[e].grade === '과다')
  const lack = EL5.filter(e => g[e].grade === '결핍')
  const weak = EL5.filter(e => g[e].grade === '약함')

  const sorted = [...EL5].sort((a, b) => (r.score[b] ?? 0) - (r.score[a] ?? 0))
  const gap = (r.score[sorted[0]] ?? 0) - (r.score[sorted[1]] ?? 0)

  const monthNote = seasonConvertNote(
    saju.find(p => p.pillar === '월주')?.branch ?? '',
    solarMonth, solarDay, hourBranch ?? '',
  )
  const hourUnknown = isHourUnknown(saju)

  // ── 고객이 읽을 문장 ──────────────────────────────────────────
  const lines: string[] = []
  if (!lack.length) lines.push('목화토금수 다섯 오행을 모두 갖춘 오행구족격입니다.')

  for (const el of strong.slice(0, 2)) {
    const row = OHAENG_GIJIL[el], x = g[el]
    lines.push(`${el}(${row.hanja}) ${x.points}점 · ${x.count}자 — ${row.keyword}`)
    lines.push(row.strong)
    if (x.grade === '과다') {
      lines.push(GRADE_NOTE.과다)
      lines.push(row.weak)
    }
  }
  if (strong.length >= 2 && gap <= TIE_GAP) {
    lines.push(`1위와 2위의 점수 차가 ${gap}점으로 작아요. 한 가지 색으로 단정하기 어려운 사주입니다.`)
  }
  for (const el of excess) {
    if (strong.slice(0, 2).includes(el)) continue
    lines.push(`${el}(${OHAENG_GIJIL[el].hanja})에도 ${g[el].points}점으로 힘이 실렸어요. ${OHAENG_GIJIL[el].weak}`)
  }
  for (const el of lack) {
    lines.push(`${el}(${OHAENG_GIJIL[el].hanja})${iga(el)} 타고나지 않았어요 — ${OHAENG_GIJIL[el].keyword}. ${GRADE_NOTE.결핍}`)
  }
  if (r.hourNote) lines.push(r.hourNote)
  if (monthNote) lines.push(monthNote)
  if (hourUnknown) {
    lines.push('태어난 시(時)를 몰라 시주 두 자리를 비워 두고 보았어요. 점수는 나머지 여덟 자리를 100점으로 환산해 판단했습니다.')
  }

  // ── AI 통변 재료 ─────────────────────────────────────────────
  const reasons: string[] = []
  reasons.push('오행 점수 — ' + EL5.map(e => `${e} ${g[e].points}점/${g[e].count}자${g[e].hasMonth ? '(월지포함)' : ''} ${g[e].grade}`).join(' · ') + ` (합 ${r.total})`)
  reasons.push(`강점 오행 : ${strong.slice(0, 2).join('·') || '뚜렷하지 않음'} (1위-2위 차 ${gap})`)
  if (gap <= TIE_GAP && strong.length >= 2) reasons.push(`★점수 차가 ${gap}점으로 작습니다. 1위 하나로 단정하지 말고 둘을 함께 말하세요.`)
  const dis = EL5.filter(e => g[e].disagree)
  if (dis.length) reasons.push(`점수와 글자 수가 어긋나는 오행 : ${dis.map(e => `${e}(${g[e].points}점=${g[e].byPoint}/${g[e].count}자=${g[e].byCount})`).join(' · ')} — 조심해서 다루세요.`)
  if (excess.length) reasons.push(`과다(${GRADE_RULE.EXCESS_MIN}점 이상 또는 글자 과다) : ${excess.join('·')} — 교재 40쪽 "모험적 성향(단점)"`)
  if (lack.length) reasons.push(`결핍 : ${lack.join('·')}`)
  if (weak.length) reasons.push(`약함 : ${weak.join('·')}`)
  for (const el of strong.slice(0, 2)) {
    reasons.push(`${el} 장점 — ${OHAENG_GIJIL[el].strong}`)
    reasons.push(`${el} 단점 — ${OHAENG_GIJIL[el].weak}`)
  }
  if (r.hourConverted) reasons.push(`시지 계절치환 적용 : ${r.hourNote}`)
  if (hourUnknown) reasons.push('시(時)를 몰라 시주를 비웠습니다. 시주가 필요한 이야기는 단정하지 마세요.')
  reasons.push('근거 : 교재 74~78쪽(오행 기질) · 40쪽(발달 25~45 / 과다 50↑, 글자 개수 병행) · 58~61쪽(점수 계산법)')
  reasons.push('이 대목("타고난 오행의 결")의 통변 재료입니다. 오행의 결만 다루고, 학과·직업 이야기는 뒤 대목으로 넘기세요.')
  reasons.push('오행 강약은 좋고 나쁨이 아니라 결의 방향입니다. 우열을 가르듯 쓰지 마세요.')

  const badge = excess.length ? '편중' : (gap <= TIE_GAP ? '고름' : '')

  const data: OhaengGijilData = {
    score: r.score as Record<Ohaeng, number>, grades: g, top: strong,
    excess, lack, weak, gap, monthNote, hourNote: r.hourNote, hourUnknown, total: r.total,
  }
  return {
    key: 'ohaeng_gijil', title: '타고난 오행의 결', badge, lines, reasons,
    data: data as unknown as Record<string, unknown>,
  }
}
