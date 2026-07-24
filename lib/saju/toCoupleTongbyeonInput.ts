// lib/saju/toCoupleTongbyeonInput.ts
// ============================================================================
//  궁합 통변 재료 조립기 — 계산기들이 이미 구한 값을 AI 가 쓸 수 있게 묶는다.
//
//  ══════════════════════════════════════════════════════════════════════
//  ★2026-07-24 신설 (26부 궁합 통변 재설계)
//
//  [왜 만들었나]
//  26부에서 화면 판정은 심산으로 바꿨는데, AI 가 받는 재료는 옛 점수제
//  (coupleScore/marriedScore)가 주력이었다. 고객은 심산 판정과 별표를 보고
//  왔는데 AI 는 "천생연분 등급 87점" 같은 다른 계산으로 답하고 있었다.
//
//  [대표님 지시 — 재료 3단 구조]
//    ① 기본  : 사주분석에서 쓰는 계산기를 그대로 가져온다
//              (십신·용신·세운·공망·12운성·신살·귀인·오행)
//    ② 우선  : 심산 교본 판정이 있으면 그것을 먼저 반영한다.
//              ①과 어긋나면 심산이 이긴다.
//    ③ 톤    : 사주 통변 톤(공통 톤)에 맞춘다.
//
//  [재사용 — 교훈 E. 새로 만든 계산은 하나도 없다]
//    simsanOhaeng.ts  오행 점수 (심산 38쪽)
//    yongsinNew.ts    용신 5신 (151쪽) · 십신
//    gongmang.ts      공망
//    unsung.ts        12운성      + unsungMeaning.ts
//    sinsal.ts        신살        + sinsalMeaning.ts
//    gwiin.ts         귀인 8종    + gwiinMeaning.ts
//    dayun.ts         세운 (연간지만 쓰므로 절기 API 불필요)
//    coupleFilterV1   심산 판정 6카드 + 총평
//
//  [대운은 여기서 만들지 않는다]
//    대운수는 절입일이 필요해 서버(/api/dayun)를 거쳐야 한다.
//    화면에서 받아 온 값을 dayun 인자로 넘겨 주면 블록에 담는다.
//    없으면 그 블록만 빠진다. (조용히 틀린 값을 지어내지 않는다 — 교훈 U)
//  ══════════════════════════════════════════════════════════════════════

import { calcSimsanOhaeng, type Pillar, type Ohaeng } from './simsanOhaeng'
import { calcYongsinNew, sipsinOf } from './yongsinNew'
import { getGongmang } from './gongmang'
import { getUnsung } from './unsung'
import { getSinsal } from './sinsal'
import { getGwiinForBranch, getGwiinForStem } from './gwiin'
import { UNSUNG_MEANING } from './unsungMeaning'
import { SINSAL_MEANING } from './sinsalMeaning'
import { GWIIN_MEANING } from './gwiinMeaning'
import { calcSeyunList } from './dayun'
import type { CoupleJudgeV1, CategoryResult } from './coupleFilterV1'

// ── 표기용 ──────────────────────────────────────────────────────────────
const EL_KOR: Record<string, string> = {
  목: '나무(木)', 화: '불(火)', 토: '흙(土)', 금: '쇠(金)', 수: '물(水)',
}

/** 한 사람 입력 — 화면이 이미 갖고 있는 값만 받는다. */
export interface CouplePersonInput {
  name: string
  gender: '남' | '여'
  /** 년주·월주·일주·시주 (시 모르면 시주를 빼고 넘긴다) */
  saju: Pillar[]
  /** 심산 오행 점수에 필요한 양력 정보 */
  solarMonth: number
  solarDay: number
  hourBranch: string | null
  /** 표기용 생년월일 (예: "1998.1.5") */
  birthLabel?: string
  /** 만 나이 — 부부 궁합 톤 조절용 */
  age?: number
  /** 대운 — 서버(/api/dayun)에서 받아 온 것만 넣는다. 없으면 생략 */
  dayun?: { age: number; cheongan: string; jiji: string }[]
}

export interface CoupleTongbyeonMaterial {
  /** [첫 번째 사람] / [두 번째 사람] 블록 */
  personBlocks: string[]
  /** [심산 판정] 블록 — 있으면 이것을 우선하라고 지시한다 */
  judgeBlock: string
  /** [흐름] 세운·대운 블록 (시기 질문용) */
  flowBlock: string
}

