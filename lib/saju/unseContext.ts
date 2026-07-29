// lib/saju/unseContext.ts
//
// ┌──────────────────────────────────────────────────────────────────┐
// │  통합 리포트의 재료를 세 덩이로 나눠 만든다                          │
// │    ① 원국  — 타고난 그릇                                          │
// │    ② 대운  — 지금 지나는 10년의 환경                                │
// │    ③ 세운  — 올해의 날씨와 타이밍                                   │
// │  2026-07-29                                                       │
// └──────────────────────────────────────────────────────────────────┘
//
// ── 왜 만들었나 ──────────────────────────────────────────────────────
//   전에는 사주 / 대운 / 연월운세가 **화면도 보관함도 셋으로 갈라져** 있었습니다.
//   손님이 같은 명식을 세 번 조회해야 흐름을 알 수 있었고,
//   AI 는 매번 셋 중 하나만 보고 답을 썼습니다.
//
//   ★2026-07-29 대표님 확정 — 하나의 통합 리포트로 단권화한다.
//
// ── ⚠️ 화면은 하나지만 엔진은 엄격히 나눈다 (대표님 지시) ────────────────
//   대운과 세운은 명리적으로 **성격이 다른 자리**입니다.
//       대운  월주에서 순·역으로 뻗는 10년 단위 **환경**. 길이 아스팔트냐 비포장이냐.
//       세운  그 길 위에 올해 내리는 **날씨**. 합충으로 사건이 생기는 자리.
//   그래서 산출 함수를 따로 두고, 서로의 값을 섞어 쓰지 않습니다.
//   합쳐지는 곳은 **프롬프트 문장을 짤 때 한 번뿐**입니다.
//
// ── ⚠️ 월운·일운은 여기서 다루지 않습니다 ─────────────────────────────
//   ★2026-07-29 대표님 확정 — 월운·일운은 화면 표(UnseFlow)로만 보여 준다.
//     리포트 텍스트는 원국+대운+세운까지만 다룬다. 답변 속도와 메시지 선명함을 위해서.
//   ⚠️ 나중에 월운을 넣기로 하시면 `buildWolunContext` 를 여기 나란히 두십시오.
//      절대 세운 함수 안에 끼워 넣지 마십시오. (교훈 CJ)
//
// ── ⚠️ 여기서 새로 계산하지 않는 것 ───────────────────────────────────
//   용신·격국   yongsinNew 한 곳에서만 잰다 (교훈 BQ)
//   오행 100점  simsanOhaeng 한 곳에서만 잰다 (29부 5장 — 손대지 말 것)
//   합 성립     hapJudge 한 곳에서만 잰다 (교훈 CJ)
//   144칸       jijiGrade.jijiRelation
//   운의 沖     yukchinRule.unChungInSaju
//   이 파일은 **그것들을 불러 모아 세 덩이로 묶기만** 합니다.

import { jijiRelation } from './jijiGrade'
import { unChungInSaju, unChungLine } from './yukchinRule'
import { YUKHAP, SAMHAP, BANGHAP } from './hapMeaning'
import type { DayunItem, SeyunItem } from './dayun'
import type { Ohaeng } from './simsanOhaeng'

export interface Pill { pillar: string; stem: string; branch: string }

// ═══════════════════════════════════════════════════════════════
// 공통 — 운의 지지가 원국과 맺는 관계
// ═══════════════════════════════════════════════════════════════

const BRANCH_EL: Record<string, Ohaeng> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}
const JI_NAME: Record<string, string> = { 년주: '년지', 월주: '월지', 일주: '일지', 시주: '시지' }

/** 운이 와서 이룬 합 한 건 */
export interface UnHapHit {
  kind: '방합' | '삼합' | '육합'
  key: string
  /** 운 지지가 보탠 글자 */
  unBranch: string
  /** 원국에서 짝이 된 자리 */
  where: string
  /** 그 합이 되는 오행 */
  el?: Ohaeng
  /** 원국 세 글자 중 둘이 이미 있어 운이 마지막 한 칸을 채웠는가 */
  completed: boolean
}

