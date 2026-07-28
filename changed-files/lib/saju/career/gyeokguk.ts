// lib/saju/career/gyeokguk.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  진로적성 카드 ⑦  —  격국(格局)                                  │
// │  출전: 『명리적성 비법노트』(심산) 62~65쪽                          │
// │        「16. 격국(格局)과 십정격(十正格)」                          │
// └───────────────────────────────────────────────────────────────┘
//
// [왜 감싸개를 따로 두는가]  ★2026-07-28 까닭이 바뀌었습니다
//   전에는 공용 엔진이 건록·양인을 못 잡아서 여기서 특례를 걸렀습니다.
//   이제 **엔진(yongsinNew.calcGyeokguk)이 록왕지 표로 직접 잡습니다.**
//   그래서 여기 특례는 걷어냈고, 이 파일에는 **격의 자리(位)** 만 남았습니다.
//     A책 152·157쪽 — 年干 국가·정부 / 月干 사회·단체 / 時干 개인·가정
//   자리 규칙은 진로적성에서만 쓰므로 감싸개에 두는 것이 맞습니다.
//
//   ⚠️ 격 이름·상신은 엔진 것을 그대로 씁니다. 사본을 만들지 마십시오. (교훈 BQ)
//
// [격의 자리 — 교재 62쪽]
//   년 천간에 격이 있으면 국가·정부와 관련된 일
//   월 천간에 격이 있으면 사회·단체와 관련된 일
//   시 천간이나 월지에 격이 있으면 개인·가정적인 일

import { calcGyeokguk, sipsinOf, NO_GYEOK, type GyeokgukResult } from '../yongsinNew'
import type { CareerCard, CareerInput, Pillar } from './types'
import { GYEOKGUK_INFO, GYEOK_POSITION } from './tables/gyeokguk'

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

  // ★2026-07-28 — 여기 있던 건록·양인 특례를 걷어냈습니다.
  //   공용 엔진 calcGyeokguk 이 록왕지 표로 직접 잡습니다. 사본을 두지 않습니다. (교훈 BQ)
  //   ⚠️ 전에는 「월지 본기가 겁재면 양인격」이라 음일간까지 잡았는데,
  //      교재 178쪽이 "양인격은 陽日干만"이라 하여 그때 틀렸습니다.
  //      실제로 162쪽 사례(甲辰 丁未 丁巳 戊戌)를 양인격으로 잘못 냈습니다.
  const name = base.name
  const special = name === '건록격' || name === '양인격'

  // 격이 어느 자리에 드러났는가 — 격의 오행과 같은 천간을 찾는다
  //   교재 152·157쪽: 年干 국가·정부 / 月干 사회·단체 / 時干 개인·가정
  //   ★건록·양인은 월지로 정해지므로 자리를 따로 찾지 않는다.
  //   ★무격은 격이 없으니 자리도 없다.
  let position: string | null = null
  if (name === NO_GYEOK) {
    position = null
  } else if (special) {
    position = '월지'
  } else if (month) {
    const target = name.replace('격', '')
    for (const p of ['년주', '월주', '시주']) {
      const pil = saju.find(x => x.pillar === p)
      if (pil && pil.stem !== '?' && sipsinOf(dayStem, pil.stem) === target) {
        position = p.replace('주', '간'); break
      }
    }
    if (!position) position = '월지'
  }

  return {
    ...base,
    name,
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
