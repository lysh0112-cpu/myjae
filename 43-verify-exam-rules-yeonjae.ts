/**
 * 43 — 합격운 · 취업운 «연재쌤 규칙 보충» 값 검사 (2026-09-11 · 6부)
 *
 *  ★[연재쌤 · 대표님 2026-09-11] 교재 230쪽 · 202쪽 대조 문서에 답해 주신 대로 넣었습니다.
 *     ① 관성·인성의 파(破)·해(害)  → 넣지 않음 («실제로 여기까지 잘 보지 않는다»)
 *     ② 화토상관 · 토금상관        → 용신운인 해에 −1
 *     ③ 원국에 천간합 + 지지충      → 점수를 절반으로
 *     ④ 인성·관성 합거            → 용신일 때 −3 · 아닐 때 −1
 *     ⑤ 5급 공채 · 고위직 목표      → 2·3대운에 관성 용신운이 왔으면 5년 모두 +1
 *
 *  ⚠️ 글자 찾기가 아니라 «실제 사주로 점수를 돌려» 봅니다.
 *     조건이 맞을 때만 걸리는가 · 걸리면 점수가 정확히 그만큼 움직이는가.
 */
import { judgeYear, judgeYears } from './lib/saju/examLuck/examScore'
import { examKindOf, BAD, GOOD, NEUTRAL } from './lib/saju/examLuck/tables/rules'
import { calcYongsinNew } from './lib/saju/yongsinNew'
import { calcHourPillar } from './lib/saju/hourPillar'
import { isCheonganHap, isJijiChung, hapedBy, readNatal } from './lib/saju/examLuck/hapchung'
import { sipsinOfChar } from './lib/saju/examLuck/sipsin'
import type { Pillar } from './lib/saju/examLuck/types'

let pass = 0, fail = 0
const ok = (c: boolean, m: string) => { if (c) { pass++; console.log('  ✅ ' + m) } else { fail++; console.log('  🔴 ' + m) } }

const S = '甲乙丙丁戊己庚辛壬癸'.split(''), B = '子丑寅卯辰巳午未申酉戌亥'.split('')
const EL: Record<string, string> = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화', 午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수' }
let seed = 43
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n }
const gz = () => { const i = rnd(60); return [S[i % 10], B[i % 12]] }
const randSaju = (): Pillar[] => {
  const [ys, yb] = gz(); const m = rnd(12), st = ((S.indexOf(ys) % 5) * 2 + 2) % 10
  const [ds, db] = gz(); const h = calcHourPillar(ds, rnd(12))
  return [{ pillar: '시주', stem: h.stem, branch: h.branch }, { pillar: '일주', stem: ds, branch: db },
    { pillar: '월주', stem: S[(st + m) % 10], branch: B[(2 + m) % 12] }, { pillar: '년주', stem: ys, branch: yb }] as Pillar[]
}
const has = (y: { hits: { key: string }[] }, k: string) => y.hits.some(h => h.key === k)
const rows = [...GOOD, ...BAD, ...NEUTRAL]
const w = (k: string) => rows.find(r => r.key === k)?.weight

console.log('\n━━ 규칙표 — 연재쌤이 정하신 점수 그대로인가 ━━')
ok(w('화토토금상관') === -1, '② 화토상관 · 토금상관 −1')
ok(w('용신관인합거') === -3 && w('관인합거') === -1, '④ 관·인 합거 — 용신일 때 −3 · 아닐 때 −1')
ok(w('원국합충혼재') === 0, '③ 원국 합충 혼재는 «점수» 가 아니라 «절반» 으로 (표의 점수 0)')
ok(w('고위직대운') === 1, '⑤ 고위직 대운 +1')
ok(!rows.some(r => /파해|破|害/.test(r.key)), '① 파 · 해는 넣지 않음 [연재쌤]')
ok(examKindOf('goui')?.label.includes('5급') === true && examKindOf('goui')?.purpose === 'exam', '⑤ 목표 목록에 «5급 공채 · 고위직» 이 있습니다 (시험 준비 쪽)')

console.log('\n━━ ② 화토상관 · 토금상관 — 조건이 맞을 때만, −1 ━━')
{
  let hit = 0, wrong = 0, mokgeum = 0
  for (let i = 0; i < 6000; i++) {
    const saju = randSaju(); const ds = saju[1].stem
    const ys = calcYongsinNew(saju, ds); if (!ys) continue
    const [yS, yB] = gz(); const y = judgeYear(saju, 2026, yS, yB)
    const cond = ys.gyeokguk.name.includes('상관격') && (ys.dayElement === '화' || ys.dayElement === '토')
      && (EL[yS] === ys.eokbu.yongsin || EL[yB] === ys.eokbu.yongsin)
    if (has(y, '화토토금상관')) { hit++; if (!cond) wrong++ }
    else if (cond) wrong++
    if (has(y, '화토토금상관') && (ys.dayElement === '목' || ys.dayElement === '금')) mokgeum++
  }
  ok(hit > 0, `실제로 걸리는 사주가 있습니다 (${hit}건)`)
  ok(wrong === 0, `걸린 사주는 모두 «丙丁·戊己 일간 + 상관격 + 용신운» 입니다 (어긋남 ${wrong})`)
  ok(mokgeum === 0, '목화 · 금수 상관에는 걸리지 않습니다 (그쪽은 +3)')
}

