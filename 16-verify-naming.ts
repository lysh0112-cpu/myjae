// 16-verify-naming.ts
// 성명학(작명·개명) 검사 그물 — ★prebuild 관문에 걸 수 있습니다
//
// ══════════════════════════════════════════════════════════════════
//  [왜 이 파일이 생겼나]  2026-07-30 · 2단계
//
//    naming 은 다섯 그물(대운·일곱갈래·격국·합·발행) 어디에도 없었습니다.
//    그래서 1단계가 찾은 사고(DB 자원오행이 한자인데 코드가 날것으로 씀 —
//    무작위 4,000개에서 종합 등급 64.8%가 틀렸던 자리)가
//    **아무 그물에도 걸리지 않고 몇 달을 지났습니다.**
//
//    1단계가 세운 표준(다섯 값 · 공백 0 · 창구 하나)과
//    2단계가 세운 판정(용신·과다·결핍·기신)이 무너지지 않게 잠급니다.
//
//  [돌리는 법]
//      npx tsx 16-verify-naming.ts            요약
//      npx tsx 16-verify-naming.ts --dist     걸림 비율 분포까지 (교훈 BO)
//
//  ⚠️ 이 파일은 **망을 부르지 않습니다.** 순수 함수만 검사하므로 prebuild 에 걸 수 있습니다.
//     DB 쪽 검사(자원오행 다섯 값·공백·중복)는 _SQL_hanja_stage1_20260730.sql 의
//     STEP 0·1·2·5 확인 쿼리가 담당합니다. 그쪽은 Supabase 에서 돌리십시오.
//
//  ⚠️ 실패하면 종료코드 1 입니다. 관문이 «잠기는지» 꼭 확인하십시오 —
//     일부러 한 줄 틀려 놓고 1 이 나오는지 보십시오. (교훈 CS)
// ══════════════════════════════════════════════════════════════════

import {
  normalizeOhaeng, ohaengOrEmpty, parseOhaeng, stripInvisible, cleanHanja,
  isOhaeng, OHAENG_ALL, type Ohaeng,
} from './lib/saju/ohaeng'
import {
  buildSajuOhaengProfile, judgeResource, relationDirected, resourceFactsBlock, josa,
  EXCESS_POINT_MIN, W_FLOW, W_YONGSIN, W_BALANCE,
  type JudgeChar,
} from './lib/saju/resourceJudge'
import { diagnoseName, type NameChar } from './lib/saju/naming'
import { getSuriInfo, SURI_81 } from './lib/saju/suri81'

// ── 자잘한 도구 ────────────────────────────────────────────────
let pass = 0, fail = 0
const fails: string[] = []

function ok(msg: string) { pass++; console.log(`  ✅ ${msg}`) }
function no(msg: string) { fail++; fails.push(msg); console.log(`  ❌ ${msg}`) }
function check(cond: boolean, msg: string) { if (cond) { ok(msg) } else { no(msg) } }
function head(t: string) { console.log(`\n──────── ${t} ────────`) }

/** 되돌릴 수 있는 난수 — 검사가 «같은 결과» 를 내야 합니다 */
let seed = 20260730
function rnd(n: number): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed % n
}
const pick = <T,>(a: readonly T[]): T => a[rnd(a.length)]

// ══════════════════════════════════════════════════════════════════
console.log('════════════════════════════════════════════════════════')
console.log('  성명학 검사 그물 — 16-verify-naming')
console.log('════════════════════════════════════════════════════════')

// ══════════════════════════════════════════════════════════════════
head('① normalizeOhaeng 경계값')
// ══════════════════════════════════════════════════════════════════
//
// ⚠️ 이 표를 줄이지 마십시오. 한 줄 한 줄이 실제로 만난 오염입니다.
//    · '木'      — 덕암 원자료 5,111행이 전부 이 꼴이었습니다 (1단계 사고의 원인)
//    · ' 熺'     — 행 5002 에 실제로 있던 앞 공백
//    · NFD 한글  — macOS 자료가 이렇게 옵니다. 옛 ohaengChar 가 놓쳤습니다
const CASES: Array<[unknown, Ohaeng | null, string]> = [
  ['목', '목', '한글 그대로'],
  ['木', '목', '★한자 — 덕암 원자료 표기'],
  ['火', '화', '한자'],
  ['土', '토', '한자'],
  ['金', '금', '한자'],
  ['水', '수', '한자'],
  ['木(목)', '목', '한자+괄호 혼합'],
  ['토(土)', '토', '한글+괄호 혼합'],
  [' 수 ', '수', '앞뒤 공백'],
  ['\u3000화\u3000', '화', '전각공백(U+3000)'],
  ['\u00a0금', '금', 'NBSP(U+00A0)'],
  ['\u200b목', '목', '★폭 없는 공백 ZWSP — trim 이 놓칩니다'],
  ['木\ufeff', '목', 'BOM'],
  ['수\u200d', '수', 'ZWJ'],
  ['목'.normalize('NFD'), '목', '★NFD 한글 — 옛 방식이 놓쳤습니다'],
  ['수水', '수', '중복 표기(같은 오행)'],
  ['', null, '빈 문자열'],
  ['   ', null, '공백만'],
  ['\u200b', null, '폭 없는 문자만'],
  ['earth', null, '못 읽는 값'],
  ['토양', '토', '오타지만 «토» 가 들어 있음'],
  [null, null, 'null'],
  [undefined, null, 'undefined'],
]
for (const [input, want, why] of CASES) {
  const got = normalizeOhaeng(input as string)
  check(got === want,
    `${why.padEnd(34)} ${JSON.stringify(input)} → ${String(got)}${got === want ? '' : ` (기대 ${String(want)})`}`)
}

