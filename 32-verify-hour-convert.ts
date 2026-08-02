// 32-verify-hour-convert.ts  (★이름은 시지 치환에서 시작했으나, 지금은 오행 점수·용신 전반을 봅니다)
//
// ┌───────────────────────────────────────────────────────────────┐
// │  시지 계절 치환 그물 — 교재 38쪽대로 도는가                      │
// └───────────────────────────────────────────────────────────────┘
//
//  ★2026-08-02 연재쌤 지시로 시지 치환을 «넣었습니다».
//    이 그물은 그것이 «조용히 되돌려지는 것» 을 막습니다.
//
//  ⚠️ 2026-07 에는 「넣지 않는다」가 확정이었습니다. 그 주석을 보고
//     되돌리려는 다음 세션이 반드시 옵니다. 여기서 막힙니다.

import { readFileSync, readdirSync } from 'fs'
import {
  calcSimsanOhaeng, hourConvertEl, hourConvertNote, hourNoConvertNote,
  type Ohaeng, type Pillar,
} from './lib/saju/simsanOhaeng'
// ★두 계산기가 «같은 점수» 를 내는지 맞대어 봅니다 (2026-08-02 결함)
import { calcCareerScore } from './lib/saju/career/careerScore'
import { judgeSinsal, checkSinsal9 } from './lib/saju/career/sinsal9'
import { calcCareerYongsin, judgeYongsin } from './lib/saju/career/yongsin'
import { judgeStrength, calcYongsinNew, isYanginIlju } from './lib/saju/yongsinNew'

/** 일간 오행의 비겁·인성 — ★판정을 다시 짜지 않고 «신강약만» 견주려고 둡니다 */
function relOfDay(dayStem: string): { bigeop: Ohaeng; insung: Ohaeng } {
  const EL: Record<string, Ohaeng> = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' }
  const GEN: Record<Ohaeng, Ohaeng> = { 수: '목', 목: '화', 화: '토', 토: '금', 금: '수' }
  const de = EL[dayStem]
  const insung = (Object.keys(GEN) as Ohaeng[]).find(k => GEN[k] === de)!
  return { bigeop: de, insung }
}


let pass = 0, fail = 0
const check = (ok: boolean, msg: string) => {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) } else { fail++; console.log(`  🔴 ${msg}`) }
}
const read = (p: string) => readFileSync(p, 'utf8')
const JI = '子丑寅卯辰巳午未申酉戌亥'.split('')
const EL5: Ohaeng[] = ['목', '화', '토', '금', '수']

console.log('\n━━ ㉒-a ★교재 38쪽 — 열한 칸이 «전부» 도는가 ━━')
{
  // 교재 38쪽 시지 안내 (월지가 맞을 때만)
  const WANT: [string, string, Ohaeng][] = [
    ['寅', '丑', '수'], ['寅', '寅', '수'],
    ['丑', '丑', '수'], ['丑', '寅', '수'],
    ['卯', '辰', '목'], ['辰', '辰', '목'],
    ['未', '未', '화'],
    ['申', '未', '화'], ['申', '申', '화'],
    ['酉', '戌', '금'], ['戌', '戌', '금'],
  ]
  for (const [m, h, el] of WANT) {
    check(hourConvertEl(m, h) === el, `${m}월 ${h}시 → ${el}`)
  }
  // ★열한 칸 «뿐» 인가 — 더 생기면 교재 밖입니다
  let n = 0
  for (const m of JI) for (const h of JI) if (hourConvertEl(m, h)) n++
  check(n === 11, `치환되는 칸이 «열한 개» 뿐입니다 (${n})`)
}

console.log('\n━━ ㉒-b ⚠️ 공란 월지는 «있는 오행 그대로» 인가 ━━')
{
  // ★대표님 확인 2026-08-02 — "공란은 있는 오행 그대로 보면 된다"
  for (const m of ['子', '巳', '午', '亥']) {
    const any = JI.some(h => hourConvertEl(m, h) !== null)
    check(!any, `${m}월 — 치환이 «하나도» 없습니다`)
  }
  // ⚠️ 卯시·酉시는 본래 오행이 이미 그것이라 «치환이 아닙니다»
  check(hourConvertEl('卯', '卯') === null, `⚠️ 卯월 卯시 — 본래 木이라 치환 아님`)
  check(hourConvertEl('酉', '酉') === null, `⚠️ 酉월 酉시 — 본래 金이라 치환 아님`)
}

