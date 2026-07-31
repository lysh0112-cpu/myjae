// 22-verify-jijanggan.ts
// 지장간 날수 배분 그물 — 2026-07-31 (41부 Step 2)

import {
  splitJijanggan, checkJijangganOrder, normalizeBranch, daysAfterJolip,
  TRADITIONAL_DAY_SPLIT, type JijangganSpec,
} from './lib/saju/jijanggan'
import { JIJANGAN as YS_TABLE } from './lib/saju/yongsinNew'

let pass = 0, fail = 0
const check = (ok: boolean, msg: string) => {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) } else { fail++; console.log(`  🔴 ${msg}`) }
}
const YS: JijangganSpec = { table: YS_TABLE, order: '여기먼저' }
/** ⚠️ 출산택일 표 — 순서가 «집합용» 이라 날수 배분에 그대로 쓰면 안 됩니다 */
const ST: JijangganSpec = { order: '정기먼저', table: {
  子: ['癸'], 丑: ['己','癸','辛'], 寅: ['甲','丙','戊'], 卯: ['乙'],
  辰: ['戊','乙','癸'], 巳: ['丙','戊','庚'], 午: ['丁','己'], 未: ['己','丁','乙'],
  申: ['庚','壬','戊'], 酉: ['辛'], 戌: ['戊','辛','丁'], 亥: ['壬','甲'] } }

console.log('\n━━ ⑬-a 날수 배분표 — 전통 (교재 대조 대기 중) ━━')
{
  const S = TRADITIONAL_DAY_SPLIT
  check(Object.keys(S).length === 12, `12지지 전부 (${Object.keys(S).length})`)
  const sums = Object.entries(S).filter(([, v]) => v.여 + v.중 + v.정 !== 30)
  check(sums.length === 0, `모든 지지가 30일 — 어긋남 ${sums.map(x => x[0]).join(',') || '0건'}`)
  for (const z of ['寅','申','巳','亥']) check(S[z].여 === 7 && S[z].중 === 7 && S[z].정 === 16, `생지 ${z} 7·7·16`)
  for (const z of ['子','卯','酉']) check(S[z].여 === 10 && S[z].중 === 0 && S[z].정 === 20, `왕지 ${z} 10·0·20`)
  // ★午 만 홀로 중기를 둡니다 — 전통 배분(丙10/己9/丁11) 적용 · 교재 대조 대기 중
  check(S['午'].여 === 10 && S['午'].중 === 9 && S['午'].정 === 11,
    `★午 10·9·11 (전통 배분 · 교재 대조 대기 중)`)
  for (const z of ['辰','戌','丑','未']) check(S[z].여 === 9 && S[z].중 === 3 && S[z].정 === 18, `묘지 ${z} 9·3·18`)
}

console.log('\n━━ ⑬-b 🔴 표의 «순서» 를 잽니다 (교훈 EQ — 바깥 정답표와 대조) ━━')
{
  check(checkJijangganOrder(YS).length === 0, `yongsinNew(여기먼저) — 12/12 전통과 일치`)
  const bad = checkJijangganOrder(ST)
  // ⚠️ 이건 «틀렸다» 가 아니라 «그 표는 집합용» 이라는 뜻입니다. 알고 있어야 합니다
  check(bad.length > 0,
    `★sajuTables(정기먼저) — 순서가 어긋나는 지지 ${bad.length}개 (${bad.join(',')})`)
  check(bad.includes('辰'),
    `★辰 이 잡힙니다 — 전통 여乙·중癸 인데 그 표로는 여癸·중乙 이 됩니다`)
}

console.log('\n━━ ⑬-c 구간 판정 — yongsinNew 표 ━━')
{
  // 寅 = 여戊 7일 · 중丙 7일 · 정甲 16일
  const t: [number, string, string][] = [
    [0, '戊', '여'], [6.9, '戊', '여'], [7, '丙', '중'], [13.9, '丙', '중'], [14, '甲', '정'], [29, '甲', '정'],
  ]
  for (const [d, g, st] of t) {
    const r = splitJijanggan('寅', d, YS)
    check(!!r && r.currentGan === g && r.stage === st, `寅 ${d}일 → ${r?.currentGan}(${r?.stage}) 기대 ${g}(${st})`)
  }
  // ★午 — 여丙 10 · 중己 9 · 정丁 11
  for (const [d, g] of [[5, '丙'], [12, '己'], [25, '丁']] as [number, string][]) {
    const r = splitJijanggan('午', d, YS)
    check(r?.currentGan === g, `午 ${d}일 → ${r?.currentGan} (기대 ${g})`)
  }
  // ★子 — 중기가 «0일» 입니다. 壬이 중기 자리로 밀리면 안 됩니다
  const ja = splitJijanggan('子', 5, YS)
  check(ja?.currentGan === '壬' && ja?.stage === '여', `子 5일 → 壬(여) — 중기 0일을 건너뜁니다 (${ja?.currentGan}·${ja?.stage})`)
  const ja2 = splitJijanggan('子', 15, YS)
  check(ja2?.currentGan === '癸' && ja2?.stage === '정', `子 15일 → 癸(정)`)
}

