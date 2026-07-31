// lib/saju/soundEngine.ts
// 발음오행 판정 — ★교재 125칸 표를 «찾아» 씁니다. 계산하지 않습니다.
//
// ══════════════════════════════════════════════════════════════════
//  [무엇이 바뀌었나]  2026-07-31 · 40부
//
//   옛 방식   상생 개수 / 이웃 개수 = ratio → 0.5 이상이면 「좋음」
//             ⚠️ 상극을 «세지 않았습니다». 상생1+상극1 이 상생2 와 같은 등급이었습니다.
//             ⚠️ 3글자에서 「보통」이 구조적으로 나올 수 없었습니다 (실측 0.0%).
//
//   새 방식   교재 60쪽 125칸 표를 그대로 조회
//             교재 61~98쪽의 격 이름·해설을 AI 재료로 함께 실음
//
//   실측 (3글자 초성 19종 전조합 6,859)
//             옛 방식 ↔ 교재   일치 69.2% · ★어긋남 30.8%
//             어긋남의 거의 전부가 «교재 흉인데 옛 방식은 좋음» (1,936건)
//
//  [왜 계산으로 만들지 않았나]
//   표의 96.7%는 「상극이 하나라도 있으면 흉」으로 설명됩니다. 그러나
//     · 예외 네 칸    목화화(반) 화목토(길) 토목화(반) 수토금(반)
//     · 비화만 다섯 칸 목목목 길 / 화화화 흉 / 토토토 반 / 금금금 흉 / 수수수 흉
//   이 아홉 칸은 «식으로 나오지 않습니다». 그래서 표를 정본으로 둡니다. (교훈 ER)
//
//  ⚠️⚠️ 교재 125칸은 «세 글자 이름» 전용입니다.
//     외자(2글자)·복성(4글자)은 교재에 없습니다 — 표에서 뽑은 «규칙» 으로 유추하고
//     `basis: '규칙유추'` 와 problems 로 «교재가 아님» 을 밝힙니다. ★연재쌤 확인 대상.
// ══════════════════════════════════════════════════════════════════

import type { Ohaeng } from './ohaeng'
import { iga, eulreul } from './josa'          // ★교훈 AU — 조사를 문자열에 박지 마십시오
import {
  SOUND_ARRANGEMENT, type SoundArrangement, type SoundFortune,
} from './tables/soundArrangement'
// ★2026-07-31 (40부 2차) 순화 해설 — 교재 61~98쪽. 원문은 싣지 않습니다 (교훈 EG)
import { getSoundGuide, type SoundGuide } from './soundGuide'
import {
  parseSoundChars, type SoundBook, type SoundChar, SOUND_BOOK_DEFAULT,
} from './sound/normalize'

// ── 오행 관계 ──────────────────────────────────────────────────────
const GENERATES: Record<Ohaeng, Ohaeng> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CONTROLS: Record<Ohaeng, Ohaeng> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }

/**
 * ★발음오행은 «방향을 보지 않습니다» — 교재 근거
 *    59쪽  박정희(수·금·토, 역생) 과 이재명(토·금·수, 순생) 을 «똑같이 좋다» 고 적음
 *    61쪽  장윤정(금·토·금) 을 「토생금, 토생금」 — 역생과 순생을 같은 말로 적음
 *          이건희(토·목·토) 를 「목극토, 목극토」 — 역극과 순극을 같은 말로 적음
 *    실측  좌우를 뒤집은 짝 50개 가운데 47개가 같은 길흉
 *
 * ⚠️ 자원오행(`relationDirected`)은 순생/역생을 «나눕니다». 그것이 «맞습니다» —
 *    두 관점의 잣대가 다른 것은 버그가 아니라 교재대로입니다. 통일하지 마십시오.
 */
export type SoundRel = '상생' | '상극' | '비화' | '모름'

export function soundRelation(a: Ohaeng | null, b: Ohaeng | null): SoundRel {
  if (!a || !b) return '모름'
  if (a === b) return '비화'
  if (GENERATES[a] === b || GENERATES[b] === a) return '상생'
  if (CONTROLS[a] === b || CONTROLS[b] === a) return '상극'
  return '모름'
}

