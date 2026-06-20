'use client'
import { useState, useEffect } from 'react'
import { useStartConsultation } from '@/hooks/useStartConsultation'

function formatPhone(val: string) {
  const n = val.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 3) return n
  if (n.length <= 7) return `${n.slice(0,3)}-${n.slice(3)}`
  return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`
}

type Props = {
  customerPhone: string
  consultantId: string
  gender: string
  calType: string
  yearParam: number
  monthParam: number
  dayParam: number
  hourIdx: number | null
  customerName: string
  onConsultationStarted: (id: string, phone: string) => void
}

export default function ConsultantPhoneStart({
  customerPhone, consultantId, gender, calType,
  yearParam, monthParam, dayParam, hourIdx, customerName,
  onConsultationStarted,
}: Props) {
  const { starting, startConsultation } = useStartConsultation()
  const [phone, setPhone] = useState(customerPhone || '')

  useEffect(() => {
    if (customerPhone) setPhone(customerPhone)
  }, [customerPhone])

  async function handleStart() {
    if (!phone.trim()) {
      alert('고객 전화번호를 입력해주세요.')
      return
    }
    const id = await startConsultation({
      consultantId,
      customerPhone: phone.replace(/\D/g, ''),
      gender, calType, year: yearParam,
      month: monthParam, day: dayParam,
      hour: hourIdx, customerName,
    })
    if (id) onConsultationStarted(id, phone.replace(/\D/g, ''))
  }

  return (
    <div className="rounded-2xl p-4"
      style={{background:'rgba(60,52,137,0.3)', border:'1px solid rgba(250,199,117,0.3)'}}>
      <div className="text-xs font-semibold mb-3" style={{color:'rgba(250,199,117,0.8)'}}>
        📞 전화 고객 상담 시작
      </div>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(formatPhone(e.target.value))}
        placeholder="010-0000-0000"
        maxLength={13}
        className="w-full rounded-xl px-3 py-2.5 text-lg text-center font-bold tracking-widest focus:outline-none mb-3"
        style={{background:'rgba(255,255,255,0.1)', color:'#FAC775', border:'1px solid rgba(255,255,255,0.15)'}}
      />
      <button onClick={handleStart} disabled={starting}
        className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
        style={{background:'linear-gradient(135deg,#FAC775,#f0a030)', color:'#1a1a18'}}>
        {starting ? '등록 중...' : '📋 상담 시작 (채팅 목록에 등록)'}
      </button>
    </div>
  )
}
