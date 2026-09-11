/**
 * 49 — 합격운 · 취업운 «엔진 계산» 값 검사 (2026-09-12 · 6부)
 *
 *  ★[대표님 2026-09-12] 「오늘 합격운 · 취업운 엔진 계산까지 마무리 짓자」
 *    유형 · 비율 셋 · 가장 좋은 달 · 조심할 달 · 당일 수칙 종류를 «엔진이» 정하고, AI 는 풀어 쓰기만.
 *    [왜] AI 가 고르면 같은 사람이 다시 돌릴 때 좋은 달 · 비율이 바뀌고, 근거를 보일 수 없음.
 *  ⚠️ 숫자들은 초안 값입니다 (연재쌤 확인 대기 · 「합격운취업운_엔진계산초안_연재쌤확인.docx」).
 *     확인이 오면 lib/saju/examLuck/tables/engineRules.ts 한 곳만 고칩니다.
 *  ⚠️ 이 검사는 초안 문서의 «두 분으로 돌려 본 결과» 와 엔진이 같은 값을 내는지 봅니다.
 */
import * as fs from 'fs'
import { buildPlan, judgeType, practiceRatio, susiRatio, applyRatio, pickMonths, dDayKind, planBlock } from './lib/saju/examLuck/engineCalc'
import { buildSevenPrompt } from './lib/saju/examLuck/buildExamSeven'
import { calcSimsanOhaeng } from './lib/saju/simsanOhaeng'
import type { Pillar } from './lib/saju/examLuck/types'

let pass = 0, fail = 0
const ok = (c: boolean, m: string) => { if (c) { pass++; console.log('  ✅ ' + m) } else { fail++; console.log('  🔴 ' + m) } }
const P = (a: string[]) => ['시주', '일주', '월주', '년주'].map((n, i) => ({ pillar: n, stem: a[i][0], branch: a[i][1] })) as Pillar[]
const doyun = P(['己卯', '庚子', '己卯', '乙亥']), seoyeon = P(['庚申', '戊申', '庚申', '戊子'])
const ohD = calcSimsanOhaeng(doyun as never, 3, 10, '卯') as Record<string, number>
const ohS = calcSimsanOhaeng(seoyeon as never, 9, 5, '申') as Record<string, number>

console.log('\n━━ ① 초안 문서의 두 분과 같은 값인가 ━━')
{
  const tD = judgeType(doyun, ohD), tS = judgeType(seoyeon, ohS)
  ok(tD.label.includes('실전형') && tS.label.includes('실전형'), `유형 — 도윤 ${tD.label} · 서연 ${tS.label}`)
  ok(practiceRatio(tD.yuk) === 60, `도윤 실전 ${practiceRatio(tD.yuk)} : 공부 ${100 - practiceRatio(tD.yuk)} (초안 60 : 40)`)
  ok(susiRatio(seoyeon).susi === 70, `서연 수시 ${susiRatio(seoyeon).susi} : 정시 ${susiRatio(seoyeon).jeongsi} (초안 70 : 30)`)
  ok(applyRatio('아주 좋음', 'adult') === '3 : 4 : 3' && applyRatio('좋음', 'student') === '2 : 2 : 2', '지원 비율 — 도윤 3 : 4 : 3 · 서연 2 : 2 : 2')
  const mD = pickMonths({ dayStem: '庚', year: 2026, month: 9, examDate: '2026-11-15', target: 'adult', kind: 'job' })
  const mS = pickMonths({ dayStem: '戊', year: 2026, month: 9, examDate: '2026-11-19', target: 'student', kind: 'exam', earlyDayun: true })
  ok(mD.best.label === '2026년 10월' && mD.worst.label === '2026년 12월', `도윤 — 가장 좋은 달 ${mD.best.label} · 조심할 달 ${mD.worst.label} (초안 10월 · 12월)`)
  ok(mS.best.label === '2026년 9월' && mS.worst.label === '2026년 11월', `서연 — 가장 좋은 달 ${mS.best.label} · 조심할 달 ${mS.worst.label} (초안 9월 · 11월)`)
  ok(mS.worst.notes.some(n => n.includes('학마운')), '서연 11월 — 1 · 2대운 학마운 −2 가 걸림 (교재 230쪽)')
  ok(mD.months.length === 12 && mD.months[0].label === '2026년 9월', '이번 달부터 열두 달')
}

console.log('\n━━ ② 같은 사람은 몇 번을 돌려도 같은 답 ━━')
{
  const a = JSON.stringify(buildPlan({ saju: doyun, ohaeng: ohD, year: 2026, month: 9, examDate: '2026-11-15', target: 'adult', kind: 'job', grade: '아주 좋음', dayunOrder: 4 }))
  const b = JSON.stringify(buildPlan({ saju: doyun, ohaeng: ohD, year: 2026, month: 9, examDate: '2026-11-15', target: 'adult', kind: 'job', grade: '아주 좋음', dayunOrder: 4 }))
  ok(a === b, '같은 입력 → 같은 계획 (AI 가 고르지 않음)')
}

