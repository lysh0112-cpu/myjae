'use client'
import { Suspense } from 'react'
import { useConsultantState } from '@/hooks/useConsultantState'
import { useConsultantSaju } from '@/hooks/useConsultantSaju'
import ConsultantHeader from './components/ConsultantHeader'
import ConsultantSajuTab from './components/ConsultantSajuTab'
import ConsultationList from './components/ConsultationList'
import ConsultantChat from './components/ConsultantChat'

function ConsultantContent() {
  const {
    tab, setTab,
    consultationId, setConsultationId,
    customerPhone, setCustomerPhone,
    customerName,
    selectedConsultation, setSelectedConsultation,
    gender, calType, yearParam, monthParam, dayParam, leapMonth, hourIdx,
    consultantId,
    handleFormSubmit, handleSelectConsultation,
  } = useConsultantState()

  const { saju, dayStem, converting, iljji, yeonjji, yeangan, dayunList, seyunList } =
    useConsultantSaju(calType, yearParam, monthParam, dayParam, leapMonth, hourIdx, gender)

  // 채팅방으로 바로 이동
  function handleGoToChat() {
    if (!consultationId || !customerPhone) return
    setSelectedConsultation({ id: consultationId, customer_phone: customerPhone })
  }

  if (selectedConsultation) return (
    <div className="min-h-screen" style={{background:'#1a1a18', maxWidth:'430px', margin:'0 auto'}}>
      <header className="fixed top-0 z-50 px-4 py-4 w-full"
        style={{background:'rgba(26,26,24,0.97)', backdropFilter:'blur(12px)',
          borderBottom:'1px solid rgba(255,255,255,0.06)',
          maxWidth:'430px', left:'50%', transform:'translateX(-50%)'}}>
        <div className="text-sm font-bold text-white text-center">채팅 상담</div>
      </header>
      <main className="pt-16">
        <ConsultantChat
          consultationId={selectedConsultation.id}
          customerPhone={selectedConsultation.customer_phone}
          onBack={() => setSelectedConsultation(null)}
          onViewSaju={() => {
            setConsultationId(selectedConsultation.id)
            setCustomerPhone(selectedConsultation.customer_phone)
            setSelectedConsultation(null)
            setTab('saju')
          }}
        />
      </main>
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:'#1a1a18', maxWidth:'430px', margin:'0 auto'}}>
      <ConsultantHeader
        tab={tab}
        setTab={setTab}
        consultationId={consultationId}
        customerPhone={customerPhone}
        onGoToChat={handleGoToChat}
      />
      <main className="pt-20 pb-10 px-4 space-y-4">
        {tab === 'saju' && (
          <ConsultantSajuTab
            saju={saju}
            dayStem={dayStem}
            converting={converting}
            iljji={iljji}
            yeonjji={yeonjji}
            yeangan={yeangan}
            dayunList={dayunList}
            seyunList={seyunList}
            yearParam={yearParam}
            gender={gender}
            calType={calType}
            monthParam={monthParam}
            dayParam={dayParam}
            hourIdx={hourIdx}
            customerName={customerName}
            consultationId={consultationId}
            customerPhone={customerPhone}
            onFormSubmit={handleFormSubmit}
          />
        )}
        {tab === 'chat' && (
          <ConsultationList
            consultantId={consultantId}
            onSelect={handleSelectConsultation}
          />
        )}
      </main>
    </div>
  )
}

export default function ConsultantPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{background:'#1a1a18'}}>
        <div style={{color:'#FAC775'}}>로딩 중...</div>
      </div>
    }>
      <ConsultantContent />
    </Suspense>
  )
}
