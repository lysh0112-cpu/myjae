// lib/saju/integratedQuestions.ts
//
// ┌──────────────────────────────────────────────────────────────────┐
// │  통합 리포트가 손님에게 보여 줄 질문 세트                            │
// │    사주 질문 전부  +  운세 질문 중 「시기」 갈래만                    │
// │  2026-07-29                                                       │
// └──────────────────────────────────────────────────────────────────┘
//
// ★2026-07-29 대표님 확정
//   "기존 사주 질문(19갈래)의 구체적인 본질 분석 옵션들을 기본 베이스로 유지하되,
//    운세 영역의 핵심인 '시기/타이밍(언제 일어나는가)' 관련 질문 갈래만 추가한다."
//
// ── 왜 골라 담는가 ──────────────────────────────────────────────────
//   운세 질문 27개 가운데 「재물」·「직업」·「건강」·「관계」 같은 갈래는
//   사주 질문에 이미 같은 이름으로 있습니다. 그대로 합치면 손님이
//   비슷한 질문을 두 번 보게 됩니다.
//   반면 「인생 흐름」·「전환기」·「타이밍」은 사주 질문에 없는 자리입니다.
//   시기를 묻는 것은 원국만으로는 답할 수 없고 대운·세운이 있어야 답이 됩니다.
//   → 겹치지 않는 이 셋만 가져옵니다.
//
// ── ⚠️ 월운 질문 둘을 뺐습니다 ──────────────────────────────────────
//   ★2026-07-29 대표님 확정 — 월운·일운은 화면 표로만, 리포트는 대운+세운까지.
//   그런데 운세 질문의 「타이밍」 갈래에 월운짜리 둘이 섞여 있습니다.
//       u0xx  올해 중 일이 가장 잘 풀리는 달은 언제인가요?   (kind: wolun)
//       u0xx  계약·면접·이사는 몇 월에 하면 좋을까요?        (kind: wolun)
//   재료에 월운이 없는데 질문만 띄우면 **AI 가 없는 근거로 달을 지어냅니다.** (교훈 BF)
//   → kind==='wolun' 은 담지 않습니다.
//   ⚠️ 나중에 월운을 리포트에 넣기로 하시면 아래 EXCLUDE_KINDS 에서 'wolun' 만 빼면
//      이 둘이 자동으로 살아납니다.

import { QUESTIONS, type SajuQuestion } from './questions'
import { UNSE_QUESTIONS, type UnseQuestion } from './unseQuestions'

/** 사주 질문에 없어 가져오는 「시기」 갈래 */
export const TIME_CATEGORIES = ['인생 흐름', '전환기', '타이밍'] as const

/** 재료가 없어 담지 않는 운 갈래 */
const EXCLUDE_KINDS: ReadonlyArray<UnseQuestion['kind']> = ['wolun']

/** 통합 리포트에 쓸 「시기」 질문 — 대운 6 + 세운 1 */
export const TIME_QUESTIONS: UnseQuestion[] = UNSE_QUESTIONS.filter(
  q => (TIME_CATEGORIES as readonly string[]).includes(q.category)
    && !EXCLUDE_KINDS.includes(q.kind)
    && q.enabled !== false,
)

/**
 * 통합 리포트 질문 전체.
 *   사주 질문이 먼저, 「시기」가 뒤. 손님은 본질을 먼저 고르고 시기를 덧붙입니다.
 */
export const INTEGRATED_QUESTIONS: SajuQuestion[] = [
  ...QUESTIONS,
  ...TIME_QUESTIONS,
]

/**
 * 「시기」 갈래인가 — 재료를 고를 때 쓴다.
 *   이 갈래가 하나라도 골라졌으면 대운·세운 재료를 넉넉히 실어야 합니다.
 */
export function hasTimeQuestion(categories?: string[]): boolean {
  if (!categories?.length) return false
  return categories.some(c => (TIME_CATEGORIES as readonly string[]).includes(c))
}

/**
 * 화면에 뿌릴 갈래 묶음.
 *   ⚠️ 「시기」 셋을 맨 뒤로 보냅니다. 사주 갈래 사이에 끼면 결이 달라 눈에 안 들어옵니다.
 */
export function groupIntegratedByCategory(
  list: SajuQuestion[] = INTEGRATED_QUESTIONS,
): Array<{ category: string; items: SajuQuestion[] }> {
  const map = new Map<string, SajuQuestion[]>()
  for (const q of list) {
    if (q.enabled === false) continue
    const arr = map.get(q.category) ?? []
    arr.push(q)
    map.set(q.category, arr)
  }
  const time = TIME_CATEGORIES as readonly string[]
  const entries = [...map.entries()].map(([category, items]) => ({ category, items }))
  return [
    ...entries.filter(e => !time.includes(e.category)),
    ...entries.filter(e => time.includes(e.category)),
  ]
}
