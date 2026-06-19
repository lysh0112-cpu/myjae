// lib/saju/gongmang.ts

import { CHEONGAN, JIJI } from './constants'

function getSajuIdx(cheongan: string, jiji: string): number {
  const ganIdx  = CHEONGAN.indexOf(cheongan as typeof CHEONGAN[number])
  const jijiIdx = JIJI.indexOf(jiji as typeof JIJI[number])
  if (ganIdx === -1 || jijiIdx === -1) return 0
  for (let i = 0; i < 60; i++) {
    if (i % 10 === ganIdx && i % 12 === jijiIdx) return i
  }
  return 0
}

export function getGongmang(ilgan: string, iljji: string): [string, string] {
  const idx        = getSajuIdx(ilgan, iljji)
  const sunStart   = Math.floor(idx / 10) * 10
  const startJijiIdx = sunStart % 12
  const gm1 = JIJI[(startJijiIdx + 10) % 12]
  const gm2 = JIJI[(startJijiIdx + 11) % 12]
  return [gm1, gm2]
}
