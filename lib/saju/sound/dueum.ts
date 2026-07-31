// lib/saju/sound/dueum.ts
//
// 두음법칙 — ★«판정을 바꾸지 않습니다». 손님에게 «알려 주기만» 합니다.
//
// ══════════════════════════════════════════════════════════════════
//  [교재의 입장]  『작명개운법』 3장
//    교재 사례가 李를 「이」(ㅇ, 土) 로 적습니다 — 이재명(토, 금, 수) · 이건희(토, 목, 토).
//    본음(리, ㄹ, 火)으로 «되돌리지 않습니다».
//    → 그러므로 «손님이 쓴 표기가 곧 정답» 입니다. 코드가 고칠 일이 아닙니다.
//
//  [그런데 손님 쪽에서 보면]
//    柳吉諒 을 「류길량」으로 쓰면  화·목·화 → 발전안정격 → ★5.0
//              「유길량」으로 쓰면  토·목·화 → 운중지월격 → ★4.0
//    같은 한자인데 별이 하나 다릅니다. 손님은 까닭을 모릅니다.
//
//  ★그래서 «화면에 한 줄 적어 주기» 로 정했습니다 (대표님 확정 2026-07-31).
//    판정을 바꾸지 않으므로 교재를 어기지 않고, 손님이 스스로 고를 수 있습니다.
// ══════════════════════════════════════════════════════════════════
//
//  [왜 표를 두지 않았나]
//    오행이 갈리는 것은 «초성이 ㄹ·ㄴ → ㅇ 로 바뀌는 자리» 뿐입니다.
//      량→양 · 려→여 · 례→예 · 료→요 · 류→유 · 리→이 · 뉴→유 · 니→이 …  ★화 ↔ 토
//    ㄹ→ㄴ 으로만 바뀌는 자리는 «둘 다 火» 라 갈리지 않습니다.
//      라→나 · 로→노 · 뢰→뇌 …                                    — 알릴 필요 없음
//    → 규칙으로 뽑을 수 있어 표를 두지 않았습니다. 교재 43자와 대조해 두었습니다.

import { parseSoundChar, type SoundBook, SOUND_BOOK_DEFAULT } from './normalize'
import { euro, eunneun } from '../josa'   // ★교훈 AU — 조사를 문자열에 박지 마십시오

/** ㅣ 또는 반모음 ㅣ 가 앞에 붙은 모음 — 이 자리에서만 ㄹ·ㄴ 이 ㅇ 으로 바뀝니다 */
const I_LIKE_JUNG = new Set([2, 6, 12, 17, 20]) // ㅑ ㅕ ㅛ ㅠ ㅣ
const YE_JUNG = new Set([3, 7])                 // ㅒ ㅖ

function decompose(han: string): { cho: number; jung: number; jong: number } | null {
  const c = han.charCodeAt(0) - 0xac00
  if (!Number.isFinite(c) || c < 0 || c > 11171) return null
  return { cho: Math.floor(c / 588), jung: Math.floor((c % 588) / 28), jong: c % 28 }
}
function compose(cho: number, jung: number, jong: number): string {
  return String.fromCharCode(0xac00 + cho * 588 + jung * 28 + jong)
}
const CHO_R = 5, CHO_N = 2, CHO_IEUNG = 11

export interface DueumPair {
  /** 한자 — 있으면 문장에 씁니다 */
  hanja?: string
  /** 손님이 쓴 글자 */
  written: string
  /** 같은 한자를 달리 쓰는 표기 */
  alternate: string
  /** 쓴 표기의 오행 */
  writtenOhaeng: string
  /** 다른 표기의 오행 */
  alternateOhaeng: string
}

/**
 * 이 글자가 «두음법칙으로 오행이 갈리는» 자리인가.
 *
 * ★오행이 «같으면» null 을 냅니다 — 라/나 처럼 알릴 필요가 없는 자리는 걸러집니다.
 * ⚠️ 성씨 자리(첫 글자)에만 쓰십시오. 이름 가운데 글자는 두음법칙 자리가 아닙니다.
 */
