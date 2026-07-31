// 19-verify-eumyang.ts
// 교재 2장(음양오행 46~54쪽) 대조 그물
// ⚠️ 16-verify-naming.ts 에 붙이시거나 npm run verify 에 한 줄 더하십시오.

import {
  eumyangOfStrokes, eumyangOfVowel, EUMYANG_GOOD_LISTED, EUMYANG_BAD_LISTED,
  OHAENG_ATTR, GENERATES, CONTROLS, BOOK_SANGSAENG_40, BOOK_SANGGEUK_40,
} from './lib/saju/tables/eumyangOhaeng'
import { SOUND_ARRANGEMENT } from './lib/saju/tables/soundArrangement'
import { parseSoundChar } from './lib/saju/sound/normalize'
import {
  diagnoseName, EUMYANG_LEAN_NOTE, EUMYANG_MIXED_NOTE, EUMYANG_TONE_GUIDE, type NameChar,
} from './lib/saju/naming'
import { perspectiveStars, overallStar, starOf, gradeToScore } from './lib/saju/starRating'
import { CLASH_VIEW_BOOK, clashGloss } from './lib/saju/resourceJudge'

let pass = 0, fail = 0
function check(ok: boolean, msg: string) {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) } else { fail++; console.log(`  🔴 ${msg}`) }
}
const OH = ['목', '화', '토', '금', '수'] as const

console.log('\n━━ ⑩-a 음양 — 교재 46쪽 홀짝 ━━')
for (const n of [1, 3, 5, 7, 9]) check(eumyangOfStrokes(n) === '양', `${n}획 → 양`)
for (const n of [2, 4, 6, 8, 10]) check(eumyangOfStrokes(n) === '음', `${n}획 → 음`)

console.log('\n━━ ⑩-a2 모음 축 — ★쓰지 않기로 확정 (40부 6차) ━━')
// ⚠️ 교재 48쪽에 모음 음양이 실려 있으나 «판정에 쓰지 않습니다» (대표님 확정).
//    ㅐ ㅔ ㅚ ㅟ ㅢ ㅘ ㅝ 등이 교재 표에 없어 규칙을 늘리면 교훈 EJ 를 어깁니다.
//    ★표는 대조용으로 남겨 두되, «표에 없는 모음은 null» 이어야 합니다.
check(eumyangOfVowel('가') === '양' && eumyangOfVowel('고') === '양', `ㅏ·ㅗ → 양 (교재 48쪽)`)
check(eumyangOfVowel('거') === '음' && eumyangOfVowel('기') === '음', `ㅓ·ㅣ → 음 (교재 48쪽)`)
for (const h of ['개', '게', '괴', '귀', '긔', '과', '궈']) {
  check(eumyangOfVowel(h) === null, `${h} — 교재 표에 없는 모음이라 «null». 지어내지 않습니다`)
}
check(eumyangOfVowel('A') === null, `한글이 아니면 null`)

console.log('\n━━ ⑩-b 🔴 48쪽 «좋은/나쁜 배열» 이 서로 빈틈없는가 ━━')
for (const n of [2, 3] as const) {
  const all: string[] = []
  const rec = (s: string) => { if (s.split(/(?=[음양])/).length - 1 === n - 1 && s.length === n) all.push(s) }
  const build = (s: string) => { if (s.length === n) { rec(s); return } for (const c of ['음', '양']) build(s + c) }
  build('')
  const pure = ['음'.repeat(n), '양'.repeat(n)]
  const mixed = all.filter(x => !pure.includes(x))
  check(EUMYANG_GOOD_LISTED[n].length === mixed.length,
    `${n}자 — 섞인 것 ${mixed.length}가지가 «전부» 좋은 배열로 실려 있습니다 (${EUMYANG_GOOD_LISTED[n].length})`)
  check(EUMYANG_BAD_LISTED[n].every(x => pure.includes(x)),
    `${n}자 — 나쁜 배열은 «순음·순양» 뿐입니다`)
}
// ★4자는 «발췌» 입니다. 전수를 기대하면 안 됩니다
check(EUMYANG_GOOD_LISTED[4].length === 6,
  `4자 — 좋은 배열이 14가지 중 6가지만 실린 «발췌» 입니다 (${EUMYANG_GOOD_LISTED[4].length})`)
check(EUMYANG_GOOD_LISTED[4].every(x => new Set(x.split(/(?=[음양])/).filter(Boolean)).size === 2),
  `4자 발췌도 전부 «섞인» 배열입니다`)

