// app/manseryeok/consultant-select/page.tsx
'use client'

import { useSearchParams } from 'next/navigation'
import SummaryBand from '@/components/consultant-select/SummaryBand'
import FilterChips from '@/components/consultant-select/FilterChips'
import ConsultantCard from '@/components/consultant-select/ConsultantCard'
import { consultants } from '@/lib/consultant-select/data'
import { useState } from 'react'

export default function ConsultantSelectPage() {
  const params = useSearchParams()
  const mode = params.get('mode') || 'couple' // couple | married | prewedding
  const score = params.get('score') || ''
  const names = params.get('names') || ''

  const [filter, setFilter] = useState('전체')

  const filtered = filter === '전체'
    ? consultants
    : filter === '지금 가능'
    ? consultants.filter(c => c.available)
    : filter === '부부 전문'
    ? consultants.filter(c => c.tags.includes('부부 전문'))
    : consultants

  return (
    <main className="theme-dark min-h-screen pb-10">
      <SummaryBand mode={mode} score={score} names={names} />
      <FilterChips selected={filter} onChange={setFilter} />
      <p className="list-label">상담사 {filtered.length}명</p>
      {filtered.map(c => (
        <ConsultantCard key={c.id} consultant={c} mode={mode} />
      ))}
    </main>
  )
}
