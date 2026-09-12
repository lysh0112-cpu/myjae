// lib/saju/examLuck/engineCalc.ts
//
// ★2026-09-12 (6부) [대표님 「오늘 합격운 · 취업운 엔진 계산까지 마무리 짓자」] — 엔진 계산 (검사 49)
//   유형 · 비율 셋 · 가장 좋은 달 · 조심할 달 · 당일 수칙 종류를 «엔진이» 정합니다.
//   AI 는 이 값을 «바꾸지 말고» 쉬운 말로 풀어 쓰기만 합니다 (buildExamSeven 의 [엔진이 정한 값]).
//   [왜] AI 가 고르면 같은 사람이 다시 돌릴 때 좋은 달 · 비율이 바뀌고, 근거를 보일 수 없었습니다.
//   ⚠️ 기준 숫자는 tables/engineRules.ts 한 곳에 있습니다 (초안 · 연재쌤 확인 대기). 여기서 숫자를 쓰지 마십시오.
//   ⚠️ 순수 계산입니다 — 같은 입력이면 늘 같은 답 (무작위 · 시계를 쓰지 않음).

import { calcWolunList } from '../dayun'
import { sipsinOfChar } from './sipsin'
import type { Pillar } from './types'
import {
  TYPE_OF, TYPE_CLOSE_GAP, PRACTICE, SUSI, APPLY, MONTH_W, MONTH_SANGGWAN_GYEONGWAN, MONTH_HAKMA, DDAY_TEXT, type Yuk,
} from './tables/engineRules'

const EL: Record<string, string> = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화', 午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수' }
const GEN: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CTRL: Record<string, string> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' }
const yukOfEl = (day: string, el: string): Yuk =>
  el === day ? '비겁' : el === GEN[day] ? '식상' : el === CTRL[day] ? '재성' : GEN[el] === day ? '인성' : '관성'
const GROUP: Record<string, Yuk> = { 정인: '인성', 편인: '인성', 정관: '관성', 편관: '관성', 식신: '식상', 상관: '식상', 정재: '재성', 편재: '재성', 비견: '비겁', 겁재: '비겁' }

const dayStemOf = (saju: Pillar[]) => saju.find(p => p.pillar === '일주')?.stem ?? ''

// ── 1. 유형 ─────────────────────────────────────────────────────
export function judgeType(saju: Pillar[], ohaeng: Record<string, number>) {
  const ds = dayStemOf(saju)
  const yuk: Record<Yuk, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 }
  for (const e of ['목', '화', '토', '금', '수']) yuk[yukOfEl(EL[ds], e)] += ohaeng[e] ?? 0
  //  정인 · 편인은 오행 점수로 가를 수 없어(같은 오행) 드러난 글자 수로 가립니다
  let jeong = 0, pyeon = 0
  for (const p of saju) for (const c of [p.stem, p.branch]) {
    if (!c || c === '?' || c === ds) continue
    const s = sipsinOfChar(ds, c)
    if (s === '정인') jeong++
    if (s === '편인') pyeon++
  }
  const keyOf = (y: Yuk) => (y === '식상' || y === '재성') ? 'practice' : y === '인성' ? (pyeon > jeong ? 'deep' : 'stack') : y === '관성' ? 'rule' : 'self'
  //  같은 점수면 표의 차례(비겁 · 식상 · 재성 · 관성 · 인성)로 — 늘 같은 답
  const sorted = (Object.entries(yuk) as Array<[Yuk, number]>).sort((a, b) => b[1] - a[1])
  const k1 = keyOf(sorted[0][0])
  //  둘째 «다른» 유형 (식상 · 재성은 같은 유형이라 건너뜀)
  const next = sorted.slice(1).find(([y]) => keyOf(y) !== k1)
  const close = !!next && sorted[0][1] - next[1] < TYPE_CLOSE_GAP
  return { key: k1, label: TYPE_OF[k1].label, plain: TYPE_OF[k1].plain, yuk, close, second: close && next ? TYPE_OF[keyOf(next[0])].label : null }
}

