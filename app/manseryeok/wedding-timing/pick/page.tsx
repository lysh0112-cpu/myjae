'use client'
// app/manseryeok/wedding-timing/pick/page.tsx
//
// ★ 결혼택일 v7 — 날짜 고르기 (점수·순위 없음)
//   옛 /result(점수제 화면)를 대체한다. 앞 화면(find)에서 넘어오는 파라미터는
//   옛 경로와 동일하게 받는다.  ?p1=...&p2=...&survey=...
//
//   [흐름] 두 사람 선택 → 기간 입력(find) → (여기) 날짜 고르기 → 보관함 저장

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PickWeddingV7 from '../components/PickWeddingV7'
import { runWeddingV7, type WeddingV7Result, type RawPerson, type DayResult } from '../lib/recommendV7'
import { saveWeddingRecord, getWeddingRecord } from '@/lib/saju/weddingRecords'
import type { SavedInputData } from '@/lib/saju/savedPeople'

const C = { bg: '#FDF6F0', sub: '#B4785A', brand: '#96502E', line: '#F0E0D5' }

interface WeddingSurvey {
  startDate: string
  endDate: string
  dayPref?: string
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { return null }
}

function PickInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<WeddingV7Result | null>(null)
  const [errMsg, setErrMsg] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    async function run() {
      const groom = parseJson<RawPerson>(sp.get('p1'))
      const bride = parseJson<RawPerson>(sp.get('p2'))
      let survey = parseJson<WeddingSurvey>(sp.get('survey'))

      // ── 보관함 다시보기 — recordId 로 들어오면 저장해 둔 기간을 되살린다 ──
      //   기간은 saveWeddingRecord 인자에 없어 result_data 안에 넣어 두었다.
      const recordId = sp.get('recordId')
      if (recordId && !survey) {
        const rec = await getWeddingRecord(recordId)
        if (cancelled) return
        const snap = rec?.resultData as { survey?: WeddingSurvey } | undefined
        if (snap?.survey) survey = snap.survey
      }

      if (!survey?.startDate || !survey?.endDate) {
        setErrMsg('희망 기간을 확인하지 못했어요. 이전 화면에서 다시 입력해 주세요.')
        setLoading(false); return
      }
      try {
        const r = await runWeddingV7({
          startDate: survey.startDate, endDate: survey.endDate, groom, bride,
        })
        if (cancelled) return
        if (r.error) setErrMsg(r.error)
        setResult(r)
      } catch {
        if (!cancelled) setErrMsg('날짜를 찾는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [sp])

  /** 날짜를 누르면 보관함에 저장한다. 같은 두 사람·같은 기간이면 덮어쓴다. */
  async function handlePick(day: DayResult) {
    const groom = parseJson<RawPerson>(sp.get('p1'))
    const bride = parseJson<RawPerson>(sp.get('p2'))
    const survey = parseJson<WeddingSurvey>(sp.get('survey'))
    if (!groom || !bride || !survey || !result) return
    setSavedMsg('')
    try {
      const res = await saveWeddingRecord({
        kind: 'find',
        name1: '신랑', name2: '신부',
        summary: `${day.fullLabel} ${day.weekday}요일 · ${day.ganji}`,
        input1: groom as unknown as SavedInputData,
        input2: bride as unknown as SavedInputData,
        // ★survey 는 saveWeddingRecord 인자에 없다. 다시보기 때 기간이 필요하므로
        //   result_data 안에 함께 넣는다.
        resultData: {
          version: 'v7',
          survey,
          picked: {
            dateKey: day.dateKey, y: day.y, m: day.m, d: day.d,
            weekday: day.weekday, ganji: day.ganji, detail: day.detail,
          },
        },
      })
      setSavedMsg(res?.ok ? `${day.dateLabel}을 보관함에 담았어요` : '저장하지 못했어요')
    } catch {
      setSavedMsg('저장하지 못했어요')
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: C.bg, flexDirection: 'column', gap: 10,
      }}>
        <div style={{ fontSize: 15, color: C.brand, fontWeight: 600 }}>좋은 날을 찾고 있어요</div>
        <div style={{ fontSize: 12.5, color: C.sub }}>두 분의 사주로 하루하루 살펴보는 중입니다</div>
      </div>
    )
  }

  if (errMsg || !result) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: C.brand, lineHeight: 1.8, marginBottom: 18 }}>
          {errMsg || '결과를 만들지 못했어요.'}
        </div>
        <button onClick={() => router.back()} style={{
          padding: '11px 22px', borderRadius: 11, border: `1px solid ${C.line}`,
          background: '#fff', color: C.brand, fontSize: 13.5, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>이전으로</button>
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: C.bg }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '16px 0 2px' }}>
          <button onClick={() => router.back()} aria-label="뒤로" style={{
            border: 'none', background: 'none', fontSize: 19, color: C.sub,
            cursor: 'pointer', lineHeight: 1, padding: 0,
          }}>←</button>
          <div>
            <h1 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>결혼 길일 택일</h1>
            <p style={{ fontSize: 11.5, color: C.sub, margin: '2px 0 0' }}>
              두 분께 좋은 날을 찾아드려요
            </p>
          </div>
        </div>
      </div>

      <PickWeddingV7 result={result} onPickDay={handlePick} />

      {savedMsg && (
        <div style={{
          position: 'fixed', left: 0, right: 0, bottom: 24, display: 'flex', justifyContent: 'center',
          pointerEvents: 'none', zIndex: 50,
        }}>
          <div style={{
            background: 'rgba(58,46,40,.92)', color: '#fff', fontSize: 13,
            padding: '11px 18px', borderRadius: 99, fontWeight: 600,
          }}>{savedMsg}</div>
        </div>
      )}
    </main>
  )
}

export default function WeddingPickPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: C.bg, color: C.brand, fontSize: 14,
      }}>불러오는 중…</div>
    }>
      <PickInner />
    </Suspense>
  )
}
