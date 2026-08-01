// 29-measure-resource-weights.ts
// 자원오행 «배점» 측정 하네스 — 2026-08-01 (43부) · 대표님 지시
//
// ══════════════════════════════════════════════════════════════════
//  ★이것은 «검사» 가 아니라 «자» 입니다.
//
//   [왜 만들었나]  대표님 지시 —
//     「당장 수치를 조율하기보다 측정 하네스를 먼저 구축하여
//       분포 데이터를 도출하라. 데이터를 보고 최종 비율을 결정하겠다」
//
//   ⚠️⚠️ 이 파일은 «정본 상수를 한 글자도 바꾸지 않습니다».
//      resourceJudge.ts 의 W_FLOW·W_YONGSIN·FLOW_SCALE 는 그대로 둔 채,
//      judgeResource 가 돌려준 «사실» 에서 되짚어 다른 배점을 계산합니다.
//      → 재는 동안 손님 화면은 «지금 그대로» 입니다.
//      → npm run verify 에 «넣지 않습니다». 검사가 아니니까요.
//
//   [되짚기가 왜 정확한가]  세 몫이 전부 «사실» 에서 복원됩니다 —
//     ① 글자 흐름   facts.flowAvg → clamp((flowAvg+2)/4, 0, 1)
//     ② 사주 상극   facts.weakClashed + facts.sajuScore → weakDepth 를 그대로 다시 계산
//        ⚠️ breakdown.flow 를 역산하지 «않습니다». 그 값은 clamp 를 거쳐
//           천장에 닿으면 정보가 뭉개집니다. 원재료에서 다시 셉니다.
//     ③ 용신 충족   breakdown.yongsin / W_YONGSIN → 비율 (1 / 0.7 / 0.5 / 0.25 / 0)
//     균형(balance)은 그대로 씁니다 — 이번 물음은 «흐름 대 용신» 이므로 건드리지 않습니다.
//
//   ★자기 검산이 붙어 있습니다 — 현행 배점으로 되짚은 값이 judgeResource 의
//     실제 점수와 «같은지» 먼저 잽니다. 어긋나면 그 자리에서 멈춥니다.
//     ⚠️ 자가 틀리면 그 자로 잰 모든 숫자가 거짓이 됩니다.
//
//   [무엇을 답하지 «않는가»]
//     ⚠️ 이 자는 「어느 배점이 옳은가」를 말하지 않습니다. 옳고 그름은 교재와
//        대표님이 정합니다. 이 자는 「그렇게 바꾸면 손님 화면이 어떻게 되는가」만 보여 줍니다.
//     ⚠️ 39부 3-1장 ①(가·나·다)과 교재 151쪽 「별점을 매기는 것이 맞는가」는
//        여전히 «열려» 있습니다. 이 숫자만 보고 답하지 마십시오 — 같은 결정입니다.
//
//   쓰는 법   npx tsx 29-measure-resource-weights.ts
//             npx tsx 29-measure-resource-weights.ts 20000    (표본 수)
// ══════════════════════════════════════════════════════════════════

import {
  buildSajuOhaengProfile, judgeResource,
  W_FLOW, W_FLOW_SAJU_CLASH, W_YONGSIN, W_BALANCE, FLOW_SCALE, EXCESS_POINT_MIN,
  type ResourceVerdict,
} from './lib/saju/resourceJudge'
import { starOf, applyYongsinFloor } from './lib/saju/starRating'
import type { Ohaeng } from './lib/saju/ohaeng'

const OH: Ohaeng[] = ['목', '화', '토', '금', '수']
const N = Number(process.argv[2]) || 12000
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

// ══════════════════════════════════════════════════════════════════
//  재 볼 «안» 들 — ★여기만 고치면 다른 배점을 잽니다
// ══════════════════════════════════════════════════════════════════
interface Scenario {
  key: string
  label: string
  note: string
  /** 자원 축 (흐름 + 사주상극) */
  flow: number
  /** 용신 충족 */
  yongsin: number
  /** 자원 축 가운데 «사주 상극» 몫이 차지하는 비율. 현행 7.5/30 = 0.25 */
  clashShare?: number
  /** 평균 보정 */
  scale?: number
}

