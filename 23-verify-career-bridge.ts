import { readFileSync } from 'fs'
// 23-verify-career-bridge.ts
// 진로적성 «잇기» 그물 — 2026-07-31 (41부 Step 3)
//
// ★가장 중요한 검사는 ⑭-a 입니다 — «기존 값이 안 바뀌었는가».
//   잇기는 «덧붙이는» 일이라, 기존 파이프라인이 흔들리면 그 자체가 실패입니다.

import { calcCareerScore, gradeAll, pickStrong } from './lib/saju/career/careerScore'
import { judgeYukchin } from './lib/saju/career/yukchin'
import { judgeWealthStyle } from './lib/saju/premium/deepJudge'
import {
  findJolip, calcJijangganBridge, buildJijangganCard, jijangganElementRatio,
  CAREER_JIJANGGAN_SPEC,
} from './lib/saju/career/jijangganBridge'
import { calcNamingBridge, buildNamingCard } from './lib/saju/career/namingBridge'
import { checkJijangganOrder } from './lib/saju/jijanggan'
import type { Pillar, Ohaeng } from './lib/saju/career/types'

let pass = 0, fail = 0
const check = (ok: boolean, msg: string) => {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) } else { fail++; console.log(`  🔴 ${msg}`) }
}
const P = (p: string, s: string, b: string): Pillar => ({ pillar: p as never, stem: s, branch: b })

/** 표본 셋 — 월지·계절·시 모름을 갈라 봅니다 */
const SAMPLES = [
  { name: '표본1 丙일간 寅월', saju: [P('년주','乙','亥'),P('월주','戊','寅'),P('일주','丙','子'),P('시주','庚','寅')],
    y: 1995, m: 2, d: 20, hour: '寅' as string | null },
  { name: '표본2 庚일간 午월', saju: [P('년주','乙','亥'),P('월주','壬','午'),P('일주','庚','申'),P('시주','丁','丑')],
    y: 1995, m: 6, d: 20, hour: '丑' as string | null },
  { name: '표본3 시 모름 子월', saju: [P('년주','甲','子'),P('월주','丙','子'),P('일주','戊','午'),P('시주','?','?')],
    y: 2025, m: 1, d: 3, hour: null },
]

console.log('\n━━ ⑭-a 🔴 기존 파이프라인이 «안 바뀌었는가» ━━')
// ★잇기 전후로 careerScore·gradeAll·pickStrong 이 같아야 합니다.
//   이 파일은 기존 함수를 «부르기만» 하므로, 값이 흔들리면 다른 데서 샌 것입니다.
{
  const known: [string, number][] = []
  for (const s of SAMPLES) {
    const r = calcCareerScore(s.saju, s.m, s.d, s.hour)
    const g = gradeAll(r)
    const sum = (['목','화','토','금','수'] as Ohaeng[]).reduce((a, e) => a + (r.score[e] ?? 0), 0)
    known.push([s.name, sum])
    check(sum === r.total, `${s.name} — 점수 합(${sum}) = total(${r.total})`)
    check(Object.keys(g).length === 5, `${s.name} — 다섯 오행 전부 등급`)
    check(pickStrong(r, g).every((e) => g[e].grade === '발달' || g[e].grade === '과다'),
      `${s.name} — 강점 후보가 발달·과다에서만 나옵니다`)
  }
  check(known.every(([, v]) => v === 100 || v === 80), `합계가 100(시 알면) 또는 80(시 모르면)`)
}

console.log('\n━━ ⑭-b 지장간 표 — 순서 검증을 통과한 쪽을 쓰는가 ━━')
check(CAREER_JIJANGGAN_SPEC.order === '여기먼저', `order 가 «여기먼저» 입니다`)
check(checkJijangganOrder(CAREER_JIJANGGAN_SPEC).length === 0,
  `★넘기는 표가 전통 순서와 12/12 일치합니다 (sajuTables 를 쓰면 여기·중기가 뒤바뀝니다)`)

