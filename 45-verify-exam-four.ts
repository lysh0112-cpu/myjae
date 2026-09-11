/**
 * 45 — 합격운 · 취업운 «4갈래 + 쉬운 말투 + 달별 재료» 값 검사 (2026-09-11 · 6부 · 봉투 B)
 *
 *  ★[대표님 2026-09-11]
 *     「굳이 7갈래로 복잡하게 할 필요가 있을까 · 길게 쓰니 중언부언」 → 4갈래 (대표님 지시문)
 *     「해설을 따로 만들어야 할 정도로 어렵다」 → 쉬운 말 여섯 규칙
 *     (6부가 찾음) 「열두 달」 갈래에 달별 재료가 없어 AI 가 달을 짐작 → 달별 흐름을 재료로
 *  ⚠️ 옛 7갈래 기록은 다시보기 때 옛 모양 그대로 열려야 합니다.
 */
import * as fs from 'fs'
import { SEVEN_GROUPS, sevenOf, legacyOf, isLegacyTong, sevenKeyOf, buildSevenPrompt, monthlyMaterial } from './lib/saju/examLuck/buildExamSeven'
import { STUDENT_BAN_WORDS } from './lib/saju/examLuck/tables/rules'

let pass = 0, fail = 0
const ok = (c: boolean, m: string) => { if (c) { pass++; console.log('  ✅ ' + m) } else { fail++; console.log('  🔴 ' + m) } }

console.log('\n━━ ① 4갈래 — 대표님 지시문의 제목 그대로 ━━')
const TITLES = ['🧬 1. 한눈에 보는 나의 흐름과 강점', '🎯 2. 합격과 성취를 위한 실전 전략', '🗓️ 3. 월별 페이스메이커와 D-Day 수칙', '💌 4. 마지막 응원과 오늘의 실천']
ok(SEVEN_GROUPS.length === 4 && SEVEN_GROUPS.every(g => g.length === 1), '묶음 4개 · 한 묶음 = 한 갈래 = 한 번 호출')
for (const t of ['student', 'adult'] as const) ok(sevenOf(t).map(s => s.title).join('|') === TITLES.join('|'), `${t === 'student' ? '학생' : '성인'} — 제목 넷이 지시문 그대로`)
ok(legacyOf('adult').length === 7 && legacyOf('student').length === 7, '⚠️ 옛 7갈래 표는 다시보기용으로 남아 있습니다')

console.log('\n━━ ② 쉬운 말 여섯 규칙이 AI 에게 실제로 가는가 ━━')
{
  const base = { name: '가', gender: '남', age: 30, kind: 'job', cards: [], saju: [{ pillar: '일주', stem: '庚', branch: '子' }], hourUnknown: false, year: 2026, month: 9, examDate: '2026-11-15' }
  const adult = buildSevenPrompt({ ...base, target: 'adult' } as never, ['flow'])!.system
  const stu = buildSevenPrompt({ ...base, target: 'student', kind: 'exam' } as never, ['flow'])!.system
  ok(/관성 → 직장 · 합격운/.test(adult) && /인성 → 공부운/.test(adult), '생활 말 대응표 (관성 → 직장 · 합격운 · 인성 → 공부운)')
  ok(/처음 나올 때 한 번은 무슨 뜻인지 풀어/.test(adult), '사주 말이 처음 나올 때 뜻을 풀기')
  ok(/두 가지 운을 한 표현에 뭉치지 마세요/.test(adult), '두 운을 한 표현에 뭉치지 않기')
  ok(/결 · 값이 붙는다 · 두 겹 · 살려 준다 · 말이 앞선다/.test(adult), '뜻이 흐린 말 금지 목록')
  ok(/한 문장에는 한 가지만/.test(adult) && /그래서 이렇게 하세요/.test(adult), '한 문장 한 가지 · 단락마다 «그래서 이렇게 하세요»')
  ok(/좋은지 아닌지는 또렷하게/.test(adult) && /«대운» 이라는 말도 쓰지 말고/.test(adult), '좋고 나쁨은 또렷하게 · «대운» 이라는 말 쓰지 않기')
  ok(!/자리의 기운|배움의 기운/.test(adult + stu), '⛔ 옛 대응표(자리의 기운 · 배움의 기운)는 사라졌습니다')
  const body = stu.replace(/★이 손님은 학생입니다[\s\S]*?\n\n/g, '')
  ok(!STUDENT_BAN_WORDS.some(w => body.replace(/\s/g, '').includes(w.replace(/\s/g, ''))), '⛔ 학생 판 말투 규칙에 학생 금지어(직장 등)가 섞이지 않습니다')
}

