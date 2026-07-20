'use client'
// app/admin/components/AiErrorLog.tsx
// ----------------------------------------------------------------------------
// 관리자 화면 "AI 오류" 탭.
//   AI 호출이 실패했을 때 남긴 기록(ai_error_logs)을 최근 것부터 보여준다.
//   목적은 하나 — 무엇이 왜 멈췄는지 대표님이 여기서 바로 알 수 있게 하는 것.
//
// 2026-07-20 하루에 세 번(물상도·감정기록·통변) "이유 모를 멈춤"이 있었고
// 매번 개발자 도구와 결제 대시보드를 뒤져야 했다. 그 일을 줄이려고 만듦.
// ----------------------------------------------------------------------------
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type ErrRow = {
  id: string
  api_name: string
  status: number | null
  message: string | null
  hint: string | null
  created_at: string
}

// 기능 이름을 우리말로
const API_LABEL: Record<string, string> = {
  'tongbyeon': 'AI 통변',
  'chat-stream': 'AI 상담',
  'daily-fortune': '오늘의 운세',
  'monthly-fortune': '이달의 운세',
  'analyze': 'AI 분석',
  'summarize': '상담 요약',
  'mulsang-image': '물상도 그림',
  'tarot': '타로',
  'naming': '작명',
}

function fmt(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  const mo = d.getMonth() + 1
  const da = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mo}/${da} ${hh}:${mi}`
}

export default function AiErrorLog() {
  const [list, setList] = useState<ErrRow[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true); setFailed(false)
    const { data, error } = await supabase
      .from('ai_error_logs')
      .select('id, api_name, status, message, hint, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) { setFailed(true); setList([]) }
    else setList((data as ErrRow[]) || [])
    setLoading(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#FAC775' }}>AI 오류 기록</div>
          <div style={{ fontSize: 11.5, color: '#b0aec8', marginTop: 3 }}>
            AI가 멈췄을 때 그 이유가 여기 쌓입니다. 최근 100건.
          </div>
        </div>
        <button type="button" onClick={fetchAll}
          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                   background: '#2C2C2A', color: '#e8e2f5', border: '1px solid rgba(255,255,255,0.12)',
                   fontFamily: 'inherit' }}>
          새로고침
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 28, textAlign: 'center', color: '#8a88a0', fontSize: 13 }}>불러오는 중…</div>
      ) : failed ? (
        <div style={{ padding: 20, borderRadius: 10, background: 'rgba(255,100,100,0.08)',
                      border: '1px solid rgba(255,100,100,0.25)', color: '#ff6464', fontSize: 12.5, lineHeight: 1.8 }}>
          기록을 불러오지 못했어요.<br />
          <span style={{ color: '#b0aec8' }}>
            ai_error_logs 표가 아직 없을 수 있어요. _SQL_ai_error_logs.sql 을 한 번 실행해 주세요.
          </span>
        </div>
      ) : list.length === 0 ? (
        <div style={{ padding: 28, textAlign: 'center', borderRadius: 10,
                      background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 13, color: '#81c784', marginBottom: 4 }}>기록된 오류가 없어요</div>
          <div style={{ fontSize: 11.5, color: '#8a88a0' }}>AI가 모두 정상으로 돌고 있다는 뜻이에요.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {list.map((r) => {
            const on = openId === r.id
            return (
              <div key={r.id}
                style={{ borderRadius: 10, background: '#2C2C2A',
                         border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <button type="button" onClick={() => setOpenId(on ? null : r.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                           padding: '11px 13px', background: 'none', border: 'none',
                           cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 11, color: '#8a88a0', width: 62, flexShrink: 0 }}>{fmt(r.created_at)}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#e8e2f5', width: 92, flexShrink: 0 }}>
                    {API_LABEL[r.api_name] || r.api_name}
                  </span>
                  {r.status != null && (
                    <span style={{ fontSize: 10.5, color: '#ff6464', border: '1px solid rgba(255,100,100,0.3)',
                                   borderRadius: 6, padding: '1px 6px', flexShrink: 0 }}>{r.status}</span>
                  )}
                  <span style={{ fontSize: 12, color: '#FAC775', flex: 1, overflow: 'hidden',
                                 textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.hint}</span>
                  <span style={{ fontSize: 11, color: '#8a88a0', flexShrink: 0 }}>{on ? '▾' : '▸'}</span>
                </button>

                {on && (
                  <div style={{ padding: '0 13px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 11, color: '#8a88a0', margin: '10px 0 5px' }}>원문</div>
                    <div style={{ fontSize: 11.5, color: '#b0aec8', lineHeight: 1.7, wordBreak: 'break-all',
                                  background: 'rgba(0,0,0,0.25)', borderRadius: 7, padding: '9px 11px' }}>
                      {r.message || '(내용 없음)'}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