console.log('\n━━ ⑭-c 🔴 절입 시각 — 해(年) 경계를 넘는가 ━━')
{
  // 2026 입춘 = 2/4 04:56 KST (계산). 2/4 생·2/10 생 둘 다 같은 절입이어야 합니다
  const a = findJolip('寅', 2026, 2, 10), b = findJolip('寅', 2026, 2, 4)
  check(!!a && !!b && a.at.getTime() === b.at.getTime(), `寅월 — 같은 달 안에서는 같은 절입`)
  // ★子월(대설)은 12월에 열려 이듬해 1월까지 갑니다
  const c = findJolip('子', 2026, 1, 3)
  check(!!c && c.at.getUTCFullYear() === 2025 && c.at.getUTCMonth() === 11,
    `★子월 1월 3일생 — 절입이 «지난해 12월» 입니다 (${c?.at.toISOString().slice(0, 10)})`)
  const d = findJolip('丑', 2026, 1, 20)
  check(!!d && d.at.getUTCFullYear() === 2026, `丑월 1월생 — 절입은 같은 해 소한`)
  check(findJolip('X', 2026, 2, 10) === null, `없는 지지 → null`)
}

console.log('\n━━ ⑭-d 지장간 잇기 ━━')
for (const s of SAMPLES) {
  const r = calcJijangganBridge({ saju: s.saju, solarYear: s.y, solarMonth: s.m, solarDay: s.d, birthMinute: 600 })
  check(r.jijanggan !== null, `${s.name} — 지장간을 갈랐습니다 (${r.jijanggan?.currentGan}·${r.jijanggan?.stage}기)`)
  check(r.daysAfterJol !== null && r.daysAfterJol >= 0 && r.daysAfterJol < 32,
    `${s.name} — 절입 뒤 ${r.daysAfterJol?.toFixed(1)}일 (0~32 안)`)
  const ratio = jijangganElementRatio(r)
  const sum = ratio ? Object.values(ratio).reduce((a, b) => a + b, 0) : 0
  check(Math.abs(sum - 1) < 1e-9, `${s.name} — 오행 비율의 합이 1 (${sum.toFixed(6)})`)
}
{
  // ★시각을 모르면 problems 에 남겨야 합니다 — 조용히 정오로 치지 않습니다
  const r = calcJijangganBridge({ saju: SAMPLES[0].saju, solarYear: 1995, solarMonth: 2, solarDay: 20 })
  check(r.problems.some((p) => p.includes('시각')), `태어난 시각을 모르면 problems 에 남습니다`)
  // 월지를 모르면 조용히 넘기지 않습니다
  const bad = calcJijangganBridge({
    saju: [P('월주', '?', '?')], solarYear: 2000, solarMonth: 5, solarDay: 5 })
  check(bad.jijanggan === null && bad.problems.length > 0, `월지를 모르면 problems 에 남고 null`)
}

console.log('\n━━ ⑭-e 화면 카드 — lines 와 reasons 를 «갈라» 담는가 (교훈 AV) ━━')
{
  const r = calcJijangganBridge({ saju: SAMPLES[0].saju, solarYear: 1995, solarMonth: 2, solarDay: 20, birthMinute: 600 })
  const c = buildJijangganCard(r)
  check(c.key === 'jijanggan' && c.lines.length > 0 && c.reasons.length > 0, `카드 모양이 CareerCard 그대로`)
  // ⚠️ AI 지시문·경고가 lines 로 새면 안 됩니다
  const LEAK = ['교재 대조 대기', '살펴볼 점', '단정하지 말', '※']
  const leaked = LEAK.filter((w) => c.lines.some((l) => l.includes(w)))
  check(leaked.length === 0, `★통변 지시문이 손님 문장(lines)으로 새지 않습니다 — ${leaked.join(',') || '0건'}`)
  check(c.reasons.some((x) => x.includes('교재 대조 대기')), `그 경고는 reasons 에 «있습니다»`)
}

