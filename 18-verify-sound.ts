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
import { dueumPair, dueumPairIfReal, dueumNotice, dueumNoticeForName } from './lib/saju/sound/dueum'
import { DONGJA_IEUM } from './lib/saju/tables/jakmyeongGaeunbeop'
import { fetchHanjaReadings } from './lib/saju/hanjaRow'
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

console.log('\n━━ ⑨-k links 에 «어느 글자 사이인가» 가 실리는가 (40부 4차) ━━')
{
  const v = S('최수라')
  check(v.links.every(l => !!l.fromChar && !!l.toChar), `링크마다 앞뒤 글자가 실립니다`)
  check(v.links[0].fromChar === '최' && v.links[0].toChar === '수', `첫 링크는 최→수 (${v.links[0].fromChar}→${v.links[0].toChar})`)
  check(v.links[1].fromChar === '수' && v.links[1].toChar === '라', `둘째 링크는 수→라 (${v.links[1].fromChar}→${v.links[1].toChar})`)
  // ★글자와 오행이 어긋나면 AI 가 뒤집어 씁니다 — sequence 와 대조합니다
  const bad: string[] = []
  for (const a of OH) for (const b of OH) for (const c of OH) {
    const ch = (o: string) => o === '목' ? '가' : o === '화' ? '나' : o === '토' ? '아' : o === '금' ? '사' : '마'
    const w = evaluateSoundOhaeng([
      { hangul: ch(a), 역할: '성' }, { hangul: ch(b), 역할: '이름' }, { hangul: ch(c), 역할: '이름' }])
    const seq = [ch(a), ch(b), ch(c)]
    for (let i = 0; i < w.links.length; i++) {
      if (w.links[i].fromChar !== seq[i] || w.links[i].toChar !== seq[i + 1]) bad.push(`${a}${b}${c}`)
    }
  }
  check(bad.length === 0, `★125칸 전부에서 링크의 글자가 배열 순서와 맞습니다 — ${bad.slice(0, 3).join(',') || '0건'}`)
}

console.log('\n━━ ⑨-j 두음법칙 안내 — ★판정은 «바꾸지 않습니다» ━━')
// 교재 43자와 규칙이 맞는가 (교훈 EO — 바깥의 정답표와 대조)
{
  const book = DONGJA_IEUM.filter(x => x.kind === '두음법칙')
  let hit = 0; const miss: string[] = []
  for (const e of book) {
    const m = e.reading.match(/([가-힣])\/([가-힣])\s*$/)
    if (!m) continue
    const p = dueumPair(m[1])
    if (p && p.alternate === m[2]) hit++; else miss.push(e.hanja)
  }
  check(hit === book.length, `교재 두음법칙 ${book.length}자와 규칙이 일치 (${hit}) — 못 잡음 ${miss.join(',') || '없음'}`)
}
// ★오행이 «갈리지 않는» 자리는 알리지 않습니다 (라/나 는 둘 다 화)
for (const h of ['라', '로', '뢰', '나', '노']) check(dueumPair(h) === null, `${h} — 오행이 같아 알리지 않습니다`)
for (const h of ['류', '리', '량', '려', '례']) check(dueumPair(h) !== null, `${h} — 오행이 갈려 알림 대상`)
// ★«정말 두 음으로 실린 한자» 일 때만
check(dueumPairIfReal('류', ['류', '유'], '柳') !== null, `柳 는 두 음이 실려 있어 알립니다`)
check(dueumPairIfReal('이', ['이'], '李') === null, `李 는 «리» 가 표에 없으면 알리지 않습니다 (손님 15% 를 지킵니다)`)
check(dueumPairIfReal('양', ['양'], '楊') === null, `楊 은 본래 «양» 이라 알리지 않습니다`)
// 🔴 조사 — ★제가 여기서 두 번 틀렸습니다. 못을 박습니다 (교훈 AU)
{
  const bad: string[] = []
  for (const [hj, w, alt] of [['柳', '류', '유'], ['梁', '양', '량'], ['呂', '여', '려'],
                              ['禮', '예', '례'], ['龍', '용', '룡'], ['李', '이', '리']] as const) {
    const t = dueumNotice(dueumPairIfReal(w, [w, alt], hj)!)
    // 「梁는」(X) / 「梁은」(O) — 조사는 «한자» 가 아니라 «읽는 음» 으로 골라야 합니다
    const want = hasJong(w) ? `${hj}은 ` : `${hj}는 `
    if (!t.startsWith(want)) bad.push(`${hj}${w}`)
    if (/」로도/.test(t) && hasJong(w)) bad.push(`${hj}:로도`)
    if (/」으로도/.test(t) && !hasJong(w)) bad.push(`${hj}:으로도`)
  }
  check(bad.length === 0, `★안내 문장의 조사 — 틀린 곳 ${bad.join(',') || '0건'}`)
}
check(!dueumNotice(dueumPairIfReal('류', ['류', '유'], '柳')!).includes('틀'),
  `안내가 «틀렸다» 로 읽히지 않습니다 — 둘 다 맞습니다`)
// 성씨 자리만 봅니다 — 諒(량)은 이름 끝이라 걸리면 안 됩니다
check(dueumNoticeForName(
  [{ hangul: '류', hanja: '柳', 역할: '성' }, { hangul: '길', hanja: '吉', 역할: '이름' },
   { hangul: '량', hanja: '諒', 역할: '이름' }], { 柳: ['류', '유'], 諒: ['량', '양'] }) !== null,
  `성씨 자리에서 잡습니다`)
check(dueumNoticeForName(
  [{ hangul: '김', hanja: '金', 역할: '성' }, { hangul: '량', hanja: '諒', 역할: '이름' }],
  { 諒: ['량', '양'] }) === null, `★이름 글자는 두음 자리가 아니라 알리지 않습니다`)
// 조회가 깨져도 화면이 죽지 않는가
void (async () => {
  const a = await fetchHanjaReadings(() => Promise.reject(new Error('x')) as never, '柳')
  const b = await fetchHanjaReadings(() => Promise.resolve({ data: null, error: 'boom' }), '柳')
  check(a.length === 0 && b.length === 0, `조회가 실패해도 빈 배열 — 화면이 죽지 않습니다`)
})()

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