// 복수 오행은 «조용히» 넘기지 않아야 합니다
{
  const p = parseOhaeng('土金')
  check(p.ohaeng === '토' && p.all.length === 2 && !!p.problem,
    `복수 오행 '土金' → 앞엣것(${p.ohaeng}) + problem 남김`)
}
// 못 읽은 값은 problem 이 반드시 있어야 합니다
{
  const p = parseOhaeng('earth')
  check(p.ohaeng === null && !!p.problem, `못 읽은 값은 problem 을 남깁니다`)
}

// ══════════════════════════════════════════════════════════════════
head('② 표준 다섯 값 — 도메인을 벗어나지 않는가')
// ══════════════════════════════════════════════════════════════════
{
  // 오염을 무작위로 만들어 1,000번 — 결과는 언제나 다섯 값 또는 null
  const NOISE = ['', ' ', '\u3000', '\u200b', '\ufeff', '\u00a0', '(', ')', '오행', 'x', '·']
  const SEEDS = ['목', '화', '토', '금', '수', '木', '火', '土', '金', '水', 'earth', 'fire', '']
  let bad = 0, badSample = ''
  for (let i = 0; i < 1000; i++) {
    const raw = pick(NOISE) + pick(SEEDS) + pick(NOISE) + (rnd(4) === 0 ? pick(NOISE) : '')
    const got = normalizeOhaeng(raw)
    if (got !== null && !isOhaeng(got)) { bad++; if (!badSample) badSample = JSON.stringify(raw) }
    const s = ohaengOrEmpty(raw)
    if (s !== '' && !isOhaeng(s)) { bad++; if (!badSample) badSample = JSON.stringify(raw) }
  }
  check(bad === 0, `무작위 오염 1,000건 — 도메인 밖 반환 ${bad}건${badSample ? ` (예: ${badSample})` : ''}`)
}
{
  // ohaengOrEmpty 는 언제나 string — undefined 가 새면 화면이 깨집니다
  const vals = [null, undefined, '', '木', 'zzz', 123 as unknown as string]
  const allStr = vals.every(v => typeof ohaengOrEmpty(v as string) === 'string')
  check(allStr, 'ohaengOrEmpty 는 언제나 string 을 돌려줍니다')
}

// ══════════════════════════════════════════════════════════════════
head('③ 공백·비가시문자 정제')
// ══════════════════════════════════════════════════════════════════
check(cleanHanja(' 熺') === '熺', `★' 熺' → '熺'  (덕암 자료 행 5002 에 실제로 있던 오염)`)
check(cleanHanja('熺\u200b') === '熺', `'熺'+ZWSP → '熺'`)
check(cleanHanja('\u3000柳\u3000') === '柳', `전각공백 낀 '柳' → '柳'`)
check(stripInvisible(null) === '' && stripInvisible(undefined) === '', 'null·undefined → 빈 문자열')
{
  // 정제 결과에 공백·비가시문자가 남지 않아야 합니다
  const dirty = [' 熺', '熺 ', '\u200b柳\u200c', '\u00a0承\u3000', '\ufeff炫']
  const clean = dirty.map(cleanHanja)
  const bad = clean.filter(s => /[\s\u00a0\u200b-\u200d\u2060\ufeff\u3000]/.test(s))
  check(bad.length === 0, `정제 뒤 잔존 오염 ${bad.length}건`)
}

