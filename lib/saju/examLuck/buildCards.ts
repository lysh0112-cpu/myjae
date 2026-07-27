// lib/saju/examLuck/buildCards.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  합격운·취업운 카드 만들기                                        │
// │  판정 부품(examScore·hapchung·rules)이 낸 값을 카드로 옮긴다.       │
// └───────────────────────────────────────────────────────────────┘
//
// ★진로적성 career/ 의 judge*.ts 와 같은 얼개다. 새로 설계하지 않는다. (작업지시 2장)
//
// ⚠️ lines 는 손님이 읽는 글, reasons 는 AI 통변에게만 주는 재료다.
//    reasons 를 화면에 그리지 말 것. (교훈 AV)
//
// ⚠️ 문구는 겁주지 않는다. 합격운은 겁주기 가장 쉬운 자리다. (작업지시 8장)
//      [교재] 세운이 상관정관운이면 매우 불리하며
//      [화면] 상관이 정관을 흔드는 해라 시험 쪽으로는 힘이 가장 덜 실립니다.

import type { ExamCard, ExamInput, ExamTarget, YearLuck } from './types'
import {
  EXAM_BY_SIPSIN, HIGHSCHOOL, HIGHSCHOOL_SRC,
  SUSI_JEONGSI, SUSI_JEONGSI_SRC, STUDY_TREND_SRC, HAKMA, HAKMA_SAY,
  CLOSING, CLOSING_STUDENT, CLOSING_SRC,
} from './tables/rules'
import { dayunTrend } from './examScore'
import { verdictOf, jobChangeReasons, type JobChangeHit } from './jobChange'
import { pickAdvice } from './tables/jobChange'
import type { ExamDayResult } from './examDay'

type DayunLite = { age: number; cheongan: string; jiji: string; ganYukchin: string; jiYukchin: string }

/** 받침에 맞는 조사 — "정재예요" / "편관이에요" */
function ieyo(word: string): string {
  const last = word.charCodeAt(word.length - 1)
  if (last < 0xac00 || last > 0xd7a3) return '이에요'
  return (last - 0xac00) % 28 === 0 ? '예요' : '이에요'
}

const STEM_EL: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_EL: Record<string, string> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}

function elementCount(saju: ExamInput['saju']): Record<string, number> {
  const c: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  for (const p of saju) {
    if (p.stem && p.stem !== '?') c[STEM_EL[p.stem]] = (c[STEM_EL[p.stem]] ?? 0) + 1
    if (p.branch && p.branch !== '?') c[BRANCH_EL[p.branch]] = (c[BRANCH_EL[p.branch]] ?? 0) + 1
  }
  return c
}

// ══════════════════════════════════════════════════════════════
// ① 앞으로 몇 해 — 이 서비스의 얼굴
// ══════════════════════════════════════════════════════════════