console.log('\n━━ ⑬-d 표에 «없는» 단계의 날수를 어디로 보내는가 ━━')
{
  // sajuTables 子 = ['癸'] — 여기(壬)가 없습니다. 10일이 정기로 가야 합니다
  const r = splitJijanggan('子', 5, ST)
  check(r?.currentGan === '癸' && r?.slices.length === 1, `子(집합표) — 정기 하나로 합쳐집니다`)
  check(!!r && Math.abs(r.slices[0].days - 30) < 0.01, `그 정기가 30일 전부 (${r?.slices[0].days})`)
  check(!!r && r.merged.length === 1, `★어디로 보냈는지 남깁니다 — ${r?.merged[0]}`)
  check(!!r && Math.abs((r.elementRatio['수'] ?? 0) - 1) < 0.01,
    `★오행 총량이 그대로입니다 (수 100%) — 壬도 癸도 수이기 때문입니다`)
  // 亥 — 빠진 여기가 戊(토)입니다. 토가 «사라지는» 것이 연재쌤 확정입니다
  const h = splitJijanggan('亥', 3, ST)
  check(!!h && (h.elementRatio['토'] ?? 0) === 0,
    `★亥(집합표)에 토가 없습니다 — 「亥에는 戊를 넣지 않는다」(연재쌤 확정)`)
  const h2 = splitJijanggan('亥', 3, YS)
  check(!!h2 && (h2.elementRatio['토'] ?? 0) > 0, `亥(yongsinNew)에는 토가 있습니다 — 두 표가 다릅니다`)
}

console.log('\n━━ ⑬-e 비율 · 총 날수 ━━')
{
  const r = splitJijanggan('寅', 0, YS)!
  const sum = Object.values(r.ratio).reduce((a, b) => a + b, 0)
  check(Math.abs(sum - 1) < 1e-9, `비율의 합이 1 (${sum.toFixed(6)})`)
  check(Math.abs(r.ratio['甲'] - 16 / 30) < 1e-9, `정기 甲 = 16/30 (${r.ratio['甲'].toFixed(3)})`)
  // 총 날수를 29일로 주면 «비례해서» 줄어야 합니다
  const s = splitJijanggan('寅', 0, YS, { totalDays: 29 })!
  check(Math.abs(s.slices.reduce((a, b) => a + b.days, 0) - 29) < 1e-9, `총 29일로 환산됩니다`)
  check(Math.abs(s.ratio['甲'] - 16 / 30) < 1e-9, `비율은 그대로 (${s.ratio['甲'].toFixed(3)})`)
}

console.log('\n━━ ⑬-f 이상한 입력 — 조용히 넘기지 않는가 ━━')
{
  check(splitJijanggan('X', 5, YS) === null, `없는 지지 → null`)
  check(normalizeBranch('인') === '寅' && normalizeBranch('오') === '午', `한글 지지도 받습니다`)
  const neg = splitJijanggan('寅', -3, YS)
  check(!!neg && neg.problems.length > 0, `경과 일수가 음수면 problems 에 남습니다`)
  const over = splitJijanggan('寅', 99, YS)
  check(!!over && over.problems.length > 0 && over.stage === '정', `달을 넘으면 마지막 구간 + problems`)
  // ★순서가 어긋나는 표를 넘기면 «경고» 가 나와야 합니다
  const warn = splitJijanggan('辰', 5, ST)
  check(!!warn && warn.problems.some(p => p.includes('순서')),
    `★순서가 어긋난 표를 넘기면 problems 에 잡힙니다`)
}

console.log('\n━━ ⑬-g 경과 일수 헬퍼 ━━')
{
  const jol = new Date('2026-02-04T10:52:00+09:00')
  const b1 = new Date('2026-02-04T22:52:00+09:00')
  check(Math.abs(daysAfterJolip(b1, jol) - 0.5) < 1e-6, `절입 12시간 뒤 = 0.5일`)
  const b2 = new Date('2026-02-14T10:52:00+09:00')
  check(Math.abs(daysAfterJolip(b2, jol) - 10) < 1e-6, `10일 뒤 = 10일`)
}

console.log(`\n━━ 지장간 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) process.exit(1)
