// app/manseryeok/birth-timing/lib/scoreV6.ts
//
// ★ 출산택일 v6 채점 — 연재쌤 검수 반영 (2026-07-23)
//
//   [v5 → v6 배점 재구성]
//     오행 10 → 25   (건강. 연재쌤이 1번으로 꼽음)
//     용신    → 25   (신규. 조후 25점을 흡수 — 여름겨울=조후용신 / 봄가을=억부용신)
//     격국 35 → 15   (그릇·성공 크기)
//     통근 15 → 10
//     재관 15 → 10
//     대운    → 15   (별도 파일에서 계산, 여기선 배점만 명시)
//     ─────────────  합 100
//
//   [연재쌤 확정 기준]
//   1. 건강 = 오행을 다 넣어줘야 한다.
//      단, 8글자에 다 못 넣으면 '인성'을 뺀다 → 인성 오행 결핍은 감점하지 않는다.
//   2. 격 = 성공의 크기(그릇)를 본다.
//   3. 일간의 뿌리가 튼튼해야 한다(통근).
//   4. 형충(刑沖)되면 성공에 큰 문제 → 성공축(격국)에서 감점한다.
//      · 파(破)·해(害)는 보지 않는다. 형·충만.
//      · 원진은 월지-일지에 있으면 '배제'(recommendV6에서 처리, 여기선 안 봄).
//   5. 조후용신 — 여름·겨울생은 조후용신, 봄·가을생은 억부용신을 중점적으로 본다.
//   6. 금2·화2 이면 부자 사주로 친다 → 재관 가점.
//   7. 삼합·방국을 넣어준다 → 그 오행이 강해진 것으로 보고 오행·용신 판정에 반영.
//   8. 용신 오행을 넣어준다 → 원국에 용신이 있는지를 25점으로 직접 채점.
//
//   [원칙] 공용 엔진(simsanOhaeng·yongsinNew)은 수정하지 않는다. 결과를 받아 조립만.

import type { Candidate } from './candidates'
import { engineInputs } from './engineAdapter'
import { judgeSungpae, type SungpaeResult } from './gyeokgukSungpae'
import { calcSimsanOhaeng } from '@/lib/saju/simsanOhaeng'
import { calcYongsinNew } from '@/lib/saju/yongsinNew'
import { getGwiinForBranch } from '@/lib/saju/gwiin'
import { BIRTH_SCORE_CONFIG as CFG } from './birthScoreConfig'

const W = CFG.weightsV6

// ── 상수 ──────────────────────────────────────────────────────────────
const STEM_EL: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_EL: Record<string, string> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}
const SUMMER = ['巳', '午', '未']
const WINTER = ['亥', '子', '丑']

// 일간 오행 → 인성 오행 (나를 낳아주는 오행)
//   연재쌤: "8글자에 오행 다 넣기 힘들면 인성을 빼라" → 인성 결핍은 감점 제외
const INSEONG_OF: Record<string, string> = {
  목: '수', 화: '목', 토: '화', 금: '토', 수: '금',
}

// 형(刑) — 삼형·상형. 파·해는 안 봄(연재쌤 확정)
const HYEONG_GROUPS: string[][] = [
  ['寅', '巳', '申'],
  ['丑', '戌', '未'],
  ['子', '卯'],
]
// 충(沖) — 육충
const CHUNG_PAIRS: [string, string][] = [
  ['子', '午'], ['丑', '未'], ['寅', '申'],
  ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
]
// 삼합 — 세 글자 모이면 그 오행이 강해짐 (궁합 coupleScore 와 동일 상수)
const SAMHAP: { branches: string[]; el: string }[] = [
  { branches: ['申', '子', '辰'], el: '수' },
  { branches: ['亥', '卯', '未'], el: '목' },
  { branches: ['寅', '午', '戌'], el: '화' },
  { branches: ['巳', '酉', '丑'], el: '금' },
]
// 방국 — 같은 계절 세 글자
const BANGGUK: { branches: string[]; el: string }[] = [
  { branches: ['寅', '卯', '辰'], el: '목' },
  { branches: ['巳', '午', '未'], el: '화' },
  { branches: ['申', '酉', '戌'], el: '금' },
  { branches: ['亥', '子', '丑'], el: '수' },
]