const SCENARIOS: Scenario[] = [
  {
    key: 'now', label: '현행 (정본)', flow: W_FLOW, yongsin: W_YONGSIN,
    note: '41부 확정 — 흐름 22.5 + 사주상극 7.5 · 보정 1.20',
  },
  {
    key: 'flow10_yong60', label: '7/30 되돌린 안', flow: 10, yongsin: 60,
    note: '🔴 한 번 넣었다가 되돌린 자리. 아쉬움 30.9% → 46.0% 였다고 코드에 남아 있습니다',
  },
  // ★대표님 관심 축 — 「흐름만 낮추고 용신은 그대로」. 아직 «시험된 적이 없는» 길입니다.
  { key: 'flow20', label: '흐름만 20 (용신 40 유지)', flow: 20, yongsin: 40, note: '균형 몫이 30 → 40 으로 커집니다' },
  { key: 'flow15', label: '흐름만 15 (용신 40 유지)', flow: 15, yongsin: 40, note: '' },
  { key: 'flow10', label: '흐름만 10 (용신 40 유지)', flow: 10, yongsin: 40, note: '★7/30 이 «하려던» 것 — 용신을 안 올린 판' },
  // ★사주상극 몫만 키우는 길 — 교재 107쪽이 «경계하라» 한 쪽에 무게를 싣습니다
  { key: 'clash50', label: '자원 축 안에서 사주상극 절반', flow: W_FLOW, yongsin: W_YONGSIN, clashShare: 0.5, note: '흐름 15 + 사주상극 15' },
  { key: 'clash75', label: '자원 축 안에서 사주상극 3/4', flow: W_FLOW, yongsin: W_YONGSIN, clashShare: 0.75, note: '흐름 7.5 + 사주상극 22.5 — 교재 51쪽에 가장 가까운 쪽' },
]

// ══════════════════════════════════════════════════════════════════
//  표본 만들기 — ⚠️ 20-verify 와 «같은» 방식입니다 (잣대를 갈라 두지 않습니다)
// ══════════════════════════════════════════════════════════════════
const JC = (h: string, o: Ohaeng) => ({ hanja: h, hangul: '가', primary: o, secondary: null })

interface Sample {
  v: ResourceVerdict
  /** 이름(성 제외) 글자 수 — 외자를 따로 봅니다 */
  givenLen: number
}

function build(kind: 'normal' | 'oeja', n: number, seed: number): Sample[] {
  // ★되풀이해 재도 같은 값이 나오도록 «고정된» 난수를 씁니다.
  //   ⚠️ Math.random 을 쓰면 잴 때마다 숫자가 흔들려 안끼리 견줄 수 없습니다.
  let s = seed >>> 0
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  const pick = () => OH[Math.floor(rnd() * 5)]

  const out: Sample[] = []
  for (let i = 0; i < n; i++) {
    const sc: Record<string, number> = {}
    for (const o of OH) sc[o] = Math.floor(rnd() * 60)
    const P = buildSajuOhaengProfile({
      yongsin: OH[i % 5], heeksin: OH[(i + 1) % 5],
      gisin: rnd() < 0.5 ? OH[(i + 2) % 5] : undefined,
      score: sc,
    })
    const giv = kind === 'oeja' ? [JC('B', pick())] : [JC('B', pick()), JC('C', pick())]
    out.push({ v: judgeResource([JC('A', pick())], giv, P), givenLen: giv.length })
  }
  return out
}

// ══════════════════════════════════════════════════════════════════
//  되짚기 — 사실에서 «원재료 비율» 을 꺼냅니다
// ══════════════════════════════════════════════════════════════════
interface Raw {
  /** 글자 흐름 0~1 */
  flowRatio: number
  /** 사주 상극을 «안» 했을수록 1 에 가깝습니다 */
  clashRatio: number
  /** 용신 충족 0~1 */
  yongRatio: number
  /** 균형 점수 (그대로 씁니다) */
  balance: number
  hasYongsin: boolean
  /** 판정 불가로 씌운 상한. 있으면 그대로 다시 씌웁니다 */
  cap: number | null
}

function rawOf(v: ResourceVerdict): Raw {
  const f = v.facts
  // ① 글자 흐름 — judgeResource 와 «같은 식» 입니다
  const flowRatio = clamp((f.flowAvg + 2) / 4, 0, 1)

  // ② 사주 상극 — ★깊이를 «다시» 셉니다 (breakdown 역산이 아닙니다)
  let weakDepth = 0
  for (const wc of f.weakClashed) {
    weakDepth += Math.max(0, EXCESS_POINT_MIN - (f.sajuScore[wc.weak] ?? 0)) / EXCESS_POINT_MIN
  }
  const clashRatio = 1 - clamp(weakDepth, 0, 1)

  // ③ 용신 — 비율만 꺼냅니다 (1 / 0.7 / 0.5 / 0.25 / 0)
  const yongRatio = W_YONGSIN > 0 ? v.breakdown.yongsin / W_YONGSIN : 0

  return {
    flowRatio, clashRatio, yongRatio,
    balance: v.breakdown.balance,
    hasYongsin: f.hasYongsin,
    cap: v.breakdown.cappedTo,
  }
}