/** 관계 한 줄을 «말» 로. ★조사는 josa.ts 가 붙입니다 (교훈 AU) */
export function soundRelationText(a: Ohaeng | null, b: Ohaeng | null): string {
  const rel = soundRelation(a, b)
  if (rel === '모름') return `${a ?? '?'}→${b ?? '?'} 판정할 수 없습니다`
  if (rel === '비화') return `${a}·${b} 같은 기운(비화)`
  if (rel === '상생') {
    const [x, y] = GENERATES[a!] === b! ? [a!, b!] : [b!, a!]
    return `${x}生${y} 상생 — ${x}${iga(x)} ${y}${eulreul(y)} 낳습니다`
  }
  const [x, y] = CONTROLS[a!] === b! ? [a!, b!] : [b!, a!]
  return `${x}剋${y} 상극 — ${x}${iga(x)} ${y}${eulreul(y)} 누릅니다`
}

// ── 판정 결과 ──────────────────────────────────────────────────────
export type SoundZone = '성씨 안' | '성씨→이름' | '이름 안'

export interface SoundLink {
  from: Ohaeng | null
  to: Ohaeng | null
  relation: SoundRel
  /** josa 가 붙은 온전한 문장 — AI 재료로 그대로 나갑니다 */
  text: string
  구간: SoundZone
}

export interface SoundVerdict {
  /** 오행 배열 (예: ['토','금','수']) */
  elements: (Ohaeng | null)[]
  /** 교재표 조회 키. 세 글자가 아니면 null */
  combinationKey: string | null
  /** 교재 길흉. 유추한 경우에도 이 세 값 가운데 하나입니다 */
  fortune: SoundFortune | '모름'
  /** ★이 판정이 교재표에서 «직접» 나온 것인가 */
  basis: '교재표' | '규칙유추' | '판정불가'
  /** ⚠️ 교재 원문 격 이름. ★AI 프롬프트에 넣지 마십시오 — 자극적인 것이 12칸 있습니다 */
  gyeok: string | null
  /**
   * ★손님·AI 에게 내보내도 되는 격 이름. 자극적이면 null 입니다 (교훈 BF).
   *   null 이면 AI 는 이름을 «지어내지 말고» theme·gentle 로만 풀어야 합니다.
   */
  gyeokPublic: string | null
  /** 순화 주제어 — 교재 61~98쪽에서 (AI 재료) */
  theme: string | null
  /** 순화 해설 한 문장 — AI 가 이 어조로 풀어 씁니다 */
  gentle: string | null
  /** 0~100 정밀 점수 */
  score: number
  links: SoundLink[]
  saengCount: number
  geukCount: number
  bihwaCount: number
  /** ★'모름' 을 조용히 넘기지 않습니다 */
  problems: string[]
  /** 어느 본으로 쟀는가 */
  book: SoundBook
  /** 하위호환 — 옛 3단 등급 */
  grade: '좋음' | '보통' | '아쉬움'
  chars: SoundChar[]
}

export interface SoundInputChar {
  hangul: string
  역할: '성' | '이름'
}

// ══════════════════════════════════════════════════════════════════
//  ★점수 — 「평균을 지금 자리에 두고 칸만 늘린다」 (수리 정밀점수와 같은 원칙)
// ══════════════════════════════════════════════════════════════════
//
//  ⚠️⚠️ 지시서의 「평균 ★3.89 를 유지」는 «3단 등급으로는 산술적으로 불가능» 합니다.
//     교재 분포가 吉 29.7% · 반 2.2% · 凶 68.1% 이므로,
//     凶을 하한 ★3.0, 吉을 만점 ★5.0 으로 밀어도 평균의 «천장» 이 ★3.604 입니다.
//     (검산: 0.681×3.0 + 0.022×3.5 + 0.297×5.0 = 3.604)
//
//  ★그래서 «교재 판정 안에서 순서를 매기는» 방법을 씁니다.
//     교재가 「흉」이라 한 칸을 여전히 흉으로 두되, 상극이 하나인 것과 둘인 것을
//     다른 별에 둡니다. 교재 판정을 바꾸지 않으므로 교재를 어기지 않습니다.
//
//     실측 (3글자 6,859)
//       현행 비율식         ★3.894   칸 2개 (★4.5 / ★3.0)
//       교재 3단 그대로     ★3.456   칸 3개
//       ★아래 방식          ★3.798   칸 5개 (★3.0 ~ ★5.0)
//
//  ⚠️ 배점은 «대표님 확정 전» 입니다. 이 상수 넷만 고치면 평균이 움직입니다.
const SCORE_BASE = {
  吉_기준: 75, 吉_상생가산: 15, 吉_상극감산: 10,
  반길반흉: 62,
  凶_기준: 55, 凶_상극감산: 20,
} as const

