// lib/saju/career/gyeokguk.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  진로적성 카드 ⑦  —  격국(格局)                                  │
// │  출전: 『명리적성 비법노트』(심산) 62~65쪽                          │
// │        「16. 격국(格局)과 십정격(十正格)」                          │
// └───────────────────────────────────────────────────────────────┘
//
// [왜 감싸개를 따로 두는가]
//   lib/saju/yongsinNew.ts 의 calcGyeokguk() 은 **월지 지장간의 투간**만 본다.
//   그런데 교재 62쪽의 건록격·양인격은 **투간과 무관**하게 성립한다.
//
//     건록격 = 일간과 월지가 같은 오행이고 음양도 같다 (월지에 비견)
//     양인격 = 일간과 월지가 같은 오행이고 음양이 다르다 (월지에 겁재)
//
//   실제로 1998.1.5 寅시 사주(壬 일간 · 子월)를 넣으면
//     교재 기준 → 양인격
//     calcGyeokguk → 비견격   ← 여기 壬이 투간했다고 봄
//   으로 어긋난다.
//
//   ⚠️ calcGyeokguk 자체는 건드리지 않는다. 궁합·사주보기가 함께 쓴다.
//      여기서 특례만 먼저 걸러 내고, 아니면 그대로 넘긴다.
//
// [격의 자리 — 교재 62쪽]
//   년 천간에 격이 있으면 국가·정부와 관련된 일
//   월 천간에 격이 있으면 사회·단체와 관련된 일
//   시 천간이나 월지에 격이 있으면 개인·가정적인 일

import { calcGyeokguk, sipsinOf, type GyeokgukResult } from '../yongsinNew'
import type { CareerCard, CareerInput, Pillar } from './types'
import { GYEOKGUK_INFO, GYEOK_POSITION } from './tables/gyeokguk'

/** 지지의 본기(本氣) — 그 지지의 본래 기운이 되는 천간 */
const BONGI: Record<string, string> = {
  子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙',
  午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬',
}

export interface CareerGyeokguk extends GyeokgukResult {
  /** 건록·양인 특례로 잡혔는가 */
  special: boolean
  /** 격이 어느 자리에 있는가 ('년간'|'월간'|'시간'|'월지'|null) */
  position: string | null
  positionNote: string
}

/**
 * 진로적성용 격국.
 * ① 건록·양인 특례를 먼저 본다 (교재 62쪽)
 * ② 아니면 기존 calcGyeokguk 에 맡긴다 (월지 지장간 투간)
 */
export function calcCareerGyeokguk(saju: Pillar[], dayStem: string): CareerGyeokguk {
  const month = saju.find(p => p.pillar === '월주')
  const base = calcGyeokguk(saju, dayStem)

  let name = base.name
  let special = false

  if (month) {
    const bongi = BONGI[month.branch]
    if (bongi) {
      const s = sipsinOf(dayStem, bongi)
      if (s === '비견') { name = '건록격'; special = true }
      else if (s === '겁재') { name = '양인격'; special = true }
    }
  }

  // 격이 어느 자리에 드러났는가 — 격의 오행과 같은 천간을 찾는다
  let position: string | null = null
  if (!special && month) {
    const target = name.replace('격', '')
    for (const p of ['년주', '월주', '시주']) {
      const pil = saju.find(x => x.pillar === p)
      if (pil && pil.stem !== '?' && sipsinOf(dayStem, pil.stem) === target) {
        position = p.replace('주', '간'); break
      }
    }
    if (!position) position = '월지'
  } else if (special) {
    position = '월지'
  }

  return {
    ...base,
    name,
    note: special ? `월지가 일간과 같은 오행이라 ${name}이에요` : base.note,
    special,
    position,
    positionNote: (position && GYEOK_POSITION[position]) || '',
  }
}

// ── 카드 ────────────────────────────────────────────────────────
export function judgeGyeokguk(input: CareerInput): CareerCard {
  const { saju } = input
  const day = saju.find(p => p.pillar === '일주')
  if (!day || day.stem === '?') {
    return { key: 'gyeokguk', title: '격과 그릇', badge: '', lines: [], reasons: ['일간을 알 수 없어 격국을 보지 않았습니다.'] }
  }

  const g = calcCareerGyeokguk(saju, day.stem)
  const info = GYEOKGUK_INFO[g.name]

  const lines: string[] = []
  const reasons: string[] = []

  lines.push(`${g.name} — ${g.note}`)
  if (info) {
    lines.push(info.gijil)
    if (info.caution) lines.push(info.caution)
  }
  if (g.positionNote) lines.push(g.positionNote)

  reasons.push(`격국 : ${g.name}${g.special ? ' (건록·양인 특례로 잡음. 투간과 무관하게 월지로 결정된다)' : ''}`)
  reasons.push(`격이 놓인 자리 : ${g.position ?? '알 수 없음'} — ${g.positionNote || '기록 없음'}`)
  if (info) {
    reasons.push(`${g.name} 성향 — ${info.gijil}`)
    reasons.push(`${g.name} 어울리는 일 — ${info.jobs.join(', ')}`)
    reasons.push(`근거 ${info.src}`)
  }
  reasons.push('이 대목("격과 그릇")의 통변 재료입니다. 격의 성향과 그릇 크기만 다루고, 학과·직업 목록은 뒤 대목으로 넘기세요.')

  return {
    key: 'gyeokguk',
    title: '격과 그릇',
    badge: g.name,
    lines,
    reasons,
    data: { ...g } as unknown as Record<string, unknown>,
  }
}
