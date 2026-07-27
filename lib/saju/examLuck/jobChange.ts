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
  JOB_CHANGE, JEOPMOK_BRANCHES, HONJAP_PAIRS, pickAdvice,
  type JobChangeRow, type JobChangeAdvice,
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
  const found = HONJAP_PAIRS.filter(h => h.sipsins.every(s => all.includes(s)))
  if (found.length) {
    out.push({
      row: JOB_CHANGE.find(r => r.key === 'honjap')!,
      why: `${found.map(f => f.name).join('·')} — 원국에 ${found.flatMap(f => f.sipsins).join('·')}이 함께 있습니다.`,
    })
  }
  return out
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

  const keys = [...natal, ...byYear.flatMap(y => y.hits)].map(h => h.row.key)
  const advice: JobChangeAdvice[] = pickAdvice(keys)
  out.push('[★옮기기 전에 반드시 전할 말 — 교재가 "무엇보다 중요한 것" 이라 못 박은 대목]')
  out.push('  이 가운데 자리에 맞는 것을 골라, 시기를 말한 바로 뒤에 자연스럽게 녹이세요.')
  out.push('  ★한 가지는 반드시 담으세요. 세 가지를 모두 늘어놓지는 마세요.')
  for (const a of advice) out.push(`- (${a.key}) ${a.say}   ‹쓰는 자리: ${a.when}›`)
  return out
}
