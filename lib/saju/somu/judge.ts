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
  SOMU_CHAPTERS, SEASON_OF, SEASON_LABEL,
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
  const presentStems: string[] = []
  for (const p of saju) {
    if (!p.stem) continue
    if (p.stem === dayStem && presentStems.length === 0 && p.pillar === '일주') continue
    if (!presentStems.includes(p.stem)) presentStems.push(p.stem)
  }

  const blocks: SomuBlock[] = []
  if (!ch) return { chapter: null, stem: dayStem, monthBranch, season, presentStems, blocks }

  const g = (arr: string[]) => arr.filter(t => genderOk(t, gender))

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
    if (ch.likes.length || ch.dislikes.length) blocks.push({
      key: 'likes',
      title: '좋아하는 天干 / 싫어하는 天干',
      source: '소무승 물상론 017쪽',
      lines: [
        `좋아하는 天干 : ${ch.likes.join(', ')}`,
        `싫어하는 天干 : ${ch.dislikes.join(', ')}`,
        `— 원국에 있는 천간 : ${presentStems.join(' · ') || '—'}`,
        `— 그중 «좋아하는» 것 : ${presentStems.filter(s => ch.likes.includes(s)).join(' · ') || '없음'}`,
        `— 그중 «싫어하는» 것 : ${presentStems.filter(s => ch.dislikes.includes(s)).join(' · ') || '없음'}`,
      ],
    })
  }

  // ── ② 天干論 — ★원국에 있는 천간만 ─────────────────────────
  for (const stem of presentStems) {
    const pair: SomuPair | undefined = ch.pairs.find(p => p.with === stem)
    if (!pair) continue
    const lines = g(pick(pair.lines, forCustomer))
    if (!lines.length) continue
    blocks.push({
      key: `pair-${stem}`,
      title: `天干論 — ${ch.stem} + ${stem}`,
      source: '소무승 물상론 天干論',
      lines,
      img: pair.img,
    })
  }

  // ── ③ 地支論 — ★걸린 계절 하나 ──────────────────────────────
  if (season) {
    const lines = g(pick(ch.seasons[season], forCustomer))
    if (lines.length) {
      blocks.push({
        key: `season-${season}`,
        title: `地支論 — ${SEASON_LABEL[season]}`,
        source: `소무승 물상론 地支論 · 월지 ${monthBranch}`,
        lines,
      })
    }
  }

  // ── ④ 通辯論 사례 — ⛔ 손님 쪽에서는 «통째로» 빠집니다 ──────────
  //   ⚠️ ★계절이 «맞는» 사례를 위로 올립니다 (乙木은 사례가 열이라 다 붙으면 깁니다).
  //   ⛔ 사례를 «지우지» 마십시오 — 교재에 있는 것을 상담사가 못 보면 안 됩니다.
  //      ★차례만 바꿉니다. 안 맞는 사례도 아래에 그대로 남습니다.
  if (!forCustomer) {
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
