import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useStartConsultation() {
  const [starting, setStarting] = useState(false)

  async function startConsultation({
    consultantId,
    customerPhone,
    gender,
    calType,
    year,
    month,
    day,
    hour,
    customerName,
  }: {
    consultantId: string
    customerPhone: string
    gender: string
    calType: string
    year: number
    month: number
    day: number
    hour: number | null
    customerName: string
  }) {
    if (!consultantId || !customerPhone) {
      alert('상담사 ID와 고객 전화번호가 필요합니다.')
      return null
    }
    setStarting(true)
    try {
      // 고객 등록
      await supabase
        .from('customers')
        .upsert({ phone: customerPhone }, { onConflict: 'phone' })

      // 상담 등록
      const { data, error } = await supabase
        .from('consultations')
        .insert({
          customer_phone: customerPhone,
          consultant_id: consultantId,
          birth_data: { gender, calType, year: String(year), month: String(month), day: String(day), hour: hour !== null ? String(hour) : '모름', customerName },
          status: 'paid',
          paid_amount: 0,
        })
        .select('id')
        .single()

      if (error) throw error
      return data.id
    } catch (e) {
      alert('상담 시작 중 오류가 발생했습니다.')
      return null
    } finally {
      setStarting(false)
    }
  }

  return { starting, startConsultation }
}
