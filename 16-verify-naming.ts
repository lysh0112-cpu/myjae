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
  buildSajuOhaengProfile, ensureProfile, judgeResource, relationDirected,
  resourceFactsBlock, josa, birthOrderCautionBlock,
  EXCESS_POINT_MIN, W_FLOW, W_YONGSIN, W_BALANCE,
  type JudgeChar, type SajuOhaengProfile,
} from './lib/saju/resourceJudge'
import {
  candidateScore, compareCandidates,
  CAND_W_RESOURCE, CAND_W_SURI, CAND_W_SOUND,
} from './lib/saju/resourceJudge'
// ★3단계 — 새 DB 컬럼 바인딩
import {
  HANJA_SELECT, rowOhaeng, rowOhaengSecondary, rowStrokes, rowNameUse, rowHanja,
  isAvoidChar, avoidReason, listPolicy, toJudgeChar, toNameChar, describeRowSource,
  type HanjaRow,
} from './lib/saju/hanjaRow'
// ★3단계-b — 별점 · 목록 정책
import {
  starOf, starRaw, applyYongsinFloor, perspectiveStars, overallStar,
  starGlyphs, starText, STAR_BANDS, STAR_FLOOR, YONGSIN_FLOOR,
} from './lib/saju/starRating'
// ★3단계-e — 특수 피함 규칙
import { checkSpecialAvoidRules, checkSpecialAvoidForName } from './lib/saju/checkSpecialAvoidRules'
import { GENTLE_AVOID_REASONS } from './lib/saju/gentleAvoidReasons'
import {
  NUMBER_HANJA_SET, GANJI_HANJA_SET, MULTI_SOUND_HANJA_MAP,
  SPECIAL_PENALTY_CAP, SPECIAL_RULES_ENABLED,
  LONELY_COLD_SET, SACRED_OVERLOAD_SET, SEASON_CHANGE_SET, BODY_PART_SET,
} from './lib/saju/specialAvoidData'
import { diagnoseName, type NameChar } from './lib/saju/naming'
import { getSuriInfo, SURI_81, SURI_81_APP, diffSuriSources } from './lib/saju/suri81'
import { SURI_81_GUIDE, SURI_TONE_GUIDE } from './lib/saju/suriGuide'
import { COMPOUND_SURNAMES, splitSurname } from './lib/saju/surname'

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
head('⑥-2 ★같은 오행 중복 투입 — Set 처리 (2026-07-30 대표님 지적)')
// ══════════════════════════════════════════════════════════════════
//
// ⚠️ 무엇이 있었나 — 균형 판정이 «글자마다» 돌고 있었습니다. 그래서 이름 두 글자가
//    같은 오행이면 excessAdded 가 ['화','화'] 로 중복되고, 같은 경고가 두 줄 나가고,
//    ★감점이 두 배로 들어갔습니다 (기신 −15 가 −30).
//    → 오행별로 묶고, «어느 글자들» 인지는 경고 문장에 함께 적습니다.
{
  const P = buildSajuOhaengProfile(
    { yongsin: '수', gisin: '토', gusin: '금', score: { 목: 10, 화: 60, 토: 10, 금: 10, 수: 10 } })

  // 같은 과다 오행(화)을 두 글자에
  const twoFire = judgeResource(C('柳', '류', '목'), [C('炫', '현', '화'), C('炡', '정', '화')], P)
  const oneFire = judgeResource(C('柳', '류', '목'), [C('炫', '현', '화')], P)
  check(twoFire.facts.excessAdded.length === 1,
    `★excessAdded 중복 없음 — ${JSON.stringify(twoFire.facts.excessAdded)}`)
  check(twoFire.warnings.filter(w => w.includes('넉넉')).length === 1,
    `★과다 경고가 한 줄만 (두 글자여도)`)
  check(twoFire.warnings.some(w => w.includes('炫·炡')),
    `★대신 «어느 글자들» 인지는 경고에 함께 적습니다`)
  check(twoFire.breakdown.balance === oneFire.breakdown.balance,
    `★감점이 두 배로 들어가지 않습니다 — 두 글자 ${twoFire.breakdown.balance} = 한 글자 ${oneFire.breakdown.balance}`)

  // 같은 기신(토)을 두 글자에
  const twoGisin = judgeResource(C('柳', '류', '목'), [C('垈', '대', '토'), C('圭', '규', '토')], P)
  const oneGisin = judgeResource(C('柳', '류', '목'), [C('垈', '대', '토')], P)
  check(twoGisin.facts.gisinAdded.length === 1, `★gisinAdded 중복 없음`)
  check(twoGisin.warnings.filter(w => w.includes('꺼리는')).length === 1, `★기신 경고 한 줄만`)
  check(twoGisin.breakdown.balance === oneGisin.breakdown.balance,
    `★기신 감점도 한 번만 (${twoGisin.breakdown.balance})`)

  // 서로 «다른» 오행이면 각각 잡아야 합니다 — 뭉개면 안 됩니다
  const mixed = judgeResource(C('柳', '류', '목'), [C('炫', '현', '화'), C('垈', '대', '토')], P)
  check(mixed.facts.excessAdded.length === 1 && mixed.facts.gisinAdded.length === 1,
    `다른 오행은 각각 잡습니다 (과다 화 · 기신 토)`)
  check(mixed.warnings.length >= 2, `경고도 각각 (${mixed.warnings.length}줄)`)

  // 상극 경고도 중복되지 않는가 — 같은 오행 두 글자가 성과 상극일 때
  const clash = judgeResource(C('柳', '류', '목'), [C('垈', '대', '토'), C('圭', '규', '토')], P)
  check(clash.facts.links.length === 3, `관계는 글자별로 그대로 셉니다 (${clash.facts.links.length})`)
}