// ══════════════════════════════════════════════════════════════════
head('④ 사주 프로필 (SajuOhaengProfile) — 버려지던 값을 받는가')
// ══════════════════════════════════════════════════════════════════
{
  // calcYongsinCompat 이 주는 모양 그대로 (한자·한글 섞어 넣어 정규화까지 검사)
  const y = {
    isStrong: true,
    yongsin: '수', heeksin: '금', gisin: '土', gusin: '화', hansin: '목',
    score: { 목: 12, 화: 55, 토: 8, 금: 0, 수: 3 },
  }
  const saju = [
    { pillar: '년주', stem: '丙', branch: '午' },   // 화 화
    { pillar: '월주', stem: '丁', branch: '巳' },   // 화 화
    { pillar: '일주', stem: '甲', branch: '寅' },   // 목 목
    { pillar: '시주', stem: '己', branch: '未' },   // 토 토
  ]
  const P = buildSajuOhaengProfile(y, saju)

  check(P.gisin === '토', `★기신을 받습니다 — '土' → '토' (지금까지 버리던 값)`)
  check(P.gusin === '화', `★구신을 받습니다 — '화'`)
  check(P.hansin === '목', `★한신을 받습니다 — '목'`)
  check(P.isStrong === true, `isStrong 을 받습니다`)
  check(P.level['화'] === '과다', `화 55점 → 등급 «과다» (simsanOhaeng.grade 그대로)`)
  check(P.level['금'] === '결핍', `금 0점 → «결핍»`)
  check(P.lacking.includes('금'), `결핍 목록에 금`)
  check(P.hasCount && P.count['화'] === 4, `★여덟 글자 가운데 화가 4자리 (글자수 세기)`)
  check(P.excess.includes('화'), `과다 목록에 화 (55점 + 4자리)`)
  check(OHAENG_ALL.every(el => typeof P.score[el] === 'number'), `다섯 오행 점수가 모두 채워짐`)

  // ★글자 수만으로도 과다가 잡히는가 (점수는 낮은데 글자는 넷)
  const P2 = buildSajuOhaengProfile(
    { yongsin: '수', score: { 목: 40, 화: 10, 토: 10, 금: 10, 수: 10 } },
    [
      { pillar: '년주', stem: '甲', branch: '寅' },
      { pillar: '월주', stem: '乙', branch: '卯' },
      { pillar: '일주', stem: '丙', branch: '午' },
      { pillar: '시주', stem: '己', branch: '未' },
    ])
  check(P2.count['목'] === 4 && P2.excess.includes('목'),
    `★점수(40)가 문턱 아래여도 글자 4자리면 과다 (대표님 지시 — 넷 이상)`)

  // saju 를 안 넘기면 count 는 비고 hasCount=false
  const P3 = buildSajuOhaengProfile(y)
  check(!P3.hasCount && P3.excess.includes('화'),
    `saju 없이도 점수(${EXCESS_POINT_MIN}+)로 과다를 잡습니다`)

  // 고립 — 약하고 받쳐 줄 힘도 없는 자리
  const P4 = buildSajuOhaengProfile(
    { yongsin: '목', score: { 목: 5, 화: 60, 토: 40, 금: 10, 수: 5 } })
  check(P4.isolated.includes('목'),
    `고립 — 목 5점, 목을 생하는 수도 5점 → 고립으로 봄  ⚠️우리 잣대(연재쌤 확인 대기)`)
  // ⚠️ 시험 자료를 고쳤습니다 — 처음에 토를 20점으로 두었더니 «금 10점 · 토 20점» 도
  //    고립으로 잡혔습니다(20 < 25). 그물이 그것을 짚어 줬습니다.
  //    받쳐 준다고 보려면 생하는 오행이 «발달»(25점) 이상이어야 합니다.
  check(!P4.isolated.includes('금'),
    `고립이 아닌 자리는 안 잡습니다 (금 10점 · 생하는 토 40점=발달)`)
  check(!P4.isolated.includes('화'), `과다(화 60점)는 고립이 아닙니다`)
}

// ══════════════════════════════════════════════════════════════════
head('⑤ 관계 판정 — 방향을 가리는가')
// ══════════════════════════════════════════════════════════════════
check(relationDirected('목', '화') === '순생', `목→화 = 순생 (앞이 뒤를 낳음)`)
check(relationDirected('화', '목') === '역생', `화→목 = 역생  ★옛 로직은 둘을 같게 봤습니다`)
check(relationDirected('목', '토') === '순극', `목→토 = 순극`)
check(relationDirected('토', '목') === '역극', `토→목 = 역극`)
check(relationDirected('목', '목') === '비화', `목→목 = 비화`)
check(relationDirected('목', '금') === '역극', `목→금 = 역극 (금剋목)`)
check(relationDirected(null, '목') === '모름', `null → 모름  ★'비화' 로 뭉개지 않습니다`)
check(relationDirected(null, null) === '모름', `null·null → 모름 (옛 로직은 «같은 기운» 이라 했습니다)`)

// ══════════════════════════════════════════════════════════════════
head('⑥ judgeResource 불변식')
// ══════════════════════════════════════════════════════════════════
const C = (hanja: string, hangul: string, primary: Ohaeng | null, secondary?: Ohaeng | null): JudgeChar =>
  ({ hanja, hangul, primary, secondary: secondary ?? null })

const flat = (yongsin: string, over: Partial<Record<Ohaeng, number>> = {}, extra: Record<string, unknown> = {}) =>
  buildSajuOhaengProfile({
    yongsin,
    score: { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20, ...over },
    ...extra,
  })

check(W_FLOW + W_YONGSIN + W_BALANCE === 100, `배점 합이 100 (${W_FLOW}+${W_YONGSIN}+${W_BALANCE})`)

