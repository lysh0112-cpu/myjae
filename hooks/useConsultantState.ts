import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
export function useConsultantState() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'saju' | 'chat'>('saju')
  const [consultationId, setConsultationId] = useState<string | null>(null)
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [selectedConsultation, setSelectedConsultation] = useState<{id:string;customer_phone:string;user_id?:string|null} | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [gender, setGender] = useState(searchParams.get('gender') || '')
  const [calType, setCalType] = useState(searchParams.get('calType') || '')
  const [yearParam, setYearParam] = useState(parseInt(searchParams.get('year') || '0'))
  const [monthParam, setMonthParam] = useState(parseInt(searchParams.get('month') || '0'))
  const [dayParam, setDayParam] = useState(parseInt(searchParams.get('day') || '0'))
  const [leapMonth] = useState(searchParams.get('leapMonth') || '0')
  const [hourIdx, setHourIdx] = useState<number | null>(() => {
    const h = searchParams.get('hour')
    return h === '모름' || h === null ? null : parseInt(h)
  })
  // consultantId: URL에 있으면 사용, 없으면 로그인 계정에서 자동으로 찾아옴
  const [consultantId, setConsultantId] = useState(searchParams.get('consultantId') || '')
  useEffect(() => {
    // URL에 consultantId가 이미 있으면 그대로 사용 (기존 동작 유지)
    if (searchParams.get('consultantId')) return
    // URL에 없으면 → 로그인한 사람의 profiles.consultant_id를 가져옴
    async function loadMyConsultantId() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('consultant_id')
        .eq('id', user.id)
        .single()
      if (data?.consultant_id) {
        setConsultantId(data.consultant_id)
      }
    }
    loadMyConsultantId()
  }, [])
  useEffect(() => {
    setConsultationId(searchParams.get('consultationId') || null)
    setCustomerPhone(searchParams.get('customerPhone') || '')
  }, [])
  // consultationId 연결되면 birth_data 자동 조회
  useEffect(() => {
    if (!consultationId) return
    async function loadBirthData() {
      const { data } = await supabase
        .from('consultations')
        .select('birth_data, customer_phone, user_id')
        .eq('id', consultationId)
        .single()
      if (!data) return
      const b = data.birth_data
      if (b) {
        setGender(b.gender || '')
        setCalType(b.calType || '양력')
        setYearParam(parseInt(b.year || '0'))
        setMonthParam(parseInt(b.month || '0'))
        setDayParam(parseInt(b.day || '0'))
        setHourIdx(b.hour === '모름' || !b.hour ? null : parseInt(b.hour))
        setCustomerName(b.customerName || '') // ← 이름도 자동 로드
      }
      if (data.customer_phone) setCustomerPhone(data.customer_phone)
      if (data.user_id) setSelectedUserId(data.user_id)  // ← user_id도 자동 로드
    }
    loadBirthData()
  }, [consultationId])
  function handleFormSubmit(params: Record<string, string>) {
    setGender(params.gender)
    setCalType(params.calType)
    setYearParam(parseInt(params.year))
    setMonthParam(parseInt(params.month))
    setDayParam(parseInt(params.day))
    setHourIdx(params.hour === '모름' ? null : parseInt(params.hour))
    setCustomerName(params.customerName || '')
  }
  function handleSelectConsultation(c: {id:string;customer_phone:string;user_id?:string|null}) {
    setSelectedConsultation(c)
    setConsultationId(c.id)
    setCustomerPhone(c.customer_phone)
    setSelectedUserId(c.user_id ?? null)   // ← 선택한 고객의 user_id 저장
  }
  return {
    tab, setTab,
    consultationId, setConsultationId,
    customerPhone, setCustomerPhone,
    customerName, setCustomerName,
    selectedConsultation, setSelectedConsultation,
    selectedUserId,
    gender, calType, yearParam, monthParam, dayParam, leapMonth, hourIdx,
    consultantId,
    handleFormSubmit, handleSelectConsultation,
  }
}