/**
 * ★운에서 오는 合 — 2026-07-29 신규.
 *
 *   34부 인수인계서 35-5장 ⑦ 이 남긴 자리입니다.
 *     "33부에서 沖만 했고, 34부에서 원국 合을 넣었습니다.
 *      ★운에서 오는 合은 아직입니다"
 *
 *   교재 80·82쪽 — 삼합·방합은 세 글자가 다 모여야 섭니다.
 *   원국에 두 글자가 있고 운이 나머지 한 글자를 들고 오면 그때 **완성**됩니다.
 *   이것이 운을 볼 때 가장 크게 움직이는 자리입니다.
 *
 *   ⚠️ 대표님 확정(34-4장)대로 **준삼합·반합은 넣지 않습니다.**
 *      원국 두 글자 + 운 한 글자 = 세 글자가 다 모인 경우만 봅니다.
 */
export function unHapInSaju(saju: Pill[], unBranch: string): UnHapHit[] {
  if (!unBranch || unBranch === '?') return []
  const brs = saju.map(p => p.branch).filter(b => b && b !== '?')
  const whereOf = (chars: string[]) =>
    chars
      .filter(c => c !== unBranch || brs.includes(c))
      .map(c => JI_NAME[saju.find(p => p.branch === c)?.pillar ?? ''] ?? '')
      .filter(Boolean)
      .join('-')

  const out: UnHapHit[] = []

  // ── 방합·삼합 — 운이 마지막 한 칸을 채워 셋이 되는가 ──
  for (const [rows, kind] of [[BANGHAP, '방합'], [SAMHAP, '삼합']] as const) {
    for (const r of rows) {
      if (!r.chars.includes(unBranch)) continue
      const rest = r.chars.filter(c => c !== unBranch)
      // 원국이 나머지 둘을 다 갖고 있어야 완성된다
      if (!rest.every(c => brs.includes(c))) continue
      // 원국만으로 이미 셋이 서 있으면 운이 보탠 것이 아니다
      const already = r.chars.every(c => brs.includes(c))
      out.push({
        kind, key: r.key, unBranch,
        where: whereOf(rest),
        el: r.result?.[0],
        completed: !already,
      })
    }
  }

  // ── 육합 — 운 지지와 원국 지지가 짝이 되는가 ──
  const eaten = new Set(out.flatMap(h => h.key.split('')))
  for (const r of YUKHAP) {
    if (!r.chars.includes(unBranch)) continue
    const other = r.chars.find(c => c !== unBranch)
    if (!other || !brs.includes(other)) continue
    if (eaten.has(other)) continue   // 방합·삼합에 이미 삼켜진 짝은 겹쳐 내지 않는다
    out.push({
      kind: '육합', key: r.key, unBranch,
      where: JI_NAME[saju.find(p => p.branch === other)?.pillar ?? ''] ?? '',
      el: r.result?.[0],
      completed: true,
    })
  }

  // 교재가 매긴 세기 — 방합 〉 삼합 〉 육합
  const rank = (h: UnHapHit) => (h.kind === '방합' ? 0 : h.kind === '삼합' ? 1 : 2)
  return out.sort((a, b) => rank(a) - rank(b))
}

/** 손님에게 나갈 한 줄 */
export function unHapLine(h: UnHapHit, unLabel: string): string {
  const head = `${h.key}(${h.kind}) — ${unLabel}의 ${h.unBranch}가 ${h.where}와 만나`
  const body = h.kind === '육합'
    ? '두 자리가 묶입니다.'
    : h.completed
      ? `${h.el ?? ''} 기운이 크게 모입니다. 원국에 둘만 있던 것을 운이 마저 채운 자리입니다.`
      : `${h.el ?? ''} 기운이 더 짙어집니다.`
  return `${head} ${body}`
}

