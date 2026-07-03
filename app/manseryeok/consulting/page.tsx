'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ContactStep from './components/ContactStep'
import PaymentStep from './components/PaymentStep'
import ScheduleStep from './components/ScheduleStep'
import ChatRoom from './components/ChatRoom'

type Consultant = {
  id: string
  name: string
  specialty: string
  price: number
  active: boolean
}

type Step = 'phone' | 'pay' | 'schedule' | 'chat'

function ConsultingContent() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('phone')
  const [selected, setSelected] = useState<Consultant | null>(null)
  const [phone, setPhone] = useState('')
  const [consultationId, setConsultationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [payMethod, setPayMethod] = useState<string>('계좌이체')

  // 마이페이지에서 "채팅 입장"으로 들어올 때: 기존 상담 건 id
  const enterConsultationId = searchParams.get('consultationId') ?? ''
  // consultationId로 들어온 경우, 정보를 다 불러올 때까지 화면을 가려서 깜빡임 방지
  const [entering, setEntering] = useState(!!enterConsultationId)

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
    if (enterConsultationId) return // 채팅 입장 모드에서는 아래 useEffect가 처리
    if (consultantId && consultantName && consultantPrice) {
      setSelected({
        id: consultantId,
        name: consultantName,
        specialty: '',
        price: consultantPrice,
        active: true,
      })
    }
  }, [consultantId, consultantName, consultantPrice, enterConsultationId])

  // consultationId를 URL로 받으면 → 그 상담 건 정보를 불러와 바로 채팅 단계로
  useEffect(() => {
    if (!enterConsultationId) return
    let cancelled = false
    ;(async () => {
      const { data: c } = await supabase
        .from('consultations')
        .select('id, customer_phone, consultant_id')
        .eq('id', enterConsultationId)
        .single()
      if (cancelled) return
      if (!c) { setEntering(false); return }
      let cname = ''
      if (c.consultant_id) {
        const { data: con } = await supabase
          .from('consultants').select('name').eq('id', c.consultant_id).single()
        cname = con?.name ?? ''
      }
      if (cancelled) return
      setSelected({ id: c.consultant_id ?? '', name: cname, specialty: '', price: 0, active: true })
      setPhone(c.customer_phone ?? '')
      setConsultationId(c.id)
      setStep('chat')
      setEntering(false)
    })()
    return () => { cancelled = true }
  }, [enterConsultationId])

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

      const { data: u } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('consultations')
        .insert({
          customer_phone: phone.replace(/\D/g, ''),
          consultant_id: selected.id,
          birth_data: birthData,
          status: 'pending',
          user_id: u?.user?.id ?? null,
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

    // 고객이 사주 화면에서 본 해설을 무료·유료 각각 그대로 저장
    const aiFree = sessionStorage.getItem('ai_free_analysis') || ''
    const aiPaid = sessionStorage.getItem('ai_analysis') || ''

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
        ai_analysis: aiPaid,        // 유료 상세 풀이
        ai_free_analysis: aiFree,   // 무료 기본 풀이
      })
      .eq('id', consultationId)

    sessionStorage.removeItem('ai_analysis')
    sessionStorage.removeItem('ai_free_analysis')

    setStep('schedule')
  }

  // 채팅 입장 모드: 정보 불러오는 동안 로딩만 보여줌 (중간 화면 깜빡임 방지)
  if (entering) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-amber-400">채팅방을 여는 중...</div>
      </div>
    )
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

  if (step === 'schedule') return (
    <ScheduleStep
      consultantId={selected?.id ?? ''}
      consultantName={selected?.name ?? ''}
      consultationId={consultationId!}
      customerPhone={phone}
      onComplete={() => setStep('chat')}
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
