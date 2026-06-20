'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import SajuBoard from './components/SajuBoard'
import ElementScore from './components/ElementScore'
import UnsungBoard from './components/UnsungBoard'
import SinsalBoard from './components/SinsalBoard'
import GongmangBoard from './components/GongmangBoard'
import ConsultantDayun from './components/ConsultantDayun'
import ConsultantSeyun from './components/ConsultantSeyun'
import ConsultantWolun from './components/ConsultantWolun'
import Commentary from './components/Commentary'
import AISummary from './components/AISummary'
import ConsultationList from './components/ConsultationList'
import ConsultantChat from './components/ConsultantChat'
import ConsultantInputForm from './components/ConsultantInputForm'
import { calcDayunList, calcSeyunList } from '@/lib/saju/dayun'

const HEAVENLY_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const EARTHLY_BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
const BRANCH_LIST = [
  {char:'子'},{char:'丑'},{char:'寅'},{char:'卯'},
  {char:'辰'},{char:'巳'},{char:'午'},{char:'未'},
  {char:'申'},{char:'酉'},{char:'戌'},{char:'亥'},
]

function splitGanji(ganji: string) {
  if (!ganji) return { stem: '?', branch: '?' }
  const match = ganji.match(/\(([^)]+)\)/)
  if (match && match[1].length >= 2) return { stem: match[1][0], branch: match[1][1] }
  if (ganji.length >= 2) return { stem: ganji[0], branch: ganji[1] }
  return { stem: '?', branch: '?' }
}

function calcHourPillar(dayStem: string, hourIdx: number) {
  const dg = HEAVENLY_STEMS.indexOf(dayStem)
  const hourStem = HEAVENLY_STEMS[(dg * 2 + hourIdx) % 10]
  const hourBranch = EARTHLY_BRANCHES[hourIdx]
  return { stem: hourStem, branch: hourBranch }
}

function ConsultantContent() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'saju' | 'chat'>('saju')
  const [saju, setSaju] = useState<{pillar:string;stem:string;branch:string}[]>([])
  const [dayStem, setDayStem] = useState('')
  const [monthGanji, setMonthGanji] = useState('')
  const [yearStem, setYearStem] = useState('')
  const [converting, setConverting] = useState(false)
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

  useEffect(() => {
    if (!yearParam || !monthParam || !dayParam) return
    async function loadSaju() {
      setConverting(true)
      try {
        let apiUrl = ''
        if (calType === '음력') {
          const res1 = await fetch(`/api/lunar?year=${yearParam}&month=${monthParam}&day=${dayParam}&calType=음력&leapMonth=${leapMonth}`)
          const d1 = await res1.json()
          apiUrl = `/api/lunar?year=${d1.solarYear}&month=${d1.solarMonth}&day=${d1.solarDay}&calType=양력`
        } else {
          apiUrl = `/api/lunar?year=${yearParam}&month=${monthParam}&day=${dayParam}&calType=양력`
        }
        const res = await fetch(apiUrl)
        const d = await res.json()
        const year = splitGanji(d.yearGanji)
        const month = splitGanji(d.monthGanji)
        const day = splitGanji(d.dayGanji)
        const hour = hourIdx !== null ? calcHourPillar(day.stem, hourIdx) : { stem: '?', branch: '?' }
        setDayStem(day.stem)
        setMonthGanji(month.stem + month.branch)
        setYearStem(year.stem)
        setSaju([
          { pillar: '시주', stem: hour.stem, branch: hour.branch },
          { pillar: '일주', stem: day.stem, branch: day.branch },
          { pillar: '월주', stem: month.stem, branch: month.branch },
          { pillar: '년주', stem: year.stem, branch: year.branch },
        ])
      } catch(e) {
        console.error(e)
      } finally {
        setConverting(false)
      }
    }
    loadSaju()
  }, [calType, yearParam, monthParam, dayParam, leapMonth, hourIdx])

  const iljji = saju[1]?.branch ?? ''
  const yeonjji = saju[3]?.branch ?? ''
  const yeangan = saju[3]?.stem ?? ''
  const dayunList = dayStem && monthGanji && yearStem
    ? calcDayunList(yearParam, monthParam, dayParam, monthGanji, yearStem, gender, dayStem)
    : []
  const seyunList = dayStem ? calcSeyunList(dayStem, 2026) : []

  // 채팅방 선택된 경우
  if (selectedConsultation) return (
    <div className="min-h-screen" style={{background:'#1a1a18',maxWidth:'430px',margin:'0 auto'}}>
      <header className="fixed top-0 z-50 px-4 py-4 w-full"
        style={{background:'rgba(26,26,24,0.97)',backdropFilter:'blur(12px)',
          borderBottom:'1px solid rgba(255,255,255,0.06)',maxWidth:'430px',left:'50%',transform:'translateX(-50%)'}}>
        <div className="text-sm font-bold text-white text-center">채팅 상담</div>
      </header>
      <main className="pt-16">
        <ConsultantChat
          consultationId={selectedConsultation.id}
          customerPhone={selectedConsultation.customer_phone}
          onBack={() => setSelectedConsultation(null)}
        />
      </main>
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:'#1a1a18',maxWidth:'430px',margin:'0 auto'}}>
      <header className="fixed top-0 z-50 flex items-center justify-between px-4 py-4"
        style={{background:'rgba(26,26,24,0.97)',backdropFilter:'blur(12px)',
          borderBottom:'1px solid rgba(255,255,255,0.06)',width:'100%',maxWidth:'430px',left:'50%',transform:'translateX(-50%)'}}>
        <Link href="/manseryeok">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'rgba(255,255,255,0.06)'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </Link>
        <div className="text-sm font-bold text-white">전문가 분석 화면</div>
        <div className="flex rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.15)'}}>
          <button onClick={() => setTab('saju')} className="px-3 py-1.5 text-xs font-bold transition-all"
            style={tab==='saju'?{background:'rgba(250,199,117,0.3)',color:'#FAC775'}:{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)'}}>
            사주
          </button>
          <button onClick={() => setTab('chat')} className="px-3 py-1.5 text-xs font-bold transition-all"
            style={tab==='chat'?{background:'rgba(250,199,117,0.3)',color:'#FAC775'}:{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)'}}>
            채팅
          </button>
        </div>
      </header>

      <main className="pt-20 pb-10 px-4 space-y-4">
        {tab === 'saju' && (
          <>
            <ConsultantInputForm onSubmit={handleFormSubmit} />
            {yearParam > 0 && (
              <div className="rounded-2xl p-4"
                style={{background:'linear-gradient(135deg,#3C3489 0%,#2a2075 100%)',border:'1px solid rgba(250,199,117,0.2)'}}>
                <div className="text-xs font-semibold mb-2" style={{color:'rgba(250,199,117,0.8)'}}>분석 대상</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {[customerName||'', `${gender}성`,
                    `${calType} ${yearParam}.${monthParam}.${dayParam}`,
                    hourIdx===null?'시 미지정':`${BRANCH_LIST[hourIdx]?.char}시`
                  ].filter(Boolean).map(item => (
                    <span key={item} className="text-sm font-semibold px-3 py-1 rounded-full"
                      style={{background:'rgba(255,255,255,0.1)',color:'#FAC775'}}>{item}</span>
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
                <Commentary />
                <AISummary consultationId={consultationId} consultantName="상담사" customerPhone={customerPhone} />
              </>
            )}
          </>
        )}
        {tab === 'chat' && (
          <ConsultationList
            consultantId={consultantId}
            onSelect={(c) => setSelectedConsultation(c)}
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
