// lib/saju/hapJudge.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  합(合)의 성립을 판정한다 — 天干合 · 六合 · 三合 · 方合 · 自化干合 · 暗合 │
// │  출전: 『명리적성 비법노트』(심산) 78~83쪽 「09 합에 관한 이해」        │
// │  2026-07-29                                                    │
// └───────────────────────────────────────────────────────────────┘
//
// ── 왜 만들었나 ──────────────────────────────────────────────────
//   `hapMeaning.ts` 는 **자료만** 담습니다(그 파일 머리말이 "판정을 하지 않는다"고
//   못박고 있습니다). 그래서 교재가 적어 둔 **조건**들이 갈 곳이 없었습니다.
//
//       78쪽  "중간에 庚이 있어 甲을 극하면 합이 이루어지지 않는다"
//       78쪽  "천간에 합이 있다 하여 전부 합으로 볼 수 없다"
//       78쪽  "지지에 합화된 세력이 있을 경우에 합화된다"
//       80쪽  "月支가 亥子丑月이면 子丑合 水 / 그 외는 子丑合 土"
//       80쪽  "水가 많을 때는 巳申合 水, 金이 많을 경우는 巳申合 金"
//       83쪽  "辰戌丑未는 개고가 이루어졌을 때만 암합이 인정된다"
//
//   자료에는 있는데 판정하는 곳이 없으면 **없는 규칙**입니다. (교훈 BO)
//   실측해 보니 천간합이 있는 명식의 절반(23.0%)이 교재상 방해받는 자리인데
//   그대로 "합이 있습니다" 로 나가고 있었습니다.
//
// ── ⚠️ 판정기가 이미 여럿입니다 (교훈 CJ) ──────────────────────────
//   이 파일은 **재료(jaryoPick)가 쓰는 판정**입니다. 아래 것들은 아직 따로 돕니다.
//
//       lib/saju/hapchungScore.ts            오행 점수 이동 (반합 60% 등 자체 잣대)
//       lib/saju/examLuck/hapchung.ts        합격운
//       lib/saju/career/special.ts           진로적성 천간합
//       app/.../result-new/ExpertDetail.tsx  형충회합 도표 (34부에 3글자로 맞춤)
//       app/.../birth-timing/lib/sajuTables.ts  출산택일
//       lib/saju/sajuDetail.ts               ★branchRelations 는 죽은 코드입니다
//                                              (참조 0건 · 2글자를 삼합이라 부릅니다)
//
//   ★한꺼번에 합치지 마십시오. 32-9장 ⑧ 이 "지금 건드리지 말라"고 남긴 자리입니다.
//     다만 **재료와 화면은 같은 잣대여야 합니다** (교훈 CL). 3글자 규칙은 맞춰 두었습니다.
//
// ── ⚠️ 넣지 않은 것 ───────────────────────────────────────────────
//   ① 준삼합·반합·가합 (교재 81쪽) — 대표님 확정 "넣지 않는다" (34-4장)
//      ★교재 81쪽은 "가합(申辰만)에 천간 癸수가 뜨면 申子辰 삼합이 성립된다"고
//        적지만, 이를 넣으면 삼합이 4.8% → 18.5% 로 뜁니다. 확정과 부딪혀 보류합니다.
//   ② 합화된 오행으로 점수를 옮기는 일 — `hapchungScore.ts` 의 몫입니다.
//      여기서 또 옮기면 두 벌이 됩니다. 이 파일은 **말만** 정합니다.

import type { Ohaeng } from './simsanOhaeng'
import { CHEONGAN_HAP, YUKHAP, SAMHAP, BANGHAP, JAHWA_GANHAP } from './hapMeaning'

export type Pill = { pillar: string; stem: string; branch: string }

// ⚠️ 오행 표는 저장소에 스무 벌 넘게 흩어져 있습니다(32-9장 ⑧ — 지금 합치지 말 것).
//    여기서도 같은 결로 지역 상수를 둡니다.
const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_EL: Record<string, Ohaeng> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}
/** 극(剋) — 목극토 · 토극수 · 수극화 · 화극금 · 금극목 */
const CON: Record<Ohaeng, Ohaeng> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }
const YANG_STEM = new Set(['甲', '丙', '戊', '庚', '壬'])

