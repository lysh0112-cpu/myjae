'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Consultation = {
  id: string
  customer_phone: string
  consultant_id: string
  paid_amount: number
  status: string
  created_at: string
  birth_data: {
    year: string
    month: string
    day: string
    gender: string
    calType: string
  }
}

type Consultant = {
  id: string
  name: string
}

export default function ConsultationHistory() {
  const [list, setList] = useState<Consultation[]>([])
  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [{ data: cons }, { data: conss }] = await Promise.all([
      supabase.from('consultations').select('*').order('created_at', { ascending: false }),
      supabase.from('consultants').select('id, name'),
    ])
    if (cons) setList(cons)
    if (conss) setConsultants(conss)
    setLoading(false)
  }

  function getConsultantName(id: string) {
    return consultants.find((c) => c.id === id)?.name ?? '알 수 없음'
  }

  if (loading) return (
    <div className="text-center py-10" style={{color:'#FAC775'}}>불러오는 중...</div>
  )

  return (
    <div className="space-y-3">
      {list.length === 0 && (
        <div className="text-center py-10 text-sm" style={{color:'rgba(255,255,255,0.4)'}}>
          상담 내역이 없습니다
        </div>
      )}
      {list.map((c) => (
        <div key={c.id}>
          <div
            onClick={() => setSelected(selected === c.id ? null : c.id)}
            className="rounded-2xl p-4 cursor-pointer"
            style={{background:'rgba(255,255,255,0.04)',border:`1px solid ${selected === c.id ? 'rgba(250,199,117,0.4)' : 'rgba(255,255,255,0.08)'}`}}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-white text-sm">{c.customer_phone}</span>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: c.status === 'paid' ? 'rgba(250,199,117,0.2)' : 'rgba(76,175,80,0.2)',
                  color: c.status === 'paid' ? '#FAC775' : '#4caf50'
                }}>
                {c.status === 'paid' ? '결제완료' : c.status === 'in_progress' ? '진행중' : c.status}
              </span>
            </div>
            <div className="text-xs space-y-0.5" style={{color:'rgba(255,255,255,0.4)'}}>
              <div>상담사: {getConsultantName(c.consultant_id)}</div>
              <div>
                {c.birth_data?.calType} {c.birth_data?.year}.{c.birth_data?.month}.{c.birth_data?.day} {c.birth_data?.gender}
              </div>
              <div className="flex justify-between">
                <span>{new Date(c.created_at).toLocaleString('ko-KR')}</span>
                <span style={{color:'#FAC775'}}>{(c.paid_amount || 0).toLocaleString()}원</span>
              </div>
            </div>
          </div>

          {/* 상세보기 */}
          {selected === c.id && (
            <div className="mt-1 rounded-2xl p-4"
              style={{background:'rgba(60,52,137,0.2)',border:'1px solid rgba(250,199,117,0.15)'}}>
              <div className="text-xs font-bold mb-2" style={{color:'#FAC775'}}>상담 ID</div>
              <div className="text-xs break-all" style={{color:'rgba(255,255,255,0.4)'}}>{c.id}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