export interface HapResult {
  samhap: { el: string; full: boolean }[]   // full=3글자 완성, false=2글자(반합)
  bangguk: { el: string; full: boolean }[]
  boostedEls: string[]                       // 합으로 강해진 오행들
  notes: string[]
}

export interface ScoreV6Breakdown {
  total: number
  ohaeng: number       // 0~25  건강
  yongsin: number      // 0~25  용신(조후/억부)
  gyeok: number        // 0~15  격국(형충 감점 반영 후)
  tonggeun: number     // 0~10
  jaegwan: number      // 0~10
  penalty: number      // 형충 감점 합
  // 판정 정보
  status: string
  yongsinEl: string            // 이 아기의 용신 오행
  yongsinKind: '조후' | '억부'  // 어느 기준으로 잡았나
  seasonKind: '여름' | '겨울' | '봄가을'
  sungpae: SungpaeResult
  isJonggyeok: boolean
  elementGrade: Record<string, string>
  hap: HapResult
  isRichPattern: boolean       // 금2·화2 부자 사주
  gwiin: number                // 귀인 가점 (0~4)
  gwiinFound: string[]         // 어떤 귀인이 어느 자리에
  notes: string[]
}


// ── 출산택일 전용 오행 등급 ───────────────────────────────────────────
//   오행 총점은 항상 100점을 다섯이 나눠 갖는다 → 평균 20점.
//   공용 grade()는 25점부터 '발달'이라, 완벽 균형(20씩)도 전부 '약함'이 됐다.
//   여기서는 평균(20)을 '보통'으로 보도록 구간을 다시 나눈다.
export type OhaengGradeV6 = '결핍' | '약함' | '보통' | '발달' | '과다'
function gradeV6(points: number): OhaengGradeV6 {
  const cut = CFG.ohaengV6.gradeCut
  if (points <= 0) return '결핍'
  if (points < cut.weak) return '약함'
  if (points < cut.normal) return '보통'
  if (points < cut.rich) return '발달'
  return '과다'
}

// ── 삼합·방국 판정 ────────────────────────────────────────────────────
function checkHap(branches: string[]): HapResult {
  const samhap: { el: string; full: boolean }[] = []
  const bangguk: { el: string; full: boolean }[] = []
  const boosted = new Set<string>()
  const notes: string[] = []

  for (const s of SAMHAP) {
    const hit = s.branches.filter(b => branches.includes(b)).length
    if (hit === 3) {
      samhap.push({ el: s.el, full: true }); boosted.add(s.el)
      notes.push(`${s.branches.join('')} 삼합으로 ${s.el} 기운이 강해요`)
    } else if (hit === 2) {
      samhap.push({ el: s.el, full: false }); boosted.add(s.el)
    }
  }
  for (const b of BANGGUK) {
    const hit = b.branches.filter(x => branches.includes(x)).length
    if (hit === 3) {
      bangguk.push({ el: b.el, full: true }); boosted.add(b.el)
      notes.push(`${b.branches.join('')} 방국으로 ${b.el} 기운이 강해요`)
    } else if (hit === 2) {
      bangguk.push({ el: b.el, full: false }); boosted.add(b.el)
    }
  }
  return { samhap, bangguk, boostedEls: [...boosted], notes }
}

