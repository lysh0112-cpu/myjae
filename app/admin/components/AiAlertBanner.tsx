'use client'
// app/admin/components/AiAlertBanner.tsx
//
// 🔴 ★2026-09-11 (6부) [대표님 「알림은 여기서 해결해 줘야지」] — 관리자 화면 맨 위 빨간 띠 (검사 48)
//   최근 24시간 AI 오류 기록 가운데 «대표님이 곧바로 아셔야 할 일» 이 있으면 띄웁니다.
//     잔액 부족 · 월 지출 한도 도달 · 열쇠 오류 · 과속 방지턱에 걸림
//   [겪음] 9월 11일 — 대표님은 «풀이가 안 나온다» 는 것을 보고서야 잔액 · 한도 문제를 아셨습니다.
//   ⚠️ 분류는 lib/ai/alertKind.ts 하나로 (메일 알림과 같은 분류) · 기록이 없거나 못 읽으면 아무것도 안 그립니다.

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { alertKindOf, ALERT_TEXT, type AlertKind } from '@/lib/ai/alertKind'

type Row = { api_name: string; status: number | null; message: string; created_at: string }
type Hit = { kind: AlertKind; count: number; last: string; api: string }

const ORDER: AlertKind[] = ['billing', 'limit', 'key', 'bump']

export default function AiAlertBanner() {
  const [hits, setHits] = useState<Hit[]>([])
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let alive = true
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    supabase.from('ai_error_logs')
      .select('api_name, status, message, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data, error }) => {
        if (!alive || error || !data) return
        const by = new Map<AlertKind, Hit>()
        for (const r of data as Row[]) {
          const kind = alertKindOf(r.api_name || '', r.status, r.message || '')
          if (!kind) continue
          const h = by.get(kind)
          if (h) h.count++
          else by.set(kind, { kind, count: 1, last: r.created_at, api: r.api_name })
        }
        setHits(ORDER.filter(k => by.has(k)).map(k => by.get(k)!))
      })
    return () => { alive = false }
  }, [])

  if (!hits.length || hidden) return null
  return (
    <div style={{ background: '#5c1d1d', borderBottom: '1px solid #b54848', padding: '12px 24px' }}>
      <div className="max-w-7xl mx-auto" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {hits.map(h => (
            <div key={h.kind} style={{ marginBottom: 6 }}>
              <div style={{ color: '#ffd9d9', fontWeight: 700, fontSize: 14 }}>
                🔴 {ALERT_TEXT[h.kind].title}
              </div>
              <div style={{ color: '#f3b8b8', fontSize: 12.5, marginTop: 2 }}>
                최근 24시간 {h.count}건 · 마지막 {new Date(h.last).toLocaleString('ko-KR')} · 창구 {h.api}
              </div>
              <div style={{ color: '#fff', fontSize: 12.5, marginTop: 2 }}>할 일 — {ALERT_TEXT[h.kind].todo}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setHidden(true)}
          style={{ background: 'transparent', border: '1px solid #f3b8b8', color: '#f3b8b8', borderRadius: 8,
            padding: '4px 10px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          확인했어요
        </button>
      </div>
    </div>
  )
}
