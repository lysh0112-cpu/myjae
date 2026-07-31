// lib/saju/sound/normalize.ts
// 발음오행 — 한글 한 글자를 «초성 / 오행» 으로 가르는 단일 창구
//
// ══════════════════════════════════════════════════════════════════
//  [교재 근거]  『작명개운법』 3장 57·59쪽
//    · 자음 배당은 «운해본» 을 씁니다 — 57쪽 「필자는 운해본을 따르고 있으며
//      이 책에 수록된 모든 사례는 운해본에 의한 작명이다」
//      운해본  木 ㄱㅋ · 火 ㄴㄷㄹㅌ · 土 ㅇㅎ · 金 ㅅㅈㅊ · 水 ㅁㅂㅍ
//      해례본  土 와 水 가 «서로 반대»  (土 ㅁㅂㅍ · 水 ㅇㅎ)
//      → 교재가 「어느 것이 옳다 그르다를 따질 수 없다」 하였으므로 «스위치로» 남깁니다
//    · 종성(받침)은 «보지 않습니다» — 59쪽 A학설 「초성(두음)만으로 상생이 되면 좋다.
//      종성(받침)을 포함해서는 상극이 되어도 무관하다」. 필자가 A학설입니다.
//    · 두음법칙은 «표기음 그대로» 씁니다 — 교재 사례 이재명 (토, 금, 수)·
//      이건희 (토, 목, 토) 로 李를 «이»(ㅇ, 土) 로 봤습니다. 본음(리)으로 되돌리지 않습니다.
//
//  ⚠️ 된소리 다섯 자(ㄲ ㄸ ㅃ ㅆ ㅉ)는 «교재 표에 없습니다».
//     예사소리와 같은 자리에 두었습니다(ㄲ→목 …). 상식에 맞으나 교재 근거는 없습니다.
//     ★연재쌤 확인 대상입니다. 바꾸시려면 DOUBLE_CONSONANT 만 고치면 됩니다.
// ══════════════════════════════════════════════════════════════════

import type { Ohaeng } from '../ohaeng'

/** 자음 배당 학설 — 교재 57쪽 */
export type SoundBook = '운해본' | '해례본'

/** ★기본값. 교재의 모든 사례가 운해본입니다 */
export const SOUND_BOOK_DEFAULT: SoundBook = '운해본'

const CHOSEONG = [
  'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ',
  'ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ',
] as const

/** ⚠️ 교재에 없는 다섯 자 — 예사소리와 같은 자리로 둡니다 */
const DOUBLE_CONSONANT: Record<string, string> = {
  ㄲ: 'ㄱ', ㄸ: 'ㄷ', ㅃ: 'ㅂ', ㅆ: 'ㅅ', ㅉ: 'ㅈ',
}

/** 교재 57쪽 두 본. 값은 «본 자음 17자» 만 담습니다 */
const BOOK_MAP: Record<SoundBook, Record<string, Ohaeng>> = {
  운해본: {
    ㄱ: '목', ㅋ: '목',
    ㄴ: '화', ㄷ: '화', ㄹ: '화', ㅌ: '화',
    ㅇ: '토', ㅎ: '토',
    ㅅ: '금', ㅈ: '금', ㅊ: '금',
    ㅁ: '수', ㅂ: '수', ㅍ: '수',
  },
  해례본: {
    ㄱ: '목', ㅋ: '목',
    ㄴ: '화', ㄷ: '화', ㄹ: '화', ㅌ: '화',
    ㅁ: '토', ㅂ: '토', ㅍ: '토',
    ㅅ: '금', ㅈ: '금', ㅊ: '금',
    ㅇ: '수', ㅎ: '수',
  },
}

export interface SoundChar {
  /** 화면에 보이는 한 글자 */
  hangul: string
  /** 초성. 완성형 한글이 아니면 '' */
  cho: string
  /** 오행. 판정할 수 없으면 null — ★'' 로 뭉개지 마십시오 */
  ohaeng: Ohaeng | null
  /** 판정할 수 없는 까닭. 정상이면 null */
  problem: string | null
}

/**
 * 완성형 한글(가~힣) 한 글자의 초성을 냅니다.
 * ⚠️ 자모(ㄱ), 한자(漢), 로마자(A), 빈 문자열은 모두 '' 입니다.
 */
export function getChoseong(han: string): string {
  if (!han) return ''
  const code = han.charCodeAt(0) - 0xac00
  if (!Number.isFinite(code) || code < 0 || code > 11171) return ''
  return CHOSEONG[Math.floor(code / 588)]
}

/**
 * 한 글자를 «초성 · 오행» 으로 가릅니다.
 *
 * ★교훈 — 판정할 수 없으면 «조용히 넘기지 않고» problem 을 답니다.
 *   `resourceJudge` 가 '모름' 을 problems 로 올리는 것과 같은 잣대입니다.
 *   예전 코드는 '' 를 내고 그대로 통과시켜, AI 재료에 「A()→승(금)」 처럼
 *   빈 괄호가 실려 나갔습니다.
 */
export function parseSoundChar(hangul: string, book: SoundBook = SOUND_BOOK_DEFAULT): SoundChar {
  const raw = (hangul ?? '').trim()
  if (!raw) {
    return { hangul: raw, cho: '', ohaeng: null, problem: '글자가 비어 있습니다' }
  }
  const cho = getChoseong(raw)
  if (!cho) {
    return {
      hangul: raw, cho: '', ohaeng: null,
      problem: `'${raw}' 는 완성형 한글이 아니라 초성을 뽑을 수 없습니다`,
    }
  }
  const base = DOUBLE_CONSONANT[cho] ?? cho
  const ohaeng = BOOK_MAP[book][base] ?? null
  if (!ohaeng) {
    return { hangul: raw, cho, ohaeng: null, problem: `초성 '${cho}' 의 오행이 표에 없습니다` }
  }
  return { hangul: raw, cho, ohaeng, problem: null }
}

/** 여러 글자를 한 번에. 순서를 지킵니다 */
export function parseSoundChars(hanguls: string[], book: SoundBook = SOUND_BOOK_DEFAULT): SoundChar[] {
  return hanguls.map((h) => parseSoundChar(h, book))
}

/** 하위호환 — 옛 `soundOhaengOf` 자리. ★새 코드는 parseSoundChar 를 쓰십시오 */
export function soundOhaengOf(hangul: string, book: SoundBook = SOUND_BOOK_DEFAULT): Ohaeng | '' {
  return parseSoundChar(hangul, book).ohaeng ?? ''
}