// ── 한 사람 재료 ────────────────────────────────────────────────────────
function personBlock(p: CouplePersonInput, label: string): string {
  const find = (k: string) => p.saju.find(x => x.pillar === k)
  const year = find('년주'), month = find('월주')
  const day = find('일주'), hour = find('시주')
  const dayStem = day?.stem ?? ''
  const dayBranch = day?.branch ?? ''
  const monthBranch = month?.branch ?? ''
  const yearBranch = year?.branch ?? ''

  const lines: string[] = []
  const pillars = [year, month, day, hour]
    .map(x => (x ? `${x.stem}${x.branch}` : '모름'))
    .join(' ')
  lines.push(`[${label}] ${p.name} · ${p.gender}${p.birthLabel ? ` · ${p.birthLabel}` : ''}`)
  lines.push(`- 명식(팔자): ${pillars}`)
  lines.push(`- 타고난 본바탕(일간): ${dayStem}`)

  // ── 오행 (심산 38쪽 점수) ──
  const ohaeng = calcSimsanOhaeng(p.saju, p.solarMonth, p.solarDay, p.hourBranch)
  const ALL: Ohaeng[] = ['목', '화', '토', '금', '수']
  const sorted = [...ALL].sort((a, b) => (ohaeng[b] ?? 0) - (ohaeng[a] ?? 0))
  const lack = ALL.filter(e => (ohaeng[e] ?? 0) === 0)
  lines.push(`- 기운 분포: ${sorted.map(e => `${EL_KOR[e]} ${ohaeng[e] ?? 0}`).join(' · ')}`)
  if (lack.length) lines.push(`- 아예 없는 기운: ${lack.map(e => EL_KOR[e]).join('·')}`)

  // ── 용신 (151쪽) ──
  const yong = dayStem ? calcYongsinNew(p.saju, dayStem, ohaeng) : null
  if (yong) {
    lines.push(`- 꼭 필요한 기운(용신): ${EL_KOR[yong.eokbu.yongsin] ?? yong.eokbu.yongsin}` +
      ` / 도움 되는 기운(희신): ${EL_KOR[yong.eokbu.heesin] ?? yong.eokbu.heesin}` +
      ` / 부담되는 기운(기신): ${EL_KOR[yong.eokbu.gisin] ?? yong.eokbu.gisin}`)
  }

  // ── 십신 (일간 기준, 각 기둥 천간) ──
  const sipsin: string[] = []
  for (const q of p.saju) {
    if (!q.stem || q.pillar === '일주') continue
    const s = sipsinOf(dayStem, q.stem)
    if (s) sipsin.push(`${q.pillar} ${q.stem}=${s}`)
  }
  if (sipsin.length) lines.push(`- 십신(천간): ${sipsin.join(' · ')}`)

  // ── 명식 특징 (12운성·신살·귀인·공망) ──
  const feat: string[] = []

  const iljiUnsung = dayStem && dayBranch ? getUnsung(dayStem, dayBranch) : ''
  if (iljiUnsung && UNSUNG_MEANING[iljiUnsung]) {
    feat.push(`  · 일주 12운성 ${iljiUnsung} — ${UNSUNG_MEANING[iljiUnsung].key}`)
  }

  const sinsalSet = new Set<string>()
  for (const q of p.saju) {
    if (!q.branch) continue
    const s = getSinsal(yearBranch, q.branch)
    if (s && SINSAL_MEANING[s]) sinsalSet.add(s)
  }
  for (const s of sinsalSet) feat.push(`  · 신살 ${s} — ${SINSAL_MEANING[s].key}`)

  const gwiinSet = new Set<string>()
  for (const q of p.saju) {
    if (q.stem) for (const g of getGwiinForStem(monthBranch, q.stem)) gwiinSet.add(g)
    if (q.branch) for (const g of getGwiinForBranch(dayStem, monthBranch, q.branch)) gwiinSet.add(g)
  }
  for (const g of gwiinSet) {
    const m = GWIIN_MEANING[g]
    feat.push(`  · 귀인 ${g}${m ? ` — ${m.bless}` : ''}`)
  }

  if (dayStem && dayBranch) {
    const gm = getGongmang(dayStem, dayBranch)
    if (gm?.[0] && gm[0] !== '?') {
      const where = p.saju.filter(q => q.branch === gm[0] || q.branch === gm[1]).map(q => q.pillar)
      feat.push(`  · 비어 있는 자리(공망) ${gm[0]}·${gm[1]}${where.length ? ` (${where.join('·')})` : ''}`)
    }
  }

  if (feat.length) {
    lines.push('- 명식 특징:')
    lines.push(...feat)
  }

  return lines.join('\n')
}

// ── 심산 판정 블록 ──────────────────────────────────────────────────────
function starStr(n?: number): string {
  return n ? '★'.repeat(n) + '☆'.repeat(5 - n) : ''
}

function catBlock(c: CategoryResult): string {
  const out: string[] = [`[${c.title}] ${starStr(c.stars)}`]
  c.lines.forEach(l => out.push(`  - ${l}`))
  c.dual?.forEach(d => out.push(`  - ${d.text} ${starStr(d.stars)}`))
  return out.join('\n')
}