console.log('\n━━ ⑩-c 🔴 현행 판정이 교재와 같은가 ━━')
{
  const CH = (s: number): NameChar => ({ hangul: '가', hanja: 'X', strokes: s, resourceOhaeng: '목' })
  const base = { yongsin: '화', elementScore: { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20 } }
  const run = (a: number, b: number, c: number) =>
    diagnoseName({ surname: CH(a), given: [CH(b), CH(c)], ...base }).yinYang
  check(run(1, 3, 5).facts.allSame === true, `1·3·5획 (순양) → 치우침으로 잡힙니다`)
  check(run(2, 4, 6).facts.allSame === true, `2·4·6획 (순음) → 치우침으로 잡힙니다`)
  check(run(1, 2, 3).facts.allSame === false, `1·2·3획 (섞임) → 좋은 배열`)
  // ★교재 47쪽은 «나쁜 음양 배열» 이라 합니다. 현행은 «보통» 입니다 — 격차를 기록합니다
  const g = run(1, 3, 5).grade
  check(g === '아쉬움',
    `순양·순음의 등급은 «${g}» — 교재 47쪽 「나쁜 음양 배열」 반영 (40부 6차 확정)`)
}

console.log('\n━━ ⑩-c2 🔴 확정 정책 — 치우침은 «아쉬움» (40부 6차) ━━')
{
  const CH = (s: number): NameChar => ({ hangul: '가', hanja: 'X', strokes: s, resourceOhaeng: '목' })
  const base = { yongsin: '화', elementScore: { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20 } }
  const run = (a: number, b: number, c: number) =>
    diagnoseName({ surname: CH(a), given: [CH(b), CH(c)], ...base }).yinYang
  check(run(1, 3, 5).grade === '아쉬움', `순양 → 아쉬움 (★${starOf(gradeToScore('아쉬움')).star})`)
  check(run(2, 4, 6).grade === '아쉬움', `순음 → 아쉬움`)
  check(run(1, 2, 3).grade === '좋음', `섞임 → 좋음`)
  check((run(1, 3, 5).facts as Record<string, unknown>).안내 === EUMYANG_LEAN_NOTE, `치우침에 «정해진 한 줄» 이 나갑니다`)
  check((run(1, 2, 3).facts as Record<string, unknown>).안내 === EUMYANG_MIXED_NOTE, `섞임에 «정해진 한 줄» 이 나갑니다`)
  // 🔴 교재 46쪽 원문의 자극적 표현이 새어 나오지 않는가 (교훈 EG)
  const HARSH = ['단명', '빈곤', '실패', '질병', '고독', '요절', '자살', '병약']
  const blob = [EUMYANG_LEAN_NOTE, EUMYANG_MIXED_NOTE, ...EUMYANG_TONE_GUIDE].join(' ')
  const dirty = HARSH.filter(w => blob.includes(w))
  check(dirty.length === 0, `★음양 문구·어조 지침에 자극적 표현 0건 — ${dirty.join(',') || '0건'}`)
  // ★종합 별점에서 음양은 «계속» 제외되어야 합니다 (대표님 확정)
  const mk = (yy: '좋음' | '아쉬움') => overallStar(perspectiveStars({
    flowScore: 20, flowMax: 30, matchScore: 40, matchMax: 70, hasYongsin: true,
    yinYangGrade: yy, soundScore: 70, suriGrade: '보통' }), true).star
  check(mk('좋음') === mk('아쉬움'),
    `★음양이 «종합 별점» 을 움직이지 않습니다 (좋음 ★${mk('좋음')} = 아쉬움 ★${mk('아쉬움')})`)
}

console.log('\n━━ ⑩-c3 🔴 자원오행 상극 — 교재 51쪽 근거 (40부 6차) ━━')
{
  check(Object.keys(CLASH_VIEW_BOOK.gloss).length === 5, `상극 다섯 자리에 교재 풀이가 있습니다`)
  check(clashGloss('토', '수') === '흙은 둑이 되어 물을 가두어 둡니다.', `土剋水 풀이가 교재 그대로`)
  check(clashGloss('수', '토') === clashGloss('토', '수'), `앞뒤를 뒤집어도 같은 풀이`)
  check(clashGloss('목', '화') === null, `상극이 아니면 풀이를 붙이지 않습니다`)
  check(clashGloss(null, '토') === null, `모르는 오행이면 붙이지 않습니다`)
  // ⚠️ 교재가 «직접 쓴» 말인가 — 우리가 지어낸 비유가 섞이지 않았는가 (교훈 EJ)
  const INVENTED = ['도끼', '조각도', '재목']
  const made = INVENTED.filter(w => JSON.stringify(CLASH_VIEW_BOOK).includes(w))
  check(made.length === 0, `★교재에 없는 비유를 섞지 않았습니다 — ${made.join(',') || '0건'}`)
  // 🔴 16-verify ⑦ 의 «판정 어휘» 금지 목록을 여기서도 지킵니다
  //   ⚠️ 교재 원문에 「나쁘다고 할 수 없다」·「불난 집에 부채질」 이 있으나
  //      부정문·비유라도 낱말이 재료에 있으면 AI 가 끌어 씁니다. 뜻만 옮겼습니다.
  const BAN = ['좋은 이름', '나쁜 이름', '좋다', '나쁘다', '나쁜', '흉하', '불길',
    '부채질', '불난 집', '격입니다', '치명', '위험', '망하', '실패']
  const banned = BAN.filter(w => JSON.stringify(CLASH_VIEW_BOOK).includes(w))
  check(banned.length === 0, `★상극 해설에 판정 어휘 0건 — ${banned.join(',') || '0건'}`)
}