{
  // 용신을 담으면 hasYongsin — 성은 세지 않습니다
  const P = flat('목')
  const v = judgeResource(C('柳', '류', '목'), [C('承', '승', '금'), C('炫', '현', '화')], P)
  check(v.facts.hasYongsin === false,
    `★성만 용신이면 hasYongsin=false (성은 바꿀 수 없으므로 제외)`)
  check(v.facts.yongsinChars.length === 0,
    `★yongsinChars 도 성을 세지 않습니다 — 옛 로직은 여기가 어긋났습니다`)
  check(v.warnings.some(w => w.includes('바라는 기운')), `용신 미충족 경고가 남습니다`)
}
{
  const P = flat('화')
  const v = judgeResource(C('柳', '류', '목'), [C('承', '승', '금'), C('炫', '현', '화')], P)
  check(v.facts.hasYongsin === true && v.facts.yongsinChars[0]?.hanja === '炫',
    `이름이 용신을 담으면 hasYongsin=true · 글자를 짚어 줍니다`)
}
{
  // 부 자원오행으로 충족 — 70%
  const P = flat('수')
  const v1 = judgeResource(C('柳', '류', '목'), [C('榮', '영', '목', '수')], P)
  check(v1.facts.hasYongsin === false && v1.facts.hasYongsinSecondary === true,
    `부 자원오행으로 용신을 담으면 hasYongsinSecondary`)
  const v2 = judgeResource(C('柳', '류', '목'), [C('沐', '목', '수')], P)
  check(v2.score > v1.score, `주 오행 충족(${v2.score}) > 부 오행 충족(${v1.score})`)
}
{
  // ★① 과다 중복 투입 — 경고 + 감점
  const P = flat('수', { 화: 60 })
  const withFire = judgeResource(C('柳', '류', '목'), [C('炫', '현', '화')], P)
  const withWater = judgeResource(C('柳', '류', '목'), [C('沐', '목', '수')], P)
  check(withFire.facts.excessAdded.includes('화'), `과다(화 60점) 투입 → excessAdded 에 기록`)
  check(withFire.warnings.some(w => w.includes('넉넉')), `★과다 투입 경고가 반드시 남습니다`)
  check(withWater.score > withFire.score,
    `용신(수)을 담은 쪽(${withWater.score}) > 과다(화)를 담은 쪽(${withFire.score})`)
}
{
  // ★② 결핍 보충 — 가산
  const P = flat('수', { 수: 0 })
  const fill = judgeResource(C('柳', '류', '목'), [C('沐', '목', '수')], P)
  check(fill.facts.lackFilled.includes('수'), `결핍(수 0점)을 채우면 lackFilled 에 기록`)
}
{
  // ★③ 기신 투입 — 경고 + 감점
  const P = flat('수', {}, { gisin: '토', gusin: '화' })
  const gisin = judgeResource(C('柳', '류', '목'), [C('垈', '대', '토')], P)
  const gusin = judgeResource(C('柳', '류', '목'), [C('炫', '현', '화')], P)
  const plain = judgeResource(C('柳', '류', '목'), [C('鐘', '종', '금')], P)
  check(gisin.facts.gisinAdded.includes('토'), `기신(토) 투입 → gisinAdded 에 기록`)
  check(gisin.warnings.some(w => w.includes('꺼리는')), `★기신 투입 경고가 반드시 남습니다`)
  check(gusin.warnings.some(w => w.includes('도움이 덜')), `구신 투입 경고가 남습니다`)

  // ⚠️⚠️ 총점으로 견주지 마십시오 — 오행을 바꾸면 «흐름» 도 함께 바뀝니다.
  //    목→토는 순극(−2) · 목→화는 순생(+2) · 목→금은 역극(−1) 이라
  //    총점 차이가 균형에서 온 것인지 흐름에서 온 것인지 갈라볼 수 없습니다.
  //    ★그물이 이것을 짚어 줘서 breakdown 을 신설했습니다. 균형 칸만 견줍니다.
  check(gisin.breakdown.balance < gusin.breakdown.balance,
    `균형점수 — 기신(${gisin.breakdown.balance}) < 구신(${gusin.breakdown.balance})`)
  check(gusin.breakdown.balance < plain.breakdown.balance,
    `균형점수 — 구신(${gusin.breakdown.balance}) < 무관(${plain.breakdown.balance})`)
  check(gisin.breakdown.flow === plain.breakdown.flow || true,
    `(참고) 흐름 — 기신 ${gisin.breakdown.flow} · 구신 ${gusin.breakdown.flow} · 무관 ${plain.breakdown.flow}`)
}
{
  // breakdown 합이 rawTotal 과 맞는가
  const P = flat('화')
  const v = judgeResource(C('柳', '류', '목'), [C('炫', '현', '화')], P)
  const sum = Math.round(v.breakdown.flow + v.breakdown.yongsin + v.breakdown.balance)
  check(Math.abs(sum - v.breakdown.rawTotal) <= 1,
    `breakdown 합(${sum}) ≒ rawTotal(${v.breakdown.rawTotal})`)
  check(v.breakdown.cappedTo === null, `문제가 없으면 cappedTo=null`)
  check(v.breakdown.flow <= W_FLOW && v.breakdown.yongsin <= W_YONGSIN
        && v.breakdown.balance <= W_BALANCE, `하위 점수가 각 배점을 넘지 않습니다`)
}
{
  // ★④ 예외 인정 — 상극이라도 용신/희신 보완이면 감점하지 않습니다
  const P = flat('토')      // 용신 = 토
  // 목(성) → 토(이름) = 순극. 그런데 토가 «용신» 이므로 예외
  const exempt = judgeResource(C('柳', '류', '목'), [C('垈', '대', '토')], P)
  const link = exempt.facts.links[0]
  check(link.rel === '순극' && link.exempted === true,
    `★상극이지만 용신을 담은 글자 → exempted=true`)
  check(exempt.facts.clashExemptCount === 1, `예외 인정 자리를 셉니다 (${exempt.facts.clashExemptCount}곳)`)
  check(!exempt.warnings.some(w => w.includes('누르는')),
    `★예외가 인정되면 «누르는 자리» 경고를 내지 않습니다`)

  // 같은 상극인데 용신이 아니면 → 감점 + 경고
  const P2 = flat('수')     // 용신 = 수. 토는 용신도 희신도 아님
  const plain = judgeResource(C('柳', '류', '목'), [C('垈', '대', '토')], P2)
  check(plain.facts.links[0].exempted === false, `보완하지 않는 상극은 예외가 아닙니다`)
  check(plain.warnings.some(w => w.includes('누르는')), `그때는 경고가 남습니다`)
  check(exempt.facts.flowAvg > plain.facts.flowAvg,
    `예외 인정 쪽 흐름점수(${exempt.facts.flowAvg})가 더 높습니다 (${plain.facts.flowAvg})`)
}
{
  // 희신으로도 예외가 되는가
  const P = buildSajuOhaengProfile({ yongsin: '수', heeksin: '토', score: { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20 } })
  const v = judgeResource(C('柳', '류', '목'), [C('垈', '대', '토')], P)
  check(v.facts.links[0].exempted === true, `희신을 담은 글자도 예외 (CLASH_EXEMPT_INCLUDES_HEEKSIN)`)
}
{
  // 점수·등급 범위와 일관성
  const P = flat('목')
  const samples: Array<[JudgeChar, JudgeChar[]]> = [
    [C('柳', '류', '목'), [C('承', '승', '금'), C('炫', '현', '화')]],
    [C('金', '김', '금'), [C('沐', '목', '수')]],
    [C('朴', '박', '목'), [C('夏', '하', '화'), C('訥', '늘', '금'), C('別', '별', '금')]],
  ]
  let bad = 0
  for (const [s, g] of samples) {
    const v = judgeResource(s, g, P)
    if (v.score < 0 || v.score > 100) bad++
    const want = v.score >= 70 ? '좋음' : v.score >= 45 ? '보통' : '아쉬움'
    if (v.grade !== want) bad++
  }
  check(bad === 0, `점수 0~100 · 등급이 점수와 일관 (표본 ${samples.length})`)
}
{
  // 판정 불가 — 조용히 통과하지 못하게
  const P = flat('목')
  const v = judgeResource(C('柳', '류', null), [C('?', '?', null)], P)
  check(v.problems.length > 0, `자원오행을 못 읽으면 problems 에 남습니다`)
  check(v.score <= 40, `★그때 점수에 상한(40)을 씌웁니다 — 지금 ${v.score}`)
  check(v.facts.links.every(l => l.rel === '모름'), `관계는 «모름» 입니다`)
}
{
  // 용신을 못 구한 사주
  const P = buildSajuOhaengProfile({ yongsin: '', score: { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20 } })
  const v = judgeResource(C('柳', '류', '목'), [C('承', '승', '금')], P)
  check(v.problems.some(p => p.includes('용신')), `용신 미산출을 problems 에 남깁니다`)
  check(v.score <= 60, `점수에 상한(60) — 지금 ${v.score}`)
}
{
  // ★성↔끝 관계를 세 글자 이상에서 함께 봅니다 (옛 로직이 건너뛰던 자리)
  const P = flat('목')
  const v3 = judgeResource(C('柳', '류', '목'), [C('承', '승', '금'), C('炫', '현', '화')], P)
  const v2 = judgeResource(C('柳', '류', '목'), [C('承', '승', '금')], P)
  check(v3.facts.links.length === 3, `세 글자 이름 → 관계 3개 (이웃 2 + 성↔끝 1)`)
  check(v2.facts.links.length === 1, `두 글자 이름 → 관계 1개`)
  check(v3.facts.links[2].text.includes('성↔끝'), `성↔끝 관계에 표시가 붙습니다`)
}

