// 15-e2e-exam-live.ts — 대표님이 주신 발행 조건 그대로 «끝까지» 관통시킨다
//   npx tsx 15-e2e-exam-live.ts            요약만
//   npx tsx 15-e2e-exam-live.ts --full     AI 에게 실제로 나갈 프롬프트 셋을 통째로 찍는다
//
// [테스트 조건 — 2026-07-30 대표님]
//   2009-08-15 未시 남 / 고3 / 상위권 / 자연·공학 / 대입 수시 / 시험일 2026-11-15
//
// ⚠️⚠️ 이것은 «실기기 테스트» 가 **아닙니다.**
//   AI 호출(/api/tongbyeon)과 브라우저 렌더링은 여기서 못 합니다.
//   할 수 있는 것은 «발행 단추를 누르는 순간까지» 입니다 —
//     음력·절기 → 네 기둥 → 오행 → 대운 → 세운 판정 → 카드 → 합격신호 →
//     업상대체 → 프롬프트 셋 만들기
//   ★즉 «AI 에게 무엇이 나가는가» 는 여기서 100% 확인됩니다.
//     확인 못 하는 것은 «AI 가 그것으로 무엇을 써 오는가» 뿐입니다.
//
// 교훈 CK — 자료를 얹은 날에는 한 명을 끝까지 통과시켜 보라
// 교훈 CQ — 상한이라 적힌 것을 믿지 말고 나가는 문자열을 직접 재라

import { getYearGanji, getMonthGanji, getDayGanji } from './lib/saju/ganji'
import { calcHourPillar } from './lib/saju/hourPillar'
import { exactAge } from './lib/saju/ageDayun'
import { isForwardDayun, calcDayunStartAge, dayunGanjiList } from './lib/saju/dayun'
import { calcSimsanOhaeng, toPercentList, grade } from './lib/saju/simsanOhaeng'
import { judgeYears, currentDayunOf } from './lib/saju/examLuck/examScore'
import { judgeJobChangeNatal, judgeJobChangeLuck } from './lib/saju/examLuck/jobChange'
import { judgeExamDay } from './lib/saju/examLuck/examDay'
import { buildAllCards } from './lib/saju/examLuck/buildCards'
import { judgePassSignal, passSignalBlock } from './lib/saju/examLuck/passSignal'
import { upsangBlock } from './lib/saju/examLuck/tables/upsang'
import { buildSevenPrompt, sevenOf, SEVEN_GROUPS, sevenKeyOf } from './lib/saju/examLuck/buildExamSeven'
import { gradeLabel, levelLabel, trackOf, categoryLabel, targetOf, GRADE_PROMPT } from './lib/saju/examLuck/tables/studentTarget'
import { STUDENT_BAN_WORDS } from './lib/saju/examLuck/tables/rules'
import { calcSeyunList } from './lib/saju/dayun'
import type { ExamInput } from './lib/saju/examLuck/types'

const FULL = process.argv.includes('--full')

// ── 폼에 넣은 값 그대로 ──────────────────────────────────────────
const IN = {
  name: 'B', gender: '남',
  year: 2009, month: 8, day: 15,
  hourIdx: 7,                    // 未시 (13~15시)
  studentGrade: 'high3',         // 고3
  gradeLevel: 'top',             // 상위권
  track: 'natural',              // 자연·공학
  examCategory: 'susi',          // 대입 수시
  targetType: 'top',             // 주요 상위권 대학
  examDate: '2026-11-15',
}
const THIS_YEAR = 2026

let fails = 0
const bad = (m: string) => { console.log('  ❌ ' + m); fails++ }
const ok = (m: string) => console.log('  ✅ ' + m)

