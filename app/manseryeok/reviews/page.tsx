'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#FAC775'
const BG = '#1C1C1A'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'

type Review = {
  id: string
  nickname: string
  rating: number
  service_type: string | null
  content: string
  is_pinned: boolean
  created_at: string
}

// 작성 시각을 'n시간 전' 형태로
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  return new Date(iso).toLocaleDateString('ko-KR')
}

export default function ReviewListPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      // 승인된 후기만 (RLS 정책상 어차피 승인된 것만 읽힘)
      // 고정(is_pinned) 먼저, 그다음 최신순
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (!error && data) setReviews(data as Review[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', padding: '24px 20px 100px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ color: GOLD, fontSize: 22, fontWeight: 800 }}>추천 후기</h1>
          <button
            onClick={() => router.push('/manseryeok/reviews/write')}
            style={{ background: GOLD, color: '#000', border: 'none', borderRadius: 12, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            + 후기 작성
          </button>
        </div>

        {/* 로딩 */}
        {loading && (
          <p style={{ color: SUB, textAlign: 'center', padding: '40px 0' }}>후기를 불러오는 중…</p>
        )}

        {/* 후기 없음 */}
        {!loading && reviews.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: SUB }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <p style={{ fontSize: 15, lineHeight: 1.6 }}>
              아직 등록된 후기가 없어요.<br />
              첫 번째 후기를 남겨주세요!
            </p>
          </div>
        )}

        {/* 후기 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ background: CARD, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ color: GOLD, fontSize: 13 }}>
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                </span>
                {r.is_pinned && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(250,199,117,0.15)', color: GOLD }}>
                    📌 고정
                  </span>
                )}
                {r.service_type && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', color: SUB }}>
                    {r.service_type}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: '#fff', whiteSpace: 'pre-wrap' }}>{r.content}</p>
              <p style={{ color: SUB, fontSize: 12, marginTop: 8 }}>
                {r.nickname} · {timeAgo(r.created_at)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