console.log('\n━━ ⑩-d 🔴 50쪽 발음 줄 ↔ 3장 57쪽 운해본 ━━')
{
  const rep: Record<string, string> = { ㄱ: '가', ㅋ: '카', ㄴ: '나', ㄷ: '다', ㄹ: '라', ㅌ: '타',
    ㅇ: '아', ㅎ: '하', ㅅ: '사', ㅈ: '자', ㅊ: '차', ㅁ: '마', ㅂ: '바', ㅍ: '파' }
  let bad = 0
  for (const oh of OH) for (const c of OHAENG_ATTR[oh].발음) {
    if (parseSoundChar(rep[c]).ohaeng !== oh) bad++
  }
  check(bad === 0, `★2장 50쪽과 3장 57쪽이 서로 같습니다 — 어긋남 ${bad}건`)
  check(OH.every(o => OHAENG_ATTR[o].숫자.length === 2), `50쪽 숫자 배속이 오행마다 둘씩`)
}

console.log('\n━━ ⑩-e 51쪽 상생·상극 정의 ━━')
check(OH.every(o => GENERATES[GENERATES[GENERATES[GENERATES[GENERATES[o]]]]] === o), `상생이 다섯 걸음에 제자리로`)
check(OH.every(o => CONTROLS[CONTROLS[CONTROLS[CONTROLS[CONTROLS[o]]]]] === o), `상극이 다섯 걸음에 제자리로`)
check(OH.every(o => GENERATES[o] !== CONTROLS[o]), `한 오행이 같은 상대를 생하면서 극하지 않습니다`)

console.log('\n━━ ⑩-f 🔴 53·54쪽 ↔ 3장 60쪽 125칸 교차 대조 ━━')
{
  const missG = BOOK_SANGSAENG_40.filter(k => !SOUND_ARRANGEMENT[k])
  const missB = BOOK_SANGGEUK_40.filter(k => !SOUND_ARRANGEMENT[k])
  check(missG.length === 0 && missB.length === 0, `80칸이 전부 125칸 안에 있습니다`)
  const badB = BOOK_SANGGEUK_40.filter(k => SOUND_ARRANGEMENT[k]?.fortune !== '흉')
  check(badB.length === 0, `★54쪽 상극 40개가 3장에서 «전부 흉» — 어긋남 ${badB.join(',') || '0건'}`)
  const badG = BOOK_SANGSAENG_40.filter(k => SOUND_ARRANGEMENT[k]?.fortune !== '길')
  check(badG.length === 1 && badG[0] === '목화화',
    `53쪽 상생 40개 중 39개가 3장에서 «길» · 목화화 하나만 반길반흉 (3장의 예외 네 칸 중 하나)`)
  check(BOOK_SANGSAENG_40.length === 40 && BOOK_SANGGEUK_40.length === 40, `두 표가 40개씩`)
  check(new Set([...BOOK_SANGSAENG_40, ...BOOK_SANGGEUK_40]).size === 80, `두 표가 겹치지 않습니다`)
  // ⚠️ 오식 — 水 줄인데 木 으로 시작하는 칸이 «하나» 있습니다. 알고 두는 것입니다
  const wrongRow = BOOK_SANGGEUK_40.filter((k, i) => k[0] !== OH[Math.floor(i / 8)])
  check(wrongRow.length === 1 && wrongRow[0] === '목수화',
    `⚠️ 54쪽 오식 한 곳 — 水 줄의 「목수화」 (원문 그대로 두고 기록만 합니다)`)
}

console.log(`\n━━ 음양오행 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) process.exit(1)
