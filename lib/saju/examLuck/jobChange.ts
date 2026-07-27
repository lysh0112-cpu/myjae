// lib/saju/examLuck/jobChange.ts
//
// 이직·직업 변동 판정 — 교재 190~191쪽 여섯 갈래를 실제로 재는 자리.
// 표는 ./tables/jobChange.ts 에 있다. 여기는 계산만 한다.
//
// ★"좋다/나쁘다" 를 매기지 않는다. "움직임이 있다" 는 신호로만 본다.
//   합격운 규칙(GOOD·BAD)과 결이 다르므로 점수에 섞지 않는다. (연재쌤 확인 항목)

import type { Pillar } from './types'
import { readNatal, isJijiChung, isCheonganChung, makesSamhyeong } from './hapchung'
import { sipsinOfChar } from './sipsin'
import {
  JOB_CHANGE, JEOPMOK_BRANCHES, HONJAP_PAIRS, pickAdvice, OUTCOME_SAY, OUTCOME_JOIN,
  type JobChangeRow, type JobChangeAdvice, type JobChangeOutcome,
} from './tables/jobChange'

/** 일간별 관성 오행 — 나를 극하는 오행 */
const GWAN_EL: Record<string, string> = {
  甲: '금', 乙: '금',   // 목 일간 → 금이 관성
  丙: '수', 丁: '수',   // 화 일간 → 수
  戊: '목', 己: '목',   // 토 일간 → 목
  庚: '화', 辛: '화',   // 금 일간 → 화  ★교재가 말한 "화 관성" 은 금 일간을 뜻할 수 있다
  壬: '토', 癸: '토',   // 수 일간 → 토
}

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
  // ★관성 과다 — 교재 191쪽 둘째 뒷부분 "화(火) 관성이 과다한 경우"
  //   원국의 성질이라 여기서 본다. 해마다 되풀이될 말이 아니다.
  //   ⚠️ 일간마다 관성 오행이 다른데 교재가 왜 火 로 못 박았는지 갈린다.
  //      금(金) 일간이면 관성이 화(火)이므로 그 경우를 뜻할 수 있다.
  //      스캔에 손글씨로 "관살" 이 덧적혀 있어 관살 과다를 뜻할 수도 있다. (CHECK ①)
  {
    const gwanEl = GWAN_EL[n.dayStem]
    const gwanCount = all.filter(x => x === '정관' || x === '편관').length
    if (gwanEl && gwanCount >= 3) {
      out.push({
        row: JOB_CHANGE.find(r => r.key === 'gwanChung')!,
        why: gwanEl === '화'
          ? `관성이 화(火)인데 ${gwanCount}자로 과다합니다. 교재가 짚은 그 자리입니다.`
          : `관성(${gwanEl})이 ${gwanCount}자로 과다합니다.`
            + ' (교재는 화(火) 관성이라 적었는데 이 사주의 관성은 다른 오행입니다.)',
      })
    }
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

  // ══════════════════════════════════════════════════════════
  // ② 교재 191쪽 둘째 — "대운이나 세운에서 정관이나 편관이 충(沖)을 하거나
  //                     화(火) 관성이 과다한 경우"
  // ══════════════════════════════════════════════════════════
  //
  // ★두 가지를 다 본다. 전에는 앞의 것(충)만 보고 뒤의 것(화 관성 과다)이 빠져 있었다.
  //
  //   (가) 관성이 충을 맞는가
  //        · 원국의 관성을 운이 충하는 경우
  //        · 운에서 온 관성을 원국이 충하는 경우  ← 이것도 "정관이나 편관이 충을 한다"에 든다
  //   (나) 화(火) 관성이 과다한가
  //        ⚠️ 일간마다 관성 오행이 다른데 교재가 왜 火 로 못 박았는지 갈린다.
  //           스캔에 손글씨로 "관살" 이 덧적혀 있어 관살 과다를 뜻할 수도 있다.
  //           → 둘 다 재되, 어느 쪽인지 밝혀 준다. (JOB_CHANGE_CHECK ①)
  {
    // (가-1) 원국 관성 ↔ 운
    let hit = ''
    for (const g of n.gwanChars) {
      if (isJijiChung(g, luckBranch) || isCheonganChung(g, luckStem)) {
        hit = `원국의 관성 ${g}${ga(g)} ${luckStem}${luckBranch} 운에 충을 맞습니다.`
        break
      }
    }
    // (가-2) 운에서 온 관성 ↔ 원국
    if (!hit) {
      for (const ch of [luckStem, luckBranch]) {
        const sp = sipsinOfChar(n.dayStem, ch)
        if (sp !== '정관' && sp !== '편관') continue
        const clash = [...n.branches, ...saju.map(x => x.stem)]
          .find(o => !!o && o !== '?' && (isJijiChung(o, ch) || isCheonganChung(o, ch)))
        if (clash) {
          const wa = (clash.charCodeAt(0) - 0xac00) % 28 === 0 ? '와' : '과'
          hit = `운에서 온 관성 ${ch}${ga(ch)} 원국의 ${clash}${wa} 충합니다.`
          break
        }
      }
    }
    if (hit) push('gwanChung', hit)

    // (나) 관성 과다는 원국의 성질이라 해마다 되풀이된다.
    //      → judgeJobChangeNatal 로 옮겼다. 여기서는 안 본다.
    //         (매년 같은 말이 나오면 "그해 무슨 일이 있나" 를 가릴 수 없다)
  }

  // ══════════════════════════════════════════════════════════
  // ③ 교재 191쪽 셋째 — "비견 겁재가 강해지는 운에 직장에 불만이 생기거나
  //                     친구 선배 동료 지인의 스카우트 제의나 동업 제안으로 이직"
  // ══════════════════════════════════════════════════════════
  //
  // ★"강해지는" 을 실제로 잰다. 전에는 운에 비겁이 하나만 들어도 잡았다.
  //   원국에 이미 비겁이 많은 사람은 한 자만 더 들어도 확 기울고,
  //   비겁이 없던 사람은 한 자로는 "강해졌다" 고 하기 어렵다.
  {
    const inLuck = both.filter(x => x === '비견' || x === '겁재')
    if (inLuck.length) {
      // 원국 비겁 + 운 비겁 = 그해의 비겁 세기
      const total = n.bigyeopChars.length + inLuck.length
      // 천간·지지 둘 다 비겁이면 그 해는 확실히 기운다
      const strong = inLuck.length >= 2 || total >= 3
      if (strong) {
        push('bigyeop',
          `${luckStem}${luckBranch} 운에 ${inLuck.join('·')}${ga(inLuck.join('·'))} 듭니다`
          + `(원국 비겁 ${n.bigyeopChars.length}자와 더해 ${total}자).`)
      }
    }
  }

  // ══════════════════════════════════════════════════════════
  // ④ 교재 191쪽 넷째 — "대운이 바뀔 때나 진술축미 접목운에 직업 변동수"
  // ══════════════════════════════════════════════════════════
  //
  // ★교재는 둘을 "이거나" 로 이었다. 둘 다 걸리면 그만큼 세다.
  {
    const isJeopmok = JEOPMOK_BRANCHES.includes(luckBranch)
    if (isJeopmok && opts.isDayunChange) {
      push('jeopmok', `대운이 바뀌는 무렵인데 ${luckBranch}${ga(luckBranch) === '가' ? '는' : '은'} 진술축미 접목운이기도 합니다.`)
    } else if (isJeopmok) {
      push('jeopmok', `${luckBranch}${ga(luckBranch) === '가' ? '는' : '은'} 진술축미 접목운입니다.`)
    } else if (opts.isDayunChange) {
      push('jeopmok', '대운이 바뀌는 무렵입니다.')
    }
    // ⚠️ 辰戌丑未 는 열두 지지 중 넷이라 여덟 해를 보면 거의 반드시 걸린다.
    //    그래서 "몇 해에 걸렸나" 보다 "어느 해인가" 가 값어치다.
    //    화면에서는 걸린 해를 짚어 주고, 여러 해가 걸렸다고 겁주지 않는다.
  }

  // ══════════════════════════════════════════════════════════
  // ⑤ 교재 191쪽 다섯째 — "사주 원국에 약한 식신이 도식(倒食)되는 편인운에 이직"
  // ══════════════════════════════════════════════════════════
  //
  // ★도식(倒食) — 편인이 식신을 뒤엎는 것. 밥그릇을 엎는다는 뜻이다.
  //   "약한 식신" 을 재려면 개수를 제대로 세야 한다.
  //   전에는 p.filter 로 기둥 수를 세어, 한 기둥에 식신이 둘 있어도 하나로 셌다.
  if (both.includes('편인')) {
    let siksin = 0
    for (const p of saju) {
      for (const ch of [p.stem, p.branch]) {
        if (!ch || ch === '?') continue
        if (p.pillar === '일주' && ch === p.stem) continue   // 일간은 나 자신이라 안 센다
        if (sipsinOfChar(n.dayStem, ch) === '식신') siksin++
      }
    }
    // 식신이 아예 없으면 엎을 밥그릇이 없다. 하나뿐일 때가 가장 약하다.
    if (siksin === 1) {
      push('pyeoninDosik',
        `원국의 식신이 하나뿐인데 ${luckStem}${luckBranch} 운에 편인이 들어 도식(倒食)합니다.`)
    } else if (siksin === 2) {
      push('pyeoninDosik',
        `원국의 식신이 둘인데 ${luckStem}${luckBranch} 운에 편인이 듭니다. 하나뿐일 때보다는 덜 흔들립니다.`)
    }
  }

  // ⑥ 월지가 충을 맞거나, 원국 인성이 형충을 당할 때
  //   ⚠️ NatalRefs 에 월지가 없어 여기서 뽑는다. 공용 파일(hapchung.ts)은 안 건드린다.
  //      사주보기·궁합·출산택일이 함께 쓰기 때문이다. (작업지시 12장)
  //   ★교재는 "월지가 충할 때" 와 "인성이 형충당할 때" 를 나란히 두었다.
  //     전에는 else 로 묶어 앞의 것이 걸리면 뒤를 안 봤다. 둘 다 본다.
  const monthBranch = saju.find(p => p.pillar === '월주')?.branch ?? ''
  const why6: string[] = []
  if (monthBranch && monthBranch !== '?' && isJijiChung(monthBranch, luckBranch)) {
    why6.push(`월지 ${monthBranch}${ga(monthBranch)} ${luckBranch} 운에 충을 맞습니다.`)
  }
  for (const i of n.inChars) {
    if (isJijiChung(i, luckBranch) || isCheonganChung(i, luckStem)) {
      why6.push(`원국의 인성 ${i}${ga(i)} ${luckStem}${luckBranch} 운에 충을 맞습니다.`)
      break
    }
    // 형(刑) — 교재가 "형충" 이라 했으므로 삼형·자형도 본다
    if (makesSamhyeong([...n.branches, i], luckBranch)) {
      why6.push(`원국의 인성 ${i}${ga(i)} ${luckBranch} 운과 형(刑)을 이룹니다.`)
      break
    }
  }
  if (why6.length) push('woljiChung', why6.join(' '))

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
