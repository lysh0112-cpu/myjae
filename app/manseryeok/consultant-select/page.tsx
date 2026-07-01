'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Consultant } from './data'
import SummaryBand from './SummaryBand'
import FilterChips from './FilterChips'
import ConsultantCard from './ConsultantCard'

function ConsultantSelectInner() {
  const params = useSearchParams()
  const router = useRouter()
  const mode  = params.get('mode')  || 'couple'
  const score = params.get('score') || ''
  const names = params.get('names') || ''
  const [filter, setFilter] = useState('전체')
  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [loading, setLoading] = useState(true)

  // 실제 DB에서 활성 상담사 불러오기
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('consultants')
        .select('id, name, specialty, price, active')
        .eq('active', true)
        .order('created_at')
      const rows = (data ?? []).map((c: any): Consultant => ({
        id: c.id,
        name: c.name,
        spec: c.specialty || '명리 상담',
        tags: [],
        available: true,
        featured: false,
        rating: 0,
        count: 0,
        reRate: 0,
        review: '',
        reviewDate: '',
        price: c.price || 0,
        priceSub: '채팅 상담',
      }))
      setConsultants(rows)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = consultants.filter(c => {
    if (filter === '지금 가능')  return c.available
    if (filter === '부부 전문')  return c.tags.includes('부부 전문')
    if (filter === '커플 채팅')  return c.tags.includes('커플 채팅')
    return true
  }).sort((a, b) => filter === '낮은 가격순' ? a.price - b.price : 0)

  const modeLabel: Record<string, string> = {
    couple: '💑 연인 궁합',
    prewedding: '💍 예비 신혼',
    married: '👫 부부 상담',
    birth: '👶 출산 시기',
    personal: '🔮 개인 상담',
  }

  return (
    <main className="min-h-screen bg-[#0d0d1a] pb-10">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[#1e1e35] sticky top-0 bg-[#0d0d1a] z-10">
        <button onClick={() => router.back()}
          className="text-[#9d8cff] text-xl w-8 h-8 flex items-center justify-center">
          ‹
        </button>
        <span className="text-[15px] text-[#e8e4ff] font-medium">상담사 선택</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => router.back()}
            style={{
              fontSize:'11px', padding:'4px 10px', borderRadius:'20px',
              background:'rgba(60,52,137,0.3)', color:'#b8a9ff',
              border:'1px solid rgba(119,102,221,0.3)',
            }}>
            ← AI 채팅
          </button>
          <span style={{
            background:'#1a2030', color:'#88aadd',
            fontSize:'11px', padding:'4px 12px', borderRadius:'20px',
          }}>
            {modeLabel[mode] || '👫 부부 상담'}
          </span>
        </div>
      </div>

      <SummaryBand mode={mode} score={score} names={names} />
      <FilterChips selected={filter} onChange={setFilter} />

      <p className="px-5 pt-4 pb-[10px] text-[11px] text-[#5555aa] tracking-widest uppercase">
        상담사 {filtered.length}명
      </p>

      {loading ? (
        <p className="px-5 text-[13px] text-[#5555aa]">상담사를 불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <p className="px-5 text-[13px] text-[#5555aa]">현재 상담 가능한 상담사가 없습니다.</p>
      ) : (
        filtered.map(c => (
          <ConsultantCard key={c.id} consultant={c} mode={mode} />
        ))
      )}

      {/* 하단 — AI 채팅으로 돌아가기 */}
      <div style={{padding:'20px 16px 10px', textAlign:'center'}}>
        <button
          onClick={() => router.back()}
          style={{
            fontSize:'13px', padding:'12px 24px', borderRadius:'20px',
            background:'rgba(60,52,137,0.2)', color:'#9977cc',
            border:'1px solid rgba(119,102,221,0.3)', cursor:'pointer',
          }}>
          ← AI 채팅으로 돌아가기
        </button>
      </div>
    </main>
  )
}

export default function ConsultantSelectPage() {
  return (
    <Suspense>
      <ConsultantSelectInner />
    </Suspense>
  )
}