// ══════════════════════════════════════════════════════════════════
head('⑦ 프롬프트 재료 — AI 에게 나가는 «사실»')
// ══════════════════════════════════════════════════════════════════
{
  // ★조사 — 재료 문장이 AI 에게 나가므로 어색하면 AI 가 그대로 옮겨 씁니다
  check(josa('목', '은/는') === '목은' && josa('화', '은/는') === '화는',
    `조사 은/는 — 목은 · 화는`)
  check(josa('금', '을/를') === '금을' && josa('토', '을/를') === '토를',
    `조사 을/를 — 금을 · 토를`)
  check(josa('현', '이/가') === '현이' && josa('대', '이/가') === '대가',
    `조사 이/가 — 현이 · 대가`)
  check(josa('수', '은/는') === '수는' && josa('목', '을/를') === '목을',
    `조사 — 수는 · 목을`)
  check(josa('炫', '이/가') === '炫이', `한자는 «받침 있음» 쪽으로 (판단 불가)`)
}
{
  const P = flat('수', { 화: 60, 수: 0 }, { gisin: '토' })
  const v = judgeResource(C('柳', '류', '목'), [C('炫', '현', '화'), C('垈', '대', '토')], P)
  const block = resourceFactsBlock(v, P)

  // ★방침 — 「좋다/나쁘다」 를 쓰지 않습니다 (naming.ts:8 · 대표님 지시)
  const BAN = ['좋은 이름', '나쁜 이름', '좋다', '나쁘다', '나쁜', '흉하', '불길']
  const hit = BAN.filter(w => block.includes(w))
  check(hit.length === 0, `판정 어휘 0건 — 걸린 말: ${hit.join(', ') || '없음'}`)

  check(block.includes('이미 넉넉한 기운'), `과다 투입이 재료에 실립니다`)
  check(block.includes('꺼리는 기운'), `기신이 재료에 실립니다`)
  check(block.includes('참고하실 자리'), `경고가 «참고» 로 실립니다`)
  check(!block.includes('해당 없음'), `★«해당 없음» 을 쓰지 않습니다 (교훈 BF)`)
  check(block.split('\n').every(l => l.length < 200), `한 줄이 200자를 넘지 않습니다`)

  // ★어색한 조사가 남아 있으면 AI 가 그대로 옮겨 씁니다
  const AWK = ['목를', '화을', '토을', '금를', '수을', '목가', '금가', '화이', '토이', '수이']
  const awk = AWK.filter(w => block.includes(w))
  check(awk.length === 0, `어색한 조사 0건 — 걸린 말: ${awk.join(', ') || '없음'}`)

  // 걸린 것이 없으면 그 줄을 아예 넣지 않아야 합니다 (교훈 BF)
  const clean = flat('화')
  const v2 = judgeResource(C('柳', '류', '목'), [C('炫', '현', '화')], clean)
  const b2 = resourceFactsBlock(v2, clean)
  check(!b2.includes('꺼리는 기운') && !b2.includes('이미 넉넉한'),
    `걸린 것이 없으면 그 줄을 아예 넣지 않습니다`)
  check(b2.includes('용신을 담은 글자            炫'), `충족한 글자를 짚어 줍니다`)
}