/** 운 지지가 원국 월지·일지와 맺는 144칸 관계 */
function gradeLines(saju: Pill[], unBranch: string, withDesc: boolean): string[] {
  const myMonth = saju.find(p => p.pillar === '월주')?.branch ?? ''
  const myDay = saju.find(p => p.pillar === '일주')?.branch ?? ''
  const out: string[] = []
  const one = (label: string, mine: string) => {
    if (!mine || !unBranch) return
    const r = jijiRelation(mine, unBranch)
    if (!r) return
    out.push(`${label}(${mine}) ${r.grade} ${r.tag}${withDesc ? ` — ${r.desc}` : ''}`)
  }
  one('환경 월지', myMonth)
  one('나 일지', myDay)
  return out
}

// ═══════════════════════════════════════════════════════════════
// ① 원국 — 타고난 그릇
// ═══════════════════════════════════════════════════════════════

export interface WongukContext {
  /** 일간 한 글자 */
  dayStem: string
  /** 신강/신약 등 — yongsinNew 가 준 값을 그대로 옮긴다 */
  strongWeak?: string
  eokbu?: string
  johu?: string
  gyeokguk?: string
  gyeokgukYongsin?: string
  /** 지지 네 글자 */
  branches: string[]
  /** 프롬프트에 나갈 압축 줄 */
  lines: string[]
}

export function buildWongukContext(a: {
  saju: Pill[]
  dayStem: string
  strongWeak?: string | null
  eokbu?: string | null
  johu?: string | null
  gyeokguk?: string | null
  gyeokgukYongsin?: string | null
}): WongukContext {
  const branches = a.saju.map(p => p.branch).filter(b => b && b !== '?')
  const lines: string[] = []
  const el = (b: string) => BRANCH_EL[b] ?? ''
  lines.push(`지지 구성: ${branches.map(b => `${b}(${el(b)})`).join(' · ')}`)
  if (a.strongWeak) lines.push(`일간 강약: ${a.strongWeak}`)
  const y: string[] = []
  if (a.eokbu) y.push(`억부 ${a.eokbu}`)
  if (a.johu) y.push(`조후 ${a.johu}`)
  if (a.gyeokguk) y.push(`격 ${a.gyeokguk}${a.gyeokgukYongsin ? `(바라는 기운 ${a.gyeokgukYongsin})` : ''}`)
  if (y.length) lines.push(`용신 계열: ${y.join(' · ')}`)

  return {
    dayStem: a.dayStem,
    strongWeak: a.strongWeak ?? undefined,
    eokbu: a.eokbu ?? undefined,
    johu: a.johu ?? undefined,
    gyeokguk: a.gyeokguk ?? undefined,
    gyeokgukYongsin: a.gyeokgukYongsin ?? undefined,
    branches,
    lines,
  }
}

// ═══════════════════════════════════════════════════════════════
// ② 대운 — 지금 지나는 10년의 «환경»
// ═══════════════════════════════════════════════════════════════

export interface DaeunContext {
  /** 지금 대운 (없으면 null — 대운수 전이거나 못 구한 것) */
  current: DayunItem | null
  /** 다음 대운 — "다음 10년은 나아질까요" 질문에 쓴다 */
  next: DayunItem | null
  /** 몇 살부터 몇 살까지인가 */
  span?: string
  /** 이 10년이 끝나기까지 남은 해 — 교운기 판정 */
  yearsLeft?: number
  /** 교운기(대운 바뀌는 어름)인가 — 앞뒤 1년 */
  isTurning: boolean
  lines: string[]
}

/**
 * 대운 재료를 만든다. — **환경**을 말하는 자리다.
 *
 *   ⚠️ 여기서 세운을 보지 않는다. 세운은 buildSeyunContext 의 몫이다.
 *   ⚠️ 대운 목록·대운수는 화면(page.tsx)이 /api/dayun 으로 이미 받아 둔 것을 넘겨받는다.
 *      여기서 다시 계산하면 두 벌이 된다. (교훈 BQ)
 */
