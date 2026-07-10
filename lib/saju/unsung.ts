// lib/saju/unsung.ts

import { JIJI } from './constants'

export const UNSUNG_NAMES = [
  '장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'
] as const
export type UnsungName = typeof UNSUNG_NAMES[number]

// 각 일간(日干)의 장생(長生) 지지. 여기서부터 양간 순행 / 음간 역행으로 12운성 전개.
//   (표준 12운성. 이전 인덱스 방식이 한 칸씩 밀려 오류였으므로 지지로 명시)
//   검증: 각 천간 건록(祿)이 정위치에 오는지로 확인 완료.
const JANGSAENG_JIJI: Record<string, string> = {
  '甲': '亥', '乙': '午',
  '丙': '寅', '丁': '酉',
  '戊': '寅', '己': '酉',
  '庚': '巳', '辛': '子',
  '壬': '申', '癸': '卯',
}

const YANG_GAN = new Set(['甲','丙','戊','庚','壬'])

export function getUnsung(ilgan: string, jiji: string): UnsungName {
  const jijiIdx = JIJI.indexOf(jiji as typeof JIJI[number])
  const startJi = JANGSAENG_JIJI[ilgan]
  if (jijiIdx === -1 || !startJi) return '절'
  const startIdx = JIJI.indexOf(startJi as typeof JIJI[number])
  const isYang = YANG_GAN.has(ilgan)
  const diff = isYang
    ? (jijiIdx - startIdx + 12) % 12
    : (startIdx - jijiIdx + 12) % 12
  return UNSUNG_NAMES[diff]
}

export const UNSUNG_STRONG = new Set(['장생','관대','건록','제왕'])
export const UNSUNG_WEAK   = new Set(['사','묘','절'])

export function unsungColor(name: string): string {
  if (UNSUNG_STRONG.has(name)) return '#2d7a2d'
  if (UNSUNG_WEAK.has(name))   return '#b03030'
  return '#555'
}
