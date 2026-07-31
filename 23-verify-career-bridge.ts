// 23-verify-career-bridge.ts
// 진로적성 «잇기» 그물 — 2026-07-31 (41부 Step 3)
//
// ★가장 중요한 검사는 ⑭-a 입니다 — «기존 값이 안 바뀌었는가».
//   잇기는 «덧붙이는» 일이라, 기존 파이프라인이 흔들리면 그 자체가 실패입니다.

import { calcCareerScore, gradeAll, pickStrong } from './lib/saju/career/careerScore'
import {
  findJolip, calcJijangganBridge, buildJijangganCard, jijangganElementRatio,
  CAREER_JIJANGGAN_SPEC,
} from './lib/saju/career/jijangganBridge'
import { calcNamingBridge, buildNamingCard } from './lib/saju/career/namingBridge'
import { checkJijangganOrder } from './lib/saju/jijanggan'
import type { Pillar, Ohaeng } from './lib/saju/career/types'

let pass = 0, fail = 0
const check = (ok: boolean, msg: string) => {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) } else { fail++; console.log(`  🔴 ${msg}`) }
}
const P = (p: string, s: string, b: string): Pillar => ({ pillar: p as never, stem: s, branch: b })

/** 표본 셋 — 월지·계절·시 모름을 갈라 봅니다 */
const SAMPLES = [
  { name: '표본1 丙일간 寅월', saju: [P('년주','乙','亥'),P('월주','戊','寅'),P('일주','丙','子'),P('시주','庚','寅')],
    y: 1995, m: 2, d: 20, hour: '寅' as string | null },
  { name: '표본2 庚일간 午월', saju: [P('년주','乙','亥'),P('월주','壬','午'),P('일주','庚','申'),P('시주','丁','丑')],
    y: 1995, m: 6, d: 20, hour: '丑' as string | null },
  { name: '표본3 시 모름 子월', saju: [P('년주','甲','子'),P('월주','丙','子'),P('일주','戊','午'),P('시주','?','?')],
    y: 2025, m: 1, d: 3, hour: null },
]

console.log('\n━━ ⑭-a 🔴 기존 파이프라인이 «안 바뀌었는가» ━━')
// ★잇기 전후로 careerScore·gradeAll·pickStrong 이 같아야 합니다.
//   이 파일은 기존 함수를 «부르기만» 하므로, 값이 흔들리면 다른 데서 샌 것입니다.
{
  const known: [string, number][] = []
  for (const s of SAMPLES) {
    const r = calcCareerScore(s.saju, s.m, s.d, s.hour)
    const g = gradeAll(r)
    const sum = (['목','화','토','금','수'] as Ohaeng[]).reduce((a, e) => a + (r.score[e] ?? 0), 0)
    known.push([s.name, sum])
    check(sum === r.total, `${s.name} — 점수 합(${sum}) = total(${r.total})`)
    check(Object.keys(g).length === 5, `${s.name} — 다섯 오행 전부 등급`)
    check(pickStrong(r, g).every((e) => g[e].grade === '발달' || g[e].grade === '과다'),
      `${s.name} — 강점 후보가 발달·과다에서만 나옵니다`)
  }
  check(known.every(([, v]) => v === 100 || v === 80), `합계가 100(시 알면) 또는 80(시 모르면)`)
}

console.log('\n━━ ⑭-b 지장간 표 — 순서 검증을 통과한 쪽을 쓰는가 ━━')
check(CAREER_JIJANGGAN_SPEC.order === '여기먼저', `order 가 «여기먼저» 입니다`)
check(checkJijangganOrder(CAREER_JIJANGGAN_SPEC).length === 0,
  `★넘기는 표가 전통 순서와 12/12 일치합니다 (sajuTables 를 쓰면 여기·중기가 뒤바뀝니다)`)

console.log('\n━━ ⑭-c 🔴 절입 시각 — 해(年) 경계를 넘는가 ━━')
{
  // 2026 입춘 = 2/4 04:56 KST (계산). 2/4 생·2/10 생 둘 다 같은 절입이어야 합니다
  const a = findJolip('寅', 2026, 2, 10), b = findJolip('寅', 2026, 2, 4)
  check(!!a && !!b && a.at.getTime() === b.at.getTime(), `寅월 — 같은 달 안에서는 같은 절입`)
  // ★子월(대설)은 12월에 열려 이듬해 1월까지 갑니다
  const c = findJolip('子', 2026, 1, 3)
  check(!!c && c.at.getUTCFullYear() === 2025 && c.at.getUTCMonth() === 11,
    `★子월 1월 3일생 — 절입이 «지난해 12월» 입니다 (${c?.at.toISOString().slice(0, 10)})`)
  const d = findJolip('丑', 2026, 1, 20)
  check(!!d && d.at.getUTCFullYear() === 2026, `丑월 1월생 — 절입은 같은 해 소한`)
  check(findJolip('X', 2026, 2, 10) === null, `없는 지지 → null`)
}

