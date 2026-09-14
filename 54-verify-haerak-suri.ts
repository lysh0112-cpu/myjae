// 54-verify-haerak-suri.ts
//
//   하락이수(河洛理數) 1단계 — 수리 · 괘 · 효
//   2026-09-14 (8부)  [연재쌤 뜻 · 대표님 손글씨 노트]
//
//   돌리기:  npx tsx 54-verify-haerak-suri.ts
//
//  ┌──────────────────────────────────────────────────────────────────┐
//  │  ★이 그물은 «제가 만든 규칙» 을 재는 것이 아닙니다.                │
//  │    손글씨 노트 ★일곱 건의 «값 그대로» 를 넣고 코드가 같은 답을      │
//  │    내는지 봅니다.                                                  │
//  │  ⛔ 노트와 어긋나면 ★코드를 고치십시오. 노트가 «근거» 입니다.       │
//  └──────────────────────────────────────────────────────────────────┘

import {
  GAN_SU, WOLJI_SU, JI_OHAENG, nyeonjiSu, iljiSu,
  PALGWAE, PALGWAE_HYO, palgwaeOfHyo, gwaeName, GWAE_KO, GWAE_NO, NEXT_ASK_YEONJAE,
} from './lib/saju/haerak/tables/suri'
import {
  splitGanjiHaerak, jiOfEumnyeokWol, namuji, kanSu, bakkunHagwae, calcHaerak,
} from './lib/saju/haerak/haerakSuri'
import { readFileSync } from 'fs'

let pass = 0, fail = 0
const ok = (c: boolean, m: string) => { if (c) { pass++; console.log('  ✅ ' + m) } else { fail++; console.log('  ❌ ' + m) } }
const head = (t: string) => console.log('\n━━ ' + t + ' ━━')
/** 주석을 걷어낸 «사는 코드» — 주석에 걸리지 않게 (6부 ⛔) */
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/* ══ 노트 일곱 건 — ★읽은 값 그대로 ══════════════════════════════ */
interface Note {
  who: string; year: number
  nai: number; wolLast: number; eumIl: number
  nyeon: string; wol: string; il: string
  suN: number; suW: number; suI: number
  seon: string; hyo: number; hu: string
  /** ★하락이수 도표 번호 (「표」 노트) */
  seonNo: number; huNo: number
}
const NOTES: Note[] = [
  { who: '희준', year: 2026, nai: 32, wolLast: 30, eumIl: 8,
    nyeon: '丙午', wol: '丁酉', il: '乙未', suN: 48, suW: 42, suI: 27, seon: '師', hyo: 3, hu: '升', seonNo: 10, huNo: 67 },
  { who: '희준', year: 2027, nai: 32, wolLast: 29, eumIl: 8,
    nyeon: '丁未', wol: '己酉', il: '庚寅', suN: 51, suW: 44, suI: 24, seon: '睽', hyo: 3, hu: '大有', seonNo: 55, huNo: 20 },
  { who: '도이', year: 2026, nai: 29, wolLast: 30, eumIl: 7,
    nyeon: '丙午', wol: '辛丑', il: '癸巳', suN: 45, suW: 45, suI: 19, seon: '家人', hyo: 1, hu: '漸', seonNo: 53, huNo: 77 },
  { who: '도이', year: 2027, nai: 29, wolLast: 30, eumIl: 7,
    nyeon: '丁未', wol: '癸丑', il: '丁亥', suN: 48, suW: 43, suI: 22, seon: '泰', hyo: 1, hu: '升', seonNo: 16, huNo: 67 },
  { who: '류', year: 2026, nai: 61, wolLast: 30, eumIl: 12,
    nyeon: '丙午', wol: '庚寅', il: '癸酉', suN: 77, suW: 45, suI: 27, seon: '家人', hyo: 3, hu: '益', seonNo: 53, huNo: 61 },
  { who: '류', year: 2027, nai: 61, wolLast: 29, eumIl: 12,
    nyeon: '丁未', wol: '壬寅', il: '戊辰', suN: 80, suW: 42, suI: 28, seon: '師', hyo: 1, hu: '臨', seonNo: 10, huNo: 27 },
  { who: '나', year: 2026, nai: 60, wolLast: 30, eumIl: 15,
    nyeon: '丙午', wol: '庚子', il: '辛未', suN: 76, suW: 47, suI: 33, seon: '恒', hyo: 3, hu: '解', seonNo: 46, huNo: 58 },
]

