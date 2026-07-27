// lib/saju/career/gyeyeol.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  진로적성 카드 ⑨  —  계열(문·이과)                               │
// │  출전: 『명리적성 비법노트』(심산) 129·133쪽                        │
// └───────────────────────────────────────────────────────────────┘
//
// ★교재에 계열 규칙이 두 개 있는데, 사례로 검증한 결과 ⓑ만 맞았다.
//
//   ⓐ 오행별 표 (129쪽)  목7:3 · 화6:4 · 토(무진술6:4/기축미4:6) · 금3:7 · 수4:6
//      → 토(土)가 1위일 때 무너진다. 교재 스스로 "토는 음양을 모두 포함한다"
//        고 했으므로 토를 계열의 대표로 삼으면 안 된다.
//        사례 (3) 초등학생 : 토 1위 → ⓐ는 인문 60, 책은 이과 70.  ❌
//
//   ⓑ 그룹 비교 (133쪽)  "목화 오행이 강하면 인문 70 : 자연 30
//                        금수 오행이 강하면 자연 70 : 인문 30
//                        토 오행은 음양을 모두 포함한다"
//      → 책이 계열 비율을 밝힌 사례 네 건 모두 맞는다.  ✅
//        (1)신생아 이과70 · (2)유치원생 문과 · (3)초등학생 이과70 · (9)삼수생 이과65
//
//   그래서 ⓑ를 본줄기로 삼고, 토는 무진술/기축미로 갈라 약하게만 얹는다.
//
// ★예체능은 따로 본다 (교재 129쪽)
//   "문과 적성(木), 이과 적성(金), 예체능 계열 적성(火)이 70% 적용되고
//    30%는 예외적으로 적용되므로 단식 판단은 금물이다."

import { calcCareerScore, gradeAll, pickStrong, EL5, type CareerScoreResult, type Ohaeng } from './careerScore'
import type { CareerCard, CareerInput } from './types'

/** 무진술(戊辰戌) 양토 = 인문 쪽 / 기축미(己丑未) 음토 = 자연 쪽 (교재 133쪽) */
const YANG_TO = ['戊', '辰', '戌']
const EUM_TO = ['己', '丑', '未']

export interface GyeyeolResult {
  /** 인문 비율 (0~100) */
  humanities: number
  /** 자연 비율 (0~100) */
  science: number
  mokhwa: number
  geumsu: number
  to: number
  toYang: number
  toEum: number
  /** 예체능 소질이 뚜렷한가 (화가 발달 이상) */
  arts: boolean
  lean: '인문' | '자연' | '반반'
}

export function calcGyeyeol(r: CareerScoreResult): GyeyeolResult {
  const s = r.score
  const mokhwa = (s['목'] ?? 0) + (s['화'] ?? 0)
  const geumsu = (s['금'] ?? 0) + (s['수'] ?? 0)
  const to = s['토'] ?? 0

  // 토를 양토/음토로 나눈다 (글자 기준)
  let toYang = 0, toEum = 0
  const marks = r.chars['토'] ?? []
  for (const m of marks) {
    if (YANG_TO.includes(m.ch)) toYang++
    else if (EUM_TO.includes(m.ch)) toEum++
  }
  const toTotal = toYang + toEum
  const toH = toTotal ? to * (toYang * 0.6 + toEum * 0.4) / toTotal : to * 0.5
  const toS = to - toH

  const base = mokhwa + geumsu + to
  let humanities: number, science: number
  if (base === 0) { humanities = 50; science = 50 }
  else if (mokhwa > geumsu) { humanities = 70; science = 30 }
  else if (geumsu > mokhwa) { humanities = 30; science = 70 }
  else {
    // ★목화와 금수가 같으면 대표 오행(강점 지능)으로 가른다.
    //   사례 (1) 신생아가 이 경우다. 우리 100점 배점에서 목화45 = 금수45 인데
    //   대표 오행이 금(金)이므로 책과 같이 이과 쪽으로 본다.
    const top = pickStrong(r, gradeAll(r))[0]
    if (top === '목' || top === '화') { humanities = 70; science = 30 }
    else if (top === '금' || top === '수') { humanities = 30; science = 70 }
    else {
      humanities = Math.round((mokhwa + toH) / base * 100)
      science = 100 - humanities
    }
  }

  const g = gradeAll(r)
  const arts = g['화'].grade === '발달' || g['화'].grade === '과다'

  return {
    humanities, science, mokhwa, geumsu, to, toYang, toEum, arts,
    lean: humanities > science ? '인문' : science > humanities ? '자연' : '반반',
  }
}

// ── 카드 ────────────────────────────────────────────────────────
export function judgeGyeyeol(input: CareerInput): CareerCard {
  const r = calcCareerScore(input.saju, input.solarMonth, input.solarDay, input.hourBranch)
  const y = calcGyeyeol(r)

  const lines: string[] = []
  const reasons: string[] = []

  lines.push(`목화가 ${y.mokhwa}점, 금수가 ${y.geumsu}점입니다.`)
  if (y.lean === '인문') {
    lines.push(`인문 ${y.humanities} : 자연 ${y.science} — 문과 쪽 결입니다.`)
  } else if (y.lean === '자연') {
    lines.push(`인문 ${y.humanities} : 자연 ${y.science} — 이과 쪽 결입니다.`)
  } else {
    lines.push('목화와 금수가 팽팽해서 어느 쪽으로도 열려 있어요.')
  }
  if (y.to) lines.push(`토(土)는 음양을 모두 품은 오행이라 계열을 가르는 대표로 보지 않았습니다. (양토 ${y.toYang}자 · 음토 ${y.toEum}자)`)
  if (y.arts) lines.push('화(火)가 발달해 예체능 소질이 함께 보입니다.')
  lines.push('계열 비율은 70%만 적용되고 30%는 예외입니다. 이 비율 하나로 진로를 단정하지 마세요.')

  reasons.push(`계열 — 목화 ${y.mokhwa} vs 금수 ${y.geumsu} → 인문 ${y.humanities} : 자연 ${y.science}`)
  reasons.push(`토 ${y.to}점 (양토 ${y.toYang}자 · 음토 ${y.toEum}자) — 대표로 삼지 않음`)
  if (y.arts) reasons.push('화(火)가 발달 이상이라 예체능 소질을 함께 짚어 주세요. (교재 129쪽 "예체능 계열 적성=火")')
  reasons.push('근거 : 교재 133쪽 그룹 비교 / 129쪽 "문과=木 이과=金 예체능=火, 70% 적용"')
  reasons.push('이 대목("계열과 학과")의 통변 재료입니다. 비율은 참고치라고 반드시 덧붙이세요.')

  return {
    key: 'gyeyeol', title: '계열과 학과', badge: y.lean === '반반' ? '' : y.lean,
    lines, reasons, data: { ...y } as unknown as Record<string, unknown>,
  }
}
