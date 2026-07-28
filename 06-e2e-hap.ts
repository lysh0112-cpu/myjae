// 06-e2e-hap.ts — 교재 78~83쪽 합 배선을 실제 코드로 관통시킨다
//   npx --yes tsx 06-e2e-hap.ts
//
// 34-4장 E2E 와 같은 명식을 씁니다: 1988-05-15 14:30 남 → 戊辰 丁巳 庚午 癸未

import { pick, hapChungBrief, SERVICE_BUDGET, CATEGORY_NEEDS } from './lib/saju/jaryoPick'
import { judgeCheonganHap, judgeJijiHap, judgeAmhap, judgeJahwa } from './lib/saju/hapJudge'
import { calcSimsanOhaeng } from './lib/saju/simsanOhaeng'

type P = { pillar: string; stem: string; branch: string }

const saju: P[] = [
  { pillar: '년주', stem: '戊', branch: '辰' },
  { pillar: '월주', stem: '丁', branch: '巳' },
  { pillar: '일주', stem: '庚', branch: '午' },
  { pillar: '시주', stem: '癸', branch: '未' },
]

const score = calcSimsanOhaeng(saju as never, 5, 15, '未')
console.log('명식  戊辰 丁巳 庚午 癸未   (1988-05-15 14:30 남)')
console.log('오행 100점 —', JSON.stringify(score))

console.log('\n── 1. 천간합 판정 ─────────────────────────────')
for (const h of judgeCheonganHap(saju)) {
  console.log(`   ${h.key} ${h.where}  성립=${h.seongrip}` +
    `${h.block ? ` 방해=${h.block.kind}(${h.block.by})` : ''}` +
    `${h.dispute ? ` ${h.dispute}` : ''}  합화=${h.hwa}(${h.hwaEl})`)
}

console.log('\n── 2~4. 지지 합 판정 ──────────────────────────')
for (const h of judgeJijiHap(saju, score)) {
  console.log(`   ${h.kind} ${h.key} ${h.where}  월지걸침=${h.monthTied}` +
    `${h.hwaEl ? `  →${h.hwaEl}(${h.hwaWhy})` : ''}${h.broken ? `  깨짐:${h.broken}` : ''}`)
}

console.log('\n── 5. 자화간합 · 암합 ─────────────────────────')
const day = saju[2]
console.log('   자화간합:', judgeJahwa(day.stem, day.branch)?.key ?? '해당 없음')
for (const a of judgeAmhap(saju)) {
  console.log(`   암합 ${a.chars.join('')} ${a.where} (${a.ganhap.join('·')})` +
    ` 개고필요=${a.needsOpen} 열림=${a.opened}${a.openedBy ? `(${a.openedBy})` : ''}`)
}

console.log('\n── 나가는 재료 줄 (합만) ───────────────────────')
for (const l of hapChungBrief(saju, 'adult', { 합: true, 충: false }, score)) {
  console.log('   •', l)
}

console.log('\n── pick() 관통 — 갈래별 글자수 ──────────────────')
for (const cat of ['재물', '연애·결혼', '직업·사업', '관계·마음']) {
  const r = pick({
    serviceType: 'saju',
    questionCategories: [cat],
    ctx: { saju, dayStem: '庚', score, target: 'adult' },
  })
  const hasHap = (CATEGORY_NEEDS[cat] ?? []).includes('합')
  console.log(`   ${cat.padEnd(7)} 합need=${hasHap ? 'O' : 'X'}  ${String(r.chars).padStart(5)}자 / 상한 ${SERVICE_BUDGET.saju}` +
    `  ${r.truncated ? '★잘림' : ''}`)
}
