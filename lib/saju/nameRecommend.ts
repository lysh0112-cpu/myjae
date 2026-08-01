// lib/saju/nameRecommend.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  한글 이름 추천 — 성씨 + 사주 → 이름 8~10개                       │
// └───────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 (Phase 3 · F) — 대표님 확정
//
//  [이 파일이 «하지 않는» 것]
//    · 발음오행을 «다시 판정하지» 않습니다 — soundEngine.ts 가 합니다.
//    · 한자·수리·자원오행은 «보지 않습니다» — 그건 Step 3 의 일입니다.
//      ⚠️ 이 단계는 «한글 이름» 만 고릅니다. 한자가 아직 없으니
//         자원오행도 수리4격도 «잴 수 없습니다». 억지로 재면 거짓이 됩니다.
//
//  [이 파일이 하는 것]
//    후보 이름마다 «성씨를 붙여» 발음오행을 재고, 사주와의 어울림·어감을 더해 줄 세웁니다.
//
//  [후보는 어디서 오나]
//    ① 교재 1장 이름 사전 1,256개 (tables/nameDict.ts)
//    ② ⚠️ 사전만으로는 모자랍니다 — 목(木) 65개뿐이고 성씨 상생까지 걸면 더 줄어듭니다.
//       그래서 «사전 밖» 후보도 만듭니다 (아래 buildSyllablePool).
//
//  [울림소리 받침]
//    ★대표님 확정 2026-08-01 — «판정이 아니라 어감» 입니다.
//    교재 3장은 «초성만» 봅니다(59쪽 A학설). 종성을 판정에 넣으면 그 학설과 어긋납니다.
//    → 발음오행 점수에 «섞지 않고», 어감 가산점으로 «따로» 둡니다.
//      끄고 켤 수 있게 두었습니다(options.softEnding).
// ══════════════════════════════════════════════════════════════════

import { evaluateSoundOhaeng, type SoundVerdict } from './soundEngine'
import { NAME_DICT } from './tables/nameDict'
import { parseSoundChar } from './sound/normalize'
import type { Ohaeng } from './ohaeng'

// ── 어감 ───────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════
//  ⚠️⚠️ 아래는 «어감(취향)» 입니다 — 성명학 판정이 «아닙니다».
//
//   [왜 여기 두나]  2026-08-01 대표님 확정
//     · 울림소리 받침 — 교재 3장은 «초성만» 봅니다(59쪽 A학설).
//       종성을 판정에 넣으면 그 학설과 어긋납니다.
//     · 모음 음양 — 교재 2장 48쪽에 있으나 «쓰지 않기로» 확정했습니다(2026-07-31).
//       ㅐ ㅔ ㅚ ㅟ ㅢ ㅘ ㅝ 가 교재 표에 없어 규칙을 늘리면 교훈 EJ 를 어깁니다.
//       ★그래서 «판정» 이 아니라 «부르기 좋은가» 로만 씁니다.
//     · 선호 스타일 — 교재 밖입니다. 아래 STYLE_HINT 주석을 보십시오.
//
//   ⚠️ 이 셋을 합쳐도 어감 몫은 «8점» 입니다. 발음오행 70점을 뒤집지 못합니다.
// ══════════════════════════════════════════════════════════════════

/** 울림소리 받침 — ㄴ ㄹ ㅁ ㅇ */
const SOFT_JONG = new Set(['ㄴ', 'ㄹ', 'ㅁ', 'ㅇ'])
const JONGSEONG = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ',
  'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const

function jongOf(han: string): string {
  const c = han.charCodeAt(0) - 0xac00
  if (!Number.isFinite(c) || c < 0 || c > 11171) return ''
  return JONGSEONG[c % 28]
}

/** 이름에 울림소리 받침이 몇 개인가 */
export function softEndingCount(name: string): number {
  return [...name].filter((ch) => SOFT_JONG.has(jongOf(ch))).length
}