interface Scored { total: number; grade: string; jawonStar: number; yongStar: number }

function scoreWith(r: Raw, sc: Scenario): Scored {
  const W_F = sc.flow
  const W_Y = sc.yongsin
  const share = sc.clashShare ?? (W_FLOW_SAJU_CLASH / W_FLOW)
  const scale = sc.scale ?? FLOW_SCALE
  const W_CLASH = W_F * share
  const W_LINK = W_F - W_CLASH

  const flowScore = clamp((r.clashRatio * W_CLASH + r.flowRatio * W_LINK) * scale, 0, W_F)
  const yongScore = r.yongRatio * W_Y
  // ⚠️ 균형 몫은 «남은 자리» 만큼 늘어납니다 — 셋을 더해 100 이 되게 두는 것이
  //    41부까지의 규칙입니다. 균형 자체를 손대는 안은 이번 물음이 아닙니다.
  const W_B = Math.max(0, 100 - W_F - W_Y)
  const balScore = W_BALANCE > 0 ? (r.balance / W_BALANCE) * W_B : 0

  let total = flowScore + yongScore + balScore
  if (r.cap != null && total > r.cap) total = r.cap
  total = Math.round(clamp(total, 0, 100))

  const grade = total >= 70 ? '좋음' : total >= 45 ? '보통' : '아쉬움'
  // 화면 별점 — perspectiveStars 와 «같은» 식입니다 (칸을 백분율로 환산)
  const jawonStar = starOf(W_F > 0 ? (flowScore / W_F) * 100 : 0).star
  const matchMax = W_Y + W_B
  const yongStar = applyYongsinFloor(
    starOf(matchMax > 0 ? ((yongScore + balScore) / matchMax) * 100 : 0), r.hasYongsin).star
  return { total, grade, jawonStar, yongStar }
}

// ══════════════════════════════════════════════════════════════════
//  ★자기 검산 — 자가 맞는지 «먼저» 잽니다
// ══════════════════════════════════════════════════════════════════
function selfCheck(samples: Sample[]): boolean {
  const now = SCENARIOS[0]
  let bad = 0, worst = 0
  const misses: string[] = []
  for (const s of samples) {
    const mine = scoreWith(rawOf(s.v), now)
    const d = Math.abs(mine.total - s.v.score)
    if (d > 0) {
      bad++
      if (d > worst) worst = d
      if (misses.length < 3) misses.push(`실제 ${s.v.score} vs 되짚기 ${mine.total}`)
    }
  }
  const okRate = ((samples.length - bad) / samples.length) * 100
  console.log(`\n━━ ⓐ ★자기 검산 — 이 «자» 가 맞는가 ━━`)
  console.log(`  현행 배점으로 되짚은 값이 judgeResource 와 같은가`)
  console.log(`    맞은 표본  ${(samples.length - bad).toLocaleString()} / ${samples.length.toLocaleString()}  (${okRate.toFixed(2)}%)`)
  if (bad > 0) {
    console.log(`    🔴 어긋난 표본 ${bad}건 · 가장 큰 차이 ${worst}점`)
    for (const m of misses) console.log(`       ${m}`)
    console.log(`    ⚠️ 자가 틀렸습니다. 아래 숫자를 «믿지 마십시오».`)
    console.log(`       resourceJudge 의 식이 바뀌었을 수 있습니다 — rawOf 를 맞추십시오.`)
    return false
  }
  console.log(`    ✅ 한 건도 어긋나지 않았습니다 — 이 자로 잰 숫자를 믿을 수 있습니다`)
  return true
}

// ══════════════════════════════════════════════════════════════════
//  재기
// ══════════════════════════════════════════════════════════════════
interface Stat {
  avg: number; 좋음: number; 보통: number; 아쉬움: number
  jawonBands: number; jawonTop: number; yongBands: number; yongTop: number
  p10: number; p50: number; p90: number
}