// ══════════════════════════════════════════════════════════════════
head('⑦-2 ★기신이 «결핍» 일 때 — 2026-07-30 실기기 사고')
// ══════════════════════════════════════════════════════════════════
//
// ⚠️⚠️ 이 구획을 지우지 마십시오. 실제로 손님 화면에 나갔던 사고입니다.
//
//   [무엇이 있었나]  1998-01-05 壬일간 · 柳度伊
//       계산 : 용신 목 · 희신 화 · 기신 금 · 수 과다(70) · 목 0점 · 금 0점
//       재료 : 「비어 있는 기운  금 — 이름이 채우지 않았습니다」
//              ★«금이 기신» 이라는 말이 재료에 없었습니다
//              (기신은 «이름에 들어 있을 때만» 적고 있었습니다)
//       결과 : AI 가 좋은 뜻으로 이렇게 썼습니다 —
//              「살아가며 금의 기운을 의식적으로 가꾸어 나가는 방향으로…」
//              → ★꺼려야 할 기운을 가꾸라고 권한 것입니다
//
//   [고친 것 셋]
//       ① 기신·구신을 «언제나» 재료에 적습니다 (이름에 없어도)
//       ② 채우지 않은 결핍을 «바라는 기운» 과 «꺼리는 기운» 으로 갈라 적습니다
//       ③ 기신·구신이 결핍이어도 채우면 가산하지 않습니다 (상 줄 일이 아닙니다)
{
  // 그날의 사주를 그대로 재현합니다
  const P = buildSajuOhaengProfile({
    isStrong: true,
    yongsin: '목', heeksin: '화', gisin: '금', gusin: '수', hansin: '토',
    score: { 목: 0, 화: 25, 토: 5, 금: 0, 수: 70 },
  }, [
    { pillar: '년주', stem: '丁', branch: '丑' },
    { pillar: '월주', stem: '癸', branch: '丑' },
    { pillar: '일주', stem: '壬', branch: '子' },
    { pillar: '시주', stem: '丙', branch: '午' },
  ])
  check(P.gisin === '금' && P.lacking.includes('금'),
    `전제 — 기신(금)이 결핍(0점)인 사주`)

  const v = judgeResource(C('柳', '류', '목'), [C('度', '도', '목'), C('伊', '이', '화')], P)
  const block = resourceFactsBlock(v, P)

  // ★① 기신을 «언제나» 알리는가 — 이름에 금이 없어도
  check(block.includes('사주가 꺼리는 기운(기신)'),
    `★이름에 기신이 없어도 «기신이 무엇인지» 를 알립니다`)
  check(block.includes('★이 기운을 «채우라·가꾸라» 고 권하지 마세요'),
    `★AI 에게 권유 금지를 명시합니다`)

  // ★② 결핍을 갈라 적는가
  check(block.includes('비어 있으나 꺼리는 기운'),
    `★기신 결핍을 «비어 있는 것이 편한 자리» 로 적습니다`)
  check(!/비어 있는 기운 +금/.test(block),
    `★기신을 «채우지 않았습니다» 로 적지 않습니다 (아쉬움처럼 읽힙니다)`)

  // ★③ 기신 결핍을 채워도 가산하지 않는가
  const withGeum = judgeResource(C('柳', '류', '목'), [C('鐘', '종', '금')], P)
  check(!withGeum.facts.lackFilled.includes('금'),
    `★기신(금)이 결핍이어도 채우면 lackFilled 에 넣지 않습니다`)
  check(withGeum.facts.gisinAdded.includes('금'),
    `그리고 기신 투입으로 잡습니다`)
  const withMok = judgeResource(C('柳', '류', '목'), [C('東', '동', '목')], P)
  check(withMok.breakdown.balance > withGeum.breakdown.balance,
    `균형점수 — 용신 결핍 보충(${withMok.breakdown.balance}) > 기신 결핍 «보충»(${withGeum.breakdown.balance})`)

  // 실제로 그날 나갔던 이름은 좋은 이름이었습니다 — 그 판정은 그대로여야 합니다
  check(v.facts.hasYongsin && v.facts.lackFilled.includes('목'),
    `柳度伊 — 용신(목) 충족 · 결핍(목) 보충은 그대로`)
  check(v.warnings.length === 0,
    `그리고 이 이름에는 경고가 없습니다 (헛경고를 내지 않습니다)`)
}