// ── 모음 음양 (교재 2장 48쪽) — ★판정 아님 · 어감 ──────────────────
const JUNGSEONG = [
  'ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ',
  'ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ',
] as const
/** 교재 48쪽에 «실린 것만». 없는 모음은 null — 지어내지 않습니다 */
const VOWEL_YY: Readonly<Record<string, '음' | '양'>> = {
  ㅏ: '양', ㅑ: '양', ㅗ: '양', ㅛ: '양',
  ㅓ: '음', ㅕ: '음', ㅜ: '음', ㅠ: '음', ㅡ: '음', ㅣ: '음',
}

function vowelYinYang(han: string): '음' | '양' | null {
  const c = han.charCodeAt(0) - 0xac00
  if (!Number.isFinite(c) || c < 0 || c > 11171) return null
  return VOWEL_YY[JUNGSEONG[Math.floor((c % 588) / 28)]] ?? null
}

/**
 * 이름의 모음 음양이 «섞여» 있는가.
 * ⚠️ 성명학 판정이 아닙니다 — 「부르기에 결이 다양한가」로만 씁니다.
 * 교재 표에 없는 모음이 섞이면 null (모름) 을 돌려줍니다.
 */
export function vowelMixed(name: string): boolean | null {
  const ys = [...name].map(vowelYinYang)
  if (ys.some((y) => y === null)) return null
  return new Set(ys).size > 1
}

/**
 * 어감/성향 선호 필터 (교재 밖 참고용)
 *
 * ⚠️⚠️ 교재에 «없습니다». 길흉·감점에 쓰지 마십시오. (대표님 확정 2026-08-01)
 *    손님이 «고르는 폭» 을 넓히는 보조 장치일 뿐입니다.
 *    ★끝 음절의 결로 «느슨하게» 가릅니다. 맞고 틀림이 없습니다.
 */
export type NameStyle = '남성적' | '여성적' | '중성적'

/* 어감/성향 선호 필터 (교재 밖 참고용) */
const STYLE_HINT: Record<NameStyle, (name: string) => boolean> = {
  // 받침이 있고 끝소리가 단단한 쪽
  남성적: (n) => !!jongOf(n[n.length - 1]) && !SOFT_JONG.has(jongOf(n[n.length - 1])),
  // 받침이 없거나 울림소리로 열리는 쪽
  여성적: (n) => !jongOf(n[n.length - 1]),
  // 그 사이
  중성적: (n) => SOFT_JONG.has(jongOf(n[n.length - 1])),
}

// ── 후보 만들기 ────────────────────────────────────────────────────

export interface PoolOptions {
  /** 교재 사전을 후보에 넣는가. 기본 true */
  useDict?: boolean
  /**
   * 사전 «밖» 음절 조합도 만드는가. ★기본 false
   *
   * [왜 껐나]  2026-08-01 실측 — 사전만으로 «충분합니다».
   *   성씨 스무 개로 재 보니 80점 이상 후보가 «20~69개» 나옵니다. 열 개 뽑기에 넉넉합니다.
   *   ⚠️ 켜면 「김난강」·「김난건」 처럼 «이름 같지 않은 말» 이 섞입니다.
   *      교재에 실린 이름을 쓰는 쪽이 손님에게 안전합니다.
   *   → 정말 후보가 모자란 성씨가 나오면 그때 켜십시오.
   */
  useSyllables?: boolean
}

/**
 * ★사전 밖 후보 — 사전에 실린 «음절» 을 쪼개 다시 엮습니다.
 *
 * [왜 이렇게 하나]  아무 음절이나 붙이면 «이름 같지 않은 말» 이 나옵니다.
 *   교재 사전에 실제로 쓰인 음절만 쓰면, 조합이 늘어도 «이름다움» 이 유지됩니다.
 *   ⚠️ 사전에 없는 음절을 지어내지 않습니다.
 */
