/**
 * 46 — 취업운 «지금 상황 · 거쳐야 할 관문» 알약 값 검사 (2026-09-11 · 6부)
 *
 *  ★[대표님 2026-09-11] 「일자리를 구해요에서 취업 · 면접 · 이직 · 시험을 알약으로 —
 *     면접만 보는 사람에게 시험 이야기가 나오는 것을 막자」 · 「신규 취업, 이직으로 표시」
 *  ⇒ 두 줄: 지금 상황(하나) 신규 취업 / 이직 · 거쳐야 할 관문(여러 개) 시험 / 면접
 *     (한 줄 네 개면 «신규 취업 + 이직» 이 함께 눌려 오히려 생뚱맞은 답이 나옴 — 6부 판단 · 대표님 승낙)
 *  ⚠️ 해마다 점수는 바꾸지 않습니다 (시험을 고르면 인성 점수를 더할지는 연재쌤께 여쭐 일).
 */
import * as fs from 'fs'
import { JOB_SITUATIONS, JOB_GATES, parseGates, dateLabelFor } from './lib/saju/examLuck/tables/jobFields'
import { buildSevenPrompt } from './lib/saju/examLuck/buildExamSeven'
import type { ExamCard } from './lib/saju/examLuck/types'

let pass = 0, fail = 0
const ok = (c: boolean, m: string) => { if (c) { pass++; console.log('  ✅ ' + m) } else { fail++; console.log('  🔴 ' + m) } }

console.log('\n━━ ① 알약 두 줄 ━━')
ok(JOB_SITUATIONS.map(s => s.label).join('|') === '신규 취업|이직', '지금 상황 — 신규 취업 / 이직 [대표님 이름]')
ok(JOB_GATES.map(g => g.label).join('|') === '시험|면접', '거쳐야 할 관문 — 시험 / 면접')
ok(parseGates('exam,interview')!.join() === 'exam,interview' && parseGates('interview')!.join() === 'interview', '관문은 여러 개')
ok(parseGates('bad,exam')!.join() === 'exam', '모르는 값은 버립니다')
ok(parseGates(null) === null, '옛 기록(값 없음)은 null — «모두 고른 것» 으로 봅니다')

console.log('\n━━ ② 날짜 칸 이름이 고른 관문을 따라가는가 ━━')
ok(dateLabelFor(['exam']) === '시험 날짜' && dateLabelFor(['interview']) === '면접 날짜', '시험 날짜 · 면접 날짜')
ok(dateLabelFor(['exam', 'interview']) === '시험 또는 면접 날짜' && dateLabelFor([]) === '발표 날짜', '둘 다 · 아무것도')

console.log('\n━━ ③ 조합마다 AI 지시가 달라지는가 ━━')
const jobCard: ExamCard = { key: 'jobchange', title: '이직과 직업 변동', lines: [], reasons: ['[이 사람의 직업 변동 결론] 이직 표본'] }
const base = { name: '가', gender: '남', age: 30, target: 'adult', kind: 'job', cards: [jobCard], saju: [{ pillar: '일주', stem: '庚', branch: '子' }], hourUnknown: false, year: 2026, month: 9, examDate: '2026-11-15' }
const P = (g: string, extra: object) => buildSevenPrompt({ ...base, ...extra } as never, [g] as never)!
const hintOf = (u: string) => u.slice(u.indexOf('(본문'), u.indexOf('[실천]'))
{
  const s = P('strategy', { jobSituation: 'new', jobGates: ['interview'] }), d = P('pace', { jobSituation: 'new', jobGates: ['interview'] })
  ok(/면접 연습/.test(hintOf(s.user)) && !/시험공부|필기/.test(hintOf(s.user)), '신규 취업 + 면접 — 전략에 면접 연습 · 시험공부 없음')
  ok(/면접장/.test(hintOf(d.user)) && !/시험장|1교시|답안|문제를 풀기/.test(hintOf(d.user)), '신규 취업 + 면접 — 당일 수칙은 면접장만')
  ok(/고르지 않은 시험/.test(s.user + s.system), '★「고르지 않은 시험 이야기는 쓰지 마세요」 를 못 박음')
  ok(!s.user.includes('이직 표본') && /이직 · 직장 옮기기 이야기를 쓰지 마세요/.test(s.user + s.system), '★신규 취업 — 이직 재료를 빼고, 이직 이야기를 쓰지 말라고')
}
{
  const s = P('strategy', { jobSituation: 'move', jobGates: ['exam'] }), d = P('pace', { jobSituation: 'move', jobGates: ['exam'] })
  ok(/시험공부/.test(hintOf(s.user)) && !/면접 연습/.test(hintOf(s.user)), '이직 + 시험 — 전략에 시험공부 · 면접 연습 없음')
  ok(/시험장/.test(hintOf(d.user)) && !/면접장/.test(hintOf(d.user)), '이직 + 시험 — 당일 수칙은 시험장만')
  ok(s.user.includes('이직 표본') && /옮기기 전에 전할 말/.test(hintOf(s.user)), '★이직 — 이직 재료와 «옮기기 전에 전할 말»')
  ok(/고르지 않은 면접/.test(s.user + s.system), '「고르지 않은 면접 이야기는 쓰지 마세요」')
}
{
  const s = P('strategy', { jobSituation: 'new', jobGates: ['exam', 'interview'] }), d = P('pace', { jobSituation: 'new', jobGates: ['exam', 'interview'] })
  ok(/필기 공부/.test(hintOf(s.user)) && /면접 연습/.test(hintOf(s.user)), '시험 + 면접 — 필기와 면접을 나누는 시간 배분')
  ok(/시험장/.test(hintOf(d.user)) && /면접장/.test(hintOf(d.user)), '시험 + 면접 — 두 날의 수칙')
  ok(/숫자로 내세요/.test(hintOf(s.user)), '비율은 여전히 숫자로 (14번 검사와 짝)')
}
{
  const s = P('strategy', {}), d = P('pace', {})
  ok(s.user.includes('이직 표본') && /필기|시험/.test(hintOf(s.user)) && /면접/.test(hintOf(s.user)), '옛 기록(알약 없음) — 지금처럼 «모두 고른 것» 으로')
  ok(!/고르지 않은/.test(s.user + s.system + d.user), '옛 기록에는 «고르지 않은» 금지 줄을 넣지 않음')
}
{
  const e = buildSevenPrompt({ ...base, kind: 'exam', jobGates: ['interview'] } as never, ['pace'] as never)!
  ok(!/고르지 않은/.test(e.user + e.system), '«시험 준비 중이에요» 쪽에는 알약이 끼어들지 않음')
}

