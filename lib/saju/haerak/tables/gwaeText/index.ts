/**
 *  하락이수 — 괘 풀이 글 «모으는 곳»
 *  2026-09-14 (8부)
 *
 *  ★괘가 들어올 때마다 여기에 «한 줄» 씩 더합니다.
 *     ⇒ 봉투마다 이 파일과 새 괘 파일만 바뀝니다. 다른 괘는 안 흔들립니다.
 *
 *  ⚠️ 지금 ★64 / 64 입니다 — ★다 찼습니다 (도표 1 ~ 94).
 *  ⛔ 글이 «없는» 괘를 억지로 채우지 마십시오 — 없으면 «없다» 고 답합니다.
 */

import type { GwaeText, HyoText } from './types'
import { G1_GEON } from './g1-geon'
import { G3_GON } from './g3-gon'
import { G4_DUN } from './g4-dun'
import { G6_MONG } from './g6-mong'
import { G7_SU } from './g7-su'
import { G9_SONG } from './g9-song'
import { G10_SA } from './g10-sa'
import { G12_BI } from './g12-bi'
import { G13_SOCHUK } from './g13-sochuk'
import { G14_I } from './g14-i'
import { G16_TAE } from './g16-tae'
import { G17_BI2 } from './g17-bi2'
import { G19_DONGIN } from './g19-dongin'
import { G20_DAEYU } from './g20-daeyu'
import { G22_GYEOM } from './g22-gyeom'
import { G23_YE } from './g23-ye'
import { G24_SU2 } from './g24-su2'
import { G26_GO } from './g26-go'
import { G27_IM } from './g27-im'
import { G28_GWAN } from './g28-gwan'
import { G30_SEOHAP } from './g30-seohap'
import { G31_BUN } from './g31-bun'
import { G33_BAK } from './g33-bak'
import { G34_BOK } from './g34-bok'
import { G36_MUMANG } from './g36-mumang'
import { G37_DAECHUK } from './g37-daechuk'
import { G38_I2 } from './g38-i2'
import { G40_DAEGWA } from './g40-daegwa'
import { G41_GAM } from './g41-gam'
import { G43_RI } from './g43-ri'
import { G44_HAM } from './g44-ham'
import { G46_HANG } from './g46-hang'
import { G47_DON } from './g47-don'
import { G49_DAEJANG } from './g49-daejang'
import { G50_JIN } from './g50-jin'
import { G52_MYEONGI } from './g52-myeongi'

import { G53_GAIN } from './g53-gain'

import { G55_GYU } from './g55-gyu'

import { G56_GEON2 } from './g56-geon2'

import { G58_HAE } from './g58-hae'

import { G59_SON } from './g59-son'

import { G61_IK } from './g61-ik'

import { G62_KWAE } from './g62-kwae'

import { G64_GU } from './g64-gu'

import { G65_CHWE } from './g65-chwe'

import { G67_SEUNG } from './g67-seung'

import { G68_GON2 } from './g68-gon2'

import { G70_JEONG } from './g70-jeong'

import { G71_HYEOK } from './g71-hyeok'

import { G73_JEONG2 } from './g73-jeong2'

import { G74_JIN } from './g74-jin'

import { G76_GAN } from './g76-gan'

import { G77_JEOM } from './g77-jeom'

import { G79_GWIMAE } from './g79-gwimae'

import { G80_PUNG } from './g80-pung'

import { G82_YEO } from './g82-yeo'

import { G83_SON2 } from './g83-son2'

import { G85_TAE } from './g85-tae'

import { G86_HWAN } from './g86-hwan'

import { G88_JEOL } from './g88-jeol'

import { G89_JUNGBU } from './g89-jungbu'

import { G91_SOGWA } from './g91-sogwa'

import { G92_GIJE } from './g92-gije'

import { G94_MIJE } from './g94-mije'

/** 도표 번호 → 괘 글 */
const ALL: Readonly<Record<number, GwaeText>> = {
  1: G1_GEON,
  3: G3_GON,
  4: G4_DUN,
  6: G6_MONG,
  7: G7_SU,
  9: G9_SONG,
  10: G10_SA,
  12: G12_BI,
  13: G13_SOCHUK,
  14: G14_I,
  16: G16_TAE,
  17: G17_BI2,
  19: G19_DONGIN,
  20: G20_DAEYU,
  22: G22_GYEOM,
  23: G23_YE,
  24: G24_SU2,
  26: G26_GO,
  27: G27_IM,
  28: G28_GWAN,
  30: G30_SEOHAP,
  31: G31_BUN,
  33: G33_BAK,
  34: G34_BOK,
  36: G36_MUMANG,
  37: G37_DAECHUK,
  38: G38_I2,
  40: G40_DAEGWA,
  41: G41_GAM,
  43: G43_RI,
  44: G44_HAM,
  46: G46_HANG,
  47: G47_DON,
  49: G49_DAEJANG,
  50: G50_JIN,
  52: G52_MYEONGI,
  53: G53_GAIN,
  55: G55_GYU,
  56: G56_GEON2,
  58: G58_HAE,
  59: G59_SON,
  61: G61_IK,
  62: G62_KWAE,
  64: G64_GU,
  65: G65_CHWE,
  67: G67_SEUNG,
  68: G68_GON2,
  70: G70_JEONG,
  71: G71_HYEOK,
  73: G73_JEONG2,
  74: G74_JIN,
  76: G76_GAN,
  77: G77_JEOM,
  79: G79_GWIMAE,
  80: G80_PUNG,
  82: G82_YEO,
  83: G83_SON2,
  85: G85_TAE,
  86: G86_HWAN,
  88: G88_JEOL,
  89: G89_JUNGBU,
  91: G91_SOGWA,
  92: G92_GIJE,
  94: G94_MIJE,
}

/** 글이 들어온 괘가 몇 개인가 (64가 되면 다 찬 것입니다) */
export const gwaeTextCount = (): number => Object.keys(ALL).length

/** 아직 글이 «안 들어온» 괘의 도표 번호 — 스캔이 남은 목록입니다 */
export const gwaeTextHave = (): number[] => Object.keys(ALL).map(Number).sort((a, b) => a - b)

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

/** 🔴 제가 «못 읽은» 자리를 다 모읍니다 — 대표님이 여기만 보시면 됩니다 */
export function allChecks(): { no: number; name: string; note: string }[] {
  return Object.values(ALL).flatMap(g => (g.check ?? []).map(note => ({ no: g.no, name: g.name, note })))
}

export type { GwaeText, HyoText, GwaePart } from './types'
