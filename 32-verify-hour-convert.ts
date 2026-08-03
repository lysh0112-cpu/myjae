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
// ★궁합 재료의 말 다듬기 (2026-08-02)
import { judgeCouple } from './lib/saju/coupleFilterV1'
import { toCoupleTongbyeonMaterial } from './lib/saju/toCoupleTongbyeonInput'
import { findBanned } from './lib/saju/couple/toneGuard'
// ★8단계 연표 (프리미엄 궁합 1차 · 2026-08-02)
import { buildTimeline, timelineBlock, bestYear } from './lib/saju/couple/step8Timeline'
// ★5단계 월지·년지 (프리미엄 궁합 2차 · 2026-08-02)
import { judgeBranchPair, judgeEnv } from './lib/saju/couple/step5Env'
// ★1단계 그릇과 온도 (프리미엄 궁합 3차 · 2026-08-02)
import { judgeVessel, vesselBlock } from './lib/saju/couple/step1Vessel'
import { guardTone } from './lib/saju/couple/toneGuard'
// ★여덟 단계 엮기 (프리미엄 궁합 4차 · 2026-08-02)
import { buildCouplePrompt } from './lib/saju/buildCouplePrompt'
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
  // ⚠️⚠️ 「첫 줄」로 찾지 «마십시오» — 신살이 늘면 차례가 바뀝니다.
  //    ★2026-08-02 에 화개살을 넣자 첫 줄이 화개살이 되어 이 검사가 깨졌습니다.
  //    (43부 교훈 [자리 말고 열쇠] 와 같은 자리입니다)
  const gLineOf = (c: { lines: string[] }) =>
    c.lines.find(l => l.includes('백호살') || l.includes('괴강살')) ?? ''

  const c1 = judgeSinsal({ saju: P4(['戊辰', '丙辰', '乙巳', '庚辰']), target: 'adult' } as never)
  const g1 = gLineOf(c1)
  check(/2기둥/.test(g1), `★戊辰+庚辰 = «2기둥» 입니다 — ${g1}`)
  check(!/3기둥/.test(g1), `⚠️ 戊辰을 두 번 세지 «않습니다»`)
  check(!/양인/.test(g1), `★양인이 0개면 이름에 «안 붙입니다»`)
  check((g1.match(/戊辰/g) ?? []).length === 1, `★겹치는 기둥을 «한 번만» 적습니다`)

  // 양인일주(壬子)까지 걸리는 표본
  const c2 = judgeSinsal({ saju: P4(['甲辰', '丙戌', '壬子', '庚辰']), target: 'adult' } as never)
  const g2 = gLineOf(c2)
  check(/양인/.test(g2), `★양인일주(壬子)가 잡히면 이름에 «붙습니다»`)
  check(/4기둥/.test(g2), `★네 기둥 다 걸리면 4기둥 — ${g2}`)

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

console.log('\n━━ ㉛ ★천라·지망 신설 · 공망 궁합 (교재 95·92쪽) ━━')
{
  const t = read('lib/saju/career/tables/sinsal.ts')
  // ★천라 (辰亥, 寅酉) — 교재 95쪽
  check(/key: 'cheonra', name: '천라'/.test(t), `★천라를 세웠습니다 (교재 95쪽)`)
  check(/pairs: \[\['辰','亥'\], \['寅','酉'\]\]/.test(t), `★천라 짝 — 辰亥 · 寅酉`)
  // ★지망 (辰巳) — 교재 95쪽 · 자리 무게 있음
  check(/key: 'jimang', name: '지망'/.test(t), `★지망을 세웠습니다 (교재 95쪽)`)
  check(/pairs: \[\['辰','巳'\]\]/.test(t), `★지망 짝 — 辰巳`)
  const jm = t.slice(t.indexOf("key: 'jimang'"), t.indexOf("key: 'yeokma'"))
  check(/posWeight: \{ 월주: 4, 일주: 3, 시주: 2, 년주: 1 \}/.test(jm),
    `★지망에 «月>日>時>年» 이 있습니다 (교재 95쪽 「년주는 영향력 거의 없음」)`)
  // ⚠️ 지망은 «흉살인데 좋게 보는 조건» 이 있습니다 — 그것을 함께 말하는가
  check(/오히려 좋게/.test(jm), `⚠️ 「중화·조후가 맞으면 오히려 좋다」를 함께 말합니다`)

  // ★실기 — 천라·지망이 실제로 잡히는가
  const P = (a: string[]) => ['년주', '월주', '일주', '시주']
    .map((p, i) => ({ pillar: p, stem: a[i][0], branch: a[i][1] })) as Pillar[]
  const f = (sj: Pillar[], nm: string) =>
    (checkSinsal9(sj) as unknown as { name: string; count: number; active: boolean; posNote: string }[])
      .find(x => x.name === nm)!
  const j1 = f(P(['甲辰', '乙巳', '丙子', '丁丑']), '지망')
  check(j1.active && /월주에 있어/.test(j1.posNote), `★辰巳 → 지망 · 자리 안내가 붙습니다`)
  const c1 = f(P(['甲辰', '乙亥', '丙子', '丁丑']), '천라')
  check(c1.active, `★辰亥 → 천라가 잡힙니다`)

  // ★공망 궁합 — 교재 92쪽 「공망이 같으면 인연」
  const cp = read('lib/saju/coupleFilterV1.ts')
  check(/key: 'gongmang'/.test(cp), `★「두 분의 코드가 맞는 자리」 카드가 있습니다`)
  check(/a\.gongmang\.join\(''\) === b\.gongmang\.join\(''\)/.test(cp),
    `★두 사람의 공망을 맞대어 봅니다`)
  check(/의견이 일치되고 코드가 맞는/.test(cp), `★교재 92쪽 원문의 뜻을 씁니다`)
  // ⚠️⚠️ «다르면 나쁘다» 고 말하지 않는가 — 교재는 「같으면 인연」이라고만 했습니다
  check(!/공망이 다르|인연이 없|맞지 않는 사이/.test(cp),
    `⚠️ 공망이 «다르다고 나쁘다» 고 말하지 않습니다 (없는 흉을 만들지 않음)`)
  // ⚠️ 「공치고 망함」 같은 말을 손님께 쓰지 않는가
  // ⚠️ 주석에 그 말이 «왜 안 되는지» 적혀 있으므로, 손님께 나가는 lines 만 봅니다
  const gmCard = cp.slice(cp.indexOf("key: 'gongmang'"), cp.indexOf("key: 'gongmang'") + 900)
  const shown = [...gmCard.matchAll(/'([^']*요\.|[^']*니다\.|[^']*어요\.)'/g)].map(m => m[1]).join(' ')
  check(!/공치고 망/.test(shown), `⚠️ 「공치고 망한다」를 화면에 쓰지 않습니다`)
}

