// 07-measure-hap.ts — 합 배선을 얹은 뒤 실제 코드로 크기·걸림 비율을 잰다
//   npx --yes tsx 07-measure-hap.ts
//
// 교훈 BO — 규칙을 더하면 무작위로 걸림 비율을 측정한다
// 교훈 CF — 얹으면서 크기를 잰다

import { pick, hapChungBrief, SERVICE_BUDGET, CATEGORY_NEEDS } from './lib/saju/jaryoPick'
import { judgeCheonganHap, judgeJijiHap, judgeAmhap, judgeJahwa } from './lib/saju/hapJudge'

type P = { pillar: string; stem: string; branch: string }
const STEMS = [...'甲乙丙丁戊己庚辛壬癸']
const BRANCHES = [...'子丑寅卯辰巳午未申酉戌亥']
const GAPJA = Array.from({ length: 60 }, (_, i) => [STEMS[i % 10], BRANCHES[i % 12]] as const)
const NAMES = ['년주', '월주', '일주', '시주']

let seed = 7
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff

const N = 20000
const samples: P[][] = []
for (let i = 0; i < N; i++) {
  samples.push(NAMES.map(n => {
    const [s, b] = GAPJA[Math.floor(rnd() * 60)]
    return { pillar: n, stem: s, branch: b }
  }))
}
const fakeScore = { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20 }

const c: Record<string, number> = {}
const add = (k: string, v = 1) => { c[k] = (c[k] ?? 0) + v }

for (const saju of samples) {
  const ch = judgeCheonganHap(saju)
  if (ch.length) add('천간합_짝있음')
  if (ch.some(h => h.seongrip)) add('  └성립')
  if (ch.some(h => !h.seongrip)) add('  ★└방해로 불성립')
  if (ch.some(h => h.dispute)) add('  ★└쟁합·투합')
  if (ch.some(h => h.seongrip && !h.hwa)) add('  ★└합하되 합화 안 됨')

  const jh = judgeJijiHap(saju, fakeScore)
  if (jh.length) add('지지합_있음')
  if (jh.some(h => h.kind === '방합')) add('  └방합')
  if (jh.some(h => h.kind === '삼합')) add('  └삼합')
  if (jh.some(h => h.kind === '육합')) add('  └육합')
  if (jh.some(h => h.hwaEl)) add('  ★└子丑·巳申 갈림 밝힘')
  if (jh.some(h => h.broken)) add('  ★└午未合 깨짐')
  if (jh.some(h => !h.monthTied && h.kind !== '육합')) add('  └월지 안 걸침(힘 덜함)')

  const day = saju[2]
  if (judgeJahwa(day.stem, day.branch)) add('★자화간합 일주')
  const am = judgeAmhap(saju)
  if (am.length) add('★암합 있음')
  if (am.some(a => a.needsOpen)) add('  └개고로 인정된 것')
}

console.log(`전수 ${N.toLocaleString()} 명식 — 실제 코드`)
console.log('='.repeat(64))
for (const [k, v] of Object.entries(c)) {
  console.log(`  ${k.padEnd(26)} ${String(v).padStart(6)}  ${(v / N * 100).toFixed(1)}%`)
}

// ── 크기 ────────────────────────────────────────────────────────
console.log('\n갈래별 재료 글자수 (상한 ' + SERVICE_BUDGET.saju + ')')
console.log('='.repeat(64))
for (const cat of Object.keys(CATEGORY_NEEDS)) {
  let sum = 0, mx = 0, cut = 0
  const use = samples.slice(0, 2000)
  for (const saju of use) {
    const r = pick({
      serviceType: 'saju', questionCategories: [cat],
      ctx: { saju, dayStem: saju[2].stem, score: fakeScore, target: 'adult' },
    })
    sum += r.chars; mx = Math.max(mx, r.chars); if (r.truncated) cut++
  }
  const hasHap = (CATEGORY_NEEDS[cat] ?? []).includes('합')
  console.log(`  ${cat.padEnd(9)} 합=${hasHap ? 'O' : 'X'}  평균 ${String(Math.round(sum / use.length)).padStart(5)}  최대 ${String(mx).padStart(5)}  잘림 ${(cut / use.length * 100).toFixed(1)}%`)
}

// ── 합 줄만의 무게 ───────────────────────────────────────────────
let hs = 0, hmax = 0
for (const saju of samples.slice(0, 3000)) {
  const lines = hapChungBrief(saju, 'adult', { 합: true, 충: false }, fakeScore)
  const n = lines.join('').length
  hs += n; hmax = Math.max(hmax, n)
}
console.log(`\n합 줄만  평균 ${Math.round(hs / 3000)}자 · 최대 ${hmax}자`)
