// lib/saju/checkSpecialAvoidRules.ts
// 특수 피함 규칙 통합 검사 — 숫자 · 간지 · 동자이음 · 서열 (+ 여섯 분류 자리)
//
// ══════════════════════════════════════════════════════════════════
//  ⚠️ 지시서 원안에서 «고친 세 자리» 를 적어 둡니다.
//
//   ① `hasPenalty: false` 인데 `penaltyScore: 5` 였습니다
//      → 두 값이 어긋나면 부르는 쪽이 어느 것을 믿을지 모릅니다.
//        `hasPenalty` 를 지우고 `penalty > 0` 으로 판단하게 했습니다.
//
//   ② 첫 번째로 걸린 것에서 `return` 했습니다
//      → 한 글자가 둘에 걸릴 수 있습니다. 실제로 겹칩니다 —
//          壹·貳·參 은 «숫자» 이면서 «서열» 입니다
//        원안대로면 서열만 잡히고 숫자를 놓칩니다.
//        → 걸린 것을 «전부» 모으고 감점을 합칩니다.
//
//   ③ 서열 검사가 «죽어 있습니다»
//      → `context?.birthOrder` 가 있어야 도는데, 이름 풀이 폼이 «몇째» 를 안 묻습니다.
//        지워도 되지만 남겨 두고 «지금은 안 걸린다» 를 명시했습니다.
//        폼에 필드가 생기면 그때 살아납니다.
// ══════════════════════════════════════════════════════════════════

import {
  MULTI_SOUND_HANJA_MAP, BIRTH_ORDER_HANJA_MAP,
  NUMBER_HANJA_SET, GANJI_HANJA_SET,
  LONELY_COLD_SET, SACRED_OVERLOAD_SET, ENERGY_DECLINE_SET,
  SEASON_CHANGE_SET, ANIMAL_INSECT_SET, BODY_PART_SET,
  PENALTY_MULTI_SOUND, PENALTY_NUMBER, PENALTY_GANJI,
  PENALTY_ORDER_MISMATCH, PENALTY_CATEGORY,
  SPECIAL_PENALTY_CAP, SPECIAL_RULES_ENABLED,
} from './specialAvoidData'
import { GENTLE_AVOID_REASONS, type GentleAvoidReason, type AvoidReasonKey } from './gentleAvoidReasons'
import { cleanHanja } from './ohaeng'

export interface SpecialAvoidHit {
  key: AvoidReasonKey
  /** UI 배지 — 동자이음은 읽는 음을 함께 적습니다 (예: 「다음자(낙/락/악/요)」) */
  badgeLabel: string
  penalty: number
  reason: GentleAvoidReason
}

export interface SpecialAvoidResult {
  /** 걸린 것 «전부». 없으면 빈 배열 */
  hits: SpecialAvoidHit[]
  /** 합친 감점 (상한 적용). 0 이면 걸린 것이 없습니다 */
  penalty: number
  /** 화면 배지로 쓸 «대표» 한 줄. 없으면 null — 가장 무거운 것을 고릅니다 */
  badgeLabel: string | null
  /** 감정서에 실을 해설들 */
  descriptions: string[]
}

export interface UserContext {
  /** 1:첫째 2:둘째 3:셋째 4:막내. ⚠️ 지금은 폼이 안 묻습니다 */
  birthOrder?: number
}

const EMPTY: SpecialAvoidResult = { hits: [], penalty: 0, badgeLabel: null, descriptions: [] }

/** 여섯 분류 — 자료가 비어 있으면 자동으로 건너뜁니다 */
const CATEGORY_SETS: Array<[AvoidReasonKey, Set<string>]> = [
  ['LONELY_COLD', LONELY_COLD_SET],
  ['SACRED_OVERLOAD', SACRED_OVERLOAD_SET],
  ['ENERGY_DECLINE', ENERGY_DECLINE_SET],
  ['SEASON_CHANGE', SEASON_CHANGE_SET],
  ['ANIMAL_INSECT', ANIMAL_INSECT_SET],
  ['BODY_PART', BODY_PART_SET],
]