export function buildSyllablePool(): { first: string[]; second: string[] } {
  const first = new Set<string>()
  const second = new Set<string>()
  for (const g of Object.values(NAME_DICT)) {
    for (const n of g.names) {
      if (n.length >= 1) first.add(n[0])
      if (n.length >= 2) second.add(n[1])
    }
  }
  return { first: [...first], second: [...second] }
}

// ── 판정 ───────────────────────────────────────────────────────────

export interface RecommendOptions extends PoolOptions {
  /** 사주가 바라는 기운 */
  yongsin?: Ohaeng | null
  heeksin?: Ohaeng | null
  /** 사주가 꺼리는 기운 */
  gisin?: Ohaeng | null
  gusin?: Ohaeng | null
  /** 몇 개를 돌려줄까. 기본 10 */
  limit?: number
  /**
   * ★「명품작명」 컷라인 (2026-08-01 · 43부 20차 · 대표님 지시)
   *
   *   true 면 «발음오행이 좋음(吉)» 인 이름만 냅니다.
   *
   *  ⚠️⚠️ 여기서 걸 수 있는 것은 «발음오행뿐» 입니다.
   *     [왜]  이 엔진은 «한글 이름» 을 고릅니다. 자원오행과 수리 4격은
   *           «한자를 고른 뒤» 에야 정해집니다 (획수·자원오행이 한자에 붙습니다).
   *           → 그 둘의 컷라인은 Step 3(한자 고르기)에서 걸어야 합니다.
   *     ★여기서 「4격도 좋음만」 이라고 말하면 «지킬 수 없는 약속» 이 됩니다.
   *
   *  ⚠️ 걸러서 열 개가 안 차면 «그대로 냅니다». 억지로 채우지 않습니다 —
   *     채우면 컷라인이 없는 것과 같아집니다.
   */
  premium?: boolean
  /** 울림소리 받침에 가산점을 줄까. 기본 true (★판정 아님 · 어감) */
  softEnding?: boolean
  /** 피할 이름 (항렬자·친척 이름 등). 그대로 걸러 냅니다 */
  avoid?: string[]
  /** 이 음절이 «들어간» 이름을 앞으로 (선호 발음) */
  prefer?: string[]
  /**
   * ★고르신 소리를 «어느 자리에» 넣을지 (2026-08-01 · 43부 6차)
   *
   *   null(안 고름)  이름 «어디든» 들어 있으면 맞습니다 — 예전 그대로
   *   '가운데'       두 글자 이름의 «첫 글자» 자리 (항렬자가 흔히 오는 자리)
   *   '끝'           «마지막 글자» 자리
   *
   * ⚠️ 외자 이름은 «가운데도 끝도» 아닙니다. 한 글자뿐이라 자리가 없습니다.
   *    → 자리를 고르시면 외자는 «맞지 않는» 것으로 봅니다. 거르지는 않습니다.
   * ⚠️ «판정» 이 아닙니다. 교재 밖 취향이라 길흉에 넣지 않습니다 — 차례만 바꿉니다.
   */
  preferPos?: '가운데' | '끝' | null
  /* 어감/성향 선호 필터 (교재 밖 참고용) — ★길흉·감점 아님 */
  style?: NameStyle
  /**
   * 성씨와 같은 소리로 시작하는 이름을 «허용» 할까. 기본 false(뺍니다).
   * ⚠️ 「김김택」·「강강규」 같은 짝을 막습니다. 사전 안에 394건 있습니다.
   */
  allowSurnameEcho?: boolean
  /** 이름 글자 수. 기본 2 */
  givenLength?: 1 | 2
  /**
   * ★같은 첫 글자를 몇 개까지 보여 줄까. 기본 2
   *
   * [왜 필요한가]  2026-08-01 실측 — 없이 돌리면 열 개 가운데 여섯이 「동O」였습니다.
   *   동건·동관·동광·동권·동근·동길 … 손님 눈에는 «거의 같은 이름» 입니다.
   *   점수는 오행 배열로 나오는데, 같은 배열이면 첫 글자가 같은 것끼리 뭉칩니다.
   */
  maxSameFirst?: number
}

