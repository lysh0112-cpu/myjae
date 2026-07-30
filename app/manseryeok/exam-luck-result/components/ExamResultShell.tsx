'use client'

/**
 * 합격운 결과 — 공용 몸통 (진학 / 취업 두 화면이 함께 씁니다)
 * ─────────────────────────────────────────────────────────────
 * 진입  exam-luck-input > (진학) exam-luck-result  /  (취업) job-luck-result
 *       보관함 카드 > 그 둘 가운데 하나 (&recordId=)
 *
 * ★2026-07-30 대표님 지시 — «학생 합격운과 취업 합격운을 별도 화면으로»
 *
 *   [왜 몸통을 하나로 두는가]
 *     화면을 둘로 나누라는 지시이지만, **판정과 통변 흐름은 똑같습니다.**
 *     둘로 베끼면 SSE·저장·다시보기·훅 순서를 두 곳에서 고쳐야 하고,
 *     한쪽만 고치는 순간 갈립니다. (교훈 CJ — 판정기를 둘로 두지 말 것)
 *   [어떻게]
 *     몸통은 이 파일 하나. 두 page.tsx 는 `mode` 만 넘기는 얇은 껍데기입니다.
 *     ★`mode` 가 곧 «누구인가» 입니다. URL 의 target 을 믿지 않습니다.
 *       (옛 링크가 target 을 안 실어 보내는 일이 있어, 화면이 곧 답이 되게 했습니다)
 *
 * ★진로적성 career-result/page.tsx 를 그대로 본떴다. 새로 설계하지 않는다.
 *   (작업지시 2장 · 11장 — SSE·저장·다시보기 흐름을 그대로 베낀다)
 *
 * ⚠️ 지킨 것
 *   · 판정을 먼저 저장하고, 통변이 끝나면 그 행을 덮어쓴다 (교훈 AQ)
 *   · id 는 state 가 아니라 ref 로 읽는다. async 가 길어 클로저가 낡는다 (교훈 K)
 *   · 다시보기(recordId)면 통변을 새로 안 돌린다. 돈이 든다
 *   · SSE 는 buf 로 완성된 줄만 처리하고, done 뒤 남은 buf 도 처리한다 (교훈 AG)
 *   · 훅은 조기 return 보다 위에 둔다 (2026-07-27에 이걸 어겨 화면이 죽었다)
 *   · reasons 는 화면에 그리지 않는다. AI 통변에게만 주는 재료다 (교훈 AV)
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { calcPerson, type PersonCalc } from '@/lib/saju/career/calcPerson'
import { exactAge } from '@/lib/saju/ageDayun'
import { judgeYears, currentDayunOf } from '@/lib/saju/examLuck/examScore'
import { judgeJobChangeNatal, judgeJobChangeLuck } from '@/lib/saju/examLuck/jobChange'
import { judgeExamDay } from '@/lib/saju/examLuck/examDay'
import { buildAllCards } from '@/lib/saju/examLuck/buildCards'
import { parseExamTongbyeon } from '@/lib/saju/examLuck/buildExamPrompt'
import { buildSevenPrompt, sevenOf, SEVEN_GROUPS, sevenKeyOf } from '@/lib/saju/examLuck/buildExamSeven'
// ★2026-07-30 — 지시서 2장 «사정 평가 로직» 을 재료로 만들어 싣습니다. (교훈 CU)
import { judgePassSignal, passSignalBlock } from '@/lib/saju/examLuck/passSignal'
import { upsangBlock as buildUpsangBlock } from '@/lib/saju/examLuck/tables/upsang'
import { calcSimsanOhaeng } from '@/lib/saju/simsanOhaeng'
import { examKindOf, CLOSING, CLOSING_STUDENT } from '@/lib/saju/examLuck/tables/rules'
import { GRADE_PROMPT, gradeLabel, levelLabel, trackOf, categoryLabel, targetOf } from '@/lib/saju/examLuck/tables/studentTarget'
import { saveRecord, updateRecordResult, getRecord } from '@/lib/saju/sajuRecords'
import { calcSeyunList, calcWolunList, type DayunItem } from '@/lib/saju/dayun'
import SajuWonguk from '@/app/manseryeok/result-new/SajuWonguk'
import ExamJudgeCard, { GRADE_STYLE } from './ExamJudgeCard'
import type { ExamCard, ExamInput, ExamTarget, YearLuck } from '@/lib/saju/examLuck/types'

const ACCENT = '#c85a8c'
const BG = '#FDF6F0'
const CARD = '#FFFBF7'
const LINE = '#f0e0d5'

/** 진학 화면인가 취업 화면인가 — ★page.tsx 가 정해서 넘깁니다 */
export type ExamMode = 'jinhak' | 'chwieop'

