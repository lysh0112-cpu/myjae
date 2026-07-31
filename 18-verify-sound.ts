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
import {
  SOUND_125_GUIDE, SOUND_TONE_GUIDE, GYEOK_HIDDEN_KEYS, isGyeokPublishable,
} from './lib/saju/soundGuide'

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

console.log('\n━━ ⑨-h 🔴 순화 해설 125칸 (교훈 EG · BR) ━━')
check(Object.keys(SOUND_125_GUIDE).length === 125, `순화 해설 125칸 (${Object.keys(SOUND_125_GUIDE).length})`)
const missGuide = OH.flatMap(a => OH.flatMap(b => OH.map(c => a + b + c))).filter(k => !SOUND_125_GUIDE[k])
check(missGuide.length === 0, `빠진 칸 ${missGuide.join(',') || '없음'}`)
check(Object.values(SOUND_125_GUIDE).every(v => !!v.theme && !!v.gentle), `주제·안내가 전부 채워짐`)

// 🔴 손님에게 나갈 문장에 자극적인 말이 섞이지 않았는가 (교훈 EG)
//    ★교재 원문에 있던 말입니다. 여기서 «한 건이라도» 나오면 순화가 덜 된 것입니다.
const HARSH2 = ['자살', '요절', '단명', '사별', '패가망신', '불구', '횡사', '병약', '과부', '홀아비',
  '급사', '생이별', '반신불수', '병고', '골육상쟁', '재난', '몰락', '탕진', '뇌출혈', '이별수',
  '질환', '질병', '암', '중풍', '수술', '죽']
const dirtyG = Object.entries(SOUND_125_GUIDE)
  .filter(([, v]) => HARSH2.some(w => v.gentle.includes(w) || v.theme.includes(w))).map(([k]) => k)
check(dirtyG.length === 0, `★순화 해설에 자극적 표현 없음 — ${dirtyG.join(',') || '0건'}`)
check(!HARSH2.some(w => SOUND_TONE_GUIDE.join(' ').includes(w)),
  `어조 지침에도 금지어를 예시로 적지 않았습니다 (교훈 EG)`)

// 🔴 격 이름을 «가려서» 내보내는가 (교훈 BF)
check(GYEOK_HIDDEN_KEYS.length === 12, `격 이름을 가린 칸 12 (${GYEOK_HIDDEN_KEYS.length})`)
check(Object.values(SOUND_125_GUIDE).every(v => v.gyeokPublic === null || isGyeokPublishable(v.gyeokPublic)),
  `★내보내는 격 이름에는 자극적인 말이 없습니다`)
for (const k of ['화화화', '목화금', '금금목']) {
  const v = SOUND_125_GUIDE[k]
  check(v.gyeokPublic === null, `${k} — 격 이름을 가렸습니다 (${SOUND_ARRANGEMENT[k].gyeok})`)
}
check(SOUND_125_GUIDE['토토화'].gyeokPublic === '금상유문격', `자극적이지 않은 격 이름은 그대로 나갑니다`)

console.log('\n━━ ⑨-i 🔴 AI 재료 전체를 훑습니다 ━━')
{
  const bad: string[] = []
  for (const a of OH) for (const b of OH) for (const c of OH) {
    const ch = (o: string) => o === '목' ? '가' : o === '화' ? '나' : o === '토' ? '아' : o === '금' ? '사' : '마'
    const v = evaluateSoundOhaeng([
      { hangul: ch(a), 역할: '성' }, { hangul: ch(b), 역할: '이름' }, { hangul: ch(c), 역할: '이름' }])
    const blob = JSON.stringify({ g: v.gyeokPublic, t: v.theme, s: v.gentle, l: v.links.map(x => x.text) })
    for (const w of HARSH2) if (blob.includes(w)) bad.push(`${a}${b}${c}:${w}`)
  }
  check(bad.length === 0, `★125칸 전부의 AI 재료에 금지어 0건 — ${bad.slice(0, 3).join(',') || '0건'}`)
}

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
