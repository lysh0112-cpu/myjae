// 19-verify-eumyang.ts
// 교재 2장(음양오행 46~54쪽) 대조 그물
// ⚠️ 16-verify-naming.ts 에 붙이시거나 npm run verify 에 한 줄 더하십시오.

import {
  eumyangOfStrokes, eumyangOfVowel, EUMYANG_GOOD_LISTED, EUMYANG_BAD_LISTED,
  OHAENG_ATTR, GENERATES, CONTROLS, BOOK_SANGSAENG_40, BOOK_SANGGEUK_40,
} from './lib/saju/tables/eumyangOhaeng'
import { SOUND_ARRANGEMENT } from './lib/saju/tables/soundArrangement'
import { parseSoundChar } from './lib/saju/sound/normalize'
import { diagnoseName, type NameChar } from './lib/saju/naming'

let pass = 0, fail = 0
function check(ok: boolean, msg: string) {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) } else { fail++; console.log(`  🔴 ${msg}`) }
}
const OH = ['목', '화', '토', '금', '수'] as const

console.log('\n━━ ⑩-a 음양 — 교재 46쪽 홀짝 ━━')
for (const n of [1, 3, 5, 7, 9]) check(eumyangOfStrokes(n) === '양', `${n}획 → 양`)
for (const n of [2, 4, 6, 8, 10]) check(eumyangOfStrokes(n) === '음', `${n}획 → 음`)

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
  check(g === '보통' || g === '아쉬움',
    `순양·순음의 현행 등급은 «${g}» — ⚠️ 교재 47쪽은 「나쁜 음양 배열」이라 적습니다 (연재쌤 확인)`)
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