// ── 2. 비율 ─────────────────────────────────────────────────────
export function practiceRatio(yuk: Record<Yuk, number>): number {
  const raw = PRACTICE.base + ((yuk.식상 + yuk.재성) - (yuk.인성 + yuk.관성)) * PRACTICE.factor
  return Math.max(PRACTICE.min, Math.min(PRACTICE.max, Math.round(raw / 10) * 10))
}
export function susiRatio(saju: Pillar[]) {
  const cnt: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  for (const p of saju) for (const c of [p.stem, p.branch]) if (c && c !== '?' && EL[c]) cnt[EL[c]]++
  const noGeum = cnt.금 === 0, skew = Math.max(...Object.values(cnt)) >= 4
  const [susi, jeongsi] = noGeum && skew ? SUSI.both : (noGeum || skew) ? SUSI.one : SUSI.none
  return { susi, jeongsi, why: noGeum && skew ? '금이 없고 오행이 한쪽으로 몰림' : noGeum ? '금이 없음' : skew ? '오행이 한쪽으로 몰림' : '금이 있고 오행이 고름' }
}
export function applyRatio(grade: string, target: 'adult' | 'student'): string {
  return APPLY[target][grade] ?? APPLY[target]['보통']
}

// ── 3. 달 ──────────────────────────────────────────────────────
export interface MonthPick { label: string; y: number; m: number; gan: string; ji: string; score: number; notes: string[] }
export function pickMonths(a: { dayStem: string; year: number; month: number; examDate?: string | null; target: 'adult' | 'student'; kind: 'exam' | 'job'; earlyDayun?: boolean }) {
  const W = MONTH_W[a.target === 'student' ? 'student' : a.kind]
  const rows = [...calcWolunList(a.dayStem, a.year).map(w => ({ ...w, y: a.year })), ...calcWolunList(a.dayStem, a.year + 1).map(w => ({ ...w, y: a.year + 1 }))]
  const i0 = Math.max(0, rows.findIndex(r => r.y === a.year && r.month === a.month))
  const months: MonthPick[] = rows.slice(i0, i0 + 12).map(r => {
    const g1 = GROUP[r.ganYukchin], g2 = GROUP[r.jiYukchin]
    let score = (W[g1] ?? 0) + (W[g2] ?? 0)
    const notes: string[] = []
    if (a.target !== 'student' && (r.ganYukchin === '상관' || r.jiYukchin === '상관') && (g1 === '관성' || g2 === '관성')) {
      score += MONTH_SANGGWAN_GYEONGWAN; notes.push('상관이 관성과 함께 — 말실수 · 조급함 (교재 230쪽 상관견관)')
    }
    if (a.target === 'student' && a.earlyDayun && ['편재', '겁재'].some(s => s === r.ganYukchin || s === r.jiYukchin)) {
      score += MONTH_HAKMA; notes.push('1 · 2대운의 편재 · 겁재 — 친구 · 휴대폰 · 멋 부림에 마음이 가는 달 (교재 230쪽 학마운)')
    }
    return { label: `${r.y}년 ${r.month}월`, y: r.y, m: r.month, gan: r.ganYukchin, ji: r.jiYukchin, score, notes }
  })
  //  같은 점수면 시험(발표) 날짜 «이전» 의 달, 그중 이른 달 (교재 195쪽 — 달은 가볍게 · 준비 기간을 먼저)
  const [ey, em] = (a.examDate ?? '').split('-').map(Number)
  const beforeExam = (x: MonthPick) => (ey && em) ? (x.y < ey || (x.y === ey && x.m <= em)) : true
  const order = (x: MonthPick) => months.indexOf(x)
  const pick = (dir: 1 | -1) => [...months].sort((p, q) => dir * (q.score - p.score) || (Number(beforeExam(q)) - Number(beforeExam(p))) || order(p) - order(q))[0]
  return { months, best: pick(1), worst: pick(-1) }
}

// ── 3-1. 시험 날 ────────────────────────────────────────────────
export function dDayKind(dayStem: string, dayGanji: string, isGongmang: boolean): string {
  if (isGongmang) return DDAY_TEXT.gongmang
  const g = sipsinOfChar(dayStem, dayGanji[0] ?? ''), j = sipsinOfChar(dayStem, dayGanji[1] ?? '')
  const gs = [GROUP[g], GROUP[j]]
  if ((g === '상관' || j === '상관') && gs.includes('관성')) return DDAY_TEXT.sanggwan
  if (gs.includes('인성')) return DDAY_TEXT.insung
  if (gs.includes('식상')) return DDAY_TEXT.siksang
  if (gs.includes('관성')) return DDAY_TEXT.gwan
  if (gs.includes('비겁')) return DDAY_TEXT.bigyeop
  return DDAY_TEXT.jae
}

