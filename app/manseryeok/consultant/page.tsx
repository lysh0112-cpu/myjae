'use client'
import { Suspense, useState } from 'react'
import { useConsultantState } from '@/hooks/useConsultantState'
import { useConsultantSaju } from '@/hooks/useConsultantSaju'
import ConsultationList from './components/ConsultationList'
import ConsultantChat from './components/ConsultantChat'
import ConsultantSajuTab from './components/ConsultantSajuTab'
import CustomerAiAnalysis from './components/CustomerAiAnalysis'
import { supabase } from '@/lib/supabase'

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

  const [showSaju, setShowSaju] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  async function handleDeleteRequest(id: string) {
    if (!confirm('삭제를 요청하시겠어요? 관리자 승인 후 최종 삭제됩니다.')) return
    setDeleteLoading(id)
    await supabase
      .from('consultations')
      .update({ delete_requested_at: new Date().toISOString() })
      .eq('id', id)
    setDeleteLoading(null)
    alert('삭제 요청이 접수됐어요. 관리자 승인 후 삭제됩니다.')
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 280px', height: '100vh', background: '#111118', gap: '1px' }}>

      {/* 좌측: 고객 리스트 */}
      <div style={{ background: '#1a1a24', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#e8e4ff' }}>상담 목록</span>
          <span style={{ marginLeft: 'auto', fontSize: '10px', background: 'rgba(255,100,100,0.15)', color: '#ff8888', padding: '2px 8px', borderRadius: '20px' }}>
            대기 중
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          <ConsultationList
            consultantId={consultantId}
            onSelect={(consultation) => {
              handleSelectConsultation(consultation)
              setShowSaju(false)
            }}
            selectedId={selectedConsultation?.id}
            onDeleteRequest={handleDeleteRequest}
            deleteLoading={deleteLoading}
          />
        </div>
      </div>

      {/* 가운데: 채팅창 */}
      <div style={{ background: '#13131e', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedConsultation ? (
          <ConsultantChat
            consultationId={selectedConsultation.id}
            customerPhone={selectedConsultation.customer_phone}
            onBack={() => setSelectedConsultation(null)}
            onViewSaju={() => setShowSaju(prev => !prev)}
            pcMode={true}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>💬</span>
            <span style={{ fontSize: '14px', color: '#5555aa' }}>좌측에서 고객을 선택해주세요</span>
          </div>
        )}
      </div>

      {/* 우측: 사주 분석 */}
      <div style={{ background: '#1a1a24', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#e8e4ff' }}>AI 분석</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setShowSaju(false)}
              style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', background: !showSaju ? '#2d2060' : 'rgba(255,255,255,0.06)', color: !showSaju ? '#b8a9ff' : '#666688' }}>
              AI 분석
            </button>
            <button
              onClick={() => setShowSaju(true)}
              style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', background: showSaju ? '#2d2060' : 'rgba(255,255,255,0.06)', color: showSaju ? '#b8a9ff' : '#666688' }}>
              사주 보기
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {selectedConsultation ? (
            showSaju ? (
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
                consultantId={consultantId}
                onFormSubmit={handleFormSubmit}
                onConsultationStarted={(id, phone) => {
                  setConsultationId(id)
                  setCustomerPhone(phone)
                }}
              />
            ) : (
              <CustomerAiAnalysis
                consultationId={selectedConsultation.id}
                saju={saju}
                gender={gender}
                calType={calType}
                yearParam={yearParam}
                monthParam={monthParam}
                dayParam={dayParam}
                hourIdx={hourIdx}
              />
            )
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>🔮</span>
              <span style={{ fontSize: '14px', color: '#5555aa' }}>고객 선택 시 분석이 표시됩니다</span>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

export default function ConsultantPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111118' }}>
        <div style={{ color: '#FAC775' }}>로딩 중...</div>
      </div>
    }>
      <ConsultantContent />
    </Suspense>
  )
}