// ── ① 오행 (건강) — W.ohaeng ──────────────────────────────────────────
//   연재쌤: 다섯 오행을 다 넣어주는 게 좋다. 단 인성 결핍은 봐준다.
//   삼합·방국으로 보강된 오행은 결핍으로 치지 않는다.
function scoreOhaeng(
  scoreMap: Record<string, number>,
  dayEl: string,
  hap: HapResult,
): { score: number; gradeMap: Record<string, string>; notes: string[] } {
  const els = ['목', '화', '토', '금', '수']
  const inseong = INSEONG_OF[dayEl] ?? ''
  const gradeMap: Record<string, string> = {}
  const notes: string[] = []
  let lack = 0, over = 0, lackForgiven = 0

  let weak = 0
  for (const e of els) {
    const g = gradeV6(scoreMap[e] ?? 0)
    gradeMap[e] = g
    if (g === '결핍') {
      if (e === inseong) { lackForgiven++; continue }          // 인성은 봐줌
      if (hap.boostedEls.includes(e)) { lackForgiven++; continue } // 합으로 보강됨
      lack++
    }
    if (g === '약함') {
      // 약함은 결핍보다 가볍게 본다. 인성·합보강은 여기서도 봐준다.
      if (e === inseong || hap.boostedEls.includes(e)) continue
      weak++
    }
    if (g === '과다') over++
  }

  const unit = CFG.ohaengV6
  let score = W.ohaeng - lack * unit.lackEach - weak * unit.weakEach - over * unit.overEach
  if (score < 0) score = 0
  if (lack === 0) notes.push('다섯 기운이 고루 갖춰졌어요')
  if (lackForgiven > 0) notes.push('부족한 기운이 있지만 크게 문제되지 않아요')
  return { score, gradeMap, notes }
}

// ── ② 용신 — W.yongsin ────────────────────────────────────────────────
//   연재쌤: 여름·겨울생은 조후용신, 봄·가을생은 억부용신을 중점적으로 본다.
//   원국에 그 용신 오행이 얼마나 갖춰졌는지를 점수로 본다.
function scoreYongsin(
  monthBranch: string,
  johuEl: string | null,
  eokbuEl: string,
  count: Record<string, number>,
  hap: HapResult,
): { score: number; el: string; kind: '조후' | '억부'; season: '여름' | '겨울' | '봄가을'; notes: string[] } {
  const isSummer = SUMMER.includes(monthBranch)
  const isWinter = WINTER.includes(monthBranch)
  const season: '여름' | '겨울' | '봄가을' = isSummer ? '여름' : isWinter ? '겨울' : '봄가을'

  // 여름·겨울 → 조후용신 우선 / 봄·가을 → 억부용신
  const useJohu = (isSummer || isWinter) && !!johuEl
  const el = useJohu ? (johuEl as string) : eokbuEl
  const kind: '조후' | '억부' = useJohu ? '조후' : '억부'

  const notes: string[] = []
  if (!el) return { score: Math.round(W.yongsin * 0.4), el: '', kind, season, notes }

  // 원국에 용신이 몇 개 드러났는가 + 합으로 보강됐는가
  const n = count[el] ?? 0
  const boosted = hap.boostedEls.includes(el)
  const t = CFG.yongsinV6

  let score: number
  if (n >= 3) score = W.yongsin                       // 넉넉
  else if (n === 2) score = t.two
  else if (n === 1) score = t.one
  else score = t.none                                  // 용신이 아예 없음
  if (boosted && n > 0) score = Math.min(W.yongsin, score + t.hapBonus)

  if (n === 0) notes.push(`꼭 필요한 ${el} 기운이 원국에 없어요 (대운에서 와주는지가 중요)`)
  else if (n >= 2) notes.push(`꼭 필요한 ${el} 기운이 잘 갖춰졌어요`)

  return { score, el, kind, season, notes }
}

// ── ③ 격국 — W.gyeok (형충 감점을 여기서 뺀다) ────────────────────────
//   연재쌤: "형충되면 성공에 큰 문제" → 총점이 아니라 성공축(격국)에서 감점.
function scoreGyeok(sp: SungpaeResult, branches: string[]): { score: number; penalty: number; notes: string[] } {
  const g = CFG.gyeokV6
  const base = sp.verdict === 'sunggyeok' ? g.sunggyeok
    : sp.verdict === 'pagyeok' ? g.pagyeok
    : g.gyeokOnly

  const notes: string[] = []
  let penalty = 0

  // 충 — 육충 쌍이 원국에 몇 개 있나
  let chung = 0
  for (const [a, b] of CHUNG_PAIRS) {
    if (branches.includes(a) && branches.includes(b)) chung++
  }
  if (chung > 0) {
    penalty += chung * g.chungEach
    notes.push(chung >= 2 ? '지지에 충이 여러 개라 흔들림이 커요' : '지지에 충이 있어요')
  }

  // 형 — 삼형은 3글자, 상형은 2글자
  let hyeong = 0
  for (const grp of HYEONG_GROUPS) {
    const hit = grp.filter(x => branches.includes(x)).length
    const need = grp.length === 2 ? 2 : 2   // 삼형도 2글자 이상이면 형으로 본다
    if (hit >= need) hyeong++
  }
  if (hyeong > 0) {
    penalty += hyeong * g.hyeongEach
    notes.push('지지에 형(刑)이 있어요')
  }

  let score = base - penalty
  if (score < 0) score = 0
  return { score, penalty, notes }
}