function judgeBlock(j: CoupleJudgeV1 | null): string {
  if (!j) return ''
  const out: string[] = []
  out.push('[심산 판정 — ★가장 중요한 근거★]')
  out.push('아래는 고객이 화면에서 이미 본 내용입니다.')
  out.push('위 [기본 재료]와 어긋나는 대목이 있으면 반드시 이 판정을 따르세요.')
  out.push('')
  out.push(`한 줄 요약: ${j.badge}`)
  out.push('')
  j.cats.forEach(c => { out.push(catBlock(c)); out.push('') })
  if (j.good.length) { out.push('· 도움이 되는 자리'); j.good.forEach(t => out.push(`  - ${t}`)) }
  if (j.watch.length) { out.push('· 살피면 좋은 자리'); j.watch.forEach(t => out.push(`  - ${t}`)) }
  if (j.note.length) { out.push('· 알아두면 좋은 점'); j.note.forEach(t => out.push(`  - ${t}`)) }
  out.push('')
  out.push('⚠️ 위 판정에는 옛 명리서의 표현이 그대로 담긴 대목이 있습니다.')
  out.push('   (예: "刑이 된다", "배신수·소송수가 있다", "질환을 조심해라")')
  out.push('   이런 말을 절대 그대로 옮기지 마세요. 뜻만 살려 쉬운 말로 풀고,')
  out.push('   반드시 "이렇게 맞춰가면 된다"는 방향까지 함께 전하세요.')
  return out.join('\n')
}

// ── 흐름(세운·대운) 블록 ────────────────────────────────────────────────
const JI_HAP: string[][] = [
  ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未'],
]
const CHUNG: string[][] = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
]
const isPair = (a: string, b: string, list: string[][]) =>
  list.some(([x, y]) => (a === x && b === y) || (a === y && b === x))

/**
 * 시기 질문("결혼운 좋은 때", "고비가 오는 때")용 재료.
 *   ⚠️ 세운은 연간지만 쓰므로 절기 API 가 필요 없다. 그래서 항상 정확하다.
 *      대운은 절입일이 필요해 서버에서 받아 온 것만 담는다.
 */
function flowBlock(
  a: CouplePersonInput, b: CouplePersonInput, fromYear: number, years = 8,
): string {
  const aDay = a.saju.find(x => x.pillar === '일주')
  const bDay = b.saju.find(x => x.pillar === '일주')
  if (!aDay?.stem || !bDay?.stem) return ''

  const out: string[] = []
  out.push('[앞으로의 흐름 — 시기를 묻는 질문에만 쓰세요]')

  // 대운 (있을 때만)
  if (a.dayun?.length) {
    out.push(`- ${a.name}님 대운: ${a.dayun.slice(0, 5).map(d => `${d.age}세 ${d.cheongan}${d.jiji}`).join(' / ')}`)
  }
  if (b.dayun?.length) {
    out.push(`- ${b.name}님 대운: ${b.dayun.slice(0, 5).map(d => `${d.age}세 ${d.cheongan}${d.jiji}`).join(' / ')}`)
  }

  // 세운 — 배우자 십신이 오는 해 · 일지에 合/沖이 오는 해
  const aList = calcSeyunList(aDay.stem, fromYear)
  const bList = calcSeyunList(bDay.stem, fromYear)
  const aSpouse = a.gender === '남' ? '재' : '관'
  const bSpouse = b.gender === '남' ? '재' : '관'

  out.push(`- 해마다의 기운 (${fromYear}년부터)`)
  for (const y of aList) {
    if (y.year < fromYear || y.year >= fromYear + years) continue
    const bi = bList.find(x => x.year === y.year)
    const tags: string[] = []
    if (y.ganYukchin.includes(aSpouse) || y.jiYukchin.includes(aSpouse)) tags.push(`${a.name}님 인연운`)
    if (bi && (bi.ganYukchin.includes(bSpouse) || bi.jiYukchin.includes(bSpouse))) tags.push(`${b.name}님 인연운`)
    if (isPair(aDay.branch, y.jiji, JI_HAP)) tags.push(`${a.name}님 자리에 合`)
    if (bi && isPair(bDay.branch, bi.jiji, JI_HAP)) tags.push(`${b.name}님 자리에 合`)
    if (isPair(aDay.branch, y.jiji, CHUNG)) tags.push(`${a.name}님 자리가 흔들림`)
    if (bi && isPair(bDay.branch, bi.jiji, CHUNG)) tags.push(`${b.name}님 자리가 흔들림`)
    out.push(`  · ${y.year} ${y.cheongan}${y.jiji}${tags.length ? ` — ${tags.join(' · ')}` : ''}`)
  }
  out.push('  ※ 좋은 해라고 단정하지 말고 "이런 기운이 도는 무렵"으로 부드럽게 전하세요.')
  return out.join('\n')
}

// ── 바깥에서 쓰는 것 ────────────────────────────────────────────────────
export function toCoupleTongbyeonMaterial(
  a: CouplePersonInput,
  b: CouplePersonInput,
  judge: CoupleJudgeV1 | null,
  opts: { fromYear?: number; flowYears?: number } = {},
): CoupleTongbyeonMaterial {
  const fromYear = opts.fromYear ?? new Date().getFullYear()
  return {
    personBlocks: [personBlock(a, '첫 번째 사람'), personBlock(b, '두 번째 사람')],
    judgeBlock: judgeBlock(judge),
    flowBlock: flowBlock(a, b, fromYear, opts.flowYears ?? 8),
  }
}