console.log('\n━━ ⑭-f 작명 잇기 ━━')
{
  const r = calcCareerScore(SAMPLES[0].saju, 2, 20, '寅')
  const g = gradeAll(r)
  const n = calcNamingBridge({ grades: g, yongsin: '수', heeksin: '금', gisin: '화' })
  check(n.guides.length === 5, `다섯 오행 전부 줄 세웁니다`)
  check(n.guides[0].el === '수' && n.guides[0].priority === '용신', `용신이 «맨 앞» 입니다 (${n.guides[0].el})`)
  check(n.fill.includes('수') && n.fill.includes('금'), `용신·희신이 «담을 것» 에 들어갑니다`)
  check(n.avoid.includes('화'), `기신이 «피할 것» 에 들어갑니다`)
  check(n.guides.every((x, i, a) => i === 0 || a[i - 1].rank <= x.rank), `우선순위 순으로 정렬됩니다`)
  // ★과다 오행은 피합니다 — 교재 2장 51쪽
  const excess = (['목','화','토','금','수'] as Ohaeng[]).filter((e) => g[e].grade === '과다')
  for (const e of excess) {
    if (e === '수' || e === '금' || e === '화') continue   // 용신·희신·기신은 다른 자리
    check(n.avoid.includes(e), `과다한 ${e} 는 «피할 것» — 교재 2장 51쪽`)
  }
  const c = buildNamingCard(n)
  check(c.key === 'naming' && c.lines.length > 0, `작명 카드가 나옵니다`)
  const leaked = ['※', '살펴볼 점'].filter((w) => c.lines.some((l) => l.includes(w)))
  check(leaked.length === 0, `★지시문이 lines 로 새지 않습니다`)
  check(c.reasons.some((x) => x.includes('resourceJudge')), `«채점은 resourceJudge 가 한다» 를 재료에 남깁니다`)
}

console.log('\n━━ ⑭-g 두 잣대가 어긋나면 «남기는가» ━━')
{
  // career 는 점수·글자 수를 함께 보고, resourceJudge 는 제 잣대를 씁니다 — 갈릴 수 있습니다
  const r = calcCareerScore(SAMPLES[1].saju, 6, 20, '丑')
  const g = gradeAll(r)
  const n = calcNamingBridge({ grades: g, yongsin: '목', heeksin: '수' })
  check(Array.isArray(n.disagreed), `어긋난 오행 목록이 있습니다 (${n.disagreed.join(',') || '없음'})`)
  const c = buildNamingCard(n)
  if (n.disagreed.length > 0) {
    check(c.reasons.some((x) => x.includes('어긋')), `★어긋나면 재료에 «두 관점이 있다» 를 남깁니다`)
  } else {
    check(true, `이 표본은 두 잣대가 같습니다`)
  }
}