export function buildDaeunContext(a: {
  saju: Pill[]
  /** 대운 목록 (dayunGanjiList + 대운수로 만든 것) */
  list: DayunItem[]
  /** 만나이 */
  age: number
  /** 학생이면 144칸 해설을 빼고 등급만 준다 (교훈 BF) */
  target: 'student' | 'adult'
}): DaeunContext {
  const sorted = [...a.list].sort((x, y) => x.age - y.age)
  let idx = -1
  for (let i = 0; i < sorted.length; i++) if (a.age >= sorted[i].age) idx = i
  const current = idx >= 0 ? sorted[idx] : null
  const next = idx >= 0 && idx + 1 < sorted.length ? sorted[idx + 1] : (sorted[0] ?? null)

  const lines: string[] = []
  let span: string | undefined
  let yearsLeft: number | undefined
  let isTurning = false

  if (current) {
    const end = next ? next.age - 1 : current.age + 9
    span = `${current.age}~${end}세`
    yearsLeft = end - a.age
    isTurning = yearsLeft <= 1 || a.age - current.age <= 0

    lines.push(
      `지금 대운: ${current.cheongan}${current.jiji} (${span}) · 천간 ${current.ganYukchin} · 지지 ${current.jiYukchin}`,
    )
    // 이 10년이 어떤 «길»인가 — 144칸으로 잰다
    const g = gradeLines(a.saju, current.jiji, a.target === 'adult')
    if (g.length) lines.push(`10년 환경: ${g.join(' / ')}`)
    // 대운이 원국을 치는 沖
    for (const h of unChungInSaju(a.saju as never, current.jiji)) {
      lines.push(unChungLine(h, '지금 대운'))
    }
    // ★대운이 와서 이루는 合 (2026-07-29 신규)
    for (const h of unHapInSaju(a.saju, current.jiji)) {
      lines.push(unHapLine(h, '지금 대운'))
    }
    if (isTurning) {
      lines.push(
        yearsLeft !== undefined && yearsLeft <= 1
          ? `교운기: 이 대운이 ${yearsLeft <= 0 ? '올해' : '내년쯤'} 끝나고 ${next ? `${next.cheongan}${next.jiji}` : '다음'} 대운으로 넘어갑니다. 길이 바뀌는 어름이라 흔들림이 있습니다.`
          : '교운기: 이 대운에 막 들어섰습니다. 새 길에 발을 디딘 어름입니다.',
      )
    }
  } else {
    lines.push('아직 첫 대운 전입니다. 대운수에 이르기 전이라 원국의 기운이 그대로 드러나는 때입니다.')
  }

  if (next) {
    lines.push(`다음 대운: ${next.cheongan}${next.jiji} (${next.age}세부터) · 천간 ${next.ganYukchin} · 지지 ${next.jiYukchin}`)
    const g2 = gradeLines(a.saju, next.jiji, false)
    if (g2.length) lines.push(`다음 10년 환경(등급만): ${g2.join(' / ')}`)
  }

  return { current, next, span, yearsLeft, isTurning, lines }
}

// ═══════════════════════════════════════════════════════════════
// ③ 세운 — 올해의 «날씨»와 타이밍
// ═══════════════════════════════════════════════════════════════

export interface SeyunContext {
  current: SeyunItem | null
  year: number
  /** 세운 지지가 대운 지지와 맺는 관계 (합·충) — 대운 위에 내리는 날씨라서 따로 본다 */
  vsDaeun: string[]
  lines: string[]
}

/**
 * 세운 재료를 만든다. — **올해 일어나는 일**을 말하는 자리다.
 *
 *   교재대로 세운은 ① 원국 ② 대운 두 곳 모두와 견줍니다.
 *     원국과의 합충 = 내 자리가 움직이는가
 *     대운과의 합충 = 지금 걷는 길과 올해 날씨가 맞는가
 *
 *   ⚠️ 여기서 대운의 «성격»을 다시 논하지 않는다. 그것은 buildDaeunContext 가 이미 했다.
 *      여기서는 **세운이 대운과 어떻게 부딪히는지만** 본다. (중복 제거 — 압축의 핵심)
 */