head('① 🔴 천간 — 네 칸 모두 «같은 표» (노트 ③장)')
{
  ok('甲乙丙丁戊己庚辛壬癸'.split('').every(g => g in GAN_SU), '★천간 열 자리가 다 있습니다')
  ok(GAN_SU.甲 === 9 && GAN_SU.己 === 9, '甲己 = 9')
  ok(GAN_SU.乙 === 8 && GAN_SU.庚 === 8, '乙庚 = 8')
  ok(GAN_SU.丙 === 7 && GAN_SU.辛 === 7, '丙辛 = 7')
  ok(GAN_SU.丁 === 6 && GAN_SU.壬 === 6, '丁壬 = 6')
  ok(GAN_SU.戊 === 5 && GAN_SU.癸 === 5, '戊癸 = 5')
}

head('② 🔴🔴 지지는 «칸마다 표가 다릅니다» — 이번의 핵심')
{
  const ji = '子丑寅卯辰巳午未申酉戌亥'.split('')
  ok(ji.every(j => j in WOLJI_SU), '월지 — 열두 자리가 다 있습니다')
  ok(ji.every(j => nyeonjiSu(j) !== null), '년지 — 열두 자리가 다 있습니다')
  ok(ji.every(j => iljiSu(j) !== null), '일지 — 열두 자리가 다 있습니다')

  ;([['子', '午', 9], ['丑', '未', 8], ['寅', '申', 7], ['卯', '酉', 6], ['辰', '戌', 5], ['巳', '亥', 4]] as [string, string, number][])
    .forEach(([a, b, n]) => ok(WOLJI_SU[a] === n && WOLJI_SU[b] === n, `월지 ${a}${b} = ${n}`))

  ok(nyeonjiSu('未') === 13 && nyeonjiSu('辰') === 13, '년지 土(辰戌丑未) = ★13')
  ok(nyeonjiSu('申') === 12 && nyeonjiSu('酉') === 12, '년지 金(申酉) = 12')
  ok(nyeonjiSu('亥') === 11 && nyeonjiSu('子') === 11, '년지 水(亥子) = 11')
  ok(nyeonjiSu('寅') === 10 && nyeonjiSu('卯') === 10, '년지 木(寅卯) = 10')
  ok(nyeonjiSu('巳') === 9 && nyeonjiSu('午') === 9, '년지 火(巳午) = 9')

  ok(iljiSu('未') === 11 && iljiSu('戌') === 11, '일지 土 = ★11')
  ok(iljiSu('酉') === 10, '일지 金 = 10')
  ok(iljiSu('亥') === 9, '일지 水 = 9')
  ok(iljiSu('寅') === 8, '일지 木 = 8')
  ok(iljiSu('巳') === 7 && iljiSu('午') === 7, '일지 火 = 7')
  ok(ji.every(j => nyeonjiSu(j)! - iljiSu(j)! === 2), '★년지가 일지보다 «언제나 2» 큽니다')

  ok(WOLJI_SU['未'] === 8 && nyeonjiSu('未') === 13 && iljiSu('未') === 11,
    '🔴 ★未 — 월칸 8 · 년칸 13 · 일칸 11 «셋이 다릅니다»')
  ok(new Set(ji.map(j => JI_OHAENG[j])).size === 5, '★오행 다섯으로 나뉩니다')
}

head('③ 🔴 하락이수 달력 — 음력 달이 «그대로» 지지 (노트 ④장)')
{
  ok(jiOfEumnyeokWol(1) === '寅', '음력 1월 = 寅   (류 님 — 노트의 寅칸과 같습니다)')
  ok(jiOfEumnyeokWol(8) === '酉', '음력 8월 = 酉   (희준 님 — 노트의 酉칸과 같습니다)')
  ok(jiOfEumnyeokWol(11) === '子', '음력 11월 = 子  (나 — 노트의 子칸과 같습니다)')
  ok(jiOfEumnyeokWol(12) === '丑', '음력 12월 = 丑  (도이 님 — 노트의 丑칸과 같습니다)')
  ok(jiOfEumnyeokWol(0) === '' && jiOfEumnyeokWol(13) === '', '⛔ 없는 달이면 빈 값 (0으로 안 셉니다)')
  const src = code(readFileSync('lib/saju/haerak/tables/suri.ts', 'utf8'))
  ok(!/입춘|절입/.test(src), '⛔ 절기를 끌어다 쓰지 않습니다 (사주 월주와 «다른 물건»)')
}

