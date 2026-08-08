// lib/saju/somu/judge.ts
//
// ┌───────────────────────────────────────────────────────────────────────┐
// │  🌿 소무승 물상론 — «판정»                                              │
// └───────────────────────────────────────────────────────────────────────┘
//
//  ★2026-08-07 (49부 1차) — 신설  [대표님 지시 · 연재쌤 의견]
//
//  ⛔⛔ ★기존 판정 함수를 «하나도» 부르지 않습니다.
//     calcYongsinNew · calcGyeokguk · calcYongsinScore · simsanOhaeng
//     · relOf · yukchinOfEl · P151_TABLE · GYEOK_SANGSIN · mulsangData
//     ⇒ ★전부 안 씁니다. 연재쌤 「보는 관점이 완전 다르다」.
//     ⇒ 이 파일이 부르는 것은 ★somu/data.ts «하나» 뿐입니다.
//
//  ⚠️ ★물상론의 판정은 «재지» 않습니다 —
//     기존 파이프라인 : 오행 점수 → 신강약 → 억부·조후·격국 → 용신
//     물상론         : ★일간이 정해지면 좋고 싫음이 «이미» 정해져 있습니다
//                     (甲木이면 丙庚壬 좋고 乙己辛 싫다 — 017쪽)
//                     월지가 정해지면 계절 묶음이 «바로» 걸립니다
//     ⇒ 그래서 여기에는 «점수도 문턱도 없습니다». 그것이 맞습니다.
//     ⛔ 점수제를 «넣지» 마십시오. 교재에 없습니다.
//
//  ⚠️ ★天干論은 «원국에 있는 천간만» 폅니다.
//     열 조합을 다 펴면 상담사가 읽을 것이 열 배가 됩니다.
//     ⇒ 원국 넉 기둥의 천간(+일간 자신)에 걸리는 것만 골라냅니다.
//
//  ⚠️ ★to 를 «반드시» 지키십시오 —
//     forCustomer(true) 로 부르면 '상담사만' 줄이 «전부» 빠집니다.
//     通辯論 사례는 to 와 무관하게 ★손님 쪽에서 통째로 빠집니다 (실존 인물 사생활).

import {
  SOMU_CHAPTERS, SEASON_OF, SEASON_LABEL, SOMU_SHOW_CASES,
  type SomuChapter, type SomuLine, type SomuPair, type SomuCase, type SomuSeasonKey,
} from './data'

/** 만세력이 돌려주는 한 기둥 — useResultSaju 와 «같은» 모양 */
export interface SomuPillar {
  pillar: string
  stem: string
  branch: string
}

export interface SomuInput {
  /** 원국 넉 기둥 (시주가 없으면 셋일 수 있습니다) */
  saju: SomuPillar[]
  /** 일간 */
  dayStem: string
  /** 성별 — 교재가 男命/女命을 갈라 적은 곳이 있습니다 */
  gender?: '남' | '여'
  /** ★true 면 '상담사만' 줄과 通辯論 사례를 «전부» 뺍니다 */
  forCustomer?: boolean
}

export interface SomuBlock {
  key: string
  title: string
  /** 출전 — 「소무승 물상론 019쪽」 처럼 */
  source?: string
  lines: string[]
  /** 그림이 있는 자리 */
  img?: { ko: string; prompt: string }
  /**
   * ★2026-08-08 — 이 원국에 «걸린» 자리인가.
   *   true  : 원국에 있는 천간의 짝 · 월지가 걸린 계절 · 계절이 맞는 사례
   *   false : 교재에는 있으나 이 원국에는 «안 걸리는» 자리
   *   ⚠️ 안 걸린다고 «빼지» 않습니다 — 상담사가 운을 짚을 때 봐야 합니다.
   *      화면이 ★접은 채로 아래에 둡니다 (SomuReading).
   *   ⛔ 손님 쪽(forCustomer)에는 ★걸린 것만 갑니다.
   */
  matched?: boolean
}

export interface SomuResult {
  /** 자료가 아직 없는 일간이면 null */
  chapter: SomuChapter | null
  /** 일간 */
  stem: string
  /** 월지 */
  monthBranch: string
  /** 걸린 계절 묶음 */
  season: SomuSeasonKey | null
  /** 원국에 실제로 있는 천간 (일간 제외, 차례 그대로) */
  presentStems: string[]
  blocks: SomuBlock[]
}

/** to 가 없으면 '상담사만' 으로 봅니다 — ★안전한 쪽으로 넘어집니다 */
function passes(l: SomuLine, forCustomer: boolean): boolean {
  if (!forCustomer) return true
  return l.to === '둘다'
}

function pick(lines: SomuLine[], forCustomer: boolean): string[] {
  return lines.filter(l => passes(l, forCustomer)).map(l => l.text)
}

