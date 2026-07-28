// lib/saju/career/jobStructure.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  진로적성 카드 ⑧  —  어느 자리에서 일할까 (직업 구조 8종)           │
// │  출전: 『명리적성 비법노트』(심산) 98~100쪽                         │
// └───────────────────────────────────────────────────────────────┘
//
// [이 카드가 하는 일]
//   낱낱의 직업이 아니라 **큰 갈래**를 가른다.
//     공무원 · 사업가 · 회사원 · 연구직 · 기술자 · 활인업 · 학자 · 예술가 · 자영업
//   책 사례 (1)(3)이 "대학원 → 교수·연구원"으로 닫히는 근거가 여기다.
//
// ⚠️ 교재 조건에 통근(通根)·투간(透干)이 자주 나온다.
//    정밀한 통근·투간 부품이 아직 없어 **점수와 격국으로 어림잡는다.**
//    그래서 확실한 것과 짐작인 것을 나눠 표시한다. (연재쌤 확인 대상)

import { calcCareerScore, gradeAll, type Ohaeng } from './careerScore'
import { yukchinOf } from './yukchin'
import { calcCareerGyeokguk } from './gyeokguk'
import { calcCareerYongsin } from './yongsin'
import { checkSinsal9 } from './sinsal9'
import type { CareerCard, CareerInput } from './types'
import { JOB_STRUCT, STRUCT_SRC } from './tables/jobStructure'
import { NO_GYEOK } from '../yongsinNew'

const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

export interface StructHit {
  key: string
  name: string
  score: number
  why: string[]
  note: string
}

