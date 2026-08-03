// lib/saju/career/strengthCards.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  진로적성 새 카드 셋 — 2단계 강점 · 4단계 운세                     │
// │  ★2026-08-03 신설 (44부 40차 · 대표님 확정 「가)안」)              │
// └───────────────────────────────────────────────────────────────┘
//
//  ══ 왜 지었나 ══
//   진로적성이 «두 벌» 로 나가고 있었습니다 —
//     A 프리미엄 리포트(통짜 여섯 대목) + B 판정 카드
//   ★A 를 끄기로 하니, A 에만 있던 이야기 셋이 «사라질» 자리였습니다.
//     ① 강점 지능과 행동 패턴   ② 리더십과 재물 운용   ③ 발복 대운과 개운
//   ⇒ 그 셋을 «판정 카드» 로 옮겨 담습니다. 한 벌로 통일합니다.
//
//  ⚠️⚠️ 값을 «새로 계산하지 않습니다» —
//     deepJudge 의 buildDeep · judgeWealthStyle · flagCareerDaeun 을 «부르기만» 합니다.
//     ★그 파일들은 A 가 쓰던 것과 «같은 것» 입니다. 두 벌로 세면 말이 갈립니다. (교훈 CJ)
//
//  ⚠️ 이 파일은 «문장만» 만듭니다. 판정·셈은 부르는 쪽이 이미 끝냈습니다.

import type { CareerCard, Ohaeng } from './types'
import { buildDeep, judgeWealthStyle, flagCareerDaeun } from '../premium/deepJudge'
import { yukchinOf } from './yukchin'
// ⚠️ 조사를 문자열에 «박지» 마십시오 — josa.ts 를 씁니다 (교훈 AU)
//    「수이(가) 과다예요」·「금은(는) 타고나지 않았어요」가 나왔습니다.
import { iga, eunneun } from '../josa'
import type { Pillar } from './types'

const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

export interface StrengthInput {
  saju: Pillar[]
  dayStem: string
  score: Record<Ohaeng, number>
  daeunList?: Array<{ age: number; cheongan: string; jiji: string }>
  age?: number
  target?: 'student' | 'adult'
  yongsin?: { yongsin?: Ohaeng; heesin?: Ohaeng; gisin?: Ohaeng; gusin?: Ohaeng } | null
}

// ══════════════════════════════════════════════════════════════
//  ① 강점 지능과 행동 패턴
//
//   교재 25·40·259쪽 — 25~45점은 «발달» 이라 장점으로 쓰이고,
//   50점 이상은 «과다» 라 단점으로 발현됩니다. 0점은 «결핍».
//   ★그 구간을 그대로 읽어 「무엇이 강점이고 무엇이 걸림돌인가」를 말합니다.
// ══════════════════════════════════════════════════════════════
const EL_INTEL: Record<Ohaeng, string> = {
  목: '뻗어 나가는 기획력과 배려',
  화: '표현력과 열정, 사람을 밝히는 힘',
  토: '중심을 잡고 buffering 하는 안정감',
  금: '결단력과 분별, 마무리하는 힘',
  수: '총명함과 기획, 깊이 파고드는 힘',
}
const EL_EXCESS: Record<Ohaeng, string> = {
  목: '일을 벌이고 다 거두지 못할 때가 있어요',
  화: '성급해지거나 작심삼일이 되기 쉬워요',
  토: '고집이 세지고 말과 행동이 어긋날 수 있어요',
  금: '말이 날카로워지고 남을 몰아붙이기 쉬워요',
  수: '생각이 너무 많아져 실행이 늦어질 수 있어요',
}