export function dueumPair(han: string, book: SoundBook = SOUND_BOOK_DEFAULT): DueumPair | null {
  const d = decompose(han)
  if (!d) return null
  const iLike = I_LIKE_JUNG.has(d.jung) || YE_JUNG.has(d.jung)
  if (!iLike) return null

  let alt: string | null = null
  if (d.cho === CHO_R || d.cho === CHO_N) alt = compose(CHO_IEUNG, d.jung, d.jong)  // 류 → 유
  else if (d.cho === CHO_IEUNG) alt = compose(CHO_R, d.jung, d.jong)                // 유 → 류
  if (!alt) return null

  const a = parseSoundChar(han, book).ohaeng
  const b = parseSoundChar(alt, book).ohaeng
  if (!a || !b || a === b) return null   // ★갈리지 않으면 알리지 않습니다

  return { written: han, alternate: alt, writtenOhaeng: a, alternateOhaeng: b }
}

/**
 * ★★«정말로 두 음으로 쓰이는 한자» 일 때만 알립니다.
 *
 * ⚠️ 글자만 보고는 알 수 없습니다 —
 *      「양」은 梁(량→양) 일 수도 楊(본래 양) 일 수도 있습니다.
 *      「이」는 李 지만, 「리」로 적는 분은 사실상 없습니다.
 *    글자만 보고 알리면 이씨·양씨 손님 «전원» 이 쓸모없는 안내를 봅니다.
 *
 * ★그래서 «그 한자가 실제로 다른 음으로도 쓰이는가» 를 함께 받습니다.
 *   화면은 hanja 표에서 같은 한자의 hangul 값들을 뽑아 넘기십시오.
 *   → 표가 좋아지면 안내도 저절로 정확해집니다. 목록을 따로 두지 않습니다.
 *
 * @param written          손님이 쓴 한글 한 글자
 * @param readingsOfHanja  그 한자가 hanja 표에 실려 있는 한글 음들
 */
export function dueumPairIfReal(
  written: string,
  readingsOfHanja: readonly string[],
  hanja?: string,
  book: SoundBook = SOUND_BOOK_DEFAULT,
): DueumPair | null {
  const p = dueumPair(written, book)
  if (!p) return null
  if (!readingsOfHanja.includes(p.alternate)) return null
  return hanja ? { ...p, hanja } : p
}

/**
 * ★화면에 적을 한 줄. 판정을 바꾸지 않는다는 것을 분명히 합니다.
 * ⚠️ 「틀렸다」로 읽히지 않게 쓰십시오. 둘 다 맞습니다 — 교재는 «표기음 그대로» 입니다.
 */
export function dueumNotice(p: DueumPair): string {
  // ⚠️ 조사는 «한자» 가 아니라 «읽는 음» 으로 고릅니다 —
  //    eunneun('梁') 은 한글이 없어 판정할 수 없습니다. eunneun('양') 이라야 「은」이 나옵니다.
  const who = p.hanja ? `${p.hanja}${eunneun(p.written)}` : '이 한자는'
  return `${who} 「${p.written}」${euro(p.written)}도 「${p.alternate}」${euro(p.alternate)}도 적습니다. `
    + `어느 쪽이든 맞습니다. 다만 첫소리의 기운이 `
    + `「${p.written}」${eunneun(p.written)} ${p.writtenOhaeng}, `
    + `「${p.alternate}」${eunneun(p.alternate)} ${p.alternateOhaeng}${euro(p.alternateOhaeng)} `
    + `보아 발음오행 풀이가 조금 달라집니다. 평소 부르시는 대로 두시면 됩니다.`
}

/**
 * 이름 전체에서 «성씨 자리» 만 봅니다.
 * ⚠️ 이름 가운데·끝 글자는 두음법칙 자리가 아닙니다 (諒은 끝에서 «량» 이 맞습니다).
 */
export function dueumNoticeForName(
  chars: { hangul: string; hanja?: string; 역할: '성' | '이름' }[],
  readingsByHanja: Record<string, readonly string[]>,
  book: SoundBook = SOUND_BOOK_DEFAULT,
): string | null {
  const head = chars.find((c) => c.역할 === '성')
  if (!head) return null
  const readings: readonly string[] = head.hanja ? (readingsByHanja[head.hanja] ?? []) : []
  const p = dueumPairIfReal(head.hangul, readings, head.hanja, book)
  return p ? dueumNotice(p) : null
}