export function cardYears(
  years: YearLuck[], target: ExamTarget,
  /** 시험을 보러 왔나, 일자리를 보러 왔나 — 원본 195쪽 */
  purpose?: 'exam' | 'job',
): ExamCard {
  if (!years.length) return { key: 'years', title: '앞으로의 흐름', lines: [], reasons: [] }
  const best = [...years].sort((a, b) => b.score - a.score)[0]

  // ★해마다 같은 말이 되풀이되지 않게 (2026-07-27)
  //   전에는 hits[0] 만 써서 2028·2029·2030 이 모두 "관성과 인성이 서로를 살려 주는 해" 였다.
  //   이미 나온 말은 건너뛰고 그 해에만 있는 것을 고른다. 다 겹치면 등급만 말한다.
  const used = new Set<string>()
  const lines = years.map(y => {
    const fresh = y.hits.find(h => !used.has(h.key))
    if (fresh) used.add(fresh.key)
    const tail = fresh ? ` ${fresh.say}` : ''
    return `${y.year}년 ${y.stem}${y.branch} — ${y.grade}.${tail}`
  })
  // ★교재 195쪽 — 「합격운은 인성운이 더 중요하고, 취업운은 관성운이 더 중요하며」
  if (purpose === 'exam') lines.push('합격운은 인성(배움의 기운)이 더 중요합니다. 배운 것이 몸에 붙는 해에 힘이 실려요.')
  else if (purpose === 'job') lines.push('취업운은 관성(자리의 기운)이 더 중요합니다. 자리가 나를 부르는 해에 힘이 실려요.')

  lines.push(
    target === 'student'
      ? `이 가운데 ${best.year}년에 힘이 가장 실립니다. 다만 사주가 말해 줄 수 있는 건 흐름이고, 결과를 만드는 건 준비한 시간이에요.`
      : `이 가운데 ${best.year}년에 힘이 가장 실립니다. 흐름은 거들 뿐, 결과는 준비한 시간이 만듭니다.`)

  // ★교재 195쪽 맺음말은 카드에 안 넣는다. 화면 맨 아래에 따로 둔다.
  //   카드마다 붙으면 카드가 길어지고, 손님이 카드를 다 읽기 전에 지친다.
  //   화면(exam-luck-result)이 마지막에 한 번만 보여 준다. 재료에는 그대로 들어간다.
  return {
    key: 'years',
    title: '앞으로의 흐름',
    badge: `${years[0].year}~${years[years.length - 1].year}`,
    lines,
    reasons: [
      // ★맺음말은 재료에도 넣고 "반드시 담으라" 고 적는다.
      //   화면에만 두면 통변에서 빠진다. 교재가 이 대목으로 끝맺은 뜻이 사라진다.
      `[★맺음말 — 교재가 이 대목을 끝맺은 말 (${CLOSING_SRC}). 글 마지막에 반드시 담으세요]`,
      ...(target === 'student' ? CLOSING_STUDENT : CLOSING).map(l => `  ${l}`),
      '  ↳ 그대로 옮기지 말고 앞말과 이어지게 풀어 쓰세요. 다만 뜻은 빼지 마세요.',
      '',
    ].concat(years.map(y =>
      `${y.year} ${y.stem}${y.branch} [${y.grade}] 세운점수 ${y.seyunScore ?? y.score}`
      + (y.dayunScore != null ? ` · 대운 ${y.dayunGanji} 점수 ${y.dayunScore} · 섞은점수 ${y.score}` : '')
      + (y.hits.length ? ` — ${y.hits.map(h => h.say).join(' / ')}` : ''))),
    data: { years },
  }
}

// ══════════════════════════════════════════════════════════════
// ② 지금의 흐름 — 대운
// ══════════════════════════════════════════════════════════════

export function cardDayun(
  dayun: DayunLite | null, order: number, target: ExamTarget,
): ExamCard {
  if (!dayun) {
    return { key: 'dayun', title: '지금의 흐름', lines: ['대운을 아직 못 받아왔어요.'], reasons: [] }
  }
  const t = dayunTrend(dayun)
  // ★상승 십신과 하락 십신이 한 대운에 함께 들 수 있다.
  //   dayunTrend 는 상승을 먼저 보므로 '상승' 을 주는데, 화면에서는 그 사실을 밝힌다.
  const both = t.sipsins.some(x => (['정인', '편인', '식신', '상관'] as string[]).includes(x))
    && t.sipsins.some(x => (['비견', '겁재', '정재', '편재'] as string[]).includes(x))
  const lines: string[] = [
    `지금은 ${dayun.cheongan}${dayun.jiji} 대운입니다(${dayun.age}세부터). `
    + `천간은 ${dayun.ganYukchin}, 지지는 ${dayun.jiYukchin}${ieyo(dayun.jiYukchin)}.`,
  ]
  if (target === 'student') {
    if (both) lines.push('학업으로 보면 밀어 주는 기운과 흩트리는 기운이 함께 듭니다. 오르내림이 있는 때예요.')
    else if (t.trend === '상승') lines.push('학업으로 보면 올라가는 흐름입니다. 배운 것이 쌓이는 때예요.')
    else if (t.trend === '하락') lines.push('학업으로 보면 힘이 덜 실리는 흐름입니다. 이 무렵은 넓히기보다 다지는 때로 두면 좋습니다.')
    else if (t.trend === '보통') lines.push('학업으로 보면 담담한 흐름입니다. 크게 밀어 주지도, 붙잡지도 않아요.')
    // ★1·2대운 특칙 — 교재 230쪽
    if (order <= 2 && [dayun.ganYukchin, dayun.jiYukchin].some(s => (HAKMA as string[]).includes(s))) {
      lines.push(HAKMA_SAY)
    }
  } else {
    if (both) lines.push('밀어 주는 기운과 흩트리는 기운이 함께 듭니다. 오르내림이 있는 때예요.')
    else if (t.trend === '상승') lines.push('배우고 자격을 갖추는 쪽으로 힘이 실리는 흐름입니다.')
    else if (t.trend === '하락') lines.push('시험 쪽으로는 힘이 덜 실리는 흐름입니다. 자리를 지키며 다지는 편이 낫습니다.')
    else if (t.trend === '보통') lines.push('담담한 흐름입니다. 크게 밀어 주지도, 붙잡지도 않아요.')
  }
  return {
    key: 'dayun',
    title: '지금의 흐름',
    badge: `${dayun.cheongan}${dayun.jiji} 대운`,
    lines,
    reasons: [
      `현재 대운 ${dayun.cheongan}${dayun.jiji} (${dayun.age}세부터, ${order}번째 대운)`,
      `천간 ${dayun.ganYukchin} · 지지 ${dayun.jiYukchin} · 학업 흐름 ${t.trend} (${STUDY_TREND_SRC})`,
      order <= 2 ? '★1·2대운은 용신을 보지 않고 육친만 본다 (교재 230쪽)' : '',
    ].filter(Boolean),
    data: { dayun, trend: t.trend, order },
  }
}

