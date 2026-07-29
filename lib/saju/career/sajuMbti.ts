// lib/saju/career/sajuMbti.ts
//
// ┌──────────────────────────────────────────────────────────────────┐
// │  사주 점수로 MBTI 네 축을 잰다                                      │
// │  2026-07-29                                                       │
// └──────────────────────────────────────────────────────────────────┘
//
// ── ⚠️ 먼저 밝혀 둘 것 ────────────────────────────────────────────────
//   이 산식은 **교재에 없습니다.** 대표님이 정해 주신 것을 그대로 옮긴 것입니다.
//   명리와 MBTI 는 뿌리가 다른 체계라, 교재 어디에도 짝짓는 근거가 없습니다.
//   ★그러니 이것은 «재미와 이해를 돕는 참고»이지 판정이 아닙니다.
//     화면 문구와 통변 지시에도 그렇게 적어 두었습니다. 단정하지 마십시오.
//
//   대표님 확정 산식 (2026-07-29)
//     E : (양의 오행 + 화·목 + 식상·비겁)   vs  I : (음의 오행 + 수·금 + 인성)
//     S : (재성 + 관성 + 토)                vs  N : (식상 + 인성 + 화)
//     T : (금 + 관성 + 양인·백호)           vs  F : (수 + 목 + 인성 + 도화)
//     J : (관성 + 정재)                     vs  P : (비겁 + 식상 + 편재)
//
// ── ⚠️ 여기서 새로 계산하지 않는 것 ───────────────────────────────────
//   오행 100점   calcCareerScore (그 안에서 simsanOhaeng) — 한 곳에서만 잰다
//   육친 묶음    yukchinOf
//   신살         checkSinsal9
//   이 파일은 **그것들을 받아 네 축으로 접기만** 합니다. (교훈 BQ)
//
// ── 산식을 읽는 법 ────────────────────────────────────────────────────
//   각 축은 «양쪽 점수»를 모아 비율을 냅니다. 어느 쪽도 0 이 아니게 하려고
//   최소 1점을 깔아 둡니다(0 나누기 방지 + 100:0 같은 극단 표시 방지).
//   ★사람은 어느 한쪽으로만 되어 있지 않습니다. 화면에도 그렇게 보여야 합니다.

import type { Ohaeng, Pillar } from './types'
import { calcCareerScore } from './careerScore'
import { yukchinOf } from './yukchin'
import { checkSinsal9 } from './sinsal9'

export type MbtiAxis = 'EI' | 'SN' | 'TF' | 'JP'

export interface AxisResult {
  axis: MbtiAxis
  /** 왼쪽 글자 (E·S·T·J) */
  left: string
  /** 오른쪽 글자 (I·N·F·P) */
  right: string
  leftScore: number
  rightScore: number
  /** 왼쪽이 차지하는 비율 0~100 (화면 막대에 쓴다) */
  leftPct: number
  /** 이긴 쪽 글자 */
  pick: string
  /** 왜 그렇게 나왔는지 한 줄 — 화면에 그대로 나간다 */
  why: string
}

export interface SajuMbtiResult {
  /** 네 글자 (예: 'ISTP') */
  code: string
  /** 칭호 (예: '냉철한 자율 전문가') */
  title: string
  axes: AxisResult[]
  /** 어느 축도 뚜렷하지 않은가 — 45~55% 사이가 둘 이상 */
  balanced: boolean
}

/** 천간 음양 — 甲丙戊庚壬이 양 */
const YANG_STEM = new Set(['甲', '丙', '戊', '庚', '壬'])
/** 지지 음양 — 子寅辰午申戌이 양 */
const YANG_BRANCH = new Set(['子', '寅', '辰', '午', '申', '戌'])
const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

/** 16유형 칭호 — 사주 결로 지은 이름입니다 (MBTI 공식 명칭이 아닙니다) */
const TITLE: Record<string, string> = {
  ISTJ: '묵묵한 원칙주의자', ISFJ: '조용히 지키는 사람', INFJ: '깊이 헤아리는 사람', INTJ: '멀리 보는 설계자',
  ISTP: '냉철한 자율 전문가', ISFP: '결이 고운 실행가', INFP: '마음이 넓은 이상가', INTP: '파고드는 탐구자',
  ESTP: '판을 읽는 승부사', ESFP: '분위기를 여는 사람', ENFP: '불을 지피는 사람', ENTP: '길을 새로 내는 사람',
  ESTJ: '판을 세우는 관리자', ESFJ: '두루 챙기는 조력자', ENFJ: '사람을 이끄는 사람', ENTJ: '앞장서는 지휘자',
}

