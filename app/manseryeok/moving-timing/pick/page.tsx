'use client'

/**
 * 이사택일 — 좋은 날 목록 (pick)
 * ─────────────────────────────────────────────
 * 진입: find(기간 입력) → 여기 / 보관함 다시보기 → 여기(recordId)
 * 흐름: 후보 계산 → PickMovingV1 이 그린다 → 날짜를 누르면 보관함 저장
 *
 * ★API 호출: 사주 2회 + 공휴일 1회 = 3회.
 *   일주는 자체 계산, 음력은 내장 대조표라 호출이 없다.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PickMovingV1 from '../components/PickMovingV1'
import { runMovingV1, type MovingV1Result, type DayResult, type RawPerson } from '../lib/recommendV1'
import { getMovingRecord, saveMovingRecord } from '@/lib/saju/movingRecords'
import type { Direction } from '../lib/movingTables'
import type { SavedInputData } from '@/lib/saju/savedPeople'

const accent = '#967850'
const line = '#EAE0CE'
const ink = '#3A3228'
const sub = '#9A8060'

function PickInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [result, setResult] = useState<MovingV1Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)

      // 보관함 다시보기 — 저장해 둔 스냅샷을 그대로 쓴다(재계산 없음)
      const recordId = sp.get('recordId')
      if (recordId) {
        const rec = await getMovingRecord(recordId)
        if (!cancelled && rec?.resultData) {
          setResult(rec.resultData as MovingV1Result)
          setLoading(false)
          return
        }
      }

      const parse = (key: string): RawPerson | null => {
        try {
          const raw = sp.get(key)
          if (!raw) return null
          const o = JSON.parse(decodeURIComponent(raw))
          return {
            year: String(o.year ?? ''), month: String(o.month ?? ''),
            day: String(o.day ?? ''), hour: String(o.hour ?? '-1'),
            gender: String(o.gender ?? ''), calType: String(o.calType ?? '양력'),
            name: o.name,
          }
        } catch { return null }
      }

      const dirRaw = sp.get('dir')
      const direction = (['동', '서', '남', '북'].includes(dirRaw ?? '')
        ? dirRaw : null) as Direction | null

      const r = await runMovingV1({
        startDate: sp.get('start') ?? '',
        endDate: sp.get('end') ?? '',
        contractor: parse('p1'),
        spouse: parse('p2'),
        ownerMode: sp.get('owner') === 'single' ? 'single' : 'joint',
        ownerWho: sp.get('who') === 'spouse' ? 'spouse' : 'contractor',
        direction,
      })

      if (!cancelled) { setResult(r); setLoading(false) }
    }

    run()
    return () => { cancelled = true }
  }, [sp])

  /** 날짜를 누르면 보관함에 저장한다. */
  async function handlePick(day: DayResult) {
    if (!result?.contractor) return
    const unpack = (key: string): (SavedInputData & { name?: string }) | null => {
      try {
        const raw = sp.get(key)
        return raw ? JSON.parse(decodeURIComponent(raw)) : null
      } catch { return null }
    }
    const in1 = unpack('p1')
    const in2 = unpack('p2')
    if (!in1) return

    const res = await saveMovingRecord({
      kind: 'find',
      name1: result.contractor.name,
      name2: result.spouse?.name ?? '',
      summary: `${day.fullLabel} 외 ${Math.max(result.days.length - 1, 0)}일`,
      input1: in1,
      input2: in2 ?? in1,
      ownerMode: result.ownerMode,
      ownerWho: sp.get('who') === 'spouse' ? 'spouse' : 'contractor',
      direction: result.direction,
      resultData: result,
    })
    setSaved(res.ok ? `${day.fullLabel}을 보관함에 담았어요.` : (res.message ?? '저장하지 못했어요.'))
    setTimeout(() => setSaved(null), 2600)
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#FBF8F2', maxWidth: 480,
      margin: '0 auto', paddingBottom: 40,
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(251,248,242,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: `0.5px solid ${line}`, padding: '13px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none', border: 'none', color: '#7A6440',
            fontSize: 17, cursor: 'pointer', padding: 0,
          }}
        >←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: ink }}>이사택일</div>
          <div style={{ fontSize: 10.5, color: '#7A6440' }}>이사하기 좋은 날</div>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: sub, fontSize: 13.5 }}>
          좋은 날을 고르는 중이에요…
        </div>
      )}

      {!loading && result?.error && (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, color: '#C0705E', lineHeight: 1.8 }}>
            {result.error}
          </div>
          <button
            onClick={() => router.push('/manseryeok/moving-timing/input')}
            style={{
              marginTop: 18, padding: '12px 24px', background: accent, color: '#fff',
              border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            처음부터 다시
          </button>
        </div>
      )}

      {!loading && result && !result.error && (
        <PickMovingV1 result={result} onPickDay={handlePick} />
      )}

      {saved && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)',
          background: 'rgba(58,50,40,.93)', color: '#fff', fontSize: 13,
          padding: '11px 20px', borderRadius: 22, zIndex: 50, maxWidth: 400,
        }}>
          {saved}
        </div>
      )}
    </main>
  )
}

export default function MovingPickPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: sub }}>불러오는 중…</div>}>
      <PickInner />
    </Suspense>
  )
}
