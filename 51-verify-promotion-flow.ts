// 51-verify-promotion-flow.ts
//
//   승진운 «화면 동선» 그물 — 입력 · 결과 · 지시문 · AI 안전
//   2026-09-12 (7부)
//
//   돌리기:  npx tsx 51-verify-promotion-flow.ts

import { readFileSync } from 'fs'
import { JOB_SITUATIONS, parseSituation } from './lib/saju/examLuck/tables/jobFields'
import { PROMO_USE_JOBCHANGE } from './lib/saju/examLuck/tables/promotion'
import { sevenOf, SEVEN_PROMO, SEVEN_ADULT, promoTidy, dropFarNextYearMonth, monthlyMaterial } from './lib/saju/examLuck/buildExamSeven'
import { planBlock } from './lib/saju/examLuck/engineCalc'

let pass = 0, fail = 0
const ok = (c: boolean, m: string) => { if (c) { pass++; console.log('  ✅ ' + m) } else { fail++; console.log('  ❌ ' + m) } }
const head = (t: string) => console.log('\n━━ ' + t + ' ━━')
const read = (p: string) => readFileSync(p, 'utf8')
/** 주석을 걷어낸 «사는 코드» — 주석에 걸리지 않게 (6부 ⛔) */
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const input = code(read('app/manseryeok/exam-luck-input/page.tsx'))
const shell = code(read('app/manseryeok/exam-luck-result/components/ExamResultShell.tsx'))
const page = code(read('app/manseryeok/promotion-luck-result/page.tsx'))
const seven = code(read('lib/saju/examLuck/buildExamSeven.ts'))
const store = code(read('app/manseryeok/exam-luck/page.tsx'))

head('① 🔴 지뢰 — 승진을 «이직» 으로 읽지 않는가')
ok(/isPromote = isJob && v\.jobSituation === 'promote'/.test(seven),
  '★승진을 따로 가려냅니다')
ok(/isMove = isJob && !isPromote && v\.jobSituation !== 'new'/.test(seven),
  "🔴 ★isMove 가 'promote' 를 «이직» 으로 읽지 않습니다 (5부 「절반만 고쳤다」 의 짝)")
ok(!/isMove = isJob && v\.jobSituation !== 'new'/.test(seven),
  '⛔ 옛 모양이 되살아나지 않았습니다')
ok(/이직 · 직장 옮기기 · 나가기 이야기를 쓰지 마세요/.test(seven),
  '★승진이면 지시문이 «나가는 이야기» 를 막습니다 [연재쌤]')
ok(parseSituation('promote') === 'promote', "주소의 'promote' 를 알아봅니다")
ok(parseSituation('bad') === null, '엉뚱한 값은 버립니다')
ok(!(JOB_SITUATIONS as Array<{ key: string }>).some(s => s.key === 'promote'),
  '⚠️ 취업 탭 알약에는 «승진» 을 넣지 않았습니다 (승진 탭에서만 씁니다)')

head('② 입구 — 따로, 엔진은 같게 [대표님]')
ok(/ExamMode = 'jinhak' \| 'chwieop' \| 'seungjin'/.test(shell), '★몸통이 세 모드를 압니다')
ok(/<ExamResultShell mode="seungjin" \/>/.test(page), '★승진 화면은 «껍데기» 입니다 — 몸통 하나를 씁니다')
ok(!/judgeYears|buildSevenPrompt|engineCalc/.test(page), '⛔ 껍데기에 판정을 쓰지 않았습니다')
ok(/mode === 'seungjin' \? 'job'/.test(shell), '★승진도 kind=job — 엔진을 그대로 씁니다')
ok(/isPromo = mode === 'seungjin'/.test(shell), '몸통이 승진을 가려냅니다')
ok(/promotion-luck-result/.test(input), '★입력 화면이 승진 결과로 보냅니다')
ok(/'jinhak' \| 'chwieop' \| 'seungjin'/.test(input), '★입력 화면에 탭이 셋입니다')
ok(/label: '승진'/.test(input), '탭에 «승진» 이 있습니다')

