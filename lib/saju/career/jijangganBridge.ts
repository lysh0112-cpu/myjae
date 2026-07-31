// lib/saju/career/jijangganBridge.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  지장간 잇기 — 기존 진로적성 파이프라인에 «덧붙이기만» 합니다        │
// └───────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-07-31 (41부 Step 3) — 대표님 확정 지침
//
//  [왜 «새 엔진» 이 아니라 «잇기» 인가]
//    lib/saju/career/ 에 진로적성 파이프라인이 «이미 있습니다» (파일 스무 개).
//      calcPerson → calcCareerScore → gradeAll → pickStrong
//                 → jobFit / roleFit / gyeyeol → buildCareerPrompt
//    새 엔진을 만들면 «적성 판정기가 둘» 이 됩니다 (교훈 CJ).
//    화면은 career 쪽을 쓰는데 새 엔진만 고치면 그 순간 갈립니다.
//
//  ★그래서 이 파일은 «기존 값을 하나도 건드리지 않습니다».
//    없던 것(지장간)만 옆에 더합니다.
//
//  [정말 없던 것]
//    · 절입(節入) 시각으로부터 «며칠 지났는가»
//    · 그 날수로 가른 여기(餘氣)·중기(中氣)·정기(正氣)
//
//  [어느 지장간 표를 쓰나]
//    ★lib/saju/yongsinNew.ts 의 JIJANGAN 을 씁니다.
//      2026-07-31 실측 — 그 표만 12/12 «여 → 중 → 정» 순서가 일정합니다.
//      출산택일의 sajuTables 는 «집합용» 이라 순서가 일정하지 않습니다
//      (丑辰巳未戌 [정,여,중] · 寅申 [정,중,여]). 날수 배분에 쓰면 여기·중기가 뒤바뀝니다.
//
//  ⚠️ 날수 배분은 «전통 배분» 입니다 — 교재 대조 대기 중.
//     교재 쪽수가 오면 splitJijanggan 의 daySplit 인자로 갈아끼우면 됩니다.
// ══════════════════════════════════════════════════════════════════

import { calcSolarTermMoment } from '../solartermCalc'
import {
  splitJijanggan, daysAfterJolip, type JijangganResult, type JijangganSpec,
} from '../jijanggan'
import { JIJANGAN } from '../yongsinNew'
import type { CareerCard, Ohaeng, Pillar } from './types'

/** ★날수 배분에 쓸 표 — 순서 검증을 통과한 쪽 (2026-07-31 실측) */
export const CAREER_JIJANGGAN_SPEC: JijangganSpec = {
  table: JIJANGAN,
  order: '여기먼저',
}

/**
 * 지지 → 그 지지를 여는 «절(節)» 의 달 번호.
 *   solartermCalc 는 monthIdx 로 절기를 가립니다 (1 소한 · 2 입춘 · … · 12 대설).
 */
const BRANCH_TO_TERM_MONTH: Readonly<Record<string, number>> = {
  丑: 1,  // 소한
  寅: 2,  // 입춘
  卯: 3,  // 경칩
  辰: 4,  // 청명
  巳: 5,  // 입하
  午: 6,  // 망종
  未: 7,  // 소서
  申: 8,  // 입추
  酉: 9,  // 백로
  戌: 10, // 한로
  亥: 11, // 입동
  子: 12, // 대설
}

export interface JolipMoment {
  /** 절입 시각 (KST) */
  at: Date
  /** 어느 절기인가 (1~12) */
  termMonth: number
  /** 절입 시각을 계산으로 구했는가 — 지금은 언제나 true */
  fromCalc: true
}

/**
 * 월지를 여는 절입 시각을 구합니다.
 *
 * ⚠️ 해(年) 경계를 조심해야 합니다.
 *    子월(대설)은 12월 초에 열려 이듬해 1월 5일까지 갑니다.
 *    1월 3일생이 子월이면 절입은 «지난해» 대설입니다.
 *    → 후보 해에서 절입을 구해 보고, 생일보다 «뒤» 면 한 해 앞으로 물립니다.
 */