function ExamLuckResultInner({ mode }: { mode: ExamMode }) {
  const router = useRouter()
  const sp = useSearchParams()

  const person = useMemo(() => ({
    name: sp.get('name') || '나',
    gender: sp.get('gender') || '남',
    year: sp.get('year') || '', month: sp.get('month') || '', day: sp.get('day') || '',
    calType: sp.get('calType') || '양력', leapMonth: sp.get('leapMonth') || '0',
    hour: sp.get('hour') || '모름',
  }), [sp])
  /**
   * ★2026-07-30 — «누구인가» 는 URL 이 아니라 **화면이** 정합니다.
   *   [왜] 보관함 다시보기 링크가 target 을 안 실어 보내던 때가 있어,
   *     학생 기록이 성인 화면 껍데기(취업운·어른 맺음말)로 뜨는 일이 있었습니다.
   *   진학 화면 = 언제나 학생 · 취업 화면 = 언제나 성인.
   */
  const target: ExamTarget = mode === 'jinhak' ? 'student' : 'adult'
  /** 취업 화면 안에서만 갈립니다 — 시험 준비냐 일자리냐 */
  const kind: 'exam' | 'job' = mode === 'jinhak'
    ? 'exam'
    : (sp.get('kind') === 'job' ? 'job' : 'exam')
  const examKind = sp.get('examKind') || null
  const examDateRaw = sp.get('examDate') || ''
  const recordId = sp.get('recordId') || ''
  // ★2026-07-29 — 학생이 고른 목표 (2단 드롭다운)
  const examCategory = sp.get('examCategory') || ''
  const targetType = sp.get('targetType') || ''
  const targetCustomText = sp.get('targetCustomText') || ''
  const studentGrade = sp.get('studentGrade') || ''
  const gradeLevel = sp.get('gradeLevel') || ''
  const trackSel = sp.get('track') || ''

  const [calc, setCalc] = useState<PersonCalc | null>(null)
  const [err, setErr] = useState('')
  const [dayunList, setDayunList] = useState<DayunItem[]>([])
  const [tong, setTong] = useState('')
  const [tongState, setTongState] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle')
  /** ★2026-07-29 — 세 묶음 가운데 몇이 왔나. 기다리는 손님에게 보여 줍니다. */
  const [doneGroups, setDoneGroups] = useState(0)
  /**
   * ★2026-07-30 — 왜 실패했는지. 전에는 상태코드를 버려서 아무도 몰랐습니다.
   * ⚠️ 손님에게는 부드럽게 보여 주고, 개발자용 자세한 말은 title 속성에 담습니다.
   */
  const [failWhy, setFailWhy] = useState('')
  const savedIdRef = useRef<string>('')
  const savedRef = useRef(false)
  const tongStartedRef = useRef(false)

  // ── ① 명식 ────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    calcPerson(person as never)
      .then(r => { if (alive) { if (r) setCalc(r); else setErr('사주를 계산하지 못했어요.') } })
      .catch(() => { if (alive) setErr('사주를 계산하지 못했어요.') })
    return () => { alive = false }
  }, [person])

  // ── ② 대운 — 서버에서만 낼 수 있다 (절기 API) ─────────────
  useEffect(() => {
    if (!calc) return
    let alive = true
    const m = calc.saju.find(p => p.pillar === '월주')
    const y = calc.saju.find(p => p.pillar === '년주')
    const d = calc.saju.find(p => p.pillar === '일주')
    if (!m || !y || !d) return
    fetch('/api/dayun', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        solarYear: calc.solarYear, solarMonth: calc.solarMonth, solarDay: calc.solarDay,
        monthGanji: `${m.stem}${m.branch}`, yearStem: y.stem,
        gender: person.gender, dayStem: d.stem,
        hourIdx: person.hour === '모름' ? null : parseInt(person.hour),
      }),
    }).then(r => r.json())
      .then(v => { if (alive) setDayunList(v.dayunList || []) })
      .catch(() => { if (alive) setDayunList([]) })
    return () => { alive = false }
  }, [calc, person])

  // ── ③ 판정 ────────────────────────────────────────────────
  const input: ExamInput | null = useMemo(() => {
    if (!calc) return null
    return {
      saju: calc.saju,
      birthYear: calc.solarYear, birthMonth: calc.solarMonth, birthDay: calc.solarDay,
      gender: person.gender, span: 5, target, examKind,
    }
  }, [calc, person.gender, target, examKind])

  const thisYear = new Date().getFullYear()

  const cards: ExamCard[] = useMemo(() => {
    if (!input || !calc) return []
    const years: YearLuck[] = judgeYears(input, thisYear, dayunList, kind)
    const cur = currentDayunOf(input, dayunList)
    const dayStem = calc.saju.find(p => p.pillar === '일주')?.stem ?? ''
    // 이직 — 앞으로 몇 해를 함께 본다
    const natal = judgeJobChangeNatal(calc.saju)
    const byYear = dayStem && dayStem !== '?'
      ? calcSeyunList(dayStem, thisYear)
        .filter(s => s.year >= thisYear && s.year < thisYear + 5)
        .map(s => ({ year: s.year, hits: judgeJobChangeLuck(calc.saju, s.cheongan, s.jiji) }))
      : []
    // 시험 날짜 — 넣었을 때만
    let examDay: ReturnType<typeof judgeExamDay> = null
    if (examDateRaw) {
      const [yy, mm, dd] = examDateRaw.split('-').map(Number)
      if (yy && mm && dd) examDay = judgeExamDay(calc.saju, yy, mm, dd, '시험일', kind)
    }
    return buildAllCards({
      input, years, dayun: cur.dayun as never, order: cur.order ?? 0,
      natal, byYear, examDay, purpose: kind,
      grade: studentGrade,
    })
  }, [input, calc, dayunList, thisYear, kind, examDateRaw, studentGrade])

  /** 시험이 있는 해·달 — 달별 흐름표에 표시할 자리 */
  const examMonth = useMemo(() => {
    if (!examDateRaw) return null
    const [y, m] = examDateRaw.split('-').map(Number)
    return y && m ? { y, m } : null
  }, [examDateRaw])
  /** 달별 흐름표에 쓸 일간 */
  const dayStemForStrip = useMemo(
    () => calc?.saju?.find(p => p.pillar === '일주')?.stem ?? '',
    [calc],
  )

  // ══════════════════════════════════════════════════════════════
  //  ★2026-07-30 — 지시서 2장 «사정 평가 로직» 을 **재료** 로 만듭니다.
  //
  //   [왜 지시가 아니라 재료인가 — 교훈 CU]
  //     «관인상생을 보고 판정하세요» 라고 부탁해도 AI 는 못 합니다.
  //     이 사람 원국에 관성이 몇 자리인지, 12운성이 관대인지, 금기가 몇 점인지
  //     AI 는 모릅니다. 그래서 **계산해서 줍니다.**
  //     (35부에서 「시험 날짜」 카드가 간지 나열로 끝나던 것과 똑같은 자리입니다)
  //
  //   ⚠️ 훅을 쓰지 않고 useMemo 로만 둡니다. 아래 조기 return 보다 위입니다.
  //      (result-new/page.tsx 315줄 — 조기 return 아래에 훅을 넣어 화면이 죽은 일이 있습니다)
  //   ⚠️ 이 재료는 **화면에 그리지 않습니다.** AI 에게만 줍니다. (교훈 AV)
  // ══════════════════════════════════════════════════════════════
  /** 오행 점수 — 업상대체(금기·목기 발달)와 오행 밸런스 지침의 바탕 */
  const ohaengScore = useMemo(() => {
    if (!calc?.saju?.length) return null
    // ⚠️ simsanOhaeng 은 손대지 않습니다 (29부 5장). 부르기만 합니다.
    return calcSimsanOhaeng(calc.saju, calc.solarMonth, calc.solarDay, calc.hourBranch)
  }, [calc])

  /** 원국 합격 신호 — Positive / Warning (지시서 2-B) */
  const signalBlock = useMemo(() => {
    if (!calc?.saju?.length || !ohaengScore) return null
    const s = judgePassSignal(calc.saju, target, ohaengScore)
    return passSignalBlock(s)
  }, [calc, target, ohaengScore])

  /**
   * 업상대체 — 계열 안에서 «어느 세부 자리» 가 극대화되는가 (지시서 2-A-2)
   * ⚠️ 희망 계열을 안 고른 손님에게는 빈 값입니다. 빈 값이면 프롬프트에 줄을 안 넣습니다.
   *    «해당 없음» 이라 적어 주면 AI 가 그 말을 손님에게 옮겨 씁니다. (교훈 BF)
   */
  const upsangMaterial = useMemo(() => {
    if (!calc?.saju?.length || !ohaengScore || !trackSel) return null
    const b = buildUpsangBlock(trackSel, { saju: calc.saju, ohaengScore, target })
    return b || null
  }, [calc, ohaengScore, trackSel, target])

  // ★2026-07-29 — 시험 날짜의 «그날 기운» 을 프롬프트에도 실어 보냅니다.
  //   위 useMemo 안에서 만든 examDay 는 카드용이라 밖에서 못 씁니다.
  //   ⚠️ judgeExamDay 는 순수 함수라 두 번 불러도 같은 답이 나옵니다. (재계산 아님)
  const examDayForPrompt = useMemo(() => {
    if (!examDateRaw || !calc?.saju?.length) return null
    const [yy, mm, dd] = examDateRaw.split('-').map(Number)
    if (!yy || !mm || !dd) return null
    const r = judgeExamDay(calc.saju, yy, mm, dd, '시험일', kind)
    if (!r) return null
    // 공망이면 반드시 알린다 — 대표님 지시
    return [
      `일진 ${r.dayGanji} · 월운 ${r.monthGanji}`,
      // ★공망이면 반드시 알립니다. 「기운이 비는 날」이라 대비책을 함께 줘야 합니다.
      r.isGongmang ? '★시험일이 공망에 듭니다 — 기운이 비는 날이니 대비책을 함께 주세요' : '',
      ...(r.reasons ?? []).slice(0, 3),
    ].filter(Boolean).join(' · ')
  }, [examDateRaw, calc, kind])

  // ── ④ 판정을 먼저 저장한다 (교훈 AQ) ──────────────────────
  useEffect(() => {
    if (!calc || !cards.length || recordId || savedRef.current) return
    savedRef.current = true
    saveRecord({
      serviceType: 'examluck', title: person.name,
      inputData: {
        year: person.year, month: person.month, day: person.day,
        gender: person.gender, calType: person.calType,
        leapMonth: person.leapMonth, hour: person.hour,
        // ★2026-07-30 — 보관함이 «어느 화면으로 되돌릴지» 알 수 있게 함께 저장합니다.
        //   [왜] 전에는 target 을 안 남겨, 다시보기가 늘 성인 화면으로 갔습니다.
        //   ⚠️ 이 두 줄이 없는 옛 기록도 있습니다. 보관함이 없으면 진학으로 보냅니다.
        target, kind,
      },
    } as never).then(r => { if (r && (r as { id?: string }).id) savedIdRef.current = (r as { id: string }).id })
  }, [calc, cards, recordId, person, target, kind])

  // ── ⑤ 통변 (SSE) ─────────────────────────────────────────
  useEffect(() => {
    if (!calc || !cards.length || tongStartedRef.current) return
    if (recordId) return          // 다시보기 — 아래 effect 가 저장본을 불러온다
    tongStartedRef.current = true
    let cancelled = false

    ;(async () => {
      setTongState('loading')
      // ★2026-07-29 — 초입 폼에서 고른 넷을 프롬프트까지 실어 보냅니다. (대표님 지시)
      //   [무엇이 문제였나] kind·examKind·examDate 가 URL 에는 있는데
      //     여기서 안 넘겨 프롬프트가 못 봤습니다. 그래서 학생에게도
      //     공무원·이직 이야기가 나갔습니다. 폼과 리포트가 끊겨 있던 자리입니다.
      // ★2026-07-29 — 입시 전문 «7대 카테고리» 로 다시 짰습니다. (대표님 기획)
      //
      //   [왜 세 번 나눠 부르나] 한 번에 여러 갈래를 시키면 AI 가 앞 두셋만 쓰고 뒤를 안 씁니다.
      //     여섯 대목 한 번 → 두셋만 · 세 대목 한 번 → 첫 하나만.
      //     프롬프트를 네 번 다듬어도 같은 자리에서 실패했습니다.
      //   → 일곱을 «2+2+3» 으로 나눕니다. 한 묶음이 둘셋이면 다 씁니다.
      //   ⚠️ 세 묶음을 «나란히» 부릅니다. 차례로 부르면 세 배 걸립니다.
      const sevenArgs = {
        name: person.name, gender: person.gender,
        age: exactAge(calc.solarYear, calc.solarMonth, calc.solarDay),
        target, kind, cards, saju: calc.saju, hourUnknown: person.hour === '모름',
        // ★2026-07-30 — 지시서 2장 평가 결과를 재료로 싣습니다.
        signalBlock, upsangBlock: upsangMaterial,
        studentGrade: studentGrade ? gradeLabel(studentGrade) : null,
        gradeBlock: target === 'student' && studentGrade
          ? GRADE_PROMPT[studentGrade as keyof typeof GRADE_PROMPT] ?? null : null,
        scoreRange: gradeLevel ? levelLabel(gradeLevel) : null,
        targetMajor: trackSel ? trackOf(trackSel)?.label ?? null : null,
        targetType: examCategory ? categoryLabel(examCategory) : null,
        targetAcademic: targetType === 'custom'
          ? (targetCustomText || null)
          : (targetOf(examCategory, targetType)?.label ?? null),
        examDate: examDateRaw || null,
        examDayNote: examDayForPrompt,
        year: thisYear,
      }

      // ══════════════════════════════════════════════════════════
      //  ★★2026-07-30 — 「0/3 묶음에서 멈춘다」를 고쳤습니다. (대표님 지적)
      //
      //   [무엇이 문제였나 — 타임아웃도 한도도 아니었습니다]
      //     Vercel 로그가 200 이고 오류 0건이었습니다. 서버는 멀쩡했습니다.
      //     진로적성(career-result 229줄)과 견주자 딱 한 줄이 달랐습니다.
      //
      //       진로적성  if (parsed.text) { acc += parsed.text; setTong(acc) }
      //                                                       ↑ 읽는 «도중에» 갱신
      //       합격운    if (j.text) out += j.text
      //                            ↑ 제 안에만 쌓고 화면에 안 알림
      //
      //     그래서 «한 묶음이 통째로 끝나야» 화면에 처음 나타났습니다.
      //     한 묶음이 2,400 토큰이니 1~2분입니다. 그동안 0/3 이 그대로 떠 있습니다.
      //     ★멈춘 것이 아니라 «원래 그렇게 만들어져 있었습니다». 제가 넣은 결함입니다.
      //
      //   [어떻게 고쳤나]
      //     ① 조각이 올 때마다 화면을 갱신합니다 (진로적성과 같은 방식)
      //     ② 세 묶음이 나란히 흐르므로 묶음별 버퍼를 ref 에 두고 «차례대로» 이어 붙입니다
      //        ⚠️ setState 클로저가 낡아 조각이 사라지는 일을 막으려고 ref 를 씁니다 (교훈 K)
      //     ③ 스트림이 조용해지면 «멈춤» 으로 보고 끝냅니다 (아래 STALL_MS)
      //        영원히 기다리면 손님이 새로고침밖에 할 수 없습니다
      //     ④ 실패 이유를 버리지 않습니다 — 상태코드와 본문을 남깁니다
      //
      //   ⚠️ 부분 글을 parseExamTongbyeon 에 넣게 됩니다. 괜찮습니다 —
      //      sevenKeyOf 가 «제목의 앞토막» 도 잡도록 만들어 두었습니다.
      //      「■ 🧬 1. 타고」 처럼 반만 온 제목도 dna 로 잡힙니다.
      // ══════════════════════════════════════════════════════════

      /** 조각이 이만큼(밀리초) 안 오면 그 묶음은 멈춘 것으로 본다 */
      const STALL_MS = 45000
      /** 한 묶음이 아무리 길어도 이 시간을 넘기지 않는다 */
      const HARD_MS = 240000

      /** 묶음별로 지금까지 받은 글 — ★ref 로 둡니다 (클로저가 낡지 않게) */
      const partsRef: string[] = ['', '', '']
      /** 실패 이유 — 화면에 알려 줍니다 */
      const failNotes: string[] = []

      /** 지금까지 받은 것을 차례대로 이어 붙여 화면에 올린다 */
      const flush = () => {
        if (cancelled) return
        setTong(partsRef.filter(Boolean).join('\n\n'))
      }

      /**
       * 한 묶음을 받아 온다 — 실패해도 다른 묶음은 살린다.
       * @param idx 묶음 차례. partsRef 자리를 정합니다 (순서가 곧 리포트 차례)
       */
      const runGroup = async (g: typeof SEVEN_GROUPS[number], idx: number): Promise<string> => {
        const sp = buildSevenPrompt(sevenArgs, g)
        if (!sp) return ''

        // ★멈춤 감지 — 조각이 올 때마다 시계를 되감습니다
        const ac = new AbortController()
        let stallTimer: ReturnType<typeof setTimeout> | null = null
        const hardTimer = setTimeout(() => ac.abort('hard'), HARD_MS)
        const armStall = () => {
          if (stallTimer) clearTimeout(stallTimer)
          stallTimer = setTimeout(() => ac.abort('stall'), STALL_MS)
        }

        try {
          const r = await fetch('/api/tongbyeon', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            signal: ac.signal,
            // ★묶음이 실제로 쓰는 양에 맞춰 상한을 좁힙니다.
            //   한 갈래가 5~8문장이니 갈래당 1,200 토큰이면 넉넉합니다.
            //   상한을 크게 잡으면 모델이 그만큼 여유를 두고 생성해 느려집니다. (교훈 CX)
            body: JSON.stringify({
              systemPrompt: sp, premium: true,
              maxTokens: g.length * 1200,
            }),
          })
          // ★2026-07-30 — 이유를 버리지 않습니다.
          //   전에는 `if (!r.ok || !r.body) return ''` 로 상태코드를 통째로 버려서,
          //   401(키 없음)·429(한도)·529(붐빔)를 구분할 수 없었습니다.
          if (!r.ok) {
            let why = ''
            try { why = (await r.text()).slice(0, 200) } catch { /* 본문을 못 읽어도 status 는 남는다 */ }
            failNotes.push(`${idx + 1}묶음 HTTP ${r.status}${why ? ` — ${why}` : ''}`)
            console.error('합격운 묶음 실패', g, r.status, why)
            return ''
          }
          if (!r.body) { failNotes.push(`${idx + 1}묶음 — 응답 본문이 비었습니다`); return '' }

          const rd = r.body.getReader()
          const dec = new TextDecoder()
          let buf2 = ''
          let out = ''
          const take2 = (line: string) => {
            if (!line.startsWith('data: ')) return
            const d = line.slice(6)
            if (d === '[DONE]') return
            try {
              const j = JSON.parse(d)
              if (j.text) {
                out += j.text
                // ★★여기가 고친 자리입니다 — 조각마다 화면에 올립니다
                partsRef[idx] = out
                flush()
              }
            } catch { /* 부서진 줄 — SSE 는 조각으로 오므로 정상입니다 */ }
          }

          armStall()
          for (;;) {
            const { done, value } = await rd.read()
            if (done) break
            armStall()
            buf2 += dec.decode(value, { stream: true })
            const ls2 = buf2.split('\n')
            buf2 = ls2.pop() ?? ''
            for (const l of ls2) take2(l)
          }
          buf2 += dec.decode()
          if (buf2.trim()) take2(buf2.trim())
          return out
        } catch (e) {
          // ★중간까지 받은 것은 버리지 않습니다. 반쪽이라도 손님에게 값이 됩니다.
          const partial = partsRef[idx]
          const why = ac.signal.aborted
            ? (String(ac.signal.reason) === 'stall'
                ? `${STALL_MS / 1000}초 동안 글이 안 와서 멈췄습니다`
                : `${HARD_MS / 1000}초를 넘겨 끊었습니다`)
            : String(e)
          failNotes.push(`${idx + 1}묶음 — ${why}${partial ? ' (받은 만큼은 살렸습니다)' : ''}`)
          console.error('합격운 묶음 실패', g, why)
          return partial
        } finally {
          clearTimeout(hardTimer)
          if (stallTimer) clearTimeout(stallTimer)
        }
      }

      // ★나란히 부르고, 조각이 올 때마다 차례를 맞춰 이어 붙인다
      //   ⚠️ 차례로(순차) 부르지 않습니다. 셋을 잇달아 부르면 시간이 세 배입니다.
      //      ★대신 이제는 «먼저 오는 묶음의 글» 이 바로 화면에 뜹니다.
      try {
        await Promise.all(SEVEN_GROUPS.map(async (g, i) => {
          await runGroup(g, i)
          if (!cancelled) {
            flush()
            setDoneGroups(partsRef.filter(Boolean).length)
          }
        }))
        const acc = partsRef.filter(Boolean).join('\n\n')
        // ★하나도 못 받았을 때만 실패로 봅니다. 두 묶음이라도 왔으면 보여 줍니다.
        if (!acc.trim()) {
          if (!cancelled) {
            setFailWhy(failNotes.join(' · ') || '까닭을 알 수 없습니다')
            setTongState('failed')
          }
          return
        }
        if (cancelled) return
        setTong(acc)
        // ★일부만 온 경우도 알려 줍니다. 조용히 넘기면 손님이 «왜 짧지» 합니다.
        if (failNotes.length) setFailWhy(failNotes.join(' · '))
        setTongState('done')

        for (let i = 0; i < 10 && !savedIdRef.current; i++) {
          await new Promise(r => setTimeout(r, 500))
        }
        if (savedIdRef.current) await updateRecordResult(savedIdRef.current, { tong: acc } as never)
      } catch (e) {
        if (!cancelled) {
          setFailWhy(failNotes.join(' · ') || String(e))
          setTongState('failed')
        }
      }
    })()
    return () => { cancelled = true }
    // ★2026-07-29 — 폼에서 고른 값이 바뀌면 통변을 다시 받아야 합니다.
    //   빠뜨리면 «학년을 바꿨는데 리포트는 그대로» 가 됩니다.
    // ★2026-07-30 — signalBlock·upsangMaterial·kind 도 함께 넣었습니다.
    //   빠뜨리면 재료가 바뀌어도 옛 통변이 그대로 남습니다.
  }, [calc, cards, recordId, person, target, kind, studentGrade, gradeLevel, trackSel,
      examCategory, targetType, targetCustomText, examDateRaw, examDayForPrompt, thisYear,
      signalBlock, upsangMaterial])

  // ── ⑥ 다시보기 — 저장본 불러오기 ──────────────────────────
  useEffect(() => {
    if (!recordId) return
    let alive = true
    getRecord(recordId).then(r => {
      if (!alive || !r) return
      const t = (r as { result?: { tong?: string } }).result?.tong ?? ''
      if (t) { setTong(t); setTongState('done') }
    }).catch(() => {})
    return () => { alive = false }
  }, [recordId])

  const parsed = useMemo(() => (tong ? parseExamTongbyeon(tong) : null), [tong])
  /**
   * ★2026-07-29 — 통변을 일곱 갈래로 가른다.
   *   parseExamTongbyeon 은 ■ 로 자르기만 합니다. 갈래 열쇠는 sevenKeyOf 가 붙입니다.
   *   ⚠️ AI 가 제목을 조금 바꿔 써도 낱말로 잡습니다. 못 잡으면 그 갈래는 안 그립니다.
   */
  const sevenBody = useMemo(() => {
    const out: Record<string, string> = {}
    if (!parsed) return out
    for (const [title, body] of Object.entries(parsed.byTitle)) {
      // ★2026-07-30 — target 을 넘겨 그 벌의 제목을 먼저 맞춰 봅니다.
      //   제목에 이모지·번호가 붙었으므로 sevenKeyOf 가 그것을 떼고 맞춥니다.
      const k = sevenKeyOf(title, target)
      if (k && body.trim()) out[k] = body
    }
    return out
  }, [parsed, target])
  /** ★이 화면이 그릴 일곱 갈래 — 진학과 취업이 이름과 결이 다릅니다 */
  const sections = useMemo(() => sevenOf(target), [target])
  const kindLabel = examKindOf(examKind)?.label

  // ★훅은 여기까지. 아래부터 조기 return.
  if (err) return <Msg text={err} onBack={() => router.push('/manseryeok/exam-luck')} />
  if (!calc) return <Msg text="사주를 살펴보는 중이에요…" />

  return (
    // ★아래 붙박이 메뉴(약 78px)가 글을 덮지 않게 넉넉히 비운다. (2026-07-27)
    //   60px 만 두었더니 맺음말이 메뉴에 가려 잘렸다.
    <main style={{ minHeight: '100vh', background: BG, maxWidth: 480, margin: '0 auto', paddingBottom: 110 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: `0.5px solid ${LINE}`, padding: '13px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.push('/manseryeok/exam-luck')}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#3a2e28' }}>
          {/* ★2026-07-30 — 화면마다 이름이 다릅니다. 손님이 «내가 무엇을 보는지» 알아야 합니다. */}
          {person.name}님의 {mode === 'jinhak'
            ? '진학 합격운'
            : (kind === 'job' ? '취업운' : '시험 합격운')}
        </div>
      </div>

      <div style={{ padding: '14px 14px 0' }}>
        {kindLabel && (
          <div style={{
            background: '#f7e6ee', border: '0.5px solid #f0d8e2', borderRadius: 12,
            padding: '10px 14px', marginBottom: 12, fontSize: 12.5, color: '#8c4a63', lineHeight: 1.7,
          }}>
            {kindLabel}을(를) 기준으로 보았습니다.
            {examDateRaw && ` 시험 날짜 ${examDateRaw} 도 함께 짚었어요.`}
          </div>
        )}

        {/* 명식 — 직접 그리지 않는다 (교훈 BD) */}
        <div style={{ background: '#fff', border: `0.5px solid ${LINE}`, borderRadius: 16, padding: 2, marginBottom: 12 }}>
          <SajuWonguk
            saju={calc.saju}
            dayStem={calc.saju.find(p => p.pillar === '일주')?.stem ?? ''}
            yeonjji={calc.saju.find(p => p.pillar === '년주')?.branch ?? ''}
            iljji={calc.saju.find(p => p.pillar === '일주')?.branch ?? ''}
            gm1="" gm2=""
          />
        </div>

        {/* 여는말 */}
        {parsed?.intro && (
          <div style={{
            background: CARD, border: `0.5px solid ${LINE}`, borderRadius: 14,
            padding: '15px 16px', marginBottom: 12,
            fontSize: 13.5, color: '#3a2e28', lineHeight: 1.85, whiteSpace: 'pre-wrap',
            wordBreak: 'keep-all', overflowWrap: 'anywhere',
          }}>{parsed.intro}</div>
        )}

        {/* 세 해 연표 — 이 서비스의 얼굴 */}
        {/* ★2026-07-29 — 연도별 흐름표를 여기서 걷어냈습니다. (대표님 지시 — 샌드위치)
             전에는 카드 «전부보다 위» 에 홀로 떠 있어, 아래 「앞으로의 흐름」 풀이와
             멀리 떨어져 손님이 스스로 이어 붙여야 했습니다.
             → 아래 카드 반복문에서 그 카드 «바로 위» 로 옮겼습니다. */}

        {/* ★2026-07-29 — 어디까지 왔는지 보여 줍니다.
             빈 화면에 «기다려 주세요» 만 있으면 손님은 멈춘 줄 압니다. */}
        {tongState === 'loading' && (
          <div style={{
            textAlign: 'center', padding: '16px 0 18px', color: ACCENT, fontSize: 13,
          }}>
            {/* ★2026-07-30 — 여기도 «돌고 있음» 을 보여 줍니다. 막대만 있으면 멈춘 줄 압니다. */}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <div>
              <span style={{ display: 'inline-block', animation: 'spin 1.2s linear infinite', marginRight: 6 }}>✦</span>
              풀이를 쓰는 중이에요… 조금만 기다려 주세요
            </div>
            <div style={{
              display: 'flex', gap: 5, justifyContent: 'center', marginTop: 10,
            }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 30, height: 4, borderRadius: 20,
                  background: i < doneGroups ? ACCENT : '#f0dbe4',
                  transition: 'background .3s',
                }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#b08a9a', marginTop: 7 }}>
              {/* ★2026-07-30 — 「0/3 묶음」만 떠 있어 멈춘 것처럼 보였습니다. (대표님 지적)
                   [왜] 묶음 개수는 «다 끝난 묶음» 만 셉니다. 첫 묶음이 끝나기까지
                     1~2분이니 그동안 늘 0/3 이었습니다.
                   → 이제 글이 오는 대로 위에 뜨고, 여기에는 «몇 자 왔나» 를 보여 줍니다.
                     숫자가 움직이면 손님이 멈춘 줄 알지 않습니다. */}
              {doneGroups}/3 묶음 마무리
              {tong.length > 0 && ` · ${tong.length.toLocaleString()}자 도착`}
              {tong.length === 0 && ' · 첫 문장을 기다리고 있어요'}
            </div>
          </div>
        )}

        {/* ★2026-07-29 — 입시 7대 카테고리로 그립니다. (대표님 기획)
             [무엇이 바뀌었나] 전에는 «판정 카드» 가 곧 «풀이 카드» 였습니다.
               판정이 없는 갈래(과목 전략·12개월·지원 전략)는 낼 자리가 없었습니다.
             → 이제 풀이는 일곱 갈래로 그리고, 판정 카드는 아래 「근거」로 접어 둡니다.
             ⚠️ 도표는 결이 맞는 갈래 «바로 위» 에 얹습니다. (샌드위치)
                subject → 연도별 흐름표 · dday → 달별 흐름표 */}
        {sections.map(sec => {
          const body = sevenBody[sec.key]
          if (!body) return null
          return (
            <div key={sec.key}>
              {sec.key === 'subject' && <YearStrip cards={cards} />}
              {sec.key === 'dday' && examMonth && (
                <MonthStrip dayStem={dayStemForStrip} year={examMonth.y} mark={examMonth.m} />
              )}
              <ExamJudgeCard
                card={{ key: sec.key, title: sec.title, lines: [], reasons: [] }}
                tong={body}
              />
            </div>
          )
        })}

        {/* ★판정 카드 — 위 풀이의 «근거» 로 접어 둡니다.
             지우지 않았습니다. 상담사분들과 손님이 «왜 그런가» 를 볼 자리입니다. */}
        {cards.length > 0 && (
          <details style={{
            background: CARD, border: `0.5px solid ${LINE}`, borderRadius: 14,
            padding: '12px 14px', marginBottom: 12,
          }}>
            <summary style={{ fontSize: 12.5, color: '#8a7063', cursor: 'pointer' }}>
              위 풀이의 근거가 된 판정 보기
            </summary>
            <div style={{ marginTop: 10 }}>
              {cards.map(c => (
                <div key={c.key} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#5c3a1e', marginBottom: 5 }}>
                    {c.title}
                  </div>
                  {c.lines.map((l, i) => (
                    <p key={i} style={{ fontSize: 12, color: '#6b5a50', lineHeight: 1.75, margin: '0 0 4px' }}>{l}</p>
                  ))}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* ★2026-07-29 — 따로 두었던 「시험 당일 실전 준비」 블록을 없앴습니다.
             「시험 날짜를 짚어 보면」 카드와 대목이 겹쳐 AI 가 둘 중 하나에만 썼습니다.
             → 그 카드를 「시험 날짜와 실전 준비」로 키우고 실전 전략을 그 안에 담습니다. */}

        {/* 맺는말 — ★7갈래의 「수험생과 부모님께」가 그 자리를 대신합니다.
             그래도 AI 가 따로 맺는말을 쓰면 여기 뜹니다. 버리지 않기 위해서입니다.
             ⚠️ mentor 갈래가 잡혔으면 안 그립니다. 두 번 나오면 어색합니다. */}
        {!sevenBody.mentor && parsed?.outro && (
          <div style={{
            background: CARD, border: `0.5px solid ${LINE}`, borderRadius: 14,
            padding: '15px 16px', marginBottom: 12,
            fontSize: 13.5, color: '#3a2e28', lineHeight: 1.85, whiteSpace: 'pre-wrap',
            wordBreak: 'keep-all', overflowWrap: 'anywhere',
          }}>{parsed.outro}</div>
        )}

        {/* ★2026-07-30 — 왜 안 됐는지 알려 줍니다.
             [왜] 전에는 상태코드를 버려서 손님도 대표님도 까닭을 몰랐습니다.
               「멈췄다」와 「한도가 찼다」와 「키가 없다」는 대응이 전혀 다릅니다.
             ⚠️ 손님에게는 부드럽게. 자세한 말(HTTP 429 …)은 title 에 담아
                필요할 때만 마우스를 올려 보게 합니다. */}
        {tongState === 'failed' && (
          <div style={{ textAlign: 'center', padding: '14px 0', color: '#8a6a3c', fontSize: 12.5 }}
            title={failWhy}>
            풀이를 쓰지 못했어요. 판정은 위에 그대로 있습니다.
            {failWhy && (
              <div style={{ fontSize: 11, color: '#b08a9a', marginTop: 6, lineHeight: 1.7 }}>
                {failWhy}
              </div>
            )}
            <button onClick={() => window.location.reload()}
              style={{
                marginTop: 10, background: ACCENT, color: '#fff', border: 'none',
                borderRadius: 9, padding: '8px 18px', fontSize: 12.5, cursor: 'pointer',
              }}>
              다시 시도
            </button>
          </div>
        )}

        {/* 일부 묶음만 온 경우 — 글은 보여 주고 «덜 왔다» 는 것만 알립니다 */}
        {tongState === 'done' && failWhy && (
          <div style={{
            background: '#fdf4e8', border: '0.5px solid #f0dcc0', borderRadius: 12,
            padding: '11px 14px', marginBottom: 12, fontSize: 12, color: '#8a6a3c', lineHeight: 1.75,
          }} title={failWhy}>
            일부 갈래를 못 받았어요. 아래 [다시 시도]로 한 번 더 받아 보실 수 있습니다.
            <button onClick={() => window.location.reload()}
              style={{
                display: 'block', marginTop: 8, background: 'none', border: `1px solid ${ACCENT}`,
                color: ACCENT, borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer',
              }}>
              다시 시도
            </button>
          </div>
        )}

        {/* ★교재 195쪽 맺음말 — 카드마다 붙이지 않고 여기 한 번만 (2026-07-27)
             카드에 넣었더니 카드가 길어져 손님이 다 읽기 전에 지쳤다.

             ★2026-07-29 — «멘토링 강조 박스» 로 다듬었습니다. (대표님 지시)
               [왜] 리포트 맨 끝은 손님이 «그래서 나는 어떻게 하지» 하고 덮는 자리입니다.
                    운에 일희일비하지 말라는 말이 여기서 가장 힘이 있습니다.
                    전에는 다른 카드와 같은 결이라 그냥 지나쳤습니다.
             ⚠️ 문구는 교재 195쪽 그대로입니다. 손대지 마십시오. (CLOSING·CLOSING_STUDENT) */}
        <div style={{
          marginTop: 14,
          background: 'linear-gradient(135deg, rgba(253,238,244,0.95) 0%, rgba(250,244,238,0.9) 100%)',
          border: '1.5px solid rgba(200,90,140,0.3)',
          borderRadius: 16,
          padding: '18px 17px',
          boxShadow: '0 4px 18px -8px rgba(200,90,140,0.28)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>🌱</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#8c4a63', letterSpacing: '-0.2px' }}>
              마지막으로 드리고 싶은 말
            </span>
          </div>
          {(target === 'student' ? CLOSING_STUDENT : CLOSING).map((l, i) => (
            <p key={i} style={{
              margin: i === 0 ? 0 : '8px 0 0',
              fontSize: 12.8, color: '#7a4055', lineHeight: 1.9,
              wordBreak: 'keep-all', overflowWrap: 'anywhere',
            }}>{l}</p>
          ))}
          <div style={{
            marginTop: 13, paddingTop: 12, borderTop: '1px solid rgba(200,90,140,0.18)',
            fontSize: 12, color: '#96607a', lineHeight: 1.8,
          }}>
            사주는 지도일 뿐, 걷는 것은 {target === 'student' ? '학생' : '본인'} 자신입니다.
            좋은 때라도 손을 놓으면 지나가고, 더딘 때라도 쌓아 두면 다음 때에 터집니다.
          </div>
        </div>
      </div>

      {/* 아래 붙박이 메뉴 — 다른 화면과 같은 모양 (result-new 에서 그대로 가져옴) */}
      <div style={{
        position: 'fixed', bottom: 0, zIndex: 50, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430, display: 'flex', justifyContent: 'space-around',
        padding: '10px 0 20px', background: '#fff', borderTop: '0.5px solid #f0ede6',
      }}>
        {[{ icon: '🏠', label: '홈', to: '/home-new' },
          { icon: '⊞', label: '서비스', to: '/home-new' },
          { icon: '💬', label: '상담', to: '/home-new' },
          { icon: '🤍', label: '찜', to: '/home-new' },
          { icon: '👤', label: '마이', to: '/home-new' }].map(item => (
          <div key={item.label} onClick={() => router.push(item.to)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 9, color: '#ccc' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </main>
  )
}

/** 앞으로 몇 해를 한눈에 — 오른쪽에서 왼쪽으로 흐른다 */
/**
 * ★2026-07-29 — 시험이 있는 해의 «달별 흐름». (대표님 지시 — 타임라인 샌드위치)
 *   시험 날짜를 넣었을 때만 뜹니다. 「시험 날짜를 짚어 보면」 카드 바로 위에 옵니다.
 *   ⚠️ 월운 계산은 lib/saju/dayun.calcWolunList 한 곳에서만 합니다. (교훈 BQ)
 */
function MonthStrip({ dayStem, year, mark }: { dayStem: string; year: number; mark: number | null }) {
  const list = useMemo(() => (dayStem ? calcWolunList(dayStem, year) : []), [dayStem, year])
  if (!list.length) return null
  return (
    <div style={{
      background: CARD, border: `0.5px solid ${LINE}`, borderRadius: 14,
      padding: '13px 14px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#8c4a63' }}>{year}년 달별 흐름</span>
        <span style={{ fontSize: 10.5, color: '#c5a590' }}>옆으로 밀어서 보세요</span>
      </div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {list.map(w => {
          const on = mark === w.month
          return (
            <div key={w.month} style={{ flexShrink: 0, textAlign: 'center', width: 50 }}>
              <div style={{ fontSize: 10.5, color: on ? '#c85a8c' : '#8a7063', marginBottom: 4, fontWeight: on ? 700 : 400 }}>
                {w.month}월
              </div>
              <div style={{
                fontSize: 14, fontWeight: 700, color: '#3a2e28',
                background: on ? '#fdeef4' : '#faf6f1',
                border: on ? '1.5px solid #c85a8c' : `0.5px solid ${LINE}`,
                borderRadius: 9, padding: '7px 0', letterSpacing: '.03em',
              }}>{w.cheongan}{w.jiji}</div>
            </div>
          )
        })}
      </div>
      {mark != null && (
        <div style={{ fontSize: 11, color: '#8c4a63', marginTop: 8 }}>
          ★{mark}월이 시험이 있는 달입니다.
        </div>
      )}
    </div>
  )
}

function YearStrip({ cards }: { cards: ExamCard[] }) {
  const years = (cards.find(c => c.key === 'years')?.data?.years ?? []) as YearLuck[]
  if (!years.length) return null
  return (
    <div style={{
      background: CARD, border: `0.5px solid ${LINE}`, borderRadius: 14,
      padding: '13px 14px', marginBottom: 12, overflowX: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
        <span style={{ fontSize: 11.5, color: '#8a7063' }}>← 미래 · 올해 →</span>
        {years.length > 4 && (
          <span style={{ fontSize: 10.5, color: '#c5a590' }}>옆으로 밀어서 보세요</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 7, flexDirection: 'row-reverse', justifyContent: 'flex-end' }}>
        {years.map(y => {
          const g = GRADE_STYLE[y.grade]
          return (
            <div key={y.year} style={{ flexShrink: 0, textAlign: 'center', width: 66 }}>
              <div style={{ fontSize: 11, color: '#8a7063', marginBottom: 4 }}>{y.year}</div>
              <div style={{
                fontSize: 16, fontWeight: 700, color: '#3a2e28',
                background: '#faf6f1', border: `0.5px solid ${LINE}`,
                borderRadius: 9, padding: '8px 0', marginBottom: 4,
                letterSpacing: '.04em',
              }}>{y.stem}{y.branch}</div>
              <div style={{
                fontSize: 10, fontWeight: 600, borderRadius: 7, padding: '3px 0',
                background: g.bg, color: g.fg, whiteSpace: 'nowrap',
              }}>{y.grade}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Msg({ text, onBack }: { text: string; onBack?: () => void }) {
  return (
    <main style={{
      minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24,
    }}>
      {/* ★2026-07-30 — ✦ 가 멈춰 있던 것을 고쳤습니다. (대표님 지적 · 35부 미결 ③)
           [무엇이 없었나] 세 가지가 다 없었습니다.
             ① animation 선언  ② display:inline-block (span/div 기본값이면 회전이 안 먹습니다)
             ③ @keyframes spin 정의 — 이 파일에 한 줄도 없었습니다.
           개명 진단(naming/diagnosis)·사주보기(result-new)는 이 셋을 다 갖고 있습니다.
           ⚠️ keyframes 는 화면마다 따로 심는 것이 이 저장소의 방식입니다.
              전역 CSS(app/globals.css)에 spin 이 없으므로 여기서 선언해야 돕니다. */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{
        fontSize: 26, color: ACCENT,
        display: 'inline-block', animation: 'spin 1.2s linear infinite',
      }}>✦</div>
      <p style={{ color: '#8c4a63', fontSize: 14 }}>{text}</p>
      {onBack && (
        <button onClick={onBack}
          style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13.5, cursor: 'pointer' }}>
          보관함으로
        </button>
      )}
    </main>
  )
}

/**
 * ★두 page.tsx 가 함께 쓰는 껍데기.
 *   mode 만 다르고 나머지는 한 몸입니다. (교훈 CJ)
 */
export default function ExamResultShell({ mode }: { mode: ExamMode }) {
  return (
    <Suspense fallback={<Msg text="불러오는 중…" />}>
      <ExamLuckResultInner mode={mode} />
    </Suspense>
  )
}