/**
 * ★남녀를 가릅니다 — 교재가 「女命」·「男命」이라 못 박은 줄만 걸러냅니다.
 *   ⚠️ 성별을 «안» 주면 거르지 않습니다 (둘 다 보입니다).
 *   ⛔ 낱말이 아니라 «머리에 붙은 표시» 만 봅니다. 문장 속 「여자」는 안 건드립니다.
 *
 *   🔴 ★2026-08-08 — 이제 ★«손님 쪽에서만» 거릅니다.
 *      [까닭]  대표님 「★전문상담사는 모두 봐야 해」.
 *        남자 손님 화면에서 「女命 …」 줄이 조용히 빠지고 있었습니다
 *        (辛金 장에서 값으로 확인 — 세 줄).
 *        상담사는 배우자·자녀를 함께 봅니다. 원문에 ★「女命」이라 적혀 있으니
 *        상담사가 보고 가릅니다.
 *      ⛔ 손님 쪽 거르기는 «그대로» 입니다 — 빼지 마십시오.
 */
function genderOk(text: string, gender?: '남' | '여'): boolean {
  if (!gender) return true
  const t = text.trim()
  if (gender === '남' && (t.startsWith('女命') || t.startsWith('여자는'))) return false
  if (gender === '여' && t.startsWith('男命')) return false
  return true
}

