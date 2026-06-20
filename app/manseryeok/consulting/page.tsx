'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ContactStep from './components/ContactStep'
import PaymentStep from './components/PaymentStep'
import ChatRoom from './components/ChatRoom'

type Consultant = {
  id: string
  name: string
  specialty: string
  price: number
  active: boolean
}

type Step = 'phone' | 'pay' | 'chat'

function ConsultingContent() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('phone')
  const [selected, setSelected] = useState<Consultant | null>(null)
  const [phone, setPhone] = useState('')
  const [consultationId, setConsultationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [payMethod, setPayMethod] = useState<string>('계좌이체')

  const gender = searchParams.get('gender') ?? ''
  const calType = searchParams.get('calType') ?? '양력'
  const year = searchParams.get('year') ?? ''
  const month = searchParams.get('month') ?? ''
  const day = searchParams.get('day') ?? ''
  const hour = searchParams.get('hour') ?? ''
  const consultantId = searchParams.get('consultantId') ?? ''
  const consultantName = searchParams.get('consultantName') ?? ''
  const consultantPrice = parseInt(searchParams.get('consultantPrice') ?? '0')
  const birthData = { gender, calType, year, month, day, hour }

  useEffect(() => {
    if (consultantId && consultantName && consultantPrice) {
      setSelected({
        id: consultantId,
        name: consultantName,
        specialty: '',
        price: consultantPrice,
        active: true,
      })
    }
  }, [consultantId, consultantName, consultantPrice])

  async function handlePhoneSubmit() {
    if (phone.replace(/\D/g, '').length < 10) {
      setError('올바른 핸드폰 번호를 입력해주세요')
      return
    }
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      await supabase
        .from('customers')
        .upsert({ phone: phone.replace(/\D/g, '') }, { onConflict: 'phone' })

      const { data, error } = await supabase
        .from('consultations')
        .insert({
          customer_phone: phone.replace(/\D/g, ''),
          consultant_id: selected.id,
          birth_data: birthData,
          status: 'pending'
        })
        .select('id')
        .single()

      if (error) throw error
      setConsultationId(data.id)
      setStep('pay')
    } catch {
      setError('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePayComplete() {
    if (!consultationId || !selected) return

    // sessionStorage에서 AI 분석 결과 가져오기
    const aiAnalysis = sessionStorage.getItem('ai_analysis') ||
                       sessionStorage.getItem('ai_free_analysis') || ''

    await supabase
      .from('payments')
      .insert({
        consultation_id: consultationId,
        amount: selected.price,
        method: payMethod,
        status: 'done'
      })

    await supabase
      .from('consultations')
      .update({
        status: 'paid',
        paid_amount: selected.price,
        ai_analysis: aiAnalysis, // AI 분석 결과 저장
      })
      .eq('id', consultationId)

    // 저장 후 sessionStorage 정리
    sessionStorage.removeItem('ai_analysis')
    sessionStorage.removeItem('ai_free_analysis')

    setStep('chat')
  }

  if (step === 'phone') return (
    <ContactStep
      selected={selected}
      phone={phone}
      setPhone={setPhone}
      onSubmit={handlePhoneSubmit}
      loading={loading}
      error={error}
    />
  )

  if (step === 'pay') return (
    <PaymentStep
      selected={selected}
      phone={phone}
      payMethod={payMethod}
      setPayMethod={setPayMethod}
      onBack={() => setStep('phone')}
      onComplete={handlePayComplete}
    />
  )

  if (step === 'chat') return (
    <ChatRoom
      consultationId={consultationId!}
      consultantName={selected?.name ?? ''}
      customerPhone={phone}
    />
  )

  return null
}

export default function ConsultingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-amber-400">로딩중...</div>
      </div>
    }>
      <ConsultingContent />
    </Suspense>
  )
}