export function buildSeyunContext(a: {
  saju: Pill[]
  /** 올해 세운 한 칸 */
  current: SeyunItem | null
  /** 지금 대운 — 세운과 견주기 위해서만 쓴다 */
  daeun: DayunItem | null
  target: 'student' | 'adult'
}): SeyunContext {
  const lines: string[] = []
  const vsDaeun: string[] = []
  const s = a.current
  if (!s) return { current: null, year: 0, vsDaeun, lines }

  lines.push(
    `${s.year}년(올해) 세운: ${s.cheongan}${s.jiji} · 천간 ${s.ganYukchin} · 지지 ${s.jiYukchin}`,
  )
  // 올해 지지가 내 월지·일지와 어떻게 만나나
  const g = gradeLines(a.saju, s.jiji, a.target === 'adult')
  if (g.length) lines.push(`올해 날씨: ${g.join(' / ')}`)

  // 원국을 치는 沖
  for (const h of unChungInSaju(a.saju as never, s.jiji)) {
    lines.push(unChungLine(h, `${s.year}년(올해) 세운`))
  }
  // ★올해가 이루는 合 (2026-07-29 신규)
  for (const h of unHapInSaju(a.saju, s.jiji)) {
    lines.push(unHapLine(h, `${s.year}년(올해) 세운`))
  }

  // ── 세운 ↔ 대운 — 길과 날씨가 맞는가 ──
  if (a.daeun?.jiji) {
    const d = a.daeun.jiji
    // 沖
    const isChungPair = (x: string, y: string) => {
      const T: Record<string, string> = {
        子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
        卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
      }
      return T[x] === y
    }
    if (isChungPair(d, s.jiji)) {
      vsDaeun.push(`${d}${s.jiji}沖 — 지금 걷는 10년의 길과 올해 날씨가 정면으로 부딪힙니다. 큰 변동이 나는 해로 봅니다.`)
    }
    // 合 — 육합 짝만 (삼합·방합은 원국을 껴야 하므로 위에서 이미 봤다)
    for (const r of YUKHAP) {
      if (r.chars.includes(d) && r.chars.includes(s.jiji) && d !== s.jiji) {
        vsDaeun.push(`${r.key} — 지금 대운과 올해가 묶입니다. 길과 날씨가 한 방향으로 갑니다.`)
      }
    }
    if (!vsDaeun.length) {
      vsDaeun.push('지금 대운과 올해 세운 사이에는 뚜렷한 합충이 없습니다. 큰 틀은 그대로 가는 해입니다.')
    }
    lines.push(...vsDaeun.map(t => `대운과의 견줌: ${t}`))
  }

  return { current: s, year: s.year, vsDaeun, lines }
}

// ═══════════════════════════════════════════════════════════════
// 셋을 묶어 프롬프트 블록으로
// ═══════════════════════════════════════════════════════════════

export interface UnseContext {
  wonguk: WongukContext
  daeun: DaeunContext
  seyun: SeyunContext
  /** 프롬프트에 그대로 넣을 세 덩이 텍스트 */
  block: string
  chars: number
}

/**
 * 세 덩이를 프롬프트 블록 하나로 짠다.
 *
 *   ⚠️ 여기가 **유일한 합류 지점**입니다. 산출은 위에서 이미 따로 끝났습니다.
 *   ⚠️ 원국 블록에서 이미 말한 것을 대운·세운에서 되풀이하지 않습니다.
 *      단순히 saju(1600) + unse(1200) 를 이어 붙이면 오행·일간·육친이 두 번씩 나갑니다.
 */
export function buildUnseContext(a: {
  wonguk: WongukContext
  daeun: DaeunContext
  seyun: SeyunContext
}): UnseContext {
  const sec = (title: string, lines: string[]) =>
    lines.length ? `${title}\n${lines.map(t => `- ${t}`).join('\n')}` : ''

  const block = [
    sec('[① 원국 — 타고난 그릇]', a.wonguk.lines),
    sec('[② 지금 대운 — 앞으로 10년 걷는 길의 상태]', a.daeun.lines),
    sec('[③ 올해 세운 — 그 길 위에 내리는 올해 날씨]', a.seyun.lines),
  ].filter(Boolean).join('\n\n')

  return { ...a, block, chars: block.length }
}