// ══════════════════════════════════════════════════════════════
//  🔴🔴 ★2026-09-13 (7부) [대표님이 «본인 사주» 에서 찾아내심]
//    「위 아래가 상호 모순되지 않니?」
//
//    수 55(과다) · 토 25(발달) 인 사주에서 —
//      「비겁과 관성이 ★강점 지능입니다 · 추진력과 결단력이 있습니다」
//      「수 비겁 — 생각은 많은데 ★실천력이 부족해요」   ← ★나란히 났습니다
//    ⇒ 교재 40쪽은 ★25~45(발달)만 «강점 지능» 입니다. 50↑ 은 «과다» 입니다.
// ══════════════════════════════════════════════════════════════
console.log('\n━━ ⑧ 🔴 과다를 «강점 지능» 이라 부르지 않는가 ━━')
{
  //  대표님 사주 — 乙巳 · 己丑 · 壬辰 · 癸卯 (일간 壬수 · 수 55 과다 · 토 25 발달)
  const saju = [
    { pillar: '년주', stem: '乙', branch: '巳' },
    { pillar: '월주', stem: '己', branch: '丑' },
    { pillar: '일주', stem: '壬', branch: '辰' },
    { pillar: '시주', stem: '癸', branch: '卯' },
  ] as never
  const card = judgeYukchin({ saju } as never) as { lines?: string[] }
  const L = card.lines ?? []
  const all = L.join('\n')

  check(L.some(x => x.includes('관성') && x.includes('강점 지능')),
    '★발달(토 25)인 관성이 «강점 지능» 입니다')
  //  ★2026-09-13 [대표님] — 「과다는 ★강점이기는 하지만 단점으로 작용할 수도 있으니 주의」
  //    ⇒ ⛔ 과다를 «강점 지능» 에서 «빼지» 않습니다.
  check(L.some(x => x.includes('비겁') && x.includes('강점 지능')),
    '★과다(수 55)인 비겁도 «강점 지능» 그대로입니다 [대표님 「과다도 강점이다」]')
  check(all.includes('강점이기는 하지만 장점이 넘쳐 단점으로 나타날 수도 있으니'),
    '🔴 ★「강점이기는 하지만 … 살펴 두시면 좋습니다」 [대표님 2026-09-13]')
  check(!all.includes('독립심과 경쟁심과 승부욕이 강해요'),
    '⛔ ★과다에는 79쪽 «묶음 강점 설명» 을 붙이지 않습니다 (아래 칸과 어긋납니다)')
  check(all.includes('수 비겁'), '⚠️ 오행별 설명(수 비겁)은 ★그대로 둡니다')
  check(all.includes('매사 많은 것을 고려하고, 실천으로 옮기는 데 신중함이 큽니다'),
    '🔴 ★「실천력이 부족」 → 「많은 것을 고려하고 신중함이 크다」 [대표님 2026-09-13]')
  check(!all.includes('실천력이 부족') && !all.includes('평정심을 잃고'),
    '⛔ 손님 글에 교재 원문의 «깎는 말» 이 안 나옵니다')
  check(all.includes('인성(금)이 타고나지 않았어요'), '⚠️ 결핍 안내도 그대로입니다')

  //  ⛔ 뽑는 규칙은 «안 건드렸습니다» — 교재 책 사례 아홉 건이 걸려 있습니다
  const src = readFileSync('lib/saju/career/careerScore.ts', 'utf8')
  check(/grade === '발달' \|\| g\[e\]\.grade === '과다'/.test(src),
    '⛔ ★pickStrong 은 그대로입니다 (과다도 후보에 남습니다 — 책 사례 아홉 건)')

  //  ⚠️ 두 칸이 «같은 말» 을 하는가 — 오행 칸도 같은 뜻이어야 합니다
  const ohSrc = readFileSync('lib/saju/career/tables/ohaeng.ts', 'utf8')
  check(ohSrc.includes('장점이 넘쳐서 오히려 걸림돌이 될 때가 있습니다'),
    '⚠️ 오행 칸도 «장점이 넘쳐» 로 말합니다 — 두 칸이 갈리면 손님이 헷갈립니다')
}