export function pickStructure(input: CareerInput): StructHit[] {
  const day = input.saju.find(p => p.pillar === '일주')
  const dayEl = day && day.stem !== '?' ? STEM_EL[day.stem] : null
  if (!dayEl || !day) return []

  const r = calcCareerScore(input.saju, input.solarMonth, input.solarDay, input.hourBranch)
  const g = gradeAll(r)
  const gk = calcCareerGyeokguk(input.saju, day.stem)
  const yg = calcCareerYongsin(input)
  const sin = checkSinsal9(input.saju)
  const on = (k: string) => sin.some(h => h.key === k && h.active)

  // 육친별 점수로 모으기
  const byYuk: Record<string, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 }
  const els: Ohaeng[] = ['목', '화', '토', '금', '수']
  for (const el of els) byYuk[yukchinOf(dayEl, el)] += r.score[el] ?? 0

  const ilgan = byYuk['비겁'] + byYuk['인성']       // 일간의 힘 (신강약)
  const strongDay = ilgan >= 40                      // 일간이 튼튼한가
  const gname = gk.name
  const yong = yg?.yongsin ?? null
  const yongYuk = yong ? yukchinOf(dayEl, yong) : ''

  // 육친 1위 — 그 사람을 대표하는 힘. 갈래를 고를 때 가산한다.
  const topYuk = (Object.keys(byYuk) as string[]).sort((a, b) => byYuk[b] - byYuk[a])[0]

  const hits: StructHit[] = []
  const push = (key: string, score: number, why: string[]) => {
    const row = JOB_STRUCT.find(x => x.key === key)!
    hits.push({ key, name: row.name, score, why, note: row.note })
  }

  // ① 공무원 — 일간 튼튼 + 관성 있음
  {
    const w: string[] = []; let s = 0
    if (strongDay) { s += 2; w.push('일간에 힘이 있어요') }
    if (byYuk['관성'] >= 20) { s += 3; w.push(`관성이 ${byYuk['관성']}점으로 자리를 잡았어요`) }
    if (gname === '정관격') { s += 3; w.push('정관격이라 행정직 쪽입니다') }
    if (gname === '편관격') { s += 3; w.push('편관격이라 검찰·경찰 같은 특수직 쪽입니다') }
    if (on('yeokma') && byYuk['관성'] > byYuk['재성']) { s += 1; w.push('역마가 있고 관성이 재성보다 세니 외교관도 어울려요') }
    if (s >= 4) push('gongmuwon', s, w)
  }
  // ② 사업가 — ★재성이 실제로 있어야 한다
  //   전에는 "식상·재성 > 관성" 만 봤더니 관성이 약한 사주가 흔해
  //   거의 모든 사람이 사업가로 나왔다. 재성을 필수 조건으로 세운다.
  {
    const w: string[] = []; let s = 0
    const sj = byYuk['식상'] + byYuk['재성']
    if (byYuk['재성'] >= 25) {           // ★필수
      s += 2; w.push(`재성이 ${byYuk['재성']}점으로 벌이는 힘이 있어요`)
      if (strongDay) { s += 2; w.push('일간에도 힘이 있어요') }
      if (sj > byYuk['관성'] + 20) { s += 2; w.push(`식상·재성(${sj}점)이 관성(${byYuk['관성']}점)보다 훨씬 세요`) }
      if (gname === '식신격' || gname === '상관격') { s += 2; w.push(`${gname}이 천간에 드러났어요`) }
      if (gname === '편재격' && strongDay) { s += 2; w.push('신왕 편재격이라 투자 쪽도 봅니다') }
    }
    if (s >= 5) push('saeobga', s, w)
  }
  // ③ 회사원 — 격 흐릿 + 재관 약함
  {
    const w: string[] = []; let s = 0
    if (byYuk['재성'] < 20 && byYuk['관성'] < 20) { s += 3; w.push('재성과 관성이 센 편은 아니에요') }
    // ★2026-07-28 — 전에는 '비견격'·'겁재격' 을 「격이 흐릿함」으로 봤습니다.
    //   교재 178쪽대로 그 두 이름을 없애면서, 그 자리는 이제 무격(無格)으로 옵니다.
    //   (A책 158쪽 "십정격 중에 격이 없는 無格과 破格이 많다")
    if (gname === NO_GYEOK) { s += 1; w.push('격이 또렷하지 않아요') }
    if (s >= 4) push('hoesawon', s, w)
  }
  // ④ 전문 연구직 — ★인성이 격을 이루거나 넉넉해야 한다
  {
    const w: string[] = []; let s = 0
    const inGyeok = gname === '정인격' || gname === '편인격'
    if (inGyeok || byYuk['인성'] >= 30) {   // ★필수
      if (inGyeok) { s += 3; w.push(`${gname}이에요`) }
      if (byYuk['인성'] >= 30) { s += 2; w.push(`인성이 ${byYuk['인성']}점으로 넉넉해요`) }
      if (yongYuk === '식상') {
        s += 3
        w.push(gname === '정인격' ? '식신이 용신이라 인문·사회 쪽 연구가 맞아요'
             : gname === '편인격' ? '상관이 용신이라 이공·기술 쪽 연구가 맞아요'
             : '식상이 용신이라 파고드는 자리가 맞아요')
      }
      if (byYuk['식상'] >= 25) { s += 1; w.push(`식상이 ${byYuk['식상']}점이라 내놓는 힘도 있어요`) }
    }
    if (s >= 4) push('yeonguzik', s, w)
  }
  // ⑤ 기술자 — 편관·편인·상관이 세고 제화가 안 됨
  {
    const w: string[] = []; let s = 0
    if (gname === '편관격' || gname === '편인격' || gname === '상관격') { s += 3; w.push(`${gname}이 세게 드러났어요`) }
    if (byYuk['관성'] < 10 || byYuk['인성'] < 10) { s += 1; w.push('다스려 줄 자리가 약해요') }
    if (g['금'].grade !== '결핍' && (r.score['금'] ?? 0) >= 25) { s += 1; w.push('금(金)이 있어 마무리하는 손이 있어요') }
    if (s >= 4) push('gisulja', s, w)
  }
  // ⑥ 활인업 — 천문성 + 관성 약함
  {
    const w: string[] = []; let s = 0
    if (on('cheonmun')) { s += 3; w.push('천문성이 있어요') }
    if (byYuk['관성'] < 15) { s += 2; w.push('관성이 약하거나 없어요') }
    if (gname === '편관격' || gname === '편인격' || gname === '상관격') { s += 2; w.push(`${gname}이에요`) }
    if (on('gwimun')) { s += 1; w.push('귀문관살이 있어 감각이 남달라요') }
    if (s >= 4) push('hwarineop', s, w)
  }
  // ⑦ 학자 — ★인성이 뿌리를 내려야 한다
  {
    const w: string[] = []; let s = 0
    if (byYuk['인성'] >= 25) {            // ★필수
      s += 3; w.push(`인성이 ${byYuk['인성']}점으로 뿌리를 내렸어요`)
      if (strongDay) { s += 2; w.push('일간에도 힘이 있어요') }
      if ((r.score['목'] ?? 0) >= 25 && (r.score['화'] ?? 0) >= 25) { s += 1; w.push('목화가 함께 살아 있어 밝게 통합니다') }
    }
    if (s >= 4) push('hakja', s, w)
  }
  // ⑧ 예술가 — ★식상이 넉넉하거나 도화가 있어야 한다
  {
    const w: string[] = []; let s = 0
    if (byYuk['식상'] >= 25 || on('dohwa')) {   // ★필수
      if (byYuk['식상'] >= 25) { s += 2; w.push(`식상이 ${byYuk['식상']}점으로 넉넉해요`) }
      if (yongYuk === '식상') { s += 3; w.push('식상이 용신이에요') }
      if (on('dohwa')) { s += 2; w.push('도화가 있어 사람 앞에 서는 힘이 있어요') }
      if (on('gwimun')) { s += 1; w.push('귀문관살이 있어 감각이 남달라요') }
      if (topYuk === '식상') { s += 2; w.push('식상이 이 사주의 으뜸이에요') }
    }
    if (s >= 4) push('yesulga', s, w)
  }
  // ⑨ 자영업 — 격 흐릿 + 재성 약함 + 식신·편관격
  {
    const w: string[] = []; let s = 0
    if (byYuk['재성'] < 15) { s += 2; w.push('재성이 약한 편이에요') }
    if (gname === '식신격' || gname === '편관격') { s += 3; w.push(`${gname}이에요`) }
    if (byYuk['비겁'] >= 40) { s += 2; w.push(`비겁이 ${byYuk['비겁']}점이라 내 이름으로 하는 편이 낫습니다`) }
    if (topYuk === '비겁' && byYuk['비겁'] >= 50) { s += 2; w.push('비겁이 이 사주의 으뜸이라 조직에 매이면 답답해요') }
    if (s >= 4) push('jayeongeop', s, w)
  }

  return hits.sort((a, b) => b.score - a.score)
}

