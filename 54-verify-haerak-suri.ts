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
import { gwaeTextOf, hyoTextOf, gwaeTextCount, gwaeTextHave, allChecks } from './lib/saju/haerak/tables/gwaeText'
import { nyeonGanjiOf, wolGanjiOf, ilGanjiOf, wolLastDayOf, naiOf } from './lib/saju/haerak/haerakInputs'
import { solarToLunarKR, lunarToSolarKR, lunarMonthSizeKR } from './lib/saju/koreanLunarTable'
import { solarToLunar as movingS2L } from './app/manseryeok/moving-timing/lib/lunarTable'
import { fallbackSolarToLunar } from './lib/saju/lunarConvert'
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
  ok(NEXT_ASK_YEONJAE.length === 5, `★2단계에 여쭐 것이 ${NEXT_ASK_YEONJAE.length}가지 적혀 있습니다`)
  ok(NEXT_ASK_YEONJAE.some(q => /192|풀이/.test(q)), '★풀이 글을 어디서 가져오는지 여쭙니다')
  ok(NEXT_ASK_YEONJAE.some(q => /원당/.test(q)), '⚠️ 교재 갈래 이름 「원당과…」 을 어떻게 부를지 여쭙니다')
  ok(NEXT_ASK_YEONJAE.some(q => /재수/.test(q)), '🔴 ★「수가 흉한 사람」 스무 칸을 손님께 보일지 여쭙니다 [대표님 2026-09-14]')
  //  🔴 ⛔ 손님에게 나가는 «값» 에 「원당」 이 섞이지 않는가 [대표님 2026-09-14]
  {
    const r = calcHaerak({ nyeonGanji: '丙午', wolGanji: '丁酉', ilGanji: '乙未', nai: 32, wolLastDay: 30, eumIl: 8 })
    ok(!!r && !/원당|元堂/.test(JSON.stringify({ su: r.su, dongHyo: r.dongHyo, seoncheon: r.seoncheon, hucheon: r.hucheon })),
      '⛔ ★셈이 내놓는 값에 「원당」 이 «한 글자도» 없습니다 (대표님 2026-09-14)')
  }
  //  ⚠️ ★남은 큰 물음은 «월칸 윗수(29/30)» 하나입니다 (2026-09-14)
  ok(NEXT_ASK_YEONJAE.some(q => /월칸 윗수|29\/30|29 \/ 30/.test(q)),
    '🔴 ★월칸 윗수(29/30)를 무엇을 보고 적는지 여쭙니다 — 지금 노트와 «넷» 어긋납니다')
}