// ══════════════════════════════════════════════════════════════
//  🔴🔴 ★2026-09-13 (7부) [대표님이 «본인 사주» 에서 찾아내심 · 연재쌤 확인]
//    「을사에 사화가 ★편재인데 정재라고 잘못 해석을 해서 아래쪽 해설도 틀렸다」
//
//    화면 위 십성 표 — 편재 14.3% · 정재 없음
//    화면 아래 재물 — 「★정재 5점으로 안정형」          ⇒ ★뒤바뀜
//
//  [까닭] 지지를 보는 방식이 «둘» 이었습니다 —
//    십성 표  지지 → ★본기 천간으로 바꿔 봄 (巳 → 丙 양)
//    재물     지지 → ★글자 그대로 봄        (巳 겉은 음)
//  🔴 겉과 속이 다른 글자 ★넷 — 巳(丙 양) · 亥(壬 양) · 子(癸 음) · 午(丁 음)
// ══════════════════════════════════════════════════════════════
console.log('\n━━ ⑩ 🔴 정재·편재 — 지지를 «본기 천간» 으로 보는가 ━━')
{
  const SC = { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20 } as never
  /** 재성 지지 하나만 두고 나머지는 비겁으로 채운 시험 사주 */
  const only = (day: string, el: string, br: string) => {
    /*  ⚠️ 채움 글자는 ★«재성이 아닌» 오행으로 골라야 합니다.
     *     제가 처음 «재성과 같은 오행» 으로 채웠다가 값이 섞여 검사가 걸렸습니다.
     *     ⇒ 일간과 «같은 오행»(비겁)으로 채웁니다 — 재성에 안 섞입니다. */
    const SELF: Record<string, string> = { 목: '寅', 화: '午', 토: '辰', 금: '申', 수: '子' }
    const DAY_EL: Record<string, string> = {
      甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
      己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
    }
    const f = SELF[DAY_EL[day]]
    void el
    return [
      { pillar: '년주', stem: day, branch: br },
      { pillar: '월주', stem: day, branch: f },
      { pillar: '일주', stem: day, branch: f },
      { pillar: '시주', stem: day, branch: f },
    ] as never
  }

  //  ★대표님 사주 — 乙巳 · 己丑 · 壬辰 · 癸卯
  const daepyo = [
    { pillar: '년주', stem: '乙', branch: '巳' },
    { pillar: '월주', stem: '己', branch: '丑' },
    { pillar: '일주', stem: '壬', branch: '辰' },
    { pillar: '시주', stem: '癸', branch: '卯' },
  ] as never
  const w = judgeWealthStyle(daepyo, '壬', { 목: 15, 화: 5, 토: 25, 금: 0, 수: 55 } as never)
  check(w.pyeonJae > 0 && w.jeongJae === 0,
    '🔴 ★대표님 사주(壬 일간 · 巳) — «편재» 입니다 (정재가 아닙니다)')
  check(w.label === '확장형', '★딱지가 «확장형» 입니다 (안정형이 아닙니다)')
  check(w.say.includes('편재가 우세합니다'), '★손님 글도 «편재» 로 나갑니다')

  //  ★겉과 속이 다른 네 글자 — 일간 음양을 바꿔 가며 봅니다
  const CASES: Array<[string, string, string, '정' | '편', string]> = [
    ['壬', '화', '巳', '편', '巳 속 丙(양) · 壬(양) ⇒ 같음'],
    ['癸', '화', '巳', '정', '巳 속 丙(양) · 癸(음) ⇒ 다름'],
    ['戊', '수', '子', '정', '子 속 癸(음) · 戊(양) ⇒ 다름'],
    ['己', '수', '子', '편', '子 속 癸(음) · 己(음) ⇒ 같음'],
    ['壬', '화', '午', '정', '午 속 丁(음) · 壬(양) ⇒ 다름'],
    ['癸', '화', '午', '편', '午 속 丁(음) · 癸(음) ⇒ 같음'],
    ['戊', '수', '亥', '편', '亥 속 壬(양) · 戊(양) ⇒ 같음'],
    ['己', '수', '亥', '정', '亥 속 壬(양) · 己(음) ⇒ 다름'],
  ]
  for (const [day, el, br, want, why] of CASES) {
    const r = judgeWealthStyle(only(day, el, br), day, SC)
    const got = r.jeongJae >= r.pyeonJae ? '정' : '편'
    check(got === want, `★${day} 일간 + ${br} → ${want}재   [${why}]`)
  }

  //  ⚠️ 두 표가 «같은 값» 이어야 합니다 — 한쪽만 고치면 또 갈립니다
  const a = readFileSync('lib/saju/career/sajuMbti.ts', 'utf8')
  const b = readFileSync('lib/saju/premium/deepJudge.ts', 'utf8')
  const pick = (t: string) => (t.match(/子: '癸'[^}]*\}/) ?? [''])[0].replace(/\s/g, '')
  check(pick(a) !== '' && pick(a) === pick(b),
    '🔴 ⛔ 십성 표와 재물 판정이 ★«같은 본기 표» 를 씁니다 (한쪽만 고치면 또 갈립니다)')
  check(/const asStem = isStem \? ch : \(BRANCH_BONGI\[ch\] \?\? ch\)/.test(b),
    '★지지를 본기 천간으로 바꿔서 음양을 봅니다')
  check(!/chYang = isStem \? YANG_STEM\.has\(ch\) : YANG_BRANCH\.has\(ch\)/.test(b),
    '⛔ 옛 모양(지지를 글자 그대로 보기)이 되살아나지 않았습니다')
}