head('③ ⛔ 이직 여섯 갈래를 «부르지 않는가» [연재쌤 2026-09-12]')
ok(PROMO_USE_JOBCHANGE === false, '표가 «쓰지 않음» 으로 잠겨 있습니다')
ok(/const natal = isPromo \? \[\] : judgeJobChangeNatal/.test(shell),
  '🔴 ★승진이면 원국 이직 갈래를 «계산조차» 하지 않습니다')
ok(/const byYear = !isPromo &&/.test(shell),
  '🔴 ★승진이면 해마다 이직 갈래를 «계산조차» 하지 않습니다')

head('④ 🔴 AI — 끝없이 다시 부르기 막기 (6부 0장 ②-①)')
ok(/const promoNote = useMemo\(\(\) => \{/.test(shell),
  '★승진 재료를 useMemo 로 «한 번만» 만듭니다')
{
  const m = shell.match(/\}, \[isPromo, pJobRaw[^\]]*\]\)/)
  ok(!!m, 'useMemo 의존 목록이 «주소에서 꺼낸 문자열» 뿐입니다')
  ok(!!m && !/promoJobRow|PROMO_JOBS|\{ |\[ /.test(m[0]),
    '⛔ 의존 목록에 «매번 새로 만들어지는 값» 이 없습니다')
}
{
  /*  ⚠️ 이 화면에는 «}, [calc, cards, recordId…» 로 끝나는 effect 가 ★둘 입니다 —
   *     하나는 «기록 저장», 하나는 ★«AI 부르기». promoNote 가 든 쪽을 골라야 합니다. */
  const all = [...shell.matchAll(/\}, \[calc, cards, recordId/g)].map(m => m.index ?? -1)
  const picked = all.map(i => shell.slice(i, shell.indexOf('])', i) + 2)).filter(t => t.includes('promoNote'))
  ok(all.length >= 2, '⚠️ 저장 effect 와 AI effect 가 따로 있습니다')
  const dep = picked.length ? picked : null
  ok(!!dep && /promoNote\]/.test(dep[0]), '★AI effect 가 promoNote «하나» 만 봅니다')
  ok(!!dep && !/promoJobRow|promoYears|promoSeason|pCurIdx/.test(dep[0]),
    '🔴 ⛔ AI effect 에 흩어진 승진 값을 «따로» 넣지 않았습니다 (US$113.59 가 나간 자리)')
}
ok(!/promoNote: isPromo \? \[/.test(shell),
  '⛔ 지시문 안에서 배열을 «그때그때» 만들지 않습니다')

head('⑤ 고민 칸 — 승진에서는 ★«꼭» [대표님 2026-09-12]')
ok(/pWish\.trim\(\)\.length > 0/.test(input), '★비워 두면 넘어가지 않습니다')
ok(/PROMO_WISH_SAMPLES\.map/.test(input), '★보기 셋을 눌러 채울 수 있습니다')
ok(/PROMO_WISH_NUDGE_UNDER/.test(input), '너무 짧으면 «한 번만» 되묻습니다')
ok(/canGo = isPromo \? pOk/.test(input), '★승진은 «다른 칸» 을 봅니다 (목표·날짜를 묻지 않습니다)')

head('⑥ ⛔ 주소에 «적으신 글» 을 싣지 않는가 (6부 9장 · 방문 기록)')
ok(/p\.set\('pJob', pJob\)/.test(input), '직업 «갈래» 는 싣습니다 (표에 있는 값)')
ok(!/p\.set\('pWish'/.test(input), '🔴 ⛔ 고민 글을 주소에 싣지 않습니다')
ok(!/p\.set\('pJobText'|p\.set\('pCurText'|p\.set\('pNextText'/.test(input),
  '🔴 ⛔ 직접 적으신 직업·직급도 주소에 싣지 않습니다')
ok(/writeWishHandoff\(\s*pWish/.test(input), '★건네기로 넘깁니다 (주소가 아니라)')

head('⑦ 표를 «한 곳» 에서만 — 직급 이름을 붙박이로 적지 않았는가')
ok(/from '@\/lib\/saju\/examLuck\/tables\/promotion'/.test(input), '입력 화면이 표를 가져다 씁니다')
ok(/from '@\/lib\/saju\/examLuck\/tables\/promotion'/.test(shell), '몸통도 표를 가져다 씁니다')
for (const w of ['부지점장', '소방령', '치안총감', '사무관', '차장'])
  ok(!new RegExp(w).test(input), `⛔ 입력 화면에 «${w}» 을 붙박이로 적지 않았습니다`)

head('⑧ 지시문에 «연재쌤 답» 이 실리는가')
ok(/관성\(직책\)과 인성\(문서·도장\)을 ★«함께» 보되/.test(shell),
  '🔴 ★문이면 «관성과 인성을 함께» — 가르지 않습니다 [연재쌤 ①]')
ok(/관성과 인성을 ★함께 보되 관성\(직책\) 쪽이 중심/.test(shell),
  '★문이 아니어도 둘을 «함께» 봅니다')
ok(/아직 연차가 안 되신 분입니다\. ★시기를 짚지 마세요/.test(shell),
  '★연차가 안 되신 분께 시기를 말하지 않습니다')
ok(/눈여겨볼 달은 \$\{promoWatchMonth\}월/.test(shell), '★인사 시기의 두 달 앞을 짚습니다')
ok(/특정한 달을 못 박지 말고 흐름으로만/.test(shell), '모르시면 달을 짚지 않습니다')
ok(/⛔「경쟁자」 라는 낱말은 쓰지 말고/.test(shell),
  '🔴 ★비겁은 경쟁자로 «보되» 그 낱말은 쓰지 않습니다 [연재쌤 ④]')
ok(/올해와 내년 «두 해» 까지만/.test(shell), '★두 해까지만 (6부 「고3은 올해만」 과 같은 결)')
ok(/「승진하십니다」 · 「○월에 발표가 납니다」 같은 약속을 하지 마세요/.test(shell),
  '⛔ 점쟁이 말투를 막습니다 [대표님 「점쟁이는 아니잖아」]')
ok(/정하는 것은 사람과 조직입니다/.test(shell), '★맺음말이 실립니다')
ok(/«이 갈래 통틀어 한 개» 까지입니다/.test(shell), '🔴 ★사주 용어는 한 갈래에 하나까지 [연재쌤 ⑦]')
ok(/4번 갈래\(응원\)에는 사주 용어를 ★한 개도 쓰지 마세요/.test(shell), '⛔ 응원 갈래에는 사주 용어 0개')

head('⑨ 손님이 보는 이름')
ok(/합격운 · 취업운 · 승진운/.test(input), '★입력 머리글에 승진이 들어갔습니다')
ok(/isPromo \? '승진운 보기'/.test(input), '단추가 «승진운 보기» 입니다')
ok(/isPromo \? '승진운'/.test(shell), '결과 머리글이 «승진운» 입니다')


head('⑩ 🔴 승진 화면에 «취업 칸» 이 새지 않는가 (7부 봉투 3 에서 밟은 자리)')
{
  /*  [겪은 일] 승진 칸을 «더하기» 만 하고 취업 칸을 «가리지» 않아
   *    지금 상황 · 관문 · 분야 · 방식 · 자격증 · 발표 날짜 · 옛 고민 칸이
   *    ★함께 보였습니다. 손님은 무엇을 채워야 할지 모릅니다.
   *  ⇒ 5부 「절반만 고치고 끝났다」 와 같은 자리라 그물로 박습니다. */
  ok(/target !== 'student' && kind === 'job' && !isPromo && \(/.test(input),
    "🔴 ★일자리 블록(지금 상황 · 관문 · 분야 · 방식 · 자격증)이 승진에서 «숨습니다»")
  ok(/\{!isPromo && schoolExam !== 'none' && \(\s*\n\s*<div/.test(input),
    '★시험 날짜 «이름표» 가 승진에서 숨습니다 (날짜는 회사가 정합니다)')
  ok(/\{!isPromo && schoolExam !== 'none' && \(<>/.test(input),
    '★시험 날짜 «칸» 도 승진에서 숨습니다')
  ok(/\{!isPromo && \(<>\s*\n\s*<div[^>]*>\s*\n\s*궁금한 것이나 고민을 적어 주세요/.test(input),
    '🔴 ★옛 «선택» 고민 칸이 승진에서 숨습니다 — 고민 칸이 «둘» 보이면 안 됩니다')
  const promoOnly = input.slice(input.indexOf('이런 것이 궁금하실 수 있어요'))
  ok(promoOnly.length > 0, '승진 고민 칸(꼭)이 있습니다')
}


head('⑪ 🔴 네 갈래 «제목» 이 승진 것인가 (실제 통변에서 틀렸던 자리)')
{
  const t = SEVEN_PROMO.map(x => x.title)
  ok(t[0].includes('지금 자리에서의 나'), '1. 지금 자리에서의 나')
  ok(t[1].includes('다음 자리로 가는 길'), '★2. «합격과 성취» 가 아니라 «다음 자리로 가는 길»')
  ok(t[2].includes('인사 시기'), '★3. «D-Day» 가 아니라 «인사 시기» (날짜는 회사가 정합니다)')
  ok(t[3].includes('마지막 응원'), '4. 마지막 응원과 오늘의 실천')
  ok(!t.some(x => /D-Day|합격과 성취/.test(x)), '⛔ 승진에 안 맞는 말이 제목에 없습니다')
  ok(SEVEN_PROMO.map(x => x.key).join('|') === SEVEN_ADULT.map(x => x.key).join('|'),
    '★뼈대(key)는 취업운과 «같습니다» — 엔진이 그대로 돕니다')
  ok(sevenOf('adult', true)[1].title === t[1], '★sevenOf(target, true) 가 승진 제목을 줍니다')
  ok(sevenOf('adult')[1].title !== t[1], '⚠️ promo 를 안 넘기면 옛 제목 그대로 (옛 기록 보호)')
  ok(/sevenOf\(target, isPromo\)/.test(shell), '🔴 ★화면이 승진 제목을 씁니다')
}

head('⑫ 🔴 연표가 «두 해» 까지인가')
ok(/function YearStrip\(\{ cards, maxYears \}/.test(shell), '연표가 몇 해까지인지 받습니다')
ok(/maxYears \? all\.slice\(0, maxYears\) : all/.test(shell), '받은 수만큼만 자릅니다')
ok(/<YearStrip cards=\{cards\} maxYears=\{isPromo \? 2 : undefined\} \/>/.test(shell),
  '🔴 ★승진이면 «두 해» 만 (2026~2030 다섯 해가 나왔던 자리)')

head('⑬ 🔴 승진에 «지원 안배 · 전형 · 시간 배분» 이 안 나오는가')
{
  const plan = {
    target: 'adult', type: '실전형', practice: 60,
    susi: { susi: 70, jeongsi: 30, flipped: false },
    apply: '3 : 4 : 3', months: null,
  } as never
  const asJob = planBlock(plan, 'strategy')
  const asPromo = planBlock(plan, 'strategy', true)
  ok(/지원 안배/.test(asJob), '취업에는 지원 안배가 그대로 나옵니다')
  ok(!/지원 안배: /.test(asPromo), '🔴 ★승진에는 «지원 안배» 가 안 나옵니다')
  ok(!/시간 배분: /.test(asPromo), '🔴 ★승진에는 «시간 배분» 이 안 나옵니다')
  ok(!/- 전형: /.test(asPromo), '🔴 ★승진에는 «전형» 이 안 나옵니다')
  ok(/바라보는 자리가 «하나»/.test(asPromo), '★대신 «자리가 하나» 라고 못 박습니다')
  ok(/planBlock\(v\.plan, group\[0\], v\.jobSituation === 'promote'\)/.test(seven),
    '★지시문이 승진임을 planBlock 에 넘깁니다')
}


head('⑭ 🔴 사주 용어를 «값으로» 다듬는가 (말로만 막았더니 안 지켜진 자리)')
{
  /*  [대표님 실측 2026-09-12] 지시문에 「한 갈래에 한 개까지」 라 적었는데
   *    1번에 둘, 2번에 다섯, 3번에 넷이 나왔습니다. ⇒ ★값으로 셉니다. */
  const t2 = promoTidy('타고난 그릇에 직책운이 있고, 말하고 글로 설득하는 힘도 있는 짜임입니다. 직책운이 이어집니다.', 'strategy')
  ok(!/말하고 글로 설득하는 힘/.test(t2), '⛔ 「말하고 글로 설득하는 힘」 이 생활 말로 바뀝니다')
  ok(!/짜임/.test(t2), '⛔ 「짜임」 이 「바탕」 으로 바뀝니다')
  ok((t2.match(/직책운/g) ?? []).length === 1, '🔴 ★「직책운」 이 한 갈래에 «한 번» 만 남습니다')
  const t3 = promoTidy('직장 · 합격운이 드는 달입니다. 직장 · 합격운이 이어집니다. 남과 견주는 마음과 말하고 글 쓰는 재주가 듭니다.', 'pace')
  //  ⚠️ 「직장 · 합격운」 은 먼저 「자리와 직책을 맡는 힘」 으로 바뀌고, 두 번째부터 «그 힘» 이 됩니다
  ok((t3.match(/자리와 직책을 맡는 힘/g) ?? []).length === 1 && /그 힘/.test(t3),
    '★두 번째부터 «그 힘» 으로 받아 씁니다')
  ok(!/남과 견주는 마음|말하고 글 쓰는 재주/.test(t3), '⛔ 6부 금지어가 생활 말로 바뀝니다')
  const t4 = promoTidy('타고난 그릇이 먼저입니다. 직장운도 있습니다.', 'cheer')
  ok(!/타고난 그릇/.test(t4) && !/직장운/.test(t4), '🔴 ★4번 갈래(응원)에는 사주 용어가 «한 개도» 안 남습니다')
  ok(/promoTidy\(dropFarNextYearMonth\(dedupeBody\(body\), promoWatchMonth\), k\)/.test(shell),
    '★화면이 받은 뒤에 다듬습니다 (되풀이 걷어내기 → 먼 달 → 말 다듬기)')
  ok(/\? promoTidy\(dropFarNextYearMonth/.test(shell) && /: dedupeBody\(body\)/.test(shell),
    '⚠️ 승진에서만 다듬습니다 (합격운·취업운은 그대로)')
}

head('⑮ 🔴 같은 문장을 «복사» 하게 만들지 않는가')
ok(!/PROMO_BIGYEOP_SAY/.test(shell),
  '🔴 ⛔ 지시문에 «완성된 문장» 을 주지 않습니다 — AI 가 그것을 세 곳에 그대로 복사했습니다')
ok(/그 달 한 곳에서만» 한 번 다루세요/.test(shell), '★«어디서 한 번» 만 정해 주고 문장은 AI 가 씁니다')
ok(/같은 말을 갈래마다 되풀이하지 마세요/.test(shell), '★되풀이를 막습니다')

head('⑯ 🔴 맺음말이 2번 갈래로 새지 않는가')
ok(/«4번 갈래 맨 끝에서 한 번만» 쓰세요/.test(shell),
  '★「정하는 것은 사람과 조직입니다」 는 4번에서 한 번만')
ok(/일희일비하지 마세요」 같은/.test(shell) && /4번 갈래에서만 쓰세요/.test(shell),
  '★마무리하는 말도 4번 갈래에서만 (2번 끝에 새던 자리)')
ok(/4번 갈래\(응원\)에는 사주 용어를 ★한 개도 쓰지 마세요/.test(shell),
  '⛔ 응원 갈래 0개를 지시문에도 못 박았습니다')


head('⑰ 🔴 「합격운」 이 승진 통변에 나오지 않는가 [대표님 「왜 합격운이 나오냐」]')
{
  //  [뿌리] PLAIN_MAP_ADULT 가 관성을 「직장 · 합격운」 으로 풀게 되어 있었습니다.
  //    ⇒ ★말 바꿈표를 «주는 자리» 부터 갈랐습니다 (나온 뒤에 지우는 것은 절반입니다).
  ok(/PLAIN_MAP_PROMO/.test(seven), '★승진 전용 말 바꿈표가 있습니다')
  ok(/관성 → 자리와 직책을 맡는 힘/.test(seven), '관성 = 자리와 직책 (★합격운이 아님)')
  ok(/인성 → 결재하고 문서를 다루는 힘/.test(seven), '인성 = 결재·문서 (★공부운이 아님)')
  ok(/재성 → 실적과 바깥일/.test(seven), '재성 = 실적 (★「돈 · 바깥일」 이 아님)')
  ok(/비겁 → 같은 자리를 바라보는 분/.test(seven), '비겁 = 같은 자리를 바라보는 분')
  ok(/isPromo \? PLAIN_MAP_PROMO : PLAIN_MAP_ADULT/.test(seven), '★승진이면 그 표를 씁니다')
  ok(/toneFor\(isStudent, v\.jobSituation === 'promote'\)/.test(seven), '★말투가 승진을 압니다')
  const mp = monthlyMaterial('庚', 2026, 9, null, false, true)
  ok(!/합격운|공부운|돈 · 바깥일/.test(mp), '🔴 ★달별 흐름표 재료에 «합격운 · 공부운 · 돈» 이 없습니다')
  ok(/자리와 직책을 맡는 힘/.test(mp), '★달별 재료도 «자리» 의 말입니다')
  const ma = monthlyMaterial('庚', 2026, 9, null, false, false)
  ok(/직장 · 합격운/.test(ma), '⚠️ 취업운은 그대로입니다 (건드리지 않았습니다)')
  ok(!/합격운/.test(promoTidy('직장 · 합격운이 드는 달입니다. 합격운도 좋습니다.', 'pace')),
    '★값으로도 한 번 더 막습니다 (지시문이 뚫려도)')
}

head('⑱ 🔴 세 해째 · 딴 이야기 · 약한 것 짚기 [대표님 실측 2판]')
{
  const b = promoTidy('올해가 가장 힘 있는 해는 아닙니다. 내년과 내후년으로 이어지는 흐름입니다. 그 다음 해들이 있습니다.', 'strategy')
  ok(!/내후년/.test(b), '🔴 ⛔ 「내후년」 이 사라집니다 (두 해 규칙)')
  ok(!/그 다음 해들/.test(b), '⛔ 「그 다음 해들」 도 사라집니다')
  ok(!/가장 힘 있는 해는 아닙니다/.test(b),
    '🔴 ⛔ ★약한 것을 짚는 말이 사라집니다 [대표님 「이것도 장사야」]')
  ok(/두 해 다 자리가 움직이는 때/.test(b), '★두 해 다 «열려 있다» 로 바뀝니다')
  const c = promoTidy('9월은 돈 · 바깥일과 공부운이 함께 드는 달입니다.', 'pace')
  ok(!/돈 · 바깥일|공부운/.test(c), '⛔ 승진과 관계없는 풀이말이 사라집니다')
  const d = dropFarNextYearMonth(
    '10월이 가장 힘이 실리는 달입니다.\n\n내년 8월에는 그 힘이 다시 듭니다.\n\n내년 2월은 한 가지만 지키면 됩니다.', 10)
  ok(!/내년 8월/.test(d), '🔴 ★인사와 «먼 달»(내년 8월)은 걷어냅니다')
  ok(/내년 2월/.test(d), '⚠️ 발표 앞뒤 달(내년 2월)은 ★남깁니다 — 마음을 다루는 자리입니다')
  ok(/10월이 가장 힘이 실리는 달/.test(d), '★올해 달은 그대로 둡니다')
  ok(dropFarNextYearMonth('내년 8월에 듭니다.', null) === '내년 8월에 듭니다.',
    '⚠️ 인사 시기를 모르시면 걷어내지 않습니다')
  ok(/내후년」 · 「내년 이후」/.test(shell), '★지시문에도 못 박았습니다 (말과 값 «둘 다»)')
  ok(/「돈 · 바깥일」 · 「재물운」/.test(shell), '★딴 이야기도 지시문에')
  ok(/약한 것을 «짚지» 마세요/.test(shell), '★약한 것 짚기도 지시문에')
}


head('⑲ 🔴 보관함에서 «다시 열 때» 도 승진으로 열리는가 [대표님이 찾아내심]')
{
  /*  [겪은 일]  승진운으로 본 기록을 보관함에서 열었더니 ★«취업운» 으로 열렸습니다 —
   *    머리글 「류승현님의 취업운」 · 제목 「한눈에 보는 나의 흐름과 강점」 ·
   *    연표 ★다섯 해(2026~2030). 글만 승진이고 ★껍데기가 전부 취업운이었습니다.
   *  [까닭]  ★«새로 보는 길» 만 만들고 «다시 보는 길» 을 안 만들었습니다.
   *    5부 교훈 「절반만 고치지 말 것」 — 오늘만 세 번째입니다. */
  ok(/const isPromo = d\?\.sit === 'promote'/.test(store),
    '🔴 ★보관함이 저장된 sit 을 보고 승진 기록을 가려냅니다')
  ok(/isPromo\s*\?\s*'\/manseryeok\/promotion-luck-result'/.test(store),
    '🔴 ★승진 기록은 «승진 화면» 으로 돌아갑니다')
  ok(/'&sit=promote&gates='/.test(store), '★sit 을 주소에 다시 싣습니다')
  for (const k of ['pJob', 'pCur', 'pNext', 'pGate', 'pYears', 'pSeason'])
    ok(new RegExp("'" + k + "'").test(store), `★${k} 를 다시 싣습니다 (같은 글이 나오게)`)
  ok(!/pWish|wish/.test(store.slice(store.indexOf('&sit=promote'), store.indexOf('&sit=promote') + 600)),
    '⛔ 고민 글은 주소에 싣지 않습니다 (방문 기록 보호)')
  ok(/pJob: isPromo \? pJobRaw : null/.test(shell), '★결과 화면이 기록에 승진 값을 남깁니다')
  ok(/pSeason: isPromo \? pSeasonRaw : null/.test(shell), '★인사 시기도 남깁니다')
  ok(/합격운 · 취업운 · 승진운 보관함/.test(store), '★보관함 이름에 승진운이 들어갔습니다')
  ok(/actionLabel=\{"\+ 새로 보기"\}/.test(store),
    '★단추가 «+ 새 합격운 보기» 가 아니라 «+ 새로 보기» 입니다')
  ok(/시험 · 일자리 · 자리의 흐름/.test(store), '★안내문에 «자리» 가 들어갔습니다')
  ok(/if \(recordId && !retryRecord\) return/.test(shell),
    '🔴 ⛔ 다시보기는 ★AI 를 «안 부릅니다» — 저장본을 그립니다 (돈이 듭니다)')
}

console.log(`\n━━ 승진운 동선 — 통과 ${pass} · 실패 ${fail} ━━\n`)
process.exit(fail ? 1 : 0)