// ── 귀인 가점 (연재쌤 확정: 4점 범위) ─────────────────────────────────
//   천을귀인 = 평생 위기 극복·귀인 도움 (대표 길신)
//   문창귀인 = 학업·재능
//   일지·시지(본인·자식궁)에 있으면 더 밀착된 것으로 보아 가산.
//   ※ gwiin.ts 공용 부품 재사용. 화면 원국표에 이미 표시되던 것을 점수에도 반영.
function scoreGwiin(
  dayStem: string,
  monthBranch: string,
  seats: { pillar: string; branch: string }[],
): { score: number; found: string[]; notes: string[] } {
  const g = CFG.gwiinV6
  const found: string[] = []
  const notes: string[] = []
  let score = 0

  for (const seat of seats) {
    const list = getGwiinForBranch(dayStem, monthBranch, seat.branch)
    const isClose = seat.pillar === '일주' || seat.pillar === '시주'
    if (list.includes('천을귀인')) {
      score += g.cheoneul + (isClose ? g.closeSeatBonus : 0)
      found.push(`천을귀인(${seat.pillar})`)
    }
    if (list.includes('문창귀인')) {
      score += g.munchang + (isClose ? g.closeSeatBonus : 0)
      found.push(`문창귀인(${seat.pillar})`)
    }
  }

  if (score > g.cap) score = g.cap
  score = Math.round(score * 10) / 10

  if (found.some(f => f.startsWith('천을'))) notes.push('천을귀인이 있어 어려울 때 돕는 인연이 따라요')
  if (found.some(f => f.startsWith('문창'))) notes.push('문창귀인이 있어 배움과 재능이 빛나요')

  return { score, found, notes }
}

// ── ④ 통근 — W.tonggeun ───────────────────────────────────────────────
function scoreTonggeun(status: string): number {
  const t = CFG.tonggeunV6
  if (status === '신강') return t.sinwang
  if (status === '중화') return t.junghwa
  if (status === '신약') return t.sinyak
  return t.extreme
}

// ── ⑤ 재관 — W.jaegwan (+ 금2화2 부자 가점) ───────────────────────────
function scoreJaegwan(
  sp: SungpaeResult,
  count: Record<string, number>,
): { score: number; isRich: boolean; notes: string[] } {
  const jae = (sp.sipsinCount.정재 ?? 0) + (sp.sipsinCount.편재 ?? 0)
  const gwan = (sp.sipsinCount.정관 ?? 0) + (sp.sipsinCount.편관 ?? 0)
  const t = CFG.jaegwanV6
  const notes: string[] = []

  let score = jae > 0 && gwan > 0 ? t.full : (jae > 0 || gwan > 0) ? t.partial : t.none

  // 연재쌤: 금2·화2 있으면 부자 사주로 친다
  const isRich = (count['금'] ?? 0) >= 2 && (count['화'] ?? 0) >= 2
  if (isRich) {
    score = Math.min(W.jaegwan, score + t.richBonus)
    notes.push('금과 화가 함께 자리해 재물을 다루는 힘이 좋아요')
  }
  return { score, isRich, notes }
}

