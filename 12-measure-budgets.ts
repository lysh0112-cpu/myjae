// 12-measure-budgets.ts — 서비스별로 «실제로 AI 에게 나가는» 재료 크기를 잰다
//   npx --yes tsx 12-measure-budgets.ts
//
// 교훈 CQ — 상한이라 적힌 것이 상한이 아닐 수 있다. 나가는 문자열을 직접 재라.

import { toTongbyeonInput } from './lib/saju/toTongbyeonInput'
import { buildTongbyeonPrompt } from './lib/saju/tongbyeonPrompt'
import { calcSimsanOhaeng, toPercentList } from './lib/saju/simsanOhaeng'
import { calcYongsinNew } from './lib/saju/yongsinNew'
import { dayunGanjiList, calcSeyunList } from './lib/saju/dayun'
import { SERVICE_BUDGET, pick, type ServiceType } from './lib/saju/jaryoPick'
import { TOTAL_CAP } from './lib/saju/toTongbyeonInput'
import { QUESTIONS } from './lib/saju/questions'

type P = { pillar: string; stem: string; branch: string }
const saju: P[] = [
  { pillar: '년주', stem: '戊', branch: '辰' },
  { pillar: '월주', stem: '丁', branch: '巳' },
  { pillar: '일주', stem: '庚', branch: '午' },
  { pillar: '시주', stem: '癸', branch: '未' },
]
const score = calcSimsanOhaeng(saju as never, 5, 15, '未')
const yr = calcYongsinNew(saju as never, '庚', score as never)
const dl = dayunGanjiList('丁巳', true, 10).map((d, i) => ({
  age: 7 + i * 10, cheongan: d.cheongan, jiji: d.jiji, ganYukchin: '—', jiYukchin: '—',
}))
const sy = calcSeyunList('庚', 2026).find(x => x.year === 2026) ?? null

console.log('명식  戊辰 丁巳 庚午 癸未 (만38세 남)')
console.log('='.repeat(74))

// ── ① pick() 이 고른 «줄»만의 크기 vs 상한 ──
console.log('\n① pick() 이 고른 줄 — 상한이 걸리는 부분')
const types: ServiceType[] = ['saju', 'integrated', 'career', 'exam', 'monthly', 'unse', 'couple', 'mulsang']
for (const t of types) {
  const r = pick({
    serviceType: t,
    questionCategories: ['재물'],
    ctx: { saju, dayStem: '庚', score, target: 'adult' },
  })
  console.log(`  ${t.padEnd(11)} 고른 줄 ${String(r.chars).padStart(5)}자 / 상한 ${String(SERVICE_BUDGET[t]).padStart(4)}${r.truncated ? '  ★잘림' : ''}`)
}

// ── ② 실제로 AI 에게 나가는 재료 전체 ──
console.log('\n② 실제로 AI 에게 나가는 재료 — 제목·명식특징까지 다 센 것')
function sajuMaterial(integrated: boolean, cats: string[]) {
  const inp = toTongbyeonInput({
    name: '류', gender: '남', age: 38, saju, dayStem: '庚',
    ohaeng: toPercentList(score), yongsin: yr as never, hourBranch: '未',
    currentDayun: dl.find(d => 38 >= d.age && 38 < d.age + 10) ?? null,
    thisYearSeyun: sy, questionCategories: cats, integrated, dayunList: dl,
  })
  const qs = QUESTIONS.filter(q => cats.includes(q.category)).slice(0, 3)
  return {
    mf: (inp.myeongsikFeatures ?? '').length,
    un: (inp.unseBlock ?? '').length,
    prompt: buildTongbyeonPrompt(inp, qs).length,
  }
}
for (const cats of [['재물'], ['연애·결혼'], ['건강'], ['재물', '연애·결혼', '직업·사업']]) {
  const off = sajuMaterial(false, cats)
  const on = sajuMaterial(true, cats)
  console.log(
    `  ${cats.join('+').padEnd(26)}` +
    ` 사주보기 재료 ${String(off.mf).padStart(5)}자 (총량상한 ${TOTAL_CAP.saju})` +
    `  →  통합 ${String(on.mf + on.un).padStart(5)}자 (총량상한 ${TOTAL_CAP.integrated})`,
  )
}

console.log('\n③ 프롬프트 전체 길이')
for (const cats of [['재물'], ['재물', '연애·결혼', '직업·사업']]) {
  const off = sajuMaterial(false, cats)
  const on = sajuMaterial(true, cats)
  console.log(`  ${cats.join('+').padEnd(26)} 사주보기 ${String(off.prompt).padStart(6)}자  ·  통합 ${String(on.prompt).padStart(6)}자`)
}