async function main() {
  console.log('══════════════════════════════════════════════════════════════')
  console.log('  발행 관통 — 2009-08-15 未시 남 / 고3 / 상위권 / 자연공학')
  console.log('              대입 수시 / 시험일 2026-11-15')
  console.log('══════════════════════════════════════════════════════════════\n')

  // ── ① 네 기둥 ──────────────────────────────────────────────
  // ⚠️ KASI 키가 없으면 solartermCalc(태양황경)로 떨어집니다. 13번 검사기와 같은 길입니다.
  const apiKey = process.env.KASI_KEY ?? ''
  const [yG, mG] = await Promise.all([
    getYearGanji(IN.year, IN.month, IN.day, apiKey, 14 * 60),
    getMonthGanji(IN.year, IN.month, IN.day, apiKey, 14 * 60),
  ])
  const dG = getDayGanji(IN.year, IN.month, IN.day)
  const pick = (g: string) => {
    const m = g.match(/\(([^)]+)\)/)
    const t = m && m[1].length >= 2 ? m[1] : g
    return { stem: t[0], branch: t[1] }
  }
  const Y = pick(yG), M = pick(mG), D = pick(dG)
  const H = calcHourPillar(D.stem, IN.hourIdx)
  const saju = [
    { pillar: '년주', stem: Y.stem, branch: Y.branch },
    { pillar: '월주', stem: M.stem, branch: M.branch },
    { pillar: '일주', stem: D.stem, branch: D.branch },
    { pillar: '시주', stem: H.stem, branch: H.branch },
  ]
  const age = exactAge(IN.year, IN.month, IN.day)
  console.log('① 네 기둥')
  console.log(`   ${saju.map(p => `${p.pillar} ${p.stem}${p.branch}`).join(' · ')}`)
  console.log(`   일간 ${D.stem} · 만 ${age}세`)
  if (saju.some(p => p.stem === '?' || !p.stem)) bad('기둥을 못 뽑음')
  else ok('네 기둥 산출')

  // ── ② 오행 ────────────────────────────────────────────────
  const score = calcSimsanOhaeng(saju as never, IN.month, IN.day, H.branch)
  console.log('\n② 오행 (심산 100점 · 25 발달 / 50 과다)')
  console.log('   ' + toPercentList(score).map(x =>
    `${x.el} ${String(score[x.el]).padStart(2)}점(${grade(score[x.el])})`).join(' · '))

  // ── ③ 대운 ────────────────────────────────────────────────
  const forward = isForwardDayun(Y.stem, IN.gender)
  const startAge = await calcDayunStartAge(IN.year, IN.month, IN.day, forward, apiKey, 14 * 60)
  const dayunList = dayunGanjiList(`${M.stem}${M.branch}`, forward, 10).map((d, i) => ({
    age: startAge + i * 10,
    cheongan: d.cheongan, jiji: d.jiji, ganYukchin: '—', jiYukchin: '—',
  }))
  console.log('\n③ 대운')
  console.log(`   ${forward ? '순행' : '역행'} · 대운수 ${startAge}`)
  console.log('   ' + dayunList.slice(0, 5).map(d => `${d.age}세 ${d.cheongan}${d.jiji}`).join(' · '))

  // ── ④ 세운 판정 · 카드 ─────────────────────────────────────
  const input: ExamInput = {
    saju: saju as never,
    birthYear: IN.year, birthMonth: IN.month, birthDay: IN.day,
    gender: IN.gender, span: 5, target: 'student', examKind: 'daeip',
  }
  const years = judgeYears(input, THIS_YEAR, dayunList as never, 'exam')
  const cur = currentDayunOf(input, dayunList as never)
  const natal = judgeJobChangeNatal(saju as never)
  const byYear = calcSeyunList(D.stem, THIS_YEAR)
    .filter(s => s.year >= THIS_YEAR && s.year < THIS_YEAR + 5)
    .map(s => ({ year: s.year, hits: judgeJobChangeLuck(saju as never, s.cheongan, s.jiji) }))
  const [ey, em, ed] = IN.examDate.split('-').map(Number)
  const examDay = judgeExamDay(saju as never, ey, em, ed, '시험일', 'exam')
  const cards = buildAllCards({
    input, years, dayun: cur.dayun as never, order: cur.order ?? 0,
    natal, byYear, examDay, purpose: 'exam', grade: IN.studentGrade,
  } as never)

  console.log('\n④ 세운 판정 (앞으로 다섯 해)')
  for (const y of years) console.log(`   ${y.year} ${y.stem}${y.branch}  ${y.grade.padEnd(6)} ${String(y.score).padStart(3)}점  천간 ${y.ganSipsin} · 지지 ${y.jiSipsin}`)

  console.log('\n⑤ 판정 카드')
  for (const c of cards) console.log(`   [${c.title}]  손님줄 ${c.lines.length} · 재료줄 ${c.reasons.length}`)
  // 고3에게 「고교 선택」이 뜨면 안 됩니다 (35-9장)
  if (cards.some(c => c.key === 'highschool')) bad('고3인데 「고교 선택」 카드가 떴음')
  else ok('고3 → 「고교 선택」 안 뜸 · 「수시와 정시」만')

  // ── ⑥ 합격 신호 ───────────────────────────────────────────
  const sig = judgePassSignal(saju as never, 'student', score)
  const sigBlock = passSignalBlock(sig)
  console.log('\n⑥ 합격 신호 (원국)')
  console.log(`   주 기운  ${sig.mainName} — ${sig.mainCount}자리${sig.mainMissing ? ' ★무인성' : ''}`)
  console.log(`   몰입도   ${sig.focus.grade}급`)
  console.log(`   유리 ${sig.positives.length} · 주의 ${sig.warnings.length}`)
  for (const p of sig.positives) console.log(`     ＋ ${p.slice(0, 78)}…`)
  for (const w of sig.warnings) console.log(`     － ${w.slice(0, 78)}…`)

  // ── ⑦ 업상대체 ────────────────────────────────────────────
  const ups = upsangBlock(IN.track, { saju: saju as never, ohaengScore: score, target: 'student' })
  console.log('\n⑦ 업상대체 (자연·공학 안에서)')
  console.log(ups ? ups.split('\n').map(l => '   ' + l).join('\n') : '   (걸린 줄 없음 — 프롬프트에 블록을 안 넣습니다)')

  // ── ⑧ 프롬프트 셋 ─────────────────────────────────────────
  const v = {
    name: IN.name, gender: IN.gender, age, target: 'student' as const, kind: 'exam' as const,
    cards, saju, hourUnknown: false,
    studentGrade: gradeLabel(IN.studentGrade),
    gradeBlock: GRADE_PROMPT[IN.studentGrade as keyof typeof GRADE_PROMPT] ?? null,
    scoreRange: levelLabel(IN.gradeLevel),
    targetMajor: trackOf(IN.track)?.label ?? null,
    targetType: categoryLabel(IN.examCategory),
    targetAcademic: targetOf(IN.examCategory, IN.targetType)?.label ?? null,
    examDate: IN.examDate,
    examDayNote: examDay
      ? [`일진 ${examDay.dayGanji} · 월운 ${examDay.monthGanji}`,
         examDay.isGongmang ? '★시험일이 공망에 듭니다' : '',
         ...examDay.reasons.slice(0, 3)].filter(Boolean).join(' · ')
      : null,
    signalBlock: sigBlock || null,
    upsangBlock: ups || null,
    year: THIS_YEAR,
  }

  // ── ⑧-0 무엇이 자리를 먹는가 (교훈 CQ — 상한이라 적힌 것을 믿지 말고 직접 재라) ──
  const materialLen = cards.map(c => `[${c.title}]\n` + c.reasons.map(r => `- ${r}`).join('\n')).join('\n\n').length
  console.log('\n⑧-0 재료 크기 — ★합격운에는 총량 상한이 없습니다')
  console.log(`   판정 카드 reasons  ${String(materialLen).padStart(5)}자`)
  for (const c of cards) {
    console.log(`     └ ${c.title.padEnd(20)} ${String(c.reasons.join('\n').length).padStart(5)}자`)
  }
  console.log(`   합격 신호           ${String(sigBlock.length).padStart(5)}자`)
  console.log(`   업상대체            ${String((ups || '').length).padStart(5)}자`)
  console.log('   ⚠️ jaryoPick.SERVICE_BUDGET.exam = 1200 은 pick() 이 고른 줄에만 걸립니다.')
  console.log('      이 카드들은 buildAllCards 가 만든 것이라 그 상한 밖입니다. (교훈 CQ 와 같은 자리)')

  console.log('\n⑧ 프롬프트 셋 (AI 에게 실제로 나가는 것)')
  const prompts = SEVEN_GROUPS.map(g => buildSevenPrompt(v, g) ?? '')
  let total = 0
  SEVEN_GROUPS.forEach((g, i) => {
    total += prompts[i].length
    console.log(`   ${i + 1}묶음 [${g.join('+')}]  ${String(prompts[i].length).padStart(5)}자 · 출력 상한 없음(라우트 기본 16,000)`)
  })
  console.log(`   합계 ${total}자 · 출력 상한 라우트 기본 16,000 토큰`)
  if (prompts.some(p => !p)) bad('프롬프트가 안 나온 묶음이 있음')
  else ok('세 묶음 전부 생성')

  // ── ⑨ 뼈대에 일곱 제목이 다 있는가 ─────────────────────────
  const table = sevenOf('student')
  const all = prompts.join('\n')
  const missing = table.filter(s => !all.includes(`■ ${s.title}`))
  if (missing.length) bad(`뼈대에 없는 갈래: ${missing.map(s => s.title).join(' / ')}`)
  else ok(`뼈대에 일곱 갈래 전부 있음`)
  console.log('   ' + table.map(s => s.title).join('\n   '))

  // 각 제목이 되읽히는가
  const rt = table.filter(s => sevenKeyOf(`■ ${s.title}`, 'student') !== s.key)
  if (rt.length) bad(`되읽기 실패: ${rt.map(s => s.title).join(' / ')}`)
  else ok('일곱 제목 되읽기 성공 (화면이 갈래를 잡습니다)')

  // ── ⑩ 폼 여섯 변수 · 학생 금지어 ───────────────────────────
  console.log('\n⑨ 폼 여섯 변수가 실렸는가 (지시서 1장)')
  const six: Array<[string, string | null]> = [
    ['학년·신분', v.studentGrade], ['성적대', v.scoreRange], ['희망 계열', v.targetMajor],
    ['전형 목표', v.targetType], ['목표 대학', v.targetAcademic], ['시험 날짜', v.examDate],
  ]
  for (const [k, val] of six) {
    if (!val) { bad(`${k} — 값이 비었음`); continue }
    if (!all.includes(val)) bad(`${k} «${val}» 가 프롬프트에 없음`)
    else console.log(`   ✅ ${k.padEnd(8)} ${val}`)
  }

  console.log('\n⑩ 학생 금지어')
  const body = all.replace(/★이 손님은 학생입니다[\s\S]*?\n\n/g, '')
  const dirty = STUDENT_BAN_WORDS.filter(w => body.replace(/\s/g, '').includes(w.replace(/\s/g, '')))
  if (dirty.length) bad(`본문에 금지어: ${dirty.join(', ')}`)
  else ok(`본문 금지어 0건 (금지 목록 블록 밖)`)

  // ── 전문 ─────────────────────────────────────────────────
  if (FULL) {
    prompts.forEach((p, i) => {
      console.log(`\n\n${'═'.repeat(70)}`)
      console.log(`  ${i + 1}묶음 프롬프트 전문  [${SEVEN_GROUPS[i].join(' + ')}]`)
      console.log('═'.repeat(70))
      console.log(p)
    })
  } else {
    console.log('\n   ※ 프롬프트 전문을 보시려면 --full 을 붙이십시오.')
  }

  console.log(`\n${'═'.repeat(62)}`)
  if (fails) { console.log(`  ★어긋남 ${fails}건`); process.exit(1) }
  console.log('  ✅ 발행 직전까지 전부 통과')
}

main().catch(e => { console.error(e); process.exit(1) })
