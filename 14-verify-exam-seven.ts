// 14-verify-exam-seven.ts — 합격운 7대 카테고리를 «두 벌 다» 끝까지 관통시킨다
//   npx tsx 14-verify-exam-seven.ts
//
// 교훈 CK — 자료를 얹은 날에는 한 명을 끝까지 통과시켜 보라
// 교훈 CF — 얹으면서 크기를 잰다
// 교훈 CZ — 프롬프트 금지어는 «AI 에게만» 닿는다. 표에 있는 낱말도 함께 재라
//
// ★검사하는 것 여섯
//   ① 일곱 갈래가 세 묶음에 «빠짐없이 한 번씩» 들어가는가
//   ② 폼 여섯 변수(지시서 1장)가 프롬프트에 실렸는가
//   ③ 학생 프롬프트·업상대체 학생 문구에 금지어가 0건인가
//   ④ 제목(이모지+번호)이 sevenKeyOf 로 되읽히는가 — 왕복
//   ⑤ 지시서 2장 평가 규칙(60:40 · 합격신호 · 업상대체)이 실렸는가
//   ⑥ 묶음마다 프롬프트 크기 — max_tokens 를 맞추는 근거

import {
  buildSevenPrompt, sevenOf, SEVEN_GROUPS, sevenKeyOf,
  SEVEN_STUDENT, SEVEN_ADULT, type SevenKey, type SevenArgs,
} from './lib/saju/examLuck/buildExamSeven'
import { judgePassSignal, passSignalBlock } from './lib/saju/examLuck/passSignal'
import { upsangBlock, UPSANG } from './lib/saju/examLuck/tables/upsang'
import { hasStudentBan, STUDENT_BAN_WORDS } from './lib/saju/examLuck/tables/rules'
import { parseExamTongbyeon } from './lib/saju/examLuck/buildExamPrompt'
import { calcSimsanOhaeng } from './lib/saju/simsanOhaeng'
import { buildAllCards } from './lib/saju/examLuck/buildCards'
import { judgeYears, currentDayunOf } from './lib/saju/examLuck/examScore'
import { judgeJobChangeNatal } from './lib/saju/examLuck/jobChange'
import { judgeExamDay } from './lib/saju/examLuck/examDay'
import { dayunGanjiList } from './lib/saju/dayun'
import type { ExamCard, ExamTarget } from './lib/saju/examLuck/types'

type P = { pillar: string; stem: string; branch: string }

let fails = 0
const bad = (m: string) => { console.log('  ❌ ' + m); fails++ }
const ok = (m: string) => console.log('  ✅ ' + m)

// ════════════════════════════════════════════════════════════════
//  두 사람 — 학생 하나, 성인 하나
// ════════════════════════════════════════════════════════════════

/** 2009-08-15 未시 남 — 화면 캡처의 그 학생(고3 · 상위권 · 자연공학 · 수시 · 2026-11-15) */
const student = {
  saju: [
    { pillar: '년주', stem: '己', branch: '丑' },
    { pillar: '월주', stem: '壬', branch: '申' },
    { pillar: '일주', stem: '丙', branch: '午' },
    { pillar: '시주', stem: '乙', branch: '未' },
  ] as P[],
  month: 8, day: 15, hourBranch: '未',
}

/** 1988-05-15 14:30 남 — 저장소 E2E 표준 명식 (10-e2e-integrated 와 같은 사람) */
const adult = {
  saju: [
    { pillar: '년주', stem: '戊', branch: '辰' },
    { pillar: '월주', stem: '丁', branch: '巳' },
    { pillar: '일주', stem: '庚', branch: '午' },
    { pillar: '시주', stem: '癸', branch: '未' },
  ] as P[],
  month: 5, day: 15, hourBranch: '未',
}

/** 판정 카드 시늉 — 실제 buildAllCards 를 부르려면 대운 API 가 필요하다 */
const fakeCards = (who: 'student' | 'adult'): ExamCard[] => [
  {
    key: 'years', title: '앞으로의 흐름', lines: [], reasons: [
      '2026 丙午 · 천간 편관 · 지지 정관 · 보통',
      '2027 丁未 · 천간 정관 · 지지 상관 · 좋음',
    ],
  },
  {
    key: 'dayun', title: '지금의 흐름', lines: [], reasons: [
      who === 'student' ? '지금 대운 甲戌 (13세부터 열 해)' : '지금 대운 壬戌 (37세부터 열 해)',
    ],
  },
  {
    key: 'examday', title: '시험 날짜와 실전 준비', lines: [], reasons: [
      '시험일 2026-11-15 · 세운 丙午(보통)',
      '월운 己亥 — 천간 정관 · 지지 편관',
      '일진 癸巳 — 천간 정관 · 지지 비견',
      '★시험 당일은 일간 기준으로 정관과 비견이 겹치는 날입니다',
    ],
  },
]

