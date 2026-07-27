// lib/saju/examLuck/jobChange.ts
//
// 이직·직업 변동 판정 — 교재 190~191쪽 여섯 갈래를 실제로 재는 자리.
// 표는 ./tables/jobChange.ts 에 있다. 여기는 계산만 한다.
//
// ★"좋다/나쁘다" 를 매기지 않는다. "움직임이 있다" 는 신호로만 본다.
//   합격운 규칙(GOOD·BAD)과 결이 다르므로 점수에 섞지 않는다. (연재쌤 확인 항목)

import type { Pillar } from './types'
import { readNatal, isJijiChung, isCheonganChung } from './hapchung'
import { sipsinOfChar } from './sipsin'
import {
  JOB_CHANGE, JEOPMOK_BRANCHES, HONJAP_PAIRS, pickAdvice, OUTCOME_SAY, OUTCOME_JOIN,
  type JobChangeRow, type JobChangeAdvice, type JobChangeOutcome,
} from './tables/jobChange'

/** 받침에 맞는 조사 */
function ga(w: string): string {
  const c = w.charCodeAt(w.length - 1)
  if (c < 0xac00 || c > 0xd7a3) return '이'
  return (c - 0xac00) % 28 === 0 ? '가' : '이'
}

export interface JobChangeHit {
  row: JobChangeRow
  /** 무엇 때문에 걸렸는지 — 화면 근거·통변 재료에 그대로 쓴다 */
  why: string
}

/** 원국에서 보는 것 — 언제든 그대로인 결 */
export function judgeJobChangeNatal(saju: Pillar[]): JobChangeHit[] {
  const n = readNatal(saju)
  const out: JobChangeHit[] = []
  if (!n.dayStem || n.dayStem === '?') return out

  // ① 혼잡 — 관살·인성·식상
  const all: string[] = []
  for (const p of saju) {
    if (p.stem && p.stem !== '?' && p.pillar !== '일주') all.push(sipsinOfChar(n.dayStem, p.stem))
    if (p.branch && p.branch !== '?') all.push(sipsinOfChar(n.dayStem, p.branch))
  }
  // ★혼잡 셋을 각각 본다. 어느 혼잡인지에 따라 무엇이 갈리는지가 다르다.
  //   관살혼잡 — 몸담을 자리(직장)가 갈린다
  //   인성혼잡 — 배움·자격의 갈래가 갈린다
  //   식상혼잡 — 펼칠 재주가 여럿이라 일이 갈린다
  const HONJAP_WHERE: Record<string, string> = {
    관살혼잡: '몸담을 자리가 갈립니다',
    인성혼잡: '배움과 자격의 갈래가 갈립니다',
    식상혼잡: '펼칠 재주가 여럿이라 일이 갈립니다',
  }
  const found = HONJAP_PAIRS.filter(h => h.sipsins.every(s => all.includes(s)))
  for (const f of found) {
    out.push({
      row: JOB_CHANGE.find(r => r.key === 'honjap')!,
      why: `${f.name} — 원국에 ${f.sipsins.join('·')}이 함께 있어 ${HONJAP_WHERE[f.name]}.`,
    })
  }
  return out
}

// ══════════════════════════════════════════════════════════════
//  결론 — 그래서 무슨 일이 생기나
// ══════════════════════════════════════════════════════════════

export interface JobChangeVerdict {
  /** 걸린 결과들 (많은 순) */
  outcomes: JobChangeOutcome[]
  /** 손님이 읽는 결론 한두 줄 */
  lines: string[]
  /** 몇 갈래가 걸렸나 — 많을수록 움직임이 크다 */
  count: number
}

/**
 * ★여섯 갈래가 낸 결과를 모아 결론을 짓는다. (2026-07-27 대표님 지적)
 *
 * 전에는 "걸렸다/아니다" 만 냈다. 그러면 손님은 무엇을 대비할지 알 수 없다.
 * 교재는 갈래마다 다르게 말했다 — 갈등인지, 투잡인지, 옮기는 것인지, 아예 바꾸는 것인지.
 *
 * ⚠️ 겁주지 않는다. "이직수가 있다" 가 아니라 "이런 결이 보인다" 로 전한다.
 */