// ══════════════════════════════════════════════════════════════
// ③ 어떤 시험에 힘이 실리나
// ══════════════════════════════════════════════════════════════

export function cardExamKind(years: YearLuck[]): ExamCard {
  const sipsins = new Set<string>()
  for (const y of years) { if (y.ganSipsin) sipsins.add(y.ganSipsin); if (y.jiSipsin) sipsins.add(y.jiSipsin) }
  const hit = EXAM_BY_SIPSIN.filter(e => sipsins.has(e.sipsin))
  const lines = hit.length
    ? hit.map(e => `${e.sipsin}의 기운이 드는 해에는 ${e.exams.join(' · ')} 쪽으로 힘이 실립니다.`)
    : ['앞으로 몇 해에는 특정 시험으로 힘이 쏠리는 결이 뚜렷하지 않아요. 준비하시는 쪽에 그대로 힘을 쓰시면 됩니다.']
  return {
    key: 'examkind', title: '어떤 시험에 힘이 실리나', lines,
    reasons: hit.map(e => `${e.sipsin} → ${e.exams.join('·')} (${e.src})`),
    data: { hit },
  }
}

// ══════════════════════════════════════════════════════════════
// ④ 학생만 — 고교 · 수시/정시
// ══════════════════════════════════════════════════════════════

export function cardHighschool(input: ExamInput): ExamCard {
  const el = elementCount(input.saju)
  const vals = Object.values(el)
  const max = Math.max(...vals)
  const balanced = max <= 3 && vals.filter(v => v === 0).length === 0
  const lines = balanced
    ? ['오행이 고루 어울린 편이라, 특목고·자사고처럼 밀도 높은 곳에서도 버틸 힘이 있습니다.']
    : ['오행이 한쪽으로 조금 몰린 편이라, 아이 결에 맞는 곳을 고르는 편이 더 낫습니다. 학교 이름보다 아이가 숨 쉴 수 있는 자리가 중요해요.']
  lines.push('이건 참고일 뿐이에요. 아이 성적과 형편은 곁에서 보시는 분이 가장 잘 아십니다.')
  return {
    key: 'highschool', title: '고교 선택', lines,
    reasons: [
      `오행 개수 ${Object.entries(el).map(([k, v]) => `${k}${v}`).join(' ')}`,
      `특목고: ${HIGHSCHOOL.특목고}`, `일반고: ${HIGHSCHOOL.일반고}`, HIGHSCHOOL_SRC,
    ],
    data: { el, balanced },
  }
}