/** 지장간 — yongsinNew.ts 와 같은 표입니다 */
const JIJANGAN: Record<string, string[]> = {
  子: ['壬', '癸'], 丑: ['癸', '辛', '己'], 寅: ['戊', '丙', '甲'], 卯: ['甲', '乙'],
  辰: ['乙', '癸', '戊'], 巳: ['戊', '庚', '丙'], 午: ['丙', '己', '丁'], 未: ['丁', '乙', '己'],
  申: ['戊', '壬', '庚'], 酉: ['庚', '辛'], 戌: ['辛', '丁', '戊'], 亥: ['戊', '甲', '壬'],
}
const JIJI_CHUNG: Record<string, string> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
}
const WONJIN: Record<string, string> = {
  子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '酉', 酉: '寅',
  卯: '申', 申: '卯', 辰: '亥', 亥: '辰', 巳: '戌', 戌: '巳',
}
/** 형(刑) 짝 — 辰戌丑未·寅巳申 가운데 개고에 쓰는 것만 */
const HYEONG_PAIR: Array<[string, string]> = [
  ['丑', '戌'], ['戌', '未'], ['丑', '未'], ['寅', '巳'], ['巳', '申'], ['寅', '申'],
]
const TOJI = new Set(['辰', '戌', '丑', '未'])

const ORDER = ['년주', '월주', '일주', '시주']
const GAN_NAME: Record<string, string> = { 년주: '년간', 월주: '월간', 일주: '일간', 시주: '시간' }
const JI_NAME: Record<string, string> = { 년주: '년지', 월주: '월지', 일주: '일지', 시주: '시지' }

function sorted(saju: Pill[]): Pill[] {
  return [...saju].sort((a, b) => ORDER.indexOf(a.pillar) - ORDER.indexOf(b.pillar))
}

// ═══════════════════════════════════════════════════════════
// 1. 천간합 (78~79쪽)
// ═══════════════════════════════════════════════════════════

export interface CheonganHapHit {
  key: string
  chars: [string, string]
  /** 어느 자리끼리인가 — 예) 월간-일간 */
  where: string
  /** 교재 78쪽 — 합이 이루어지는가 */
  seongrip: boolean
  /** 못 이루는 까닭 */
  block?: { kind: '극' | '끼어듦'; by: string }
  /** 쟁합(양간 둘이 음간 하나를) · 투합(음간 둘이 양간 하나를) */
  dispute?: '쟁합' | '투합'
  /** 교재 78쪽 — 지지에 합화된 세력이 있어야 합화된다 */
  hwa: boolean
  hwaEl: Ohaeng
}

/**
 * 천간합을 판정한다. (교재 78~79쪽)
 *
 *   [성립] 두 글자가 **이웃한 자리**에 있어야 합니다.
 *     교재 78쪽이 든 예가 둘 다 "사이에 무엇이 있으면 안 된다"는 것입니다.
 *       甲庚己 — 사이의 庚이 甲을 극해 불성립
 *       甲乙己 — 사이의 乙이 끼어 방해하여 불성립
 *     그래서 사이에 글자가 하나라도 있으면 못 이루는 것으로 봅니다.
 *
 *   ⚠️ 이 잣대로 천간합이 46.3% → 23.3% 로 줄어듭니다. 크게 바뀌는 자리입니다.
 *      막지 않고 **까닭을 붙여 내보냅니다.** 손님이 "합이 사라졌다" 고 느끼지 않도록. (교훈 BV)
 */
