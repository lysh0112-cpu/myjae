'use client'
// app/manseryeok/birth-timing/pick/page.tsx
//
// ★ 출산택일 v7 — 날짜 고르기 화면 (점수·순위 없음)
//
//   기존 result/page.tsx(v5, 점수제)는 그대로 둔다. 비교·롤백을 위해서다.
//   앞 화면(page.tsx)에서 넘어오는 파라미터는 v5 경로와 동일하게 받는다.
//     ?p1=...&p2=...&survey=...
//
//   [흐름]  부모 선택 → 출산 정보 입력 → (여기) 날짜 고르기 → 시간 선택 → 해설
//
//   ⚠️ 해설 화면은 2차 작업. 지금은 선택만 받아 둔다.

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PickDateV7 from '../components/PickDateV7'
import { runRecommendV7, type RecommendV7Result, type DayOption, type HourOption } from '../lib/recommendV7'

const C = { bg: '#FDF6F0', sub: '#B4785A', brand: '#96502E', line: '#F0E0D5' }

interface SurveyInput {
  dueDate: string
  method: string
  timePref: string
  babyGender: string
  wishes: string[]
  avoidNote: string
}

/**
 * 앞 화면은 URLSearchParams.set(key, JSON.stringify(...)) 로 담는다.
 * useSearchParams().get() 이 이미 디코딩해 주므로 여기서 또 decode 하면 안 된다.
 * (%2B 같은 값이 있을 때 이중 디코딩으로 깨진다)
 */
function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { return null }
}

/** '아들' → '남' (대운 순역 판정은 '남'/'여' 문자열을 받는다) */
function toGenderCode(babyGender: string): string {
  if (!babyGender) return ''
  if (babyGender.includes('아들') || babyGender === '남') return '남'
  if (babyGender.includes('딸') || babyGender === '여') return '여'
  return babyGender
}

function PickInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<RecommendV7Result | null>(null)
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    let cancelled = false

    async function run() {
      const survey = parseJson<SurveyInput>(sp.get('survey'))
      if (!survey?.dueDate) {
        setErrMsg('출산예정일이 없어요. 이전 화면에서 다시 입력해 주세요.')
        setLoading(false)
        return
      }
      const gender = toGenderCode(survey.babyGender)
      if (!gender) {
        setErrMsg('아기 성별을 선택해 주세요. 성별이 있어야 10년 단위 흐름(대운)을 계산할 수 있어요.')
        setLoading(false)
        return
      }

      try {
        const r = await runRecommendV7({ dueDate: survey.dueDate, gender })
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

  // 시간 선택 → 해설 화면 (2차 작업)
  function handlePick(day: DayOption, hour: HourOption) {
    const q = new URLSearchParams()
    const p1 = sp.get('p1'); const p2 = sp.get('p2'); const survey = sp.get('survey')
    if (p1) q.set('p1', p1)
    if (p2) q.set('p2', p2)
    if (survey) q.set('survey', survey)
    q.set('date', day.dateKey)
    q.set('hour', String(hour.hourIdx))
    router.push(`/manseryeok/birth-timing/detail?${q.toString()}`)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: C.bg, flexDirection: 'column', gap: 10,
      }}>
        <div style={{ fontSize: 15, color: C.brand, fontWeight: 600 }}>좋은 날을 찾고 있어요</div>
        <div style={{ fontSize: 12.5, color: C.sub }}>예정일 3주 전부터 사흘 뒤까지 살펴보는 중입니다</div>
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
          <button onClick={() => router.back()} style={{
            border: 'none', background: 'none', fontSize: 19, color: C.sub,
            cursor: 'pointer', lineHeight: 1, padding: 0,
          }}>←</button>
          <div>
            <h1 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>출산 시기 택일</h1>
            <p style={{ fontSize: 11.5, color: C.sub, margin: '2px 0 0' }}>
              아기에게 좋은 출산일을 찾아드려요
            </p>
          </div>
        </div>
      </div>
      <PickDateV7
        result={result}
        onPickHour={handlePick}
        onConsult={() => router.push('/consultants')}
      />
    </main>
  )
}

export default function PickPage() {
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