function scoreOf(fortune: SoundFortune | '모름', saeng: number, geuk: number, links: number): number {
  if (fortune === '모름' || links === 0) return 50
  const sR = saeng / links
  const gR = geuk / links
  if (fortune === '길') {
    return clamp(SCORE_BASE.吉_기준 + SCORE_BASE.吉_상생가산 * sR - SCORE_BASE.吉_상극감산 * gR)
  }
  if (fortune === '반길반흉') return SCORE_BASE.반길반흉
  return clamp(SCORE_BASE.凶_기준 - SCORE_BASE.凶_상극감산 * gR)
}
const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v * 10) / 10))

/**
 * ★교재표에서 뽑은 규칙 — 세 글자가 «아닐 때만» 씁니다 (외자·복성)
 *   125칸 중 116칸(96.7%)이 이 규칙과 같습니다.
 *   ⚠️ 교재가 정한 것이 아니라 «우리가 유추한 것» 입니다. basis 로 밝힙니다.
 */
function inferFortune(saeng: number, geuk: number): SoundFortune {
  if (geuk > 0) return '흉'
  if (saeng > 0) return '길'
  return '흉'   // 비화만 — 교재는 오행마다 다르나 다수가 흉입니다
}

function zoneOf(a: '성' | '이름', b: '성' | '이름'): SoundZone {
  if (a === '성' && b === '성') return '성씨 안'
  if (a === '성' && b === '이름') return '성씨→이름'
  return '이름 안'
}

// ══════════════════════════════════════════════════════════════════
//  본체
// ══════════════════════════════════════════════════════════════════
export function evaluateSoundOhaeng(
  chars: SoundInputChar[],
  book: SoundBook = SOUND_BOOK_DEFAULT,
): SoundVerdict {
  const parsed = parseSoundChars(chars.map((c) => c.hangul), book)
  const elements = parsed.map((p) => p.ohaeng)
  const problems: string[] = parsed.filter((p) => p.problem).map((p) => p.problem!)

  const links: SoundLink[] = []
  let saeng = 0, geuk = 0, bihwa = 0
  for (let i = 0; i < parsed.length - 1; i++) {
    const rel = soundRelation(elements[i], elements[i + 1])
    links.push({
      from: elements[i], to: elements[i + 1], relation: rel,
      text: soundRelationText(elements[i], elements[i + 1]),
      구간: zoneOf(chars[i].역할, chars[i + 1].역할),
    })
    if (rel === '상생') saeng++
    else if (rel === '상극') geuk++
    else if (rel === '비화') bihwa++
  }

  // ── 교재표 조회 ──
  let arrangement: SoundArrangement | null = null
  let combinationKey: string | null = null
  let basis: SoundVerdict['basis'] = '판정불가'
  let fortune: SoundFortune | '모름' = '모름'

  const allKnown = elements.every((e): e is Ohaeng => e !== null)
  if (allKnown && elements.length === 3) {
    combinationKey = elements.join('')
    arrangement = SOUND_ARRANGEMENT[combinationKey] ?? null
    if (arrangement) { basis = '교재표'; fortune = arrangement.fortune }
    else problems.push(`교재 125칸에 '${combinationKey}' 가 없습니다 — 표를 확인하십시오`)
  } else if (allKnown && elements.length >= 2) {
    basis = '규칙유추'
    fortune = inferFortune(saeng, geuk)
    problems.push(
      `${elements.length}글자 이름입니다. 교재 125칸은 «세 글자» 전용이라 ` +
      `표에서 뽑은 규칙으로 유추했습니다 (교재가 정한 값이 아닙니다)`,
    )
  } else {
    problems.push('오행을 알 수 없는 글자가 있어 배열을 판정하지 못했습니다')
  }

  // ★순화 해설 — 교재표에서 나온 칸만. 유추한 칸은 없습니다(지어내지 않습니다)
  const guide: SoundGuide | null = basis === '교재표' ? getSoundGuide(combinationKey) : null
  if (basis === '교재표' && !guide) {
    problems.push(`'${combinationKey}' 의 순화 해설이 없습니다 — soundGuide.ts 를 확인하십시오`)
  }

  const score = scoreOf(fortune, saeng, geuk, links.length)
  const grade: SoundVerdict['grade'] =
    fortune === '길' ? '좋음' : fortune === '반길반흉' ? '보통' : fortune === '흉' ? '아쉬움' : '보통'

  return {
    elements, combinationKey, fortune, basis,
    gyeok: arrangement?.gyeok ?? null,
    gyeokPublic: guide?.gyeokPublic ?? null,
    theme: guide?.theme ?? null,
    gentle: guide?.gentle ?? null,
    score, links,
    saengCount: saeng, geukCount: geuk, bihwaCount: bihwa,
    problems, book, grade, chars: parsed,
  }
}
