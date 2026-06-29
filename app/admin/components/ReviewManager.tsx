'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'
const LINE = 'rgba(255,255,255,0.08)'

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
      .order('created_at', { ascending: false })
    if (!error && data) setReviews(data as Review[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // 승인 토글
  const toggleApprove = async (r: Review) => {
    const { error } = await supabase
      .from('reviews')
      .update({ is_approved: !r.is_approved })
      .eq('id', r.id)
    if (error) { alert('변경 실패'); return }
    load()
  }

  // 고정 토글
  const togglePin = async (r: Review) => {
    const { error } = await supabase
      .from('reviews')
      .update({ is_pinned: !r.is_pinned })
      .eq('id', r.id)
    if (error) { alert('변경 실패'); return }
    load()
  }

  // 삭제
  const remove = async (r: Review) => {
    if (!confirm(`'${r.nickname}'님의 후기를 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`)) return
    const { error } = await supabase.from('reviews').delete().eq('id', r.id)
    if (error) { alert('삭제 실패'); return }
    load()
  }

  // 필터링
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>📝 후기 관리</h2>
        <button onClick={load}
          style={{ background: 'rgba(255,255,255,0.05)', color: SUB, border: `1px solid ${LINE}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>
          🔄 새로고침
        </button>
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
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

      {!loading && filtered.length === 0 && (
        <p style={{ color: SUB, padding: '40px 0', textAlign: 'center' }}>해당하는 후기가 없습니다.</p>
      )}

      {/* 후기 카드 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((r) => (
          <div key={r.id} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 16 }}>
            {/* 상단: 별점·상태·서비스 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ color: GOLD, fontSize: 14 }}>
                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
              </span>
              {/* 상태 배지 */}
              {r.is_approved
                ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(120,200,120,0.15)', color: '#7ec87e' }}>노출 중</span>
                : <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,180,80,0.15)', color: '#ffb450' }}>대기</span>}
              {r.is_pinned && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(250,199,117,0.15)', color: GOLD }}>📌 고정</span>}
              {r.service_type && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', color: SUB }}>{r.service_type}</span>}
            </div>

            {/* 내용 */}
            <p style={{ color: '#fff', fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{r.content}</p>
            <p style={{ color: SUB, fontSize: 12, marginBottom: 14 }}>
              {r.nickname} · {new Date(r.created_at).toLocaleString('ko-KR')}
            </p>

            {/* 버튼들 */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => toggleApprove(r)}
                style={{ background: r.is_approved ? 'rgba(255,255,255,0.05)' : 'rgba(120,200,120,0.2)', color: r.is_approved ? SUB : '#7ec87e', border: `1px solid ${LINE}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {r.is_approved ? '↩ 숨기기' : '✓ 승인(노출)'}
              </button>
              <button onClick={() => togglePin(r)}
                style={{ background: r.is_pinned ? 'rgba(250,199,117,0.2)' : 'rgba(255,255,255,0.05)', color: r.is_pinned ? GOLD : SUB, border: `1px solid ${LINE}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {r.is_pinned ? '📌 고정 해제' : '📌 상단 고정'}
              </button>
              <button onClick={() => remove(r)}
                style={{ background: 'rgba(255,80,80,0.12)', color: '#ff8080', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                🗑 삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
