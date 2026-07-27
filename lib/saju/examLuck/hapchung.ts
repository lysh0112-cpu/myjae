// lib/saju/examLuck/hapchung.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  원국 ↔ 운(運) 사이의 합·충 판정                                  │
// └───────────────────────────────────────────────────────────────┘
//
// ★왜 새로 만드나
//   lib/saju/hapchungScore.ts 에 삼합·방합·육합·충 표가 이미 있지만
//   ① export 가 안 되어 있고
//   ② 그 파일은 "원국 안에서의 합충"으로 오행 점수를 옮기는 물건이다.
//   합격운은 "원국과 그해 간지 사이"를 봐야 해서 쓰임이 다르다.
//   공용 파일을 고치면 사주보기·궁합·출산택일이 함께 흔들리므로,
//   career/ 와 같은 방식으로 여기서 감싼다. (29부 5장)

// ★2026-07-27 — sipsinOf 를 직접 부르지 않는다. 지지를 못 읽어 조용히 '' 를 준다.
//   반드시 sipsinOfChar 를 쓸 것. 까닭은 ./sipsin.ts 머리말에 적어 두었다.
import { sipsinOfChar } from './sipsin'
import type { Pillar } from './types'

// ── 표 ──────────────────────────────────────────────────────────
/** 천간합 5쌍 (교재 공통) */
const CHEONGAN_HAP: Record<string, string> = {
  甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙',
  丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊',
}
/** 천간충 (칠살충) */
const CHEONGAN_CHUNG: Record<string, string> = {
  甲: '庚', 庚: '甲', 乙: '辛', 辛: '乙', 丙: '壬', 壬: '丙', 丁: '癸', 癸: '丁',
}
/** 지지충 6쌍 */
const JIJI_CHUNG: Record<string, string> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
}
/** 육합 */
const YUKHAP: Record<string, string> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
}
/** 삼합 (세 글자) */
const SAMHAP: string[][] = [
  ['申', '子', '辰'], ['亥', '卯', '未'], ['寅', '午', '戌'], ['巳', '酉', '丑'],
]
/** 방합 (세 글자) */
const BANGHAP: string[][] = [
  ['寅', '卯', '辰'], ['巳', '午', '未'], ['申', '酉', '戌'], ['亥', '子', '丑'],
]
/** 삼형 — ★교재는 "시험운과는 무관"이라 했다. 세지만 점수에 안 쓴다. */
const SAMHYEONG: string[][] = [['丑', '戌', '未'], ['寅', '巳', '申']]

// ── 낱개 판정 ────────────────────────────────────────────────────
export const isCheonganHap = (a: string, b: string) => !!a && CHEONGAN_HAP[a] === b
export const isCheonganChung = (a: string, b: string) => !!a && CHEONGAN_CHUNG[a] === b
export const isJijiChung = (a: string, b: string) => !!a && JIJI_CHUNG[a] === b
export const isYukhap = (a: string, b: string) => !!a && YUKHAP[a] === b

/** 원국 지지들 + 그해 지지 가 삼합/방합을 이루는가 */
export function makesGroupHap(natalBranches: string[], yearBranch: string): string | null {
  if (!yearBranch || yearBranch === '?') return null
  const have = new Set(natalBranches.filter(b => b && b !== '?'))
  for (const set of SAMHAP) {
    if (!set.includes(yearBranch)) continue
    const rest = set.filter(x => x !== yearBranch)
    if (rest.every(x => have.has(x))) return `삼합(${set.join('')})`
  }
  for (const set of BANGHAP) {
    if (!set.includes(yearBranch)) continue
    const rest = set.filter(x => x !== yearBranch)
    if (rest.every(x => have.has(x))) return `방합(${set.join('')})`
  }
  return null
}

/** 삼형이 이루어지는가 (교재상 시험운과 무관 — 알려만 준다) */
export function makesSamhyeong(natalBranches: string[], yearBranch: string): string | null {
  if (!yearBranch || yearBranch === '?') return null
  const have = new Set(natalBranches.filter(b => b && b !== '?'))
  for (const set of SAMHYEONG) {
    if (!set.includes(yearBranch)) continue
    const rest = set.filter(x => x !== yearBranch)
    if (rest.every(x => have.has(x))) return set.join('')
  }
  return null
}

// ── 묶음 판정 ────────────────────────────────────────────────────
export interface NatalRefs {
  dayStem: string
  dayBranch: string
  branches: string[]
  /** 원국에서 관성(정관·편관)에 해당하는 글자들 */
  gwanChars: string[]
  /** 원국에서 인성(정인·편인)에 해당하는 글자들 */
  inChars: string[]
  /** 원국에서 비겁(비견·겁재)에 해당하는 글자들 */
  bigyeopChars: string[]
}

