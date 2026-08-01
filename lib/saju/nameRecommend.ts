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
  /** 울림소리 받침에 가산점을 줄까. 기본 true (★판정 아님 · 어감) */
  softEnding?: boolean
  /** 피할 이름 (항렬자·친척 이름 등). 그대로 걸러 냅니다 */
  avoid?: string[]
  /** 이 음절이 «들어간» 이름을 앞으로 (선호 발음) */
  prefer?: string[]
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
  /** 왜 이 자리인가 — 화면·통변 재료 */
  reasons: string[]
}

/** 점수 배분 — ★바꾸면 걸림 비율을 다시 재십시오 (교훈 BO) */
export const RECOMMEND_WEIGHT = {
  /** 발음오행(교재 125칸) 몫 — 가장 큽니다 */
  sound: 70,
  /** 사주가 바라는 기운을 소리에 담았는가 */
  yongsin: 20,
  /** 어감(울림소리 받침) — ★작게 둡니다. 판정이 아닙니다 */
  gamgak: 10,
} as const

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
  const wantLen = opt.givenLength ?? 2
  const softOn = opt.softEnding !== false
  const avoid = new Set(opt.avoid ?? [])
  const prefer = opt.prefer ?? []
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

    const chars = [
      ...surChars.map((h) => ({ hangul: h, 역할: '성' as const })),
      ...[...name].map((h) => ({ hangul: h, 역할: '이름' as const })),
    ]
    const sound = evaluateSoundOhaeng(chars)
    // ⚠️ 판정할 수 없는 글자가 섞이면 버립니다 — 조용히 넣지 않습니다
    if (sound.elements.some((e) => !e)) continue

    const reasons: string[] = []

    // ① 발음오행 — 교재 125칸
    const soundPart = (sound.score / 100) * RECOMMEND_WEIGHT.sound
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
    let gamgak = 0
    if (softOn) {
      const soft = softEndingCount(name)
      gamgak = (soft / Math.max(1, name.length)) * RECOMMEND_WEIGHT.gamgak
      if (soft > 0) reasons.push('울림소리 받침이라 부르기 부드럽습니다')
    }

    // ④ 선호 발음 — 줄 세우기에만 씁니다
    const preferHit = prefer.some((p) => name.includes(p))
    if (preferHit) reasons.push('고르신 소리가 들어 있습니다')

    const score = Math.max(0, Math.min(100,
      soundPart + Math.max(0, yongPart) + gamgak + (preferHit ? 3 : 0)))

    out.push({
      name, fullName: surname + name,
      score: Math.round(score * 10) / 10,
      rank: 0,
      filled, sound,
      fromDict: dictSet.has(name),
      reasons,
    })
  }

  // ── 줄 세우기 ──
  //   ⚠️ 점수가 같으면 «사전에 실린 이름» 을 앞으로 — 교재에 있는 쪽이 안전합니다
  out.sort((a, b) =>
    (b.score - a.score)
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
