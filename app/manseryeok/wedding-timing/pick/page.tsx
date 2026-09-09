'use client'
// app/manseryeok/wedding-timing/pick/page.tsx
//
// ★ 결혼택일 v7 — 날짜 고르기 (점수·순위 없음)
//   옛 /result(점수제 화면)를 대체한다. 앞 화면(find)에서 넘어오는 파라미터는
//   옛 경로와 동일하게 받는다.  ?p1=...&p2=...&survey=...
//
//   [흐름] 두 사람 선택 → 기간 입력(find) → (여기) 날짜 고르기 → 보관함 저장

import { Suspense, useEffect, useState, useRef } from 'react'
//  ★2026-09-09 — 보관함 자리는 공용 부품 «한 곳» 입니다 [대표님 「색상 통일」]
import StorageLinkRow from '@/app/components/common/StorageLinkRow'
import { useRouter, useSearchParams } from 'next/navigation'
import PickWeddingV7 from '../components/PickWeddingV7'
import { runWeddingV7, type WeddingV7Result, type RawPerson, type DayResult } from '../lib/recommendV7'
import { saveWeddingRecord, getWeddingRecord, updateWeddingRecord } from '@/lib/saju/weddingRecords'
import type { SavedInputData } from '@/lib/saju/savedPeople'

const C = { bg: '#FDF6F0', sub: '#B4785A', brand: '#96502E', line: '#9c7a58' }

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
  //  ★담아 둔 줄의 id — 날짜를 누르면 «이 줄을 덮어씁니다»
  const savedIdRef = useRef<string | null>(null)
  //  ⛔ useState 로 막지 마십시오 — «다시 그릴 때» 반영되어 «샙니다»
  const savingRef = useRef(false)

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
        //  ★다시보기 — 이미 담긴 것입니다. ⛔ 또 담지 마십시오.
        savedIdRef.current = recordId
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
        //  🔴 ★결과가 나오면 «저절로» 담습니다 [대표님 「보관함에 없어」]
        //     ⛔ 이 줄을 빼면 ★날짜를 눌러야만 담기던 예전으로 돌아갑니다.
        void keepRecord(r, '좋은 날을 찾았어요')
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
  // ══════════════════════════════════════════════════════════════════
  //  🔴 ★2026-09-09 — 결과가 나오면 «저절로» 담습니다  [대표님 지시]
  //    「조회하고 하단의 보관함에 저장을 하면 ★보관함에 없어」
  //    「★선택된 날자를 눌러야만 저장이 되는 건가?」  ⇒ 그랬습니다.
  //
  //   [무엇이 있었나]
  //     ① ★«날짜를 누를 때» 만 담겼습니다 — 조회만 하고 나가면 아무것도 안 남았습니다.
  //     ② saveWeddingRecord 는 언제나 ★«새 줄» 을 만듭니다 —
  //        날짜를 여럿 눌러 보시면 그만큼 쌓였습니다.
  //   ⇒ 결과가 나오면 한 줄 담고, 날짜를 누르시면 ★그 줄을 «덮어씁니다».
  //   ⛔ 날짜마다 새 줄을 만들지 마십시오.
  //   ⚠️ 다시보기(recordId)는 ★이미 담긴 것입니다 — 또 담지 않습니다.
  // ══════════════════════════════════════════════════════════════════
  async function keepRecord(res2: WeddingV7Result, summary: string, picked?: DayResult) {
    const groom = parseJson<RawPerson>(sp.get('p1'))
    const bride = parseJson<RawPerson>(sp.get('p2'))
    const survey = parseJson<WeddingSurvey>(sp.get('survey'))
    if (!groom || !bride || !survey) return
    if (savingRef.current) return

    const snap = {
      version: 'v7',
      survey,
      picked: picked ? {
        dateKey: picked.dateKey, y: picked.y, m: picked.m, d: picked.d,
        weekday: picked.weekday, ganji: picked.ganji, detail: picked.detail,
      } : null,
      days: res2,
    }

    if (savedIdRef.current) {
      const ok = await updateWeddingRecord(savedIdRef.current, { summary, resultData: snap })
      setSavedMsg(ok ? summary + ' 담았어요' : '저장하지 못했어요')
      return
    }
    savingRef.current = true
    const res = await saveWeddingRecord({
      kind: 'find',
      name1: '신랑', name2: '신부',
      summary,
      input1: groom as unknown as SavedInputData,
      input2: bride as unknown as SavedInputData,
      resultData: snap,
    })
    savingRef.current = false
    if (res?.ok && res.id) savedIdRef.current = res.id
    setSavedMsg(res?.ok ? summary + ' 담았어요' : '저장하지 못했어요')
  }

  async function handlePick(day: DayResult) {
    if (!result) return
    //  ★담아 둔 줄에 «고르신 날짜» 를 얹습니다 — ⛔ 새 줄을 만들지 않습니다.
    await keepRecord(result, `${day.fullLabel} ${day.weekday}요일 · ${day.ganji}`, day)
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

      {/* 🔴 ★2026-09-09 — 결과 맨 아래 「보관함」 자리 [대표님 「보관함 버튼을 만들면 어때」]
          ⚠️ 이 화면에는 보관함으로 가는 길이 ★«아예 없었습니다».
          ⛔ 단추를 «직접 만들지» 마십시오 — StorageLinkRow 한 곳입니다. */}
      <div style={{ padding: '0 16px 24px' }}>
        <StorageLinkRow
          label="결혼택일 보관함"
          href="/manseryeok/wedding-timing/wedding-storage"
          state={savedIdRef.current ? 'saved' : savedMsg === '저장하지 못했어요' ? 'failed' : 'saving'}
          onRetry={() => { if (result) void keepRecord(result, '좋은 날을 찾았어요') }}
          accent={C.brand}
        />
      </div>

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
