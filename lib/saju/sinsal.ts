// lib/saju/sinsal.ts

import { JIJI } from './constants'

export const SINSAL_NAMES = [
  '겁살','재살','천살','지살','년살','월살',
  '망신','장성','반안','역마','육해','화개'
] as const
export type SinsalName = typeof SINSAL_NAMES[number]

const SINSAL_START: Record<string, number> = {
  '寅': 11, '午': 11, '戌': 11,
  '申': 5,  '子': 5,  '辰': 5,
  '亥': 8,  '卯': 8,  '未': 8,
  '巳': 2,  '酉': 2,  '丑': 2,
}

/** 12신살 — 기준지지(년지 또는 일지)에서 대상지지의 신살을 구한다.
 *
 *  ★ 지지를 못 찾으면 빈 문자열('')을 돌려준다. (2026-07 수정)
 *    시(時)를 모르는 사주는 시주가 { stem:'?', branch:'?' }로 들어오는데,
 *    예전에는 '겁살'(배열 0번)을 돌려줘서 있지도 않은 흉살이 붉게 표시됐다.
 *    전문가가 이를 근거로 상담하거나, AI 통변 프롬프트에 주입되는 문제가 있었다.
 *    → 못 찾으면 빈 값. 화면들은 이미 `getSinsal(...) || '-'` 로 받고 있어
 *      호출부를 고칠 필요가 없다.
 *    ※ 지지가 정상일 때의 결과는 그대로 (144개 조합 전수 대조 완료).
 */
export function getSinsal(baseJiji: string, targetJiji: string): SinsalName | '' {
  const start = SINSAL_START[baseJiji]
  if (start === undefined) return ''
  const targetIdx = JIJI.indexOf(targetJiji as typeof JIJI[number])
  if (targetIdx === -1) return ''
  const diff = (targetIdx - start + 12) % 12
  return SINSAL_NAMES[diff]
}

export const SINSAL_HIGHLIGHT: Record<string, string> = {
  '역마': '#D97706',
  '년살': '#DB2777',
  '겁살': '#DC2626',
  '망신': '#7C3AED',
  '화개': '#0891B2',
  '장성': '#059669',
  '반안': '#0284C7',
  '재살': '#B91C1C',
  '천살': '#9333EA',
  '지살': '#0D9488',
  '월살': '#C2410C',
  '육해': '#6D28D9',
}
