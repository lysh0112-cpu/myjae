'use client'
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
  onFormSubmit: (params: Record<string, string>) => void
}

export default function ConsultantSajuTab({
  saju, dayStem, converting, iljji, yeonjji, yeangan,
  dayunList, seyunList, yearParam, gender, calType,
  monthParam, dayParam, hourIdx, customerName,
  consultationId, customerPhone, onFormSubmit,
}: Props) {
  return (
    <>
      <ConsultantInputForm onSubmit={onFormSubmit} />
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