// ── 카드 ────────────────────────────────────────────────────────
export function judgeJobStructure(input: CareerInput): CareerCard {
  const hits = pickStructure(input)
  const top = hits.slice(0, 2)   // 큰 갈래는 둘까지만. 셋을 넘으면 안 고른 것과 같다

  const lines: string[] = []
  const reasons: string[] = []

  if (!top.length) {
    lines.push('어느 한 갈래로 뚜렷하게 기울지 않았어요. 여러 자리가 두루 열려 있는 구조입니다.')
    reasons.push('직업 구조 8종 중 문턱을 넘은 것이 없습니다. 억지로 갈래를 정해 주지 마세요.')
  } else {
    lines.push(`사주 구조로 보면 ${top.map(h => h.name).join(' · ')} 쪽입니다.`)
    for (const h of top) {
      lines.push(`${h.name} — ${h.note}`)
      lines.push(`그렇게 본 까닭은 ${h.why.join(', ')}.`)
    }
    lines.push('이건 큰 갈래예요. 낱낱의 직업은 뒤에서 따로 추립니다.')
  }

  for (const h of hits) {
    reasons.push(`${h.name} ${h.score}점 ← ${h.why.join(' / ')}`)
  }
  reasons.push(`근거 ${STRUCT_SRC}`)
  reasons.push('⚠️ 교재 조건의 통근·투간은 아직 정밀하게 재지 못해 점수와 격국으로 어림잡았습니다. 단정하지 말고 "이런 쪽"으로 말하세요.')
  reasons.push('이 대목("어느 자리에서 일할까")의 통변 재료입니다. 큰 갈래만 다루고 낱낱의 직업은 뒤 대목으로 넘기세요.')

  return {
    key: 'jobstruct', title: '어느 자리에서 일할까',
    badge: top.length ? top[0].name : '',
    lines, reasons,
    data: { hits } as unknown as Record<string, unknown>,
  }
}