console.log('\n━━ ㉜ ★일주 현침 — 개수와 무관하게 작용 (교재 94쪽 「이거나」) ━━')
{
  //  교재 94쪽 "3개 이상«이거나» 일주 현침살이 작용력이 큼"  ← ★«또는» 입니다
  //  ⚠️ 「일주 현침살」이 무엇인지 교재가 «밝히지 않습니다».
  //     ★일지 기준으로 정했습니다 (2026-08-02 대표님 결정 · 통설).
  //     까닭 — 교재 178쪽 「日柱가 겁재면 양인 일주」의 양인 일주(丙午·戊午·壬子)가
  //            «일지» 를 보는 것과 결이 같습니다.
  //     ⚠️ 교재 근거가 «아닙니다». 연재쌤 확인이 오면 바꾸십시오.
  const P = (a: string[]) => ['년주', '월주', '일주', '시주']
    .map((p, i) => ({ pillar: p, stem: a[i][0], branch: a[i][1] })) as Pillar[]
  const f = (sj: Pillar[]) =>
    (checkSinsal9(sj) as unknown as { name: string; count: number; active: boolean; strongHit: boolean }[])
      .find(x => x.name === '현침살')!

  const a1 = f(P(['乙丑', '丙寅', '丙午', '癸亥']))
  check(a1.count === 1 && a1.active && a1.strongHit,
    `★일지가 午 → 1개인데도 «작용» 합니다 (개수 무관)`)
  const a2 = f(P(['乙丑', '丙寅', '甲午', '癸亥']))
  check(a2.strongHit, `★甲午 — 일간·일지 둘 다 현침`)
  const a3 = f(P(['乙丑', '丙寅', '甲子', '癸亥']))
  check(!a3.active && !a3.strongHit,
    `⚠️ 甲子 — 일«간» 만 현침이면 «성립 안 함» (일지 기준이므로)`)
  const a4 = f(P(['甲子', '辛丑', '乙巳', '丙申']))
  check(a4.count === 3 && a4.active && !a4.strongHit,
    `★일주 아닌 곳에 셋 → «개수» 로 작용합니다 (「이거나」의 앞쪽)`)

  // ⚠️ strongAt 은 «또는» 입니다 — needAt(그리고)과 헷갈리면 안 됩니다
  const t = read('lib/saju/career/tables/sinsal.ts')
  const hc = t.slice(t.indexOf("key: 'hyeonchim'"), t.indexOf("key: 'cheonmun'"))
  check(/^\s*strongAt: \['일주'\],/m.test(hc), `★현침에 strongAt: ['일주'] 가 있습니다`)
  check(!/^\s*needAt:/m.test(hc), `⚠️ needAt(그리고)을 쓰지 «않았습니다»`)
  check(/교재 근거가 «아닙니다»/.test(t), `⚠️ 통설로 정했다는 것이 적혀 있습니다`)

  // 🔴 겹침 제거가 «묶음에만» 걸리는가 (글자 신살까지 자르면 안 됩니다)
  const c1 = judgeSinsal({ saju: P(['乙巳', '癸酉', '甲午', '乙酉']), target: 'adult' } as never)
  const hLine = c1.lines.find(l => l.startsWith('현침살')) ?? ''
  check(/甲 · 午/.test(hLine), `★甲午 → 글자 «둘 다» 적습니다 — ${hLine}`)
  const c2 = judgeSinsal({ saju: P(['戊辰', '丙辰', '乙巳', '庚辰']), target: 'adult' } as never)
  check(c2.lines.some(l => /戊辰 · 庚辰 · 2기둥/.test(l)),
    `★묶음은 여전히 «기둥» 으로 겹침을 지웁니다`)
}