export function verdictOf(hits: JobChangeHit[]): JobChangeVerdict {
  const tally = new Map<JobChangeOutcome, number>()
  for (const h of hits) for (const o of h.row.outcome) tally.set(o, (tally.get(o) ?? 0) + 1)
  const outcomes = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([o]) => o)
  const lines: string[] = []

  if (!outcomes.length) {
    lines.push('지금은 자리를 흔드는 결이 뚜렷하지 않습니다. 하던 일에 힘을 쌓아 두시면 좋겠습니다.')
    return { outcomes, lines, count: 0 }
  }

  // 원국에서 온 것(늘 그러한 결)과 운에서 온 것(그때만의 결)을 갈라 말한다
  const natalOnes = hits.filter(h => h.row.where === '원국')
  if (natalOnes.length) {
    const has = (o: JobChangeOutcome) => natalOnes.some(h => h.row.outcome.includes(o))
    if (has('직업갈등') && has('투잡')) {
      lines.push('현재 하는 직업에 대해 갈등을 겪으실 수 있거나 투잡을 하는 경우가 있습니다. '
        + '한 가지만 붙들기보다 두 가지를 함께 하시는 분이 많습니다. 흠이 아니라 결입니다.')
    }
  }
  // ★운에서 온 것은 나열하지 않는다. 가장 자주 걸린 하나(많아야 둘)만 말한다.
  //   "옮기게 됩니다. 아예 바꾸게 됩니다." 처럼 늘어놓으면 겁주는 데다 모순처럼 들린다.
  const fromLuck = [...tally.entries()]
    .filter(([o]) => o !== '직업갈등' && o !== '투잡')
    .sort((a, b) => b[1] - a[1])
  if (fromLuck.length) {
    const top = fromLuck.slice(0, 2).map(([o]) => o)
    lines.push(
      top.length === 1
        ? `앞으로 몇 해에는 ${OUTCOME_SAY[top[0]]}. 그런 해가 오면 서두르지 말고 한 번 더 살펴보시면 좋겠습니다.`
        : `앞으로 몇 해에는 ${OUTCOME_JOIN[top[0]]} ${OUTCOME_SAY[top[1]]}. 그런 해가 오면 서두르지 말고 한 번 더 살펴보시면 좋겠습니다.`)
  }
  return { outcomes, lines, count: hits.length }
}

/** 운(대운·세운)에서 보는 것 — 그 해·그 대운에만 걸리는 결 */
export function judgeJobChangeLuck(
  saju: Pillar[],
  luckStem: string,
  luckBranch: string,
  opts: { isDayunChange?: boolean } = {},
): JobChangeHit[] {
  const n = readNatal(saju)
  const out: JobChangeHit[] = []
  if (!n.dayStem || n.dayStem === '?') return out
  const both = [sipsinOfChar(n.dayStem, luckStem), sipsinOfChar(n.dayStem, luckBranch)]
  const push = (key: string, why: string) => {
    const row = JOB_CHANGE.find(r => r.key === key)
    if (row && !out.some(o => o.row.key === key)) out.push({ row, why })
  }

  // ② 정관·편관이 충을 맞는가
  for (const g of n.gwanChars) {
    if (isJijiChung(g, luckBranch) || isCheonganChung(g, luckStem)) {
      push('gwanChung', `원국의 관성 ${g}${ga(g)} ${luckStem}${luckBranch} 운에 충을 맞습니다.`)
      break
    }
  }

  // ③ 비견·겁재가 강해지는 운
  if (both.includes('비견') || both.includes('겁재')) {
    const b = both.filter(s => s === '비견' || s === '겁재').join('·')
    push('bigyeop', `${luckStem}${luckBranch} 운에 ${b}${ga(b)} 듭니다.`)
  }

  // ④ 접목운 — 진술축미. 대운이 바뀌는 때도 여기에 함께 담는다.
  if (JEOPMOK_BRANCHES.includes(luckBranch)) {
    push('jeopmok', `${luckBranch}${ga(luckBranch) === '가' ? '는' : '은'} 진술축미 접목운입니다.`)
  } else if (opts.isDayunChange) {
    push('jeopmok', '대운이 바뀌는 무렵입니다.')
  }

  // ⑤ 원국의 식신이 약한데 편인운
  if (both.includes('편인')) {
    const siksinCount = saju.filter(p =>
      (p.stem && p.stem !== '?' && p.pillar !== '일주' && sipsinOfChar(n.dayStem, p.stem) === '식신')
      || (p.branch && p.branch !== '?' && sipsinOfChar(n.dayStem, p.branch) === '식신')).length
    if (siksinCount > 0 && siksinCount <= 1) {
      push('pyeoninDosik', `원국의 식신이 하나뿐인데 ${luckStem}${luckBranch} 운에 편인이 듭니다.`)
    }
  }

  // ⑥ 월지가 충을 맞거나, 원국 인성이 형충을 당할 때
  //   ⚠️ NatalRefs 에 월지가 없어 여기서 뽑는다. 공용 파일(hapchung.ts)은 안 건드린다.
  //      사주보기·궁합·출산택일이 함께 쓰기 때문이다. (작업지시 12장)
  const monthBranch = saju.find(p => p.pillar === '월주')?.branch ?? ''
  if (monthBranch && monthBranch !== '?' && isJijiChung(monthBranch, luckBranch)) {
    push('woljiChung', `월지 ${monthBranch}${ga(monthBranch)} ${luckBranch} 운에 충을 맞습니다.`)
  } else {
    for (const i of n.inChars) {
      if (isJijiChung(i, luckBranch) || isCheonganChung(i, luckStem)) {
        push('woljiChung', `원국의 인성 ${i}${ga(i)} ${luckStem}${luckBranch} 운에 충을 맞습니다.`)
        break
      }
    }
  }

  return out
}