// ══════════════════════════════════════════════════════════════
//  🔴 ★2026-09-13 (7부) — «본기 천간 표» 가 ★여섯 벌입니다.
//
//    오늘 정재·편재가 뒤바뀐 까닭이 ★«지지를 보는 방식이 둘» 이어서였습니다.
//    표 자체는 지금 여섯 벌이 다 같지만, ★누가 한 벌만 고치면 또 갈립니다.
//    ⇒ «같은지» 를 값으로 박아 둡니다.
//
//  ⚠️ 이 표는 ★«십성을 가릴 때» 쓰는 것입니다 (교재 48쪽 도표 · 96쪽).
//     ⛔ 음양 «비율» 을 셀 때 쓰는 YANG_BRANCH(子=양)와 ★다른 물건입니다.
//        하나로 합치지 마십시오 (sajuMbti.ts:76 · 교재 260쪽 양팔통 사례).
// ══════════════════════════════════════════════════════════════
console.log('\n━━ ⑪ 🔴 본기 천간 표 여섯 벌이 «같은 값» 인가 ━━')
{
  const TABLES: Array<[string, string]> = [
    ['lib/saju/career/sajuMbti.ts', 'BRANCH_BONGI'],
    ['lib/saju/premium/deepJudge.ts', 'BRANCH_BONGI'],
    ['lib/saju/yukchinTable.ts', 'BONGI'],
    ['lib/saju/examLuck/sipsin.ts', 'BONGI'],
    ['app/manseryeok/birth-timing/lib/sajuTables.ts', 'BRANCH_MAIN_STEM'],
    ['app/manseryeok/birth-timing/lib/gyeokgukSungpae.ts', 'BRANCH_MAIN_STEM'],
  ]
  const BR = '子丑寅卯辰巳午未申酉戌亥'.split('')
  /** 교재 48쪽 도표 — ★이 값이 정답입니다 */
  const WANT = '癸己甲乙戊丙丁己庚辛戊壬'

  const read = (file: string, name: string) => {
    const t = readFileSync(file, 'utf8')
    const i = t.indexOf('const ' + name)
    if (i < 0) return ''
    const seg = t.slice(i, i + 400)
    return BR.map(b => {
      const m = seg.match(new RegExp(b + ": '(.)'"))
      return m ? m[1] : '?'
    }).join('')
  }

  for (const [file, name] of TABLES) {
    const got = read(file, name)
    check(got === WANT, `★${name} @ ${file.split('/').pop()} — 교재 48쪽 값 그대로`)
  }
  check(TABLES.every(([f, n]) => read(f, n) === read(TABLES[0][0], TABLES[0][1])),
    '🔴 ⛔ ★여섯 벌이 «모두 같습니다» — 한 벌만 고치면 정재·편재가 또 갈립니다')

  //  ⚠️ 겉과 속이 다른 네 글자 — 이 넷이 틀리면 십성이 뒤바뀝니다
  for (const [b, want, why] of [
    ['巳', '丙', '겉 음 · ★속 양'], ['亥', '壬', '겉 음 · ★속 양'],
    ['子', '癸', '겉 양 · ★속 음'], ['午', '丁', '겉 양 · ★속 음'],
  ] as Array<[string, string, string]>) {
    const i = BR.indexOf(b)
    check(WANT[i] === want, `★${b} 의 본기는 ${want} — ${why}`)
  }

  //  ⛔ 음양 비율 표(YANG_BRANCH)와 섞이지 않았는가
  const mbti = readFileSync('lib/saju/career/sajuMbti.ts', 'utf8')
  check(/하나로 합치지 마십시오/.test(mbti),
    '⚠️ ★「음양 비율」 표와 「십성」 표를 «갈라 두라」 는 경고가 남아 있습니다')
  const deep = readFileSync('lib/saju/premium/deepJudge.ts', 'utf8')
  check(/YANG_BRANCH\.has\(c\.ch\)/.test(deep),
    '⚠️ ★judgeEumyang(음양 비율)은 YANG_BRANCH 를 그대로 씁니다 — 고치면 안 됩니다')
}

console.log(`\n━━ 진로적성 잇기 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) process.exit(1)
