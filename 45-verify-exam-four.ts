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
import { SEVEN_GROUPS, sevenOf, legacyOf, isLegacyTong, sevenKeyOf, buildSevenPrompt, monthlyMaterial, dedupeBody } from './lib/saju/examLuck/buildExamSeven'
import { STUDENT_BAN_WORDS, CLOSING, CLOSING_STUDENT } from './lib/saju/examLuck/tables/rules'
import { cardJobFit } from './lib/saju/examLuck/buildCards'
import { buildPlan, planBlock } from './lib/saju/examLuck/engineCalc'
const buildPlan45 = () => buildPlan({
  saju: ['시주', '일주', '월주', '년주'].map((n, i) => ({ pillar: n, stem: ['己卯', '庚子', '己卯', '乙亥'][i][0], branch: ['己卯', '庚子', '己卯', '乙亥'][i][1] })) as never,
  ohaeng: { 목: 50, 화: 0, 토: 20, 금: 10, 수: 20 }, year: 2026, month: 9, examDate: '2026-12-15',
  target: 'adult', kind: 'job', grade: '보통', dayunOrder: 4,
})
const planBlock45 = planBlock

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
  //  ⚠️ 「흐린 말 금지 목록」 에는 그 낱말이 «쓰지 말라» 는 뜻으로 적혀 있으므로 그 줄은 빼고 봅니다 (6부)
  const noBan = (x: string) => x.split('\n').filter(l => !/쓰지 마세요|흐린 말/.test(l)).join('\n')
  ok(!/자리의 기운|배움의 기운/.test(noBan(adult) + noBan(stu)), '⛔ 옛 대응표(자리의 기운 · 배움의 기운)는 사라졌습니다')
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

console.log('\n━━ ⑤ 맺음말 — 「흉할 것도 길할 것도 없다」 를 뺐는가 [대표님 2026-09-11] ━━')
{
  //  「시험 안 보는 사람에게는 생뚱맞고, 이 말이 없어도 아래 말들이 다 덮는다」
  const all = [...CLOSING, ...CLOSING_STUDENT].join(' ')
  ok(!/흉할 것도 길할 것도|시험의 본질은/.test(all), '맺음말 상자와 AI 재료에서 그 문장이 사라졌습니다')
  ok(CLOSING.length === 3 && CLOSING_STUDENT.length === 3 && /일희일비/.test(CLOSING[2]), '나머지 세 줄(채우는 때 · 노력 · 일희일비)은 그대로')
  const cheer = buildSevenPrompt({ name: '가', gender: '남', age: 30, target: 'adult', kind: 'job', cards: [], saju: [], hourUnknown: false, year: 2026 } as never, ['cheer'])!
  ok(!/흉할 것도 길할 것도/.test(cheer.system + cheer.user), '응원 갈래 지시문에도 그 문장이 없습니다')
  const exs = fs.readFileSync('app/manseryeok/exam-luck-result/components/ExamResultShell.tsx', 'utf8')
  ok(!/CLOSING/.test(exs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), '★맨 아래 상자에서 교재 맺음말 줄을 뺐습니다 (4번 갈래와 겹치지 않게) [대표님]')
  ok(/마지막으로 드리고 싶은 말/.test(exs) && /사주는 지도일 뿐, 걷는 것은/.test(exs), '상자에는 「사주는 지도일 뿐 …」 한 줄만 남음')
}

