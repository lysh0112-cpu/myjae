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

export function getSinsal(baseJiji: string, targetJiji: string): SinsalName {
  const start = SINSAL_START[baseJiji]
  if (start === undefined) return '겁살'
  const targetIdx = JIJI.indexOf(targetJiji as typeof JIJI[number])
  if (targetIdx === -1) return '겁살'
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
