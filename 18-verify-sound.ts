// 18-verify-sound.ts
// 발음오행 그물 — ★prebuild 관문(16-verify-naming.ts)에 «붙여» 주십시오.
//
// ⚠️ Jest 를 새로 들이지 않았습니다. 저장소의 관문은 tsx 로 도는 16번이고,
//    시험 체계를 둘로 두면 교훈 CJ(판정기를 둘로 두지 말 것)를 시험 계층에서 어깁니다.
//    이 파일은 16번에 그대로 옮겨 붙일 수 있게 같은 꼴로 썼습니다.

import { SOUND_ARRANGEMENT } from './lib/saju/tables/soundArrangement'
import { evaluateSoundOhaeng, soundRelation } from './lib/saju/soundEngine'
import { parseSoundChar } from './lib/saju/sound/normalize'
import { hasJong } from './lib/saju/josa'

let pass = 0, fail = 0
function check(ok: boolean, msg: string) {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) } else { fail++; console.log(`  🔴 ${msg}`) }
}
const OH = ['목', '화', '토', '금', '수'] as const
const S = (n: string, roles = 'ㅅㅇㅇ') =>
  evaluateSoundOhaeng([...n].map((h, i) => ({ hangul: h, 역할: roles[i] === 'ㅅ' ? '성' as const : '이름' as const })))

console.log('\n━━ ⑨-a 교재 125칸 표 자체 ━━')
check(Object.keys(SOUND_ARRANGEMENT).length === 125, `125칸 온전 (${Object.keys(SOUND_ARRANGEMENT).length})`)
const missing = OH.flatMap(a => OH.flatMap(b => OH.map(c => a + b + c))).filter(k => !SOUND_ARRANGEMENT[k])
check(missing.length === 0, `빠진 조합 없음 — ${missing.join(',') || '0건'}`)
const fc = { 길: 0, 흉: 0, 반길반흉: 0 } as Record<string, number>
for (const v of Object.values(SOUND_ARRANGEMENT)) fc[v.fortune]++
check(fc.길 === 41 && fc.반길반흉 === 4 && fc.흉 === 80,
  `길 41 · 반길반흉 4 · 흉 80 (실제 ${fc.길}·${fc.반길반흉}·${fc.흉})`)
check(Object.values(SOUND_ARRANGEMENT).every(v => !!v.gyeok), `125칸 모두 격 이름이 있습니다`)

console.log('\n━━ ⑨-b 🔴 교재 사례 여섯 — 오행과 길흉이 교재와 같은가 ━━')
//  59쪽 · 61쪽. ★교재가 직접 오행을 적어 준 유일한 검산식입니다 (교훈 EO)
const CASES: [string, string, '길' | '흉' | '반길반흉'][] = [
  ['박정희', '수금토', '길'], ['이재명', '토금수', '길'], ['한지민', '토금수', '길'],
  ['장윤정', '금토금', '길'], ['정수라', '금금화', '흉'], ['이건희', '토목토', '흉'],
]
for (const [name, oh, fortune] of CASES) {
  const v = S(name)
  check(v.elements.join('') === oh, `${name} 오행 ${v.elements.join('')} = 교재 ${oh}`)
  check(v.fortune === fortune, `${name} 길흉 ${v.fortune} = 교재 ${fortune}`)
  check(v.basis === '교재표', `${name} 은 «교재표» 에서 직접 나옵니다`)
}
//  ★李 = 토. 두음법칙을 본음으로 되돌리지 «않는» 것이 교재입니다
check(parseSoundChar('이').ohaeng === '토' && parseSoundChar('리').ohaeng === '화',
  `두음법칙 — 「이」는 토, 「리」는 화. 교재 사례는 李를 «이(토)» 로 씁니다`)

console.log('\n━━ ⑨-c 방향을 보지 않는가 (교재 59·61쪽) ━━')
check(S('박정희').fortune === S('이재명').fortune,
  `박정희(역생) 와 이재명(순생) 이 같은 길흉 — 방향 무시`)