export function findJolip(
  monthBranch: string, solarYear: number, solarMonth: number, solarDay: number,
): JolipMoment | null {
  const termMonth = BRANCH_TO_TERM_MONTH[monthBranch]
  if (!termMonth) return null

  for (const y of [solarYear, solarYear - 1]) {
    const m = calcSolarTermMoment(y, termMonth)
    if (!m) continue
    const at = new Date(Date.UTC(y, m.month - 1, m.day, 0, 0, 0))
    // KST 기준 시각을 UTC 로 옮깁니다 (KST = UTC+9)
    at.setUTCMinutes(at.getUTCMinutes() + Math.round(m.hour * 60) - 9 * 60)

    const birth = new Date(Date.UTC(solarYear, solarMonth - 1, solarDay, 0, 0, 0))
    birth.setUTCMinutes(birth.getUTCMinutes() - 9 * 60)
    // 생일이 절입보다 앞서면 이 해의 절입이 아닙니다 — 한 해 물립니다
    if (birth.getTime() + 40 * 86400000 < at.getTime()) continue
    if (birth.getTime() >= at.getTime() - 86400000) {
      return { at, termMonth, fromCalc: true }
    }
  }
  return null
}

export interface JijangganBridgeResult {
  /** 월지 */
  monthBranch: string
  /** 절입 시각 (KST). 못 구하면 null */
  jolipAt: Date | null
  /** 절입 뒤 며칠째인가. 못 구하면 null */
  daysAfterJol: number | null
  /** 지장간 구간 판정. 못 구하면 null */
  jijanggan: JijangganResult | null
  /** ★조용히 넘기지 않습니다 */
  problems: string[]
}

export interface JijangganBridgeInput {
  saju: Pillar[]
  solarYear: number
  solarMonth: number
  solarDay: number
  /** 태어난 시각의 «분». 모르면 정오(720)로 봅니다 */
  birthMinute?: number | null
  /** 그 절기월의 총 날수. 기본 30 */
  totalDays?: number
}

/**
 * ★기존 파이프라인에 «덧붙이는» 계산.
 *   기존 CareerScoreResult·GradeResult 를 하나도 건드리지 않습니다.
 */
export function calcJijangganBridge(input: JijangganBridgeInput): JijangganBridgeResult {
  const problems: string[] = []
  const monthPillar = input.saju.find((p) => p.pillar === '월주')
  const monthBranch = monthPillar?.branch ?? ''

  if (!monthBranch || monthBranch === '?') {
    problems.push('월지를 알 수 없어 지장간을 가르지 못했습니다')
    return { monthBranch: '', jolipAt: null, daysAfterJol: null, jijanggan: null, problems }
  }

  const jol = findJolip(monthBranch, input.solarYear, input.solarMonth, input.solarDay)
  if (!jol) {
    problems.push(`${monthBranch}월의 절입 시각을 구하지 못했습니다 (${input.solarYear}년)`)
    return { monthBranch, jolipAt: null, daysAfterJol: null, jijanggan: null, problems }
  }

  // ⚠️ 태어난 «분» 을 모르면 정오로 봅니다. 구간이 7~18일 단위라 하루 안쪽 차이는
  //    대체로 결과를 바꾸지 않지만, 경계에 붙으면 갈립니다. 그래서 남깁니다.
  const minute = input.birthMinute ?? null
  if (minute == null) problems.push('태어난 시각을 몰라 정오로 보았습니다 (구간 경계에서는 갈릴 수 있습니다)')
  const birth = new Date(Date.UTC(input.solarYear, input.solarMonth - 1, input.solarDay, 0, 0, 0))
  birth.setUTCMinutes(birth.getUTCMinutes() + (minute ?? 720) - 9 * 60)

  const days = daysAfterJolip(birth, jol.at)
  const r = splitJijanggan(monthBranch, days, CAREER_JIJANGGAN_SPEC, { totalDays: input.totalDays })
  if (!r) {
    problems.push(`${monthBranch} 의 지장간을 가르지 못했습니다`)
    return { monthBranch, jolipAt: jol.at, daysAfterJol: days, jijanggan: null, problems }
  }
  problems.push(...r.problems)

  return { monthBranch, jolipAt: jol.at, daysAfterJol: days, jijanggan: r, problems }
}

