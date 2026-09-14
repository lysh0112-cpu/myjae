/**
 *  하락이수 — 괘 풀이 글 «모으는 곳»
 *  2026-09-14 (8부)
 *
 *  ★괘가 들어올 때마다 여기에 «한 줄» 씩 더합니다.
 *     ⇒ 봉투마다 이 파일과 새 괘 파일 «둘만» 바뀝니다. 다른 괘는 안 흔들립니다.
 *
 *  ⚠️ 지금 ★1 / 64 입니다. 나머지는 교재 스캔이 오는 대로 채웁니다.
 *  ⛔ 글이 «없는» 괘를 억지로 채우지 마십시오 — 없으면 «없다» 고 답합니다.
 */

import type { GwaeText, HyoText } from './types'
import { G10_SA } from './g10-sa'

/** 도표 번호 → 괘 글 */
const ALL: Readonly<Record<number, GwaeText>> = {
  10: G10_SA,
}

/** 글이 들어온 괘가 몇 개인가 (64가 되면 다 찬 것입니다) */
export const gwaeTextCount = (): number => Object.keys(ALL).length

/** 도표 번호로 괘 글을 찾습니다. 아직 안 들어왔으면 null. */
export function gwaeTextOf(no: number): GwaeText | null {
  return ALL[no] ?? null
}

/**
 *  괘 번호와 동효로 «그 효의 글» 을 찾습니다.
 *  ⛔ 없으면 ★null 입니다. 빈 글이나 「준비 중」 을 «지어내지» 않습니다.
 */
export function hyoTextOf(no: number, hyo: number): HyoText | null {
  const g = gwaeTextOf(no)
  if (!g) return null
  if (hyo !== 1 && hyo !== 2 && hyo !== 3) return null
  return g.hyo[hyo]
}

export type { GwaeText, HyoText, GwaePart } from './types'
