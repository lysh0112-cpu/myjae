// 34-measure-saju-mbti.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  사주 MBTI 산식 — «무엇을 얼마나» 바꾸는가. 자(尺)입니다        │
// └───────────────────────────────────────────────────────────────┘
//
//  ★2026-08-03 — 교재 대조로 드러난 세 가지를 재기 위해 지었습니다.
//    ⚠️ 이것은 «검사» 가 아니라 «자» 입니다. verify 체인에 넣지 마십시오.
//       배포가 느려지고, 임의 표본이라 값이 조금씩 흔들립니다.
//
//  쓰는 법   npm run measure:mbti
//
//  ══ 무엇을 견주는가 ══
//   후보0   지금 산식 (2026-07-29 대표님 확정본을 그대로 옮긴 코드)
//   후보A   ★오행·육친 «이중 계산» 풀기      — 교재 40쪽
//   후보C1  ★50점 문턱 뚜껑                  — 교재 25·259쪽
//   후보D   ★근거 없는 셋 빼기               — 관성(S) · 화(N) · 백호(T)
//   ★확정   A + C1 + D  (2026-08-03 대표님 지시)
//
//  ⚠️⚠️ 이 파일은 «재기만» 합니다.
//     sajuMbti.ts 를 비롯한 어떤 엔진도 «고치지 않습니다».
//     후보들은 이 파일 «안» 에 따로 구현해 견줍니다.
//
//  ⚠️ 표본은 «임의로 지은» 사주입니다. 손님 기록을 쓰지 «않습니다».

import { calcSajuMbti } from './lib/saju/career/sajuMbti'
import { calcCareerScore } from './lib/saju/career/careerScore'
import { yukchinOf } from './lib/saju/career/yukchin'
import { checkSinsal9 } from './lib/saju/career/sinsal9'
import type { Ohaeng, Pillar } from './lib/saju/career/types'

const GAN = '甲乙丙丁戊己庚辛壬癸'.split('')
const JI = '子丑寅卯辰巳午未申酉戌亥'.split('')
const EL5: Ohaeng[] = ['목', '화', '토', '금', '수']

/** 월지 → 양력 한가운데 날짜 (절기 경계를 피해 가운데로) — 31-measure 와 같은 표 */
const SOLAR: Record<string, [number, number]> = {
  寅: [2, 20], 卯: [3, 20], 辰: [4, 20], 巳: [5, 20], 午: [6, 20], 未: [7, 20],
  申: [8, 20], 酉: [9, 20], 戌: [10, 20], 亥: [11, 20], 子: [12, 20], 丑: [1, 20],
}

const YANG_STEM = new Set(['甲', '丙', '戊', '庚', '壬'])
/** ★음양 «비율» 을 셀 때 — 교재 260쪽 양팔통 사례(甲辰·甲戌·壬寅·庚子)가 子를 양으로 봅니다 */
const YANG_BRANCH = new Set(['子', '寅', '辰', '午', '申', '戌'])
/** ★십성을 가릴 때 — 교재 48쪽 도표(지지의 본기 천간). 子=癸(음) · 午=丁(음) */
const BRANCH_BONGI: Record<string, string> = {
  子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙',
  午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬',
}
const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

const R = (n: number) => Math.floor(Math.random() * n)
const pc = (x: number, n: number) => (x / n * 100).toFixed(2) + '%'

/** ★60갑자에 «실재하는» 짝만 씁니다 (양간-양지 / 음간-음지) */
function gapja(i: number): { stem: string; branch: string } {
  return { stem: GAN[i % 10], branch: JI[i % 12] }
}

// ══════════════════════════════════════════════════════════════
//  후보 산식들 — ★이 파일 «안» 에만 있습니다
// ══════════════════════════════════════════════════════════════

