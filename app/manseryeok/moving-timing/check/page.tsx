'use client'

/**
 * 이사택일 — 정한 날 봐주기 (check)
 * ─────────────────────────────────────────────
 * 진입: 이사택일 입구 > [정한 날 봐주기] / 보관함 다시보기(recordId)
 * 흐름: 날짜 1~3개 입력 → 진단 → CheckResultV1 이 6줄 O/X 로 그린다
 *
 * ⚠️ 결제 관문 — 결혼택일 check 는 analysis_prices('wedding_check')를 읽는다.
 *    이사택일은 나중에 한꺼번에 붙이기로 했다. price_key = 'moving_check'.
 *    붙일 자리는 아래 runDiagnose() 안이다.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CheckResultV1 from '../components/CheckResultV1'
import { runDiagnoseV1, type DiagnoseV1Result, type RawPerson } from '../lib/recommendV1'
import { getMovingRecord, saveMovingRecord } from '@/lib/saju/movingRecords'
import type { Direction } from '../lib/movingTables'
import type { SavedInputData } from '@/lib/saju/savedPeople'

const accent = '#967850'
const line = '#EAE0CE'
const ink = '#3A3228'
const sub = '#9A8060'

const MAX_DATES = 3

function CheckInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [dates, setDates] = useState<string[]>([''])
  const [result, setResult] = useState<DiagnoseV1Result | null>(null)
  // recordId 로 들어오면 처음부터 불러오는 중이다
  const [loading, setLoading] = useState(() => !!sp.get('recordId'))
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState<string | null>(null)

  // 보관함 다시보기 — 스냅샷을 그대로 쓴다
  //   ★setState 를 effect 본문이 아니라 비동기 콜백 안에서만 부른다.
  //     본문에서 바로 부르면 렌더가 연쇄로 돌아 lint 가 잡는다.
  useEffect(() => {
    let cancelled = false
    const recordId = sp.get('recordId')
    if (!recordId) return
    getMovingRecord(recordId).then(rec => {
      if (cancelled) return
      if (rec?.resultData) setResult(rec.resultData as DiagnoseV1Result)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [sp])

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

  async function runDiagnose() {
    const clean = dates.filter(d => d && d.trim())
    if (clean.length === 0) { setErr('봐드릴 날짜를 한 개 이상 골라 주세요.'); return }

    // ⚠️ 결제 관문이 들어올 자리. price_key = 'moving_check'

    setErr('')
    setLoading(true)

    const dirRaw = sp.get('dir')
    const direction = (['동', '서', '남', '북'].includes(dirRaw ?? '')
      ? dirRaw : null) as Direction | null

    const r = await runDiagnoseV1({
      dates: clean,
      contractor: parse('p1'),
      spouse: parse('p2'),
      ownerMode: sp.get('owner') === 'single' ? 'single' : 'joint',
      ownerWho: sp.get('who') === 'spouse' ? 'spouse' : 'contractor',
      direction,
    })
    setResult(r)
    setLoading(false)

    // 결과가 나오면 보관함에 저장
    if (!r.error && r.contractor) {
      const unpack = (key: string): (SavedInputData & { name?: string }) | null => {
        try {
          const raw = sp.get(key)
          return raw ? JSON.parse(decodeURIComponent(raw)) : null
        } catch { return null }
      }
      const in1 = unpack('p1')
      const in2 = unpack('p2')
      if (in1) {
        const okCount = r.results.filter(x => x.detail.passFixed).length
        const res = await saveMovingRecord({
          kind: 'check',
          name1: r.contractor.name,
          name2: r.spouse?.name ?? '',
          summary: `${r.results.length}일 중 ${okCount}일 괜찮아요`,
          input1: in1,
          input2: in2 ?? in1,
          ownerMode: r.ownerMode,
          ownerWho: sp.get('who') === 'spouse' ? 'spouse' : 'contractor',
          direction: r.direction,
          resultData: r,
        })
        if (res.ok) {
          setSaved('보관함에 담았어요.')
          setTimeout(() => setSaved(null), 2600)
        }
      }
    }
  }

  const setDate = (i: number, v: string) => {
    setDates(prev => prev.map((x, idx) => (idx === i ? v : x)))
    setErr('')
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
          onClick={() => (result ? setResult(null) : router.back())}
          style={{
            background: 'none', border: 'none', color: '#7A6440',
            fontSize: 17, cursor: 'pointer', padding: 0,
          }}
        >←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: ink }}>정한 날 봐주기</div>
          <div style={{ fontSize: 10.5, color: '#7A6440' }}>
            {result ? '봐드린 결과예요' : '생각해 두신 날이 있으신가요?'}
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: sub, fontSize: 13.5 }}>
          살펴보는 중이에요…
        </div>
      )}

      {!loading && !result && (
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ fontSize: 12.5, color: sub, lineHeight: 1.8, marginBottom: 16 }}>
            최대 세 개까지 봐드려요. 각 날짜마다 명절·공망·충·형 네 가지와
            쉬는 날·손 관련 세 가지를 하나씩 확인해 드려요.
          </div>

          {dates.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 9 }}>
              <input
                type="date"
                value={d}
                onChange={e => setDate(i, e.target.value)}
                style={{
                  flex: 1, padding: '12px 13px', background: '#FFFDF9',
                  border: `1px solid ${line}`, borderRadius: 11, fontSize: 14,
                  color: ink, fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
              {dates.length > 1 && (
                <button
                  onClick={() => setDates(prev => prev.filter((_, idx) => idx !== i))}
                  aria-label="이 날짜 지우기"
                  style={{
                    width: 42, background: '#FFFDF9', border: `1px solid ${line}`,
                    borderRadius: 11, color: '#C0AC90', fontSize: 16,
                    cursor: 'pointer', fontFamily: 'inherit', flex: 'none',
                  }}
                >×</button>
              )}
            </div>
          ))}

          {dates.length < MAX_DATES && (
            <button
              onClick={() => setDates(prev => [...prev, ''])}
              style={{
                width: '100%', padding: '12px 0', background: 'none',
                border: `1px dashed ${line}`, borderRadius: 11, color: sub,
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              + 날짜 더하기
            </button>
          )}

          {err && (
            <div style={{ fontSize: 12.5, color: '#C0705E', marginTop: 11, paddingLeft: 2 }}>
              {err}
            </div>
          )}

          <button
            onClick={runDiagnose}
            style={{
              width: '100%', marginTop: 22, padding: '15px 0',
              background: accent, color: '#fff', border: 'none', borderRadius: 13,
              fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'transform .08s, filter .12s',
            }}
            onPointerDown={e => {
              e.currentTarget.style.transform = 'scale(0.98)'
              e.currentTarget.style.filter = 'brightness(0.92)'
            }}
            onPointerUp={e => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.filter = 'none'
            }}
            onPointerLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.filter = 'none'
            }}
          >
            이 날들 봐주세요
          </button>
        </div>
      )}

      {!loading && result?.error && (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, color: '#C0705E', lineHeight: 1.8 }}>
            {result.error}
          </div>
        </div>
      )}

      {!loading && result && !result.error && <CheckResultV1 result={result} />}

      {saved && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)',
          background: 'rgba(58,50,40,.93)', color: '#fff', fontSize: 13,
          padding: '11px 20px', borderRadius: 22, zIndex: 50,
        }}>
          {saved}
        </div>
      )}
    </main>
  )
}

export default function MovingCheckPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: sub }}>불러오는 중…</div>}>
      <CheckInner />
    </Suspense>
  )
}