console.log('\n━━ ④ 화면 · 저장 짝 ━━')
{
  const ip = fs.readFileSync('app/manseryeok/exam-luck-input/page.tsx', 'utf8'), ex = fs.readFileSync('app/manseryeok/exam-luck-result/components/ExamResultShell.tsx', 'utf8')
  const st = fs.readFileSync('app/manseryeok/exam-luck/page.tsx', 'utf8')
  ok(/JOB_SITUATIONS\.map/.test(ip) && /JOB_GATES\.map/.test(ip), '입력 화면에 알약 두 줄')
  ok(/dateLabelFor\(gates\)/.test(ip), '날짜 칸 이름이 고른 관문을 따라감')
  ok(/p\.set\('sit'/.test(ip) && /p\.set\('gates'/.test(ip), '주소에 상황 · 관문을 실음')
  ok(/jobSituation:/.test(ex) && /jobGates:/.test(ex) && /sit, gates:/.test(ex), '결과 화면이 AI 에 넘기고 기록에 저장')
  ok(/'sit', 'gates'/.test(st), '보관함이 다시 열 때 상황 · 관문을 실음')
}

console.log('\n━━ ⑤ 🔴 AI 가 끝없이 다시 불리지 않는가 (대표님 「풀이가 안나와」 · 6부) ━━')
{
  //  [겪음] gates 를 useMemo 없이 만들어, 다시 그릴 때마다 «새 목록» → AI effect 가 끊고 다시 부르기를 되풀이
  //  ⇒ AI effect 의존 목록의 이름마다, 그 값이 «매번 새로 만들어지는 목록 · 객체» 가 아닌지 봅니다.
  const ex = fs.readFileSync('app/manseryeok/exam-luck-result/components/ExamResultShell.tsx', 'utf8')
  const start = ex.indexOf("setTongState('loading')")
  const depsAt = ex.indexOf('}, [', ex.indexOf('return () => {', start))
  const deps = ex.slice(depsAt + 4, ex.indexOf('])', depsAt)).split(',').map(x => x.trim()).filter(Boolean)
  ok(deps.includes('gates') && deps.length > 10, `AI effect 의존 목록을 찾았습니다 (${deps.length}개)`)
  const unstable: string[] = []
  for (const d of deps) {
    const decl = new RegExp(`const (?:\\[)?\\s*${d}\\b[^=\\n]*=\\s*([^\\n]+)`).exec(ex)
    if (!decl) continue                                       // useState · useRef · props 등 (안정)
    const rhs = decl[1]
    //  한 번만 만들어지는 것: useMemo · useState · useRef · 글자 · 숫자 · 참거짓 · sp.get
    if (/^use(Memo|State|Ref|Callback)\b/.test(rhs)) continue
    if (/^(sp\.get|parseSituation|sanitizeWish|sanitizeJobText|wishLooksHeavy|typeof|new Date\(\)\.getFullYear|exactAge)/.test(rhs)) continue
    if (/^['"`\d]|^(true|false)|^mode ===|^sp\.get\(/.test(rhs)) continue
    if (/\|\| '|\?\s*\(?\s*wayFromPicks|=== 'unknown'/.test(rhs)) continue   // 글자로 끝나는 식
    if (/^(parse|\[|\{|new |[A-Za-z_]+\()/.test(rhs)) unstable.push(`${d} = ${rhs.slice(0, 40)}`)
  }
  ok(unstable.length === 0, `⛔ 매번 새로 만들어지는 목록 · 객체가 AI effect 의존 목록에 없습니다${unstable.length ? ' — ' + unstable.join(' / ') : ''}`)
  ok(/const gates = useMemo\(\(\) => parseGates\(gatesParam\), \[gatesParam\]\)/.test(ex), '관문 목록은 useMemo 로 한 번만')
}

console.log(`\n━━ 지금 상황 · 거쳐야 할 관문 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail) process.exit(1)