export function cardSusiJeongsi(input: ExamInput): ExamCard {
  const el = elementCount(input.saju)
  const noGeum = (el.금 ?? 0) === 0
  const skew = Math.max(...Object.values(el)) >= 4
  const susi = noGeum || skew
  const lines = susi
    ? [`${noGeum ? '금(金) 기운이 없어' : '오행이 한쪽으로 몰려'} 마무리로 몰아붙이는 힘이 덜한 편입니다. 수시처럼 쌓아 온 것을 보여 주는 길이 더 맞습니다.`]
    : ['오행이 고루 어울리고 금(金)이 받쳐 줍니다. 정시처럼 한 번에 마무리하는 길도 해볼 만합니다.']
  lines.push('둘 중 하나만 고르라는 뜻은 아니에요. 어느 쪽이 조금 더 수월한지를 말씀드리는 것입니다.')
  return {
    key: 'susi', title: '수시와 정시', lines,
    reasons: [
      `금(金) ${el.금}자 · 가장 많은 오행 ${Math.max(...Object.values(el))}자`,
      `수시: ${SUSI_JEONGSI.수시}`, `정시: ${SUSI_JEONGSI.정시}`, SUSI_JEONGSI_SRC,
    ],
    data: { el, susi },
  }
}

// ══════════════════════════════════════════════════════════════
// ⑤ 이직과 직업 변동 (교재 190~191쪽)
// ══════════════════════════════════════════════════════════════

export function cardJobChange(
  natal: JobChangeHit[],
  byYear: Array<{ year: number; hits: JobChangeHit[] }>,
): ExamCard {
  const all = [...natal, ...byYear.flatMap(y => y.hits)]
  const v = verdictOf(all)
  const moving = byYear.filter(y => y.hits.length).map(y => y.year)
  const lines = [...v.lines]
  if (moving.length) {
    lines.push(`앞으로 몇 해 가운데 ${moving.join('·')}년에 그런 결이 보입니다.`)
  }
  // ★교재가 "무엇보다 중요한 것" 이라 못 박은 대목 — 반드시 붙는다
  for (const a of pickAdvice(all.map(h => h.row.key))) lines.push(a.say)
  return {
    key: 'jobchange', title: '이직과 직업 변동',
    badge: v.count ? `${v.outcomes[0]}` : undefined,
    lines,
    reasons: jobChangeReasons(natal, byYear),
    data: { verdict: v, moving },
  }
}

// ══════════════════════════════════════════════════════════════
// ⑥ 시험 날짜를 짚어 보면 (교재 195쪽)
// ══════════════════════════════════════════════════════════════

export function cardExamDay(r: ExamDayResult | null): ExamCard | null {
  if (!r) return null
  return {
    key: 'examday', title: '시험 날짜를 짚어 보면',
    badge: r.isGongmang ? '공망일' : undefined,
    lines: r.lines, reasons: r.reasons,
    data: { isGongmang: r.isGongmang },
  }
}

// ══════════════════════════════════════════════════════════════
//  카드를 한 번에 만든다 — 화면은 이것만 부르면 된다
// ══════════════════════════════════════════════════════════════

export interface BuildAllArgs {
  input: ExamInput
  years: YearLuck[]
  dayun: DayunLite | null
  order: number
  natal: JobChangeHit[]
  byYear: Array<{ year: number; hits: JobChangeHit[] }>
  examDay: ExamDayResult | null
  purpose?: 'exam' | 'job'
}

export function buildAllCards(a: BuildAllArgs): ExamCard[] {
  const t = a.input.target ?? 'adult'
  const out: ExamCard[] = [
    cardYears(a.years, t, a.purpose),
    cardDayun(a.dayun, a.order, t),
    cardExamKind(a.years),
  ]
  const day = cardExamDay(a.examDay)
  if (day) out.push(day)
  // ★학생에게만 — 고교·수시정시 (교재 130~131쪽)
  if (t === 'student') {
    out.push(cardHighschool(a.input))
    out.push(cardSusiJeongsi(a.input))
  } else {
    // ★성인에게만 — 이직·직업 변동 (교재 190~191쪽)
    out.push(cardJobChange(a.natal, a.byYear))
  }
  return out
}