// ══════════════════════════════════════════════════════════════════
head('⑧ 1단계 회귀 — 표준이 무너지지 않았는가')
// ══════════════════════════════════════════════════════════════════
{
  // 옛 엔진(diagnoseName)이 정규화된 값으로 계속 정상 작동하는지
  const mk = (raw: string): string => ohaengOrEmpty(raw)
  const r = diagnoseName({
    surname: { hangul: '류', hanja: '柳', strokes: 9, resourceOhaeng: mk('木') },
    given: [
      { hangul: '승', hanja: '承', strokes: 8, resourceOhaeng: mk('金') },
      { hangul: '현', hanja: '炫', strokes: 9, resourceOhaeng: mk('火') },
    ] as NameChar[],
    yongsin: '화', elementScore: { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20 },
  })
  const yf = r.yongsinBohwan.facts as Record<string, unknown>
  check(yf.hasYongsin === true,
    `★한자 입력(木金火)을 정규화하면 용신(화)을 찾습니다 — 1단계가 고친 자리`)
  const rf = r.resourceFlow.facts as Record<string, unknown>
  check(String(rf.chain).includes('(목)'),
    `자원오행 흐름이 한글로 나옵니다 — ${String(rf.chain)}`)
}
{
  // 81수리표가 온전한가 (수리는 2단계에서 안 건드렸지만 함께 잠급니다)
  const missing: number[] = []
  for (let i = 1; i <= 81; i++) if (!(i in SURI_81)) missing.push(i)
  check(missing.length === 0, `81수리표 81칸 — 빠진 수 ${missing.join(',') || '없음'}`)
  check(getSuriInfo(82).name === getSuriInfo(2).name, `환원 정상 (82 → 2)`)
  check(getSuriInfo(163).name === getSuriInfo(3).name, `환원 정상 (163 → 3)`)
}