// ── 종격 판정 ─────────────────────────────────────────────────────────
function checkJonggyeok(scoreMap: Record<string, number>): boolean {
  const vals = Object.values(scoreMap)
  const total = vals.reduce((a, b) => a + b, 0) || 1
  return Math.max(...vals) / total >= CFG.jonggyeok.branchDominantRatio
}

// ── 부모 소망 가중 ────────────────────────────────────────────────────
type WishTarget = { ohaeng?: boolean; yongsin?: boolean; gyeok?: boolean; tonggeun?: boolean; jaegwan?: boolean }
const WISH_MAP: Record<string, WishTarget> = {
  재물운: { jaegwan: true },
  공부운: { gyeok: true, tonggeun: true },
  건강:   { ohaeng: true, yongsin: true },
  인덕:   { tonggeun: true },
  // 부모화목: 점수 가중 없음 (AI 통변에서만 언급)
}

/** v6 원국 채점. 대운(15점)은 recommendV6 에서 별도 합산. */
export function scoreBabyV6(c: Candidate, wish?: string): ScoreV6Breakdown {
  const { saju, solarMonth, solarDay, hourBranch, dayStem } = engineInputs(c)
  const branches = [c.year.branch, c.month.branch, c.day.branch, c.hour.branch]
  const dayEl = STEM_EL[dayStem] ?? ''

  // 오행 점수(심산) + 드러난 개수
  const ohScore = calcSimsanOhaeng(saju as any, solarMonth, solarDay, hourBranch) as Record<string, number>
  const count: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  for (const p of [c.year, c.month, c.day, c.hour]) {
    const se = STEM_EL[p.stem]; if (se) count[se]++
    const be = BRANCH_EL[p.branch]; if (be) count[be]++
  }

  const ys = calcYongsinNew(saju as any, dayStem)
  const status = ys?.status ?? ''
  const sp = judgeSungpae(saju as any, dayStem, status)
  const hap = checkHap(branches)

  const oh = scoreOhaeng(ohScore, dayEl, hap)
  const yg = scoreYongsin(c.month.branch, ys?.johu?.element ?? null, ys?.eokbu?.yongsin ?? '', count, hap)
  const gk = scoreGyeok(sp, branches)
  const tg = scoreTonggeun(status)
  const jg = scoreJaegwan(sp, count)
  const gw = scoreGwiin(dayStem, c.month.branch, [
    { pillar: '년주', branch: c.year.branch },
    { pillar: '월주', branch: c.month.branch },
    { pillar: '일주', branch: c.day.branch },
    { pillar: '시주', branch: c.hour.branch },
  ])

  // 부모 소망 가중
  const w = CFG.wish.weight
  const t = wish ? WISH_MAP[wish] : undefined
  const parts = {
    ohaeng:   t?.ohaeng   ? oh.score * w : oh.score,
    yongsin:  t?.yongsin  ? yg.score * w : yg.score,
    gyeok:    t?.gyeok    ? gk.score * w : gk.score,
    tonggeun: t?.tonggeun ? tg * w : tg,
    jaegwan:  t?.jaegwan  ? jg.score * w : jg.score,
  }

  // 총점 — 상한 없음(점수를 화면에 안 보여주므로 순위 변별력이 우선)
  //   귀인은 부모소망 가중 대상이 아니다(별도 길신 가점).
  let total = parts.ohaeng + parts.yongsin + parts.gyeok + parts.tonggeun + parts.jaegwan
            + gw.score
  if (total < 0) total = 0
  total = Math.round(total)

  const notes = [...oh.notes, ...yg.notes, ...gk.notes, ...jg.notes, ...gw.notes, ...hap.notes]

  return {
    total,
    ohaeng: oh.score, yongsin: yg.score, gyeok: gk.score,
    tonggeun: tg, jaegwan: jg.score,
    penalty: gk.penalty,
    status,
    yongsinEl: yg.el, yongsinKind: yg.kind, seasonKind: yg.season,
    sungpae: sp,
    isJonggyeok: checkJonggyeok(ohScore),
    elementGrade: oh.gradeMap,
    hap,
    isRichPattern: jg.isRich,
    gwiin: gw.score,
    gwiinFound: gw.found,
    notes,
  }
}