interface Bag {
  S: Record<Ohaeng, number>   // 오행 100점
  Y: Record<string, number>   // 육친 묶음 점수
  yangPt: number; eumPt: number
  yangin: number; baekho: number; dohwa: number
  jeongJae: number; pyeonJae: number
}

/** 재료 모으기 — ★엔진을 «부르기만» 합니다 */
function gather(saju: Pillar[], sm: number, sd: number, hb: string, useBongi: boolean): Bag {
  const r = calcCareerScore(saju, sm, sd, hb)
  const S = r.score as Record<Ohaeng, number>
  const dayStem = saju.find(p => p.pillar === '일주')?.stem ?? ''
  const dayEl = STEM_EL[dayStem] ?? '토'

  const Y: Record<string, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 }
  for (const el of EL5) Y[yukchinOf(dayEl, el)] += S[el] ?? 0

  let yang = 0, eum = 0
  for (const p of saju) {
    if (p.stem && p.stem !== '?') { if (YANG_STEM.has(p.stem)) yang++; else eum++ }
    if (p.branch && p.branch !== '?') { if (YANG_BRANCH.has(p.branch)) yang++; else eum++ }
  }

  const hits = checkSinsal9(saju)
  const has = (n: string) => hits.some(h => h.name.includes(n))

  // ── 정재/편재 가르기 ──
  const dayYang = YANG_STEM.has(dayStem)
  let jJ = 0, jP = 0
  for (const p of saju) {
    // 천간
    for (const ch of [p.stem]) {
      if (!ch || ch === '?') continue
      const el = STEM_EL[ch]; if (!el) continue
      if (yukchinOf(dayEl, el) !== '재성') continue
      if (YANG_STEM.has(ch) !== dayYang) jJ++; else jP++
    }
    // ★지지 — 후보B(확정안에 포함)에서만 셉니다. 48쪽 본기 천간으로 봅니다
    if (useBongi) {
      const ch = p.branch
      if (!ch || ch === '?') continue
      const bg = BRANCH_BONGI[ch]; if (!bg) continue
      const el = STEM_EL[bg]; if (!el) continue
      if (yukchinOf(dayEl, el) !== '재성') continue
      if (YANG_STEM.has(bg) !== dayYang) jJ++; else jP++
    }
  }
  const tot = Math.max(1, jJ + jP)
  return {
    S, Y, yangPt: yang * 6, eumPt: eum * 6,
    yangin: has('양인') ? 10 : 0, baekho: has('백호') ? 10 : 0, dohwa: has('도화') ? 12 : 0,
    jeongJae: (Y['재성'] * jJ) / tot, pyeonJae: (Y['재성'] * jP) / tot,
  }
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
/** 지금 방식 — 바닥 15% 를 깔고 비율을 냅니다 */
function pick(L: number, Rr: number, left: string, right: string): string {
  const floor = (L + Rr) * 0.15 || 1
  return (L + floor) / (L + floor + Rr + floor) >= 0.5 ? left : right
}
/** ★후보C-1 — 50점 넘는 몫은 «세지 않습니다» (교재 259쪽 「50점 이상은 단점으로 발현」) */
const cap = (v: number) => Math.min(v, 50)

/**
 * 후보0 — ★«옛» 산식 (2026-08-03 이전).
 *
 *  ⚠️⚠️ 일부러 이 파일 «안» 에 붙박아 두었습니다.
 *    sajuMbti.ts 를 부르면, 그 파일이 바뀌는 순간 «잣대가 함께 움직여»
 *    무엇이 얼마나 달라졌는지 영영 알 수 없게 됩니다.
 *    ★옛 모습은 여기 남겨 둡니다. 지우지 마십시오.
 *  ⚠️ 옛 산식은 지지를 안 세었으므로 bagPlain(useBongi=false)을 받습니다.
 */
