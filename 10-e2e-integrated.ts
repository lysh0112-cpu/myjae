// 10-e2e-integrated.ts — 통합 리포트 파이프라인을 끝까지 관통시킨다
//   npx --yes tsx 10-e2e-integrated.ts
//
// 교훈 CK — 자료를 얹은 날에는 한 명을 끝까지 통과시켜 보라
// 교훈 CF — 얹으면서 크기를 잰다

import { toTongbyeonInput } from './lib/saju/toTongbyeonInput'
import { buildTongbyeonPrompt } from './lib/saju/tongbyeonPrompt'
import { calcSimsanOhaeng, toPercentList } from './lib/saju/simsanOhaeng'
import { calcYongsinNew } from './lib/saju/yongsinNew'
import { dayunGanjiList, calcSeyunList, isForwardDayun } from './lib/saju/dayun'
import { INTEGRATED_QUESTIONS, TIME_QUESTIONS } from './lib/saju/integratedQuestions'
import { SERVICE_BUDGET } from './lib/saju/jaryoPick'

type P = { pillar: string; stem: string; branch: string }

// 34부 E2E 와 같은 명식: 1988-05-15 14:30 남 → 戊辰 丁巳 庚午 癸未
const saju: P[] = [
  { pillar: '년주', stem: '戊', branch: '辰' },
  { pillar: '월주', stem: '丁', branch: '巳' },
  { pillar: '일주', stem: '庚', branch: '午' },
  { pillar: '시주', stem: '癸', branch: '未' },
]
const dayStem = '庚'
const gender = '남'
const age = 38
const CUR_YEAR = 2026

const score = calcSimsanOhaeng(saju as never, 5, 15, '未')
const yr = calcYongsinNew(saju as never, dayStem, score as never)

// 대운 목록 — 대운수 7 순행 가정 (34부 E2E 와 같음)
const forward = isForwardDayun('戊', gender)
const START = 7
const dayunList = dayunGanjiList('丁巳', forward, 10).map((d, i) => ({
  age: START + i * 10,
  cheongan: d.cheongan,
  jiji: d.jiji,
  ganYukchin: '—',
  jiYukchin: '—',
}))
const seyun = calcSeyunList(dayStem, CUR_YEAR).find(x => x.year === CUR_YEAR) ?? null

console.log('명식  戊辰 丁巳 庚午 癸未  (1988-05-15 14:30 남 · 만38세)')
console.log('순행 =', forward, '· 대운수', START)
console.log('올해 세운 =', seyun ? `${seyun.cheongan}${seyun.jiji}` : '없음')
console.log('격 =', yr?.gyeokguk.name, '· 신강약 =', yr?.status)

const ohaeng = toPercentList(score)

function run(cats: string[], integrated: boolean) {
  const input = toTongbyeonInput({
    name: '류도이', gender, age, saju, dayStem, ohaeng, yongsin: yr as never,
    hourBranch: '未',
    currentDayun: dayunList.find(d => age >= d.age && age < d.age + 10) ?? null,
    thisYearSeyun: seyun,
    questionCategories: cats,
    integrated,
    dayunList,
  })
  const qs = INTEGRATED_QUESTIONS.filter(q => cats.includes(q.category)).slice(0, 3)
  const prompt = buildTongbyeonPrompt(input, qs)
  return { input, prompt, qs }
}

console.log('\n════ ① 흐름 재료 세 덩이 (통합 모드) ════')
const a = run(['재물', '인생 흐름'], true)
console.log(a.input.unseBlock ?? '(없음)')

console.log('\n════ ② 크기 비교 ════')
for (const cats of [['재물'], ['인생 흐름'], ['전환기'], ['재물', '인생 흐름', '연애·결혼']]) {
  const off = run(cats, false)
  const on = run(cats, true)
  const f = (s?: string) => (s ?? '').length
  console.log(
    `  ${cats.join('+').padEnd(22)} ` +
    `명식특징 ${String(f(off.input.myeongsikFeatures)).padStart(5)} → ${String(f(on.input.myeongsikFeatures)).padStart(5)}` +
    ` · 흐름 ${String(f(on.input.unseBlock)).padStart(4)}` +
    ` · 재료합 ${String(f(on.input.myeongsikFeatures) + f(on.input.unseBlock)).padStart(5)} / 상한 ${SERVICE_BUDGET.integrated}`,
  )
}

console.log('\n════ ③ 스토리텔링 지시가 실렸는가 ════')
const has = a.prompt.includes('[흐름을 엮는 법 — 매우 중요]')
console.log('  지시문:', has ? '✅ 실림' : '★안 실림')
console.log('  프롬프트 전체 길이:', a.prompt.length.toLocaleString(), '자')
console.log('  월운 금지 문구:', a.prompt.includes('월운·일운은 당신에게 주지 않았습니다') ? '✅' : '★')

console.log('\n════ ④ 시기 질문이 붙는가 ════')
console.log('  통합 질문 수:', INTEGRATED_QUESTIONS.length, '(시기', TIME_QUESTIONS.length + ')')
console.log('  「인생 흐름」 카드:', run(['인생 흐름'], true).qs.map(q => q.sub).join(' · '))
