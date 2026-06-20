import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export function useConsultantState() {
  const searchParams = useSearchParams()

  const [tab, setTab] = useState<'saju' | 'chat'>('saju')
  const [consultationId, setConsultationId] = useState<string | null>(null)
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [selectedConsultation, setSelectedConsultation] = useState<{id:string;customer_phone:string} | null>(null)

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

  const consultantId = searchParams.get('consultantId') || ''

  useEffect(() => {
    setConsultationId(searchParams.get('consultationId') || null)
    setCustomerPhone(searchParams.get('customerPhone') || '')
  }, [])

  function handleFormSubmit(params: Record<string, string>) {
    setGender(params.gender)
    setCalType(params.calType)
    setYearParam(parseInt(params.year))
    setMonthParam(parseInt(params.month))
    setDayParam(parseInt(params.day))
    setHourIdx(params.hour === '모름' ? null : parseInt(params.hour))
    setCustomerName(params.customerName || '')
  }

  function handleSelectConsultation(c: {id:string;customer_phone:string}) {
    setSelectedConsultation(c)
    setConsultationId(c.id)
    setCustomerPhone(c.customer_phone)
  }

  return {
    tab, setTab,
    consultationId, setConsultationId,
    customerPhone, setCustomerPhone,
    customerName,
    selectedConsultation, setSelectedConsultation,
    gender, calType, yearParam, monthParam, dayParam, leapMonth, hourIdx,
    consultantId,
    handleFormSubmit, handleSelectConsultation,
  }
}