export function judgeCheonganHap(saju: Pill[]): CheonganHapHit[] {
  const ps = sorted(saju)
  const stems = ps.map(p => p.stem)
  const branches = ps.map(p => p.branch).filter(Boolean)
  const out: CheonganHapHit[] = []

  for (const row of CHEONGAN_HAP) {
    const [a, b] = row.chars
    const ia = stems.indexOf(a)
    const ib = stems.indexOf(b)
    if (ia < 0 || ib < 0) continue

    // ── 가장 가까운 짝을 고른다 ──
    let best: [number, number] | null = null
    for (let i = 0; i < stems.length; i++) {
      for (let j = 0; j < stems.length; j++) {
        if (i === j) continue
        if (stems[i] !== a || stems[j] !== b) continue
        if (!best || Math.abs(i - j) < Math.abs(best[0] - best[1])) best = [i, j]
      }
    }
    if (!best) continue
    const lo = Math.min(best[0], best[1])
    const hi = Math.max(best[0], best[1])

    // ── 성립·방해 (78쪽) ──
    let seongrip = true
    let block: CheonganHapHit['block']
    if (hi - lo > 1) {
      const mid = stems.slice(lo + 1, hi).filter(Boolean)
      const kill = mid.find(x => CON[STEM_EL[x]] === STEM_EL[a] || CON[STEM_EL[x]] === STEM_EL[b])
      seongrip = false
      block = kill ? { kind: '극', by: kill } : { kind: '끼어듦', by: mid[0] ?? '' }
    }

    // ── 쟁합·투합 (78쪽) ──
    //    甲己甲 = 양간 둘이 음간 하나를 다툼 → 쟁합
    //    己甲己 = 음간 둘이 양간 하나에 매달림 → 투합
    const yang = YANG_STEM.has(a) ? a : b
    const eum = YANG_STEM.has(a) ? b : a
    let dispute: CheonganHapHit['dispute']
    if (stems.filter(s => s === yang).length >= 2) dispute = '쟁합'
    else if (stems.filter(s => s === eum).length >= 2) dispute = '투합'

    // ── 합화 (78쪽 "지지에 합화된 세력이 있을 경우에 합화된다") ──
    const hwaEl = row.result[0]
    const hwa = branches.some(x => BRANCH_EL[x] === hwaEl)

    out.push({
      key: row.key,
      chars: [a, b],
      where: `${GAN_NAME[ps[lo].pillar] ?? ''}-${GAN_NAME[ps[hi].pillar] ?? ''}`,
      seongrip, block, dispute, hwa, hwaEl,
    })
  }
  return out
}

// ═══════════════════════════════════════════════════════════
// 2~4. 지지 합 — 육합 · 삼합 · 방합 (80~82쪽)
// ═══════════════════════════════════════════════════════════

export interface JijiHapHit {
  kind: '방합' | '삼합' | '육합'
  key: string
  chars: string[]
  where: string
  /** 교재 80·82쪽 "세 지지 중 하나는 반드시 月支에 있어야" */
  monthTied: boolean
  /** 갈리는 합에서 이번 명식이 어느 쪽인가 (子丑·巳申) */
  hwaEl?: Ohaeng
  hwaWhy?: string
  /** 육합이 깨지는가 (午未 + 子午沖·子未원진) */
  broken?: string
}

/**
 * 지지 합을 판정한다. (교재 80~82쪽)
 *
 *   ⚠️ 준삼합·반합은 넣지 않습니다 — 대표님 확정 (34-4장).
 *      세 글자가 다 있어야 섭니다. 화면(ExpertDetail)도 같은 잣대입니다. (교훈 CL)
 *
 *   @param score 오행 100점 (simsanOhaeng). 子丑·巳申이 갈릴 때만 씁니다.
 */