export interface NameCandidate {
  /** 이름 (성씨 뺀 것) */
  name: string
  /** 성씨 + 이름 */
  fullName: string
  /** 0~100 — 보관함·화면에 그대로 씁니다 */
  score: number
  /** 1부터 */
  rank: number
  /** ★이 이름의 «소리» 가 담는 기운 (용신·희신 가운데 담긴 것) */
  filled: Ohaeng[]
  /** 발음오행 판정 원본 */
  sound: SoundVerdict
  /** 사전에서 온 이름인가 */
  fromDict: boolean
  /**
   * ★「꼭 넣고 싶은 소리」가 이 이름에 들어 있는가 (2026-08-01 · 43부 3차)
   *
   * ⚠️ 줄 세우기의 «첫 잣대» 입니다 — 아래 out.sort 를 보십시오.
   *    화면이 「이 조건에 맞는 것은 N개」를 적을 때도 씁니다.
   */
  preferHit: boolean
  /** 왜 이 자리인가 — 화면·통변 재료 */
  reasons: string[]
}

/**
 * 점수 배분 — ★바꾸면 걸림 비율을 다시 재십시오 (교훈 BO)
 *
 * [천장을 98로 맞췄습니다] 2026-08-01 대표님 지시
 *   ⚠️ 전에는 «가장 좋은 이름» 도 93점이었습니다.
 *      까닭 — soundEngine 의 만점이 «90» 입니다 (吉 75 + 상생가산 15).
 *      100 으로 나누니 발음 몫이 70 에 못 미쳤습니다.
 *   ★그래서 «90 을 만점으로» 환산합니다. 아래 SOUND_FULL 을 보십시오.
 *
 *   발음 70 + 용신 20 + 어감 8 = 98    ← 가장 좋은 한글 조합
 *   + 고르신 소리가 들어 있으면 2      = 100
 */
export const RECOMMEND_WEIGHT = {
  /** 발음오행(교재 125칸) 몫 — 가장 큽니다 */
  sound: 70,
  /** 사주가 바라는 기운을 소리에 담았는가 */
  yongsin: 20,
  /** 어감 — ★판정이 아닙니다. 울림소리 받침 + 모음 음양 섞임 */
  gamgak: 8,
  /** 고르신 소리가 들어 있을 때 */
  prefer: 2,
} as const

/**
 * ★soundEngine 이 낼 수 있는 «가장 높은 점수».
 *   吉 기준 75 + 상생 둘 가산 15 = 90. 상극이 없으면 더 깎이지 않습니다.
 *   ⚠️ soundEngine 의 SCORE_BASE 를 고치면 이 값도 함께 보십시오.
 */
export const SOUND_FULL = 90

/**
 * 성씨와 사주에 맞는 한글 이름을 줄 세웁니다.
 *
 * ⚠️ 한자는 «아직» 고르지 않았습니다. 자원오행·수리4격은 Step 3 에서 봅니다.
 */