/**
 * ★특수 피함 규칙을 한 번에 검사합니다.
 *
 * @param hanjaChar 한자 한 글자 (공백이 붙어 있어도 됩니다 — 안에서 정제합니다)
 * @param context   손님 정보. birthOrder 가 없으면 서열 검사를 «건너뜁니다»
 *
 * ⚠️ 이 함수는 «막지» 않습니다. 감점과 배지만 돌려줍니다.
 *    막고 말고는 hanjaRow.listPolicy 가 정합니다.
 */
export function checkSpecialAvoidRules(
  hanjaChar: string,
  context?: UserContext,
): SpecialAvoidResult {
  if (!SPECIAL_RULES_ENABLED) return EMPTY

  const ch = cleanHanja(hanjaChar)
  if (!ch) return EMPTY

  const hits: SpecialAvoidHit[] = []

  // ① 동자이음 — 감점이 아주 작습니다. «안내» 에 가깝습니다
  const sounds = MULTI_SOUND_HANJA_MAP[ch]
  if (sounds && sounds.length > 1) {
    hits.push({
      key: 'MULTI_SOUND',
      badgeLabel: `다음자(${sounds.join('/')})`,
      penalty: PENALTY_MULTI_SOUND,
      reason: GENTLE_AVOID_REASONS.MULTI_SOUND,
    })
  }

  // ② 자녀 서열 — ⚠️ birthOrder 가 있을 때만 돕니다 (지금은 폼이 안 묻습니다)
  const targetOrder = BIRTH_ORDER_HANJA_MAP[ch]
  if (targetOrder !== undefined && typeof context?.birthOrder === 'number' && context.birthOrder > 0) {
    if (targetOrder !== context.birthOrder) {
      hits.push({
        key: 'ORDER_MISMATCH',
        badgeLabel: GENTLE_AVOID_REASONS.ORDER_MISMATCH.badgeLabel,
        penalty: PENALTY_ORDER_MISMATCH,
        reason: GENTLE_AVOID_REASONS.ORDER_MISMATCH,
      })
    }
  }

  // ③ 숫자   ★return 하지 않습니다 — 아래 간지도 함께 봅니다
  if (NUMBER_HANJA_SET.has(ch)) {
    hits.push({
      key: 'NUMBER_CHAR',
      badgeLabel: GENTLE_AVOID_REASONS.NUMBER_CHAR.badgeLabel,
      penalty: PENALTY_NUMBER,
      reason: GENTLE_AVOID_REASONS.NUMBER_CHAR,
    })
  }

  // ④ 간지
  if (GANJI_HANJA_SET.has(ch)) {
    hits.push({
      key: 'GANJI_CHAR',
      badgeLabel: GENTLE_AVOID_REASONS.GANJI_CHAR.badgeLabel,
      penalty: PENALTY_GANJI,
      reason: GENTLE_AVOID_REASONS.GANJI_CHAR,
    })
  }

  // ⑤ 여섯 분류 — ★자료가 비어 있어 지금은 하나도 안 걸립니다
  for (const [key, set] of CATEGORY_SETS) {
    if (set.size > 0 && set.has(ch)) {
      hits.push({
        key,
        badgeLabel: GENTLE_AVOID_REASONS[key].badgeLabel,
        penalty: PENALTY_CATEGORY,
        reason: GENTLE_AVOID_REASONS[key],
      })
    }
  }

  if (hits.length === 0) return EMPTY

  const raw = hits.reduce((a, h) => a + h.penalty, 0)
  const penalty = Math.min(raw, SPECIAL_PENALTY_CAP)

  // 배지는 «가장 무거운» 것 하나만 — 여럿 붙이면 카드가 지저분해집니다
  const top = [...hits].sort((a, b) => b.penalty - a.penalty)[0]

  return {
    hits,
    penalty,
    badgeLabel: top.badgeLabel,
    descriptions: hits.map(h => h.reason.gentleDescription),
  }
}

/**
 * 이름 전체(글자 여럿)를 한 번에 검사합니다.
 * ★감정서에 실을 때 씁니다 — 어느 글자가 왜 걸렸는지 함께 돌려줍니다.
 */
export function checkSpecialAvoidForName(
  hanjaChars: string[],
  context?: UserContext,
): Array<{ hanja: string; result: SpecialAvoidResult }> {
  return hanjaChars
    .map(h => ({ hanja: cleanHanja(h), result: checkSpecialAvoidRules(h, context) }))
    .filter(x => x.result.hits.length > 0)
}