console.log('\n━━ ⑥ 🔴 같은 내용이 두 번 나오지 않는가 [대표님 실측 2026-09-12] ━━')
{
  const para = '2026년에 가장 먼저 할 일은 지금까지의 직무 경력을 한 장으로 정리하는 것입니다. 시간순으로 묶어 두면 지원서 쓰기가 빨라집니다.'
  const other = '자리를 옮기기로 마음을 굳히셨다면 새 일터에서 최소 3년은 익히겠다는 마음으로 들어가세요.'
  ok(dedupeBody(`${para}\n\n${other}\n\n${para}`) === `${para}\n\n${other}`, '★같은 단락이 두 번 나오면 뒤엣것을 버립니다')
  ok(dedupeBody(`${para}\n\n${other}`) === `${para}\n\n${other}`, '다른 단락은 그대로 둡니다')
  ok(dedupeBody('[실천] 오늘 한 가지.\n\n[실천] 오늘 한 가지.').split('\n\n').length === 2, '짧은 줄은 건드리지 않습니다')
  const ex = fs.readFileSync('app/manseryeok/exam-luck-result/components/ExamResultShell.tsx', 'utf8')
  ok(/out\[k\] = dedupeBody\(body\)/.test(ex), '화면이 글을 그릴 때 되풀이를 걷어냅니다')
  const sys = buildSevenPrompt({ name: '가', gender: '남', age: 30, target: 'adult', kind: 'job', cards: [], saju: [], hourUnknown: false, year: 2026 } as never, ['strategy'])!.system
  ok(/같은 내용을 두 번 쓰지 마세요/.test(sys), 'AI 에게도 「두 번 쓰지 말라」')
  ok(/맺음말은[\s\S]{0,40}마지막 갈래에서만/.test(sys), '★맺음말은 마지막 갈래에서만 (2 · 3번 갈래에 되풀이되던 것)')
  const st = buildSevenPrompt({ name: '가', gender: '남', age: 30, target: 'adult', kind: 'job', cards: [], saju: [], hourUnknown: false, year: 2026, jobSituation: 'move',
    cards2: null } as never, ['strategy'])!.user
  ok(/옮긴 뒤 최소 3년/.test(st), '★이직 — 「옮긴 뒤 3년」 (「3년 지켜본 뒤 옮기라」 가 아님)')
}

console.log('\n━━ ⑦ 손님 편에 서서 말하기 [대표님 2026-09-12 — 「용기를 가지라고 해 줘야지」] ━━')
{
  const sys = buildSevenPrompt({ name: '가', gender: '남', age: 30, target: 'adult', kind: 'job', cards: [], saju: [], hourUnknown: false, year: 2026 } as never, ['strategy'])!
  ok(/이미 정한 일[\s\S]{0,60}말리지 마세요/.test(sys.system), '★손님이 이미 정한 일은 말리지 않습니다')
  ok(/«보통» 은 나쁜 해가 아닙니다/.test(sys.system) && /준비한 만큼 나오는 해/.test(sys.system), '★「보통」 을 나쁜 해로 말하지 않습니다')
  ok(/아쉬운 점은 «반드시 막는 법과 함께»/.test(sys.system), '아쉬운 점은 막는 법과 함께')
  ok(/올해 안 되면 그 해까지 두 해로/.test(sys.system), '올해가 가장 좋은 해가 아니면 더 좋은 해를 함께')
  ok(/밀고 가셔도 됩니다/.test(sys.user), '2번 갈래 — 그 결정을 먼저 받아 주기')
  ok(/바람에 맞춰 판정을 바꾸지 마세요/.test(buildSevenPrompt({ name: '가', gender: '남', age: 30, target: 'adult', kind: 'job', cards: [], saju: [], hourUnknown: false, year: 2026, wish: '올해 꼭 옮기고 싶어요' } as never, ['strategy'])!.user), '⛔ 다만 판정 자체는 바꾸지 않습니다 (그대로)')
}

