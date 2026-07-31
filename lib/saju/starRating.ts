// lib/saju/starRating.ts
// 화면 표시용 별점(★1.0~5.0) — 관점별 100점 → 0.5 단위 별점
//
// ══════════════════════════════════════════════════════════════════
//  [왜 이 파일이 생겼나]  2026-07-30 · 3단계-b (대표님 지시)
//
//    2·3단계가 judgeResource 로 «0~100 정밀 점수» 를 만들었습니다.
//    그것을 손님 화면에 별점으로 보여 주기 위한 변환기입니다.
//
//  ⚠️⚠️ **방침이 바뀌는 자리입니다 — 알고 쓰십시오.**
//    naming.ts:8 에 이렇게 적혀 있습니다 (대표님이 세우신 것) —
//        「"좋다/나쁘다" 판정하지 않는다. 화면엔 등급(grade)을 노출하지 않는다.」
//    별점은 «등급» 입니다. 이 파일을 화면에 붙이는 순간 그 방침이 바뀝니다.
//
//    ★다만 대표님 지시의 라벨표는 그 취지를 지키도록 설계돼 있습니다 —
//        · 하한이 ★2.5 입니다. ★1.0·★2.0 이 «나올 수 없습니다»
//          (처음 지시는 ★3.0 이었고, 2026-07-30 대표님이 ★2.5 로 내리셨습니다.
//           낮은 쪽을 한 칸 더 갈라 «참고 · 보완 권장» 과 «살펴볼 자리가 여럿» 을 구분합니다)
//        · 가장 낮은 칸의 말이 「참고 / 보완 권장」 입니다 (흉·불길이 아닙니다)
//      즉 «가르는 등급» 이 아니라 «어느 쪽을 더 살펴볼지» 를 가리키는 눈금입니다.
//
//    ⚠️ 그래서 되돌릴 수 있게 두었습니다 — 화면에서 이 컴포넌트만 빼면 예전 그대로입니다.
//       AI 프롬프트는 «건드리지 않았습니다». AI 는 여전히 점수·등급을 말하지 않습니다.
//       (화면은 별을 보여 주고 글은 담담히 서술 — 둘이 서로 어긋나지 않습니다)
// ══════════════════════════════════════════════════════════════════

/** 별점은 0.5 단위입니다 */
export type Star = 2.5 | 3.0 | 3.5 | 4.0 | 4.5 | 5.0

export interface StarBand {
  /** 이 점수 «이상» 이면 이 칸 */
  min: number
  star: Star
  /** 화면에 쓰는 말 */
  label: string
  /** 어조 — 화면 색·아이콘을 고를 때 씁니다 */
  tone: 'high' | 'good' | 'mid' | 'watch'
}

/**
 * ★대표님 지시의 라벨표 — **이것이 기준입니다.**
 *
 * ⚠️⚠️ 지시에 함께 주신 공식 `ROUND(Score / 100 * 10) / 2` 는
 *      이 라벨표와 **17개 표본 가운데 14개에서 어긋납니다.**
 *
 *        점수   공식      라벨표
 *         90    ★4.5  ≠  ★5.0
 *         75    ★4.0  ≠  ★4.5
 *         60    ★3.0  ≠  ★4.0
 *         45    ★2.5  ≠  ★3.5
 *          0    ★0.0  ≠  ★2.5   ← 공식에는 하한이 없습니다
 *
 *      공식대로 하면 «★0.0·★1.0» 이 손님 화면에 나옵니다.
 *      라벨표의 취지(하한 ★3.0 · 단정적 부정어 금지)와 맞지 않으므로
 *      **라벨표를 기준으로 삼았습니다.**
 *      ★공식 쪽이 맞다고 보시면 아래 starRaw() 로 바꾸시면 됩니다. 한 줄입니다.
 */
