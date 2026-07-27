// lib/saju/career/special.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  특수격(特殊格) 살펴보기 — 판정이 아니라 "경고"다                   │
// │  출전: 『명리적성 비법노트』(심산) 128쪽                            │
// └───────────────────────────────────────────────────────────────┘
//
// 교재 128쪽:
//   "월상일위격, 시상일위격, 이기성상격, 삼기성상격, 종격 등의 특수격은
//    일반격과 구별하여 진로적성을 판단한다."
//
// ★그런데 교재에 특수격의 성립 조건이 실려 있지 않다.
//   (심화 편에서 다룰 계획이라고만 적혀 있다)
//   그래서 여기서는 **성립을 단정하지 않는다.** 의심스러운 사주에
//   "일반격으로 풀면 안 될 수 있다"는 표시만 붙인다.
//
// [왜 필요한가]
//   1998.1.5 寅시 사주(壬壬壬丁 · 寅子子丑)는 수(水)가 80점이다.
//   이런 사주를 일반격 잣대로 "수가 과다해 우유부단"이라고 풀면
//   틀린 방향으로 갈 수 있다. 종왕격이면 오히려 그 힘을 따라야 한다.
//
// [의심 기준 — 우리가 정한 것. 연재쌤 확인 대상]
//   ① 한 오행이 65점 이상             한쪽으로 완전히 쏠림
//   ② 결핍(0점) 오행이 셋 이상        나머지가 거의 없음
//   ③ 천간 넉 자 중 셋 이상이 같은 글자  일기격(一氣格) 의심
//   ④ 일간과 월간·시간이 천간합       화기격(化氣格) 의심
//
//   하나라도 걸리면 "상담사 확인 필요" 표시를 띄운다.

import { calcCareerScore, gradeAll, EL5, type CareerScoreResult } from './careerScore'
import type { CareerCard, CareerInput, Pillar } from './types'
import { iga, wagwa } from '../josa'

const EL_HANJA: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }

/** 천간합 (교재·통설) */
const CHEONGAN_HAP: Array<[string, string, string]> = [
  ['甲', '己', '토'], ['乙', '庚', '금'], ['丙', '辛', '수'],
  ['丁', '壬', '목'], ['戊', '癸', '화'],
]

export interface SpecialFlag {
  key: string
  label: string
  detail: string
}

export function checkSpecial(saju: Pillar[], r: CareerScoreResult): SpecialFlag[] {
  const flags: SpecialFlag[] = []
  const g = gradeAll(r)

  // ① 한 오행 65점 이상
  for (const el of EL5) {
    const pts = r.score[el] ?? 0
    if (pts >= 65) {
      flags.push({
        key: 'jonwang', label: '한 오행 쏠림',
        detail: `${el}(${EL_HANJA[el]})${iga(el)} ${pts}점으로 사주를 이끌고 있어요. 종격·전왕격 같은 특수격일 수 있습니다.`,
      })
      break
    }
  }

  // ② 결핍 오행 셋 이상
  const lack = EL5.filter(el => g[el].grade === '결핍')
  if (lack.length >= 3) {
    flags.push({
      key: 'manylack', label: '없는 오행이 많음',
      detail: `${lack.join('·')} 세 가지 이상이 아예 없어요. 일반격 잣대로만 보기 어렵습니다.`,
    })
  }

  // ③ 천간 일기격 의심
  const stems = saju.map(p => p.stem).filter(s => s && s !== '?')
  const tally: Record<string, number> = {}
  for (const s of stems) tally[s] = (tally[s] ?? 0) + 1
  const same = Object.entries(tally).find(([, n]) => n >= 3)
  if (same) {
    flags.push({
      key: 'ilgi', label: '천간 일기격 의심',
      detail: `천간에 ${same[0]}${iga(same[0])} ${same[1]}개입니다. 일기격(一氣格)일 수 있습니다.`,
    })
  }

  // ④ 화기격 의심 — 일간이 월간 또는 시간과 천간합
  const day = saju.find(p => p.pillar === '일주')?.stem
  if (day && day !== '?') {
    for (const side of ['월주', '시주']) {
      const other = saju.find(p => p.pillar === side)?.stem
      if (!other || other === '?') continue
      const hap = CHEONGAN_HAP.find(([a, b]) => (a === day && b === other) || (b === day && a === other))
      if (hap) {
        flags.push({
          key: 'hwagi', label: '화기격 의심',
          detail: `일간 ${day}${wagwa(day)} ${side.replace('주', '간')} ${other}${iga(other)} 천간합(${hap[2]})을 합니다. 화기격(化氣格)일 수 있습니다.`,
        })
        break
      }
    }
  }

  return flags
}

// ── 카드 (경고용. 걸린 게 없으면 카드를 만들지 않는다) ──────────
export function judgeSpecial(input: CareerInput): CareerCard | null {
  const r = calcCareerScore(input.saju, input.solarMonth, input.solarDay, input.hourBranch)
  const flags = checkSpecial(input.saju, r)
  if (!flags.length) return null

  const lines = [
    '이 사주는 한 기운으로 뚜렷하게 모여 있어요. 흔한 잣대로만 재기 어려운 구조입니다.',
    ...flags.map(f => f.detail),
    '아래 풀이는 흔한 기준으로 본 것이니, 상담사와 한 번 더 맞춰 보시면 더 정확해집니다.',
  ]
  const reasons = [
    `특수격 의심 : ${flags.map(f => f.label).join(' · ')}`,
    ...flags.map(f => `  - ${f.detail}`),
    '★교재 128쪽 "특수격은 일반격과 구별하여 진로적성을 판단한다". 다만 교재에 성립 조건이 없어 단정하지 않습니다.',
    '통변에서는 "이럴 수 있다" 정도로만 짚고, 겁을 주거나 단정하지 마세요. 일반격 풀이를 그대로 이어가되 여지를 남기세요.',
  ]
  return { key: 'special', title: '한 번 더 볼 점', badge: '확인 필요', lines, reasons,
           data: { flags } as unknown as Record<string, unknown> }
}