/** 원국에서 관성·인성·비겁이 어느 글자인지 미리 뽑아 둔다 */
export function readNatal(saju: Pillar[]): NatalRefs {
  const day = saju.find(p => p.pillar === '일주')
  const dayStem = day?.stem ?? ''
  const dayBranch = day?.branch ?? ''

  const branches = saju.map(p => p.branch).filter(b => b && b !== '?')
  const gwanChars: string[] = []
  const inChars: string[] = []
  const bigyeopChars: string[] = []

  if (dayStem && dayStem !== '?') {
    for (const p of saju) {
      for (const ch of [p.stem, p.branch]) {
        if (!ch || ch === '?') continue
        // ★2026-07-27 — 전에는 sipsinOf 라 지지가 전부 '' 였다.
        //   관성이 일지·월지에만 있는 사람이 "관성 없는 사람"으로 처리됐다.
        const s = sipsinOfChar(dayStem, ch)
        if (s === '정관' || s === '편관') gwanChars.push(ch)
        else if (s === '정인' || s === '편인') inChars.push(ch)
        else if (s === '비견' || s === '겁재') bigyeopChars.push(ch)
      }
    }
  }
  return { dayStem, dayBranch, branches, gwanChars, inChars, bigyeopChars }
}

/** 일간과 그해 관성이 합을 하는가 — 교재가 합격 1순위로 꼽은 자리 */
export function ilganGwanHap(n: NatalRefs, yStem: string): boolean {
  if (!n.dayStem || !yStem) return false
  const s = sipsinOfChar(n.dayStem, yStem)   // 천간이라 결과는 전과 같다
  if (s !== '정관' && s !== '편관') return false
  return isCheonganHap(n.dayStem, yStem)
}

/** 일간과 그해 관성이 충을 하는가 */
export function ilganGwanChung(n: NatalRefs, yStem: string): boolean {
  if (!n.dayStem || !yStem) return false
  const s = sipsinOfChar(n.dayStem, yStem)   // 천간이라 결과는 전과 같다
  if (s !== '정관' && s !== '편관') return false
  return isCheonganChung(n.dayStem, yStem)
}

/** 일주가 그해 간지와 천합지합 — 위아래가 모두 합 */
export function cheonhapJihap(n: NatalRefs, yStem: string, yBranch: string): boolean {
  return isCheonganHap(n.dayStem, yStem) && isYukhap(n.dayBranch, yBranch)
}

/** 일주가 그해 간지와 천극지충 — 위아래가 모두 충 */
export function cheongeukJichung(n: NatalRefs, yStem: string, yBranch: string): boolean {
  return isCheonganChung(n.dayStem, yStem) && isJijiChung(n.dayBranch, yBranch)
}

/** 원국의 어떤 글자 무리가 그해 간지에게 충을 받는가 */
export function chungedBy(chars: string[], yStem: string, yBranch: string): boolean {
  return chars.some(c => isCheonganChung(c, yStem) || isJijiChung(c, yBranch))
}

/**
 * ★형(刑) — 교재 195쪽 「관성과 인성이 형충(刑沖)을 하거나」 (2026-07-27)
 *
 * [무엇이 빠져 있었나]
 *   교재는 "형충" 이라 했는데 chungedBy 는 충(沖)만 봤다.
 *   교재가 "가장 불리하다" 고 꼽은 자리인데 절반만 재고 있었다.
 *
 * [무엇을 형으로 보나]
 *   삼형  寅巳申 · 丑戌未   (셋이 모여야 삼형. 둘만 있으면 반형)
 *   상형  子卯              (서로 예의를 잃는다)
 *   자형  辰辰 · 午午 · 酉酉 · 亥亥
 */
const SAMHYEONG_SETS = [['寅', '巳', '申'], ['丑', '戌', '未']]
const SANGHYEONG: Record<string, string> = { 子: '卯', 卯: '子' }
const JAHYEONG = ['辰', '午', '酉', '亥']

/** 두 지지가 형(刑) 관계인가 — 자형·상형만 본다 (삼형은 셋을 봐야 한다) */
export function isJijiHyeong(a: string, b: string): boolean {
  if (!a || !b || a === '?' || b === '?') return false
  if (SANGHYEONG[a] === b) return true
  if (a === b && JAHYEONG.includes(a)) return true
  // 삼형 짝 가운데 둘 — 반형(半刑)으로 본다
  return SAMHYEONG_SETS.some(set => set.includes(a) && set.includes(b) && a !== b)
}

/** 그 글자들이 그해 간지에게 충(沖)이나 형(刑)을 당하는가 */
export function hyeongChungedBy(chars: string[], yStem: string, yBranch: string): boolean {
  return chars.some(c =>
    isCheonganChung(c, yStem) || isJijiChung(c, yBranch) || isJijiHyeong(c, yBranch))
}

/** 원국의 어떤 글자 무리가 그해 간지와 합으로 묶이는가 (합거) */
export function hapedBy(chars: string[], yStem: string, yBranch: string): boolean {
  return chars.some(c => isCheonganHap(c, yStem) || isYukhap(c, yBranch))
}
