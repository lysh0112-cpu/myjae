'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Consultation = {
  id: string
  customer_phone: string
  status: string
  created_at: string
  birth_data: {
    year: string
    month: string
    day: string
    gender: string
  }
}

export default function ConsultationList({
  consultantId,
  onSelect,
}: {
  consultantId: string
  onSelect: (c: Consultation) => void
}) {
  const [list, setList] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!consultantId) { setLoading(false); return }
    fetchList()
  }, [consultantId])

  async function fetchList() {
    const { data } = await supabase
      .from('consultations')
      .select('*')
      .eq('consultant_id', consultantId)
      .in('status', ['paid', 'in_progress'])
      .order('created_at', { ascending: false })
    if (data) setList(data)
    setLoading(false)
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('이 상담을 목록에서 삭제할까요?')) return
    await supabase
      .from('consultations')
      .update({ status: 'closed' })
      .eq('id', id)
    setList(prev => prev.filter(c => c.id !== id))
  }

  if (!consultantId) return (
    <div className="text-center py-10 text-sm" style={{color:'rgba(255,255,255,0.4)'}}>
      상담사 ID가 없습니다
    </div>
  )

  if (loading) return (
    <div className="text-center py-10" style={{color:'#FAC775'}}>불러오는 중...</div>
  )

  if (list.length === 0) return (
    <div className="text-center py-10 text-sm" style={{color:'rgba(255,255,255,0.4)'}}>
      대기 중인 상담이 없습니다
    </div>
  )

  return (
    <div className="space-y-3">
      {list.map((c) => (
        <div key={c.id} onClick={() => onSelect(c)}
          className="rounded-2xl p-4 cursor-pointer active:scale-95 transition-all"
          style={{background:'rgba(60,52,137,0.3)', border:'1px solid rgba(250,199,117,0.2)'}}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-white">{c.customer_phone}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: c.status === 'paid' ? 'rgba(250,199,117,0.2)' : 'rgba(76,175,80,0.2)',
                  color: c.status === 'paid' ? '#FAC775' : '#4caf50',
                }}>
                {c.status === 'paid' ? '대기중' : '진행중'}
              </span>
              <button
                onClick={(e) => handleDelete(c.id, e)}
                className="text-xs px-2 py-0.5 rounded-full transition-all"
                style={{background:'rgba(255,80,80,0.15)', color:'rgba(255,120,120,0.8)'}}>
                삭제
              </button>
            </div>
          </div>
          <div className="text-sm" style={{color:'rgba(255,255,255,0.5)'}}>
            {c.birth_data?.year}.{c.birth_data?.month}.{c.birth_data?.day}
            &nbsp;{c.birth_data?.gender}
          </div>
          <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.3)'}}>
            {new Date(c.created_at).toLocaleString('ko-KR')}
          </div>
        </div>
      ))}
    </div>
  )
}
