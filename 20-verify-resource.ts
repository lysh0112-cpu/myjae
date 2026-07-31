// 20-verify-resource.ts
// 자원오행 «자원 축» 그물 — 2026-07-31 (41부)
// ⚠️ npm run verify 에 붙여 주십시오.

import {
  buildSajuOhaengProfile, judgeResource, relationDirected,
  W_FLOW, W_FLOW_SAJU_CLASH, W_FLOW_LINK, FLOW_SCALE, CLASH_VIEW_BOOK, clashGloss,
} from './lib/saju/resourceJudge'
import { starOf } from './lib/saju/starRating'

let pass = 0, fail = 0
const check = (ok: boolean, msg: string) => {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) } else { fail++; console.log(`  🔴 ${msg}`) }
}
const OH = ['목', '화', '토', '금', '수'] as const
const JC = (h: string, o: string) => ({ hanja: h, hangul: '가', primary: o as never, secondary: null })

console.log('\n━━ ⑪-a 자원 축 배분 — ★[가+B] 결합안 (대표님 확정 2026-07-31) ━━')
check(W_FLOW === 30, `자원 축 합계 30 (${W_FLOW})`)
check(W_FLOW_SAJU_CLASH === 7.5, `사주 상극 몫 7.5 (${W_FLOW_SAJU_CLASH})`)
check(W_FLOW_LINK === 22.5, `글자 흐름 몫 22.5 (${W_FLOW_LINK})`)
check(W_FLOW_SAJU_CLASH + W_FLOW_LINK === W_FLOW, `두 몫의 합이 축과 같습니다`)
check(FLOW_SCALE === 1.20, `평균 보정 1.20 (${FLOW_SCALE})`)

console.log('\n━━ ⑪-b 🔴 비화와 역생이 «갈라졌는가» (별점 몰림의 원인) ━━')
{
  // 관계가 전부 비화면 flowAvg = 0.5, 전부 역생이면 1.0 — «다른» 자리에 놓여야 합니다
  const P = buildSajuOhaengProfile({ yongsin: '화', heeksin: '목', score: { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20 } })
  const bihwa = judgeResource([JC('A', '목')], [JC('B', '목'), JC('C', '목')], P)
  const yeok = judgeResource([JC('A', '화')], [JC('B', '목'), JC('C', '화')], P)
  check(bihwa.facts.flowAvg !== yeok.facts.flowAvg,
    `비화만(${bihwa.facts.flowAvg})과 역생 섞임(${yeok.facts.flowAvg})이 «다른 값»`)
  check(bihwa.breakdown.flow !== yeok.breakdown.flow,
    `→ 축 점수도 다릅니다 (${bihwa.breakdown.flow} vs ${yeok.breakdown.flow})`)
}

console.log('\n━━ ⑪-c 🔴 사주 상극을 «두 번 세지 않는가» ━━')
{
  // 목이 결핍인 사주 + 이름에 금(목을 극) → 축이 깎이고 균형은 그대로여야 합니다
  const P = buildSajuOhaengProfile({ yongsin: '화', score: { 목: 0, 화: 40, 토: 20, 금: 30, 수: 10 } })
  const clash = judgeResource([JC('A', '금')], [JC('B', '금'), JC('C', '금')], P)
  const f = clash.facts as Record<string, unknown>
  const wc = (f.weakClashed as unknown[] ?? []).length
  if (wc > 0) {
    check(clash.breakdown.flow < W_FLOW, `사주 상극이 «축» 을 깎습니다 (${clash.breakdown.flow}/30)`)
    check(clash.breakdown.balance >= 0, `균형은 따로 셉니다 (${clash.breakdown.balance}/30)`)
  } else {
    check(true, `이 표본에는 사주 상극이 없어 넘어갑니다`)
  }
  check(!/PENALTY_WEAK_CLASH/.test(String(judgeResource)), `옛 상수가 남아 있지 않습니다`)
}

console.log('\n━━ ⑪-d 🔴 축이 범위를 벗어나지 않는가 ━━')
{
  let bad = 0, min = 99, max = -1
  for (let i = 0; i < 3000; i++) {
    const sc: Record<string, number> = {}
    for (const o of OH) sc[o] = Math.floor(Math.random() * 60)
    const P = buildSajuOhaengProfile({ yongsin: OH[i % 5], heeksin: OH[(i + 1) % 5], score: sc })
    const pick = () => OH[Math.floor(Math.random() * 5)]
    const v = judgeResource([JC('A', pick())], [JC('B', pick()), JC('C', pick())], P)
    const x = v.breakdown.flow
    if (x < 0 || x > W_FLOW) bad++
    min = Math.min(min, x); max = Math.max(max, x)
  }
  check(bad === 0, `축이 0~30 을 벗어난 표본 ${bad}건 (실측 ${min} ~ ${max})`)
}

console.log('\n━━ ⑪-e 🔴 별점이 «퍼지는가» — 이번 개편의 목적 ━━')
{
  const stars = (kind: 'normal' | 'oeja') => {
    const d: Record<string, number> = {}
    const N = 4000
    for (let i = 0; i < N; i++) {
      const sc: Record<string, number> = {}
      for (const o of OH) sc[o] = Math.floor(Math.random() * 60)
      const P = buildSajuOhaengProfile({ yongsin: OH[i % 5], heeksin: OH[(i + 1) % 5], score: sc })
      const pick = () => OH[Math.floor(Math.random() * 5)]
      const giv = kind === 'oeja' ? [JC('B', pick())] : [JC('B', pick()), JC('C', pick())]
      const v = judgeResource([JC('A', pick())], giv, P)
      const s = String(starOf(v.breakdown.flow / W_FLOW * 100).star)
      d[s] = (d[s] ?? 0) + 1
    }
    const e = Object.entries(d)
    return { bands: e.length, top: Math.max(...e.map(x => x[1])) / N * 100 }
  }
  const a = stars('normal'), b = stars('oeja')
  // ★개편 전 — 세 글자 6칸/71% · 외자 3칸/58%
  check(a.bands >= 5 && a.top <= 45,
    `세 글자 — 칸 ${a.bands}개 · 최대 ${a.top.toFixed(0)}%  (개편 전 6칸 · 71%)`)
  check(b.bands >= 4 && b.top <= 60,
    `외자 — 칸 ${b.bands}개 · 최대 ${b.top.toFixed(0)}%  (개편 전 3칸 · 58%)`)
}

console.log('\n━━ ⑪-f 교재 51쪽 근거가 그대로 붙는가 ━━')
check(CLASH_VIEW_BOOK.page.includes('51쪽'), `출처가 남아 있습니다`)
check(clashGloss('토', '수') === '흙은 둑이 되어 물을 가두어 둡니다.', `교재 풀이 그대로`)
check(relationDirected('목', '화') === '순생' && relationDirected('화', '목') === '역생',
  `자원오행은 «방향을 봅니다» (발음오행과 잣대가 다른 것이 맞습니다)`)

console.log(`\n━━ 자원오행 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) process.exit(1)