// ── 화면 카드 ──────────────────────────────────────────────────────
//  ★기존 CareerCard 모양 그대로입니다. 화면(CareerJudgeCard)을 안 고쳐도 됩니다.
//  ⚠️ lines 와 reasons 를 갈라 담습니다 (교훈 AV).
//     lines   = 손님이 읽는 문장
//     reasons = 통변 엔진에게만 주는 재료 — 화면에 안 나갑니다

const STAGE_WORD: Readonly<Record<string, string>> = {
  여: '여기(餘氣) — 지난 달의 기운이 아직 남아 있는 자리',
  중: '중기(中氣) — 가운데를 지나는 자리',
  정: '정기(正氣) — 그 달의 기운이 온전히 서는 자리',
}

export function buildJijangganCard(r: JijangganBridgeResult): CareerCard {
  const lines: string[] = []
  const reasons: string[] = []

  if (!r.jijanggan || !r.jolipAt || r.daysAfterJol == null) {
    return {
      key: 'jijanggan', title: '월지 지장간', badge: '',
      lines: ['태어난 절기 안의 자리를 가리지 못했습니다.'],
      reasons: r.problems,
      data: { problems: r.problems },
    }
  }

  const j = r.jijanggan
  const d = r.daysAfterJol
  lines.push(`태어난 달의 지지는 ${r.monthBranch} 이고, 절기가 든 뒤 ${d.toFixed(1)}일째입니다.`)
  lines.push(`이 자리는 ${STAGE_WORD[j.stage] ?? j.stage} 로, 지장간은 ${j.currentGan} 입니다.`)
  const share = Object.entries(j.elementRatio)
    .sort((a, b) => b[1] - a[1])
    .map(([el, v]) => `${el} ${Math.round(v * 100)}%`)
    .join(' · ')
  lines.push(`이 달의 기운을 나누어 보면 ${share} 입니다.`)

  reasons.push(`월지 ${r.monthBranch} · 절입 뒤 ${d.toFixed(2)}일 · ${j.stage}기 ${j.currentGan}`)
  reasons.push(`구간 — ${j.slices.map((s) => `${s.stage}기 ${s.gan} ${s.days.toFixed(1)}일`).join(' / ')}`)
  reasons.push('※ 날수 배분은 전통 배분입니다 — 교재 대조 대기 중. 단정하지 말고 참고로 전하십시오.')
  if (j.merged.length) reasons.push(`표에 없던 단계를 합친 자리 — ${j.merged.join(' · ')}`)
  if (r.problems.length) reasons.push(...r.problems.map((p) => `[살펴볼 점] ${p}`))

  return {
    key: 'jijanggan',
    title: '월지 지장간',
    badge: `${j.stage}기`,
    lines, reasons,
    data: {
      monthBranch: r.monthBranch,
      jolipAt: r.jolipAt.toISOString(),
      daysAfterJol: d,
      currentGan: j.currentGan,
      stage: j.stage,
      slices: j.slices,
      ratio: j.ratio,
      elementRatio: j.elementRatio,
    },
  }
}

/** 지장간이 실어 주는 오행 비율 — 다른 부품이 가져다 쓰기 좋게 */
export function jijangganElementRatio(r: JijangganBridgeResult): Record<Ohaeng, number> | null {
  if (!r.jijanggan) return null
  const out = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 } as Record<Ohaeng, number>
  for (const [el, v] of Object.entries(r.jijanggan.elementRatio)) {
    if (el in out) out[el as Ohaeng] = v
  }
  return out
}