console.log('\n━━ ㉒-c ★쓰임에 따라 갈리는가 (진로 ↔ 건강궁합) ━━')
{
  //   진로·적성·성격 → 치환 «적용»  ·  건강·궁합 → «그대로»  (2026-08-02 대표님 지시)
  const pill = ['년주', '월주', '일주', '시주'].map((p, i) => ({
    pillar: p, stem: '甲', branch: ['子', '辰', '子', '辰'][i],
  })) as Pillar[]
  const career = calcSimsanOhaeng(pill, 4, 20, '辰', { purpose: '진로' })
  const health = calcSimsanOhaeng(pill, 4, 20, '辰', { purpose: '건강궁합' })
  check(career['목'] > health['목'], `★진로에서 辰시가 木으로 갑니다 (${health['목']} → ${career['목']})`)
  check(health['토'] > career['토'], `★건강궁합에서는 辰시가 土 그대로입니다`)

  // ⚠️ 옛 이름(forCouple)도 그대로 들어야 합니다 — 부르는 곳이 여럿입니다
  const old = calcSimsanOhaeng(pill, 4, 20, '辰', { forCouple: true })
  check(EL5.every(e => old[e] === health[e]), `⚠️ 옛 이름 forCouple:true 가 «건강궁합» 과 같습니다`)

  // ★기본값은 «진로» — 지금까지 부르던 곳이 대부분 그쪽입니다
  const dflt = calcSimsanOhaeng(pill, 4, 20, '辰')
  check(EL5.every(e => dflt[e] === career[e]), `★아무것도 안 주면 «진로» 입니다`)
}

console.log('\n━━ ㉒-d ★치환이 걸리면 «반드시 한 줄» 이 나오는가 ━━')
{
  //   ⚠️ 대표님 지시 — "이런 경우에는 반드시 한 줄의 해설을 덧붙여 줄 것"
  let missing = 0, spurious = 0
  for (const m of JI) for (const h of JI) {
    const to = hourConvertEl(m, h)
    const note = hourConvertNote(m, h)
    if (to && !note) missing++
    if (!to && note) spurious++
  }
  check(missing === 0, `★치환된 열한 칸 «전부» 한 줄이 나옵니다`)
  check(spurious === 0, `⚠️ 치환 안 된 칸에서는 «말하지 않습니다» (없는 차이를 걱정시키지 않음)`)

  // 건강·궁합 쪽 안내도 같은 자리에서만
  let hMiss = 0
  for (const m of JI) for (const h of JI) {
    if (hourConvertEl(m, h) && !hourNoConvertNote(m, h)) hMiss++
  }
  check(hMiss === 0, `★건강·궁합 쪽도 «왜 숫자가 다른지» 알려 줍니다`)

  // ★2026-08-02 — 문구를 careerScore 말투로 통일했습니다 («◯월의 기운으로»).
  //   ⚠️ 옛 문구는 「봄 기운으로」였습니다. 이 검사가 그것을 지키고 있어
  //      «검사를 뒤집었습니다». 계절 대신 «월지» 를 밝히는 쪽이 더 정확합니다.
  const s = hourConvertNote('辰', '辰') ?? ''
  check(s.includes('辰') && s.includes('월의 기운') && s.includes('목'),
    `한 줄에 «시지·월지·오행» 이 다 들어 있습니다 — ${s}`)
  check(s.startsWith('태어난 시'), `★손님 말로 시작합니다 (「시지」가 아니라 「태어난 시」)`)
}

console.log('\n━━ ㉒-e ⚠️ 합이 언제나 100인가 ━━')
{
  let bad = 0
  for (const m of JI) for (const h of JI) {
    const pill = ['년주', '월주', '일주', '시주'].map((p, i) => ({
      pillar: p, stem: '甲', branch: ['子', m, '子', h][i],
    })) as Pillar[]
    for (const purpose of ['진로', '건강궁합'] as const) {
      const sc = calcSimsanOhaeng(pill, 4, 20, h, { purpose })
      if (EL5.reduce((a, e) => a + sc[e], 0) !== 100) bad++
    }
  }
  check(bad === 0, `144칸 × 두 쓰임 — 합이 «언제나» 100입니다`)
}