console.log('\n━━ ③ 달별 재료 — 이번 달부터 열두 달 ━━')
{
  const m = monthlyMaterial('庚', 2026, 9, '2026-11-15')
  const rows = m.split('\n').filter(l => l.startsWith('- '))
  ok(rows.length === 12, `열두 달 (${rows.length})`)
  ok(rows[0].startsWith('- 2026년 9월') && rows[11].startsWith('- 2027년 8월'), '이번 달(2026년 9월)부터 이듬해 8월까지')
  ok(rows.filter(r => r.includes('시험(발표) 달')).length === 1 && rows[2].includes('11월') && rows[2].includes('시험(발표) 달'), '시험 달(11월)에 표시')
  ok(/천간 편인 · 지지 편인/.test(rows[1]), '10월(戊戌) — 庚 일간에게 천간 편인 · 지지 편인 (화면 달별 흐름표와 같은 계산)')
  const pace = buildSevenPrompt({ name: '가', gender: '남', age: 30, target: 'adult', kind: 'job', cards: [], saju: [{ pillar: '일주', stem: '庚', branch: '子' }], hourUnknown: false, year: 2026, month: 9, examDate: '2026-11-15' } as never, ['pace'])!.user
  const flow = buildSevenPrompt({ name: '가', gender: '남', age: 30, target: 'adult', kind: 'job', cards: [], saju: [{ pillar: '일주', stem: '庚', branch: '子' }], hourUnknown: false, year: 2026, month: 9 } as never, ['flow'])!.user
  ok(pace.includes('[달별 흐름') && pace.includes('목록에 없는 달을 지어내지 마세요'), '3번 갈래에 달별 재료 + «지어내지 말라»')
  ok(!flow.includes('[달별 흐름'), '다른 갈래에는 달별 재료를 싣지 않음')
  const stuPace = buildSevenPrompt({ name: '가', gender: '여', age: 18, target: 'student', kind: 'exam', cards: [], saju: [{ pillar: '일주', stem: '戊', branch: '申' }], hourUnknown: false, year: 2026, month: 9 } as never, ['pace'])!.user
  ok(stuPace.includes('[달별 흐름') && !STUDENT_BAN_WORDS.some(w => stuPace.includes(w)), '⛔ 학생 판 달별 재료에는 학생 금지어가 없습니다 (학생 말로)')
}

console.log('\n━━ ④ 옛 7갈래 기록 — 다시보기가 깨지지 않는가 ━━')
{
  const old = '■ 🧬 1. 타고난 일의 결과 강점 분야\n본문\n\n■ ✍️ 5. D-Day 당일 실전 수칙\n본문\n\n■ 💌 7. 마지막으로 드리고 싶은 말\n본문'
  const neu = '■ 🧬 1. 한눈에 보는 나의 흐름과 강점\n본문\n\n■ 💌 4. 마지막 응원과 오늘의 실천\n본문'
  ok(isLegacyTong(old) && !isLegacyTong(neu), '옛 글(5 · 6 · 7번 제목)과 새 글을 가립니다')
  ok(sevenKeyOf('■ 💌 7. 마지막으로 드리고 싶은 말', 'adult', true) === 'mentor', '옛 제목 → 옛 갈래로 읽힘')
  ok(sevenKeyOf('■ 💌 4. 마지막 응원과 오늘의 실천', 'adult') === 'cheer', '새 제목 → 새 갈래로 읽힘')
  const ex = fs.readFileSync('app/manseryeok/exam-luck-result/components/ExamResultShell.tsx', 'utf8')
  ok(/legacy \? legacyOf\(target\) : sevenOf\(target\)/.test(ex) && /sevenKeyOf\(title, target, legacy\)/.test(ex), '결과 화면이 옛 기록은 옛 7갈래로 그립니다')
  ok(/month: new Date\(\)\.getMonth\(\) \+ 1/.test(ex), '결과 화면이 이번 달을 AI 재료에 싣습니다')
}

console.log(`\n━━ 4갈래 · 쉬운 말투 · 달별 재료 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail) process.exit(1)