// ── 한데 모은 계획 ───────────────────────────────────────────────
export interface ExamPlan {
  type: ReturnType<typeof judgeType>
  practice: number | null
  susi: ReturnType<typeof susiRatio> | null
  apply: string
  grade: string
  months: ReturnType<typeof pickMonths> | null
  dday: string | null
  target: 'adult' | 'student'
  kind: 'exam' | 'job'
}
export function buildPlan(a: {
  saju: Pillar[]; ohaeng: Record<string, number>; year: number; month: number; examDate?: string | null
  target: 'adult' | 'student'; kind: 'exam' | 'job'; grade: string; dayunOrder: number
  examDayGanji?: string | null; examGongmang?: boolean; highSchoolSenior?: boolean
}): ExamPlan {
  const ds = dayStemOf(a.saju)
  const type = judgeType(a.saju, a.ohaeng)
  return {
    type,
    practice: a.target === 'adult' ? practiceRatio(type.yuk) : null,
    susi: a.target === 'student' && a.highSchoolSenior !== false ? susiRatio(a.saju) : null,
    apply: applyRatio(a.grade, a.target),
    grade: a.grade,
    months: ds && ds !== '?' ? pickMonths({ dayStem: ds, year: a.year, month: a.month, examDate: a.examDate, target: a.target, kind: a.kind, earlyDayun: a.dayunOrder > 0 && a.dayunOrder <= 2 }) : null,
    dday: a.examDayGanji ? dDayKind(ds, a.examDayGanji, !!a.examGongmang) : null,
    target: a.target, kind: a.kind,
  }
}

/** AI 에게 넘기는 글 — 갈래마다 제 몫만 (되풀이 막기) */
export function planBlock(plan: ExamPlan | null | undefined, section: 'flow' | 'strategy' | 'pace' | 'cheer'): string {
  if (!plan || section === 'cheer') return ''
  const head = '[엔진이 정한 값 — ★이 값을 그대로 쓰세요. 바꾸거나 다른 값을 지어내지 마세요. 까닭만 쉬운 말로 풀어 주세요]'
  const L: string[] = []
  if (section === 'flow') {
    L.push(`- 이 분의 유형: «${plan.type.label}» — 쉬운 말로 «${plan.type.plain}»`)
    if (plan.type.close && plan.type.second) L.push(`- 둘째 유형 «${plan.type.second}» 도 거의 같은 크기입니다 — ★두 유형을 함께 말하세요 (한쪽으로 단정하지 마세요)`)
    const y = plan.type.yuk
    L.push(`- 근거(타고난 그릇 · 오행 점수를 육친으로 묶은 것): 인성 ${y.인성} · 관성 ${y.관성} · 식상 ${y.식상} · 재성 ${y.재성} · 비겁 ${y.비겁} (100점 가운데)`)
  }
  if (section === 'strategy') {
    if (plan.practice != null) L.push(`- 시간 배분: 실전 ${plan.practice} : 공부 ${100 - plan.practice}   (면접만 준비하면 «지원서 · 경력 정리 ${plan.practice} : 면접 연습 ${100 - plan.practice}» 로 부르세요)`)
    if (plan.susi) L.push(`- 수시 ${plan.susi.susi} : 정시 ${plan.susi.jeongsi} — 까닭: ${plan.susi.why} (교재 131쪽)`)
    //  ★6부 [대표님] 면접만 보는 분께 «열 곳 응시» 처럼 들리지 않게 — 「지원할 곳 열 곳」 으로
    L.push(`- 지원 비율 (조금 높은 곳 : 맞는 곳 : 쉬운 곳): ${plan.apply} — 올해 ${plan.grade} (${plan.target === 'student' ? '수시 여섯 장' : '지원할 곳 열 곳'} 기준)`)
  }
  if (section === 'pace') {
    if (plan.months) {
      const b = plan.months.best, w = plan.months.worst
      L.push(`- 가장 좋은 달: ${b.label} (천간 ${b.gan} · 지지 ${b.ji})`)
      L.push(`- 조심할 달: ${w.label} (천간 ${w.gan} · 지지 ${w.ji})${w.notes.length ? ' — ' + w.notes.join(' · ') : ''}`)
    }
    if (plan.dday) L.push(`- 시험(면접) 날: ${plan.dday}`)
  }
  return L.length ? `\n${head}\n${L.join('\n')}\n` : ''
}