export function judgeJijiHap(saju: Pill[], score?: Record<Ohaeng, number>): JijiHapHit[] {
  const ps = sorted(saju)
  const brs = ps.map(p => p.branch).filter(Boolean)
  const monthB = ps.find(p => p.pillar === '월주')?.branch ?? ''
  const whereOf = (chars: string[]) =>
    chars.map(c => JI_NAME[ps.find(p => p.branch === c)?.pillar ?? ''] ?? '').filter(Boolean).join('-')
  /** 교재에 "세력이 왕성하면" 이라고만 적힌 자리의 잣대 — simsanOhaeng 의 「발달」(25점) */
  const strong = (el: Ohaeng) => (score?.[el] ?? 0) >= 25

  const out: JijiHapHit[] = []

  // ── 방합 (82쪽) — 삼합보다 세다 ──
  for (const r of BANGHAP) {
    if (!r.chars.every(c => brs.includes(c))) continue
    out.push({
      kind: '방합', key: r.key, chars: r.chars,
      where: whereOf(r.chars), monthTied: r.chars.includes(monthB),
    })
  }
  // ── 삼합 (80~81쪽) ──
  for (const r of SAMHAP) {
    if (!r.chars.every(c => brs.includes(c))) continue
    out.push({
      kind: '삼합', key: r.key, chars: r.chars,
      where: whereOf(r.chars), monthTied: r.chars.includes(monthB),
    })
  }
  // ── 육합 (80쪽) ──
  //    ★방합·삼합에 이미 삼켜진 짝은 겹쳐 내지 않는다 (34부와 같은 결)
  const eaten = new Set<string>()
  for (const h of out) for (const c of h.chars) eaten.add(c)

  for (const r of YUKHAP) {
    if (!r.chars.every(c => brs.includes(c))) continue
    if (r.chars.every(c => eaten.has(c))) continue

    let hwaEl: Ohaeng | undefined
    let hwaWhy: string | undefined
    let broken: string | undefined

    if (r.key === '子丑合') {
      // 교재 80쪽 — 月支가 亥子丑月이면 水 / 年·月·時는 土 / 水나 金이 왕성하면 水
      if (['亥', '子', '丑'].includes(monthB)) {
        hwaEl = '수'; hwaWhy = '월지가 亥子丑월이라'
      } else if (strong('수') || strong('금')) {
        hwaEl = '수'; hwaWhy = '수·금 세력이 왕성해'
      } else {
        hwaEl = '토'; hwaWhy = '월지가 아니라'
      }
    } else if (r.key === '巳申合') {
      // 교재 80쪽 — 水가 많으면 水(30), 金이 많으면 金(70)
      const w = score?.['수'] ?? 0
      const g = score?.['금'] ?? 0
      if (w > g) { hwaEl = '수'; hwaWhy = '수가 많아' }
      else { hwaEl = '금'; hwaWhy = '금이 많아' }
    } else if (r.key === '午未合') {
      // 교재 80쪽 — 합이 깨져 六害가 될 때 어긋나는 힘이 크다 (子午沖·子未원진)
      if (brs.includes('子')) {
        broken = JIJI_CHUNG['午'] === '子' && WONJIN['未'] === '子'
          ? '子午沖과 子未 원진이 함께 걸려'
          : '子가 들어 합이 흔들려'
      }
    }
    out.push({
      kind: '육합', key: r.key, chars: r.chars,
      where: whereOf(r.chars), monthTied: r.chars.includes(monthB),
      hwaEl, hwaWhy, broken,
    })
  }
  return out
}

// ═══════════════════════════════════════════════════════════
// 5. 자화간합 (82쪽)
// ═══════════════════════════════════════════════════════════

/**
 * 자화간합 — 일간이 일지 지장간의 정관·정재와 합하는 다섯 일주.
 *   교재 82쪽: 甲午 · 戊子 · 辛巳 · 丁亥 · 壬午
 *   ⚠️ 일주만 놓고 본 것입니다. 교재도 "원국 여덟 글자를 다 살펴야 한다"고 답니다.
 */
export function judgeJahwa(dayStem: string, dayBranch: string) {
  return JAHWA_GANHAP.find(r => r.key === `${dayStem}${dayBranch}`) ?? null
}

// ═══════════════════════════════════════════════════════════
// 6. 암합 (83쪽)
// ═══════════════════════════════════════════════════════════

export interface AmhapHit {
  key: string
  chars: [string, string]
  where: string
  /** 어느 천간합이 지장간 속에서 일어나는가 */
  ganhap: string[]
  /** 辰戌丑未가 껴서 개고가 필요한 자리인가 */
  needsOpen: boolean
  /** 형충으로 창고 문이 열렸는가 */
  opened: boolean
  openedBy?: string
}