/** 점수 이름을 한 줄 근거로 옮긴다 */
function reason(parts: Array<[string, number]>): string {
  const shown = parts.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3)
  if (!shown.length) return '뚜렷하게 기운 곳이 없습니다'
  return shown.map(([k, v]) => `${k} ${Math.round(v)}`).join(' · ')
}

/**
 * 사주 점수로 MBTI 네 축을 잰다.
 *
 * @param saju 네 기둥
 * @param solarMonth·solarDay·hourBranch  오행 점수를 내는 데 필요 (calcCareerScore 와 같은 인자)
 */
export function calcSajuMbti(
  saju: Pillar[], solarMonth: number, solarDay: number, hourBranch: string | null,
): SajuMbtiResult {
  const r = calcCareerScore(saju, solarMonth, solarDay, hourBranch)
  const S = r.score                       // 오행 점수 (합 100)
  const dayStem = saju.find(p => p.pillar === '일주')?.stem ?? ''
  const dayEl = STEM_EL[dayStem] ?? '토'

  // ── 육친 묶음별 점수 ──
  const Y: Record<string, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 }
  for (const el of ['목', '화', '토', '금', '수'] as Ohaeng[]) {
    Y[yukchinOf(dayEl, el)] += S[el] ?? 0
  }

  // ── 음양 — 여덟 글자 가운데 양이 몇인가 ──
  let yang = 0, eum = 0
  for (const p of saju) {
    if (p.stem && p.stem !== '?') { if (YANG_STEM.has(p.stem)) yang++; else eum++ }
    if (p.branch && p.branch !== '?') { if (YANG_BRANCH.has(p.branch)) yang++; else eum++ }
  }
  // 글자 수를 점수 결로 맞춘다 (8글자 → 100 기준)
  const yangPt = yang * 6
  const eumPt = eum * 6

  // ── 신살 — 양인·백호 / 도화 ──
  const hits = checkSinsal9(saju)
  const hasName = (n: string) => hits.some(h => h.name.includes(n))
  const yanginBaekho = (hasName('양인') ? 10 : 0) + (hasName('백호') ? 10 : 0)
  const dohwa = hasName('도화') ? 12 : 0

  // ── 정재/편재 · 정관/편관 가르기 ──
  //   교재식으로 «일간과 음양이 같으면 편, 다르면 정»입니다.
  //   재성·관성 점수를 그 비율로 나눠 씁니다.
  const dayYang = YANG_STEM.has(dayStem)
  let jaeJeong = 0, jaePyeon = 0, gwanJeong = 0
  for (const p of saju) {
    for (const [ch, isStem] of [[p.stem, true], [p.branch, false]] as Array<[string, boolean]>) {
      if (!ch || ch === '?') continue
      const el = isStem ? STEM_EL[ch] : undefined
      if (!el) continue
      const grp = yukchinOf(dayEl, el)
      const chYang = isStem ? YANG_STEM.has(ch) : YANG_BRANCH.has(ch)
      const jeong = chYang !== dayYang      // 음양이 다르면 정(正)
      if (grp === '재성') { if (jeong) jaeJeong++; else jaePyeon++ }
      if (grp === '관성' && jeong) gwanJeong++
    }
  }
  const jaeTotal = Math.max(1, jaeJeong + jaePyeon)
  const jeongJae = (Y['재성'] * jaeJeong) / jaeTotal
  const pyeonJae = (Y['재성'] * jaePyeon) / jaeTotal
  void gwanJeong   // 정관/편관 구분은 지금 산식에 안 쓰이나, 뒤에 쓸 자리를 남겨 둔다

  // ── 네 축 ──────────────────────────────────────────────────────
  const axes: AxisResult[] = []
  const push = (
    axis: MbtiAxis, left: string, right: string,
    L: Array<[string, number]>, R: Array<[string, number]>,
  ) => {
    const rawL = L.reduce((a, [, v]) => a + v, 0)
    const rawR = R.reduce((a, [, v]) => a + v, 0)
    // ★양쪽에 «바닥»을 깔아 준다.
    //   [왜] 관성이 하나도 없는 명식이면 J 쪽이 0 이 되어 «1:99» 같은 막대가 나옵니다.
    //        숫자로는 맞지만 사람을 그렇게 그리면 안 됩니다.
    //        아무리 한쪽으로 기운 사람도 다른 쪽 결을 조금은 씁니다.
    //   [얼마나] 그 축 총점의 15%. 고정값을 쓰면 축마다 총점이 달라 들쭉날쭉합니다.
    //   ⚠️ 이 숫자도 교재가 아니라 우리가 정한 것입니다. 화면 인상을 보고 조절하십시오.
    const floor = (rawL + rawR) * 0.15 || 1
    const ls = rawL + floor
    const rs = rawR + floor
    const leftPct = Math.round((ls / (ls + rs)) * 100)
    const pick = leftPct >= 50 ? left : right
    axes.push({
      axis, left, right,
      leftScore: Math.round(rawL), rightScore: Math.round(rawR), leftPct, pick,
      why: leftPct >= 50 ? reason(L) : reason(R),
      // ⚠️ leftScore·rightScore 는 «바닥을 빼고» 실제 점수를 담습니다.
      //    막대(leftPct)와 숫자가 다른 것은 그 때문입니다.
    })
  }

  // E vs I — 밖으로 뻗는 기운 vs 안으로 모으는 기운
  push('EI', 'E', 'I',
    [['양의 기운', yangPt], ['화', S['화']], ['목', S['목']], ['식상', Y['식상']], ['비겁', Y['비겁']]],
    [['음의 기운', eumPt], ['수', S['수']], ['금', S['금']], ['인성', Y['인성']]])

  // S vs N — 눈앞의 실제 vs 그림과 뜻
  push('SN', 'S', 'N',
    [['재성', Y['재성']], ['관성', Y['관성']], ['토', S['토']]],
    [['식상', Y['식상']], ['인성', Y['인성']], ['화', S['화']]])

  // T vs F — 잣대로 자르는 결 vs 마음으로 품는 결
  push('TF', 'T', 'F',
    [['금', S['금']], ['관성', Y['관성']], ['양인·백호', yanginBaekho]],
    [['수', S['수']], ['목', S['목']], ['인성', Y['인성']], ['도화', dohwa]])

  // J vs P — 정해 두고 가는 결 vs 열어 두고 가는 결
  push('JP', 'J', 'P',
    [['관성', Y['관성']], ['정재', jeongJae]],
    [['비겁', Y['비겁']], ['식상', Y['식상']], ['편재', pyeonJae]])

  const code = axes.map(a => a.pick).join('')
  const balanced = axes.filter(a => a.leftPct >= 45 && a.leftPct <= 55).length >= 2

  return { code, title: TITLE[code] ?? '고유한 결', axes, balanced }
}