function measure(samples: Sample[], sc: Scenario): Stat {
  const totals: number[] = []
  const g: Record<string, number> = { 좋음: 0, 보통: 0, 아쉬움: 0 }
  const jb = new Map<number, number>()
  const yb = new Map<number, number>()
  for (const s of samples) {
    const r = scoreWith(rawOf(s.v), sc)
    totals.push(r.total)
    g[r.grade]++
    jb.set(r.jawonStar, (jb.get(r.jawonStar) ?? 0) + 1)
    yb.set(r.yongStar, (yb.get(r.yongStar) ?? 0) + 1)
  }
  totals.sort((a, b) => a - b)
  const pct = (p: number) => totals[Math.floor((totals.length - 1) * p)]
  const n = samples.length
  const top = (m: Map<number, number>) => Math.max(...m.values()) / n * 100
  return {
    avg: totals.reduce((a, b) => a + b, 0) / n,
    좋음: g.좋음 / n * 100, 보통: g.보통 / n * 100, 아쉬움: g.아쉬움 / n * 100,
    jawonBands: jb.size, jawonTop: top(jb),
    yongBands: yb.size, yongTop: top(yb),
    p10: pct(0.10), p50: pct(0.50), p90: pct(0.90),
  }
}

const pad = (s: string, n: number) => {
  // 한글은 두 칸으로 셉니다 — 표가 어긋나지 않게
  const w = [...s].reduce((a, c) => a + (c.charCodeAt(0) > 0x1100 ? 2 : 1), 0)
  return s + ' '.repeat(Math.max(0, n - w))
}
const f1 = (x: number) => x.toFixed(1)

console.log('═'.repeat(72))
console.log('  자원오행 배점 측정 — ★재기만 합니다. 정본 상수는 그대로입니다')
console.log(`  표본  세 글자 ${N.toLocaleString()} · 외자 ${Math.floor(N / 3).toLocaleString()}   (씨앗 고정 — 되풀이해도 같은 값)`)
console.log('═'.repeat(72))

const three = build('normal', N, 20260801)
const oeja = build('oeja', Math.floor(N / 3), 20260802)

if (!selfCheck([...three, ...oeja])) process.exit(1)

for (const [title, samples] of [['세 글자', three], ['외자', oeja]] as const) {
  console.log(`\n━━ ⓑ ${title} ${samples.length.toLocaleString()}건 ━━\n`)
  console.log('  ' + pad('안', 26) + pad('평균', 7) + pad('좋음', 8) + pad('보통', 8)
    + pad('아쉬움', 9) + pad('자원별칸', 10) + pad('최다칸', 8))
  console.log('  ' + '─'.repeat(74))
  for (const sc of SCENARIOS) {
    const st = measure(samples, sc)
    console.log('  ' + pad(sc.label, 26)
      + pad(f1(st.avg), 7)
      + pad(f1(st.좋음) + '%', 8)
      + pad(f1(st.보통) + '%', 8)
      + pad(f1(st.아쉬움) + '%', 9)
      + pad(String(st.jawonBands) + '칸', 10)
      + pad(f1(st.jawonTop) + '%', 8))
  }
}

console.log(`\n━━ ⓒ 안마다 «무엇이 달라지는가» — 세 글자 기준 ━━`)
const base = measure(three, SCENARIOS[0])
for (const sc of SCENARIOS) {
  const st = measure(three, sc)
  const d = (a: number, b: number) => (a - b >= 0 ? '+' : '') + f1(a - b)
  console.log(`\n  ● ${sc.label}   (흐름 ${sc.flow} · 용신 ${sc.yongsin} · 균형 ${100 - sc.flow - sc.yongsin})`)
  if (sc.note) console.log(`    ${sc.note}`)
  console.log(`    평균 ${f1(st.avg)} (${d(st.avg, base.avg)})`
    + ` · 아쉬움 ${f1(st.아쉬움)}% (${d(st.아쉬움, base.아쉬움)})`
    + ` · 좋음 ${f1(st.좋음)}% (${d(st.좋음, base.좋음)})`)
  console.log(`    별점 — 자원 ${st.jawonBands}칸(최다 ${f1(st.jawonTop)}%)`
    + ` · 사주와의 만남 ${st.yongBands}칸(최다 ${f1(st.yongTop)}%)`)
  console.log(`    점수 퍼짐 — 하위10% ${st.p10} · 가운데 ${st.p50} · 상위10% ${st.p90}`)
}

