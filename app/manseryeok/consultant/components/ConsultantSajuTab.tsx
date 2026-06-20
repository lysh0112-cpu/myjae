'use client'
import { useEffect, useState } from 'react'
import { useStartConsultation } from '@/hooks/useStartConsultation'
import SajuBoard from './SajuBoard'
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

const BRANCH_LIST = [
  {char:'子'},{char:'丑'},{char:'寅'},{char:'卯'},
  {char:'辰'},{char:'巳'},{char:'午'},{char:'未'},
  {char:'申'},{char:'酉'},{char:'戌'},{char:'亥'},
]

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
  const { starting, startConsultation } = useStartConsultation()
  const [phone, setPhone] = useState(customerPhone || '')

  useEffect(() => {
    if (customerPhone) setPhone(customerPhone)
  }, [customerPhone])

  const initialBirth = yearParam > 0
    ? `${yearParam}${String(monthParam).padStart(2,'0')}${String(dayParam).padStart(2,'0')}`
    : ''

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

  async function handleStartConsultation() {
    if (!phone.trim()) {
      alert('고객 전화번호를 입력해주세요.')
      return
    }
    const id = await startConsultation({
      consultantId,
      customerPhone: phone.trim(),
      gender, calType, year: yearParam,
      month: monthParam, day: dayParam,
      hour: hourIdx, customerName,
    })
    if (id) onConsultationStarted(id, phone.trim())
  }

  return (
    <>
      <ConsultantInputForm
        onSubmit={onFormSubmit}
        initialGender={gender as '남' | '여'}
        initialCalType={calType as '양력' | '음력'}
        initialBirth={initialBirth}
        initialHourIdx={hourIdx}
      />

      {/* 전화 고객 상담 시작 — consultationId 없을 때만 표시 */}
      {saju.length > 0 && !consultationId && (
        <div className="rounded-2xl p-4"
          style={{background:'rgba(60,52,137,0.3)', border:'1px solid rgba(250,199,117,0.3)'}}>
          <div className="text-xs font-semibold mb-3" style={{color:'rgba(250,199,117,0.8)'}}>
            📞 전화 고객 상담 시작
          </div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="고객 전화번호 입력"
            className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none mb-3"
            style={{background:'rgba(255,255,255,0.08)', color:'#fff', border:'1px solid rgba(255,255,255,0.15)'}}
          />
          <button
            onClick={handleStartConsultation}
            disabled={starting}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
            style={{background:'linear-gradient(135deg,#FAC775,#f0a030)', color:'#1a1a18'}}>
            {starting ? '등록 중...' : '📋 상담 시작 (채팅 목록에 등록)'}
          </button>
        </div>
      )}

      {yearParam > 0 && (
        <div className="rounded-2xl p-4"
          style={{background:'linear-gradient(135deg,#3C3489 0%,#2a2075 100%)',
            border:'1px solid rgba(250,199,117,0.2)'}}>
          <div className="text-xs font-semibold mb-2" style={{color:'rgba(250,199,117,0.8)'}}>분석 대상</div>
          <div className="flex items-center gap-2 flex-wrap">
            {[customerName||'', `${gender}성`,
              `${calType} ${yearParam}.${monthParam}.${dayParam}`,
              hourIdx===null ? '시 미지정' : `${BRANCH_LIST[hourIdx]?.char}시`
            ].filter(Boolean).map(item => (
              <span key={item} className="text-sm font-semibold px-3 py-1 rounded-full"
                style={{background:'rgba(255,255,255,0.1)', color:'#FAC775'}}>{item}</span>
            ))}
          </div>
        </div>
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
          <ElementScore />
          <UnsungBoard dayStem={dayStem} saju={saju} />
          <SinsalBoard saju={saju} yeonjji={yeonjji} iljji={iljji} />
          <GongmangBoard ilgan={dayStem} iljji={iljji} yeangan={yeangan} yeonjji={yeonjji} />
          <ConsultantDayun dayunList={dayunList} ilgan={dayStem} yeonjji={yeonjji} iljji={iljji} birthYear={yearParam} />
          <ConsultantSeyun seyunList={seyunList} ilgan={dayStem} yeonjji={yeonjji} iljji={iljji} />
          <ConsultantWolun ilgan={dayStem} yeonjji={yeonjji} iljji={iljji} />
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