console.log('\n━━ ㉝ ★천문성 낱글자 넷 · 문창성·천의성·삼기성 신설 (교재 94·97쪽) ━━')
{
  const t = read('lib/saju/career/tables/sinsal.ts')
  const P = (a: string[]) => ['년주', '월주', '일주', '시주']
    .map((p, i) => ({ pillar: p, stem: a[i][0], branch: a[i][1] })) as Pillar[]
  const f = (sj: Pillar[], nm: string) =>
    (checkSinsal9(sj) as unknown as { name: string; count: number; active: boolean }[])
      .find(x => x.name === nm)!

  // ★천문성 — 낱글자 넷(卯戌亥未) · 문턱 2 (대표님 결정)
  const cm = t.slice(t.indexOf("key: 'cheonmun'"), t.indexOf("key: 'munchang'"))
  check(/chars: \['卯', '戌', '亥', '未'\]/.test(cm), `★천문성 — 낱글자 넷 (교재 94쪽)`)
  check(/^\s*threshold: 2,/m.test(cm), `★천문성 문턱 2 (교재에 개수 없음 — 대표님 결정)`)
  check(!/^\s*pairs:/m.test(cm), `⚠️ 짝(pair)을 쓰지 «않습니다»`)
  check(/교재 근거가 «아닙니다»/.test(cm), `⚠️ 문턱이 교재 근거가 아니라는 것이 적혀 있습니다`)
  check(/94쪽 \(4\) 천문성/.test(cm), `★출전이 94쪽입니다 (92쪽은 공망)`)
  const t1 = f(P(['甲戌', '乙亥', '丙子', '丁丑']), '천문성')
  check(t1.count === 2 && t1.active, `★戌亥 → 천문성 2개·작용`)
  const t2 = f(P(['甲戌', '乙巳', '丙子', '丁丑']), '천문성')
  check(t2.count === 1 && !t2.active, `⚠️ 하나뿐이면 «작용 안 함» (문턱 2)`)

  // ★문창성 — 일간마다 정해진 지지 (교재 97쪽)
  check(/byDayStem: \{/.test(t), `★문창성 — 일간별 지지 표가 있습니다`)
  check(/甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申'/.test(t), `★교재 97쪽 표 앞 다섯`)
  check(/己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯'/.test(t), `★교재 97쪽 표 뒤 다섯`)
  const m1 = f(P(['乙丑', '丙寅', '甲午', '己巳']), '문창성')
  check(m1.count === 1 && m1.active, `★甲 일간 + 巳 → 문창성`)
  const m2 = f(P(['乙丑', '丙寅', '甲午', '己卯']), '문창성')
  check(m2.count === 0, `⚠️ 甲 일간에 卯는 문창성이 «아닙니다»`)

  // ★천의성 — 月支의 «바로 앞 글자» (교재 97쪽)
  const u1 = f(P(['甲戌', '丁亥', '丙寅', '己丑']), '천의성')
  check(u1.count === 1 && u1.active, `★亥월 + 戌 → 천의성 (★교재 97쪽이 든 «바로 그 예»)`)
  const u2 = f(P(['甲子', '丁亥', '丙寅', '己丑']), '천의성')
  check(u2.count === 0, `⚠️ 亥월에 子는 천의성이 «아닙니다» (앞 글자가 아니라 뒤)`)

  // ★삼기성 — 천간 셋 + 「日干에는 반드시」 (교재 97쪽)
  check(/needDayStem: true/.test(t), `★「日干에는 반드시 있어야 한다」가 걸려 있습니다`)
  const g1 = f(P(['乙丑', '丁亥', '丙寅', '己丑']), '삼기성')
  check(g1.active, `★乙丙丁 + 일간 丙 → 삼기성`)
  const g2 = f(P(['乙丑', '丁亥', '己卯', '丙寅']), '삼기성')
  check(g2.count === 0, `⚠️ 乙丙丁 이 다 있어도 «일간이 그 안에 없으면» 성립 안 함`)

  // ★신살 겹치기 — 교재 97쪽 천의성
  check(/SINSAL_COMBO/.test(t), `★겹치기 표가 있습니다`)
  check(/keys: \['cheonui', 'yangin'\]/.test(t), `★천의성+양인 = 외과의사 (교재 97쪽)`)
  check(/keys: \['cheonui', 'goegang'\]/.test(t), `★천의성+괴강 = 약사·종교지도자 (교재 97쪽)`)
  const c1 = judgeSinsal({ saju: P(['甲戌', '丁亥', '丙午', '己丑']), target: 'adult' } as never)
  check(c1.lines.some(l => l.includes('칼을 쥐는')), `★천의성+양인이 겹치면 «한 줄» 이 나옵니다`)
  const c2 = judgeSinsal({ saju: P(['甲戌', '丁亥', '庚辰', '己丑']), target: 'adult' } as never)
  check(c2.lines.some(l => l.includes('판을 세우는')), `★천의성+괴강도 나옵니다`)
  // ⚠️ 교재에 «없는» 겹치기를 지어내지 않았는가 — 둘뿐이어야 합니다
  const nCombo = (t.match(/keys: \['/g) ?? []).length
  check(nCombo === 2, `⚠️ 겹치기는 «둘» 뿐입니다 (교재에 그것만 있습니다) — ${nCombo}`)
}

console.log('\n━━ ㉞ 🔴★궁합 재료의 «말» 을 다듬는가 (toneGuard) ━━')
{
  //  🔴 [실측 2026-08-02]  궁합 재료(7,646자)에 「헤어짐」이 «나가고» 있었습니다 —
  //    "형충파해가 겹치면 뜻밖의 일과 구설, 헤어짐을 조심하시고"
  //  ★재료가 프롬프트로 나가기 «전» 에 말을 다듬습니다.
  //  ⚠️ 「지우는」 것이 아니라 «바꿔 주는» 것입니다 (교훈 CA)
  const A = {
    name: '가', gender: '남', birth: '1988-04-20',
    saju: ['년주', '월주', '일주', '시주'].map((p, i) => ({
      pillar: p, stem: ['戊', '丙', '乙', '庚'][i], branch: ['辰', '辰', '巳', '辰'][i],
    })), solarMonth: 4, solarDay: 20, hourBranch: '辰',
  }
  const B = {
    name: '나', gender: '여', birth: '1990-11-20',
    saju: ['년주', '월주', '일주', '시주'].map((p, i) => ({
      pillar: p, stem: ['甲', '丁', '丙', '己'][i], branch: ['子', '亥', '午', '丑'][i],
    })), solarMonth: 11, solarDay: 20, hourBranch: '丑',
  }
  const j = judgeCouple(A as never, B as never, (n: string) => n + '님의 배우자운', true)
  const m = toCoupleTongbyeonMaterial(A as never, B as never, j as never)
  const all = [...m.personBlocks, m.judgeBlock, m.flowBlock].join('\n')

  const left = findBanned(all)
  check(left.length === 0,
    `★재료에 금지어가 «하나도» 없습니다${left.length ? ' — ' + left.slice(0, 3).map(x => x.word).join(' , ') : ''}`)
  check(!/헤어짐/.test(all), `★「헤어짐」이 «사라졌습니다» (실측에서 나가고 있던 말)`)
  check(/구설이 따를 수 있으니/.test(all), `★뜻은 «남았습니다» — 지우지 않고 바꿨습니다`)
  check(all.length > 5000, `⚠️ 재료가 «줄지» 않았습니다 (${all.length}자) — 지우면 AI 가 지어냅니다`)

  // ⚠️ 문지기를 «지나지 않는 길» 이 없는가
  const src = read('lib/saju/toCoupleTongbyeonInput.ts')
  check(/guardTone\(personBlock\(a/.test(src), `★personBlocks 가 문지기를 지납니다`)
  check(/guardTone\(judgeBlock\(judge\)\)/.test(src), `★judgeBlock 이 문지기를 지납니다`)
  check(/guardTone\(flowBlock\(/.test(src), `★flowBlock 이 문지기를 지납니다`)

  // ⚠️ 멀쩡한 말까지 «막지» 않는가 — 실측에서 셋이 그랬습니다
  const g = read('lib/saju/couple/toneGuard.ts')
  check(/명식을 가리키는 말/.test(g), `⚠️ 「명식(팔자)」은 걸리지 않습니다`)
  check(/좋은 뜻으로 쓰인 자리/.test(g), `⚠️ 「위기 속에서도 탈출구를」은 걸리지 않습니다`)
  check(/금지 지시문 안의 예시/.test(g), `⚠️ 금지 지시문 «안» 의 예시는 걸리지 않습니다`)
  check(/SOLUTION_HINT/.test(g), `★흉을 말하면 솔루션 한 줄로 맺으라는 안내가 있습니다`)
}

console.log('\n━━ ㉟ ★화개살 신설 (교재 94쪽) ━━')
{
  const t = read('lib/saju/career/tables/sinsal.ts')
  const hg = t.slice(t.indexOf("key: 'hwagae'"), t.indexOf("key: 'munchang'"))
  check(/chars: \['辰', '戌', '丑', '未'\]/.test(hg), `★화개살 — 辰戌丑未 (교재 94쪽)`)
  check(/^\s*threshold: 2,/m.test(hg), `★문턱 2 (교재에 개수 없음 — 천문성과 같은 잣대)`)
  // ⚠️⚠️ 「기생, 스님 팔자」를 «담지 않았는가» — 가장 중요합니다
  check(!/기생, 스님 팔자'/.test(hg) && !/gijil:[^,]*기생/.test(hg),
    `⚠️⚠️ 「옛날에 여자는 기생, 스님 팔자」를 «담지 않았습니다» (교훈 CA)`)
  check(/담지 «않았습니다»/.test(hg), `⚠️ 왜 담지 않았는지가 적혀 있습니다`)
  check(/커리어 우먼/.test(hg), `★교재가 스스로 고쳐 말한 줄만 살렸습니다`)
  // ★2026-08-02 대표님 — "화개살이 있을 경우에는 더 «멋있게» 써 줘"
  //   교재 94쪽이 «여덟 줄» 이나 쓴 드문 신살입니다. 짧게 줄이지 마십시오.
  check(/내 판을 스스로 여는/.test(hg), `★「내 판을 스스로 여는」 — 교재의 자기 주도`)
  check(/남다른 노하우/.test(hg), `★「남다른 노하우」 — 교재의 독립적 전문직`)
  check(/두 마음/.test(hg), `★「두 마음」 — 지기 싫어함 ↔ 평화를 깨기 싫어함`)
  check(/물러설 자리를 «미리 하나»/.test(hg), `★솔루션 한 줄이 있습니다`)
  const gj = (hg.match(/gijil:[\s\S]*?jobs:/) ?? [''])[0]
  check(gj.length > 200, `★기질 문구가 «두껍습니다» (${gj.length}자) — 교재 여덟 줄을 살렸습니다`)

  const P = (a: string[]) => ['년주', '월주', '일주', '시주']
    .map((p, i) => ({ pillar: p, stem: a[i][0], branch: a[i][1] })) as Pillar[]
  const h = (checkSinsal9(P(['甲辰', '丙戌', '乙丑', '丁未'])) as unknown as
    { name: string; count: number; active: boolean }[]).find(x => x.name === '화개살')!
  check(h.count === 4 && h.active, `★辰戌丑未 넷 → 화개살 작용 — ${h.count}개`)
  const h2 = (checkSinsal9(P(['甲辰', '丙寅', '乙巳', '丁卯'])) as unknown as
    { name: string; count: number; active: boolean }[]).find(x => x.name === '화개살')!
  check(h2.count === 1 && !h2.active, `⚠️ 하나뿐이면 «작용 안 함» (문턱 2)`)
}

console.log('\n━━ ㊱ ★8단계 연표 — 두 분 것을 «나란히» (프리미엄 궁합 1차) ━━')
{
  const A = { name: '가', dayBranch: '巳', dayStem: '乙',
    yongsin: '화' as Ohaeng, heesin: '토' as Ohaeng, gisin: '수' as Ohaeng }
  const B = { name: '나', dayBranch: '午', dayStem: '丙',
    yongsin: '토' as Ohaeng, heesin: '금' as Ohaeng, gisin: '목' as Ohaeng }
  const rows = buildTimeline(A, B, 2026, 10)
  const blk = timelineBlock(rows)

  check(rows.length === 10, `★열 해가 나옵니다 (${rows.length})`)
  check(rows.every(r => r.each.length === 2), `★해마다 «두 분» 것이 나란히 있습니다`)

  // ⚠️⚠️ 「위기」·「이별」이 «하나도» 없는가 — 대표님 지시
  const BAD = ['위기', '이별', '이혼', '헤어', '파혼', '사별', '악처', '바람', '불화', '별거', '각방']
  const hit = BAD.filter(w => blk.includes(w))
  check(hit.length === 0, `★★금지어가 «하나도» 없습니다${hit.length ? ' — ' + hit.join(',') : ''}`)
  check(findBanned(blk).length === 0, `★toneGuard 로도 걸리는 것이 없습니다`)

  // ★교재의 말을 쓰는가 — 「위기」 대신 「인터체인지」
  check(/인터체인지/.test(blk), `★교재의 말 「인터체인지」를 씁니다 (134쪽)`)
  check(/접목/.test(blk), `★교재의 말 「접목」을 씁니다`)
  check(/준비하는 해|준비하는 시기/.test(blk), `★「준비하는 해」로 부릅니다`)

  // ★★흉을 말한 해에는 «반드시» 솔루션 — 대표님 지시
  const noSol = rows.filter(r =>
    /흔들|준비|접목|더디|얽히|조급/.test(r.line) && !r.solution)
  check(noSol.length === 0,
    `★★흉을 말한 해에 솔루션이 «반드시» 있습니다${noSol.length ? ' — ' + noSol.map(r => r.year).join(',') : ''}`)

  // ⚠️ 솔루션이 «누구» 이야기인지 어긋나지 않는가
  //   🔴 2026-08-02 — 「가 준비 · 나 흔들림」인 해에 솔루션이 «가를 살피라» 로 시작했습니다
  for (const r of rows) {
    const sh = r.each.find(e => e.shaken)
    if (!sh || !r.solution) continue
    const other = r.each.find(e => e.name !== sh.name)!.name
    check(r.solution.startsWith(other),
      `★${r.year} — 흔들리는 분(${sh.name})께 «상대(${other})» 가 말을 걸도록 씁니다`)
  }

  // ⚠️ 「두 분이 동시에 어려운 해」라고 «판정하지» 않는가 — 교재에 대조법이 없습니다
  const src = read('lib/saju/couple/step8Timeline.ts')
  check(/판정하지» 않습니다/.test(src), `⚠️ 「동시에 어려운 해」를 판정하지 않는다고 적혀 있습니다`)
  check(/대조법/.test(src), `⚠️ 교재에 «대조법이 없다» 는 근거가 적혀 있습니다`)
  check(!/'나쁨'/.test(src), `★「나쁨」이라는 칸을 «두지 않았습니다» (교재 238쪽 단식 판단 금지)`)

  // ★대운을 여기서 «다시 계산하지» 않는가 — dayun.ts 하나를 지납니다
  check(/from '\.\.\/dayun'/.test(src), `★dayun.ts «하나» 를 지납니다`)
  // ⚠️ 주석에도 「절입일」이 적혀 있으므로 «부르는 곳» 만 봅니다.
  //    ★2026-08-02 — 낱말로 훑다 제 주석에 걸렸습니다. 세 번째입니다.
  check(!/calcDayunStartAge\(/.test(src),
    `⚠️ 대운수를 여기서 계산하지 «않습니다» (절기가 필요해 서버 전용)`)

  // ★가장 고른 해 — 접목인 해를 «고르지 않는가»
  const best = bestYear(rows)
  check(!best || !best.jeopmok,
    `★「가장 고른 해」로 «접목» 인 해를 고르지 않습니다 — ${best ? best.year : '(없음)'}`)

  // ⚠️ 재료가 문지기를 지나는가
  const ti = read('lib/saju/toCoupleTongbyeonInput.ts')
  check(/timelineBlock: guardTone\(timelineOf/.test(ti), `★연표도 guardTone 을 지납니다`)
  check(/ap\.eokbu|judge\?\.a/.test(ti), `★용신을 judge 에서 «받아» 씁니다 (다시 계산하지 않음)`)
}

console.log('\n━━ ㊲ ★5단계 월지·년지 (프리미엄 궁합 2차) ━━')
{
  const JI2 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

  // ★대칭 — 두 사람 사이는 «서로» 이므로 (a,b)와 (b,a)가 같아야 합니다
  let asym = 0
  for (const a of JI2) for (const b of JI2) {
    if (judgeBranchPair(a, b).kind !== judgeBranchPair(b, a).kind) asym++
  }
  check(asym === 0, `★144칸 전수 — «대칭» 입니다 (${asym})`)

  // ★교재가 이름 붙인 대로인가
  check(judgeBranchPair('子', '丑').kind === '육합', `★子丑 = 육합 (교재의 대표 예)`)
  check(judgeBranchPair('午', '未').kind === '육합', `★午未 = 육합`)
  check(judgeBranchPair('申', '子').kind === '준삼합', `★申子 = 준삼합 (生+旺)`)
  check(judgeBranchPair('子', '辰').kind === '반합', `★子辰 = 반합 (旺+墓)`)
  check(judgeBranchPair('申', '辰').kind === '가합', `★申辰 = 가합 (生+墓)`)
  check(judgeBranchPair('寅', '卯').kind === '방합(반)', `★寅卯 = 방합(반)`)
  check(judgeBranchPair('子', '午').kind === '충', `★子午 = 충`)
  // ⚠️ 「삼합」이라 부르지 않는가 — 두 글자는 세 글자가 아닙니다
  let named3 = 0
  for (const a of JI2) for (const b of JI2) {
    if ((judgeBranchPair(a, b).kind as string) === '삼합') named3++
  }
  check(named3 === 0, `⚠️ 두 글자를 «삼합» 이라 부르지 않습니다 (준삼합·반합·가합)`)

  const src = read('lib/saju/couple/step5Env.ts')
  // ⛔ 49쪽 조견표를 쓰지 않는가
  check(!/jijiPairText|jijiGrade|JIJI_GRADE/.test(src.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')),
    `⛔ 49쪽 조견표(jijiGrade)를 «쓰지 않습니다» — 운 대입 표입니다`)
  // ⛔ 時支를 넣지 않는가
  check(!/aHour|bHour|시주.*시주/.test(src.replace(/\/\/.*/g, '')),
    `⛔ 「時支 × 時支」를 «넣지 않습니다» (교재에 궁합용이라는 말이 없음)`)
  // ⛔ 「겉궁합」을 쓰지 않는가 — 손님께 나가는 말만 봅니다
  // ★손님께 «실제로 나가는» 말만 모읍니다.
  //   ⚠️ 주석에는 「겉궁합」·「찰떡궁합」이 «왜 안 되는지» 적혀 있어, 그것까지 세면
  //      멀쩡한 코드가 걸립니다. (2026-08-02 — 이 함정을 네 번째로 밟았습니다)
  //   ⇒ ★주석을 «먼저 지우고» 문자열만 봅니다.
  const noComment = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  const shown = [...noComment.matchAll(/'([^']{4,})'/g)].map(m => m[1]).join(' ')
  check(!/겉궁합/.test(shown), `⛔ 「겉궁합」이라 부르지 «않습니다» (교재에 없는 말)`)
  // ★점수·별점을 내지 않는가
  check(!/stars|score|등급: '[ABCD]'/.test(src.replace(/\/\/.*/g, '')),
    `★점수·별점·등급을 내지 «않습니다» (교재에 궁합 배점표가 없음)`)

  // ★띠 궁합 안내가 있는가 — 손님이 가장 잘 아는 자리
  const r = judgeEnv({ aName: '가', bName: '나', aMonth: '子', bMonth: '午', aYear: '寅', bYear: '亥' })
  check(r.lines.some(l => l.includes('띠 궁합')), `★「띠 궁합」이 년지 자리임을 미리 알려 줍니다`)
  check(r.lines[0].includes('월지'), `★월지를 «먼저» 말합니다 (교재 「月支가 총사령관」)`)
  // ★충이면 «반드시» 솔루션
  check(!!r.solution, `★월지가 충이면 솔루션이 «반드시» 있습니다`)
  // ⚠️ 「충 = 나쁨」으로 말하지 않는가
  const chungSay = judgeBranchPair('子', '午').say
  check(/못 보는 것을 봐 줍니다|서로가/.test(chungSay),
    `⚠️ 「충」을 나쁘게만 말하지 «않습니다» (교재 121·263쪽 「50%는 긍정적」)`)

  // ⚠️ 계절 짝을 두 번 말하지 않는가 — monthSeasonMatch 가 이미 말합니다
  // ⚠️ 주석에 «왜 안 되는지» 적혀 있으므로 손님께 나가는 말(shown)만 봅니다.
  //    ★2026-08-02 — 낱말로 훑다 제 주석에 걸린 것이 «네 번째» 입니다.
  //      toneGuard·현침·천을귀인·연표에 이어. ⇒ ★처음부터 shown 으로 보십시오.
  check(!/찰떡궁합/.test(shown),
    `⚠️ 「찰떡궁합」을 여기서 말하지 «않습니다» (monthSeasonMatch 가 이미 말합니다)`)

  // ⚠️ 재료가 문지기를 지나는가
  const ti = read('lib/saju/toCoupleTongbyeonInput.ts')
  check(/envBlock: guardTone\(envOf/.test(ti), `★5단계 재료도 guardTone 을 지납니다`)
}

console.log('\n━━ ㊳ ★1단계 그릇과 온도 (프리미엄 궁합 3차) ━━')
{
  const V = (name: string, status: string, season: string) => ({
    name, status, season, needEl: '화', needFrom: '억부',
  }) as never

  // ★교재 142쪽 「신강 사주의 배우자는 신약 사주랑 만나는 게 좋다」
  const r1 = judgeVessel(V('가', '신강', '봄'), V('나', '신약', '겨울'))
  check(r1.cross === '뚜렷과 헤아림', `★신강 × 신약 = 「뚜렷과 헤아림」 (교재 142쪽 권장)`)
  check(!!r1.solution, `★솔루션이 «반드시» 있습니다`)

  // ★교재 123쪽 — 이 단계의 «보석»
  const r2 = judgeVessel(V('가', '신강', '봄'), V('나', '신강', '가을'))
  check(r2.cross === '둘 다 뚜렷', `★신강 × 신강 = 「둘 다 뚜렷」`)
  check(r2.lines.some(l => l.includes('인품과 마음공부')),
    `★★교재 123쪽 「잘 지내시면 인품·인격 수양이 깊은 사람」을 «반드시» 말합니다`)
  check(!!r2.solution, `★솔루션이 있습니다 (그 자리에서 결론 내지 않기)`)

  // ⛔ 「둘 다 신약」을 «판정하지» 않는가 — 교재에 없습니다
  const r3 = judgeVessel(V('가', '극신약', '봄'), V('나', '신약', '가을'))
  check(r3.cross === '둘 다 헤아림', `★극신약 × 신약 = 「둘 다 헤아림」`)
  check(!r3.lines.some(l => /추진력이 떨어|이끌어가는 힘이 없|부족/.test(l)),
    `⛔ 「둘 다 신약」을 «깎아» 말하지 않습니다 (교재에 그 조합 판정이 없음)`)

  // ★온도가 서로 반대면 «반드시» 말하는가 (교재 232쪽 2번)
  const r4 = judgeVessel(V('가', '중화', '겨울'), V('나', '중화', '여름'))
  check(r4.lines.some(l => l.includes('온도가 «서로 반대»')),
    `★겨울 × 여름 — 온도가 서로를 눅여 준다고 말합니다`)

  const src = read('lib/saju/couple/step1Vessel.ts')
  const noC = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const shown1 = [...noC.matchAll(/'([^']{4,})'/g)].map(m => m[1]).join(' ')
  // ⛔ 「극신강」을 쓰지 않는가 — 교재에 없는 말
  check(!/극신강/.test(shown1.replace(/극신강»?이라는 말을 쓰지 마세요[^']*/g, '')),
    `⛔ 「극신강」을 손님께 쓰지 «않습니다» (교재에 없는 말)`)
  // ⛔ 사람을 깎는 말을 그대로 옮기지 않는가
  check(!/마마보이|마마걸|부부 불화|대단히 조심/.test(shown1),
    `⛔ 「마마보이·마마걸」·「부부 불화」를 그대로 쓰지 «않습니다»`)
  // ★신강약을 «다시 계산하지» 않는가
  check(!/judgeStrength|calcYongsin/.test(noC),
    `★신강약을 «받아» 씁니다 (PersonJudge.status · 다시 계산하지 않음)`)

  // ⚠️ 재료가 문지기를 지나는가
  const ti = read('lib/saju/toCoupleTongbyeonInput.ts')
  check(/vesselBlock: guardTone\(vesselOf/.test(ti), `★1단계 재료도 guardTone 을 지납니다`)
}

console.log('\n━━ ㊴ 🔴★재료의 «금지 안내문» 이 guardTone 에 바뀌지 않는가 ━━')
{
  //  🔴 2026-08-02 — 오늘 «다섯 번» 밟은 함정입니다.
  //    ① toneGuard 지을 때  ② 현침  ③ 천을귀인  ④ 연표  ⑤ ★1단계
  //    ⑤에서는 "「고집불통」 같은 말은 금지" 가 guardTone 에 바뀌어
  //    ★"「뜻이 아주 뚜렷함」 같은 말은 금지" 로 나갔습니다 — 뜻이 «뒤집혔습니다».
  //  ★금지어 목록은 toneGuard.BAN_NOTE «한 곳» 에만 둡니다.
  //    다른 재료 파일에는 «써야 할 말» 만 적습니다.
  const files = [
    'lib/saju/couple/step1Vessel.ts',
    'lib/saju/couple/step5Env.ts',
    'lib/saju/couple/step8Timeline.ts',
  ]
  const BAN_WORDS = ['고집불통', '이혼', '헤어짐', '악처', '바람기', '위기', '마마보이']
  for (const f of files) {
    const src = read(f)
    const noC = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    const pushed = [...noC.matchAll(/out\.push\('([^']*)'\)/g)].map(m => m[1]).join(' ')
    const bad = BAN_WORDS.filter(w => pushed.includes(w))
    check(bad.length === 0,
      `★${f.split('/').pop()} — 재료 안내문에 금지어를 «적지 않았습니다»${bad.length ? ' — ' + bad.join(',') : ''}`)
  }
  // ★그리고 guardTone 을 지나도 «뜻이 안 바뀌는가» — 전수로 봅니다
  const A = { name: '가', status: '신강' as const, season: '봄' as const,
    needEl: '화' as Ohaeng, needFrom: '억부' as const }
  const B = { name: '나', status: '신약' as const, season: '겨울' as const,
    needEl: '토' as Ohaeng, needFrom: '조후' as const }
  const raw = vesselBlock(A, B)
  check(guardTone(raw) === raw,
    `★★1단계 재료는 guardTone 을 지나도 «한 글자도 안 바뀝니다»`)
}

console.log('\n━━ ㊵ ★여덟 단계를 프롬프트로 엮기 (프리미엄 궁합 4차) ━━')
{
  //  🔴 [무엇이 있었나]  15~19차에 재료를 만들어 두고도
  //     buildCouplePrompt 가 «부르지 않아» 프롬프트에 «안 들어가고» 있었습니다.
  //     ⇒ 만들어만 두고 쓰지 않던 셈입니다.
  const A = {
    name: '가', gender: '남', birth: '1988-04-20',
    saju: ['년주', '월주', '일주', '시주'].map((p, i) => ({
      pillar: p, stem: ['戊', '丙', '乙', '庚'][i], branch: ['辰', '辰', '巳', '辰'][i],
    })), solarMonth: 4, solarDay: 20, hourBranch: '辰',
  }
  const B = {
    name: '나', gender: '여', birth: '1990-11-20',
    saju: ['년주', '월주', '일주', '시주'].map((p, i) => ({
      pillar: p, stem: ['甲', '丁', '丙', '己'][i], branch: ['子', '亥', '午', '丑'][i],
    })), solarMonth: 11, solarDay: 20, hourBranch: '丑',
  }
  const j = judgeCouple(A as never, B as never, (n: string) => n + '님의 배우자운', true)
  const m = toCoupleTongbyeonMaterial(A as never, B as never, j as never, { fromYear: 2026 })

  for (const rel of ['부부', '연인'] as const) {
    const p = buildCouplePrompt(m, { relation: rel })
    const sp = p.systemPrompt

    // ★재료 셋이 프롬프트에 «실제로» 들어갔는가
    check(sp.includes('그릇과 온도'), `★${rel} — 1단계 재료가 프롬프트에 들어갑니다`)
    check(sp.includes('함께 살아가는 결 — 월지'), `★${rel} — 5단계 재료가 들어갑니다`)
    check(sp.includes('앞으로의 열 해 — 두 분'), `★${rel} — 8단계 재료가 들어갑니다`)

    // ★뼈대에 새 대목 셋이 있는가
    check(/1-2\. 두 분은 어떤 분인가/.test(sp), `★${rel} — 「1-2 두 분은 어떤 분인가」`)
    check(/4-2\. 함께 살아가는 결/.test(sp), `★${rel} — 「4-2 함께 살아가는 결」`)
    check(/6-2\. 앞으로의 열 해/.test(sp), `★${rel} — 「6-2 앞으로의 열 해」`)

    // ⚠️⚠️ 옛 대목의 «번호와 제목» 이 한 글자도 안 바뀌었는가
    //    ★화면이 제목으로 카드를 찾습니다. 바꾸면 잘못 붙습니다. (26부 교훈)
    for (const old of [
      '2. 없는 오행을 채워 주는가', '3. 서로에게 귀인이 되는가',
      '4. 두 분 일주가 만나는 자리',
    ]) check(sp.includes(old), `⚠️ ${rel} — 옛 대목 「${old}」가 그대로입니다`)
    if (rel === '부부') {
      check(sp.includes('7. 두 분의 부부운'), `⚠️ 부부 — 「7. 두 분의 부부운」 그대로`)
      check(sp.includes('8. 두 분의 자식운'), `⚠️ 부부 — 「8. 두 분의 자식운」 그대로`)
      check(sp.includes('9. 맺는말'), `⚠️ 부부 — 「9. 맺는말」 그대로`)
    } else {
      check(sp.includes('7. 맺는말'), `⚠️ 연인 — 「7. 맺는말」 그대로`)
    }

    // ⚠️ 대목 수를 «박아 두지» 않는가 — 대목이 늘면 어긋납니다
    check(!/아홉 대목|일곱 대목/.test(sp), `⚠️ ${rel} — 대목 «수» 를 박아 두지 않습니다`)

    // ★금지어가 프롬프트에 «없는가»
    const BAD = ['이혼', '헤어짐', '악처', '바람기']
    const hit = BAD.filter(w => sp.includes(w))
    check(hit.length === 0, `★${rel} — 프롬프트에 금지어가 없습니다${hit.length ? ' — ' + hit.join(',') : ''}`)
  }

  // ★재료가 «없으면» 그 대목을 넣지 않는가 — 없는 것을 가리키면 AI 가 지어냅니다
  const empty = { ...m, vesselBlock: '', envBlock: '', timelineBlock: '' }
  const p2 = buildCouplePrompt(empty, { relation: '부부' })
  check(!/1-2\.|4-2\.|6-2\./.test(p2.systemPrompt),
    `★재료가 없으면 그 대목을 «아예 넣지 않습니다»`)
  check(/2\. 없는 오행을 채워 주는가/.test(p2.systemPrompt),
    `★그래도 옛 대목은 그대로 나옵니다`)

  // ★화면이 새 제목에 아이콘을 붙이는가
  const pg = read('app/manseryeok/couple-result-new/page.tsx')
  check(/t\.includes\('열 해'\)/.test(pg), `★「앞으로의 열 해」 아이콘이 있습니다`)
  check(/t\.includes\('어떤 분'\)/.test(pg), `★「두 분은 어떤 분인가」 아이콘이 있습니다`)
  check(/t\.includes\('함께 살아가는'\)/.test(pg), `★「함께 살아가는 결」 아이콘이 있습니다`)
}

console.log('\n━━ ㊶ ★★별점을 걷어냈는가 (프리미엄 궁합 5차) ━━')
{
  //  ★대표님 확정 (2026-08-02)
  //    "점수제는 없애고 «깊이» 로 상대하자"
  //    "별점은 없애고 «프리미엄 해설» 로 대신하는 걸로 하자"
  //
  //  ⚠️⚠️ «세 곳» 을 함께 꺼야 합니다. 한 곳만 끄면 다른 곳으로 새어 나옵니다 —
  //     ① 화면 (CoupleJudgeCard)
  //     ② 요약 (judgeToText — AI 재료로 갑니다)
  //     ③ 재료 (catBlock — ★여기를 빠뜨려 프롬프트에 별이 남았습니다)
  const A = {
    name: '가', gender: '남',
    saju: ['년주', '월주', '일주', '시주'].map((p, i) => ({
      pillar: p, stem: ['戊', '丙', '乙', '庚'][i], branch: ['辰', '辰', '巳', '辰'][i],
    })), solarMonth: 4, solarDay: 20, hourBranch: '辰',
  }
  const B = {
    name: '나', gender: '여',
    saju: ['년주', '월주', '일주', '시주'].map((p, i) => ({
      pillar: p, stem: ['甲', '丁', '丙', '己'][i], branch: ['子', '亥', '午', '丑'][i],
    })), solarMonth: 11, solarDay: 20, hourBranch: '丑',
  }
  const j = judgeCouple(A as never, B as never, (n: string) => n + '님의 배우자운', true)
  const m = toCoupleTongbyeonMaterial(A as never, B as never, j as never, { fromYear: 2026 })

  // ★★프롬프트에 별이 «하나도» 없는가 — 이것이 이 검사의 알맹이
  for (const rel of ['부부', '연인'] as const) {
    const sp = buildCouplePrompt(m, { relation: rel }).systemPrompt
    check(!/[★☆]{3}/.test(sp), `★★${rel} — 프롬프트에 별표(★★★)가 «하나도» 없습니다`)
  }
  check(!/[★☆]{3}/.test(m.judgeBlock), `★재료(judgeBlock)에 별표가 없습니다`)

  // ★점수를 만들지 말라는 지시가 있는가
  const sp2 = buildCouplePrompt(m, { relation: '부부' }).systemPrompt
  check(/점수·등급·별점/.test(sp2), `★「점수·등급·별점을 만들지 마세요」 지시가 있습니다`)
  check(/깊이/.test(sp2), `★「프리미엄의 값은 수치가 아니라 깊이」라고 일러 둡니다`)

  // ★화면에서 별을 그리지 않는가
  const card = read('app/manseryeok/couple-result-new/components/CoupleJudgeCard.tsx')
  check(!/\{cat\.stars && <StarRow/.test(card), `★화면이 별을 «그리지 않습니다»`)
  check(/별표를 «껐습니다»/.test(card), `⚠️ 왜 껐는지가 적혀 있습니다`)
  // ⚠️ 「지운」 것이 아니라 «감춘» 것인가 — 되살릴 수 있어야 합니다
  check(/function StarRow/.test(card), `⚠️ StarRow 를 «지우지» 않았습니다 (되살릴 때 필요)`)
  const inp = read('lib/saju/toCoupleTongbyeonInput.ts')
  check(/function starStr/.test(inp), `⚠️ starStr 을 «지우지» 않았습니다`)

  // ★판정(stars 값)은 «살아 있는가» — 검사와 카드 거르기가 씁니다
  const cats = (j as unknown as { cats: { stars?: number }[] }).cats
  check(cats.some(c => c.stars), `★stars 값 자체는 «그대로» 살아 있습니다`)
  check(/stars: bothGwiin \? 5 : oneGwiin \? 3 : 2/.test(read('lib/saju/coupleFilterV1.ts')),
    `★판정 규칙은 «건드리지 않았습니다»`)

  // ⚠️ 요약(judgeToText)에서도 뺐는가
  const pg = read('app/manseryeok/couple-result-new/page.tsx')
  check(!/lines\.push\(`\[\$\{c\.title\}\] \$\{star\(c\.stars\)\}`/.test(pg),
    `★요약(judgeToText)에서도 별을 «뺐습니다»`)
}

console.log('\n━━ ㊷ ★★목업 정본 화면·분량 개편 (44부 22차) ━━')
{
  const A = {
    name: '가', gender: '남',
    saju: ['년주', '월주', '일주', '시주'].map((p, i) => ({
      pillar: p, stem: ['己', '丁', '甲', '癸'][i], branch: ['酉', '卯', '午', '酉'][i],
    })), solarMonth: 3, solarDay: 20, hourBranch: '酉',
  }
  const B = {
    name: '나', gender: '여',
    saju: ['년주', '월주', '일주', '시주'].map((p, i) => ({
      pillar: p, stem: ['己', '戊', '壬', '辛'][i], branch: ['酉', '辰', '申', '亥'][i],
    })), solarMonth: 4, solarDay: 27, hourBranch: '亥',
  }
  const j = judgeCouple(A as never, B as never, (n: string) => n + '님의 배우자운', true)
  const m = toCoupleTongbyeonMaterial(A as never, B as never, j as never, { fromYear: 2026 })
  const sp = buildCouplePrompt(m, { relation: '부부' }).systemPrompt

  // ★★분량 — 「넘기지 마세요」가 «사라졌는가»
  check(!/1300~1600/.test(sp), `★★옛 상한(1300~1600자)이 «사라졌습니다»`)
  check(!/길면 화면에서 잘립니/.test(sp), `★★「길면 잘린다」는 «거짓» 이었습니다. 지웠습니다`)
  check(/5,000자 안팎/.test(sp), `★프리미엄 분량(5,000자 안팎)이 적혀 있습니다`)
  check(/넘겨도 «괜찮습니다»/.test(sp), `★넘겨도 된다고 «분명히» 말합니다`)

  // ★새 대목 셋에 «분량» 이 명시됐는가 — 없어서 버려지던 것
  check(/두 분은 어떤 분인가: 다섯 문단 이상/.test(sp), `★「두 분은 어떤 분인가」 분량 명시`)
  check(/함께 살아가는 결: 네 문단 이상/.test(sp), `★「함께 살아가는 결」 분량 명시`)
  check(/앞으로의 열 해: ★해마다/.test(sp), `★「앞으로의 열 해」 분량 명시`)

  // ⚠️ 43부 교훈 — «범위» 가 아니라 «이상» 으로
  check(/바닥이지 천장이 아닙니다/.test(sp), `⚠️ 「이상」이 바닥임을 못 박습니다 (43부 교훈)`)
  check(!/자 안팎 \(오행을 하나씩/.test(sp), `⚠️ 옛 「250자 안팎」식 지시가 없습니다`)

  // ★대목을 버리지 말라 — 실제로 셋이 사라졌던 자리
  check(/대목을 «하나도 건너뛰지 마세요»/.test(sp), `★대목을 버리지 말라고 못 박습니다`)
  check(/대목 셋이 통째로 사라졌습니다/.test(sp), `★그 일이 «실제로 일어났다» 고 알려 줍니다`)

  // ★솔루션 — 프리미엄의 값
  check(/"→ " 로 시작하는 줄로 «반드시» 맺으세요/.test(sp), `★솔루션을 「→」로 맺으라고 지시합니다`)
  check(/행동 지침 셋/.test(sp), `★맺음말에 「이번 주/이번 달/앞으로」 지침 셋`)

  // ★★화면 — 목업 정본
  const rep = read('app/manseryeok/couple-result-new/components/CoupleReport.tsx')
  check(!/useState|onClick|접기/.test(rep), `★★리포트가 «펼친 채» 입니다 (접기 없음)`)
  check(/GRAPH_IN/.test(rep), `★오행 그래프를 «해당 대목 안» 에 넣습니다 (대표님 지시로 살림)`)
  check(/isSol/.test(rep) && /→/.test(rep), `★「→」 솔루션 줄을 «따로» 눈에 띄게 그립니다`)

  const pg = read('app/manseryeok/couple-result-new/page.tsx')
  // 🔴 키 매핑을 «버렸는가» — 새 대목을 삼키던 자리
  check(!/tongByKey/.test(pg.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')),
    `★★통변을 «판정 카드 키» 에 매핑하지 «않습니다» (새 대목을 삼키던 자리)`)
  check(/<CoupleReport/.test(pg), `★목업 정본 리포트를 그립니다`)
  check(/reportSections/.test(pg), `★AI 가 쓴 대목을 «차례 그대로» 씁니다`)
  // ⚠️ 옛 부품을 «지우지» 않았는가 — 되살릴 때 필요합니다
  check(/import CoupleJudgeCard/.test(pg), `⚠️ CoupleJudgeCard 를 «지우지» 않았습니다`)
  // ★부록(도움이 되는 자리…)을 «없앴는가» — 목업에 없습니다
  check(!/<CoupleJudgeCard$/m.test(pg.replace(/\s+/g, ' ')) || !/tongByKey=/.test(pg),
    `★맨 아래 부록 섹션이 «사라졌습니다» (목업에 없음)`)

  // ★premium 을 보내는가 — 5,000자를 쓰려면 필요합니다
  check(/premium: true/.test(pg), `★premium: true 로 보냅니다 (max_tokens 16,000)`)
}

console.log('\n━━ ㊸ ★오행 그래프 «가운데 0» · A4 궁합서 (44부 23차) ━━')
{
  const g = read('app/manseryeok/couple-result-new/components/OhaengCompareCard.tsx')

  // ★가운데가 0 — 두 막대가 «바깥으로» 뻗습니다
  check(/양방향 막대로 바꿨습니다/.test(g), `★양방향으로 바꾼 기록이 있습니다`)
  check(/gridTemplateColumns: `\$\{NAME_W\}px 1fr 1fr \$\{NAME_W\}px`/.test(g),
    `★칸이 «이름 | 아내 | 남편 | 이름» 넷입니다`)
  check(/justifyContent: 'flex-end'/.test(g) && /justifyContent: 'flex-start'/.test(g),
    `★아내는 «왼쪽으로», 남편은 «오른쪽으로» 뻗습니다`)
  check(/left: '50%'/.test(g), `★가운데(50%)에 0 선이 있습니다`)

  // ★오행 이름이 «양끝» 에 대칭으로 (가운데가 아니라)
  const nameCells = (g.match(/\{name\}<\/div>/g) ?? []).length
  check(nameCells === 2, `★오행 이름이 «양끝» 에 둘입니다 (${nameCells})`)
  check(/★왼쪽 끝 이름/.test(g) && /★오른쪽 끝 이름 \(대칭\)/.test(g),
    `★왼쪽·오른쪽 끝에 대칭으로 둔다고 적혀 있습니다`)
  // ⚠️ 옛 배치(이름이 가운데)가 «남아 있지» 않은가
  check(!/width: 42, textAlign: 'center'/.test(g),
    `⚠️ 옛 «가운데 이름» 배치가 사라졌습니다`)

  // ★타이틀이 그래프 «위» 좌우로
  check(/★타이틀 — 그래프 «위» 좌우로/.test(g), `★「아내/남편」이 그래프 위 좌우에 있습니다`)

  // ⚠️ 계산을 «건드리지 않았는가» — CSS 만 바꾸라는 지시였습니다
  check(/compareOhaeng\(aScores, bScores\)/.test(g), `⚠️ 계산은 compareOhaeng 그대로입니다`)
  check(/EL_BG\[el\]/.test(g), `⚠️ 색은 EL_BG(연재쌤 지정) 그대로입니다`)

  // ★A4 궁합서
  const c = read('app/manseryeok/couple-result-new/components/CoupleCertificate.tsx')
  check(/@page \{ size: A4/.test(c), `★A4 규격을 지정합니다`)
  check(/window\.print\(\)/.test(c), `★브라우저 인쇄로 「PDF 저장」을 함께 줍니다`)
  // ⚠️ PDF 라이브러리를 더하지 «않았는가» (교훈 [의존])
  check(!/jspdf|html2canvas|html2pdf/i.test(c),
    `⚠️ PDF 라이브러리를 «더하지 않았습니다» (한글 글꼴·의존 교훈)`)
  const pkg3 = JSON.parse(read('package.json'))
  check(!Object.keys({ ...pkg3.dependencies, ...pkg3.devDependencies })
    .some(k => /jspdf|html2canvas|html2pdf/i.test(k)),
  `⚠️ package.json 에도 PDF 라이브러리가 «없습니다»`)

  // ★종이에서도 «가운데 0» 이 깨지지 않는가 — 대표님 지시
  check(/가운데가 0» 인 양방향/.test(c), `★종이도 «가운데 0» 양방향입니다`)
  check(/table-layout: fixed/.test(c),
    `★인쇄는 flex 대신 «표» 로 그립니다 (인쇄 엔진마다 flex 를 다르게 잽니다)`)
  check(/border-right: 1px solid #e0d6cc/.test(c), `★종이에도 가운데 0 선이 있습니다`)
  check(/\.onm\.r \{ text-align: right/.test(c) && /\.onm\.l \{ text-align: left/.test(c),
    `★종이도 이름이 «양끝» 에 대칭입니다`)
  // ★솔루션 줄이 «잘리지 않는가»
  check(/\.sol \{[\s\S]{0,200}page-break-inside: avoid/.test(c),
    `★「→」 솔루션이 쪽 경계에서 «잘리지 않습니다»`)
  check(/page-break-after: avoid/.test(c), `★제목만 홀로 남지 않습니다`)
  // ⚠️ 팝업이 막히면 «조용히 넘어가지» 않는가 (교훈 U)
  check(/팝업이 막혀 있어/.test(c), `⚠️ 팝업이 막히면 «알려 드립니다»`)

  // ⚠️ 값을 «다시 계산하지» 않는가 (교훈 CJ)
  const pg2 = read('app/manseryeok/couple-result-new/page.tsx')
  check(/compareOhaeng\(ohaeng1, ohaeng2\)/.test(pg2),
    `⚠️ 닮음·채움을 «한 창구»(compareOhaeng)에서 받습니다`)
  check(/A4 PDF저장\/인쇄/.test(pg2), `★화면에 「A4 PDF저장/인쇄」 버튼이 있습니다`)
  // ★2026-08-03 — 두 버튼을 «나란히» (대표님 지시)
  check(/flexDirection: 'row', gap: 8, alignItems: 'stretch'/.test(pg2),
    `★A4·해설복사 버튼이 «가로로» 나란히 있습니다`)
  check(/className="copy-half"/.test(pg2) && /\.copy-half > button \{ width: 100%/.test(pg2),
    `⚠️ 공용 부품(CopyTextButton)을 «고치지 않고» 감싼 자리에서 너비를 맞춥니다`)
  const copySrc = read('app/components/common/CopyTextButton.tsx')
  check(/fullWidth = true/.test(copySrc), `⚠️ 공용 부품의 기본값을 «건드리지 않았습니다»`)
  check(/reportSections\.length > 0 &&[\s\S]{0,200}onPrintCert/.test(pg2),
    `⚠️ 통변이 «다 나온 뒤» 에만 버튼이 보입니다 (반쪽 궁합서를 막습니다)`)
}

console.log('\n━━ ㊹ ★삭제 확인 팝업 — «한 부품» 으로 통일했는가 (44부 25차) ━━')
{
  // ⚠️ 교훈 1-1 — 낱말로 소스를 훑으면 «제 주석» 까지 걸립니다.
  //    ★주석을 «먼저 지우고» 봅니다.
  const noComment = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  const DLG = 'app/components/common/ConfirmDeleteDialog.tsx'
  const dlg = noComment(read(DLG))

  // ★말투가 «한 곳» 에 모여 있는가
  check(/TITLE = '정말 삭제할까요\?'/.test(dlg), `★제목이 「정말 삭제할까요?」 한 곳에 있습니다`)
  check(/WARN = '삭제하면 되돌릴 수 없어요\.'/.test(dlg), `★「삭제하면 되돌릴 수 없어요.」를 부품이 «언제나» 붙입니다`)
  check(/CANCEL_LABEL = '취소'/.test(dlg) && /CONFIRM_LABEL = '삭제'/.test(dlg),
    `★버튼은 «취소·삭제» 입니다`)
  check(/BUSY_LABEL = '삭제 중…'/.test(dlg), `★지우는 동안 「삭제 중…」 으로 잠깁니다`)
  check(/contained/.test(dlg), `★모달 «안» 에서도 쓸 수 있습니다 (인물 고르기)`)

  // ★열한 화면이 «모두» 그 부품을 부르는가
  const SCREENS = [
    'app/manseryeok/couple-storage/page.tsx',
    'app/manseryeok/saju-storage/page.tsx',
    'app/manseryeok/mulsang-storage/page.tsx',
    'app/tarot/storage/page.tsx',
    'app/manseryeok/naming/components/NamingStorageView.tsx',
    'app/manseryeok/wedding-timing/wedding-storage/page.tsx',
    'app/manseryeok/birth-timing/birth-storage/page.tsx',
    'app/manseryeok/moving-timing/moving-storage/page.tsx',
    'app/manseryeok/career/page.tsx',
    'app/manseryeok/exam-luck/page.tsx',
    'app/manseryeok/components/PersonPickerModal.tsx',
  ]
  const uses = SCREENS.filter(p => /<ConfirmDeleteDialog/.test(noComment(read(p))))
  check(uses.length === SCREENS.length,
    `★삭제 확인이 뜨는 «열한 화면» 이 모두 공용 팝업을 씁니다 (${uses.length}/${SCREENS.length})`)

  // ⚠️⚠️ 어느 화면에도 «제 손으로 지은» 팝업이 남아 있지 않은가
  //    ★이것이 갈래 넷으로 갈라졌던 까닭입니다. 한 곳이라도 남으면 다시 갈라집니다.
  const OWN = /정말 삭제할까요|지울까요|되돌릴 수 없어요|그대로 둘게요|지울게요/
  const leaked = SCREENS.filter(p => OWN.test(noComment(read(p))))
  check(leaked.length === 0,
    `⚠️ 화면이 «제 팝업 문구» 를 따로 들고 있지 «않습니다»${leaked.length ? ' — ' + leaked.join(', ') : ''}`)

  // ⚠️ 옛 갈래 ②(「이 기록을 지울까요? / 그대로 둘게요·지울게요」)가 사라졌는가
  check(!/그대로 둘게요/.test(noComment(read('app/manseryeok/career/page.tsx'))) &&
        !/그대로 둘게요/.test(noComment(read('app/manseryeok/exam-luck/page.tsx'))),
    `★진로적성·합격운의 «다른 말투» 가 사라졌습니다`)

  // ⚠️ 부품이 «둘» 이 되지 않았는가 — 공용 부품 자리에 하나뿐이어야 합니다
  const twins = SCREENS.filter(p => /position: (contained \? 'absolute' : )?'fixed', inset: 0, zIndex: 50/.test(noComment(read(p))) && OWN.test(noComment(read(p))))
  check(twins.length === 0, `⚠️ 팝업을 «다시 지은» 화면이 없습니다`)
}

console.log('\n━━ ㊺ ★보관함 열 곳이 «한 모습» 인가 (44부 26차) ━━')
{
  // ⚠️ 교훈 1-1 — 주석을 «먼저 지우고» 봅니다
  const noComment = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  const shell = noComment(read('app/components/common/StorageShell.tsx'))
  const row = noComment(read('app/components/common/StorageRow.tsx'))

  // ★한 모습이 «한 곳» 에 모여 있는가
  check(/bg: '#FDF6F0'/.test(shell) && /card: '#FFFBF7'/.test(shell) && /line: '#f0e0d5'/.test(shell),
    `★바탕·카드·선 색이 S 한 곳에 있습니다`)
  check(/btn: '#b46e46'/.test(shell), `★아래 버튼 색이 «하나» 입니다 (서비스별 색을 걷어냄)`)
  check(/fontSize: 16, fontWeight: 500, color: S\.ink/.test(shell), `★머리말 제목이 16·500 하나입니다`)
  check(/\{count\}건/.test(shell), `★「N건」을 부품이 그립니다`)
  check(/보관함을 불러오는 중…/.test(shell), `★기다리는 글이 하나입니다`)
  check(/width: 28, height: 28, borderRadius: 8/.test(row) && /color: S\.del/.test(row),
    `★✕ 버튼이 28×28 한 모양입니다`)
  check(/e\.stopPropagation\(\)/.test(row), `⚠️ ✕ 가 카드 누르기와 겹치지 않게 부품이 막습니다`)

  const SCREENS = [
    'app/manseryeok/couple-storage/page.tsx',
    'app/manseryeok/saju-storage/page.tsx',
    'app/manseryeok/mulsang-storage/page.tsx',
    'app/tarot/storage/page.tsx',
    'app/manseryeok/naming/components/NamingStorageView.tsx',
    'app/manseryeok/wedding-timing/wedding-storage/page.tsx',
    'app/manseryeok/birth-timing/birth-storage/page.tsx',
    'app/manseryeok/moving-timing/moving-storage/page.tsx',
    'app/manseryeok/career/page.tsx',
    'app/manseryeok/exam-luck/page.tsx',
  ]
  const src = SCREENS.map(p => [p, noComment(read(p))] as const)

  check(src.every(([, s]) => /<StorageShell/.test(s)),
    `★보관함 «열 곳» 이 모두 StorageShell 을 씁니다 (${src.filter(([, s]) => /<StorageShell/.test(s)).length}/10)`)
  check(src.every(([, s]) => /<StorageRow/.test(s)),
    `★열 곳이 모두 StorageRow 를 씁니다`)

  // ⚠️⚠️ 화면이 «제 틀» 을 다시 들고 있지 않은가 — 이것이 열 벌로 갈라졌던 까닭입니다
  const ownShell = src.filter(([, s]) =>
    /position: 'sticky', top: 0, zIndex: \d+,/.test(s) || /backdropFilter: 'blur\(10px\)'/.test(s))
  check(ownShell.length === 0,
    `⚠️ 화면이 «제 머리말» 을 따로 그리지 않습니다${ownShell.length ? ' — ' + ownShell.map(x => x[0]).join(', ') : ''}`)

  const ownRow = src.filter(([, s]) =>
    /flexShrink: 0, width: 28, height: 28, borderRadius: 8/.test(s))
  check(ownRow.length === 0,
    `⚠️ 화면이 «제 ✕ 버튼» 을 따로 그리지 않습니다${ownRow.length ? ' — ' + ownRow.map(x => x[0]).join(', ') : ''}`)

  // ⚠️ 보관함에 «서비스 색» 이 남아 있지 않은가 (대표님 지시)
  const leftColor = src.filter(([, s]) =>
    /background: (ACCENT|accent|info\.accent|SOFT)\b/.test(s))
  check(leftColor.length === 0,
    `★서비스별 색이 남아 있지 않습니다${leftColor.length ? ' — ' + leftColor.map(x => x[0]).join(', ') : ''}`)

  // 🔴 「궁합 궁합」 — 말이 겹치던 자리
  const cp = noComment(read('app/manseryeok/couple-storage/page.tsx'))
  check(!/\{info\.badge\} 궁합/.test(cp), `🔴 「궁합 궁합」이 사라졌습니다`)
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