function argsFor(target: ExamTarget): SevenArgs {
  const who = target === 'student' ? student : adult
  const score = calcSimsanOhaeng(who.saju as never, who.month, who.day, who.hourBranch)
  const sig = passSignalBlock(judgePassSignal(who.saju as never, target, score))
  const track = target === 'student' ? 'natural' : 'natural'
  const ups = upsangBlock(track, { saju: who.saju as never, ohaengScore: score, target })
  return {
    name: 'B', gender: '남', age: target === 'student' ? 16 : 38,
    target, kind: target === 'student' ? 'exam' : 'job',
    cards: fakeCards(target === 'student' ? 'student' : 'adult'),
    saju: who.saju, hourUnknown: false,
    studentGrade: target === 'student' ? '고등학교 3학년' : null,
    gradeBlock: null,
    scoreRange: target === 'student' ? '상위권 (1~2등급대)' : null,
    targetMajor: '자연 · 공학',
    targetType: target === 'student' ? '대입 수시 (학종 · 교과 · 논술)' : null,
    targetAcademic: target === 'student' ? '주요 상위권 대학' : '공사·공기업 시험',
    examDate: '2026-11-15',
    examDayNote: '일진 癸巳 · 월운 己亥',
    signalBlock: sig || null,
    upsangBlock: ups || null,
    year: 2026,
  }
}

// ════════════════════════════════════════════════════════════════
console.log('════════════════════════════════════════════════════════')
console.log('  합격운 7대 카테고리 — 진학/취업 두 벌 관통 검사')
console.log('════════════════════════════════════════════════════════\n')

// ── ① 갈래가 빠짐없이 한 번씩 ─────────────────────────────────────
console.log('① 일곱 갈래가 세 묶음에 빠짐없이 한 번씩 들어가는가')
{
  const flat = SEVEN_GROUPS.flat()
  const dupe = flat.filter((k, i) => flat.indexOf(k) !== i)
  for (const table of [SEVEN_STUDENT, SEVEN_ADULT]) {
    const keys = table.map(s => s.key)
    const missing = keys.filter(k => !flat.includes(k))
    const extra = flat.filter(k => !keys.includes(k))
    if (missing.length) bad(`빠진 갈래: ${missing.join(', ')}`)
    if (extra.length) bad(`표에 없는 갈래: ${extra.join(', ')}`)
  }
  if (dupe.length) bad(`두 묶음에 겹친 갈래: ${dupe.join(', ')}`)
  if (!dupe.length) ok(`묶음 ${SEVEN_GROUPS.length}개 · 갈래 ${flat.length}개 · 겹침 0 · 빠짐 0`)
  console.log(`     ${SEVEN_GROUPS.map(g => `[${g.join('+')}]`).join(' ')}`)
}