console.log('\n━━ ⑧ 한자말 · 판정 이름이 그대로 나오지 않는가 [대표님 실측 2026-09-12 · 2] ━━')
{
  const sys = buildSevenPrompt({ name: '가', gender: '남', age: 30, target: 'adult', kind: 'job', cards: [], saju: [], hourUnknown: false, year: 2026 } as never, ['flow'])!
  ok(/괄호로 덧붙이지 마세요/.test(sys.system) && /식상/.test(sys.system), '★「말하고 글 쓰는 재주(식상)」 처럼 괄호로 덧붙이지 않기')
  ok(/판정 이름\(비겁[\s\S]{0,140}그대로 쓰지 마세요/.test(sys.system), '★재료의 판정 이름(비겁 · 사업가 · 상관견관 …)을 그대로 쓰지 않기')
  const st = buildSevenPrompt({ name: '가', gender: '남', age: 30, target: 'adult', kind: 'job', cards: [], saju: [], hourUnknown: false, year: 2026 } as never, ['flow'])!.user
  ok(/«한 해» 와 «한 달» 을 섞어/.test(buildSevenPrompt({ name: '가', gender: '남', age: 30, target: 'adult', kind: 'job', cards: [], saju: [], hourUnknown: false, year: 2026 } as never, ['strategy'])!.user), '★「2026년 12월은 … 해라」 처럼 해와 달을 섞지 않기')
  ok(/「조심하는 해」 라 쓰지 말고/.test(st), '★등급을 겁주는 말로 옮기지 않기')
  //  적성 카드 — 구조 이름 대신 생활 말
  const card = cardJobFit([{ key: 'saeobga', name: '사업가', score: 7, why: ['재성이 강해요'], note: '' }] as never, 'chang')
  ok(card.reasons.some(r => r.includes('사업') && !r.includes('사업가 (')), `적성 카드 재료가 생활 말로 — ${card.reasons[1]}`)
}

console.log('\n━━ ⑨ 점수 숫자 · 옛 말투 · 달 늘어놓기 [대표님 실측 2026-09-12 · 3] ━━')
{
  const sys = buildSevenPrompt({ name: '가', gender: '남', age: 30, target: 'adult', kind: 'job', cards: [], saju: [], hourUnknown: false, year: 2026 } as never, ['flow'])!.system
  ok(/배움의 기운 · 자리의 기운 · 원국/.test(sys), '★「배움의 기운 · 자리의 기운 · 원국」 을 흐린 말 목록에 넣음')
  ok(/「전체의 15 정도」 처럼 점수 숫자를 글에 쓰지 말고/.test(sys), '★점수 숫자를 글에 쓰지 않기 (비율은 숫자로)')
  const plan = buildPlan45()
  const blk = planBlock45(plan, 'flow')
  ok(!/\d{2}/.test(blk.replace(/\d+년|\d+월/g, '')) && /넉넉하게 갖추신 힘|고르게 갖춘/.test(blk), `엔진이 점수 대신 «가진 힘» 으로 넘깁니다 — ${blk.split('\n').find(l => l.includes('힘'))?.slice(0, 70)}`)
  const pace = buildSevenPrompt({ name: '가', gender: '남', age: 30, target: 'adult', kind: 'job', cards: [], saju: [], hourUnknown: false, year: 2026, month: 9, plan } as never, ['pace'])!.user
  ok(/달은 이 «둘» 만 짚고/.test(pace), '★달은 좋은 달 · 조심할 달 둘만 (줄줄이 늘어놓지 않기)')
}

console.log('\n━━ ⑩ 희망 쪽으로 — 약한 것을 짚지 않는가 [대표님 2026-09-12 「이것도 장사야」] ━━')
{
  const sys = buildSevenPrompt({ name: '가', gender: '남', age: 30, target: 'adult', kind: 'job', cards: [], saju: [], hourUnknown: false, year: 2026 } as never, ['flow'])!.system
  ok(/답보다 «용기» 를 얻으러 옵니다/.test(sys), '★손님은 용기를 얻으러 온다 — 다 읽고 「할 수 있겠다」 가 남게')
  ok(/크지 않지만[\s\S]{0,60}쓰지 마세요|모자란 쪽을 말하지 마세요/.test(sys), '★「크지 않지만 · 부족하지만」 을 쓰지 않기')
  ok(/고르신 목표와 «다른 길» 을 권하지 마세요/.test(sys) && /체질이다/.test(sys), '★창업 권유 · 「○○ 체질」 처럼 결정을 흔드는 말 금지')
  ok(/상관없는 힘» 을 끌어들이지 마세요/.test(sys), '★면접만 보는 분께 「공부운」 처럼 상관없는 힘을 끌어들이지 않기')
  ok(/비겁 · 식상 · 재성 · 관성 · 인성/.test(sys), '★육친 이름(비겁 등)도 판정 이름 금지 목록에')
  //  엔진 — 작은 기운은 아예 넘기지 않음
  const blk = planBlock45(buildPlan45(), 'flow')
  ok(/넉넉하게 갖추신 힘/.test(blk) && !/드러나지 않음|적음/.test(blk), `엔진이 넉넉한 힘만 넘깁니다 — ${blk.split('\n').find(l => l.includes('넉넉하게'))?.slice(0, 80)}`)
  ok(/적은 힘은 «짚지 마세요»/.test(blk), '엔진 재료에도 「적은 힘은 짚지 말라」')
}

console.log('\n━━ ⑪ 천간 · 지지 · 창업 · 호칭 [대표님 실측 2026-09-12 · 4] ━━')
{
  const sys = buildSevenPrompt({ name: '가', gender: '남', age: 30, target: 'adult', kind: 'job', cards: [], saju: [], hourUnknown: false, year: 2026 } as never, ['flow'])!.system
  ok(/«천간 · 지지 · 일진 · 월운 · 세운» 같은 말도 손님 글에 쓰지 마세요/.test(sys), '★「천간에는 · 지지에는」 을 손님 글에 쓰지 않기')
  ok(/고르지 않은 길의 낱말\(창업/.test(sys), '★「창업」 낱말을 아예 쓰지 않기 (스쳐 지나가듯도 안 됨)')
  ok(/«이름 \+ 님» 한 가지로만/.test(sys), '★호칭은 「희준님」 한 가지로 (「류희준 님」 과 섞지 않기)')
  const blk = planBlock45(buildPlan45(), 'pace')
  ok(/이 달에 드는 것/.test(blk) && !/천간|지지/.test(blk) && !/정인|편관|비견|겁재/.test(blk),
    `엔진이 달 재료를 생활 말로 넘깁니다 — ${blk.split('\n').find(l => l.includes('가장 좋은 달'))?.slice(0, 70)}`)
}

console.log('\n━━ ⑫ 학생(합격운)도 같은 규칙을 받는가 [대표님 2026-09-12] ━━')
{
  const stu = { name: '가', gender: '여', age: 18, target: 'student', kind: 'exam', cards: [], saju: [], hourUnknown: false, year: 2026, studentGrade: '고3', targetAcademic: '주요 상위권 대학' }
  const sys = buildSevenPrompt(stu as never, ['flow'])!.system
  const st = buildSevenPrompt(stu as never, ['strategy'])!.user
  //  성인 쪽에만 넣었다가 빠졌던 두 가지
  ok(/밀고 가셔도 됩니다/.test(st), '★학생도 — 이미 정한 것을 먼저 받아 주기')
  ok(/«한 해» 와 «한 달» 을 섞어/.test(st), '★학생도 — 해와 달을 섞어 부르지 않기')
  //  성인과 같은 말투 규칙이 학생에게도 (금지 목록 줄은 빼고 셉니다)
  for (const [name, re2] of [['용기를 얻으러 온다', /답보다 «용기»/], ['약한 것 짚지 않기', /모자란 쪽을 말하지 마세요/],
    ['천간 · 지지 금지', /천간 · 지지 · 일진/], ['호칭 한 가지', /«이름 \+ 님» 한 가지로만/],
    ['판정 이름 금지', /판정 이름\(비겁/], ['점수 숫자 금지', /점수 숫자를 글에 쓰지 말고/]] as Array<[string, RegExp]>) {
    ok(re2.test(sys), `학생도 — ${name}`)
  }
  ok(/부모님/.test(buildSevenPrompt(stu as never, ['cheer'])!.user), '학생 전용 — 부모님께 드리는 말은 그대로')
}

console.log(`\n━━ 4갈래 · 쉬운 말투 · 달별 재료 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail) process.exit(1)