function code0(b: Bag): string {
  return pick(sum([b.yangPt, b.S['화'], b.S['목'], b.Y['식상'], b.Y['비겁']]),
    sum([b.eumPt, b.S['수'], b.S['금'], b.Y['인성']]), 'E', 'I')
    + pick(sum([b.Y['재성'], b.Y['관성'], b.S['토']]),
      sum([b.Y['식상'], b.Y['인성'], b.S['화']]), 'S', 'N')
    + pick(sum([b.S['금'], b.Y['관성'], b.yangin + b.baekho]),
      sum([b.S['수'], b.S['목'], b.Y['인성'], b.dohwa]), 'T', 'F')
    + pick(sum([b.Y['관성'], b.jeongJae]),
      sum([b.Y['비겁'], b.Y['식상'], b.pyeonJae]), 'J', 'P')
}

/**
 * ★확정안 — A(이중계산 풀기) + C-1(50점 뚜껑) + D(근거 없는 셋 빼기)
 *
 *  ⚠️⚠️ 「층 건너뛰기」가 «핵심» 입니다.
 *    A 는 오행 몫·육친 몫·음양 몫을 «따로» 재서 평균 냅니다 (교재 40쪽).
 *    그런데 D 로 재료를 빼면 «한쪽에 아무것도 없는 층» 이 생깁니다.
 *      예) S축 오행 층 — S 쪽에 土, N 쪽에 ★아무것도 없음
 *    그 층을 그대로 세면 «土가 조금만 있어도 언제나 S» 가 됩니다.
 *    ⇒ ★대립이 서지 않는 층은 «세지 않습니다».
 *    (skip=false 로 두면 어떤 일이 나는지 아래 「확정안-β」로 재 두었습니다)
 */
function codeFinal(b: Bag, skip: boolean, mean = false): string {
  const c = cap
  const axis = (
    oL: number[], oR: number[], yL: number[], yR: number[], sL: number[], sR: number[],
    left: string, right: string,
  ) => {
    const parts: number[] = []
    const layer = (L: number[], Rr: number[]) => {
      // ★한쪽에 재료가 «없으면» 대립이 아닙니다 — 그 층은 건너뜁니다
      if (skip && (L.length === 0 || Rr.length === 0)) return
      // ★mean — 성분 «개수» 가 아니라 «세기» 로 견줍니다.
      //   D 로 재료를 빼면 한쪽 성분이 둘, 다른 쪽이 하나가 되어
      //   «많은 쪽이 그냥 이기는» 일이 생깁니다. 그것을 막습니다.
      const l = mean && L.length ? sum(L) / L.length : sum(L)
      const r = mean && Rr.length ? sum(Rr) / Rr.length : sum(Rr)
      if (l + r <= 0) return
      const f = (l + r) * 0.15
      parts.push((l + f) / (l + f + r + f))
    }
    layer(oL, oR); layer(yL, yR); layer(sL, sR)
    const p = parts.length ? sum(parts) / parts.length : 0.5
    // ★화면이 「81 : 19」로 «반올림한» 값을 보이므로, 고르는 것도 그 값으로 합니다.
    //   ⚠️ p >= 0.5 로 고르면 49.7% 인 분이 화면엔 50 인데 오른쪽으로 갑니다.
    //      실측 128/5000(2.56%)이 그 경계에 걸렸습니다.
    return Math.round(p * 100) >= 50 ? left : right
  }
  return axis(
    [c(b.S['화']), c(b.S['목'])], [c(b.S['수']), c(b.S['금'])],
    [c(b.Y['식상']), c(b.Y['비겁'])], [c(b.Y['인성'])],
    [b.yangPt], [b.eumPt], 'E', 'I')
    // ★D — S 쪽 관성 · N 쪽 화를 뺐습니다 ⇒ 오행 층이 «한쪽뿐» 이라 건너뜁니다
    + axis([c(b.S['토'])], [], [c(b.Y['재성'])], [c(b.Y['식상']), c(b.Y['인성'])], [], [], 'S', 'N')
    // ★D — T 쪽 백호를 뺐습니다
    + axis([c(b.S['금'])], [c(b.S['수']), c(b.S['목'])],
      [c(b.Y['관성'])], [c(b.Y['인성'])], [b.yangin], [b.dohwa], 'T', 'F')
    + axis([], [], [c(b.Y['관성']), c(b.jeongJae)],
      [c(b.Y['비겁']), c(b.Y['식상']), c(b.pyeonJae)], [], [], 'J', 'P')
}