export function judgeStrength(v: StrengthInput): CareerCard {
  const EL5: Ohaeng[] = ['목', '화', '토', '금', '수']
  const dev = EL5.filter(e => (v.score[e] ?? 0) >= 25 && (v.score[e] ?? 0) < 50)
  const exc = EL5.filter(e => (v.score[e] ?? 0) >= 50)
  const lack = EL5.filter(e => (v.score[e] ?? 0) === 0)

  const deep = buildDeep({
    saju: v.saju, dayStem: v.dayStem, score: v.score,
    daeunList: v.daeunList, age: v.age,
    gisin: v.yongsin?.gisin ?? null, target: v.target,
  })

  const lines: string[] = []
  const reasons: string[] = []

  if (dev.length) {
    lines.push(`발달한 기운은 ${dev.join('·')}이에요. ${dev.map(e => EL_INTEL[e]).join(' 그리고 ')}이 강점 지능입니다.`)
  } else {
    // ⚠️ 교재 259쪽 — 25~45 구간이 «강점 지능» 입니다. 그 구간이 비면 그대로 말합니다.
    lines.push('고르게 발달한 구간(25~45점)에 든 기운이 없어요. 한쪽으로 몰린 결이라 강점도 약점도 뚜렷하게 나옵니다.')
  }
  if (exc.length) {
    const w = exc.join('·')
    lines.push(`${w}${iga(w)} 과다예요. ${exc.map(e => EL_EXCESS[e]).join(' ')}`)
  }
  if (lack.length) {
    const w = lack.join('·')
    lines.push(`${w}${eunneun(w)} 타고나지 않았어요. 없는 기운은 «곁에 두거나 길러 가면» 되는 자리입니다.`)
  }

  // ★행동 패턴 — 음양 치우침과 지장간(속마음)을 함께 봅니다
  if (deep.eumyang?.say) lines.push(deep.eumyang.say)
  if (deep.mindReality?.say) lines.push(deep.mindReality.say)

  // ★속마음의 구조 — 지장간이 이룬 짜임 (관인상생·식신생재 …)
  if (deep.jijanggan?.structure) {
    lines.push(deep.jijanggan.say)
    reasons.push(`지장간 구조 — ${deep.jijanggan.structure}`)
  }
  reasons.push(`발달(25~45) ${dev.join('·') || '없음'} · 과다(50↑) ${exc.join('·') || '없음'} · 결핍 ${lack.join('·') || '없음'}`)
  if (deep.eumyang) reasons.push(`음양 — 양 ${deep.eumyang.yang} · 음 ${deep.eumyang.eum} (${deep.eumyang.yangPct}%)`)

  const badge = exc.length ? '뚜렷한 결' : dev.length ? `${dev.length}가지 발달` : '한쪽으로 몰림'
  return { key: 'strength', title: '강점 지능과 행동 패턴', badge, lines, reasons }
}

// ══════════════════════════════════════════════════════════════
//  ② 리더십과 재물 운용
//
//   리더십 — 관성(자리·책임)과 비겁(주체성)의 세기로 봅니다.
//     교재 112·113쪽 관성 「계획성이 투철·룰과 법칙」 · 122쪽 비겁 「주체성·추진력」
//   재물   — judgeWealthStyle (정재/편재 갈래)
// ══════════════════════════════════════════════════════════════
export function judgeLeadWealth(v: StrengthInput): CareerCard {
  const EL5: Ohaeng[] = ['목', '화', '토', '금', '수']
  const dayEl = STEM_EL[v.dayStem] ?? '토'
  const grp: Record<string, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 }
  for (const el of EL5) grp[yukchinOf(dayEl, el)] += v.score[el] ?? 0

  const gwan = grp['관성'], bigyeop = grp['비겁']
  const wealth = judgeWealthStyle(v.saju, v.dayStem, v.score)

  const lines: string[] = []
  const reasons: string[] = []

  // ── 리더십 ──
  if (gwan >= 25 && bigyeop >= 25) {
    lines.push('책임지는 결(관성)과 주체적으로 미는 힘(비겁)이 함께 있어요. 자리를 맡으면 끝까지 끌고 가는 리더십입니다.')
  } else if (gwan >= 25) {
    lines.push('책임지는 결(관성)이 뚜렷해요. 규칙과 절차를 지키며 조직 안에서 신뢰를 쌓는 리더십입니다.')
  } else if (bigyeop >= 25) {
    lines.push('주체성(비겁)이 강해요. 남이 정해 준 자리보다 스스로 판을 짜는 쪽이 편한 결입니다.')
  } else {
    lines.push('앞에 나서기보다 상황을 읽고 조용히 방향을 잡는 쪽이에요. 드러나지 않아도 중요한 순간에 핵심을 짚습니다.')
  }
  if (gwan === 0) {
    lines.push('관성이 타고나지 않았어요. 얽매이는 자리를 답답해하니, 재량이 있는 자리가 맞습니다.')
  }
  reasons.push(`관성 ${Math.round(gwan)}점 · 비겁 ${Math.round(bigyeop)}점 (진로적성 100점 기준)`)

  // ── 재물 ──
  if (wealth.say) lines.push(wealth.say)
  if (wealth.guide) lines.push(`→ ${wealth.guide}`)
  reasons.push(`재물 결 — ${wealth.label} (정재 ${wealth.jeongJae} · 편재 ${wealth.pyeonJae})`)

  return { key: 'leadwealth', title: '리더십과 재물 운용', badge: wealth.label, lines, reasons }
}