console.log('\n━━ ㉒-g 🔴 시지 10점이 «두 번» 옮겨지지 않는가 ━━')
{
  // 🔴 2026-08-02 — 제가 만든 결함입니다.
  //   simsanOhaeng 에 치환을 넣었는데 careerScore 가 «자기 치환» 을 갖고 있어
  //   같은 10점이 두 번 옮겨졌습니다. 없던 「과다」와 「결핍」이 손님께 나갔습니다.
  //   ★이 그물이 그것이 되살아나는 것을 막습니다.
  const JI2 = JI
  let diff = 0, worst = ''
  for (const m of JI2) for (const h of JI2) {
    const pill = ['년주', '월주', '일주', '시주'].map((p, i) => ({
      pillar: p, stem: ['戊', '丙', '乙', '庚'][i], branch: ['子', m, '巳', h][i],
    })) as Pillar[]
    const a = calcSimsanOhaeng(pill, 4, 20, h, { purpose: '진로' })
    const r = calcCareerScore(pill, 4, 20, h)
    if (!EL5.every(e => a[e] === r.score[e])) { diff++; if (!worst) worst = `${m}월 ${h}시` }
  }
  check(diff === 0,
    `★144칸 전수 — 오각형(simsanOhaeng)과 육친(careerScore) 점수가 «같습니다»${worst ? ` — 어긋남 ${worst}` : ''}`)

  // ★실기에서 잡힌 그 사주로 못 박습니다 (戊辰 丙辰 乙巳 庚辰)
  const real4 = ['년주', '월주', '일주', '시주'].map((p, i) => ({
    pillar: p, stem: ['戊', '丙', '乙', '庚'][i], branch: ['辰', '辰', '巳', '辰'][i],
  })) as Pillar[]
  const rr = calcCareerScore(real4, 4, 20, '辰')
  check(rr.score['목'] === 55, `★실기 표본 — 목 55점 (65점이면 두 번 옮겨진 것) — ${rr.score['목']}`)
  check(rr.score['토'] === 10, `★실기 표본 — 토 10점 (0점이면 두 번 옮겨진 것) — ${rr.score['토']}`)
  check(EL5.reduce((a, e) => a + rr.score[e], 0) === 100, `합이 100입니다`)
  check(rr.hourConverted === true, `시지 치환이 걸렸다고 «알립니다»`)

  // ⚠️ careerScore 가 점수를 «다시 옮기지» 않는가 — 코드로도 봅니다
  const cs = read('lib/saju/career/careerScore.ts')
  check(!/score\[from\] = \(score\[from\] \?\? 0\) - HOUR_BRANCH_POINT/.test(cs),
    `★careerScore 가 점수를 «다시 옮기지» 않습니다`)
  check(/purpose: '진로'/.test(cs), `★simsanOhaeng 을 «진로» 쓰임으로 부릅니다`)
  check(/hourConvertEl\(monthBranch, p\.branch\)/.test(cs),
    `★글자 세기도 «같은 창구»(hourConvertEl)를 씁니다`)
}

