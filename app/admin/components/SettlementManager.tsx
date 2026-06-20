'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Consultant = {
  id: string
  name: string
}

type Consultation = {
  id: string
  consultant_id: string
  paid_amount: number
  status: string
  created_at: string
  customer_phone: string
}

export default function SettlementManager() {
  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [selected, setSelected] = useState<string>('')
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('consultants').select('id, name').then(({ data }) => {
      if (data) setConsultants(data)
    })
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    supabase
      .from('consultations')
      .select('*')
      .eq('consultant_id', selected)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setConsultations(data)
        setLoading(false)
      })
  }, [selected])

  const total = consultations.reduce((sum, c) => sum + (c.paid_amount || 0), 0)

  return (
    <div className="space-y-4">
      {/* 상담사 선택 */}
      <div className="rounded-2xl p-4" style={{background:'rgba(60,52,137,0.3)',border:'1px solid rgba(250,199,117,0.2)'}}>
        <div className="text-sm font-bold mb-3" style={{color:'#FAC775'}}>상담사 선택</div>
        <div className="flex flex-wrap gap-2">
          {consultants.map((c) => (
            <button key={c.id} onClick={() => setSelected(c.id)}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={selected === c.id
                ? {background:'rgba(250,199,117,0.3)',color:'#FAC775',border:'1px solid #FAC775'}
                : {background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.6)',border:'1px solid rgba(255,255,255,0.1)'}}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* 정산 현황 */}
      {selected && (
        <>
          <div className="rounded-2xl p-4" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <div className="text-sm mb-1" style={{color:'rgba(255,255,255,0.5)'}}>누적 수입</div>
            <div className="text-2xl font-bold" style={{color:'#FAC775'}}>
              {total.toLocaleString()}원
            </div>
            <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.3)'}}>
              총 {consultations.length}건
            </div>
          </div>

          {loading && (
            <div className="text-center py-6" style={{color:'#FAC775'}}>불러오는 중...</div>
          )}

          {consultations.map((c) => (
            <div key={c.id} className="rounded-2xl p-4"
              style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-bold text-white">{c.customer_phone}</div>
                  <div className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>
                    {new Date(c.created_at).toLocaleString('ko-KR')}
                  </div>
                </div>
                <div className="text-amber-400 font-bold">
                  {(c.paid_amount || 0).toLocaleString()}원
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
