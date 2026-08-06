import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
export function useConsultantState() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'saju' | 'chat'>('saju')
  const [consultationId, setConsultationId] = useState<string | null>(null)
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  /**
   * ★2026-08-05 (47부 36차) — birth_data · customer_name 을 «함께» 담습니다. [대표님 지시]
   *   [까닭]  만세력 창이 고른 고객의 사주를 바로 그리려면 «생년월일» 이 필요합니다.
   *     전에는 id · customer_phone · user_id 만 담아
   *     ★상담사가 생년월일을 «손으로 다시» 쳐야 했습니다.
   *   ⚠️ birth_data 는 상담 신청 때 담긴 값입니다 (consultant-select).
   *      hour 는 ★숫자 문자열 또는 '모름'.
   *   ⚠️ 전부 «있을 수도 없을 수도» 있어 물음표를 붙였습니다. 옛 기록에는 없을 수 있습니다.
   */
  const [selectedConsultation, setSelectedConsultation] = useState<{
    id: string
    customer_phone: string
    user_id?: string | null
    customer_name?: string
    birth_data?: {
      year?: string; month?: string; day?: string
      gender?: string; hour?: string; calType?: string; leapMonth?: string
      customerName?: string
    }
  } | null>(null)
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
  //
  // ══════════════════════════════════════════════════════════════════════
  // ★2026-08-05 (47부) — 주소를 «매번 다시 읽도록» 고쳤습니다.
  //
  //   [겪은 일]  대표님 — 「상담사를 클릭하면 해당 상담사 화면으로 들어가질 못하네」
  //     매니저가 「어느 상담사의 화면을 볼까요?」에서 이름을 눌러도
  //     ★주소는 ?consultantId=… 로 «바뀌는데» 화면은 고르기 그대로였습니다.
  //
  //   [까닭]  전에는 이랬습니다 —
  //       const [consultantId, setConsultantId] = useState(searchParams.get('consultantId') || '')
  //     ★useState 의 초기값은 «처음 붙을 때 한 번» 만 읽힙니다.
  //     상담사를 누르면 router.push 로 «같은 주소» 에 물음표만 붙여 갑니다.
  //     ⇒ Next 는 화면을 다시 그리기만 하고 ★«새로 붙이지 않습니다».
  //     ⇒ searchParams 는 바뀌는데 consultantId 상태는 '' 그대로였습니다.
  //     ⇒ page.tsx 의  isMaster && !consultantId  가 계속 참 → 고르기 화면에 갇혔습니다.
  //     아래 useEffect 도 deps 가 [] 라 다시 돌지 않아 손쓸 자리가 없었습니다.
  //
  //   [고침]  ★주소값은 «상태로 담지 않고» 그릴 때마다 읽습니다.
  //     로그인 계정에서 찾아온 값만 상태(myConsultantId)로 둡니다.
  //   ⚠️ 상담사 «본인» 이 주소 없이 들어오는 길은 «그대로» 입니다 (아래 fallback).
  //   ⛔ useState(searchParams.get(...)) 로 되돌리지 마십시오. 같은 증상이 다시 납니다.
  //   ⚠️ 위 12~17줄의 gender·calType·leapMonth 도 «같은 결» 입니다.
  //      그쪽은 화면 안에서 주소가 안 바뀌어 지금은 탈이 없어 «안 건드렸습니다».
  // ══════════════════════════════════════════════════════════════════════
  const urlConsultantId = searchParams.get('consultantId') || ''
  // ★2026-08-05 (47부 3차) — «어디서 들어왔는지» 를 주소에 담습니다. [대표님 지시]
  //   뒤로가기가 «들어온 길» 로 돌아가야 하기 때문입니다.
  //     from=pick   상담사 고르기 화면에서 왔다
  //     from=admin  관리자 화면(상담사 표)에서 왔다  ★새 탭이라 브라우저 뒤로가기가 «안 됩니다»
  //     (없음)      마이페이지·로그인 직후 등. page.tsx 가 안전한 기본값으로 보냅니다.
  const fromParam = searchParams.get('from') || ''
  const [myConsultantId, setMyConsultantId] = useState('')
  const consultantId = urlConsultantId || myConsultantId
  useEffect(() => {
    // URL에 consultantId가 이미 있으면 그대로 사용 (기존 동작 유지)
    if (urlConsultantId) return
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
        setMyConsultantId(data.consultant_id)
      }
    }
    loadMyConsultantId()
  }, [urlConsultantId])
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
  function handleSelectConsultation(c: {
    id: string
    customer_phone: string
    user_id?: string | null
    customer_name?: string
    birth_data?: {
      year?: string; month?: string; day?: string
      gender?: string; hour?: string; calType?: string; leapMonth?: string
      customerName?: string
    }
  }) {
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
    fromParam,
    handleFormSubmit, handleSelectConsultation,
  }
}