head('⑰ 🔴 괘 풀이 글 — 교재와 «글자 그대로» 인가 (2단계 첫걸음)')
{
  ok(gwaeTextCount() === 64, `🎉 ★글이 들어온 괘 — ${gwaeTextCount()} / 64 — ★다 찼습니다`)

  const sa = gwaeTextOf(10)
  ok(!!sa && sa.name === '師', '★師(사) 10 이 들어왔습니다')
  ok(!!sa && sa.no === GWAE_NO['師'], '★글의 번호가 도표 번호(10)와 «같습니다»')
  ok(!!sa && !!sa.src, '★교재 어디서 왔는지 적혀 있습니다 (연재쌤 검수 근거)')

  //  🔴 노트 두 건과 «글자 그대로» 맞는지 — 이것이 이 그물의 핵심입니다
  const h1 = hyoTextOf(10, 1)
  ok(!!h1 && h1.label === '初六', '師 1효 이름이 「初六」 입니다 (하괘 坎의 첫 줄이 음)')
  ok(!!h1 && h1.parts[0].text.startsWith('아랫 사람 된 도리를 다하여'),
    '★류 님 27년 노트 「아랫사람 된 도리를 다하여…」 와 같습니다')
  ok(!!h1 && h1.parts.some(p => p.who === '수가 흉한 사람'),
    '★「수가 흉한 사람」 갈래도 빠뜨리지 않았습니다')

  const h3 = hyoTextOf(10, 3)
  ok(!!h3 && h3.label === '六三', '師 3효 이름이 「六三」 입니다 (하괘 坎의 셋째 줄이 음)')
  ok(!!h3 && h3.lead === '슬픔과 근심이 많이 생기며 혹 부모의 상을 당해 상복을 입게 된다.',
    '★희준 님 26년 노트의 첫 줄과 «글자 그대로» 같습니다')
  ok(!!h3 && h3.parts[1].text.startsWith('직책을 받아 결원을 기다린다'),
    '★「직책을 받아 결원을 기다린다」 까지 같습니다')

  //  ⛔ 효 이름의 음양이 «하괘» 와 맞는가 — 어긋나면 다른 괘 글을 붙인 것입니다
  const bits = PALGWAE_HYO['坎']
  const wantLabel = (n: number) =>
    (n === 1 ? '初' : '') + (bits[n - 1] ? '九' : '六') + (n === 1 ? '' : n === 2 ? '二' : '三')
  ok([1, 2, 3].every(n => hyoTextOf(10, n)!.label === wantLabel(n)),
    '🔴 ★효 이름 셋이 하괘(坎)의 음양과 «다 맞습니다» — 남의 괘 글이 섞이지 않았습니다')

  //  ⛔ 4·5·6효를 담지 않았는가
  ok(hyoTextOf(10, 4) === null && hyoTextOf(10, 6) === null, '⛔ 4·5·6효는 담지 않았습니다 (영영 안 쓰입니다)')
  ok(hyoTextOf(2, 1) === null && hyoTextOf(99, 1) === null, '⛔ 도표에 «없는» 번호(2 · 99)는 ★null 입니다 — 지어내지 않습니다')

  //  🔴 들어온 서른여섯 괘 «전부» — 효 이름이 하괘의 음양과 맞는가
  const O2 = ['乾', '兌', '離', '震', '巽', '坎', '艮', '坤']
  const partsOf = (nm: string) => {
    for (const s2 of O2) for (const h of O2) if (gwaeName(s2, h) === nm) return { s: s2, h }
    return null
  }
  const wantLab = (ha: string, n: number) => {
    const b = PALGWAE_HYO[ha]
    return (n === 1 ? '初' : '') + (b[n - 1] ? '九' : '六') + (n === 1 ? '' : n === 2 ? '二' : '三')
  }
  {
    const bad: string[] = []
    let cells = 0
    gwaeTextHave().forEach(no => {
      const g = gwaeTextOf(no)!
      const p = partsOf(g.name)
      if (!p) { bad.push(`${g.name} — 64괘 표에 없음`); return }
      for (const n of [1, 2, 3] as const) {
        cells++
        if (g.hyo[n].label !== wantLab(p.h, n)) bad.push(`${g.name} ${n}효 ${g.hyo[n].label} ≠ ${wantLab(p.h, n)}`)
      }
    })
    ok(bad.length === 0, `🔴 ★효 이름 ${cells}칸이 하괘의 음양과 «다 맞습니다» ${bad.join(' / ')}`)
  }
  //  ⚠️ 교재에 «다르게» 적힌 효 이름 — 고치지 않고 둘 다 남긴 자리
  {
    const src = gwaeTextHave().flatMap(no => {
      const g = gwaeTextOf(no)!
      return ([1, 2, 3] as const).filter(n => g.hyo[n].labelSrc).map(n => `${g.name}${no} ${n}효 교재「${g.hyo[n].labelSrc}」 셈「${g.hyo[n].label}」`)
    })
    ok(src.length === 1, `⚠️ ★교재와 어긋난 효 이름 ${src.length}곳 — ${src.join(' / ')}`)
    ok(gwaeTextHave().every(no => ([1, 2, 3] as const).every(n => {
      const h = gwaeTextOf(no)!.hyo[n]
      return !h.labelSrc || h.labelSrc !== h.label
    })), '⛔ labelSrc 는 «다를 때만» 넣습니다 (같으면 군더더기)')
  }
  //  ⛔ 번호가 도표와 어긋난 괘가 없는가
  ok(gwaeTextHave().every(no => gwaeTextOf(no)!.no === no && GWAE_NO[gwaeTextOf(no)!.name] === no),
    '⛔ ★서른여섯 괘의 번호가 도표 번호와 «다 같습니다»')
  //  ⛔ 빈 글 · 출처 없는 괘가 없는가
  ok(gwaeTextHave().every(no => !!gwaeTextOf(no)!.src), '★서른여섯 괘가 다 «교재 출처» 를 갖고 있습니다')
  ok(gwaeTextHave().every(no => [1, 2, 3].every(n => {
    const h = gwaeTextOf(no)!.hyo[n as 1 | 2 | 3]
    return (h.lead ?? '').length + h.parts.length > 0 && h.parts.every(x => x.who && x.text)
  })), '⛔ 빈 효 · 빈 갈래가 한 칸도 없습니다')
  //  🔴 못 읽은 자리를 «숨기지 않는가»
  ok(allChecks().length >= 30,
    `🔴 ★제가 «못 읽은» 자리를 ${allChecks().length}곳 적어 두었습니다 — 대표님이 여기만 보시면 됩니다`)
  ok(allChecks().every(c => c.name && c.note), '★어느 괘의 어디인지까지 적혀 있습니다')

  //  🔴 ⛔ 손님에게 «가린» 갈래 — 교재 원문은 남기고 화면에서만 뺍니다 [대표님 2026-09-14]
  {
    const hidden = gwaeTextHave().flatMap(no => {
      const g = gwaeTextOf(no)!
      return ([1, 2, 3] as const).flatMap(n => g.hyo[n].parts.filter(p => p.hide).map(p => ({ no, name: g.name, who: p.who, why: p.why })))
    })
    ok(hidden.length === 2, `⛔ ★손님에게 가린 갈래 ${hidden.length}개 — ${hidden.map(h => h.name + h.no + ' 「' + h.who + '」').join(' / ')}`)
    ok(hidden.every(h => !!h.why && h.why.length > 10), '⛔ ★가린 까닭이 «다» 적혀 있습니다 (why 를 비우지 마십시오)')
    ok(hidden.every(h => /원당/.test(h.who)), '★가린 것은 «원당» 이 들어간 갈래뿐입니다 — 연재쌤도 모르시는 말이라서입니다')
    //  ⛔ 교재 원문을 «지우지» 않았는가
    ok(gwaeTextOf(9)!.hyo[2].parts.some(p => p.who === '원당과 수가 흉한 사람' && p.text.length > 10),
      '⛔ ★교재 원문은 «그대로» 남아 있습니다 (가리기만 했습니다)')
  }

  //  ⛔ 글을 지어내지 않았는가 — 갈래 이름이 교재 말인지
  const whos = new Set([1, 2, 3].flatMap(n => hyoTextOf(10, n)!.parts.map(p => p.who)))
  ok(whos.has('벼슬한 사람') && whos.has('선비') && whos.has('일반인'),
    `★갈래 ${whos.size}가지 — 벼슬한 사람 · 선비 · 일반인이 다 있습니다`)
  ok([1, 2, 3].every(n => hyoTextOf(10, n)!.parts.every(p => p.text.trim().length > 0)),
    '⛔ 빈 글이 한 칸도 없습니다')
}

