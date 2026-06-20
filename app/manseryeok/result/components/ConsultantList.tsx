'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Consultant = {
  id: string
  name: string
  specialty: string
  price: number
}

export default function ConsultantList({ searchParams }: { searchParams: URLSearchParams }) {
  const router = useRouter()
  const [consultants, setConsultants] = useState<Consultant[]>([])

  useEffect(() => {
    supabase
      .from('consultants')
      .select('id, name, specialty, price')
      .eq('active', true)
      .order('name')
      .then(({ data }) => { if (data) setConsultants(data) })
  }, [])

  function handleSelect(consultant: Consultant) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('consultantId', consultant.id)
    params.set('consultantName', consultant.name)
    params.set('consultantPrice', String(consultant.price))
    router.push(`/manseryeok/consulting?${params.toString()}`)
  }

  if (consultants.length === 0) return null

  return (
    <div className="rounded-2xl p-5" style={{background:"#2C2C2A",border:"1px solid rgba(250,199,117,0.15)"}}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🔮</span>
        <h2 className="text-base font-bold text-white">전문 상담사와 상담하기</h2>
      </div>
      <p className="text-xs mb-4" style={{color:"#8a88a0"}}>
        AI 분석이 더 궁금하신가요? 전문 상담사와 1:1 상담을 받아보세요
      </p>
      <div className="space-y-3">
        {consultants.map((c) => (
          <button
            key={c.id}
            onClick={() => handleSelect(c)}
            className="w-full text-left rounded-xl p-4 transition-all"
            style={{background:"rgba(60,52,137,0.2)",border:"1px solid rgba(60,52,137,0.3)"}}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-white">{c.name}</div>
                <div className="text-xs mt-0.5" style={{color:"#8a88a0"}}>{c.specialty}</div>
              </div>
              <div>
                <div className="text-amber-400 font-bold">{c.price.toLocaleString()}원</div>
                <div className="text-xs mt-1 text-right px-3 py-1 rounded-full"
                  style={{background:"rgba(250,199,117,0.15)",color:"#FAC775"}}>
                  상담 신청 →
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