console.log('\n━━ ③ 약점 보완 — 가장 큰 육친과 둘째가 10점도 안 나면 두 유형을 함께 ━━')
{
  const close = judgeType(doyun, { 목: 0, 화: 0, 토: 28, 금: 30, 수: 0 } as never)   // 庚 — 비겁 30 · 인성 28
  ok(close.close && !!close.second, `차이 2점 → 두 유형 (${close.label} + ${close.second})`)
  const far = judgeType(doyun, ohD)
  ok(!far.close, '차이가 크면 한 유형 (도윤 재성 50 · 인성 20)')
}

console.log('\n━━ ④ 비율 — 30 ~ 70 으로 묶임 · 당일 수칙 종류 ━━')
{
  ok(practiceRatio({ 비겁: 0, 식상: 0, 재성: 0, 관성: 50, 인성: 50 }) === 30 && practiceRatio({ 비겁: 0, 식상: 60, 재성: 40, 관성: 0, 인성: 0 }) === 70, '극단이어도 30 ~ 70')
  ok(dDayKind('庚', '癸巳', false).includes('말이 빨라지') , `도윤 11/15 癸巳 (상관 · 편관) → ${dDayKind('庚', '癸巳', false)}`)
  ok(dDayKind('庚', '癸巳', true).includes('집중이 잠깐씩'), '공망이면 공망 수칙이 먼저')
  ok(dDayKind('戊', '丁酉', false).includes('외운 것이 잘 떠오르는'), `서연 11/19 丁酉 (정인 · 상관) → ${dDayKind('戊', '丁酉', false)}`)
}

console.log('\n━━ ⑤ AI 에게 «정해진 값» 으로 넘어가는가 — 바꾸지 말라고 ━━')
{
  const plan = buildPlan({ saju: doyun, ohaeng: ohD, year: 2026, month: 9, examDate: '2026-11-15', target: 'adult', kind: 'job', grade: '아주 좋음', dayunOrder: 4, examDayGanji: '癸巳', examGongmang: false })
  const base = { name: '가', gender: '남', age: 31, target: 'adult', kind: 'job', cards: [], saju: doyun, hourUnknown: false, year: 2026, month: 9, examDate: '2026-11-15', plan }
  const f = buildSevenPrompt(base as never, ['flow'] as never)!, s = buildSevenPrompt(base as never, ['strategy'] as never)!, p = buildSevenPrompt(base as never, ['pace'] as never)!
  ok(/엔진이 정한 값/.test(f.user) && f.user.includes('실전형') && /바꾸거나 다른 값을 지어내지 마세요/.test(f.user) && /유형은 위 \[엔진이 정한 값\] 그대로/.test(f.user), '1번 갈래 — 유형이 정해진 값으로 · 쓰기 지시도 «그대로»')
  ok(s.user.includes('실전 60 : 공부 40') && s.user.includes('3 : 4 : 3') && /숫자로 내세요/.test(s.user), '2번 갈래 — 비율이 정해진 값으로 (숫자로 내세요 · 14번과 짝)')
  ok(p.user.includes('2026년 10월') && p.user.includes('2026년 12월') && p.user.includes('말이 빨라지'), '3번 갈래 — 가장 좋은 달 · 조심할 달 · 당일 수칙이 정해진 값으로')
  ok(!f.user.includes('3 : 4 : 3') && !s.user.includes('2026년 12월'), '갈래마다 제 몫만 (되풀이 막기)')
  const none = buildSevenPrompt({ ...base, plan: null } as never, ['strategy'] as never)!
  ok(!/엔진이 정한 값/.test(none.user), '계획이 없으면(옛 흐름) 아무것도 더하지 않음')
  ok(/타고난 그릇/.test(f.system), '★말투 — 원국은 «타고난 그릇» 이라고 부르게 [대표님]')
  ok(planBlock(plan, 'flow').length > 0 && planBlock(plan, 'cheer') === '', '4번 갈래(응원)에는 계산 값을 싣지 않음')
}

console.log('\n━━ ⑥ 결과 화면 — 계획은 «한 번만» 만든다 (끝없이 다시 부르기 막기 · 검사 46 과 짝) ━━')
{
  const ex = fs.readFileSync('app/manseryeok/exam-luck-result/components/ExamResultShell.tsx', 'utf8')
  ok(/const plan = useMemo\(/.test(ex) && /plan,\s*\/\//.test(ex), '계획은 useMemo 로 한 번만 · AI 에 넘김')
}

console.log(`\n━━ 엔진 계산 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail) process.exit(1)