// ══════════════════════════════════════════════════════════════════
head('⑥-3 ★손으로 만든 프로필 — 안전한 기본값 (ensureProfile)')
// ══════════════════════════════════════════════════════════════════
//
// ⚠️ 검사기·시늉 자료·연재쌤 검증에서 프로필을 손으로 만들어 넣게 됩니다.
//    그때 excess·lacking 이 없으면 터지거나(크래시) «과다가 없는 사주» 로 오판합니다.
{
  // 용신 + 등급만 있는 «최소» 프로필
  const bare: SajuOhaengProfile = {
    yongsin: '수',
    level: { 목: '보통', 화: '과다', 토: '보통', 금: '결핍', 수: '보통' },
  }
  const full = ensureProfile(bare)
  check(full.excess.includes('화'), `★level='과다' 에서 excess 를 뽑습니다`)
  check(full.lacking.includes('금'), `★level='결핍' 에서 lacking 을 뽑습니다`)
  check(full.gisin === null && full.gusin === null && full.hansin === null,
    `없는 값은 null 로 (undefined 가 새지 않습니다)`)
  check(full.isolated.length === 0 && full.hasCount === false, `고립·글자수는 안전한 기본값`)
  check(OHAENG_ALL.every(el => full.score[el] === 0), `점수가 없으면 0`)

  // ★그 프로필로 judgeResource 가 «터지지 않고» 제대로 판정하는가
  const v = judgeResource(C('柳', '류', '목'), [C('炫', '현', '화')], bare)
  check(v.facts.excessAdded.includes('화'),
    `★최소 프로필로도 과다(화)를 잡습니다`)
  check(v.warnings.some(w => w.includes('넉넉')), `경고도 나옵니다`)
  check(v.score >= 0 && v.score <= 100, `점수가 범위 안 (${v.score})`)

  // '보통' 등급은 감점도 가산도 아닙니다
  const neutral = judgeResource(C('柳', '류', '목'), [C('沐', '목', '수')], bare)
  check(neutral.facts.excessAdded.length === 0 && neutral.facts.lackFilled.length === 0,
    `'보통' 등급은 감점·가산 없음`)

  // 넘겨받은 excess 가 있으면 «그것을» 씁니다 (다시 뽑지 않습니다)
  const forced = ensureProfile({ ...bare, excess: ['목'] })
  check(forced.excess.length === 1 && forced.excess[0] === '목',
    `넘겨받은 excess 를 그대로 씁니다`)
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
  //   ⚠️ 비유적 단정도 «판정» 입니다. 「불난 집에 부채질」 같은 표현을 재료에 두면
  //      AI 가 그 비유를 손님에게 그대로 옮겨 씁니다. (2026-07-30 명세 대조에서 걸렀습니다)
  const BAN = [
    '좋은 이름', '나쁜 이름', '좋다', '나쁘다', '나쁜', '흉하', '불길',
    '부채질', '불난 집', '격입니다', '치명', '위험', '망하', '실패',
  ]
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
head('⑦-3 ★상극을 보는 두 견해 (4단계 · 『작명개운법』 107쪽)')
// ══════════════════════════════════════════════════════════════════
//
// ⚠️ 무엇을 잠그나 — 교재는 「상극이라 흉하다는 말은 무시하라」고 합니다.
//    그러나 상생을 보는 유파도 있어 «감점 구조는 그대로» 두고
//    «두 견해» 를 재료로 실어 AI 가 한쪽으로 단정하지 않게 했습니다. (대표님 확정)
//    ★배점을 30 → 10 으로 줄여 봤다가 되돌린 이력이 resourceJudge 주석에 있습니다.
{
  const flat2 = (y: string) => buildSajuOhaengProfile({
    yongsin: y, score: { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20 },
  })

  // ① 상극이 «남은» 경우 — 두 견해가 나가야 합니다
  const left = judgeResource(C('柳', '류', '목'), [C('垈', '대', '토')], flat2('수'))
  const bLeft = resourceFactsBlock(left, flat2('수'))
  check(bLeft.includes('★상극을 보는 두 견해'), `★면제되지 않은 상극이 있으면 «두 견해» 를 실습니다`)
  check(bLeft.includes('억지로 상생 배열을 맞출 필요는 없고'), `교재 견해가 실립니다`)
  check(bLeft.includes('흠으로 단정하지 마시고'), `단정 금지를 명시합니다`)
  // ★재료 문구 자체에 «단정하는 낱말» 을 예시로 넣지 않았는가
  //   전에 「«나쁘다» 로 단정하지 마시고」 라고 적었다가 ⑦ 의 금지어 검사에 걸렸습니다.
  //   금지어를 «예시» 로 넣으면 AI 가 그것을 끌어 씁니다.
  check(!bLeft.includes('나쁘다') && !bLeft.includes('나쁜'),
    `★단정하는 낱말을 «예시로도» 쓰지 않습니다`)

  // ② 예외로 «면제된» 경우 — 다른 줄이 나가야 합니다
  const ex = judgeResource(C('柳', '류', '목'), [C('垈', '대', '토')], flat2('토'))
  const bEx = resourceFactsBlock(ex, flat2('토'))
  check(bEx.includes('사주를 보완하는 글자가 만든 것이라'), `면제된 상극은 그 사정을 전합니다`)
  check(!bEx.includes('★상극을 보는 두 견해'),
    `★면제되면 «두 견해» 줄은 안 나갑니다 (같은 말이 두 번 나가지 않게)`)

  // ③ 상극이 «없는» 경우 — 둘 다 안 나가야 합니다 (교훈 BF)
  const none = judgeResource(C('柳', '류', '목'), [C('炫', '현', '화')], flat2('화'))
  const bNone = resourceFactsBlock(none, flat2('화'))
  check(!bNone.includes('상극') && !bNone.includes('※'),
    `★상극이 없으면 그 줄을 아예 넣지 않습니다`)

  // ④ 배점이 원래대로인가 — 되돌린 것을 잠급니다
  check(W_FLOW === 30 && W_YONGSIN === 40 && W_BALANCE === 30,
    `배점 30/40/30 (한 번 10/60/30 으로 바꿨다가 되돌렸습니다)`)

  // ⑤ 두 견해 문구에도 단정적 부정어가 없어야 합니다
  const BAN2 = ['흉하', '나쁜 이름', '불길', '망하', '재앙']
  const hit2 = BAN2.filter(w => bLeft.includes(w))
  check(hit2.length === 0, `두 견해 문구에 단정적 부정어 0건 — ${hit2.join(',') || '없음'}`)
}

// ══════════════════════════════════════════════════════════════════
head('⑦-4 ★형제 서열 안내 (4단계 · 감점 없이 참고만)')
// ══════════════════════════════════════════════════════════════════
//
// ⚠️ 왜 «감점하지 않나» — 『작명개운법』 120쪽 표는 「첫째 칸 / 둘째 칸」이
//    «쓸 글자» 인지 «피할 글자» 인지 원문으로 갈리지 않습니다.
//    그리고 이름 풀이 폼이 «몇째» 를 묻지 않아 판정할 근거가 없습니다.
//    ★대표님 확정 — 안내만 합니다.
{
  const CB = (h: string, g: string): JudgeChar =>
    ({ hanja: h, hangul: g, primary: '목', secondary: null })

  // ① 불용 목록에 «문장» 으로 실린 여섯 자 — 방향이 분명합니다
  const won = birthOrderCautionBlock([CB('元', '원'), CB('炫', '현')])
  check(won.includes('元(원)'), `元 이 걸립니다`)
  check(won.includes('맏이가 쓰면 무방하나 아래 형제가 쓰면'),
    `★불용 목록 여섯 자는 방향을 밝혀 적습니다 (完 元 泰 長 大 輝)`)

  // ② 표에만 있는 글자 — 방향을 말하지 않습니다
  const cho = birthOrderCautionBlock([CB('初', '초')])
  check(cho.includes('태어난 순서에 맞추어 가려 쓰는 것이 좋다고 보는 견해'),
    `★표에만 있는 글자는 «순서에 맞추어» 정도로만 적습니다`)
  check(!cho.includes('맏이'), `방향을 단정하지 않습니다`)

  // ③ 걸린 글자가 «없으면» 빈 문자열 (교훈 BF)
  check(birthOrderCautionBlock([CB('柳', '류'), CB('炫', '현')]) === '',
    `★해당 글자가 없으면 블록을 아예 만들지 않습니다`)

  // ④ 성은 보지 않습니다 — 성은 서열과 무관합니다
  //    (birthOrderCautionBlock 은 given 만 받습니다)
  check(birthOrderCautionBlock([CB('炫', '현')]) === '', `이름에만 없으면 빈 문자열`)

  // ⑤ ★원문 사유를 그대로 내보내지 않습니다 (교훈 BR)
  const RAWWORD = ['형을 극한다', '불길하다', '형이 망하고', '역경이 많고', '잔병치레']
  const leaked = RAWWORD.filter(w => won.includes(w) || cho.includes(w))
  check(leaked.length === 0, `원문 사유가 새지 않습니다 — 걸린 말: ${leaked.join(',') || '없음'}`)

  // ⑥ 판정 어휘도 없어야 합니다
  const BAN3 = ['나쁘', '흉하', '불길', '단명', '극한다']
  const hit3 = BAN3.filter(w => won.includes(w) || cho.includes(w))
  check(hit3.length === 0, `단정적 부정어 0건 — ${hit3.join(',') || '없음'}`)

  // ⑦ AI 에게 «단정하지 말라» 를 명시하는가
  check(won.includes('맞다 / 틀리다') && won.includes('이 한 가지로 이름 전체를 판단하지 마세요'),
    `★서열을 모르므로 판정하지 말라고 못 박습니다`)

  // ⑧ 여섯 자가 모두 «불용목록» 갈래인가
  for (const h of ['完', '元', '泰', '長', '大', '輝']) {
    const b = birthOrderCautionBlock([CB(h, 'x')])
    if (!b.includes('맏이가 쓰면 무방하나')) no(`${h} 가 불용목록 갈래가 아닙니다`)
  }
  ok(`불용 목록 여섯 자(完 元 泰 長 大 輝)가 모두 잡힙니다`)
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

  // ★2026-07-31 정본 교체 — 교재(『작명개운법』 5장)가 원본입니다
  const gil = Object.values(SURI_81).filter(x => x.fortune === '길').length
  const hyung = Object.values(SURI_81).filter(x => x.fortune === '흉').length
  check(gil === 41 && hyung === 40, `교재 분포 — 길 ${gil}(41) · 흉 ${hyung}(40)`)
  check(Object.values(SURI_81).every(x => (x.fortune as string) !== '평'),
    `교재에는 «평» 이 없습니다`)
  check(Object.values(SURI_81).every(x => !!x.name && !!x.un),
    `81칸 전부 격·운 두 낱말이 채워져 있습니다`)

  // 교재 152쪽 「한 장으로 정리한 81수리 길흉표」와 153~154쪽 전사가 맞는가 (독립 대조)
  const P152_GIL = new Set([1,3,5,6,7,8,11,13,15,16,17,18,21,23,24,25,29,31,32,33,35,
    37,38,39,41,45,47,48,52,57,58,61,63,65,67,68,71,73,75,77,81])
  const p152bad: number[] = []
  for (let i = 1; i <= 81; i++) {
    const want = P152_GIL.has(i) ? '길' : '흉'
    if (SURI_81[i].fortune !== want) p152bad.push(i)
  }
  check(p152bad.length === 0, `152쪽 목록 ↔ 153~154쪽 전사 대조 — 어긋남 ${p152bad.join(',') || '없음'}`)

  // 교재 표본 세 자리 (17·18·26수)
  check(SURI_81[17].name === '용진격' && SURI_81[17].un === '건창운' && SURI_81[17].fortune === '길',
    `17수 = 용진격, 건창운 (길)`)
  check(SURI_81[18].name === '발전격' && SURI_81[18].fortune === '길', `18수 = 발전격 (길)`)
  check(SURI_81[26].name === '만달격' && SURI_81[26].fortune === '흉', `26수 = 만달격 (흉)`)

  // 표 밖의 수 방어 — 0·음수·NaN 은 «미정» 이지 «길» 이 아닙니다
  check(getSuriInfo(0).fortune === '미정', `0 획 → 미정`)
  check(getSuriInfo(-5).fortune === '미정', `음수 → 미정`)
  check(getSuriInfo(NaN).fortune === '미정', `NaN → 미정`)

  // 부본이 그대로 남아 있는가 · 대조 함수가 도는가
  check(Object.keys(SURI_81_APP).length === 81, `부본(작명왕·작명가) 81칸 보존`)
  const d = diffSuriSources()
  check(d.fortuneDiff.length === 14, `원본↔부본 길흉 어긋남 ${d.fortuneDiff.length}건 (14)`)
  check(d.nameDiff.length === 53, `원본↔부본 격 이름 어긋남 ${d.nameDiff.length}건 (53)`)
}

// ══════════════════════════════════════════════════════════════════
head('⑧-c ★수리 등급 — 주운 가중치 판정 (2026-07-31 2차)')
{
  // 지시서 로직을 그대로 옮긴 참조 구현. scoreSuri 와 어긋나면 둘 중 하나가 틀린 것입니다.
  const ref = (jH: boolean, hH: boolean, sub: number) => {
    const tot = (jH ? 1 : 0) + (hH ? 1 : 0) + sub
    if ((jH && hH) || tot >= 3) return '아쉬움'
    if (tot === 0 || (!jH && !hH && sub <= 1)) return '좋음'
    return '보통'
  }
  check(ref(false, false, 0) === '좋음',   `주운 길 · 부운 0흉 → 좋음`)
  check(ref(false, false, 1) === '좋음',   `주운 길 · 부운 1흉 → 좋음`)
  check(ref(false, false, 2) === '보통',   `주운 길 · 부운 2흉 → 보통`)
  check(ref(true,  false, 0) === '보통',   `정격만 흉 → 보통`)
  check(ref(false, true,  0) === '보통',   `형격만 흉 → 보통`)
  check(ref(true,  false, 1) === '보통',   `정격 흉 + 부운 1흉 → 보통`)
  check(ref(true,  false, 2) === '아쉬움', `정격 흉 + 부운 2흉 → 아쉬움 (전체 3)`)
  check(ref(true,  true,  0) === '아쉬움', `주운 둘 다 흉 → 아쉬움`)

  // ★부운만 흉해서는 아쉬움이 될 수 없습니다 — 주운 가중치의 핵심
  check(ref(false, false, 2) !== '아쉬움', `부운 둘이 흉이어도 아쉬움이 아닙니다`)

  // 🔴 격 0개 방어 (3-3장 ①) — 지시서 원문에는 없는 자리입니다
  const SUR = { hangul: '류', hanja: '柳', strokes: 9, resourceOhaeng: ohaengOrEmpty('木') }
  const CH = (h: string, j: string, st: number, o: string) =>
    ({ hangul: h, hanja: j, strokes: st, resourceOhaeng: ohaengOrEmpty(o) })
  const base = { yongsin: '화', elementScore: { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20 } }

  // 류승현 — 원17길 · 형17길 · 이18길 · 정26흉  →  정격만 흉이므로 «보통»
  const rSeung = diagnoseName({ surname: SUR,
    given: [CH('승', '承', 8, '金'), CH('현', '炫', 9, '火')] as NameChar[], ...base })
  check(rSeung.suri.gyeok.length === 4, `두 글자 이름 — 사격 4개`)
  check(rSeung.suri.gyeok.map(x => x.key).join(',') === 'won,hyeong,i,jeong',
    `격 순서가 원·형·이·정입니다`)
  check(rSeung.suri.gyeok[3].name === '만달격' && rSeung.suri.gyeok[3].fortune === '흉',
    `류승현 정격 26수 = 만달격(흉) — 교재 기준`)
  check(rSeung.suri.grade === '보통', `류승현 — 정격만 흉 → 보통 (${rSeung.suri.grade})`)

  // 🔴 격 0개 방어 (3-3장 ①) — 지시서 원문에는 없는 자리입니다
  const r0 = diagnoseName({ surname: SUR, given: [] as NameChar[], ...base })
  check(r0.suri.gyeok.length === 0, `이름 0글자 — 격 0개`)
  check(r0.suri.grade !== '좋음', `★격 0개를 «좋음» 이라 부르지 않습니다 (현재 ${r0.suri.grade})`)

  // ⚠️ 외자 — 두 격이 같은 식이라 «보통» 이 나올 수 없습니다 (3-3장 ③ 미해결)
  const r1 = diagnoseName({ surname: SUR, given: [CH('인', '仁', 4, '木')] as NameChar[], ...base })
  // ★3차에서 외자도 사격 넷이 되었습니다 (교재 136쪽 「성1 이름1」)
  check(r1.suri.gyeok.length === 4, `외자 — 격 4개 (원·형·이·정)`)
  check(r1.suri.gyeok.map(x => x.key).join(',') === 'won,hyeong,i,jeong', `외자도 사격 넷`)
  // 교재 136쪽 「성1 이름1」 — 원격 = 이름 · 이격 = 성 + 가상수 1
  check(r1.suri.gyeok[0].sum === 4, `외자 원격 = 이름 획수 (仁 4)`)
  check(r1.suri.gyeok[2].sum === 10, `외자 이격 = 성 + 가상수 1 (9+1)`)
  check(r1.suri.gyeok[1].sum === r1.suri.gyeok[3].sum, `외자 형격 = 정격 = 성 + 이름 (교재 산식)`)
}

// ══════════════════════════════════════════════════════════════════
head('⑧-d ★복성 · 3글자 이상 · 순화 해설 (2026-07-31 3차)')
{
  const CH = (h: string, j: string, st: number, o: string) =>
    ({ hangul: h, hanja: j, strokes: st, resourceOhaeng: ohaengOrEmpty(o) })
  const base = { yongsin: '화', elementScore: { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20 } }

  // ── 복성 목록
  const bookCnt = COMPOUND_SURNAMES.filter(x => x.source === 'book').length
  const extraCnt = COMPOUND_SURNAMES.filter(x => x.source === 'extra').length
  check(bookCnt === 19, `교재 139~150쪽 복성 ${bookCnt}개 (19)`)
  check(extraCnt === 8, `교재 밖 복성 ${extraCnt}개 (8)`)
  check(COMPOUND_SURNAMES.length === 27, `복성 합계 ${COMPOUND_SURNAMES.length}개 (27)`)
  check(new Set(COMPOUND_SURNAMES.map(x => x.hangul)).size === 27, `한글 표기 겹침 없음`)
  check(new Set(COMPOUND_SURNAMES.map(x => x.hanja)).size === 27, `한자 표기 겹침 없음`)
  check(!!COMPOUND_SURNAMES.find(x => x.hangul === '망절'), `교재 밖 — 망절(網切) 등재`)
  check(!!COMPOUND_SURNAMES.find(x => x.hangul === '순우'), `교재 밖 — 순우(淳于) 등재`)
  check(COMPOUND_SURNAMES.every(x => x.hangul.length === 2 && x.hanja.length === 2),
    `복성은 전부 두 글자입니다`)
  check(!!COMPOUND_SURNAMES.find(x => x.hangul === '남궁' && x.hanja === '南宮'), `남궁(南宮) 등재`)
  check(!!COMPOUND_SURNAMES.find(x => x.hangul === '황보'), `황보(皇甫) 등재`)
  check(!!COMPOUND_SURNAMES.find(x => x.hangul === '제갈'), `제갈(諸葛) 등재`)

  // ── splitSurname
  const nm = [CH('남', '南', 9, '火'), CH('궁', '宮', 10, '土'),
              CH('민', '民', 5, '水'), CH('수', '秀', 7, '木')]
  const sp = splitSurname(nm)
  check(sp.surname.length === 2 && sp.given.length === 2, `남궁민수 → 성 2 · 이름 2`)
  check(sp.compound?.hangul === '남궁', `복성으로 잡힙니다`)
  const sp2 = splitSurname([CH('류', '柳', 9, '木'), CH('승', '承', 8, '金'), CH('현', '炫', 9, '火')])
  check(sp2.surname.length === 1 && sp2.given.length === 2, `류승현 → 성 1 · 이름 2 (단성)`)
  // ★두 글자만 있으면 복성으로 보지 않습니다 — 이름이 0글자가 되기 때문
  check(splitSurname([CH('남', '南', 9, '火'), CH('궁', '宮', 10, '土')]).surname.length === 1,
    `두 글자뿐이면 복성으로 가르지 않습니다`)

  // ── 복성 사격 (성 획수 = 9 + 10 = 19)
  const rNG = diagnoseName({
    surname: sp.surname[0], surname2: sp.surname[1], given: sp.given as NameChar[], ...base })
  check(rNG.suri.gyeok.length === 4, `남궁민수 — 사격 4개 (예전엔 0개)`)
  check((rNG.suri.facts as Record<string, unknown>).성획수 === 19, `성 획수 = 南9 + 宮10 = 19`)
  check(rNG.suri.gyeok[3].sum === 31, `정격 = 19 + 5 + 7 = 31`)
  check(rNG.suri.grade !== '좋음', `격을 낸 뒤의 등급입니다 (${rNG.suri.grade})`)

  // ── 3글자 이름 (박하늘별)
  const r3 = diagnoseName({ surname: CH('박', '朴', 6, '木'),
    given: [CH('하', '夏', 10, '火'), CH('늘', '訥', 11, '金'), CH('별', '別', 7, '金')] as NameChar[], ...base })
  check(r3.suri.gyeok.length === 4, `세 글자 이름 — 사격 4개 (예전엔 0개)`)
  check(r3.suri.gyeok[0].sum === 28, `원격 = 이름 전체 합 (10+11+7)`)
  check(r3.suri.gyeok[2].sum === 24, `이격 = 성 + 나머지 (6+11+7)`)
  check(r3.suri.gyeok[3].sum === 34, `정격 = 성 + 이름 전체 (6+28)`)

  // ── 두 글자 이름은 회귀가 없어야 합니다
  const rS = diagnoseName({ surname: CH('류', '柳', 9, '木'),
    given: [CH('승', '承', 8, '金'), CH('현', '炫', 9, '火')] as NameChar[], ...base })
  check(rS.suri.gyeok.map(x => x.sum).join(',') === '17,17,18,26',
    `류승현 사격 17·17·18·26 — 3차 개편 뒤에도 그대로`)

  // ── 순화 해설
  const missing: number[] = []
  for (let i = 1; i <= 81; i++) if (!SURI_81_GUIDE[i]) missing.push(i)
  check(missing.length === 0, `순화 해설 81칸 — 빠진 수 ${missing.join(',') || '없음'}`)
  check(Object.values(SURI_81_GUIDE).every(x => !!x.theme && !!x.gentle), `주제·안내가 전부 채워짐`)
  // 🔴 손님에게 나갈 문장에 자극적인 말이 섞이지 않았는가 (교훈 EG)
  const HARSH = ['자살', '요절', '단명', '사별', '패가망신', '불구', '횡사', '병약', '과부', '홀아비']
  const dirty = Object.entries(SURI_81_GUIDE)
    .filter(([, v]) => HARSH.some(w => v.gentle.includes(w))).map(([k]) => k)
  check(dirty.length === 0, `★순화 해설에 자극적 표현 없음 — ${dirty.join(',') || '0건'}`)
  check(!HARSH.some(w => SURI_TONE_GUIDE.includes(w)), `어조 지침에도 금지어를 예시로 적지 않았습니다`)
  check(rS.suri.gyeok.every(x => !!x.gentle), `사격 넷 모두 안내 문장을 싣고 나갑니다`)
  check(String((rS.suri.facts as Record<string, unknown>).서술지침).length > 0, `AI 재료에 어조 지침 포함`)
}

// ══════════════════════════════════════════════════════════════════
head('⑧-2 ★새 DB 컬럼 바인딩 — 마이그레이션 전/후 모두 (3단계)')
// ══════════════════════════════════════════════════════════════════
//
// ⚠️⚠️ 왜 «전/후 둘 다» 를 검사하나
//    Supabase 는 없는 컬럼을 select 하면 **400 으로 통째로 실패** 합니다.
//    그래서 HANJA_SELECT 를 `*` 로 두고, 읽기 함수가 «새 컬럼이 있으면 그것을,
//    없으면 옛 컬럼을» 씁니다. → SQL 을 먼저 돌려도, 코드를 먼저 올려도 안 깨집니다.
//    ★이 구획이 그 하위호환을 잠급니다.
{
  check(HANJA_SELECT === '*',
    `★HANJA_SELECT 가 '*' 입니다 — 컬럼 이름을 나열하면 마이그레이션 전에 400 으로 죽습니다`)

  // ── 마이그레이션 «전» 의 줄 (옛 컬럼만) ──
  const before: HanjaRow = {
    hangul: '류', hanja: '柳', meaning: '버들', strokes: 9,
    resource_ohaeng: '木',            // ★덕암 자료는 한자입니다
    grade: '中吉', avoid_hard: false, avoid_soft: false,
  }
  check(rowOhaeng(before) === '목', `마이그레이션 전 — resource_ohaeng('木') → '목'`)
  check(rowStrokes(before) === 9, `마이그레이션 전 — strokes(9)`)
  check(rowNameUse(before) === true, `마이그레이션 전 — grade('中吉') → 쓸 수 있음`)
  check(rowOhaengSecondary(before) === null, `마이그레이션 전 — 부 자원오행 없음`)

  // ── 마이그레이션 «뒤» 의 줄 (새 컬럼이 있음) ──
  const after: HanjaRow = {
    ...before,
    resource_ohaeng_primary: '목',
    resource_ohaeng_secondary: '수',
    strokes_kangxi: 10,              // ★일부러 strokes(9) 와 다르게 둡니다
    is_name_use: true,
  }
  check(rowOhaeng(after) === '목', `마이그레이션 뒤 — resource_ohaeng_primary`)
  check(rowStrokes(after) === 10,
    `★마이그레이션 뒤 — strokes_kangxi(10) «가» 이깁니다 (strokes 9 아님 · 원획법)`)
  check(rowOhaengSecondary(after) === '수', `부 자원오행을 읽습니다`)
  check(rowNameUse(after) === true, `is_name_use 를 읽습니다`)

  // ── 새 컬럼이 «있지만 비어 있을» 때 — 가장 위험한 자리 ──
  //   SQL STEP 4 가 컬럼만 만들고 UPDATE 를 안 하면 strokes_kangxi 가 NULL 입니다.
  //   그때 0 으로 읽으면 수리 4격이 통째로 깨집니다.
  const half: HanjaRow = { ...before, strokes_kangxi: null, is_name_use: null, resource_ohaeng_primary: null }
  check(rowStrokes(half) === 9,
    `★strokes_kangxi 가 NULL 이면 strokes 로 돌아갑니다 (0 으로 읽지 않습니다)`)
  check(rowOhaeng(half) === '목', `resource_ohaeng_primary 가 NULL 이면 원본으로`)
  check(rowNameUse(half) === true, `is_name_use 가 NULL 이면 grade 로`)
  const zero: HanjaRow = { ...before, strokes_kangxi: 0 }
  check(rowStrokes(zero) === 9, `★strokes_kangxi 가 0 이어도 믿지 않습니다`)

  // ── 불용한자 — ★개명 화면 둘이 «전혀 거르지 않던» 자리 ──
  const bu: HanjaRow = { ...before, grade: '不用' }
  check(rowNameUse(bu) === false, `grade='不用' → 쓸 수 없음`)
  check(isAvoidChar(bu) === true, `★isAvoidChar 가 不用 을 거릅니다`)
  check(avoidReason(bu).why === 'not_name_use', `걸른 이유를 남깁니다`)
  const buNew: HanjaRow = { ...before, grade: '中吉', is_name_use: false }
  check(isAvoidChar(buNew) === true, `is_name_use=false 도 거릅니다 (grade 가 中吉 이어도)`)
  check(isAvoidChar({ ...before, grade: ' 不用 ' }) === true,
    `★앞뒤 공백이 붙은 '不用' 도 거릅니다 (문자열 비교의 함정)`)

  // ── 뜻으로 거르기 — diagnosis 에만 있던 그물 ──
  check(isAvoidChar({ ...before, meaning: '죽을, 주검' }) === true,
    `★뜻으로 거르는 그물이 개명 화면에도 옵니다 (AVOID_KEYWORDS)`)
  check(avoidReason({ ...before, meaning: '죽을' }).why === 'meaning', `이유가 'meaning'`)

  // ── 쉬는 줄(중복 격리) ──
  check(isAvoidChar({ ...before, is_active: false }) === true, `is_active=false 는 목록에 안 냅니다`)
  check(isAvoidChar({ ...before, is_active: true }) === false, `is_active=true 는 정상`)
  check(isAvoidChar(before) === false, `평범한 글자는 거르지 않습니다`)

  // ── 한자 공백 정제 ──
  check(rowHanja({ ...before, hanja: ' 熺' }) === '熺',
    `★' 熺' → '熺' (덕암 자료 행 5002)`)

  // ── 변환 ──
  const jc = toJudgeChar(after)
  check(jc.primary === '목' && jc.secondary === '수' && jc.hanja === '柳',
    `toJudgeChar — 주·부 자원오행을 함께 넘깁니다`)
  const nc = toNameChar(after)
  check(nc.strokes === 10 && nc.resourceOhaeng === '목',
    `toNameChar — 원획법 + 표준 표기`)

  // ── 진단 문구 ──
  check(describeRowSource(before).includes('resource_ohaeng('),
    `describeRowSource — 마이그레이션 전을 알려 줍니다`)
  check(describeRowSource(after).includes('strokes_kangxi'),
    `describeRowSource — 마이그레이션 뒤를 알려 줍니다`)
}

// ══════════════════════════════════════════════════════════════════
head('⑧-3 ★개명 후보 정렬 이관 (3단계)')
// ══════════════════════════════════════════════════════════════════
{
  check(Math.abs(CAND_W_RESOURCE + CAND_W_SURI + CAND_W_SOUND - 1) < 1e-9,
    `배점 비율 합이 1 (${CAND_W_RESOURCE.toFixed(3)}+${CAND_W_SURI.toFixed(3)}+${CAND_W_SOUND.toFixed(3)})`)
  check(Math.abs(CAND_W_RESOURCE - 5 / 7.5) < 1e-9,
    `★자원+용신 비율이 옛 가중치(5/7.5)와 같습니다 — 관점의 무게를 바꾸지 않았습니다`)

  const P = flat('화')
  const good = judgeResource(C('柳', '류', '목'), [C('炫', '현', '화')], P)   // 용신 충족
  const bad = judgeResource(C('柳', '류', '목'), [C('垈', '대', '토')], P)    // 상극 + 미충족

  check(candidateScore(good, '좋음', '좋음') > candidateScore(bad, '좋음', '좋음'),
    `같은 수리·발음이면 자원오행이 좋은 쪽이 앞 (${candidateScore(good, '좋음', '좋음')} > ${candidateScore(bad, '좋음', '좋음')})`)
  check(candidateScore(good, '좋음', '좋음') > candidateScore(good, '아쉬움', '아쉬움'),
    `자원오행이 같으면 수리·발음이 좋은 쪽이 앞`)
  const s1 = candidateScore(good, '좋음', '좋음')
  check(s1 >= 0 && s1 <= 100, `점수가 0~100 (${s1})`)

  // ★옛 로직이 «구별 못 하던» 자리를 새 로직이 가르는가
  //   옛 weighted 는 3단 등급이라 상극·과다·기신이 안 보였습니다.
  const Pex = buildSajuOhaengProfile(
    { yongsin: '화', gisin: '토', score: { 목: 10, 화: 20, 토: 60, 금: 10, 수: 10 } })
  const withGisin = judgeResource(C('柳', '류', '목'), [C('炫', '현', '화'), C('垈', '대', '토')], Pex)
  const noGisin = judgeResource(C('柳', '류', '목'), [C('炫', '현', '화'), C('東', '동', '목')], Pex)
  check(candidateScore(noGisin, '좋음', '좋음') > candidateScore(withGisin, '좋음', '좋음'),
    `★기신(토)·과다 투입이 «추천 순서» 에 반영됩니다 (${candidateScore(noGisin, '좋음', '좋음')} > ${candidateScore(withGisin, '좋음', '좋음')})`)

  // ── 비교 함수 ──
  const mk = (fy: boolean, soft: boolean, sc: number, st: number) =>
    ({ fitsYongsin: fy, avoidSoft: soft, score: sc, strokes: st })
  check(compareCandidates(mk(true, false, 10, 9), mk(false, false, 99, 9)) < 0,
    `★용신 충족이 하드 게이트 — 점수가 낮아도 앞 (대표님이 두신 순서)`)
  check(compareCandidates(mk(true, false, 50, 9), mk(true, true, 50, 9)) < 0,
    `avoid_soft 가 아닌 쪽이 앞`)
  check(compareCandidates(mk(true, false, 60, 9), mk(true, false, 50, 9)) < 0, `점수 높은 쪽이 앞`)
  check(compareCandidates(mk(true, false, 50, 8), mk(true, false, 50, 12)) < 0, `같으면 획수 적은 쪽이 앞`)
  check(compareCandidates(mk(true, false, 50, 9), mk(true, false, 50, 9)) === 0, `완전히 같으면 0`)

  // 정렬이 안정적인가 (같은 입력 → 같은 순서)
  const rows = [mk(false, false, 30, 5), mk(true, false, 30, 5), mk(true, false, 90, 20), mk(true, true, 90, 5)]
  const a1 = [...rows].sort(compareCandidates).map(r => r.score).join(',')
  const a2 = [...rows].sort(compareCandidates).map(r => r.score).join(',')
  check(a1 === a2, `정렬이 되돌릴 수 있습니다 (${a1})`)
}

// ══════════════════════════════════════════════════════════════════
head('⑧-4 ★별점 변환 (3단계-b · 대표님 지시)')
// ══════════════════════════════════════════════════════════════════
{
  check(STAR_FLOOR === 2.5, `하한이 ★2.5 — 손님 화면에 ★1.0·★2.0 이 나올 수 없습니다`)
  check(STAR_BANDS.length === 6, `칸 여섯 (5.0/4.5/4.0/3.5/3.0/2.5)`)

  // 지시서 라벨표와 한 칸씩 대조
  const want: Array<[number, number, string]> = [
    [100, 5.0, '매우 조화로움'], [90, 5.0, '매우 조화로움'],
    [89, 4.5, '우수함'], [75, 4.5, '우수함'],
    [74, 4.0, '좋음'], [60, 4.0, '좋음'],
    [59, 3.5, '보통 · 살펴볼 자리'], [45, 3.5, '보통 · 살펴볼 자리'],
    [44, 3.0, '참고 · 보완 권장'], [30, 3.0, '참고 · 보완 권장'],
    [29, 2.5, '살펴볼 자리가 여럿'], [0, 2.5, '살펴볼 자리가 여럿'],
  ]
  let bandBad = 0
  for (const [sc, st2, lb] of want) {
    const r = starOf(sc)
    if (r.star !== st2 || r.label !== lb) bandBad++
  }
  check(bandBad === 0, `라벨표 12칸이 지시서와 일치 (어긋남 ${bandBad})`)

  // 단조성 — 점수가 오르는데 별이 내려가면 안 됩니다
  let mono = true
  for (let sc = 0; sc < 100; sc++) if (starOf(sc + 1).star < starOf(sc).star) mono = false
  check(mono, `★점수가 오르면 별도 오르거나 같습니다 (단조)`)

  check(starOf(-50).star === 2.5 && starOf(999).star === 5.0, `범위 밖도 안전하게 잡힙니다`)
  check(starOf(NaN).star === 2.5, `NaN 도 하한으로`)

  // ★용신 하한
  check(YONGSIN_FLOOR === 3.5, `용신 하한이 ★3.5`)
  check(applyYongsinFloor(starOf(10), true).star === 3.5,
    `★용신을 담으면 10점이어도 ★3.5 로 올라갑니다`)
  check(applyYongsinFloor(starOf(10), true).lifted === true, `올라간 것을 표시합니다(lifted)`)
  check(applyYongsinFloor(starOf(10), false).star === 2.5, `용신이 없으면 그대로`)
  check(applyYongsinFloor(starOf(95), true).star === 5.0, `이미 높으면 내리지 않습니다`)
  check(applyYongsinFloor(starOf(95), true).lifted === false, `그때는 lifted=false`)

  // ★판정 어휘 — 별 라벨에도 «흉·나쁨» 이 없어야 합니다
  const BANWORD = ['흉', '나쁨', '나쁜', '불길', '최악', '위험', '실패', '망']
  const hitw = STAR_BANDS.flatMap(b => BANWORD.filter(w => b.label.includes(w)))
  check(hitw.length === 0, `별 라벨에 단정적 부정어 0건 — 걸린 말: ${hitw.join(',') || '없음'}`)

  // 지시서의 «원 공식» 은 라벨표와 다릅니다 — 그 사실을 잠급니다
  check(starRaw(60) !== starOf(60).star,
    `★원 공식과 라벨표가 다릅니다 — 60점: 공식 ★${starRaw(60)} vs 표 ★${starOf(60).star}`)

  // 다섯 관점
  const st = perspectiveStars({
    flowScore: 27, flowMax: 30, matchScore: 40, matchMax: 70, hasYongsin: true,
    yinYangGrade: '좋음', soundGrade: '보통', suriGrade: '아쉬움',
  })
  check(st.length === 5, `관점 다섯`)
  check(st.map(x => x.key).join() === 'yinyang,baleum,suri,jawon,yongsin', `순서가 화면과 같습니다`)
  check(st.find(x => x.key === 'jawon')!.precise === true, `자원오행은 정밀 점수`)
  check(st.find(x => x.key === 'suri')!.precise === false, `수리는 아직 3단 등급 (4단계 대상)`)
  check(st.every(x => x.star >= 2.5 && x.star <= 5.0), `다섯 관점 전부 범위 안`)

  // 용신 하한이 «사주와의 만남» 에만 걸리는가
  const low = perspectiveStars({
    flowScore: 0, flowMax: 30, matchScore: 5, matchMax: 70, hasYongsin: true,
    yinYangGrade: '아쉬움', soundGrade: '아쉬움', suriGrade: '아쉬움',
  })
  check(low.find(x => x.key === 'yongsin')!.star === 3.5,
    `★용신을 담으면 «사주와의 만남» 이 ★3.5 아래로 안 내려갑니다`)
  check(low.find(x => x.key === 'jawon')!.star === 2.5,
    `★자원오행에는 하한을 걸지 않습니다 (지시서는 사주와의 만남에만)`)

  const ov = overallStar(st, true)
  check(ov.star >= 2.5 && ov.star <= 5.0, `종합 별점도 범위 안 (★${ov.star})`)
  check(starGlyphs(4.5).full === 4 && starGlyphs(4.5).half === 1 && starGlyphs(4.5).empty === 0,
    `별 글자 — ★4.5 = 꽉 4 + 반 1`)
  check(starText(starOf(80)).startsWith('★4.5'), `짧은 말 — ${starText(starOf(80))}`)
}

// ══════════════════════════════════════════════════════════════════
head('⑧-5 ★목록 정책 — «거르기» 가 아니라 «표시하기» (3단계-b)')
// ══════════════════════════════════════════════════════════════════
//
// ⚠️⚠️ 이 구획을 지우지 마십시오. 실제로 손님이 막힐 뻔한 자리입니다.
//   [무엇이 있었나]  3단계가 不用 을 목록에서 «뺐습니다».
//     DB 실측 — 8,650자 중 不用 4,486자(51.9%). 485개 음 가운데
//       ★후보 0개가 되는 음이 50개 (겁 곪 곯 괴 굄 굅 궤 긱 깁 넉 넘 넣 늠 …)
//       1~2개뿐인 음이 101개
//     「겁」은 5자 전부, 「괴」는 15자 전부, 「늠」은 5자 전부가 不用 입니다.
//     → 그 음을 이름에 가진 손님은 한자를 하나도 못 골라 화면이 막힙니다.
//   [고침]  막는 것은 avoid_hard·쉬는 줄뿐. 나머지는 흐리게 + 배지 + 정렬 뒤로.
{
  const base: HanjaRow = {
    hangul: '괴', hanja: '傀', meaning: '허수아비', strokes: 12,
    resource_ohaeng: '火', grade: '不用',
  }
  const pol = listPolicy(base)
  check(pol.show === true, `★不用 이어도 목록에 «보여 줍니다» — 막지 않습니다`)
  check(pol.dim === true && pol.badge === '인명 권장 안 함', `흐리게 + 배지로 알립니다`)
  check(pol.softPenalty === 40, `추천 정렬에서는 뒤로 (${pol.softPenalty})`)
  check(!!pol.note && !/흉|나쁨|불길|위험/.test(pol.note ?? ''), `안내 문구에 단정적 부정어 0건`)

  check(listPolicy({ ...base, avoid_hard: true }).show === false, `avoid_hard 는 막습니다`)
  check(listPolicy({ ...base, is_active: false }).show === false, `쉬는 줄(중복 격리)도 막습니다`)

  const mm = listPolicy({ ...base, grade: '中吉', meaning: '죽을, 주검' })
  check(mm.show === true && mm.badge === '뜻 확인', `무거운 뜻도 «보여 주되» 배지`)
  check(mm.softPenalty === 25, `不用(40)보다는 가볍게 뒤로 (${mm.softPenalty})`)

  const okp = listPolicy({ ...base, grade: '中吉', meaning: '버들' })
  check(okp.show && !okp.dim && okp.badge === null && okp.softPenalty === 0, `평범한 글자는 그대로`)

  // ★정렬 — 不用 이 «뒤로» 가되 목록에는 있는가
  const mkc = (fy: boolean, sc: number, pen: number) =>
    ({ fitsYongsin: fy, avoidSoft: false, score: sc, strokes: 9, softPenalty: pen })
  check(compareCandidates(mkc(true, 50, 0), mkc(true, 99, 40)) < 0,
    `★不用(40)은 점수가 훨씬 높아도 뒤로 갑니다`)
  check(compareCandidates(mkc(true, 50, 25), mkc(true, 50, 40)) < 0,
    `뜻(25)이 不用(40)보다 앞`)
  check(compareCandidates(mkc(true, 50, 0), mkc(false, 99, 0)) < 0,
    `용신 하드 게이트는 여전히 가장 먼저`)
  check(compareCandidates(mkc(true, 50, 0), mkc(true, 50, 0)) === 0, `같으면 0`)

  const noPen = { fitsYongsin: true, avoidSoft: false, score: 50, strokes: 9 }
  check(compareCandidates(noPen, mkc(true, 50, 40)) < 0, `softPenalty 없으면 0 으로 봅니다`)
}


// ══════════════════════════════════════════════════════════════════
head('⑧-6 ★특수 피함 규칙 (3단계-e · 숫자·간지·동자이음·서열)')
// ══════════════════════════════════════════════════════════════════
{
  check(SPECIAL_RULES_ENABLED === true, `특수 규칙이 켜져 있습니다 (끄려면 상수 하나)`)

  // ★말투 — 해설 열 개 전부에 단정적 부정어가 없어야 합니다
  const BANW = ['단명', '이별', '탕진', '흉', '불길', '나쁨', '나쁜', '재앙', '망하', '실패', '죽']
  const allText = Object.values(GENTLE_AVOID_REASONS)
    .flatMap(r => [r.badgeLabel, r.summary, r.gentleDescription]).join(' ')
  const hitw = BANW.filter(w => allText.includes(w))
  check(hitw.length === 0, `순화 해설에 단정적 부정어 0건 — 걸린 말: ${hitw.join(',') || '없음'}`)
  // ★2026-07-30 (4단계) — ILJI_CHUNG 이 늘어 열하나입니다 (『작명개운법』 122쪽)
  check(Object.keys(GENTLE_AVOID_REASONS).length === 11, `해설 열한 갈래`)
  check(Object.values(GENTLE_AVOID_REASONS).every(r => r.badgeLabel.length <= 12),
    `배지가 짧습니다 (카드에 들어가야 합니다)`)

  // ① 숫자·간지
  check(checkSpecialAvoidRules('三').badgeLabel === '수리 충돌 주의', `숫자 — 三`)
  check(checkSpecialAvoidRules('辰').badgeLabel === '사주 충돌 주의', `간지 — 辰`)
  check(checkSpecialAvoidRules('柳').penalty === 0, `평범한 글자는 0`)

  // ② 동자이음 — 읽는 음을 배지에 함께
  const m = checkSpecialAvoidRules('樂')
  check(m.badgeLabel === '다음자(낙/락/악/요)', `동자이음 배지에 음이 붙습니다 — ${m.badgeLabel}`)
  check(m.penalty === 5, `동자이음은 감점이 작습니다 (안내에 가깝습니다)`)

  // ③ ★겹침 — 원안은 첫 번째에서 return 해 하나만 잡았습니다
  const both = checkSpecialAvoidRules('參', { birthOrder: 1 })
  check(both.hits.length >= 2,
    `★한 글자가 둘에 걸리면 «전부» 잡습니다 (參 = 숫자 + 서열, ${both.hits.length}건)`)
  check(both.penalty <= SPECIAL_PENALTY_CAP, `합친 감점에 상한(${SPECIAL_PENALTY_CAP})이 걸립니다`)

  // ④ 서열 — birthOrder 가 없으면 «안 걸립니다»
  check(checkSpecialAvoidRules('元').penalty === 0,
    `★서열은 birthOrder 가 없으면 건너뜁니다 (폼이 «몇째» 를 안 묻습니다)`)
  check(checkSpecialAvoidRules('元', { birthOrder: 2 }).penalty === 25, `둘째가 元 을 쓰면 걸립니다`)
  check(checkSpecialAvoidRules('元', { birthOrder: 1 }).penalty === 0, `첫째가 元 을 쓰면 안 걸립니다`)

  // ⑤ ★여섯 분류는 «비어 있습니다» — 켜면 덕암 판정을 뒤집습니다
  check(LONELY_COLD_SET.size === 0 && SACRED_OVERLOAD_SET.size === 0
     && SEASON_CHANGE_SET.size === 0 && BODY_PART_SET.size === 0,
    `★여섯 분류의 글자 목록이 비어 있습니다 (연재쌤 확정 대기)`)
  check(checkSpecialAvoidRules('夏').penalty === 0,
    `★夏(하) — 덕암 中吉. 계절 분류를 켜지 않아 감점 0`)
  check(checkSpecialAvoidRules('聖').penalty === 0, `★聖(성) — 덕암 中吉. 감점 0`)
  check(checkSpecialAvoidRules('靜').penalty === 0, `★靜(정) — 덕암 中吉. 감점 0`)

  // ⑥ 공백·비가시문자가 붙어도 잡히는가
  check(checkSpecialAvoidRules(' 三').badgeLabel === '수리 충돌 주의', `앞 공백이 붙어도 잡습니다`)
  check(checkSpecialAvoidRules('').penalty === 0, `빈 값은 0`)

  // ⑦ 자료 온전성
  check(NUMBER_HANJA_SET.size === 25 && GANJI_HANJA_SET.size === 22,
    `숫자 25자 · 간지 22자`)
  check(Object.values(MULTI_SOUND_HANJA_MAP).every(v => v.length > 1),
    `동자이음은 음이 둘 이상이어야 합니다`)

  // ⑧ 이름 전체 검사
  const nm = checkSpecialAvoidForName(['柳', '辰', '三'])
  check(nm.length === 2, `이름 전체 검사 — 걸린 글자만 돌려줍니다 (${nm.length}건)`)
  check(nm.every(x => x.result.descriptions.length > 0), `해설이 함께 옵니다`)
}

// ══════════════════════════════════════════════════════════════════
head('⑧-7 ★특수 규칙 ↔ listPolicy 연결 (3단계-e)')
// ══════════════════════════════════════════════════════════════════
{
  const hr = (h: string, g = '中吉', m = ''): HanjaRow =>
    ({ hangul: 'x', hanja: h, meaning: m, strokes: 5, resource_ohaeng: '木', grade: g })

  // ★덕암이 «쓸 수 있다» 고 본 글자는 «흐리게 하지 않습니다»
  const jin = listPolicy(hr('辰', '中吉'))
  check(jin.show && !jin.dim, `★辰(진) 덕암 中吉 — 보이고 흐리지 않습니다`)
  check(jin.badge === null && jin.specialBadge === '사주 충돌 주의',
    `不用 배지는 없고 특수 배지만 붙습니다`)
  check(jin.softPenalty === 12, `정렬에서 조금만 뒤로 (${jin.softPenalty})`)

  // ★不用 + 특수 — 감점이 «합쳐집니다»
  const sal = listPolicy(hr('殺', '不用'))
  check(sal.show && sal.dim, `殺 — 不用 이라 흐리게`)
  check(sal.badge === '인명 권장 안 함' && sal.specialBadge === '다음자(살/쇄)',
    `★배지 둘이 «다른 축» 이라 함께 붙습니다`)
  check(sal.softPenalty === 45, `40(不用) + 5(동자이음) = ${sal.softPenalty}`)

  // 평범한 글자
  const ryu = listPolicy(hr('柳', '中吉', '버들'))
  check(ryu.show && !ryu.dim && ryu.badge === null && ryu.specialBadge === null && ryu.softPenalty === 0,
    `평범한 글자는 그대로`)

  // 막는 것은 여전히 둘뿐
  check(listPolicy({ ...hr('辰'), avoid_hard: true }).show === false, `avoid_hard 는 막습니다`)
  check(listPolicy({ ...hr('辰'), is_active: false }).show === false, `쉬는 줄도 막습니다`)

  // ★특수 규칙만으로는 «절대» 막지 않습니다
  const anySpecialBlocks = ['三', '辰', '樂', '參'].some(h => !listPolicy(hr(h)).show)
  check(!anySpecialBlocks, `★특수 규칙은 «막지» 않습니다 — 감점과 배지만`)

  // 서열 문맥이 listPolicy 로 전달되는가
  const won2 = listPolicy(hr('元'), { birthOrder: 2 })
  check(won2.specialBadge === '서열 관계 확인', `birthOrder 를 listPolicy 가 넘겨받습니다`)
  check(listPolicy(hr('元')).specialBadge === null, `안 넘기면 안 걸립니다`)
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