// ══════════════════════════════════════════════════════════════════
head('⑨ 무작위 관통 — 조용히 깨지지 않는가')
// ══════════════════════════════════════════════════════════════════
const RAW = ['목', '화', '토', '금', '수', '木', '火', '土', '金', '水', ' 木 ', '木(목)', '', 'zzz']
const HANJA = ['柳', '承', '炫', '沐', '垈', '鐘', '夏', '訥', '別', ' 熺', '琳', '潤']
const dist = {
  excessAdded: 0, lackFilled: 0, isolatedFilled: 0, gisinAdded: 0,
  clashExempt: 0, hasYongsin: 0, problems: 0, warned: 0,
  grade: { 좋음: 0, 보통: 0, 아쉬움: 0 } as Record<string, number>,
}
const N = 4000
let crashed = 0, outOfRange = 0
for (let i = 0; i < N; i++) {
  try {
    const y = {
      isStrong: rnd(2) === 0,
      yongsin: pick(OHAENG_ALL), heeksin: pick(OHAENG_ALL),
      gisin: pick(OHAENG_ALL), gusin: pick(OHAENG_ALL), hansin: pick(OHAENG_ALL),
      score: {
        목: rnd(70), 화: rnd(70), 토: rnd(70), 금: rnd(70), 수: rnd(70),
      } as Record<string, number>,
    }
    const P = buildSajuOhaengProfile(y, rnd(3) === 0 ? null : [
      { pillar: '년주', stem: pick(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']), branch: pick(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']) },
      { pillar: '월주', stem: pick(['甲', '丙', '戊', '庚', '壬']), branch: pick(['寅', '巳', '申', '亥']) },
      { pillar: '일주', stem: pick(['乙', '丁', '己', '辛', '癸']), branch: pick(['卯', '午', '酉', '子']) },
      { pillar: '시주', stem: pick(['甲', '丙', '戊']), branch: pick(['辰', '未', '戌', '丑']) },
    ])
    const nGiven = 1 + rnd(3)   // 1~3 글자
    const s = C(pick(HANJA), '성', normalizeOhaeng(pick(RAW)))
    const g: JudgeChar[] = []
    for (let k = 0; k < nGiven; k++) g.push(C(pick(HANJA), '자', normalizeOhaeng(pick(RAW))))

    const v = judgeResource(s, g, P)
    if (v.score < 0 || v.score > 100 || !Number.isFinite(v.score)) outOfRange++
    const want = v.score >= 70 ? '좋음' : v.score >= 45 ? '보통' : '아쉬움'
    if (v.grade !== want) outOfRange++
    // 재료 블록도 함께 만들어 봅니다 (문자열 조립에서 터지지 않게)
    const block = resourceFactsBlock(v, P)
    if (typeof block !== 'string' || block.length === 0) crashed++

    if (v.facts.excessAdded.length) dist.excessAdded++
    if (v.facts.lackFilled.length) dist.lackFilled++
    if (v.facts.isolatedFilled.length) dist.isolatedFilled++
    if (v.facts.gisinAdded.length) dist.gisinAdded++
    if (v.facts.clashExemptCount) dist.clashExempt++
    if (v.facts.hasYongsin) dist.hasYongsin++
    if (v.problems.length) dist.problems++
    if (v.warnings.length) dist.warned++
    dist.grade[v.grade]++
  } catch (e) {
    crashed++
    if (crashed === 1) console.log(`     첫 예외: ${(e as Error).message}`)
  }
}
check(crashed === 0, `무작위 ${N.toLocaleString()}건 — 예외 ${crashed}건`)
check(outOfRange === 0, `점수·등급 불변식 위반 ${outOfRange}건`)

// ── 불변식: 과다/기신이 걸렸으면 경고가 반드시 있어야 합니다 ──
{
  let violate = 0
  for (let i = 0; i < 800; i++) {
    const P = buildSajuOhaengProfile({
      yongsin: pick(OHAENG_ALL), gisin: pick(OHAENG_ALL),
      score: { 목: rnd(70), 화: rnd(70), 토: rnd(70), 금: rnd(70), 수: rnd(70) } as Record<string, number>,
    })
    const v = judgeResource(
      C('柳', '류', normalizeOhaeng(pick(RAW))),
      [C('承', '승', normalizeOhaeng(pick(RAW)))], P)
    if (v.facts.excessAdded.length && !v.warnings.some(w => w.includes('넉넉'))) violate++
    if (v.facts.gisinAdded.length && !v.warnings.length) violate++
  }
  check(violate === 0, `★과다·기신이 걸리면 경고가 반드시 남습니다 — 위반 ${violate}건`)
}

// ══════════════════════════════════════════════════════════════════
if (process.argv.includes('--dist')) {
  head('걸림 비율 (교훈 BO — 배점을 바꾸면 여기를 다시 보십시오)')
  const p = (x: number) => `${(x * 100 / N).toFixed(1)}%`
  console.log(`     용신 충족        ${String(dist.hasYongsin).padStart(5)}  ${p(dist.hasYongsin)}`)
  console.log(`     과다 중복 투입    ${String(dist.excessAdded).padStart(5)}  ${p(dist.excessAdded)}`)
  console.log(`     결핍 보충        ${String(dist.lackFilled).padStart(5)}  ${p(dist.lackFilled)}`)
  console.log(`     고립 보충        ${String(dist.isolatedFilled).padStart(5)}  ${p(dist.isolatedFilled)}  ⚠️우리 잣대`)
  console.log(`     기신·구신 투입    ${String(dist.gisinAdded).padStart(5)}  ${p(dist.gisinAdded)}`)
  console.log(`     상극 예외 인정    ${String(dist.clashExempt).padStart(5)}  ${p(dist.clashExempt)}  ★④`)
  console.log(`     경고 하나 이상    ${String(dist.warned).padStart(5)}  ${p(dist.warned)}`)
  console.log(`     판정 불가        ${String(dist.problems).padStart(5)}  ${p(dist.problems)}`)
  console.log(`     등급 — 좋음 ${p(dist.grade['좋음'])} · 보통 ${p(dist.grade['보통'])} · 아쉬움 ${p(dist.grade['아쉬움'])}`)
  console.log(`\n     ⚠️ 무작위 오행 조합이라 실제 손님 분포와 다릅니다.`)
  console.log(`        실제 분포는 hanja 표로 재야 합니다(2단계 DB 연동 뒤).`)
}

// ══════════════════════════════════════════════════════════════════
console.log('\n════════════════════════════════════════════════════════')
if (fail === 0) {
  console.log(`  ✅ 전부 통과  (${pass}건)`)
} else {
  console.log(`  ❌ ${fail}건 실패 / ${pass + fail}건`)
  for (const f of fails) console.log(`     · ${f}`)
}
console.log('════════════════════════════════════════════════════════')
process.exit(fail === 0 ? 0 : 1)
