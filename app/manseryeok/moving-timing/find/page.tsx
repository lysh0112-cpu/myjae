'use client'

/**
 * 이사택일 — 좋은 날 찾기 (기간 입력)
 * ─────────────────────────────────────────────
 * 진입: 이사택일 입구 > [좋은 날 찾기]
 * 흐름: 희망 기간 입력 → pick(날짜 목록)
 *
 * 결혼택일 find/page.tsx 와 같은 자리.
 *
 * ⚠️ 결제 관문 — 결혼택일 find 는 여기서 analysis_prices('wedding_pick')를 읽어
 *    바텀시트 결제 모달을 띄운다. 이사택일은 대표님 방침에 따라
 *    출산택일·결혼택일과 함께 한꺼번에 붙이기로 했다.
 *    가격 행은 이미 만들어 두었다 — analysis_prices.price_key = 'moving_pick'.
 *    붙일 자리는 아래 goPick() 안이다.
 */

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const accent = '#967850'
const line = '#EAE0CE'
const ink = '#3A3228'
const sub = '#9A8060'

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function FindInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const today = new Date()
  const in3m = new Date(today); in3m.setMonth(in3m.getMonth() + 3)

  const [start, setStart] = useState(iso(today))
  const [end, setEnd] = useState(iso(in3m))
  const [err, setErr] = useState('')

  const preset = (months: number) => {
    const s = new Date()
    const e = new Date(); e.setMonth(e.getMonth() + months)
    setStart(iso(s)); setEnd(iso(e)); setErr('')
  }

  const dayCount = (() => {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0
    return Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  })()

  const goPick = () => {
    if (!start || !end) { setErr('기간을 입력해 주세요.'); return }
    if (dayCount <= 0) { setErr('종료일이 시작일보다 빠를 수 없어요.'); return }
    if (dayCount > 400) { setErr('한 번에 400일까지 볼 수 있어요. 기간을 줄여 주세요.'); return }

    // ⚠️ 결제 관문이 들어올 자리.
    //    결혼택일 find/page.tsx 의 결제 모달을 그대로 참고하면 된다.
    //    price_key = 'moving_pick'

    const q = new URLSearchParams(sp.toString())
    q.set('start', start)
    q.set('end', end)
    router.push(`/manseryeok/moving-timing/pick?${q.toString()}`)
  }

  const field = (label: string, value: string, onChange: (v: string) => void) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, color: sub, marginBottom: 6 }}>{label}</div>
      <input
        type="date"
        value={value}
        onChange={e => { onChange(e.target.value); setErr('') }}
        style={{
          width: '100%', padding: '12px 13px', background: '#FFFDF9',
          border: `1px solid ${line}`, borderRadius: 11, fontSize: 14,
          color: ink, fontFamily: 'inherit', boxSizing: 'border-box',
        }}
      />
    </div>
  )

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
          <div style={{ fontSize: 15, fontWeight: 500, color: ink }}>좋은 날 찾기</div>
          <div style={{ fontSize: 10.5, color: '#7A6440' }}>언제쯤 이사하실 예정인가요?</div>
        </div>
      </div>

      <div style={{ padding: '20px 16px 0' }}>

        <div style={{ fontSize: 13, fontWeight: 700, color: '#7A6440', marginBottom: 11 }}>
          자주 찾으시는 기간
        </div>
        <div style={{ display: 'flex', gap: 7, marginBottom: 20 }}>
          {([[3, '3개월'], [6, '6개월'], [12, '1년']] as const).map(([m, label]) => (
            <button
              key={m}
              onClick={() => preset(m)}
              style={{
                flex: 1, background: '#FFFDF9', border: `1px solid ${line}`,
                borderRadius: 10, padding: '11px 0', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, color: ink, fontWeight: 600,
              }}
            >
              앞으로 {label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: '#7A6440', marginBottom: 11 }}>
          직접 고르기
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          {field('시작일', start, setStart)}
          <span style={{ paddingBottom: 13, color: '#C0AC90' }}>~</span>
          {field('종료일', end, setEnd)}
        </div>

        {dayCount > 0 && (
          <div style={{ fontSize: 12.5, color: sub, marginTop: 11, paddingLeft: 2 }}>
            모두 <b style={{ color: '#7A6440' }}>{dayCount}일</b>을 살펴볼게요.
          </div>
        )}

        {err && (
          <div style={{ fontSize: 12.5, color: '#C0705E', marginTop: 11, paddingLeft: 2 }}>
            {err}
          </div>
        )}

        <button
          onClick={goPick}
          style={{
            width: '100%', marginTop: 26, padding: '15px 0',
            background: accent, color: '#fff', border: 'none', borderRadius: 13,
            fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          좋은 날 찾기
        </button>

        <div style={{
          fontSize: 11.5, color: '#BFAE96', lineHeight: 1.8, marginTop: 16, paddingLeft: 2,
        }}>
          기간이 길수록 고르실 수 있는 날이 많아져요.
          너무 짧으면 남는 날이 없을 수도 있어요.
        </div>
      </div>
    </main>
  )
}

export default function MovingFindPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: sub }}>불러오는 중…</div>}>
      <FindInner />
    </Suspense>
  )
}