export function recommendNames(
  surname: string,
  opt: RecommendOptions = {},
): NameCandidate[] {
  const limit = opt.limit ?? 10
  const premium = opt.premium === true
  const wantLen = opt.givenLength ?? 2
  const softOn = opt.softEnding !== false
  const avoid = new Set(opt.avoid ?? [])
  const prefer = opt.prefer ?? []
  const preferPos = opt.preferPos ?? null

  /**
   * ★고르신 소리가 «그 자리에» 있는가.
   *
   *   ⚠️ 「가운데」는 두 글자 이름의 앞 글자입니다. 세 글자 이름은 이 서비스에 없습니다
   *      (성 + 이름 한두 글자). 그래서 «앞 = 가운데 · 뒤 = 끝» 로 봅니다.
   *   ⚠️ 자리를 고르셨는데 외자면 «맞지 않음» 입니다 — 넣을 자리가 없습니다.
   */
  const hitsPrefer = (name: string): boolean => {
    if (prefer.length === 0) return false
    const ch = [...name]
    if (!preferPos) return prefer.some((p) => name.includes(p))
    if (ch.length < 2) return false          // 외자 — 자리가 없습니다
    const at = preferPos === '가운데' ? ch[0] : ch[ch.length - 1]
    return prefer.includes(at)
  }
  const surChars = [...surname.trim()].filter(Boolean)
  if (surChars.length === 0) return []

  // ── 후보 모으기 ──
  const pool = new Set<string>()
  if (opt.useDict !== false) {
    for (const g of Object.values(NAME_DICT)) {
      for (const n of g.names) if (n.length === wantLen) pool.add(n)
    }
  }
  // ★기본은 «끔» — 위 useSyllables 설명을 보십시오
  if (opt.useSyllables === true && wantLen === 2) {
    const { first, second } = buildSyllablePool()
    for (const a of first) for (const b of second) pool.add(a + b)
  }

  const dictSet = new Set<string>()
  for (const g of Object.values(NAME_DICT)) for (const n of g.names) dictSet.add(n)

  const want = new Set<Ohaeng>()
  if (opt.yongsin) want.add(opt.yongsin)
  if (opt.heeksin) want.add(opt.heeksin)
  const shun = new Set<Ohaeng>()
  if (opt.gisin) shun.add(opt.gisin)
  if (opt.gusin) shun.add(opt.gusin)

  const out: NameCandidate[] = []

  for (const name of pool) {
    if (avoid.has(name)) continue
    // ⚠️ 피할 이름과 «한 글자라도 겹치면» 걸러 냅니다 (항렬자를 피하는 뜻)
    if (opt.avoid?.some((a) => a.length === 1 && name.includes(a))) continue
    // ★성씨와 «같은 소리» 로 시작하는 이름은 뺍니다 — 「김김택」·「강강규」·「남남경」
    //   [실측] 2026-08-01 — 사전 안에 그런 짝이 394건 있습니다.
    //   ⚠️ 이름 자체가 나쁜 것이 아니라 «그 성씨와» 어색한 것입니다.
    //      다른 성씨에게는 그대로 후보로 나갑니다.
    if (opt.allowSurnameEcho !== true && surChars.length === 1 && name[0] === surChars[0]) continue

    const chars = [
      ...surChars.map((h) => ({ hangul: h, 역할: '성' as const })),
      ...[...name].map((h) => ({ hangul: h, 역할: '이름' as const })),
    ]
    const sound = evaluateSoundOhaeng(chars)
    // ⚠️ 판정할 수 없는 글자가 섞이면 버립니다 — 조용히 넣지 않습니다
    if (sound.elements.some((e) => !e)) continue

    const reasons: string[] = []

    // ① 발음오행 — 교재 125칸
    //   ★90(soundEngine 만점)을 100 으로 보고 환산합니다. 위 SOUND_FULL 설명 참고
    const soundPart = Math.min(1, sound.score / SOUND_FULL) * RECOMMEND_WEIGHT.sound
    if (sound.gyeokPublic) reasons.push(`소리의 흐름은 ${sound.gyeokPublic}`)
    else if (sound.fortune !== '모름') reasons.push(`소리의 흐름 — ${sound.fortune}`)

    // ② 사주가 바라는 기운을 «이름 글자» 가 담았는가
    const givenEls = [...name].map((h) => parseSoundChar(h).ohaeng).filter(Boolean) as Ohaeng[]
    const filled = [...new Set(givenEls.filter((e) => want.has(e)))]
    const shunned = givenEls.filter((e) => shun.has(e)).length
    let yongPart = 0
    if (want.size > 0) {
      yongPart = (filled.length / Math.min(want.size, givenEls.length || 1))
        * RECOMMEND_WEIGHT.yongsin
      yongPart = Math.min(yongPart, RECOMMEND_WEIGHT.yongsin)
      // ★꺼리는 기운이 들어가면 덜어 냅니다
      yongPart -= shunned * (RECOMMEND_WEIGHT.yongsin / 2)
      if (filled.length) reasons.push(`${filled.join('·')} 기운이 소리에 담깁니다`)
      if (shunned > 0) reasons.push('꺼리는 기운이 소리에 섞입니다')
    }

    // ③ 어감 — ★판정이 아닙니다 (대표님 확정)
    //   울림소리 받침 5 + 모음 음양 섞임 3 = 8
    let gamgak = 0
    if (softOn) {
      const soft = softEndingCount(name)
      gamgak += (soft / Math.max(1, name.length)) * 5
      if (soft > 0) reasons.push('울림소리 받침이라 부르기 부드럽습니다')
      const mixed = vowelMixed(name)
      if (mixed === true) {
        gamgak += 3
        reasons.push('밝은 소리와 차분한 소리가 고루 섞였습니다')
      }
      // ⚠️ mixed === null 이면 교재 표에 없는 모음입니다 — «가산도 감산도» 하지 않습니다
    }
    gamgak = Math.min(gamgak, RECOMMEND_WEIGHT.gamgak)

    // ④ 선호 발음·스타일 — 줄 세우기에만 씁니다
    const preferHit = hitsPrefer(name)
    if (preferHit) {
      reasons.push(preferPos
        ? `고르신 소리가 ${preferPos} 자리에 있습니다`
        : '고르신 소리가 들어 있습니다')
    }
    /* 어감/성향 선호 필터 (교재 밖 참고용) */
    if (opt.style && !STYLE_HINT[opt.style](name)) continue

    const score = Math.max(0, Math.min(100,
      soundPart + Math.max(0, yongPart) + gamgak
      + (preferHit ? RECOMMEND_WEIGHT.prefer : 0)))

    out.push({
      name, fullName: surname + name,
      score: Math.round(score * 10) / 10,
      rank: 0,
      filled, sound,
      fromDict: dictSet.has(name),
      preferHit,
      reasons,
    })
  }

  // ══════════════════════════════════════════════════════════════
  //  줄 세우기
  //
  //  ★2026-08-01 (43부 3차) — 「꼭 넣고 싶은 소리」를 «첫 잣대» 로 올렸습니다.
  //
  //   🔴 [무엇이 있었나]  선호 발음은 «2점 가산» 뿐이었습니다.
  //      김씨에게 「민」을 넣어도 1위가 「김난경」이었습니다 — 민이 «한 글자도» 없습니다.
  //      화면의 이름표는 「꼭 넣고 싶은 소리」인데, 엔진은 «살짝 밀어 주기» 였습니다.
  //      ⚠️ 손님은 「입력해도 안 먹는다」고 느끼십니다. 말과 행동이 어긋났습니다.
  //
  //   ★[이제]  그 소리가 든 이름을 «앞줄에» 세웁니다.
  //      ⚠️ «거르는» 것이 아닙니다 — 하나도 없을 때 빈손이 되면 안 되니
  //         뒤에 나머지를 그대로 이어 붙입니다. 손님이 조건을 넓히실 수 있습니다.
  //      ⚠️ 점수는 그대로입니다. 판정을 바꾸는 것이 아니라 «보여 주는 차례» 만 바꿉니다.
  //         (선호는 교재 밖 취향입니다 — 길흉에 넣지 않습니다)
  //
  //   ⚠️ 점수가 같으면 «사전에 실린 이름» 을 앞으로 — 교재에 있는 쪽이 안전합니다
  // ══════════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════
  //  🔴★2026-08-01 (43부 7차) — 자리를 고르시면 «거릅니다»
  //
  //   [무엇이 있었나]  「민」을 «가운데» 로 고르셨는데도
  //     최민교·최민조 아래에 최은도·최우노·최우도 가 «섞여» 나왔습니다.
  //     6차에는 «앞줄 세우기» 만 했기 때문입니다.
  //     ⚠️ 화면은 「민을 넣을 자리 — 가운데」라고 여쭙습니다.
  //        그래 놓고 민이 없는 이름을 내놓으면 «묻고 안 듣는» 셈입니다.
  //
  //   ★[이제]  자리를 «고르신 때만» 거릅니다.
  //     · 자리를 고르셨다  → 그 자리에 그 소리가 있는 이름«만»
  //     · 「상관없음」이다  → 예전 그대로 앞줄 세우기 (거르지 않습니다)
  //   ⚠️ 거른 결과가 «빈손» 일 수 있습니다. 그것이 «사실» 이므로 그대로 냅니다 —
  //      억지로 채우면 다시 「묻고 안 듣는」 화면이 됩니다.
  //      대신 화면이 「그 자리에 둔 이름은 사전에 없어요」라고 미리 알려 드립니다.
  // ══════════════════════════════════════════════════════════════
  //  ⚠️ out 을 «자기 자신으로» 갈아 끼우지 마십시오.
  //     filtered = out 인 상태에서 out.length = 0 을 하면 filtered 도 함께 비어
  //     목록이 «통째로 사라집니다». 걸러야 할 때만 손댑니다.
  if (preferPos && prefer.length > 0) {
    const filtered = out.filter((c) => c.preferHit)
    out.length = 0
    out.push(...filtered)
  }

  // ══════════════════════════════════════════════════════════════
  //  ★「명품작명」 컷라인 — 발음오행이 «좋음» 인 이름만 (43부 20차)
  //
  //   ⚠️ 「보통」도 뺍니다. 명품이라 이름 붙인 자리에 «반길반흉» 을 내밀 수 없습니다.
  //   ⚠️ 사전(교재 1장)에 실린 이름이라도 성씨와 만나면 흉이 될 수 있습니다.
  //      그래서 «사전에 있음» 이 통과권이 되지 않습니다.
  //   ⚠️ 걸러서 하나도 안 남으면 «걸기 전» 으로 되돌립니다 —
  //      빈 화면을 내밀면 손님이 아무것도 못 합니다. 그때는 화면이 알려 드립니다.
  // ══════════════════════════════════════════════════════════════
  if (premium) {
    const good = out.filter((c) => c.sound.grade === '좋음')
    if (good.length > 0) {
      out.length = 0
      out.push(...good)
    }
  }

  out.sort((a, b) =>
    (Number(b.preferHit) - Number(a.preferHit))
    || (b.score - a.score)
    || (Number(b.fromDict) - Number(a.fromDict))
    || a.name.localeCompare(b.name))

  // ── ★첫 글자가 몰리지 않게 ──
  //   점수만으로 자르면 「동건·동관·동광…」 처럼 «같은 이름 여섯 개» 가 됩니다.
  //   첫 글자마다 몇 개까지만 담고, 그래도 모자라면 나머지로 채웁니다.
  const cap = opt.maxSameFirst ?? 2
  const picked: NameCandidate[] = []
  const seen = new Map<string, number>()
  for (const c of out) {
    if (picked.length >= limit) break
    const f = c.name[0]
    const n = seen.get(f) ?? 0
    if (n >= cap) continue
    seen.set(f, n + 1)
    picked.push(c)
  }
  // ⚠️ 첫 글자가 다양하지 못해 덜 찼으면 «점수 순» 으로 메웁니다 — 빈손으로 두지 않습니다
  if (picked.length < limit) {
    for (const c of out) {
      if (picked.length >= limit) break
      if (!picked.includes(c)) picked.push(c)
    }
  }

  return picked.map((c, i) => ({ ...c, rank: i + 1 }))
}