/** 두 지지의 지장간끼리 이루는 천간합을 찾는다 */
function ganhapBetween(a: string, b: string): string[] {
  const ha = JIJANGAN[a] ?? []
  const hb = JIJANGAN[b] ?? []
  const out: string[] = []
  for (const row of CHEONGAN_HAP) {
    const [x, y] = row.chars
    if ((ha.includes(x) && hb.includes(y)) || (ha.includes(y) && hb.includes(x))) out.push(row.key)
  }
  return out
}

/**
 * 암합을 판정한다. (교재 83쪽)
 *
 *   교재가 이름 들어 적은 둘은 늘 봅니다.
 *       亥(戊甲壬)-午(丙己丁)  겉은 水剋火 이지만 甲己合·丁壬合
 *       卯(甲乙)-申(戊壬庚)    겉은 金剋木 이고 卯申 귀문이지만 乙庚合
 *   辰戌丑未가 낀 짝은 **개고(형충)가 되었을 때만** 인정합니다.
 *       교재 예) 丑과 寅 — 丑未沖이나 丑戌刑으로 창고 문이 열려야 한다
 */
export function judgeAmhap(saju: Pill[]): AmhapHit[] {
  const ps = sorted(saju)
  const brs = ps.map(p => p.branch).filter(Boolean)
  const whereOf = (a: string, b: string) =>
    [a, b].map(c => JI_NAME[ps.find(p => p.branch === c)?.pillar ?? ''] ?? '').filter(Boolean).join('-')

  const seen = new Set<string>()
  const out: AmhapHit[] = []

  for (let i = 0; i < brs.length; i++) {
    for (let j = i + 1; j < brs.length; j++) {
      const a = brs[i], b = brs[j]
      if (a === b) continue
      const key = [a, b].sort().join('')
      if (seen.has(key)) continue

      const named = (a === '亥' && b === '午') || (a === '午' && b === '亥')
        || (a === '卯' && b === '申') || (a === '申' && b === '卯')
      const needsOpen = TOJI.has(a) || TOJI.has(b)
      if (!named && !needsOpen) continue

      const ganhap = ganhapBetween(a, b)
      if (!ganhap.length) continue

      // 개고 — 낀 토지가 다른 지지와 형이나 충을 이루는가
      let opened = false
      let openedBy: string | undefined
      if (needsOpen) {
        for (const t of [a, b].filter(x => TOJI.has(x))) {
          for (const other of brs) {
            if (other === t) continue
            if (JIJI_CHUNG[t] === other) { opened = true; openedBy = `${t}${other}沖`; break }
            if (HYEONG_PAIR.some(([x, y]) => (x === t && y === other) || (y === t && x === other))) {
              opened = true; openedBy = `${t}${other}刑`; break
            }
          }
          if (opened) break
        }
        if (!opened) continue   // 교재 83쪽 — 개고가 안 되면 암합으로 안 본다
      }

      seen.add(key)
      out.push({
        key, chars: [a, b], where: whereOf(a, b),
        ganhap, needsOpen, opened: needsOpen ? opened : true, openedBy,
      })
    }
  }
  return out
}

// ═══════════════════════════════════════════════════════════
// 7. 합이 많은가 · 천지합덕 (83쪽)
// ═══════════════════════════════════════════════════════════

export interface HapCount { cheongan: number; jiji: number; total: number }

/** 성립한 합만 센다 — 방해받은 천간합은 빼고 센다 */
export function countHap(saju: Pill[], score?: Record<Ohaeng, number>): HapCount {
  const cheongan = judgeCheonganHap(saju).filter(h => h.seongrip).length
  const jiji = judgeJijiHap(saju, score).length
  return { cheongan, jiji, total: cheongan + jiji }
}

/** 천지합덕 — 천간에서도 합이 여러 번, 지지에서도 합 (83쪽) */
export function isCheonjiHapdeok(saju: Pill[], score?: Record<Ohaeng, number>): boolean {
  const c = countHap(saju, score)
  return c.cheongan >= 2 && c.jiji >= 1
}