// ══════════════════════════════════════════════════════════════
//  통변 재료 — 조언을 "언제 쓸지"까지 함께 넘긴다
// ══════════════════════════════════════════════════════════════

/**
 * ★교재가 "무엇보다 중요한 것" 이라 못 박은 세 마디를 통변에 넣는다. (2026-07-27 대표님 지시)
 *
 * [왜 조건을 함께 주나]
 *   셋을 늘 다 붙이면 잔소리가 된다. 그렇다고 AI 에게 맡기면 안 쓰고 지나간다.
 *   그래서 "이 사람에게 맞는 것" 만 골라 주되, 언제 쓰면 좋은지(when)를 함께 준다.
 *   AI 는 고르는 수고 없이 자리만 잡으면 된다.
 *
 * ⚠️ original(교재 원문)은 안 넘긴다. "십중팔구 실패합니다" 같은 말이 그대로 새어 나간다. (교훈 BF)
 */
export function jobChangeReasons(
  natal: JobChangeHit[],
  byYear: Array<{ year: number; hits: JobChangeHit[] }>,
): string[] {
  const out: string[] = []
  if (natal.length) {
    out.push('[원국이 말하는 직업의 결 — 교재 191쪽]')
    for (const h of natal) out.push(`- ${h.why} ${h.row.say}`)
  }
  const moving = byYear.filter(y => y.hits.length)
  if (moving.length) {
    out.push('[움직임이 있는 해 — 교재 191쪽]')
    for (const y of moving) {
      // ★같은 해에 여럿 걸리면 "왜" 는 다 적되 "무슨 뜻인지" 는 한 번만 적는다.
      //   그러지 않으면 같은 문장이 서너 번 겹쳐 재료가 부풀고 AI 가 되풀이해 쓴다.
      const whys = y.hits.map(h => h.why).join(' ')
      const says = [...new Set(y.hits.map(h => h.row.say))]
      out.push(`- ${y.year}년: ${whys}`)
      for (const sy of says) out.push(`    → ${sy}`)
    }
  }

  // ★결론을 재료 맨 앞에 올린다. AI 가 근거만 보고 제 결론을 지어내지 않게.
  const all = [...natal, ...byYear.flatMap(y => y.hits)]
  const v = verdictOf(all)
  if (v.lines.length) {
    out.unshift(...v.lines.map(l => `- ${l}`))
    out.unshift(`[이 사람의 직업 변동 결론 — 이것을 중심으로 쓰세요 (걸린 갈래 ${v.count}, 결과 ${v.outcomes.join('·')})]`)
  }

  const keys = all.map(h => h.row.key)
  const advice: JobChangeAdvice[] = pickAdvice(keys)
  out.push('[★옮기기 전에 반드시 전할 말 — 교재가 "무엇보다 중요한 것" 이라 못 박은 대목]')
  out.push('  이 가운데 자리에 맞는 것을 골라, 시기를 말한 바로 뒤에 자연스럽게 녹이세요.')
  out.push('  ★한 가지는 반드시 담으세요. 세 가지를 모두 늘어놓지는 마세요.')
  for (const a of advice) out.push(`- (${a.key}) ${a.say}   ‹쓰는 자리: ${a.when}›`)
  return out
}
