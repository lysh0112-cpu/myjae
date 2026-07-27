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
import { saveRecord, updateRecordResult, getRecord } from '@/lib/saju/sajuRecords'
import { calcSeyunList, type DayunItem } from '@/lib/saju/dayun'
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
    })
  }, [input, calc, dayunList, thisYear, kind, examDateRaw])

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
      const systemPrompt = buildExamPrompt({
        name: person.name, gender: person.gender,
        age: exactAge(calc.solarYear, calc.solarMonth, calc.solarDay),
        target, cards, hourUnknown: person.hour === '모름',
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
    <main style={{ minHeight: '100vh', background: BG, maxWidth: 480, margin: '0 auto', paddingBottom: 60 }}>
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
        <YearStrip cards={cards} />

        {tongState === 'loading' && !tong && (
          <div style={{ textAlign: 'center', padding: '18px 0', color: ACCENT, fontSize: 13 }}>
            풀이를 쓰는 중이에요… 조금만 기다려 주세요
          </div>
        )}

        {cards.map(c => (
          <ExamJudgeCard key={c.key} card={c} tong={parsed?.byKey[c.key]} />
        ))}

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
             카드에 넣었더니 카드가 길어져 손님이 다 읽기 전에 지쳤다. */}
        <div style={{
          marginTop: 6, background: '#f7e6ee', border: '0.5px solid #f0d8e2', borderRadius: 12,
          padding: '14px 16px', fontSize: 12.5, color: '#8c4a63', lineHeight: 1.85,
          wordBreak: 'keep-all', overflowWrap: 'anywhere',
        }}>
          {(target === 'student' ? CLOSING_STUDENT : CLOSING).map((l, i) => (
            <p key={i} style={{ margin: i === 0 ? 0 : '6px 0 0' }}>{l}</p>
          ))}
        </div>
      </div>
    </main>
  )
}

/** 앞으로 몇 해를 한눈에 — 오른쪽에서 왼쪽으로 흐른다 */
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
