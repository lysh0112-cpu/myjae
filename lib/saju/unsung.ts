// lib/saju/unsung.ts

import { JIJI } from './constants'

export const UNSUNG_NAMES = [
  '장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'
] as const
export type UnsungName = typeof UNSUNG_NAMES[number]

const UNSUNG_START: Record<string, number> = {
  '甲': 10, '乙': 6,
  '丙': 2,  '丁': 9,
  '戊': 2,  '己': 9,
  '庚': 5,  '辛': 0,
  '壬': 8,  '癸': 3,
}

const YANG_GAN = new Set(['甲','丙','戊','庚','壬'])

export function getUnsung(ilgan: string, jiji: string): UnsungName {
  const jijiIdx = JIJI.indexOf(jiji as typeof JIJI[number])
  if (jijiIdx === -1 || !(ilgan in UNSUNG_START)) return '절'
  const startIdx = UNSUNG_START[ilgan]
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