// ══════════════════════════════════════════════════════════════════
//  ★재고 나서 «드러난 것» — 자동으로 짚어 드립니다
// ══════════════════════════════════════════════════════════════════
console.log(`\n━━ ⓓ ★이 표가 «말해 주는» 것 ━━\n`)
{
  const flowOnly = SCENARIOS.filter(x => x.key.startsWith('flow') && x.clashShare == null)
  const bands = new Set(flowOnly.map(x => measure(three, x).jawonBands))
  const tops = new Set(flowOnly.map(x => measure(three, x).jawonTop.toFixed(1)))
  if (bands.size === 1 && tops.size === 1) {
    console.log(`  ① 🔴 «흐름 무게만» 바꾸면 자원오행 별점이 «하나도 안 움직입니다».`)
    console.log(`     흐름 30 → 20 → 15 → 10 어느 쪽이든 자원 별점은 ${[...bands][0]}칸 · 최다 ${[...tops][0]}%.`)
    console.log(`     ★까닭 — 별점은 «칸 안에서의 비율»(flowScore / W_FLOW)로 냅니다.`)
    console.log(`             분자와 분모가 함께 줄어 비율이 그대로입니다.`)
    console.log(`     ⇒ 「별점 몰림을 풀려고 흐름 무게를 낮춘다」는 «듣지 않습니다».`)
    console.log(`        무게를 낮추면 «총점에서 흐름의 발언권» 만 줄어듭니다. 다른 물음입니다.`)
    console.log(``)
  }
  const c50 = measure(three, SCENARIOS.find(x => x.key === 'clash50')!)
  const c75 = measure(three, SCENARIOS.find(x => x.key === 'clash75')!)
  const now = measure(three, SCENARIOS[0])
  console.log(`  ② ⚠️ 반대로 «자원 축 안의 몫» 을 옮기면 별점이 크게 움직입니다.`)
  console.log(`     사주상극 몫  1/4(현행) → 최다칸 ${now.jawonTop.toFixed(1)}%`)
  console.log(`                  1/2       → 최다칸 ${c50.jawonTop.toFixed(1)}%`)
  console.log(`                  3/4       → 최다칸 ${c75.jawonTop.toFixed(1)}% · 칸 ${c75.jawonBands}개`)
  console.log(`     ★사주 상극은 55.9% 가 «0개» 라 만점이 쌓입니다. 몫을 키울수록 뭉칩니다.`)
  console.log(`     ⇒ 교재 51쪽에 가깝게 가려면 «별점이 다시 몰리는» 값을 함께 치러야 합니다.`)
  console.log(`        41부에 71% → 31% 로 푼 자리가 되돌아갑니다.`)
  console.log(``)
  const f10 = measure(three, SCENARIOS.find(x => x.key === 'flow10')!)
  const old730 = measure(three, SCENARIOS.find(x => x.key === 'flow10_yong60')!)
  console.log(`  ③ ★「흐름만 낮추고 용신은 그대로」 — 41부부터 «미시험» 이던 길입니다.`)
  console.log(`     흐름10·용신60 (7/30 되돌린 안)  아쉬움 ${old730.아쉬움.toFixed(1)}%  ← 가혹해졌던 쪽`)
  console.log(`     흐름10·용신40 (안 올린 판)      아쉬움 ${f10.아쉬움.toFixed(1)}%`)
  console.log(`     현행                            아쉬움 ${now.아쉬움.toFixed(1)}%`)
  console.log(`     ⇒ 7/30 이 가혹해진 것은 «흐름을 낮춰서» 가 아니라 «용신을 올려서» 였습니다.`)
  console.log(`        코드 주석의 진단이 숫자로 확인됩니다.`)
  console.log(`        흐름만 낮추면 아쉬움은 ${(f10.아쉬움 - now.아쉬움).toFixed(1)}%p 만 움직입니다 — «순한» 변화입니다.`)
}

console.log(`
${'═'.repeat(72)}
  ⚠️ 읽으실 때
    · 「아쉬움 %」가 커지면 «개명을 부추기는» 쪽입니다.
      교재 취지는 그 반대입니다 — 낮은 점수로 개명을 유도하지 말라.
    · 「최다칸 %」가 크면 별이 «한 칸에 몰린» 것입니다. 40부에 71% → 31% 로 푼 자리입니다.
      다시 커지면 손님 눈에 «다 비슷한 이름» 이 됩니다.
    · 평균은 «41부에 1.20 보정으로 맞춰 둔» 값입니다. 크게 움직이면 보정을 다시 봐야 합니다.

  ⚠️ 이 표는 «어느 안이 옳은가» 를 말하지 않습니다.
     교재 2장 51쪽 · 4장 107쪽 · 151쪽과 함께 보셔야 합니다.
     ★39부 3-1장 ①(가·나·다)과 «같은 결정» 입니다. 따로 답하면 어긋납니다.
${'═'.repeat(72)}
`)
