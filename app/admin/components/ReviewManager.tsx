'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const GOLD = '#FAC775'
const SUB = '#8a88a0'
const LINE = 'rgba(255,255,255,0.08)'
const ROW_LINE = 'rgba(255,255,255,0.06)'

type Review = {
  id: string
  nickname: string
  rating: number
  service_type: string | null
  content: string
  is_approved: boolean
  is_pinned: boolean
  created_at: string
}

type Filter = 'all' | 'pending' | 'approved'

export default function ReviewManager() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('pending')

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    if (!error && data) setReviews(data as Review[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggleApprove = async (r: Review) => {
    const { error } = await supabase.from('reviews').update({ is_approved: !r.is_approved }).eq('id', r.id)
    if (error) { alert('변경 실패'); return }
    load()
  }
  const togglePin = async (r: Review) => {
    const { error } = await supabase.from('reviews').update({ is_pinned: !r.is_pinned }).eq('id', r.id)
    if (error) { alert('변경 실패'); return }
    load()
  }
  const remove = async (r: Review) => {
    if (!confirm(`'${r.nickname}'님의 후기를 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`)) return
    const { error } = await supabase.from('reviews').delete().eq('id', r.id)
    if (error) { alert('삭제 실패'); return }
    load()
  }

  const filtered = reviews.filter((r) => {
    if (filter === 'pending') return !r.is_approved
    if (filter === 'approved') return r.is_approved
    return true
  })

  const pendingCount = reviews.filter((r) => !r.is_approved).length

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'pending', label: `대기 ${pendingCount}` },
    { key: 'approved', label: '노출 중' },
    { key: 'all', label: '전체' },
  ]

  // 엑셀 다운로드 (SheetJS를 동적으로 불러옴)
  const downloadExcel = async () => {
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs' as any)
    const rows = filtered.map((r) => ({
      닉네임: r.nickname,
      별점: r.rating,
      서비스: r.service_type ?? '',
      후기내용: r.content,
      상태: r.is_approved ? '노출 중' : '대기',
      고정: r.is_pinned ? 'O' : '',
      작성일: new Date(r.created_at).toLocaleString('ko-KR'),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '후기목록')
    const today = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `명연재_후기목록_${today}.xlsx`)
  }

  const th: React.CSSProperties = { textAlign: 'left', padding: '12px 14px', fontSize: 13, color: GOLD, fontWeight: 700, whiteSpace: 'nowrap', borderBottom: `1px solid ${LINE}` }
  const td: React.CSSProperties = { padding: '12px 14px', fontSize: 13, color: '#fff', borderBottom: `1px solid ${ROW_LINE}`, verticalAlign: 'top' }

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>📝 후기 관리 <span style={{ color: SUB, fontSize: 14, fontWeight: 400 }}>총 {filtered.length}건</span></h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load}
            style={{ background: 'rgba(255,255,255,0.05)', color: SUB, border: `1px solid ${LINE}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>
            🔄 새로고침
          </button>
          <button onClick={downloadExcel}
            style={{ background: 'rgba(76,175,80,0.2)', color: '#7ec87e', border: '1px solid rgba(76,175,80,0.3)', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            📊 엑셀 다운로드
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={filter === f.key
              ? { background: 'rgba(250,199,117,0.3)', color: GOLD, border: '1px solid rgba(250,199,117,0.4)', borderRadius: 10, padding: '8px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
              : { background: 'rgba(255,255,255,0.05)', color: SUB, border: `1px solid ${LINE}`, borderRadius: 10, padding: '8px 16px', fontSize: 14, cursor: 'pointer' }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: SUB, padding: '30px 0', textAlign: 'center' }}>불러오는 중…</p>}
      {!loading && filtered.length === 0 && <p style={{ color: SUB, padding: '40px 0', textAlign: 'center' }}>해당하는 후기가 없습니다.</p>}

      {/* 표 */}
      {!loading && filtered.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: 14, border: `1px solid ${LINE}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                <th style={th}>상태</th>
                <th style={th}>별점</th>
                <th style={th}>서비스</th>
                <th style={{ ...th, minWidth: 280 }}>후기 내용</th>
                <th style={th}>닉네임</th>
                <th style={th}>작성일</th>
                <th style={{ ...th, textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td style={td}>
                    {r.is_approved
                      ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(120,200,120,0.15)', color: '#7ec87e', whiteSpace: 'nowrap' }}>노출 중</span>
                      : <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,180,80,0.15)', color: '#ffb450', whiteSpace: 'nowrap' }}>대기</span>}
                    {r.is_pinned && <div style={{ marginTop: 4 }}><span style={{ fontSize: 11, color: GOLD }}>📌 고정</span></div>}
                  </td>
                  <td style={{ ...td, color: GOLD, whiteSpace: 'nowrap' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</td>
                  <td style={{ ...td, color: SUB, whiteSpace: 'nowrap' }}>{r.service_type ?? '-'}</td>
                  <td style={{ ...td, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{r.content}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.nickname}</td>
                  <td style={{ ...td, color: SUB, whiteSpace: 'nowrap', fontSize: 12 }}>{new Date(r.created_at).toLocaleString('ko-KR')}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button onClick={() => toggleApprove(r)} title={r.is_approved ? '숨기기' : '승인'}
                        style={{ background: r.is_approved ? 'rgba(255,255,255,0.05)' : 'rgba(120,200,120,0.2)', color: r.is_approved ? SUB : '#7ec87e', border: `1px solid ${LINE}`, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {r.is_approved ? '↩숨김' : '✓승인'}
                      </button>
                      <button onClick={() => togglePin(r)} title={r.is_pinned ? '고정해제' : '고정'}
                        style={{ background: r.is_pinned ? 'rgba(250,199,117,0.2)' : 'rgba(255,255,255,0.05)', color: r.is_pinned ? GOLD : SUB, border: `1px solid ${LINE}`, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        📌
                      </button>
                      <button onClick={() => remove(r)} title="삭제"
                        style={{ background: 'rgba(255,80,80,0.12)', color: '#ff8080', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
