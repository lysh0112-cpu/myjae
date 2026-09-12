// 51-verify-promotion-flow.ts
//
//   승진운 «화면 동선» 그물 — 입력 · 결과 · 지시문 · AI 안전
//   2026-09-12 (7부)
//
//   돌리기:  npx tsx 51-verify-promotion-flow.ts

import { readFileSync } from 'fs'
import { JOB_SITUATIONS, parseSituation } from './lib/saju/examLuck/tables/jobFields'
import { PROMO_USE_JOBCHANGE } from './lib/saju/examLuck/tables/promotion'

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
ok(/눈여겨볼 달은 \$\{watch\}월/.test(shell), '★인사 시기의 두 달 앞을 짚습니다')
ok(/특정한 달을 못 박지 말고 흐름으로만/.test(shell), '모르시면 달을 짚지 않습니다')
ok(/「경쟁자」 라는 낱말은 쓰지 마세요/.test(shell),
  '🔴 ★비겁은 경쟁자로 «보되» 그 낱말은 쓰지 않습니다 [연재쌤 ④]')
ok(/올해와 내년 «두 해» 까지만/.test(shell), '★두 해까지만 (6부 「고3은 올해만」 과 같은 결)')
ok(/「승진하십니다」 · 「○월에 발표가 납니다」 같은 약속을 하지 마세요/.test(shell),
  '⛔ 점쟁이 말투를 막습니다 [대표님 「점쟁이는 아니잖아」]')
ok(/정하는 것은 사람과 조직입니다/.test(shell), '★맺음말이 실립니다')
ok(/«한 갈래에 한 개» 까지/.test(shell), '🔴 ★사주 용어는 한 갈래에 하나까지 [연재쌤 ⑦]')
ok(/4번 갈래에는 0개/.test(shell), '⛔ 응원 갈래에는 사주 용어 0개')

head('⑨ 손님이 보는 이름')
ok(/합격운 · 취업운 · 승진운/.test(input), '★입력 머리글에 승진이 들어갔습니다')
ok(/isPromo \? '승진운 보기'/.test(input), '단추가 «승진운 보기» 입니다')
ok(/isPromo \? '승진운'/.test(shell), '결과 머리글이 «승진운» 입니다')

console.log(`\n━━ 승진운 동선 — 통과 ${pass} · 실패 ${fail} ━━\n`)
process.exit(fail ? 1 : 0)
