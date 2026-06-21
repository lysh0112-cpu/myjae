'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { consultants } from './data'
import SummaryBand from './SummaryBand'
import FilterChips from './FilterChips'
import ConsultantCard from './ConsultantCard'

function ConsultantSelectInner() {
  const params = useSearchParams()
  const mode  = params.get('mode')  || 'couple'
  const score = params.get('score') || ''
  const names = params.get('names') || ''

  const [filter, setFilter] = useState('전체')

  const filtered = consultants.filter(c => {
    if (filter === '지금 가능')  return c.available
    if (filter === '부부 전문')  return c.tags.includes('부부 전문')
    if (filter === '커플 채팅')  return c.tags.includes('커플 채팅')
    return true
  }).sort((a, b) => filter === '낮은 가격순' ? a.price - b.price : 0)

  return (
    <main className="min-h-screen bg-[#0d0d1a] pb-10">
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-[#1e1e35]">
        <button onClick={() => history.back()} className="text-[#9d8cff] text-xl">‹</button>
        <span className="text-[16px] text-[#e8e4ff] font-medium">상담사 선택</span>
        <span className="ml-auto bg-[#1a2030] text-[#88aadd] text-[11px] px-3 py-1 rounded-full">
          👫 부부 상담
        </span>
      </div>

      <SummaryBand mode={mode} score={score} names={names} />
      <FilterChips selected={filter} onChange={setFilter} />

      <p className="px-5 pt-4 pb-[10px] text-[11px] text-[#5555aa] tracking-widest uppercase">
        상담사 {filtered.length}명
      </p>

      {filtered.map(c => (
        <ConsultantCard key={c.id} consultant={c} mode={mode} />
      ))}
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
