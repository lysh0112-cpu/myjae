'use client'
import { useEffect, useState } from 'react'
import SajuBoard from './SajuBoard'
import YongsinBoard from './YongsinBoard'
import YongsinProBoard from './YongsinProBoard'
import ElementScore from './ElementScore'
import UnsungBoard from './UnsungBoard'
import SinsalBoard from './SinsalBoard'
import GongmangBoard from './GongmangBoard'
import ConsultantDayun from './ConsultantDayun'
import ConsultantSeyun from './ConsultantSeyun'
import ConsultantWolun from './ConsultantWolun'
import Commentary from './Commentary'
import AISummary from './AISummary'
import ConsultantInputForm from './ConsultantInputForm'
import CustomerAiAnalysis from './CustomerAiAnalysis'
import ConsultantPhoneStart from './ConsultantPhoneStart'
import ConsultantAnalysisInfo from './ConsultantAnalysisInfo'

type Props = {
  saju: {pillar:string;stem:string;branch:string}[]
  dayStem: string
  converting: boolean
  iljji: string
  yeonjji: string
  yeangan: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dayunList: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  seyunList: any[]
  yearParam: number
  gender: string
  calType: string
  monthParam: number
  dayParam: number
  hourIdx: number | null
  customerName: string
  consultationId: string | null
  customerPhone: string
  consultantId: string
  onFormSubmit: (params: Record<string, string>) => void
  onConsultationStarted: (id: string, phone: string) => void
}

export default function ConsultantSajuTab({
  saju, dayStem, converting, iljji, yeonjji, yeangan,
  dayunList, seyunList, yearParam, gender, calType,
  monthParam, dayParam, hourIdx, customerName,
  consultationId, customerPhone, consultantId,
  onFormSubmit, onConsultationStarted,
}: Props) {
  const initialBirth = yearParam > 0
    ? `${yearParam}${String(monthParam).padStart(2,'0')}${String(dayParam).padStart(2,'0')}`
    : ''

  // ✅ 연재 선생님 수정 점수 상태
  const [customScores, setCustomScores] = useState<Record<string,number> | null>(null)

  useEffect(() => {
    if (yearParam > 0 && gender && calType) {
      onFormSubmit({
        gender, calType,
        year: String(yearParam),
        month: String(monthParam),
        day: String(dayParam),
        hour: hourIdx !== null ? String(hourIdx) : '모름',
        customerName: customerName || '',
      })
    }
  }, [yearParam, gender, calType, monthParam, dayParam, hourIdx])

  return (
    <>
      <ConsultantInputForm
        onSubmit={onFormSubmit}
        initialGender={gender as '남' | '여'}
        initialCalType={calType as '양력' | '음력'}
        initialBirth={initialBirth}
        initialHourIdx={hourIdx}
        initialCustomerName={customerName}
      />

      {saju.length > 0 && !consultationId && (
        <ConsultantPhoneStart
          customerPhone={customerPhone}
          consultantId={consultantId}
          gender={gender}
          calType={calType}
          yearParam={yearParam}
          monthParam={monthParam}
          dayParam={dayParam}
          hourIdx={hourIdx}
          customerName={customerName}
          onConsultationStarted={onConsultationStarted}
        />
      )}

      {yearParam > 0 && (
        <ConsultantAnalysisInfo
          customerName={customerName}
          gender={gender}
          calType={calType}
          yearParam={yearParam}
          monthParam={monthParam}
          dayParam={dayParam}
          hourIdx={hourIdx}
        />
      )}

      {converting && (
        <div className="flex flex-col items-center justify-center py-10 gap-4">
          <div className="text-3xl animate-spin">✦</div>
          <p style={{color:'#FAC775'}}>사주 정보를 불러오는 중...</p>
        </div>
      )}

      {saju.length > 0 && !converting && (
        <>
          <SajuBoard saju={saju} dayStem={dayStem} />
          <YongsinBoard saju={saju} dayStem={dayStem} />
          {/* ✅ 커스텀 점수 있으면 우선 사용 */}
          <YongsinProBoard
            saju={saju}
            dayStem={dayStem}
            hourIdx={hourIdx}
            customScores={customScores}
          />
          {/* ✅ consultationId + onScoreChange 전달 */}
          <ElementScore
            consultationId={consultationId}
            onScoreChange={(scores) => setCustomScores(scores)}
          />
          <UnsungBoard dayStem={dayStem} saju={saju} />
          <SinsalBoard saju={saju} yeonjji={yeonjji} iljji={iljji} />
          <GongmangBoard ilgan={dayStem} iljji={iljji} yeangan={yeangan} yeonjji={yeonjji} />
          <ConsultantDayun dayunList={dayunList} ilgan={dayStem} yeonjji={yeonjji} iljji={iljji} birthYear={yearParam} />
          <ConsultantSeyun seyunList={seyunList} ilgan={dayStem} yeonjji={yeonjji} iljji={iljji} />
          <ConsultantWolun ilgan={dayStem} yeonjji={yeonjji} iljji={iljji} />
          <CustomerAiAnalysis consultationId={consultationId} />
          <Commentary consultationId={consultationId ?? undefined} />
          <AISummary
            consultationId={consultationId}
            consultantName="상담사"
            customerPhone={customerPhone}
            sajuData={saju.length > 0 ? {
              time: {stem: saju[0].stem, branch: saju[0].branch},
              day: {stem: saju[1].stem, branch: saju[1].branch},
              month: {stem: saju[2].stem, branch: saju[2].branch},
              year: {stem: saju[3].stem, branch: saju[3].branch},
              dayStem,
            } : undefined}
          />
        </>
      )}
    </>
  )
}