head('④ 🔴 노트 일곱 건 — 세 수가 그대로 나오는가 (스물한 개)')
NOTES.forEach(n => {
  const a = kanSu('nyeon', n.nyeon, n.nai)
  const b = kanSu('wol', n.wol, n.wolLast)
  const c = kanSu('il', n.il, n.eumIl)
  ok(!!a && a.total === n.suN, `${n.who} ${n.year}  년수 ${a?.total} = 노트 ${n.suN}   (${n.nai} + ${a?.ganSu} + ${a?.jiSu})`)
  ok(!!b && b.total === n.suW, `${n.who} ${n.year}  월수 ${b?.total} = 노트 ${n.suW}   (${n.wolLast} + ${b?.ganSu} + ${b?.jiSu})`)
  ok(!!c && c.total === n.suI, `${n.who} ${n.year}  일수 ${c?.total} = 노트 ${n.suI}   (${n.eumIl} + ${c?.ganSu} + ${c?.jiSu})`)
})

head('⑤ 🔴 나머지 셈 — 0이면 «나눈 수 그대로» (노트 ⑦번)')
{
  ok(namuji(48, 8) === 8, '48 ÷ 8 → 나머지 0 ⇒ ★8 (노트 「48-48=8」)')
  ok(namuji(42, 6) === 6, '42 ÷ 6 → 나머지 0 ⇒ ★6 (노트 「42-42=6」)')
  ok(namuji(33, 3) === 3, '33 ÷ 3 → 나머지 0 ⇒ ★3 (노트 「33÷3=11」)')
  ok(namuji(76, 8) === 4, '76 ÷ 8 ⇒ 4 (노트 「76÷8 ×9=72」)')
  ok(namuji(47, 6) === 5, '47 ÷ 6 ⇒ 5')
  ok(namuji(0, 8) === 8, '⛔ 0이 그대로 0으로 안 나갑니다 — 괘에 0번은 없습니다')
}

head('⑥ 🔴🔴 선천괘와 동효 — 일곱 건 «전부»')
NOTES.forEach(n => {
  const r = calcHaerak({
    nyeonGanji: n.nyeon, wolGanji: n.wol, ilGanji: n.il,
    nai: n.nai, wolLastDay: n.wolLast, eumIl: n.eumIl,
  })
  ok(!!r && r.seoncheon.name === n.seon,
    `${n.who} ${n.year} — 상괘 ${r?.seoncheon.sang}(${namuji(n.suN, 8)}) · 하괘 ${r?.seoncheon.ha}(${namuji(n.suW, 6)}) ⇒ 「${r?.seoncheon.name}」 = 노트 「${n.seon}」`)
  ok(!!r && r.dongHyo === n.hyo, `${n.who} ${n.year} — 동효 ${r?.dongHyo} = 노트 ${n.hyo}`)
})

head('⑦ 🔴 후천괘 — 외괘(하괘)에서 동효를 만든다 (노트 ⑩⑪번)')
NOTES.forEach(n => {
  const r = calcHaerak({
    nyeonGanji: n.nyeon, wolGanji: n.wol, ilGanji: n.il,
    nai: n.nai, wolLastDay: n.wolLast, eumIl: n.eumIl,
  })
  ok(!!r && r.hucheon.name === n.hu,
    `${n.who} ${n.year} — ${r?.seoncheon.ha} 의 ${n.hyo}째 줄을 바꿔 ${r?.hucheon.ha} ⇒ 「${r?.hucheon.name}」`)
})

head('⑧ 🔴 하락이수 도표 번호 — 노트에 적힌 번호와 같은가 (「표」 노트)')
NOTES.forEach(n => {
  const r = calcHaerak({
    nyeonGanji: n.nyeon, wolGanji: n.wol, ilGanji: n.il,
    nai: n.nai, wolLastDay: n.wolLast, eumIl: n.eumIl,
  })
  ok(!!r && r.seoncheon.no === n.seonNo && r.hucheon.no === n.huNo,
    `${n.who} ${n.year} — 선천 ${r?.seoncheon.name} ${r?.seoncheon.no} · 후천 ${r?.hucheon.name} ${r?.hucheon.no}  = 노트 ${n.seonNo} · ${n.huNo}`)
})

