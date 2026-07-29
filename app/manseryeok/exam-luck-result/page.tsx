'use client'

/**
 * 합격운 · 취업운 결과
 * ─────────────────────────────────────────────
 * 진입: exam-luck-input > 이 화면  /  보관함 카드 > 이 화면(&recordId=)
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
import { buildExamPrompt, parseExamTongbyeon } from '@/lib/saju/examLuck/buildExamPrompt'
import { examKindOf, CLOSING, CLOSING_STUDENT } from '@/lib/saju/examLuck/tables/rules'
import { targetPromptBlock, GRADE_PROMPT, gradeMismatch, levelTrackBlock, conditionalRules } from '@/lib/saju/examLuck/tables/studentTarget'
import { saveRecord, updateRecordResult, getRecord } from '@/lib/saju/sajuRecords'
import { calcSeyunList, calcWolunList, type DayunItem } from '@/lib/saju/dayun'
import { calcSimsanOhaeng } from '@/lib/saju/simsanOhaeng'
import SajuWonguk from '@/app/manseryeok/result-new/SajuWonguk'
import ExamJudgeCard, { GRADE_STYLE } from './components/ExamJudgeCard'
import type { ExamCard, ExamInput, ExamTarget, YearLuck } from '@/lib/saju/examLuck/types'

const ACCENT = '#c85a8c'
const BG = '#FDF6F0'
const CARD = '#FFFBF7'
const LINE = '#f0e0d5'

function ExamLuckResultInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const person = useMemo(() => ({
    name: sp.get('name') || '나',
    gender: sp.get('gender') || '남',
    year: sp.get('year') || '', month: sp.get('month') || '', day: sp.get('day') || '',
    calType: sp.get('calType') || '양력', leapMonth: sp.get('leapMonth') || '0',
    hour: sp.get('hour') || '모름',
  }), [sp])
  const target: ExamTarget = sp.get('target') === 'student' ? 'student' : 'adult'
  const kind = sp.get('kind') === 'job' ? 'job' : 'exam'
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

  /** 오행 점수 — 프롬프트 재료용 */
  const ohaengScore = useMemo(
    () => (calc?.saju?.length ? calcSimsanOhaeng(calc.saju, calc.solarMonth, calc.solarDay, calc.hourBranch) : null),
    [calc],
  )

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
      },
    } as never).then(r => { if (r && (r as { id?: string }).id) savedIdRef.current = (r as { id: string }).id })
  }, [calc, cards, recordId, person])

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
      const systemPrompt = buildExamPrompt({
        name: person.name, gender: person.gender,
        age: exactAge(calc.solarYear, calc.solarMonth, calc.solarDay),
        target, cards, hourUnknown: person.hour === '모름',
        saju: calc.saju, ohaengScore: ohaengScore ?? undefined,
        kind, examKind, examDate: examDateRaw || null,
        examDayNote: examDayForPrompt,
        // ★학생이 고른 목표 — 학생일 때만 실립니다
        targetBlock: target === 'student'
          ? targetPromptBlock(examCategory, targetType, targetCustomText) : null,
        // ★학년·신분 — 초등학생에게 «수능 멘탈» 을 말하지 않게 하는 자리
        gradeBlock: target === 'student' && studentGrade
          ? GRADE_PROMPT[studentGrade as keyof typeof GRADE_PROMPT] ?? null : null,
        gradeMismatch: target === 'student'
          ? gradeMismatch(exactAge(calc.solarYear, calc.solarMonth, calc.solarDay), studentGrade) : false,
        // ★고1 이상에게만 물은 것 — 없으면 빈 문자열이라 안 실립니다
        levelTrack: target === 'student' ? levelTrackBlock(gradeLevel, trackSel) : null,
        // ★조건이 겹칠 때만 붙는 지시 — «이 사람만의» 문장을 만드는 자리
        conditional: target === 'student'
          ? conditionalRules({
              grade: studentGrade, level: gradeLevel, track: trackSel,
              category: examCategory, target: targetType,
              year: thisYear, name: person.name || '이분',
            })
          : null,
      })
      let acc = ''
      try {
        const res = await fetch('/api/tongbyeon', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemPrompt, premium: true }),
        })
        if (!res.ok || !res.body) { setTongState('failed'); return }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        const take = (line: string) => {
          if (!line.startsWith('data: ')) return
          const d = line.slice(6)
          if (d === '[DONE]') return
          try {
            const parsed = JSON.parse(d)
            if (parsed.text) { acc += parsed.text; if (!cancelled) setTong(acc) }
          } catch { /* 부서진 줄은 흘려보낸다 */ }
        }
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const ls = buf.split('\n')
          buf = ls.pop() ?? ''
          for (const line of ls) take(line)
        }
        buf += decoder.decode()
        if (buf.trim()) take(buf.trim())
        if (cancelled) return
        setTongState('done')

        for (let i = 0; i < 10 && !savedIdRef.current; i++) {
          await new Promise(r => setTimeout(r, 500))
        }
        if (savedIdRef.current) await updateRecordResult(savedIdRef.current, { tong: acc } as never)
      } catch {
        if (!cancelled) setTongState('failed')
      }
    })()
    return () => { cancelled = true }
  }, [calc, cards, recordId, person, target])

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
          {person.name}님의 {kind === 'job' ? '취업운' : '합격운'}
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

        {tongState === 'loading' && !tong && (
          <div style={{ textAlign: 'center', padding: '18px 0', color: ACCENT, fontSize: 13 }}>
            풀이를 쓰는 중이에요… 조금만 기다려 주세요
          </div>
        )}

        {cards.map(c => (
          <div key={c.key}>
            {/* ★도표를 그 카드 «바로 위» 에 얹습니다.
                 years  → 연도별 흐름표 (앞으로 몇 해)
                 examday→ 시험일 표는 카드 안에 이미 있어 따로 안 붙입니다. */}
            {c.key === 'years' && <YearStrip cards={cards} />}
            {c.key === 'examday' && examMonth && (
              <MonthStrip dayStem={dayStemForStrip} year={examMonth.y} mark={examMonth.m} />
            )}
            <ExamJudgeCard card={c} tong={parsed?.byKey[c.key]} />
          </div>
        ))}

        {/* ★2026-07-29 — 따로 두었던 「시험 당일 실전 준비」 블록을 없앴습니다.
             「시험 날짜를 짚어 보면」 카드와 대목이 겹쳐 AI 가 둘 중 하나에만 썼습니다.
             → 그 카드를 「시험 날짜와 실전 준비」로 키우고 실전 전략을 그 안에 담습니다. */}

        {/* 맺는말 */}
        {parsed?.outro && (
          <div style={{
            background: CARD, border: `0.5px solid ${LINE}`, borderRadius: 14,
            padding: '15px 16px', marginBottom: 12,
            fontSize: 13.5, color: '#3a2e28', lineHeight: 1.85, whiteSpace: 'pre-wrap',
            wordBreak: 'keep-all', overflowWrap: 'anywhere',
          }}>{parsed.outro}</div>
        )}

        {tongState === 'failed' && (
          <div style={{ textAlign: 'center', padding: '14px 0', color: '#8a6a3c', fontSize: 12.5 }}>
            풀이를 쓰지 못했어요. 판정은 위에 그대로 있습니다.
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
      <div style={{ fontSize: 26 }}>✦</div>
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

export default function ExamLuckResultPage() {
  return (
    <Suspense fallback={<Msg text="불러오는 중…" />}>
      <ExamLuckResultInner />
    </Suspense>
  )
}
