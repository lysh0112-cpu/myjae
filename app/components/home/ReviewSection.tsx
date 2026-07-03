'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Review = {
  id: string
  nickname: string
  rating: number
  content: string
  is_pinned: boolean
  created_at: string
}

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

export default function ReviewSection() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, nickname, rating, content, is_pinned, created_at')
        .eq('is_approved', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3)
      if (error) console.error('후기 로딩 오류:', error)
      if (!error && data) setReviews(data as Review[])
      setLoading(false)
    }
    load()
  }, [])

  if (loading || reviews.length === 0) return null

  return (
    <section className="px-4 py-5 pb-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-white">추천 후기</h2>
        <button
          onClick={() => router.push('/manseryeok/reviews')}
          style={{ color: '#FAC775', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          전체보기 →
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl p-4"
            style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ color: '#FAC775', fontSize: '12px', marginBottom: '4px' }}>
              {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
            </div>
            <p className="text-sm font-medium text-white leading-snug">
              {r.content}
            </p>
            <p style={{ color: '#8a88a0', fontSize: '11px', marginTop: '6px' }}>
              {r.nickname} · {timeAgo(r.created_at)}
            </p>
          </div>
        ))}
      </div>
      <button
        onClick={() => router.push('/manseryeok/reviews/write')}
        className="w-full mt-4 py-3 rounded-2xl text-sm font-semibold"
        style={{ border: '1px solid rgba(60,52,137,0.5)', color: '#b0aec8', background: 'rgba(60,52,137,0.1)', cursor: 'pointer' }}>
        + 후기 작성하기
      </button>
    </section>
  )
}