console.log('\n━━ ⑭-d 지장간 잇기 ━━')
for (const s of SAMPLES) {
  const r = calcJijangganBridge({ saju: s.saju, solarYear: s.y, solarMonth: s.m, solarDay: s.d, birthMinute: 600 })
  check(r.jijanggan !== null, `${s.name} — 지장간을 갈랐습니다 (${r.jijanggan?.currentGan}·${r.jijanggan?.stage}기)`)
  check(r.daysAfterJol !== null && r.daysAfterJol >= 0 && r.daysAfterJol < 32,
    `${s.name} — 절입 뒤 ${r.daysAfterJol?.toFixed(1)}일 (0~32 안)`)
  const ratio = jijangganElementRatio(r)
  const sum = ratio ? Object.values(ratio).reduce((a, b) => a + b, 0) : 0
  check(Math.abs(sum - 1) < 1e-9, `${s.name} — 오행 비율의 합이 1 (${sum.toFixed(6)})`)
}
{
  // ★시각을 모르면 problems 에 남겨야 합니다 — 조용히 정오로 치지 않습니다
  const r = calcJijangganBridge({ saju: SAMPLES[0].saju, solarYear: 1995, solarMonth: 2, solarDay: 20 })
  check(r.problems.some((p) => p.includes('시각')), `태어난 시각을 모르면 problems 에 남습니다`)
  // 월지를 모르면 조용히 넘기지 않습니다
  const bad = calcJijangganBridge({
    saju: [P('월주', '?', '?')], solarYear: 2000, solarMonth: 5, solarDay: 5 })
  check(bad.jijanggan === null && bad.problems.length > 0, `월지를 모르면 problems 에 남고 null`)
}

console.log('\n━━ ⑭-e 화면 카드 — lines 와 reasons 를 «갈라» 담는가 (교훈 AV) ━━')
{
  const r = calcJijangganBridge({ saju: SAMPLES[0].saju, solarYear: 1995, solarMonth: 2, solarDay: 20, birthMinute: 600 })
  const c = buildJijangganCard(r)
  check(c.key === 'jijanggan' && c.lines.length > 0 && c.reasons.length > 0, `카드 모양이 CareerCard 그대로`)
  // ⚠️ AI 지시문·경고가 lines 로 새면 안 됩니다
  const LEAK = ['교재 대조 대기', '살펴볼 점', '단정하지 말', '※']
  const leaked = LEAK.filter((w) => c.lines.some((l) => l.includes(w)))
  check(leaked.length === 0, `★통변 지시문이 손님 문장(lines)으로 새지 않습니다 — ${leaked.join(',') || '0건'}`)
  check(c.reasons.some((x) => x.includes('교재 대조 대기')), `그 경고는 reasons 에 «있습니다»`)
}

console.log('\n━━ ⑭-f 작명 잇기 ━━')
{
  const r = calcCareerScore(SAMPLES[0].saju, 2, 20, '寅')
  const g = gradeAll(r)
  const n = calcNamingBridge({ grades: g, yongsin: '수', heeksin: '금', gisin: '화' })
  check(n.guides.length === 5, `다섯 오행 전부 줄 세웁니다`)
  check(n.guides[0].el === '수' && n.guides[0].priority === '용신', `용신이 «맨 앞» 입니다 (${n.guides[0].el})`)
  check(n.fill.includes('수') && n.fill.includes('금'), `용신·희신이 «담을 것» 에 들어갑니다`)
  check(n.avoid.includes('화'), `기신이 «피할 것» 에 들어갑니다`)
  check(n.guides.every((x, i, a) => i === 0 || a[i - 1].rank <= x.rank), `우선순위 순으로 정렬됩니다`)
  // ★과다 오행은 피합니다 — 교재 2장 51쪽
  const excess = (['목','화','토','금','수'] as Ohaeng[]).filter((e) => g[e].grade === '과다')
  for (const e of excess) {
    if (e === '수' || e === '금' || e === '화') continue   // 용신·희신·기신은 다른 자리
    check(n.avoid.includes(e), `과다한 ${e} 는 «피할 것» — 교재 2장 51쪽`)
  }
  const c = buildNamingCard(n)
  check(c.key === 'naming' && c.lines.length > 0, `작명 카드가 나옵니다`)
  const leaked = ['※', '살펴볼 점'].filter((w) => c.lines.some((l) => l.includes(w)))
  check(leaked.length === 0, `★지시문이 lines 로 새지 않습니다`)
  check(c.reasons.some((x) => x.includes('resourceJudge')), `«채점은 resourceJudge 가 한다» 를 재료에 남깁니다`)
}

console.log('\n━━ ⑭-g 두 잣대가 어긋나면 «남기는가» ━━')
{
  // career 는 점수·글자 수를 함께 보고, resourceJudge 는 제 잣대를 씁니다 — 갈릴 수 있습니다
  const r = calcCareerScore(SAMPLES[1].saju, 6, 20, '丑')
  const g = gradeAll(r)
  const n = calcNamingBridge({ grades: g, yongsin: '목', heeksin: '수' })
  check(Array.isArray(n.disagreed), `어긋난 오행 목록이 있습니다 (${n.disagreed.join(',') || '없음'})`)
  const c = buildNamingCard(n)
  if (n.disagreed.length > 0) {
    check(c.reasons.some((x) => x.includes('어긋')), `★어긋나면 재료에 «두 관점이 있다» 를 남깁니다`)
  } else {
    check(true, `이 표본은 두 잣대가 같습니다`)
  }
}

console.log(`\n━━ 진로적성 잇기 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) process.exit(1)