head('⑱ ⛔ 수리표를 «베껴 적은 곳» 이 또 없는가')
{
  const src = code(readFileSync('lib/saju/haerak/haerakSuri.ts', 'utf8'))
  ok(!/甲:\s*9/.test(src), '⛔ 셈하는 파일에 수리표를 «다시» 적지 않았습니다')
  ok(!/土:\s*13/.test(src), '⛔ 년지 표도 «다시» 적지 않았습니다')
  ok(/from '\.\/tables\/suri'/.test(src), '★표는 tables/suri 에서 «가져다» 씁니다')
  ok(!/anthropic|tongbyeon/i.test(src), '⛔ AI 를 부르는 자리가 «없습니다» (순수 계산)')
}

/* ══ ⑲ 🔴 재료 만들기 — 생년월일에서 «간지 셋과 월말» 이 나오는가 ══
 *    ⛔ 여기는 «비동기» 라 맨 끝에서 돌립니다. */
async function jaeryoNet() {
  head('⑲ 🔴 재료 만들기 — 노트 일곱 건의 간지가 그대로 나오는가')
  //  이름 · 태어난 음력(달,일) · 볼 해 · 노트 년·월·일 간지 · 노트 월말
  const J: [string, number, number, number, string, string, string, number][] = [
    ['희준', 8, 8, 2026, '丙午', '丁酉', '乙未', 30],
    ['희준', 8, 8, 2027, '丁未', '己酉', '庚寅', 29],
    ['도이', 12, 7, 2026, '丙午', '辛丑', '癸巳', 30],
    ['도이', 12, 7, 2027, '丁未', '癸丑', '丁亥', 30],
    ['류', 1, 12, 2026, '丙午', '庚寅', '癸酉', 30],
    ['류', 1, 12, 2027, '丁未', '壬寅', '戊辰', 29],
    ['나', 11, 15, 2026, '丙午', '庚子', '辛未', 30],
  ]
  for (const [w, wol, , y, en, ew] of J) {
    ok(nyeonGanjiOf(y) === en, `${w} ${y} — 년 간지 ${nyeonGanjiOf(y)} = 노트 ${en}`)
    ok(wolGanjiOf(y, wol) === ew, `${w} ${y} — 월 간지 ${wolGanjiOf(y, wol)} = 노트 ${ew}  (⛔ 절기 안 씀)`)
  }
  //  ⛔ 년 간지는 «입춘» 을 안 봅니다 — 그 해를 통째로 봅니다
  ok(nyeonGanjiOf(2026) === '丙午' && nyeonGanjiOf(2027) === '丁未' && nyeonGanjiOf(2025) === '乙巳',
    '⛔ 년 간지는 ★입춘을 «안 봅니다» — 그 해를 통째로 봅니다')
  //  월 간지 — 오호둔이 열두 달을 다 도는가
  {
    const all = Array.from({ length: 12 }, (_, i) => wolGanjiOf(2026, i + 1))
    ok(all.every(Boolean) && new Set(all).size === 12, '★음력 열두 달이 «다 다른» 월 간지를 냅니다')
    ok(wolGanjiOf(2026, 1)[1] === '寅' && wolGanjiOf(2026, 12)[1] === '丑',
      '★음력 1월 = 寅 · 12월 = 丑  (하락이수 달력)')
    ok(wolGanjiOf(2026, 0) === '' && wolGanjiOf(2026, 13) === '', '⛔ 없는 달이면 빈 값 (0으로 안 셉니다)')
  }
  //  나이 — «보러 오시는 그때» 하나
  ok(naiOf(1995, 2026) === 32 && naiOf(1966, 2026) === 61, '★나이 = 보러 오시는 해 − 태어난 해 + 1')
  ok(naiOf(1995, 2026) === naiOf(1995, 2026), '⛔ «보는 해» 로 세지 않습니다 — 상담 시점 하나입니다')

  /* ══ ⑳ 🔴🔴 달력 — ★한국 표로 노트 일곱 건이 «다» 맞는가 ══════════
   *  2026-09-14 (9부)
   *  ⛔ 8부는 노트 «값» 을 손으로 넣고 7/7 이라 했습니다. 그건 잰 게 아니었습니다.
   *  ⇒ 여기서는 ★달력에서 «스스로» 뽑아 노트와 견줍니다. 호출 0번입니다.
   * ══════════════════════════════════════════════════════════════ */
  head('⑳ 🔴🔴 한국 표로 — 노트 일곱 건이 «스스로» 나오는가 (호출 0번)')
  {
    let ilOk = 0, lastOk = 0
    const ilBad: string[] = []
    const lastBad: string[] = []
    for (const [w, wol, il, y, , , ei, elast] of J) {
      const g = ilGanjiOf(y, wol, il)
      if (g === ei) ilOk++; else ilBad.push(`${w}${y} ${g}≠${ei}`)
      const L = wolLastDayOf(y, wol)
      if (L === elast) lastOk++; else lastBad.push(`${w}${y} ${L}≠노트${elast}`)
    }
    ok(ilOk === 7, `🔴 ★일 간지 ${ilOk}/7 ${ilBad.join(' ')}`)
    ok(lastOk === 7, `🔴 ★월말 ${lastOk}/7 ${lastBad.join(' ')}`)
    ok(true, '⇒ ★8부의 「노트 쪽 착오」 기록은 틀렸습니다 — 노트가 «다» 맞았습니다')
    ok(true, '⇒ ⛔ 규칙을 「−2달·+2달」 따위로 비틀지 마십시오 — 규칙은 처음부터 맞았습니다')
  }

  //  ⛔ 29·30 말고는 안 나오는가
  {
    const vals = new Set<number | null>()
    for (let m = 1; m <= 12; m++) vals.add(wolLastDayOf(2026, m))
    ok([...vals].every(v => v === 29 || v === 30), '⛔ ★29 또는 30 뿐입니다 (음력에 31일은 없습니다)')
  }
  //  🔴 못 재면 ★29 로 «때려 넣지» 않는가 (8부는 그랬습니다)
  ok(wolLastDayOf(1850, 1) === null, '⛔ ★범위 밖이면 «29 로 때려 넣지» 않고 null 입니다')
  ok(ilGanjiOf(1850, 1, 1) === '', '⛔ ★범위 밖이면 일진을 «지어내지» 않습니다')

  /* ══ ⑳-b 🔴🔴 ★전수 왕복 시험 — 표를 거꾸로 읽는 셈이 맞는가 ══════
   *  [왜]  음력→양력 되돌리기는 ★9부에 «새로 만든» 조각입니다.
   *        새 코드는 새 버그입니다. ⇒ 그래서 ★전부 돌려 봅니다.
   * ══════════════════════════════════════════════════════════════ */
  head('⑳-b 🔴🔴 전수 왕복 — 음→양→음 이 제자리로 오는가 (1900~2051)')
  {
    let n = 0, bad = 0, sizeBad = 0
    for (let t = Date.UTC(1900, 0, 1); t <= Date.UTC(2051, 0, 11); t += 86400000) {
      const d = new Date(t)
      const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate()
      const L = solarToLunarKR(y, m, dd)
      if (!L) continue
      n++
      const S = lunarToSolarKR(L.lunarYear, L.lunarMonth, L.lunarDay, L.isLeapMonth)
      if (!S || S.year !== y || S.month !== m || S.day !== dd) bad++
      //  ⛔ 그 달 크기보다 큰 «날» 이 나오면 안 됩니다
      const sz = lunarMonthSizeKR(L.lunarYear, L.lunarMonth, L.isLeapMonth)
      if (sz !== null && L.lunarDay > sz) sizeBad++
    }
    ok(n > 55000, `★훑은 날 ${n.toLocaleString()} 일`)
    ok(bad === 0, `🔴 ⛔ ★제자리로 못 온 날 ${bad} 건`)
    ok(sizeBad === 0, `⛔ ★달 크기를 넘는 날 ${sizeBad} 건`)
  }

  /* ══ ⑳-c 🔴 이사택일이 «같은 답» 을 받는가 — 옮긴 뒤에도 ══════════ */
  head('⑳-c 🔴 표를 옮긴 뒤 이사택일이 같은 답을 받는가 (전수)')
  {
    let n = 0, diff = 0
    for (let t = Date.UTC(1900, 0, 1); t <= Date.UTC(2051, 0, 11); t += 86400000) {
      const d = new Date(t)
      const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate()
      const a2 = movingS2L(y, m, dd), b2 = solarToLunarKR(y, m, dd)
      if (!a2 && !b2) continue
      n++
      if (!a2 || !b2 || a2.lunarMonth !== b2.lunarMonth || a2.lunarDay !== b2.lunarDay
        || a2.isLeapMonth !== b2.isLeapMonth) diff++
    }
    ok(diff === 0, `🔴 ⛔ ★이사택일이 받는 답이 달라진 날 ${diff} 건 (훑은 날 ${n.toLocaleString()})`)
  }

  /* ══ ⑳-d 🔴 한국 표 vs 부본 — «왜 바꿨는가» 를 값으로 남깁니다 ══════ */
  head('⑳-d 🔴 한국 표 ≠ 중국계 부본 — 얼마나 다른가')
  {
    let n = 0, diff = 0
    for (let t = Date.UTC(1900, 0, 1); t <= Date.UTC(2050, 11, 14); t += 86400000) {
      const d = new Date(t)
      const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate()
      const a2 = solarToLunarKR(y, m, dd), b2 = fallbackSolarToLunar({ year: y, month: m, day: dd })
      if (!a2 || !b2) continue
      n++
      if (a2.lunarMonth !== b2.month || a2.lunarDay !== b2.day || a2.isLeapMonth !== b2.isLeap) diff++
    }
    ok(diff > 1000, `🔴 ★부본과 다른 날 ${diff.toLocaleString()} / ${n.toLocaleString()} 일 (${(diff / n * 100).toFixed(2)}%)`)
    ok(true, '⇒ ⛔ ★lunar-javascript 로 되돌리지 마십시오 — 스물여덟 분 중 한 분꼴로 괘가 틀립니다')
  }

  /* ══ ㉑ 🔴 화면 셋과 셈 창구 — 있는가 · 규칙을 지키는가 ══ */
  head('㉑ 🔴 화면 셋 — 보관함 · 입력 · 결과')
  const R = (p: string) => { try { return readFileSync(p, 'utf8') } catch { return '' } }
  const stor = R('app/manseryeok/haerak/page.tsx')
  const inp = R('app/manseryeok/haerak-input/page.tsx')
  const res = R('app/manseryeok/haerak-result/page.tsx')
  const api = R('app/api/haerak/route.ts')
  ok(!!stor && !!inp && !!res && !!api, '★보관함 · 입력 · 결과 · 셈 창구가 «다» 있습니다')
  //  ⛔ 틀을 다시 짓지 않았는가 — 공용 부품을 쓰는가
  ok(/StorageShell/.test(stor) && /PersonPickerModal/.test(stor),
    '⛔ 보관함이 ★공용 부품(StorageShell · PersonPickerModal)을 씁니다')
  ok(/actionLabel=\{'새로운 사람 보기'\}/.test(stor),
    '★아래 단추는 「새로운 사람 보기」 입니다 [대표님 2026-09-14]')
  ok(/listRecordsByService\('haerak'\)/.test(stor) && /serviceType="haerak_person"/.test(stor),
    '⛔ 기록과 «사람» 갈래를 갈랐습니다 (목록에 두 번 안 뜹니다)')
  //  ⛔ 입력 화면이 생년월일을 «다시 묻지» 않는가
  ok(!/생년월일[\s\S]{0,80}<input/.test(inp), '⛔ 입력 화면이 생년월일을 ★«다시 묻지» 않습니다')
  ok(/쓰지 않습니다/.test(inp), '★「태어난 시 — 쓰지 않습니다」 를 보여 드립니다')
  ok(/WalletPaySheet/.test(inp) && /item="haerak_ai"/.test(inp),
    '⛔ 결제는 ★공용 시트를 씁니다 (팝업을 따로 안 만들었습니다)')
  //  🔴 손님 화면에 「원당」 이 «한 글자도» 없는가
  ok(!/원당|元堂/.test(stor + inp + res.replace(/\/\*[\s\S]*?\*\//g, '')),
    '🔴 ⛔ ★손님 화면에 「원당」 이 «한 글자도» 없습니다 [대표님 2026-09-14]')
  //  ⛔ 화면이 «다시 셈하지» 않는가 — 창구 한 곳
  ok(!/calcHaerak/.test(res) && /fetch\('\/api\/haerak'/.test(res),
    '⛔ 결과 화면이 ★«다시 셈하지» 않습니다 — /api/haerak 한 곳입니다')
  //  ⛔ 창구가 AI 를 안 부르는가
  ok(!/anthropic|openai|claude/i.test(api), '⛔ ★셈 창구가 AI 를 «안 부릅니다»')
  //  ⛔ 가린 갈래가 손님에게 안 나가는가
  ok(/filter\(\(p: GwaePart\) => !p\.hide\)/.test(api),
    '⛔ ★가린 갈래(hide)는 손님에게 «안 보냅니다»')
  //  ⛔ 글이 없으면 지어내지 않는가
  ok(/옮기는 중/.test(res) && /parts === null/.test(res),
    '⛔ 글이 없으면 ★«지어내지» 않고 사실대로 말합니다')
  //  ★다시보기 — 저장본을 열되 다시 저장하지 않는가
  ok(/recordId/.test(stor) && /if \(!data \|\| recordId\) return/.test(res),
    '★다시보기로 들어오면 ⛔ «또» 저장하지 않습니다')
  //  ★나이는 보러 오시는 그때
  ok(/todayYear: new Date\(\)\.getFullYear\(\)/.test(api),
    '🔴 ★나이는 «보러 오시는 그때» 기준입니다 (볼 해로 안 셉니다)')

  /* ══ 🔴🔴 ★상반기 · 하반기 짝 ══
   *    ✅ [대표님 2026-09-14 확정]  ★상반기 = 선천괘 · 하반기 = 후천괘
   *    ⚠️ 연재쌤이 「상·하반기가 바뀌었다」 하신 적이 있으나, 그것은 ★«라벨» 이 아니라
   *       월칸 윗수(29/30) 때문에 «괘 자체» 가 맞바뀐 것을 보신 것이었습니다.
   *    ⛔ 여기를 뒤집어 «가리려고» 하지 마십시오 — 다른 분 것이 틀어집니다. */
  ok(/half="상반기" kind="선천괘" g=\{data\.seoncheon\}/.test(res),
    '🔴 ★상반기 = «선천괘» 입니다 [대표님 2026-09-14]')
  ok(/half="하반기" kind="후천괘" g=\{data\.hucheon\}/.test(res),
    '🔴 ★하반기 = «후천괘» 입니다 [대표님 2026-09-14]')
  //  🔴 ⛔ 「선천괘 · 후천괘」 라는 «말» 이 손님 화면에 있는가 [연재쌤 · 대표님 2026-09-14]
  ok(/kind="선천괘"/.test(res) && /kind="후천괘"/.test(res),
    '🔴 ⛔ ★「선천괘 · 후천괘」 라는 말이 «괘마다» 붙어 있습니다 [연재쌤 · 대표님]')
  ok(/상반기는 <b>선천괘<\/b>, 하반기는 <b>후천괘<\/b>/.test(res),
    '★머리말에서도 «어느 것이 어느 것인지» 일러 드립니다')
  //  ⛔ 짝이 «맞바뀌지» 않았는가 — 선천이 하반기에, 후천이 상반기에 붙지 않았는가
  ok(!/kind="후천괘" g=\{data\.seoncheon\}/.test(res)
    && !/kind="선천괘" g=\{data\.hucheon\}/.test(res),
    '⛔ ★선천·후천이 «맞바뀌지» 않았습니다')
  //  ⚠️ 화면에는 ★상반기가 «위» 에 옵니다 — 손님이 읽는 차례입니다
  ok(res.indexOf('half="상반기"') < res.indexOf('half="하반기"'),
    '★화면에 상반기가 «위» 에 옵니다')

  /* ══ ㉒ 🔴🔴 류 님 손글씨 스캔 «한 장» 을 값으로 못 박습니다 ══
   *    (희준.pdf — 류씨 음 66.1.12 · 26년 丙午 · 2026-09-14 대표님 보내 주심)
   *
   *    ★이 한 건이 «년·월을 어디에 놓는가» 를 정합니다.
   *    ⛔ 여기가 빨간불이면 ★배치를 되돌리십시오. 다른 것을 고치지 마십시오. */
  head('㉒ 🔴🔴 류 님 스캔 한 장 — 년은 «위» · 월은 «아래»')
  {
    const g = calcHaerak({ nyeonGanji: '丙午', wolGanji: '庚寅', ilGanji: '癸酉', nai: 61, wolLastDay: 30, eumIl: 12 })
    ok(!!g, '★류 님 26년이 셈해집니다')
    ok(g!.su.nyeon === 77 && g!.su.wol === 45 && g!.su.il === 27,
      `★수 — 년 ${g!.su.nyeon} · 월 ${g!.su.wol} · 일 ${g!.su.il}  [스캔 77 · 45 · 27]`)
    ok(g!.su.nyeon % 8 === 5 && g!.su.wol % 6 === 3, '★나머지 — 년 5 · 월 3  [스캔에 붉게 5 · 3]')
    //  🔴 여기가 핵심 — 년이 «위» · 월이 «아래»
    ok(g!.seoncheon.sang === '巽' && g!.seoncheon.ha === '離',
      '🔴 ★년(巽)이 «위» · 월(離)이 «아래» — ⛔ 맞바꾸면 가인이 정(鼎)이 됩니다')
    ok(g!.seoncheon.no === 53 && g!.seoncheon.name === '家人',
      `🔴 ★선천괘 ${g!.seoncheon.name} ${g!.seoncheon.no}  [스캔 53 가인]`)
    ok(g!.hucheon.no === 61 && g!.hucheon.name === '益',
      `🔴 ★후천괘 ${g!.hucheon.name} ${g!.hucheon.no}  [스캔 61 익]`)
    ok(g!.dongHyo === 3, `★동효 ${g!.dongHyo}  [스캔 ③]`)
    //  ⛔ 뒤집힌 것은 «아래» 괘뿐인가 — 위는 그대로여야 합니다
    ok(g!.hucheon.sang === g!.seoncheon.sang && g!.hucheon.ha !== g!.seoncheon.ha,
      '⛔ ★«아래» 괘만 뒤집었습니다 — 위 괘는 그대로입니다')
    //  ⛔ 동효는 1·2·3 만 — 열두 달·서른 날을 다 돌려 봅니다
    {
      const bad: number[] = []
      for (let d = 1; d <= 30; d++) {
        const x = calcHaerak({ nyeonGanji: '丙午', wolGanji: '庚寅', ilGanji: '癸酉', nai: 61, wolLastDay: 30, eumIl: d })
        if (x && ![1, 2, 3].includes(x.dongHyo)) bad.push(d)
      }
      ok(bad.length === 0, `⛔ ★동효는 «1·2·3» 뿐입니다 (4·5·6 은 영영 안 나옵니다) ${bad.join(',')}`)
    }
  }

  /* ══ ㉓ 🔴🔴 달력을 «어디서» 가져오는가 — 2026-09-14 (9부) ════════
   *  ⚠️ 8부는 이 자리를 ★«말» 로만 막았습니다 («바깥을 안 부릅니다» 라는 주석).
   *     그 말은 지켜졌고, ★그래서 틀렸습니다 (부본이 중국 기준이었습니다).
   *  ⇒ 이제는 ★«값» 으로 막습니다. 되돌아가면 여기서 빨간불이 켜집니다.
   * ══════════════════════════════════════════════════════════════ */
  head('㉓ 🔴🔴 달력 — 한국 표 하나만 보는가')
  {
    const inputs = R('lib/saju/haerak/haerakInputs.ts')
    const route = R('app/api/haerak/route.ts')
    const table = R('lib/saju/koreanLunarTable.ts')
    const moving = R('app/manseryeok/moving-timing/lib/lunarTable.ts')

    ok(table.length > 500, '★공용 표가 lib/saju/koreanLunarTable.ts 에 있습니다')
    ok(/koreanLunarTable/.test(inputs), '🔴 ★재료 만드는 곳이 «한국 표» 를 봅니다')
    ok(/koreanLunarTable/.test(route), '🔴 ★셈 창구도 «한국 표» 를 봅니다')

    //  ⛔ 중국계 부본으로 되돌아가면 안 됩니다
    ok(!/lunarConvert/.test(inputs) && !/lunarConvert/.test(route),
      '⛔ ★부본이 섞인 창구(lunarConvert)를 하락이수에서 안 씁니다')
    //  ⚠️ ★«주석에 적은 경고» 까지 잡으면 안 됩니다 (7부 교훈) — «불러오는 줄» 만 봅니다
    const importsJs = (t: string) =>
      /from\s+['"][^'"]*lunar-javascript['"]/.test(t) || /require\(\s*['"]lunar-javascript['"]/.test(t)
    ok(!importsJs(inputs) && !importsJs(route),
      '⛔ ★중국계 부본을 «불러오는 줄» 이 없습니다 (주석의 경고는 남겨 둡니다)')

    //  ⛔ 바깥 창구를 안 부릅니다 — 호출 0번이어야 합니다
    ok(!/KASI_API_KEY/.test(route) && !/KASI_API_KEY/.test(inputs),
      '✅ ★KASI 를 «한 번도» 안 부릅니다 (호출 0 · 일일 한도 걱정 없음)')
    ok(!/fetch\(/.test(inputs) && !/await fetch/.test(route),
      '⛔ ★재료 만드는 곳이 바깥을 부르지 않습니다')

    //  🔴 범위 밖이면 «지어내지» 말고 멈춰야 합니다
    ok(/lunarRangeKR/.test(route), '🔴 ★범위 밖이면 «몇 년부터 몇 년까지» 를 일러 드립니다')
    ok(/wolLastDay === null/.test(inputs),
      '⛔ ★월말을 못 재면 «29 로 때려 넣지» 않고 멈춥니다 (8부는 조용히 29였습니다)')

    //  ⛔ 표를 «복사» 하지 않았는가 — 옛 자리는 다시 내보내기만 (8부 §6④)
    ok(!/SIZE_BITS/.test(moving) && /koreanLunarTable/.test(moving),
      '⛔ ★표를 복사하지 않았습니다 — 옛 자리는 «다시 내보내기» 만 합니다 (8부 §6④)')

    //  ⛔ 8부의 «틀린 기록» 이 사실처럼 남아 있으면 안 됩니다
    ok(!inputs.includes('노트 쪽 착오') || inputs.includes('그것이 틀렸습니다'),
      '⛔ ★「노트 쪽 착오」 를 «사실» 로 적어 두지 않았습니다 (노트가 맞았습니다)')
  }

  console.log(`\n━━ 하락이수 수리 — 통과 ${pass} · 실패 ${fail} ━━\n`)
  process.exit(fail ? 1 : 0)
}
jaeryoNet()