console.log('\n━━ ㉒-i ★안내 줄이 «겹치지» 않는가 ━━')
{
  // 🔴 2026-08-02 실기 — 같은 말이 «두 줄» 떴습니다.
  //   제가 hourConvertNote 를 넣을 때 careerScore 가 이미 hourNote 를
  //   내고 있는 줄 몰랐습니다. ★말은 «한 곳» 이 내야 합니다. (교훈 CJ)
  const pill = ['년주', '월주', '일주', '시주'].map((p, i) => ({
    pillar: p, stem: ['戊', '丙', '乙', '庚'][i], branch: ['辰', '辰', '巳', '辰'][i],
  })) as Pillar[]
  const r = calcCareerScore(pill, 4, 20, '辰')
  check(r.hourNote === hourConvertNote('辰', '辰'),
    `★careerScore 의 말이 hourConvertNote 와 «같은 문장» 입니다`)

  const g = read('lib/saju/career/ohaengGijil.ts')
  check(!/if \(r\.hourNote\) lines\.push\(r\.hourNote\)/.test(g),
    `★같은 말을 «두 번» 밀어 넣지 않습니다`)
  // ⚠️ 차례 — 월지(35점)가 시지(10점)보다 무겁습니다
  const mi = g.indexOf('if (monthNote) lines.push(monthNote)')
  const hi = g.indexOf('if (hourConvNote) lines.push(hourConvNote)')
  check(mi > 0 && hi > mi, `★월지 안내가 «먼저» 나옵니다 (35점 > 10점)`)

  // ⚠️ careerScore 가 문구를 «따로 짓지» 않는가
  const cs = read('lib/saju/career/careerScore.ts')
  check(!/hourNote = `시지/.test(cs), `★careerScore 가 문구를 «따로 짓지» 않습니다`)
  check(/hourNote = hourConvertNote\(monthBranch, hb\)/.test(cs),
    `★같은 창구에서 받아 옵니다`)
}

console.log('\n━━ ㉒-h ★십성 표 — «왜 다른지» 알려 주는가 ━━')
{
  //  ⚠️ 오각형은 «점수 + 계절 치환», 십성 표는 «글자 개수» 입니다.
  //     한 화면에 나란히 있어 손님이 갸웃하십니다. 까닭을 말해 드려야 합니다.
  const t = read('app/manseryeok/result-new/SipsungTable.tsx')
  check(/십성은 글자를 있는 그대로 셉니다/.test(t), `★십성 표에 까닭 한 줄이 있습니다`)
  check(/계절 치환이 들어가/.test(t), `★오행 비율과 다른 «까닭» 을 말합니다`)
  // ★셈은 «고치지» 않았는가 — 십성은 글자 그대로여야 합니다
  const d = read('lib/saju/sipsungDist.ts')
  check(!/hourConvert|convertHourBranch|purpose/.test(d),
    `⚠️ 십성 셈에 «치환이 들어가지» 않았습니다 (글자 그대로여야 합니다)`)
  // ⚠️ 이 표는 공용 부품입니다 — 두 화면이 나눠 씁니다
  check(/SipsungTable/.test(read('app/manseryeok/components/SajuTableSlot.tsx')),
    `⚠️ 공용 부품이라 한 곳만 고치면 두 화면에 다 붙습니다`)
}

console.log('\n━━ ㉓ ★괴백양은 «기둥» 으로 센다 (2026-08-02 대표님 확정) ━━')
{
  //  🔴 [무엇이 있었나]  살마다 센 수를 «합쳤습니다».
  //    戊辰·壬戌은 백호 목록과 괴강 목록에 «둘 다» 있어(교재 95쪽)
  //    한 기둥이 2개로 세어졌습니다. 최대 7개까지 나왔습니다 — 기둥은 넷인데요.
  //  ★기둥으로 셉니다. 겹치는 것은 «성질» 이지 기둥이 아닙니다.
  //  ⚠️ 교재에 명시가 «없습니다». 연재쌤 답이 오면 여기를 바꾸십시오.
  const P4 = (a: string[]) => ['년주', '월주', '일주', '시주']
    .map((p, i) => ({ pillar: p, stem: a[i][0], branch: a[i][1] })) as Pillar[]

  // 戊辰(백호∩괴강) + 庚辰(괴강) → ★2기둥 (3이면 살로 센 것)
  const c1 = judgeSinsal({ saju: P4(['戊辰', '丙辰', '乙巳', '庚辰']), target: 'adult' } as never)
  check(/2기둥/.test(c1.lines[0]), `★戊辰+庚辰 = «2기둥» 입니다 — ${c1.lines[0]}`)
  check(!/3기둥/.test(c1.lines[0]), `⚠️ 戊辰을 두 번 세지 «않습니다»`)
  check(!/양인/.test(c1.lines[0]), `★양인이 0개면 이름에 «안 붙입니다»`)
  check((c1.lines[0].match(/戊辰/g) ?? []).length === 1, `★겹치는 기둥을 «한 번만» 적습니다`)

  // 양인일주(壬子)까지 걸리는 표본
  const c2 = judgeSinsal({ saju: P4(['甲辰', '丙戌', '壬子', '庚辰']), target: 'adult' } as never)
  check(/양인/.test(c2.lines[0]), `★양인일주(壬子)가 잡히면 이름에 «붙습니다»`)
  check(/4기둥/.test(c2.lines[0]), `★네 기둥 다 걸리면 4기둥 — ${c2.lines[0]}`)

  // ⚠️ 기둥은 넷뿐입니다 — «묶음(괴백양)» 에서 5기둥 이상이 나올 수 없어야 합니다
  //   ⚠️ 현침·도화·역마는 «글자» 로 세므로 8개까지 나옵니다. 그것은 「개」로 적습니다.
  //      ★제가 처음에 이 구분을 안 하고 검사를 짜서 2,074건이 걸렸습니다.
  const GAN = '甲乙丙丁戊己庚辛壬癸'.split(''), JIx = '子丑寅卯辰巳午未申酉戌亥'.split('')
  const YS = new Set(['甲', '丙', '戊', '庚', '壬']), YB = new Set(['子', '寅', '辰', '午', '申', '戌'])
  const R = (n: number) => Math.floor(Math.random() * n)
  const one = () => { for (;;) { const st = GAN[R(10)], b = JIx[R(12)]; if (YS.has(st) === YB.has(b)) return { st, b } } }
  let over = 0
  for (let i = 0; i < 30000; i++) {
    const sj = ['년주', '월주', '일주', '시주'].map(k => { const x = one(); return { pillar: k, stem: x.st, branch: x.b } }) as Pillar[]
    const c = judgeSinsal({ saju: sj, target: 'adult' } as never)
    for (const ln of c.lines) {
      const m = ln.match(/(\d+)기둥/)
      if (m && Number(m[1]) > 4) over++
    }
  }
  check(over === 0, `★임의 3만 건 — «5기둥 이상» 이 나오지 않습니다 (${over})`)

  // ⚠️ 백호 단독 셈과 괴백양 셈은 «다른 잣대» 입니다 (교재 95쪽)
  const t = read('lib/saju/career/tables/sinsal.ts')
  check(/백호살 «단독» 기준은 이것과 «다른 셈»/.test(t),
    `⚠️ 두 셈이 다르다는 것이 코드에 적혀 있습니다`)
  check(/교재에 «명시가 없습니다»/.test(t), `⚠️ 교재에 없다는 것이 적혀 있습니다`)
}

console.log('\n━━ ㉔ ★진로적성 용신 — «치환한 점수» 로 내는가 (2026-08-02) ━━')
{
  //  🔴 [무엇이 있었나]  한 화면에 「중화신강 55%」와 「극신약」이 함께 떴습니다.
  //    앞은 계절 치환한 점수(진로용), 뒤는 용신 계산기 기본값(본래 오행).
  //    ⇒ 같은 물음에 «반대 답» 이었습니다.
  //  ★계절 치환은 «쓰임» 이 가릅니다 — 진로·적성·성격은 치환합니다.
  //  ⚠️ yongsinNew 는 «안 고쳤습니다». scoreOverride 로 넣어 줍니다.
  const testSaju = ['년주', '월주', '일주', '시주'].map((p, i) => ({
    pillar: p, stem: ['戊', '丙', '乙', '庚'][i], branch: ['辰', '辰', '巳', '辰'][i],
  })) as Pillar[]
  const inp = {
    saju: testSaju, solarMonth: 4, solarDay: 20, hourBranch: '辰', target: 'adult',
  } as never

  const v = calcCareerYongsin(inp)!
  // ★실기에서 잡힌 그 사주 — 치환하면 신강 · 용신은 火
  check(v.status === '신강', `★신강으로 나옵니다 (극신약이면 치환이 안 된 것) — ${v.status}`)
  check(v.yongsin === '화', `★용신이 火 입니다 (木이면 치환이 안 된 것) — ${v.yongsin}`)

  // ★오각형(진로 점수)의 신강약과 «같은 답» 인가 — 이것이 이 그물의 알맹이
  const sc = calcSimsanOhaeng(testSaju, 4, 20, '辰', { purpose: '진로' })
  const r = relOfDay('乙')
  check(judgeStrength(sc[r.bigeop] + sc[r.insung]) === v.status,
    `★오각형과 «같은 신강약» 입니다 (두 수가 갈리면 화면이 어긋납니다)`)

  // 화면 문구 — 「겁재」가 아니라 «비겁»
  const c = judgeYongsin(inp)
  const line = c.lines.find(l => l.includes('일간 기준')) ?? ''
  check(!/겁재에 해당|비견에 해당/.test(line),
    `★「겁재」·「비견」으로 좁혀 말하지 «않습니다» — ${line}`)
  check(/(비겁|식상|재성|관성|인성)에 해당/.test(line), `★큰 묶음으로 말합니다`)

  // ⚠️ 코드로도 봅니다 — purpose 를 넘기는가
  const y = read('lib/saju/career/yongsin.ts')
  check(/purpose: '진로'/.test(y), `★진로 쓰임으로 점수를 냅니다`)
  check(/calcYongsinNew\(input\.saju as never, day\.stem, careerScore as never\)/.test(y),
    `★그 점수를 용신 계산기에 «넣어» 줍니다`)
  check(/GROUP_OF/.test(y), `★십성을 큰 묶음으로 옮기는 표가 있습니다`)

  // ⛔ yongsinNew 자체는 «안 건드렸는가»
  const yn = read('lib/saju/yongsinNew.ts')
  check(/지지 본래 오행 \(辰戌丑未 = 土, 계절치환 안 함\)/.test(yn),
    `⛔ yongsinNew 의 기본값은 «본래 오행» 그대로입니다 (손대지 않았습니다)`)

  // ⚠️ 다른 화면은 «건드리지 않았는가» — 대표님 지시 「이미 프로그램된 대로」
  check(/calcYongsinNew\(p\.saju, dayStem, ohaeng\)/.test(read('lib/saju/coupleFilterV1.ts')),
    `⚠️ 궁합은 «그대로» 입니다 (본래 오행 + 조후용신)`)
  check(/조사 — 지금 «어느 화면이 어느 잣대»/.test(y),
    `★어느 화면이 어느 잣대를 쓰는지 «기록» 이 남아 있습니다`)
  // ⚠️ 자(measure)는 검사가 아닙니다
  const pkg2 = JSON.parse(read('package.json'))
  check(!/33-measure/.test(pkg2.scripts.verify), `⚠️ measure:yongsin 은 verify 체인에 «없습니다»`)
}

console.log('\n━━ ㉕ ★궁합의 진술축미 — 조후용신으로 반영되는가 ━━')
{
  //  ★교재 — 궁합은 «오행 그대로» 점수를 내되, 계절은 «조후용신» 으로 봅니다.
  //     未월생 → 여름생 → 水 (뜨거운 기운을 식힘)
  //     丑월생 → 겨울생 → 火 (차가운 기운을 데움)
  //  ⚠️ 辰·戌은 궁합에서 어떻게 보는지 «교재에 없습니다». 지어내지 않습니다.
  const yn = read('lib/saju/yongsinNew.ts')
  check(/const WINTER = \['亥', '子', '丑'\]/.test(yn), `★丑이 «겨울» 에 들어 있습니다`)
  check(/const SUMMER = \['巳', '午', '未'\]/.test(yn), `★未가 «여름» 에 들어 있습니다`)
  check(/isWinter\) return \{ element: '화'/.test(yn), `★丑월 → 조후용신 火`)
  check(/isSummer\) return \{ element: '수'/.test(yn), `★未월 → 조후용신 水`)
  check(/return \{ element: null, note: '봄·가을생은 조후가 온화해요' \}/.test(yn),
    `⚠️ 辰·戌월은 «조후 없음» — 교재에 없으므로 지어내지 않습니다`)
}

console.log('\n━━ ㉖ ★신살의 «자리» 조건 (교재 48·94·96쪽) ━━')
{
  const P = (a: string[]) => ['년주', '월주', '일주', '시주']
    .map((p, i) => ({ pillar: p, stem: a[i][0], branch: a[i][1] })) as Pillar[]
  const find = (sj: Pillar[], name: string) =>
    (checkSinsal9(sj) as unknown as { name: string; count: number; active: boolean; marks: { pillar: string }[] }[])
      .find(x => x.name === name)!

  // ★도화살 — 년지·시지에만 있으면 «성립 안 함» (교재 48쪽)
  const d1 = find(P(['甲子', '丙寅', '乙巳', '乙酉']), '도화살')
  check(d1.count === 0, `★년지·시지의 子·酉는 «도화가 아닙니다» (교재 48쪽) — ${d1.count}개`)
  // ★월지·일지에 있으면 성립
  const d2 = find(P(['甲寅', '庚午', '乙卯', '丙戌']), '도화살')
  check(d2.count === 2 && d2.marks.every(m => m.pillar === '월주' || m.pillar === '일주'),
    `★월지·일지의 도화만 셉니다 — ${d2.count}개`)
  check(d2.active, `★월지·일지 포함 2개면 작용합니다 (교재 94쪽)`)

  // ⚠️ 백호살에는 자리 조건이 «없습니다» — 붙이지 않았는가 (교재 95쪽 전문)
  const t = read('lib/saju/career/tables/sinsal.ts')
  const bh = t.slice(t.indexOf("key: 'baekho'"), t.indexOf("key: 'goegang'"))
  check(!/onlyAt|needAt|posWeight/.test(bh), `⚠️ 백호살에 자리 조건이 «없습니다» (교재에 없으므로)`)

  // ★괴강·양인에는 月>日>時>年 무게가 있는가 (교재 95·96쪽)
  const gg = t.slice(t.indexOf("key: 'goegang'"), t.indexOf("key: 'yangin'"))
  check(/posWeight: \{ 월주: 4, 일주: 3, 시주: 2, 년주: 1 \}/.test(gg), `★괴강살 — 月>日>時>年`)
  const yi = t.slice(t.indexOf("key: 'yangin'"), t.indexOf("key: 'yeokma'"))
  check(/posWeight: \{ 월주: 4, 일주: 3, 시주: 2, 년주: 1 \}/.test(yi), `★양인 — 月>日>時>年`)

  // ⚠️ 현침살은 「3개 이상 «이거나» 일주 현침」 — «또는» 이라 needAt 을 쓰면 안 됩니다
  const hc = t.slice(t.indexOf("key: 'hyeonchim'"), t.indexOf("key: 'cheonmun'"))
  // ⚠️ 주석에도 「needAt」이 적혀 있으므로 «값» 만 봅니다 (줄머리 검사)
  check(!/^\s*needAt:/m.test(hc), `⚠️ 현침살에 needAt 을 걸지 «않았습니다» (「또는」이라서)`)
  const h1 = find(P(['甲子', '辛未', '乙卯', '丙寅']), '현침살')
  check(h1.active, `★일주에 없어도 3개 이상이면 작용합니다 — ${h1.count}개`)

  // ⚠️ 역마·화개·천문성은 자리 조건이 «교재에 없음» — 붙이지 않았는가
  const ym = t.slice(t.indexOf("key: 'yeokma'"), t.indexOf("key: 'dohwa'"))
  check(!/onlyAt|needAt|posWeight/.test(ym), `⚠️ 역마살에 자리 조건이 «없습니다» (교재에 없으므로)`)
}

console.log('\n━━ ㉗ ★천을귀인 — 日·時 가 으뜸 · 1~2개가 좋다 (교재 96쪽) ━━')
{
  const c = read('lib/saju/coupleFilterV1.ts')
  check(/GWIIN_POS: Record<string, number> = \{ 일주: 2, 시주: 2, 년주: 1, 월주: 1 \}/.test(c),
    `★日·時 가 으뜸입니다 (★다른 신살과 «거꾸로» 입니다)`)
  check(/배우자 자리\(일지\)나 말년 자리\(시지\)에 있어 더 가깝게 닿습니다/.test(c),
    `★으뜸 자리에 걸리면 «더해» 말합니다`)
  check(/귀인 글자가 여럿입니다/.test(c), `★셋 이상이면 알려 드립니다 (교재 「1~2개가 좋다」)`)
  // ⚠️ «깎아» 말하지 않는가 — 년지라서 약하다고 하지 않습니다
  // ⚠️ 주석에 그 말이 «왜 안 되는지» 적혀 있으므로, 손님께 나가는 문구(push)만 봅니다
  const pushed = [...c.matchAll(/gwiinLines\.push\('([^']*)'\)/g)].map(m => m[1]).join(' ')
  check(!/년지라서|약하게 닿|약합니다/.test(pushed),
    `⚠️ 「년지라서 약하다」고 «깎아» 말하지 않습니다`)
  // ⚠️ 판정(별점)은 바꾸지 않았는가 — 교재가 「몇 개면 별 몇」을 말하지 않습니다
  check(/stars: bothGwiin \? 5 : oneGwiin \? 3 : 2/.test(c), `⚠️ 별점 판정은 «그대로» 입니다`)
}

console.log('\n━━ ㉘ ★己(기)의 양인 제거 — 교과서대로 (교재 178·162쪽) ━━')
{
  const yn = read('lib/saju/yongsinNew.ts')
  check(/⛔ 己: '巳' — 2026-08-02 «뺐습니다»/.test(yn), `★己의 양인을 뺐다는 기록이 있습니다`)
  check(!/^\s*己: '巳',/m.test(yn), `★YANGIN_MONTH 에 己 가 «없습니다»`)
  check(/음일간은 음인격이 없다/.test(yn), `★교재 178쪽 근거가 적혀 있습니다`)
  check(/되돌리지 마십시오/.test(yn), `⚠️ 되돌리지 말라는 말이 적혀 있습니다`)

  const S = (a: string[]) => ['년주', '월주', '일주', '시주']
    .map((p, i) => ({ pillar: p, stem: a[i][0], branch: a[i][1] })) as Pillar[]
  const r = calcYongsinNew(S(['甲子', '丁巳', '己卯', '乙亥']) as never, '己')!
  check(r.gyeokguk.name !== '양인격', `★己 일간 巳월이 «양인격이 아닙니다» — ${r.gyeokguk.name}`)

  // ★양인일주는 교재 178쪽의 «셋» 뿐
  check(isYanginIlju('丙', '午') && isYanginIlju('戊', '午') && isYanginIlju('壬', '子'),
    `★양인일주 셋(丙午·戊午·壬子)은 그대로입니다`)
  check(!isYanginIlju('己', '巳'), `★己巳는 양인일주가 «아닙니다» (교재 178쪽은 셋만 듭니다)`)

  // ⚠️ 戊 건록 巳 · 戊 양인 午 · 己 건록 午 는 «그대로» 여야 합니다 (교재 39·178쪽)
  check(/甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳',/.test(yn), `⚠️ 戊 건록 巳 그대로`)
  check(/己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子',/.test(yn), `⚠️ 己 건록 午 그대로`)
  check(/甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子',/.test(yn), `⚠️ 戊 양인 午 그대로`)
}

console.log('\n━━ ㉙ ★현침살 — 교재 94쪽 «다섯 글자» (卯 없음) ━━')
{
  //  ★2026-08-02 대표님 확정 — 대표님이 교재 94쪽 원본을 찍어 주셔서 확인했습니다.
  //    "현침살 (甲午未申辛)" — ★卯가 «없습니다».
  //  ⚠️ 시중 통설은 «甲辛卯午未申 여섯» 으로 봅니다. 통설로 되돌리지 마십시오.
  //  ⚠️ 노트북LM 에 세 번 물어 «세 번 다른» 답이 왔습니다. 원본만 믿으십시오.
  const t = read('lib/saju/career/tables/sinsal.ts')
  const hc = t.slice(t.indexOf("key: 'hyeonchim'"), t.indexOf("key: 'cheonmun'"))
  check(/chars: \['甲', '午', '辛', '未', '申'\]/.test(hc), `★현침 글자가 «다섯» 입니다 (甲午辛未申)`)
  check(!/^\s*semi: \['卯'\]/m.test(hc), `★준현침 «卯» 가 없습니다 (교재 94쪽에 없음)`)
  check(/94쪽 \(5\) 현침살/.test(hc), `★출전이 «94쪽» 입니다 (92쪽은 공망 — 원본 확인)`)
  check(/92쪽은 «공망» 입니다/.test(hc), `⚠️ 옛 표기가 왜 틀렸는지 적혀 있습니다`)
  check(/연재쌤 확인 대기/.test(hc), `⚠️ 「일주 현침살」의 뜻이 «교재에 없다» 는 것이 적혀 있습니다`)

  // ★실기 — 卯만 여럿인 사주는 현침이 «아닙니다»
  const P = (a: string[]) => ['년주', '월주', '일주', '시주']
    .map((p, i) => ({ pillar: p, stem: a[i][0], branch: a[i][1] })) as Pillar[]
  const f = (sj: Pillar[]) =>
    (checkSinsal9(sj) as unknown as { name: string; count: number; active: boolean }[])
      .find(x => x.name === '현침살')!
  const m1 = f(P(['甲子', '乙卯', '乙卯', '乙卯']))
  check(m1.count === 1 && !m1.active, `★卯 셋 + 甲 하나 → 현침 «1개·작용 안 함» (전에는 잡혔습니다)`)
  const m2 = f(P(['甲子', '辛未', '乙巳', '丙申']))
  check(m2.count === 4 && m2.active, `★다섯 글자로 넷이면 작용합니다 — ${m2.count}개`)

  // ⚠️ 직업이 교재 94쪽과 맞는가
  check(/'문인'/.test(hc) && /'자동차정비사'/.test(hc), `★교재의 «문인·자동차정비사» 가 들어 있습니다`)
  check(!/'수의사'|'비평가'/.test(hc), `⚠️ 교재에 «없는» 수의사·비평가를 뺐습니다`)
}

console.log('\n━━ ㉚ 🔴 «절대 경로» 가 없는가 — 배포를 막습니다 ━━')
{
  //  🔴 2026-08-02 — 제가 만든 사고입니다.
  //    /tmp 에서 만든 측정 파일을 저장소로 옮기면서 import 경로를
  //    '/home/claude/myjae/lib/…' 그대로 두었습니다.
  //    ⇒ 제 컨테이너에서는 «실재하는 경로» 라 tsc 가 통과했고,
  //       npm run verify 도 measure 는 체인 밖이라 안 돌았습니다.
  //    ⇒ ★Vercel 빌드에서 "Cannot find module" 로 배포가 통째로 막혔습니다.
  //
  //  ⚠️⚠️ tsconfig.json 의 include 가 «**/*.ts» 입니다.
  //     ⇒ next build 의 타입 검사에 31·32·33번 같은 «저장소 루트 스크립트» 도
  //        전부 들어갑니다. 이 파일들이 안 돌아도 «컴파일은» 됩니다.
  //     ★그러니 루트 스크립트의 import 도 «상대 경로» 라야 합니다.
  const files = readdirSync('.').filter(f => /^\d\d-.*\.ts$/.test(f))
  check(files.length >= 3, `루트 스크립트를 ${files.length}개 봅니다`)
  const bad: string[] = []
  for (const f of files) {
    const src = read(f)
    for (const m of src.matchAll(/from '([^']+)'/g)) {
      if (m[1].startsWith('/')) bad.push(`${f} → ${m[1]}`)
    }
  }
  check(bad.length === 0,
    `★절대 경로 import 가 «하나도» 없습니다${bad.length ? ' — ' + bad.join(' , ') : ''}`)

  // ⚠️ app/ · lib/ 도 함께 봅니다 (같은 실수가 거기서 나면 더 큽니다)
  const bad2: string[] = []
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue
      const full = `${dir}/${e.name}`
      if (e.isDirectory()) walk(full)
      else if (/\.tsx?$/.test(e.name)) {
        for (const m of read(full).matchAll(/from '([^']+)'/g)) {
          if (m[1].startsWith('/home/') || m[1].startsWith('/Users/')) bad2.push(`${full} → ${m[1]}`)
        }
      }
    }
  }
  walk('lib'); walk('app')
  check(bad2.length === 0,
    `★lib·app 에도 절대 경로가 «없습니다»${bad2.length ? ' — ' + bad2.slice(0, 3).join(' , ') : ''}`)
}

console.log('\n━━ ㉒-f ★되돌려지지 않도록 — 까닭이 코드에 적혀 있는가 ━━')
{
  const src = read('lib/saju/simsanOhaeng.ts')
  check(/2026-08-02 연재쌤 지시/.test(src), `★언제 누가 정했는지 적혀 있습니다`)
  check(/넣지 않기로 되돌리지 마십시오/.test(src), `⚠️ 되돌리지 말라는 말이 적혀 있습니다`)
  check(/원장님 손글씨 수정판/.test(src), `★원본 스캔으로 확인했다는 근거가 있습니다`)
  check(/공란인 월지\(子·巳·午·亥\)/.test(src), `★공란 월지 규칙이 적혀 있습니다`)
  check(/measure:hour/.test(src), `★고치려는 다음 세션에게 «먼저 재라» 고 일러 둡니다`)
  // ⚠️ 자(measure)는 검사가 아닙니다 — verify 체인에 들어가면 배포가 느려집니다
  const pkg = JSON.parse(read('package.json'))
  check(!/31-measure/.test(pkg.scripts.verify), `⚠️ 측정 하네스는 verify 체인에 «없습니다»`)
  check(/measure:hour/.test(JSON.stringify(pkg.scripts)), `npm run measure:hour 로 잽니다`)
}

console.log(`\n━━ 오행·용신 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) {
  console.log('  ┌────────────────────────────────────────────────────────────┐')
  console.log('  │  ⚠️ 시지 치환은 2026-08-02 «연재쌤 지시» 로 넣은 것입니다      │')
  console.log('  │     되돌리려면 연재쌤께 다시 여쭈십시오.                      │')
  console.log('  │     손대기 전에 npm run measure:hour 를 먼저 돌리십시오.       │')
  console.log('  └────────────────────────────────────────────────────────────┘')
  process.exit(1)
}