// ══════════════════════════════════════════════════════════════
//  ③ 발복 대운과 개운
//
//   ⚠️ 대운이 없으면(시주를 모르거나 자료가 없으면) ★빈 카드를 돌려줍니다.
//      화면이 lines 가 빈 카드를 안 그립니다 — 없는 것을 지어내지 않습니다.
//   ⚠️ 「나쁜 대운」이라 «단정하지» 않습니다. 교재 238쪽 「단식 판단 금지」.
// ══════════════════════════════════════════════════════════════
export function judgeCareerLuck(v: StrengthInput): CareerCard {
  const lines: string[] = []
  const reasons: string[] = []
  const age = v.age ?? 30

  const flags = v.daeunList?.length
    ? flagCareerDaeun(v.daeunList, v.dayStem, v.yongsin ?? null)
    : []
  const ahead = flags.filter(d => d.age >= age - 5)

  const good = ahead.filter(d => d.favorable).slice(0, 3)
  const gwan = ahead.filter(d => d.gwanseong && !d.favorable).slice(0, 2)

  if (good.length) {
    lines.push(`힘이 붙는 대운은 ${good.map(d => `${d.age}세 ${d.ganji}`).join(' · ')} 어름이에요. 필요한 기운이 들어오는 때라 뜻한 일이 수월해집니다.`)
  }
  if (gwan.length) {
    lines.push(`${gwan.map(d => `${d.age}세 ${d.ganji}`).join(' · ')} 무렵은 자리와 책임이 들어오는 때예요. 맡을 일이 늘어나는 결입니다.`)
  }
  const soft = ahead.filter(d => d.unfavorable).slice(0, 2)
  if (soft.length) {
    // ★「나쁨」이라 하지 않습니다 — «준비하는 때» 로 옮깁니다 (교재 238쪽)
    lines.push(`${soft.map(d => `${d.age}세 ${d.ganji}`).join(' · ')}은 힘을 «모으는» 때예요. 크게 벌이기보다 다듬고 채우는 쪽이 낫습니다.`)
  }

  // ── 개운 — 용신 기운을 곁에 두는 법 ──
  const deep = buildDeep({
    saju: v.saju, dayStem: v.dayStem, score: v.score,
    daeunList: v.daeunList, age: v.age,
    gisin: v.yongsin?.gisin ?? null, target: v.target,
  })
  if (deep.remedy?.lines?.length) {
    lines.push(...deep.remedy.lines.slice(0, 3))
  }
  // ⚠️ 개운 문장에 나오는 「◯ 기운을 늘리지 마십시오」의 ◯ 는 «기신» 입니다.
  //    점수가 0인 «결핍» 과 다릅니다. 근거에 밝혀 두지 않으면 손님이 헷갈립니다.
  if (v.yongsin?.yongsin) {
    reasons.push(`용신 ${v.yongsin.yongsin}${v.yongsin.heesin ? ` · 희신 ${v.yongsin.heesin}` : ''}`
      + `${v.yongsin.gisin ? ` · 기신 ${v.yongsin.gisin}(늘리지 않는 기운)` : ''}`)
  }

  if (!lines.length) return { key: 'careerluck', title: '발복 대운과 개운', badge: '', lines: [], reasons: [] }
  return {
    key: 'careerluck', title: '발복 대운과 개운',
    badge: good.length ? `${good[0].age}세 어름` : '',
    lines, reasons,
  }
}