let flipSame = 0, flipAll = 0
for (const a of OH) for (const b of OH) for (const c of OH) {
  if (a + b + c >= c + b + a) continue
  flipAll++
  if (SOUND_ARRANGEMENT[a + b + c].fortune === SOUND_ARRANGEMENT[c + b + a].fortune) flipSame++
}
check(flipSame === 47 && flipAll === 50, `좌우를 뒤집은 짝 ${flipAll} 중 ${flipSame} 이 같은 길흉`)

console.log('\n━━ ⑨-d 종성을 보지 않는가 (교재 59쪽 A학설) ━━')
for (const [x, y] of [['가', '강'], ['기', '김'], ['바', '박']] as const)
  check(parseSoundChar(x).ohaeng === parseSoundChar(y).ohaeng, `${x} 와 ${y} 가 같은 오행 — 받침 무시`)

console.log('\n━━ ⑨-e 🔴 조사 — AI 재료에 비문이 나가지 않는가 (교훈 AU) ━━')
let josaBad = 0
for (const a of OH) for (const b of OH) {
  const t = evaluateSoundOhaeng([{ hangul: '가', 역할: '성' }, { hangul: '가', 역할: '이름' }]).links[0].text
  void t
  const rel = soundRelation(a, b)
  if (rel !== '상생' && rel !== '상극') continue
  const txt = evaluateSoundOhaeng([
    { hangul: a === '목' ? '가' : a === '화' ? '나' : a === '토' ? '아' : a === '금' ? '사' : '마', 역할: '성' },
    { hangul: b === '목' ? '가' : b === '화' ? '나' : b === '토' ? '아' : b === '금' ? '사' : '마', 역할: '이름' },
  ]).links[0].text
  const m = txt.match(/— ([가-힣])(이|가) ([가-힣])(을|를) /)
  if (!m) { josaBad++; continue }
  const ok = (hasJong(m[1]) ? m[2] === '이' : m[2] === '가') && (hasJong(m[3]) ? m[4] === '을' : m[4] === '를')
  if (!ok) josaBad++
}
check(josaBad === 0, `상생·상극 문장의 조사 오류 ${josaBad}건 (옛 코드는 71.2% 가 비문이었습니다)`)
console.log(`     예: ${S('한지민').links[0].text}`)
console.log(`     예: ${S('이건희').links[0].text}`)

console.log('\n━━ ⑨-f 🔴 «모름» 을 조용히 넘기지 않는가 ━━')
for (const bad of ['A', '漢', 'ㄱ', '']) {
  const v = evaluateSoundOhaeng([
    { hangul: bad, 역할: '성' }, { hangul: '승', 역할: '이름' }, { hangul: '현', 역할: '이름' }])
  check(v.problems.length > 0 && v.basis === '판정불가',
    `'${bad}' 가 problems 에 잡힙니다 — ${v.problems[0]?.slice(0, 34)}…`)
}
check(!S('한지민').links.some(l => l.text.includes('()')), `정상 이름에는 빈 괄호가 없습니다`)

console.log('\n━━ ⑨-g 외자·복성 — 교재에 없다는 것을 «밝히는가» ━━')
const oeja = evaluateSoundOhaeng([{ hangul: '박', 역할: '성' }, { hangul: '준', 역할: '이름' }])
check(oeja.basis === '규칙유추' && oeja.problems.length > 0, `외자는 «규칙유추» 로 표시되고 problems 가 붙습니다`)
const bok = evaluateSoundOhaeng([
  { hangul: '남', 역할: '성' }, { hangul: '궁', 역할: '성' },
  { hangul: '민', 역할: '이름' }, { hangul: '수', 역할: '이름' }])
check(bok.basis === '규칙유추', `복성 네 글자도 «규칙유추»`)
check(bok.links.map(l => l.구간).join(',') === '성씨 안,성씨→이름,이름 안', `복성 구간이 셋으로 갈립니다`)

console.log(`\n━━ 발음오행 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) process.exit(1)