head('⑨ 🔴 동효로 괘 한 줄 뒤집기 — 세 줄이 제대로 도는가')
{
  ok(bakkunHagwae('坎', 3) === '巽', '坎 의 셋째 줄을 바꾸면 巽   (희준 26년)')
  ok(bakkunHagwae('兌', 3) === '乾', '兌 의 셋째 줄을 바꾸면 乾   (희준 27년)')
  ok(bakkunHagwae('乾', 1) === '巽', '乾 의 첫째 줄을 바꾸면 巽   (도이 27년)')
  ok(bakkunHagwae('坎', 1) === '兌', '坎 의 첫째 줄을 바꾸면 兌   (류 27년)')
  ok(bakkunHagwae('離', 3) === '震', '離 의 셋째 줄을 바꾸면 震   (류 26년)')
  ok(bakkunHagwae('巽', 3) === '坎', '巽 의 셋째 줄을 바꾸면 坎   (나 26년)')
  const all = Object.keys(PALGWAE_HYO)
  ok(all.every(g => [1, 2, 3].every(h => bakkunHagwae(bakkunHagwae(g, h), h) === g)),
    '★두 번 바꾸면 제자리 — 여덟 괘 × 세 줄을 다 재었습니다')
  ok(all.every(g => [1, 2, 3].every(h => bakkunHagwae(g, h) !== '')), '⛔ 없는 괘로 떨어지는 자리가 없습니다')
  ok(bakkunHagwae('坎', 4) === '' && bakkunHagwae('坎', 0) === '', '⛔ 효는 1·2·3 뿐입니다')
  ok(palgwaeOfHyo([1, 1, 1]) === '乾' && palgwaeOfHyo([0, 0, 0]) === '坤', '세 줄로 이름을 되찾습니다')
}

head('⑩ 🔴 64괘 표 — 노트에 나온 열한 괘가 다 맞는가')
{
  const seen: [string, string, string][] = [
    ['坤', '坎', '師'], ['離', '兌', '睽'], ['巽', '離', '家人'], ['坤', '乾', '泰'], ['震', '巽', '恒'],
    ['坤', '巽', '升'], ['離', '乾', '大有'], ['巽', '震', '益'], ['坤', '兌', '臨'], ['震', '坎', '解'],
    ['巽', '艮', '漸'],
  ]
  seen.forEach(([s, h, g]) => ok(gwaeName(s, h) === g, `${s}상 ${h}하 ⇒ 「${g}(${GWAE_KO[g]})」`))
  const order = ['乾', '兌', '離', '震', '巽', '坎', '艮', '坤']
  const all = order.flatMap(s => order.map(h => gwaeName(s, h)))
  ok(all.every(Boolean) && all.length === 64, '★64칸이 «빠짐없이» 찼습니다')
  ok(new Set(all).size === 64, '★64괘 이름이 «겹치지» 않습니다')
  ok(all.every(g => (GWAE_KO[g] ?? '') !== ''), '★64괘가 다 한글 이름을 가졌습니다')
}

head('⑪ ⚠️ 하괘는 1~6 뿐 — 艮·坤은 «처음에는» 하괘에 안 옵니다')
{
  const has = new Set<string>()
  for (let i = 1; i <= 200; i++) has.add(PALGWAE[namuji(i, 6)])
  ok(!has.has('艮') && !has.has('坤'), '★艮·坤이 선천괘 하괘로 한 번도 안 나옵니다 (6으로 나누기 때문)')
  ok(has.size === 6, '★선천괘 하괘는 乾兌離震巽坎 여섯뿐입니다')
  ok(bakkunHagwae('離', 1) === '艮', '⚠️ 다만 동효로 «바뀐 뒤» 에는 艮도 옵니다 (도이 26년)')
}

head('⑫ 🔴 못 읽는 값을 «조용히 0으로» 세지 않는가')
{
  ok(splitGanjiHaerak('') === null, '빈 값 ⇒ null')
  ok(splitGanjiHaerak('가나') === null, '⛔ 간지가 아닌 글자 ⇒ null (0으로 안 셉니다)')
  ok(splitGanjiHaerak('갑자(甲子)')?.ji === '子', '★「갑자(甲子)」 도 읽습니다 (기존 방식과 같게)')
  ok(kanSu('nyeon', '丙午', NaN) === null, '윗수가 숫자가 아니면 ⇒ null')
  ok(calcHaerak({ nyeonGanji: '', wolGanji: '丁酉', ilGanji: '乙未', nai: 32, wolLastDay: 30, eumIl: 8 }) === null,
    '한 칸이라도 못 읽으면 ⇒ null')
}

head('⑬ ⚠️ 시를 몰라도 답이 «같은가» (노트가 세 칸뿐입니다)')
{
  const base = { nyeonGanji: '丙午', wolGanji: '丁酉', ilGanji: '乙未', nai: 32, wolLastDay: 30, eumIl: 8 }
  const a = calcHaerak(base)
  const b = calcHaerak({ ...base, hourUnknown: true })
  ok(!!a && !!b && a.seoncheon.name === b.seoncheon.name && a.hucheon.name === b.hucheon.name,
    '★시를 몰라도 선천괘·후천괘가 같습니다')
  ok(!!b && b.hourUnknown === true, '★「시를 모른다」 는 사실은 그대로 들고 갑니다 (숨기지 않습니다)')
}