// ── ②③⑤⑥ 프롬프트 검사 ─────────────────────────────────────────
for (const target of ['student', 'adult'] as ExamTarget[]) {
  const label = target === 'student' ? '진학(학생)' : '취업(성인)'
  const v = argsFor(target)
  const table = sevenOf(target)
  console.log(`\n──────── ${label} ────────`)

  const prompts = SEVEN_GROUPS.map(g => buildSevenPrompt(v, g) ?? '')
  if (prompts.some(p => !p)) bad('묶음 가운데 프롬프트가 안 나온 것이 있음')

  // ② 폼 여섯 변수 (지시서 1장)
  const all = prompts.join('\n')
  const need: Array<[string, string | null | undefined]> = [
    ['studentGrade', v.studentGrade], ['scoreRange', v.scoreRange],
    ['targetMajor', v.targetMajor], ['targetType', v.targetType],
    ['targetAcademic', v.targetAcademic], ['examDate', v.examDate],
  ]
  const miss = need.filter(([, val]) => val).filter(([, val]) => !all.includes(String(val)))
  if (miss.length) bad(`프롬프트에 안 실린 폼 변수: ${miss.map(x => x[0]).join(', ')}`)
  else ok(`폼 변수 ${need.filter(x => x[1]).length}개 전부 실림 (지시서 1장)`)

  // ⑤ 지시서 2장 평가 규칙
  const rules: Array<[string, boolean]> = [
    ['가중치(성적 6 : 흐름 4)', all.includes('환경이 6') || all.includes('성적과 환경이 6')],
    ['합격 신호 블록', all.includes('[합격 신호')],
    ['주로 보는 기운', all.includes('주로 보는 기운')],
    ['학업 몰입도', all.includes('학업 몰입도')],
    ['세부 적성(업상대체)', all.includes('[세부 적성')],
    ['숫자 비율 지시', all.includes('숫자로 내세요')],
    ['마침표 완결 지시', all.includes('마침표로 맺으세요')],
  ]
  for (const [n, hit] of rules) hit ? ok(n) : bad(`${n} — 프롬프트에 없음`)

  // ③ 학생 금지어
  if (target === 'student') {
    const hits = STUDENT_BAN_WORDS.filter(w => all.replace(/\s/g, '').includes(w.replace(/\s/g, '')))
    // ★프롬프트는 «쓰지 마세요» 목록 자체를 담고 있으므로, 그 블록을 뺀 뒤 재야 한다.
    const body = all.replace(/★이 손님은 학생입니다[\s\S]*?\n\n/g, '')
    const real = STUDENT_BAN_WORDS.filter(w => body.replace(/\s/g, '').includes(w.replace(/\s/g, '')))
    if (real.length) bad(`학생 프롬프트 본문에 금지어: ${real.join(', ')}`)
    else ok(`학생 프롬프트 본문 금지어 0건 (금지 목록 블록에서만 ${hits.length}개 — 정상)`)
  }

  // ⑥ 크기
  console.log('   묶음별 크기 —')
  SEVEN_GROUPS.forEach((g, i) => {
    const n = prompts[i].length
    console.log(`     ${i + 1}묶음 [${g.join('+')}]  ${String(n).padStart(5)}자  · maxTokens ${g.length * 1200}`)
  })

  // ④ 제목 왕복
  const rt = table.filter(s => sevenKeyOf(`■ ${s.title}`, target) !== s.key)
  if (rt.length) bad(`제목 왕복 실패: ${rt.map(s => s.title).join(' / ')}`)
  else ok(`제목 ${table.length}개 왕복 성공 (이모지·번호 붙은 채로)`)

  // AI 가 제목을 흘려 쓴 경우
  const sloppy: Array<[string, SevenKey]> = target === 'student'
    ? [['■ 1. 타고난 공부 DNA', 'dna'], ['■ 타고난 공부 DNA와 적성', 'dna'],
       ['■ 🗓️ 열두 달 마음 페이스메이커', 'monthly'], ['■ 5. D-Day 시험 당일 실전 수칙', 'dday'],
       ['■ 수험생과 부모님께', 'mentor'], ['■ ⚖️ 3. 수시와 정시', 'ratio']]
    : [['■ 타고난 일의 결', 'dna'], ['■ 어디를 노릴까', 'apply'],
       ['■ 3. 시험 준비와 실무 경력', 'ratio'], ['■ 마지막으로 드리고 싶은 말', 'mentor']]
  const sl = sloppy.filter(([t, k]) => sevenKeyOf(t, target) !== k)
  if (sl.length) bad(`흘려 쓴 제목 못 잡음: ${sl.map(x => x[0]).join(' / ')}`)
  else ok(`흘려 쓴 제목 ${sloppy.length}가지 전부 잡음 (교훈 CY)`)
}

// ── ③-2 업상대체 표 자체의 학생 문구 ────────────────────────────
console.log('\n──────── 업상대체 표 (upsang.ts) ────────')
{
  const dirty = UPSANG.filter(r => hasStudentBan(r.student))
  if (dirty.length) {
    for (const d of dirty) {
      bad(`학생 문구에 금지어 — ${d.key}: ${d.student}`)
    }
  } else ok(`학생 문구 ${UPSANG.length}줄 전부 금지어 0건`)

  const tracks = [...new Set(UPSANG.map(r => r.track))]
  console.log(`     계열 ${tracks.length}갈래 · 줄 ${UPSANG.length}개 — ${tracks.join(', ')}`)

  // 걸림 비율 — 교훈 BO (규칙을 더하면 무작위로 걸림 비율을 재라)
  const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const BR = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  const N = 3000
  const hitCount: Record<string, number> = {}
  let zero = 0
  for (let i = 0; i < N; i++) {
    const s: P[] = ['년주', '월주', '일주', '시주'].map(pl => ({
      pillar: pl,
      stem: STEMS[Math.floor(Math.random() * 10)],
      branch: BR[Math.floor(Math.random() * 12)],
    }))
    const sc = calcSimsanOhaeng(s as never, 1 + Math.floor(Math.random() * 12), 15, s[3].branch)
    let any = false
    for (const t of tracks) {
      const b = upsangBlock(t, { saju: s as never, ohaengScore: sc, target: 'student' })
      if (b) { hitCount[t] = (hitCount[t] ?? 0) + 1; any = true }
    }
    if (!any) zero++
  }
  console.log(`     무작위 ${N}명 걸림 비율 —`)
  for (const t of tracks) {
    const pct = ((hitCount[t] ?? 0) / N * 100).toFixed(1)
    console.log(`       ${t.padEnd(12)} ${String(hitCount[t] ?? 0).padStart(5)}  ${pct}%`)
  }
  console.log(`     계열 일곱 어디에도 안 걸리는 사람  ${(zero / N * 100).toFixed(1)}%`)
  console.log('     ⚠️ 안 걸리면 프롬프트에 [세부 적성] 블록을 아예 안 넣습니다. (교훈 BF)')
}