export const STAR_BANDS: readonly StarBand[] = [
  { min: 90, star: 5.0, label: '매우 조화로움', tone: 'high' },
  { min: 75, star: 4.5, label: '우수함', tone: 'good' },
  { min: 60, star: 4.0, label: '좋음', tone: 'good' },
  { min: 45, star: 3.5, label: '보통 · 살펴볼 자리', tone: 'mid' },
  { min: 30, star: 3.0, label: '참고 · 보완 권장', tone: 'watch' },
  // ★2026-07-30 — 하한을 ★3.0 → ★2.5 로 내리며 낮은 칸을 둘로 갈랐습니다.
  //   ⚠️ 말은 여전히 «단정» 이 아닙니다 — 흉·불길·나쁨을 쓰지 않습니다.
  //      「자리가 여럿」은 «몇 군데를 함께 보자» 는 뜻이지 «나쁘다» 가 아닙니다.
  { min: 0, star: 2.5, label: '살펴볼 자리가 여럿', tone: 'watch' },
] as const

/** 손님 화면에 나올 수 있는 «가장 낮은» 별 — ★이 아래로 내려가지 않습니다 */
export const STAR_FLOOR: Star = 2.5

export interface StarResult {
  star: Star
  label: string
  tone: StarBand['tone']
  /** 별을 만든 원점수 (0~100) — ★손님 화면에 쓰지 마십시오. 진단용입니다 */
  score: number
  /** 하한(용신 보장)이 걸려 올라갔는가 */
  lifted: boolean
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

/**
 * ★기본 변환. 점수(0~100) → 별점.
 * 하한이 ★2.5 라 아무리 낮아도 그 아래로 내려가지 않습니다.
 */
export function starOf(score: number): StarResult {
  const s = clamp(Number.isFinite(score) ? score : 0, 0, 100)
  const band = STAR_BANDS.find(b => s >= b.min) ?? STAR_BANDS[STAR_BANDS.length - 1]
  return { star: band.star, label: band.label, tone: band.tone, score: Math.round(s), lifted: false }
}

/**
 * 지시서에 적힌 «원 공식» 그대로. 참고용으로만 남깁니다.
 * ⚠️ 하한이 없어 ★0.0~★2.5 가 나옵니다. 화면에 쓰지 마십시오.
 */
export function starRaw(score: number): number {
  return Math.round(clamp(score, 0, 100) / 100 * 10) / 2
}

// ══════════════════════════════════════════════════════════════════
//  ★용신 하한 — 「용신을 담았으면 최소 ★3.5」
// ══════════════════════════════════════════════════════════════════
//
//  [왜]  이름이 «사주가 바라는 기운» 을 제대로 담았다면, 소소한 감점이 겹쳐도
//        손님에게 «보완 권장» 으로 보이지 않게 합니다. (대표님 지시 2)
//
//  ⚠️ 지시에 「최소 ★3.5(60점)」이라 적혀 있는데, 라벨표에서 60점은 ★4.0 입니다.
//     별 값(★3.5)을 따랐습니다. ★4.0 으로 올리시려면 아래 상수 하나만 고치면 됩니다.
export const YONGSIN_FLOOR: Star = 3.5

/**
 * 용신을 담았으면 별점에 하한을 씌웁니다.
 * @param hasYongsin 이름(성 제외)에 용신이 «주 자원오행» 으로 담겼는가
 */
export function applyYongsinFloor(r: StarResult, hasYongsin: boolean): StarResult {
  if (!hasYongsin || r.star >= YONGSIN_FLOOR) return r
  const band = STAR_BANDS.find(b => b.star === YONGSIN_FLOOR)!
  return { ...r, star: band.star, label: band.label, tone: band.tone, lifted: true }
}

// ══════════════════════════════════════════════════════════════════
//  관점 다섯의 별점
// ══════════════════════════════════════════════════════════════════

export type PerspectiveKey = 'yinyang' | 'baleum' | 'suri' | 'jawon' | 'yongsin'

export interface PerspectiveStar extends StarResult {
  key: PerspectiveKey
  title: string
  /**
   * ★점수가 «정밀» 한가.
   *   false 면 3단 등급(좋음/보통/아쉬움)에서 옮긴 값이라 별이 세 가지뿐입니다.
   *   ★2026-07-31 (40부) — 발음은 «정밀» 로 바뀌었습니다 (교재 125칸 · 별 5칸).
   *   음양·수리는 아직 3단입니다.
   */
  precise: boolean
}

/** 3단 등급 → 점수. ★라벨표 칸의 «가운데» 로 옮깁니다 */
export function gradeToScore(g: '좋음' | '보통' | '아쉬움'): number {
  return g === '좋음' ? 80 : g === '보통' ? 52 : 40
}

export interface StarInput {
  /** judgeResource 의 breakdown.flow (0~W_FLOW) 와 배점 */
  flowScore: number
  flowMax: number
  /** judgeResource 의 yongsin + balance 와 그 배점 합 */
  matchScore: number
  matchMax: number
  /** 이름에 용신이 담겼는가 — 하한 판정에 씁니다 */
  hasYongsin: boolean
  /** diagnoseName 의 3단 등급들 */
  yinYangGrade: '좋음' | '보통' | '아쉬움'
  suriGrade: '좋음' | '보통' | '아쉬움'
  /**
   * ★2026-07-31 (40부) — 발음오행은 «등급» 이 아니라 «점수» 를 받습니다.
   *   diagnoseName().soundFlow.score (0~100) 를 그대로 넣으십시오.
   *
   * ⚠️ 옛 `soundGrade` 를 지운 것은 «일부러» 입니다 — 남겨 두면 어느 화면이
   *    옛 길로 가도 컴파일이 통과해 버립니다. 2-10장이 그렇게 갈렸습니다. (교훈 ET)
   */
  soundScore: number
}

/**
 * 다섯 관점의 별점을 한 번에 만듭니다.
 *
 * ⚠️ ④자원오행 = «배치(흐름)» 칸, ⑤사주와의 만남 = «용신 충족 + 균형» 칸입니다.
 *    judgeResource 의 총점을 그냥 둘로 나눈 것이 아니라, breakdown 의 칸을 각각 씁니다.
 *    → 화면의 두 대목과 점수의 두 칸이 «같은 것» 을 가리킵니다.
 */
export function perspectiveStars(v: StarInput): PerspectiveStar[] {
  const pct = (x: number, max: number) => (max > 0 ? clamp((x / max) * 100, 0, 100) : 0)

  const jawon = starOf(pct(v.flowScore, v.flowMax))
  // ★용신 하한은 «사주와의 만남» 에만 겁니다 (대표님 지시 2)
  const yongsin = applyYongsinFloor(starOf(pct(v.matchScore, v.matchMax)), v.hasYongsin)

  return [
    { key: 'yinyang', title: '음양오행', precise: false, ...starOf(gradeToScore(v.yinYangGrade)) },
    // ★2026-07-31 (40부) — 교재 125칸 조회로 바뀌며 «정밀» 해졌습니다 (별 5칸)
    { key: 'baleum', title: '발음오행', precise: true, ...starOf(v.soundScore) },
    { key: 'suri', title: '수리오행', precise: false, ...starOf(gradeToScore(v.suriGrade)) },
    { key: 'jawon', title: '자원오행', precise: true, ...jawon },
    { key: 'yongsin', title: '사주와의 만남', precise: true, ...yongsin },
  ]
}

/**
 * 다섯 관점을 아우르는 «종합» 별점.
 * ⚠️ 관점의 무게는 candidateScore 와 같은 잣대를 씁니다 (자원+용신 66.7 · 수리 20 · 발음 13.3).
 *    음양은 종합에서 제외합니다 — naming.ts 의 옛 종합식도 음양을 뺐습니다.
 */
export function overallStar(stars: PerspectiveStar[], hasYongsin: boolean): StarResult {
  const by = (k: PerspectiveKey) => stars.find(s => s.key === k)?.score ?? 0
  const s = (by('jawon') * 0.5 + by('yongsin') * 0.5) * (5 / 7.5)
    + by('suri') * (1.5 / 7.5)
    + by('baleum') * (1 / 7.5)
  return applyYongsinFloor(starOf(s), hasYongsin)
}

// ══════════════════════════════════════════════════════════════════
//  화면 표시 도구
// ══════════════════════════════════════════════════════════════════

/** 별을 글자로 — ★★★★☆ 꼴. 반쪽은 ⯨ 대신 ☆ 로 둡니다(글꼴 호환) */
export function starGlyphs(star: Star): { full: number; half: number; empty: number } {
  const full = Math.floor(star)
  const half = star % 1 >= 0.5 ? 1 : 0
  return { full, half, empty: 5 - full - half }
}

/** 별 옆에 쓰는 짧은 말 — ★손님 화면용 */
export function starText(r: StarResult): string {
  return `★${r.star.toFixed(1)} ${r.label}`
}