console.log('\n━━ ③ 원국에 천간합 + 지지충 — 점수가 절반 ━━')
{
  // 甲子년 · 庚午월 (子午 충) · 己巳일 (甲己 합)
  const mixed = [{ pillar: '시주', stem: '?', branch: '?' }, { pillar: '일주', stem: '己', branch: '巳' },
    { pillar: '월주', stem: '庚', branch: '午' }, { pillar: '년주', stem: '甲', branch: '子' }] as never
  let checked = 0, bad = 0
  for (let i = 0; i < 60; i++) {
    const y = judgeYear(mixed, 2026, S[i % 10], B[i % 12])
    const raw = y.hits.reduce((s, h) => s + h.weight, 0)
    if (!has(y, '원국합충혼재')) bad++
    if (Math.abs(y.score - Math.round(raw / 2 * 10) / 10) > 0.001) bad++
    checked++
  }
  ok(bad === 0, `합과 충이 섞인 원국 — 60갑자 모든 해에서 점수가 정확히 절반 (${checked}해)`)
  let falsePos = 0
  for (let i = 0; i < 3000; i++) {
    const saju = randSaju()
    const st = saju.map(p => p.stem).filter(c => c !== '?'), br = saju.map(p => p.branch).filter(c => c !== '?')
    const hap = st.some((a, x) => st.some((b, z) => z > x && isCheonganHap(a, b)))
    const chung = br.some((a, x) => br.some((b, z) => z > x && isJijiChung(a, b)))
    const [yS, yB] = gz(); const y = judgeYear(saju, 2026, yS, yB)
    if (has(y, '원국합충혼재') !== (hap && chung)) falsePos++
  }
  ok(falsePos === 0, `합만 있거나 충만 있으면 절반으로 줄이지 않습니다 (3,000명 어긋남 ${falsePos})`)
}

console.log('\n━━ ④ 관·인 합거 — 용신이면 −3, 아니면 −1 ━━')
{
  let yongHit = 0, plainHit = 0, wrong = 0
  for (let i = 0; i < 6000; i++) {
    const saju = randSaju(); const ds = saju[1].stem
    const ys = calcYongsinNew(saju, ds); const n = readNatal(saju)
    const [yS, yB] = gz(); const y = judgeYear(saju, 2026, yS, yB)
    const chars = [...n.gwanChars, ...n.inChars].filter(c => hapedBy([c], yS, yB))
    const anyYong = !!ys && chars.some(c => EL[c] === ys.eokbu.yongsin)
    const a = has(y, '용신관인합거'), b = has(y, '관인합거')
    if (a) yongHit++; if (b) plainHit++
    if (a && b) wrong++
    if (chars.length === 0 && (a || b)) wrong++
    if (chars.length && anyYong && !a) wrong++
    if (chars.length && !anyYong && !b) wrong++
  }
  ok(yongHit > 0 && plainHit > 0, `두 갈래 모두 실제로 걸립니다 (용신 ${yongHit} · 아님 ${plainHit})`)
  ok(wrong === 0, `조건과 점수가 모두 맞습니다 · 한 해에 −3 과 −1 이 겹치지 않습니다 (어긋남 ${wrong})`)
}

console.log('\n━━ ⑤ 5급 공채 · 고위직 — 2·3대운 관성 용신운이면 5년 모두 +1 ━━')
{
  let tried = 0, good = 0, bad = 0
  for (let i = 0; i < 20000 && tried < 1500; i++) {
    const saju = randSaju(); const ds = saju[1].stem
    const ys = calcYongsinNew(saju, ds); if (!ys) continue
    const list = [0, 1, 2, 3, 4, 5].map(k => { const [c, j] = gz(); return { age: 5 + k * 10, cheongan: c, jiji: j, ganYukchin: sipsinOfChar(ds, c), jiYukchin: sipsinOfChar(ds, j) } })
    const want = [list[1], list[2]].some(d => [[d.cheongan, d.ganYukchin], [d.jiji, d.jiYukchin]]
      .some(([ch, s]) => (s === '정관' || s === '편관') && EL[ch] === ys.eokbu.yongsin))
    const input = { saju, birthYear: 1990, birthMonth: 5, birthDay: 1, gender: '남', span: 5, target: 'adult', examKind: 'goui' }
    const withGoal = judgeYears(input as never, 2026, list, 'exam')
    const other = judgeYears({ ...input, examKind: 'gongmuwon' } as never, 2026, list, 'exam')
    tried++
    const all = withGoal.every(y => has(y, '고위직대운')), none = withGoal.every(y => !has(y, '고위직대운'))
    if (want ? !all : !none) bad++
    if (other.some(y => has(y, '고위직대운'))) bad++
    if (want) {
      good++
      // +1 이 정확히 얹혔는가 — 세운 점수가 목표만 다른 계산보다 1 높다 (고른시험십신은 두 목표 모두 정관·정인이라 같음)
      withGoal.forEach((y, k) => { if (Math.abs((y.seyunScore ?? y.score) - (other[k].seyunScore ?? other[k].score) - 1) > 0.001) bad++ })
    }
  }
  ok(good > 0, `조건에 맞는 사주가 실제로 있습니다 (${good}/${tried})`)
  ok(bad === 0, `맞으면 5년 모두 +1 · 안 맞거나 다른 목표면 0 (어긋남 ${bad})`)
}

console.log(`\n━━ 연재쌤 규칙 보충 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail) process.exit(1)