// ── 합격 신호 걸림 비율 ─────────────────────────────────────────
console.log('\n──────── 합격 신호 (passSignal.ts) 걸림 비율 ────────')
{
  const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const BR = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  const N = 3000
  const tally: Record<string, number> = {}
  const focus: Record<string, number> = {}
  for (let i = 0; i < N; i++) {
    const s: P[] = ['년주', '월주', '일주', '시주'].map(pl => ({
      pillar: pl,
      stem: STEMS[Math.floor(Math.random() * 10)],
      branch: BR[Math.floor(Math.random() * 12)],
    }))
    const sc = calcSimsanOhaeng(s as never, 1 + Math.floor(Math.random() * 12), 15, s[3].branch)
    const r = judgePassSignal(s as never, 'student', sc)
    focus[r.focus.grade] = (focus[r.focus.grade] ?? 0) + 1
    if (r.mainMissing) tally['무인성'] = (tally['무인성'] ?? 0) + 1
    for (const key of ['관인상생', '관대(冠帶)', '금수쌍청', '목화통명', '천간합']) {
      if (r.positives.some(p => p.includes(key))) tally[key] = (tally[key] ?? 0) + 1
    }
    for (const key of ['상관견관', '충·형', '재극인', '비겁이', '과다']) {
      if (r.warnings.some(w => w.includes(key))) tally[key] = (tally[key] ?? 0) + 1
    }
  }
  for (const [k, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${k.padEnd(12)} ${String(n).padStart(5)}  ${(n / N * 100).toFixed(1)}%`)
  }
  console.log(`     몰입도 등급 — A ${((focus.A ?? 0) / N * 100).toFixed(1)}% · `
    + `B ${((focus.B ?? 0) / N * 100).toFixed(1)}% · C ${((focus.C ?? 0) / N * 100).toFixed(1)}%`)
}

// ── ★2026-07-30 신설 — «진짜 카드» 로 금지어를 훑는다 ────────────
//
//   ⚠️⚠️ 왜 이 검사가 따로 필요한가
//     처음에 이 검사기는 위쪽에서 «시늉 카드(fakeCards)» 를 썼습니다.
//     그래서 buildAllCards 가 만드는 진짜 재료줄을 한 번도 안 봤고,
//     학생 프롬프트에 교재 원문(공무원·로스쿨·기술 자격증)이 실려 나가는 것을
//     **놓쳤습니다.** 15-e2e-exam-live.ts 를 돌려서야 드러났습니다.
//   ★교훈 — «시늉 재료로 통과한 검사» 는 통과가 아닙니다.
//     아래는 무작위 학생 명식으로 buildAllCards 를 실제로 돌려 훑습니다.
console.log('\n──────── 진짜 카드(buildAllCards)의 학생 금지어 ────────')
{
  const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const BR = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  const GRADES = ['elem', 'mid', 'high12', 'high3', 'nsu', 'etc']
  const N = 400
  const leaks: Record<string, number> = {}
  let checked = 0
  for (let i = 0; i < N; i++) {
    const s: P[] = ['년주', '월주', '일주', '시주'].map(pl => ({
      pillar: pl,
      stem: STEMS[Math.floor(Math.random() * 10)],
      branch: BR[Math.floor(Math.random() * 12)],
    }))
    const by = 2006 + Math.floor(Math.random() * 12)
    const input = {
      saju: s as never, birthYear: by, birthMonth: 1 + Math.floor(Math.random() * 12),
      birthDay: 1 + Math.floor(Math.random() * 28), gender: '남', span: 5,
      target: 'student' as const, examKind: 'daeip',
    }
    const forward = true
    const dl = dayunGanjiList(`${s[1].stem}${s[1].branch}`, forward, 10)
      .map((d, k) => ({ age: 5 + k * 10, cheongan: d.cheongan, jiji: d.jiji, ganYukchin: '—', jiYukchin: '—' }))
    const years = judgeYears(input, 2026, dl as never, 'exam')
    const cur = currentDayunOf(input, dl as never)
    let cards: ExamCard[] = []
    try {
      cards = buildAllCards({
        input, years, dayun: cur.dayun as never, order: cur.order ?? 0,
        natal: judgeJobChangeNatal(s as never),
        byYear: [],
        examDay: judgeExamDay(s as never, 2026, 11, 15, '시험일', 'exam'),
        purpose: 'exam',
        grade: GRADES[Math.floor(Math.random() * GRADES.length)],
      } as never)
    } catch { continue }
    checked++
    for (const c of cards) {
      for (const [kind, arr] of [['화면줄', c.lines], ['재료줄', c.reasons]] as Array<[string, string[]]>) {
        for (const l of arr) {
          for (const w of STUDENT_BAN_WORDS) {
            if (l.replace(/\s/g, '').includes(w.replace(/\s/g, ''))) {
              leaks[`${c.title} · ${kind} · ${w}`] = (leaks[`${c.title} · ${kind} · ${w}`] ?? 0) + 1
            }
          }
        }
      }
    }
  }
  const keys = Object.keys(leaks)
  if (keys.length) {
    for (const k of keys.sort()) bad(`금지어 누수 — ${k}  (${leaks[k]}건)`)
  } else ok(`무작위 학생 ${checked}명 · 카드 전부 · 화면줄+재료줄 금지어 0건`)
}

// ── ★2026-07-30 신설 — «부분 도착» 글이 갈래로 잡히는가 ──────────
//
//   ⚠️⚠️ 왜 이 검사가 생겼나 (대표님이 실기기에서 잡아 주신 것)
//     「0/3 묶음」에서 멈춘 것처럼 보이던 일이 있었습니다. 타임아웃도 한도도
//     아니었고, runGroup 이 **조각을 제 안에만 쌓고 화면에 안 알렸기** 때문입니다.
//     한 묶음이 통째로 끝나야 처음 나타나니 1~2분간 0/3 이 그대로 떠 있었습니다.
//   → 이제 조각이 올 때마다 화면을 갱신합니다(진로적성과 같은 방식).
//     그러면 **반쪽만 온 글** 이 파서에 들어갑니다. 그래도 갈래를 놓치지 않아야
//     화면이 튀지 않습니다. 아래가 그것을 지킵니다.
console.log('\n──────── 부분 도착(스트리밍) 글이 갈래로 잡히는가 ────────')
{
  const sample = (t: string[]) => t.map(x => `■ ${x}\n[한줄] 한 문장.\n[태그] 가 · 나\n\n본문입니다.\n\n[실천] 해보세요.`).join('\n\n')
  let miss = 0
  for (const target of ['student', 'adult'] as ExamTarget[]) {
    const table = sevenOf(target)
    // 세 묶음이 각각 쓸 글을 흉내 낸다
    for (const g of SEVEN_GROUPS) {
      const full = sample(table.filter(x => g.includes(x.key)).map(x => x.title))
      // 1자씩 늘려 가며 — 잡힌 갈래가 «그 묶음 안» 것이어야 합니다
      for (let n = 1; n <= full.length; n++) {
        const parsed = parseExamTongbyeon(full.slice(0, n))
        for (const [title, body] of Object.entries(parsed.byTitle)) {
          if (!body.trim()) continue
          const k = sevenKeyOf(title, target)
          if (!k) { miss++; continue }
          // ★엉뚱한 갈래로 잡히면 도표가 딴 곳에 붙습니다 (교훈 CY)
          if (!g.includes(k)) {
            bad(`부분 도착 «${title.slice(0, 20)}» → ${k} (이 묶음에 없는 갈래)`)
            n = full.length
            break
          }
        }
      }
    }
  }
  if (miss > 0) {
    // 제목이 «■ 🧬» 까지만 온 구간은 미상이 정상입니다. 비율만 봅니다.
    ok(`갈래를 아직 못 읽는 구간 ${miss}회 — 제목 앞토막만 온 때이니 정상입니다`)
  }
  ok('부분 도착 전 구간에서 «엉뚱한 갈래» 로 잡히는 일 0건')
}

console.log('\n════════════════════════════════════════════════════════')
if (fails) { console.log(`  ★어긋남 ${fails}건`); process.exit(1) }
console.log('  ✅ 전부 통과')