head('⑭ 🔴 도표 번호표 — 64칸이 빠짐없이 · 겹치지 않는가')
{
  const order = ['乾', '兌', '離', '震', '巽', '坎', '艮', '坤']
  const all = order.flatMap(s2 => order.map(h => gwaeName(s2, h)))
  ok(all.every(g => (GWAE_NO[g] ?? 0) > 0), '★64괘가 다 도표 번호를 가졌습니다')
  ok(new Set(all.map(g => GWAE_NO[g])).size === 64, '★번호가 «겹치지» 않습니다')
  ok(Math.min(...all.map(g => GWAE_NO[g])) === 1 && Math.max(...all.map(g => GWAE_NO[g])) === 94,
    '★1부터 94까지 띄엄띄엄 씁니다 (주역 차례와 «다릅니다»)')
  ok(GWAE_NO['漸'] === 77, '🔴 ★漸(점) = 77 — 도이 님 26년 노트의 「77」이 이것이었습니다')
  ok(GWAE_NO['井'] === 70, '⚠️ 井(정)은 70 입니다 — 노트의 77과 «다릅니다»')
  ok(GWAE_NO['師'] === 10 && GWAE_NO['恒'] === 46 && GWAE_NO['升'] === 67, '사10 · 항46 · 승67 — 노트 그대로')
}

head('⑮ 🔴 대표님이 정하신 두 가지 (2026-09-14)')
{
  const base = { nyeonGanji: '丙午', wolGanji: '丁酉', ilGanji: '乙未', nai: 32, eumIl: 8 }
  ok(calcHaerak({ ...base, wolLastDay: 31 }) === null, '⛔ ★음력에 31일은 «없습니다» — 막습니다')
  ok(calcHaerak({ ...base, wolLastDay: 28 }) === null, '⛔ 28일도 안 받습니다 (29·30 뿐)')
  ok(calcHaerak({ ...base, wolLastDay: 29 }) !== null && calcHaerak({ ...base, wolLastDay: 30 }) !== null,
    '★29와 30만 받습니다')
  //  나이 — «보러 오시는 그때» 하나로 봅니다. 한 살을 올리면 괘가 달라집니다.
  const a27 = calcHaerak({ nyeonGanji: '丁未', wolGanji: '己酉', ilGanji: '庚寅', nai: 32, wolLastDay: 29, eumIl: 8 })
  const b27 = calcHaerak({ nyeonGanji: '丁未', wolGanji: '己酉', ilGanji: '庚寅', nai: 33, wolLastDay: 29, eumIl: 8 })
  ok(!!a27 && a27.seoncheon.name === '睽', '★나이 32로 27년을 보면 「睽(규)」 — 노트 그대로')
  ok(!!b27 && b27.seoncheon.name !== '睽', `⚠️ 한 살 올리면 「${b27?.seoncheon.name}」 로 ★바뀝니다 — 그래서 나이를 하나로 둡니다`)
}

head('⑯ 🔴 다음에 여쭐 것을 «적어 두었는가» (2단계)')
{
  ok(NEXT_ASK_YEONJAE.length === 3, `★2단계에 여쭐 것이 ${NEXT_ASK_YEONJAE.length}가지 적혀 있습니다`)
  ok(NEXT_ASK_YEONJAE.some(q => /192|풀이/.test(q)), '★풀이 글을 어디서 가져오는지 여쭙니다')
  ok(NEXT_ASK_YEONJAE.some(q => /상반기/.test(q)), '★선천=상반기 · 후천=하반기가 맞는지 여쭙니다')
}

head('⑰ ⛔ 수리표를 «베껴 적은 곳» 이 또 없는가')
{
  const src = code(readFileSync('lib/saju/haerak/haerakSuri.ts', 'utf8'))
  ok(!/甲:\s*9/.test(src), '⛔ 셈하는 파일에 수리표를 «다시» 적지 않았습니다')
  ok(!/土:\s*13/.test(src), '⛔ 년지 표도 «다시» 적지 않았습니다')
  ok(/from '\.\/tables\/suri'/.test(src), '★표는 tables/suri 에서 «가져다» 씁니다')
  ok(!/anthropic|tongbyeon/i.test(src), '⛔ AI 를 부르는 자리가 «없습니다» (순수 계산)')
}

console.log(`\n━━ 하락이수 수리 — 통과 ${pass} · 실패 ${fail} ━━\n`)
process.exit(fail ? 1 : 0)