export function readSomu(input: SomuInput): SomuResult {
  const { saju, dayStem, gender, forCustomer = false } = input
  const ch = SOMU_CHAPTERS[dayStem] ?? null

  const monthBranch = saju.find(s => s.pillar === '월주')?.branch ?? ''
  const season = SEASON_OF[monthBranch] ?? null

  // ★원국에 실제로 있는 천간 (일간은 빼고, 차례 그대로 · 겹치면 한 번만)
  //  ⚠️⚠️ ★일주 «한 자리만» 건너뜁니다. 같은 글자가 다른 기둥에 «또» 있으면
  //     그것은 담깁니다 — 그래야 甲+甲·丙+丙·丁+丁 이 «둘일 때만» 뜹니다.
  //  🔴 50부 고침 — 전에는 `presentStems.length === 0` 이 함께 걸려 있어
  //     연간·월간이 «먼저» 담기고 나면 조건이 깨져 ★일간이 그대로 담겼습니다.
  //     그래서 丁이 «하나뿐인» 원국에도 「丁 + 丁」이 떴습니다 (甲木·乙木도 같았습니다).
  //  ⛔ `presentStems.length === 0` 을 다시 붙이지 마십시오.
  const presentStems: string[] = []
  let daySkipped = false
  for (const p of saju) {
    if (!p.stem) continue
    if (p.pillar === '일주' && p.stem === dayStem && !daySkipped) { daySkipped = true; continue }
    if (!presentStems.includes(p.stem)) presentStems.push(p.stem)
  }

  const blocks: SomuBlock[] = []
  if (!ch) return { chapter: null, stem: dayStem, monthBranch, season, presentStems, blocks }

  // ★상담사 화면에서는 «안» 거릅니다 (genderOk 머리말 참조). 손님 쪽만 거릅니다.
  const g = (arr: string[]) => (forCustomer ? arr.filter(t => genderOk(t, gender)) : arr)

  // ── ① 개관 ────────────────────────────────────────────────
  {
    const kw = pick(ch.keywords, forCustomer)
    if (kw.length) {
      blocks.push({
        key: 'keywords',
        title: `${ch.label} — 물상 낱말`,
        source: `소무승 물상론 ${ch.pages}`,
        lines: [kw.join(' · ')],
      })
    }
    const intro = g(pick(ch.intro, forCustomer))
    if (intro.length) {
      blocks.push({
        key: 'intro',
        title: `${ch.label} — 개관`,
        source: '소무승 물상론',
        lines: intro,
      })
    }
    // ⚠️⚠️ ★장마다 «있는 것이 아닙니다» — 乙木 장에는 이 목록이 «없습니다».
    //    ⛔ 없는 장에 지어 넣지 말고, 여기서 «통째로» 걸러냅니다.
    // 🔴 52부 고침 — 출전이 ★'017쪽'(甲木 자리)으로 «박혀» 있었습니다.
    //    庚金이 224쪽에 같은 목록을 가지고 들어오면서 ★상담사 화면에 «甲木 쪽수» 가
    //    찍히게 되어 ch.pages 로 바꾸었습니다. 甲木 하나뿐일 때는 드러나지 않던 것입니다.
    //    ⚠️ 판정은 한 글자도 안 바뀝니다 — «출전 글자» 하나입니다.
    if (ch.likes.length || ch.dislikes.length) blocks.push({
      key: 'likes',
      title: '좋아하는 天干 / 싫어하는 天干',
      source: `소무승 물상론 ${ch.pages}`,
      lines: [
        `좋아하는 天干 : ${ch.likes.join(', ')}`,
        `싫어하는 天干 : ${ch.dislikes.join(', ')}`,
        `— 원국에 있는 천간 : ${presentStems.join(' · ') || '—'}`,
        `— 그중 «좋아하는» 것 : ${presentStems.filter(s => ch.likes.includes(s)).join(' · ') || '없음'}`,
        `— 그중 «싫어하는» 것 : ${presentStems.filter(s => ch.dislikes.includes(s)).join(' · ') || '없음'}`,
      ],
    })
  }

  // ── ② 天干論 ────────────────────────────────────────────────
  //   ★2026-08-08 — 전에는 «원국에 있는 천간만» 폈습니다.
  //     ⇒ 辛金 장에서 값으로 재니 ★일곱 짝 43줄이 «아예 안 나오고» 있었습니다.
  //   [왜 바꿨나]  ① 대운·세운으로 그 천간이 «들어오면» 상담사가 봐야 합니다.
  //               ② 교재에 있는데 화면에 없으면 상담사는 «없는 줄» 압니다.
  //   ⇒ ★원국에 걸린 짝을 «먼저», 나머지 짝을 «그 뒤에» 전부 폅니다.
  //     화면이 matched:false 를 ★접은 채로 아래에 둡니다.
  //   ⛔ 손님 쪽(forCustomer)은 ★걸린 것만 갑니다 — 늘리지 마십시오.
  {
    const rest = ch.pairs.map(p => p.with).filter(s => !presentStems.includes(s))
    for (const stem of [...presentStems, ...rest]) {
      const matched = presentStems.includes(stem)
      if (!matched && forCustomer) continue
      const pair: SomuPair | undefined = ch.pairs.find(p => p.with === stem)
      if (!pair) continue
      const lines = g(pick(pair.lines, forCustomer))
      if (!lines.length) continue
      blocks.push({
        key: `pair-${stem}`,
        title: `天干論 — ${ch.stem} + ${stem}${matched ? '　★원국에 있음' : ''}`,
        source: '소무승 물상론 天干論',
        lines,
        img: pair.img,
        matched,
      })
    }
  }

  // ── ③ 地支論 ────────────────────────────────────────────────
  //   ★2026-08-08 — 전에는 «걸린 계절 하나» 만 폈습니다.
  //     ⇒ 값으로 재니 ★나머지 세 계절 119줄이 안 나오고 있었습니다 (辛金 기준).
  //   ⇒ 걸린 계절을 «먼저», 나머지 셋을 «그 뒤에».
  //     ⚠️ 대운이 계절을 바꿔 짚을 때 상담사가 봐야 하는 자리입니다.
  //   ⛔ 손님 쪽은 ★걸린 계절 하나만 — 그대로입니다.
  {
    const all = Object.keys(ch.seasons) as SomuSeasonKey[]
    const order = season ? [season, ...all.filter(k => k !== season)] : all
    for (const key of order) {
      const matched = key === season
      if (!matched && forCustomer) continue
      const lines = g(pick(ch.seasons[key], forCustomer))
      if (!lines.length) continue
      blocks.push({
        key: `season-${key}`,
        title: `地支論 — ${SEASON_LABEL[key]}${matched ? `　★월지 ${monthBranch}` : ''}`,
        source: '소무승 물상론 地支論',
        lines,
        matched,
      })
    }
  }

  // ── ④ 通辯論 사례 ─────────────────────────────────────────────
  //   ⛔ 손님 쪽에서는 «통째로» 빠집니다 — ★이 문지기는 그대로입니다.
  //   🔴 ★2026-08-08 — 상담사 쪽에서도 «안 냅니다» [대표님·연재쌤 「너무 무겁고 불필요」].
  //      ⛔⛔ ★자료는 «한 줄도» 안 지웠습니다. ch.cases 는 그대로 있습니다.
  //         되살리시려면 ★data.ts 의 SOMU_SHOW_CASES 를 true 로 «한 줄» 만.
  //      ⚠️ 아래 «계절이 맞는 사례를 위로» 는 그대로 두었습니다 —
  //         스위치를 켜면 예전처럼 돕니다.
  if (!forCustomer && SOMU_SHOW_CASES) {
    const seasonOfCase = (c: SomuCase): SomuSeasonKey | null => {
      // 교재 표기는 ★«시일월년» 차례라 월주가 «셋째» 입니다
      const wol = c.chart.split('/')[2]?.trim() ?? ''
      return SEASON_OF[wol[1]] ?? null
    }
    const sorted = season
      ? [...ch.cases].sort((a, b) =>
          Number(seasonOfCase(b) === season) - Number(seasonOfCase(a) === season))
      : ch.cases
    for (const c of sorted) {
      const same = season != null && seasonOfCase(c) === season
      blocks.push({
        key: `case-${c.label}`,
        title: `通辯論 — ${c.label}${same ? '  ★같은 계절' : ''}`,
        matched: same,
        source: `${c.birth} · ${c.chart}`,
        lines: [
          `【원국】 ${c.chart}   【물상】 ${c.words.join(' · ')}`,
          ...(c.daeun ? [`【대운】 ${c.daeun}`] : []),
          ...c.lines.map(l => l.text),
        ],
        img: c.img,
      })
    }
  }

  return { chapter: ch, stem: dayStem, monthBranch, season, presentStems, blocks }
}

/** 사례가 든 원국을 그대로 견줘 보기 위한 것 — 그물·계측에서 씁니다 */
export function somuCases(stem: string): SomuCase[] {
  return SOMU_CHAPTERS[stem]?.cases ?? []
}