// ═══════════════════════════════════════════════════════════════
//  사주 MBTI ↔ 실제 MBTI 견주기
// ═══════════════════════════════════════════════════════════════

export interface MbtiCompare {
  /** 네 축 가운데 몇 개가 같은가 */
  same: number
  /** 다른 축의 이름 (예: ['E/I', 'T/F']) */
  diffAxes: string[]
  headline: string
  body: string
}

const AXIS_LABEL: Record<MbtiAxis, string> = {
  EI: '나서는 결', SN: '보는 결', TF: '고르는 결', JP: '맺는 결',
}

/**
 * 타고난 결(사주)과 지금의 결(실제 MBTI)을 견준다.
 *
 *   ★"틀렸다"고 말하지 않습니다. 다른 것은 살아오며 길러 낸 결입니다.
 *     교훈 AX 와 같은 자리입니다 — 겁주거나 깎아내리지 않습니다.
 */
export function compareMbti(saju: SajuMbtiResult, real: string): MbtiCompare | null {
  const R = (real ?? '').toUpperCase().trim()
  if (!/^[EI][SN][TF][JP]$/.test(R)) return null

  const diffAxes: string[] = []
  let same = 0
  saju.axes.forEach((a, i) => {
    if (a.pick === R[i]) same++
    else diffAxes.push(AXIS_LABEL[a.axis])
  })

  if (same === 4) {
    return {
      same, diffAxes,
      headline: '타고난 결과 지금의 결이 그대로 겹칩니다',
      body: '사주가 가리키는 방향과 스스로 아는 성향이 같습니다. 억지로 자신을 바꿔 쓰지 않아도 되는 자리라, 힘이 덜 들고 오래 갑니다. 잘하는 쪽으로 더 밀어도 좋습니다.',
    }
  }
  if (same === 0) {
    return {
      same, diffAxes,
      headline: '타고난 결과 지금의 결이 크게 다릅니다',
      body: '이건 어긋난 것이 아니라, 살아오며 필요해서 다른 쪽 근육을 키우신 것입니다. 두 결을 다 쓸 수 있다는 뜻이라 쓰임이 넓습니다. 다만 오래 쓰면 지치는 쪽이 있으니, 힘들 때 돌아갈 자리가 타고난 쪽이라는 것만 기억해 두십시오.',
    }
  }
  return {
    same, diffAxes,
    headline: `네 결 가운데 ${same}가지가 겹칩니다`,
    body: `${diffAxes.join('과 ')}에서 타고난 쪽과 지금 쪽이 갈립니다. 갈리는 자리가 오히려 반전이 되는 곳입니다. 남들이 예상하지 못한 방식으로 일을 풀 수 있고, 그 자리가 이 분만의 강점이 됩니다.`,
  }
}
