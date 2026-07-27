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
  JOB_CHANGE, JEOPMOK_BRANCHES, HONJAP_PAIRS,
  type JobChangeRow,
} from './tables/jobChange'

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
      push('gwanChung', `원국의 관성 ${g}이(가) ${luckStem}${luckBranch} 운에 충을 맞습니다.`)
      break
    }
  }

  // ③ 비견·겁재가 강해지는 운
  if (both.includes('비견') || both.includes('겁재')) {
    push('bigyeop', `${luckStem}${luckBranch} 운에 ${both.filter(s => s === '비견' || s === '겁재').join('·')}이 듭니다.`)
  }

  // ④ 접목운 — 진술축미. 대운이 바뀌는 때도 여기에 함께 담는다.
  if (JEOPMOK_BRANCHES.includes(luckBranch)) {
    push('jeopmok', `${luckBranch}은 진술축미 접목운입니다.`)
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
    push('woljiChung', `월지 ${monthBranch}이(가) ${luckBranch} 운에 충을 맞습니다.`)
  } else {
    for (const i of n.inChars) {
      if (isJijiChung(i, luckBranch) || isCheonganChung(i, luckStem)) {
        push('woljiChung', `원국의 인성 ${i}이(가) ${luckStem}${luckBranch} 운에 충을 맞습니다.`)
        break
      }
    }
  }

  return out
}