/** 후보A 만 — 이중 계산만 풀고 나머지는 지금대로 */
function codeA(b: Bag): string {
  const axis = (
    oL: number[], oR: number[], yL: number[], yR: number[], eL: number, eR: number,
    left: string, right: string,
  ) => {
    const parts: number[] = []
    const ratio = (l: number, r: number) => {
      if (l + r <= 0) return null
      const f = (l + r) * 0.15
      return (l + f) / (l + f + r + f)
    }
    for (const [l, r] of [[sum(oL), sum(oR)], [sum(yL), sum(yR)], [eL, eR]] as Array<[number, number]>) {
      const v = ratio(l, r); if (v !== null) parts.push(v)
    }
    const p = parts.length ? sum(parts) / parts.length : 0.5
    return p >= 0.5 ? left : right
  }
  return axis([b.S['화'], b.S['목']], [b.S['수'], b.S['금']],
    [b.Y['식상'], b.Y['비겁']], [b.Y['인성']], b.yangPt, b.eumPt, 'E', 'I')
    + axis([b.S['토']], [b.S['화']], [b.Y['재성'], b.Y['관성']], [b.Y['식상'], b.Y['인성']], 0, 0, 'S', 'N')
    + axis([b.S['금']], [b.S['수'], b.S['목']], [b.Y['관성']], [b.Y['인성']],
      b.yangin + b.baekho, b.dohwa, 'T', 'F')
    + axis([], [], [b.Y['관성'], b.jeongJae], [b.Y['비겁'], b.Y['식상'], b.pyeonJae], 0, 0, 'J', 'P')
}

/** 후보C1 만 — 지금 산식에 50점 뚜껑만 */
function codeC1(b: Bag): string {
  const c = cap
  return pick(sum([b.yangPt, c(b.S['화']), c(b.S['목']), c(b.Y['식상']), c(b.Y['비겁'])]),
    sum([b.eumPt, c(b.S['수']), c(b.S['금']), c(b.Y['인성'])]), 'E', 'I')
    + pick(sum([c(b.Y['재성']), c(b.Y['관성']), c(b.S['토'])]),
      sum([c(b.Y['식상']), c(b.Y['인성']), c(b.S['화'])]), 'S', 'N')
    + pick(sum([c(b.S['금']), c(b.Y['관성']), b.yangin + b.baekho]),
      sum([c(b.S['수']), c(b.S['목']), c(b.Y['인성']), b.dohwa]), 'T', 'F')
    + pick(sum([c(b.Y['관성']), c(b.jeongJae)]),
      sum([c(b.Y['비겁']), c(b.Y['식상']), c(b.pyeonJae)]), 'J', 'P')
}

/** 후보D 만 — 근거 없는 셋만 빼고 나머지는 지금대로 */
function codeD(b: Bag): string {
  return pick(sum([b.yangPt, b.S['화'], b.S['목'], b.Y['식상'], b.Y['비겁']]),
    sum([b.eumPt, b.S['수'], b.S['금'], b.Y['인성']]), 'E', 'I')
    + pick(sum([b.Y['재성'], b.S['토']]), sum([b.Y['식상'], b.Y['인성']]), 'S', 'N')
    + pick(sum([b.S['금'], b.Y['관성'], b.yangin]),
      sum([b.S['수'], b.S['목'], b.Y['인성'], b.dohwa]), 'T', 'F')
    + pick(sum([b.Y['관성'], b.jeongJae]),
      sum([b.Y['비겁'], b.Y['식상'], b.pyeonJae]), 'J', 'P')
}

// ══════════════════════════════════════════════════════════════

const N = Number(process.env.N ?? 5000)
const CANDS = ['후보0 (지금)', '후보A 이중계산', '후보C1 50점뚜껑', '후보D 셋빼기', '★확정 A+C1+D', '확정안-β 층안건넘', '★확정안-γ 세기평균']
const dist: Array<Record<string, number>> = CANDS.map(() => ({}))
const flip = [0, 0, 0, 0, 0, 0, 0]
let mismatch = 0
const axisFlip = CANDS.map(() => [0, 0, 0, 0])

for (let i = 0; i < N; i++) {
  const idx = [R(60), R(60), R(60), R(60)]
  const names = ['년주', '월주', '일주', '시주']
  const saju: Pillar[] = idx.map((v, k) => ({ pillar: names[k], ...gapja(v) }))
  const mb = saju[1].branch, hb = saju[3].branch
  const [sm, sd] = SOLAR[mb]

  const bagPlain = gather(saju, sm, sd, hb, false)
  const bagBongi = gather(saju, sm, sd, hb, true)
  const base = code0(bagPlain)
  // ★맞대보기 — «실제 파일» 이 γ 와 같은 답을 내는가
  if (calcSajuMbti(saju, sm, sd, hb).code !== codeFinal(bagBongi, true, true)) mismatch++

  const codes = [base, codeA(bagPlain), codeC1(bagPlain), codeD(bagPlain),
    codeFinal(bagBongi, true), codeFinal(bagBongi, false),
    codeFinal(bagBongi, true, true)]
  codes.forEach((c, k) => {
    dist[k][c] = (dist[k][c] ?? 0) + 1
    if (k > 0) {
      if (c !== base) flip[k]++
      for (let a = 0; a < 4; a++) if (c[a] !== base[a]) axisFlip[k][a]++
    }
  })
}

const ALL16 = ['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ']

console.log(`\n━━ 사주 MBTI 산식 자(尺) — 표본 ${N.toLocaleString()}벌 ━━`)
console.log('⚠️ 임의로 지은 사주입니다(60갑자 실재 짝). 손님 기록이 아닙니다.\n')

CANDS.forEach((name, k) => {
  const d = dist[k]
  const shown = ALL16.filter(t => d[t])
  const top = ALL16.map(t => [t, d[t] ?? 0] as const).sort((a, b) => b[1] - a[1])
  console.log(`── ${name}`)
  console.log(`   나온 유형        ${shown.length} / 16`)
  console.log(`   가장 많은 유형    ${top[0][0]} ${pc(top[0][1], N)}`)
  console.log(`   위 셋 합          ${pc(top[0][1] + top[1][1] + top[2][1], N)}`)
  if (k > 0) {
    console.log(`   ★유형 뒤집힘      ${pc(flip[k], N)}`)
    console.log(`   축별 뒤집힘       E/I ${pc(axisFlip[k][0], N)} · S/N ${pc(axisFlip[k][1], N)}`
      + ` · T/F ${pc(axisFlip[k][2], N)} · J/P ${pc(axisFlip[k][3], N)}`)
  }
  console.log('')
})

console.log(`━━ ★맞대보기 — 실제 sajuMbti.ts 와 γ 가 «같은 답» 인가 ━━`)
console.log(`   어긋난 건수  ${mismatch} / ${N}  ${mismatch === 0 ? '✅ 같습니다' : '🔴 다릅니다'}\n`)

console.log('━━ 16유형 분포 (%) ━━')
console.log('유형     ' + CANDS.map(c => c.slice(0, 8).padStart(9)).join(''))
for (const t of ALL16) {
  console.log(t.padEnd(9) + CANDS.map((_, k) => pc(dist[k][t] ?? 0, N).padStart(9)).join(''))
}
console.log('')
