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
import { calcDayunList, calcSeyunList } from '@/lib/saju/dayun'

const HEAVENLY_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const EARTHLY_BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
const STEM_ELEMENT: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
const BRANCH_ELEMENT: Record<string,string> = {子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수'}
const ELEMENT_COLOR: Record<string,string> = {목:'#4caf50',화:'#f44336',토:'#ff9800',금:'#9e9e9e',수:'#2196f3'}
const BRANCH_LIST = [
  {char:'子'},{char:'丑'},{char:'寅'},{char:'卯'},
  {char:'辰'},{char:'巳'},{char:'午'},{char:'未'},
  {char:'申'},{char:'酉'},{char:'戌'},{char:'亥'},
]
const BRANCH_YIN: Record<string,boolean> = {
  子:true,丑:true,寅:false,卯:true,辰:false,巳:true,
  午:false,未:true,申:false,酉:true,戌:false,亥:true
}

function getSipsin(dayStem: string, targetStem: string): string {
  if (!targetStem || targetStem === '?') return ''
  const dayIdx = HEAVENLY_STEMS.indexOf(dayStem)
  const targetIdx = HEAVENLY_STEMS.indexOf(targetStem)
  const de = STEM_ELEMENT[dayStem], te = STEM_ELEMENT[targetStem]
  const sameYin = (dayIdx%2)===(targetIdx%2)
  const gen: Record<string,string> = {목:'화',화:'토',토:'금',금:'수',수:'목'}
  const ctl: Record<string,string> = {목:'토',화:'금',토:'수',금:'목',수:'화'}
  if (de===te) return sameYin?'비견':'겁재'
  if (gen[de]===te) return sameYin?'식신':'상관'
  if (ctl[de]===te) return sameYin?'편재':'정재'
  if (ctl[te]===de) return sameYin?'편관':'정관'
  if (gen[te]===de) return sameYin?'편인':'정인'
  return ''
}

function getSipsinBranch(dayStem: string, branch: string): string {
  if (!branch || branch === '?') return ''
  const be = BRANCH_ELEMENT[branch], de = STEM_ELEMENT[dayStem]
  const dayYin = HEAVENLY_STEMS.indexOf(dayStem)%2===1
  const sameYin = dayYin===BRANCH_YIN[branch]
  const gen: Record<string,string> = {목:'화',화:'토',토:'금',금:'수',수:'목'}
  const ctl: Record<string,string> = {목:'토',화:'금',토:'수',금:'목',수:'화'}
  if (de===be) return sameYin?'비견':'겁재'
  if (gen[de]===be) return sameYin?'식신':'상관'
  if (ctl[de]===be) return sameYin?'편재':'정재'
  if (ctl[be]===de) return sameYin?'편관':'정관'
  if (gen[be]===de) return sameYin?'편인':'정인'
  return ''
}

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
  const [saju, setSaju] = useState<{pillar:string;stem:string;branch:string}[]>([])
  const [dayStem, setDayStem] = useState('')
  const [monthGanji, setMonthGanji] = useState('')
  const [yearStem, setYearStem] = useState('')
  const [converting, setConverting] = useState(true)
  const [consultationId, setConsultationId] = useState<string | null>(null)
  const [customerPhone, setCustomerPhone] = useState('')

  const gender = searchParams.get('gender') || '남'
  const calType = searchParams.get('calType') || '양력'
  const yearParam = parseInt(searchParams.get('year') || '0')
  const monthParam = parseInt(searchParams.get('month') || '0')
  const dayParam = parseInt(searchParams.get('day') || '0')
  const leapMonth = searchParams.get('leapMonth') || '0'
  const hourParam = searchParams.get('hour')
  const hourIdx = hourParam === '모름' || hourParam === null ? null : parseInt(hourParam)
  const consultationIdParam = searchParams.get('consultationId') || null
  const customerPhoneParam = searchParams.get('customerPhone') || ''

  useEffect(() => {
    setConsultationId(consultationIdParam)
    setCustomerPhone(customerPhoneParam)
  }, [consultationIdParam, customerPhoneParam])

  useEffect(() => {
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

  if (converting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{background:'#1a1a18'}}>
        <div className="text-3xl animate-spin">✦</div>
        <p style={{color:'#FAC775'}}>사주 정보를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{background:'#1a1a18',maxWidth:'430px',margin:'0 auto'}}>
      <header className="fixed top-0 z-50 flex items-center justify-between px-4 py-4"
        style={{background:'rgba(26,26,24,0.97)',backdropFilter:'blur(12px)',
          borderBottom:'1px solid rgba(255,255,255,0.06)',width:'100%',maxWidth:'430px',left:'50%',transform:'translateX(-50%)'}}>
        <Link href="/manseryeok/result">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'rgba(255,255,255,0.06)'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </Link>
        <div className="text-sm font-bold text-white">전문가 분석 화면</div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'rgba(60,52,137,0.3)'}}>
          <span style={{color:'#FAC775',fontSize:'16px'}}>✦</span>
        </div>
      </header>

      <main className="pt-20 pb-10 px-4 space-y-4">
        {/* 분석 대상 */}
        <div className="rounded-2xl p-4"
          style={{background:'linear-gradient(135deg,#3C3489 0%,#2a2075 100%)',border:'1px solid rgba(250,199,117,0.2)'}}>
          <div className="text-xs font-semibold mb-2" style={{color:'rgba(250,199,117,0.8)'}}>분석 대상</div>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              `${gender}성`,
              `${calType} ${yearParam}.${monthParam}.${dayParam}`,
              hourIdx === null ? '시 미지정' : `${BRANCH_LIST[hourIdx]?.char}시`
            ].map(item => (
              <span key={item} className="text-sm font-semibold px-3 py-1 rounded-full"
                style={{background:'rgba(255,255,255,0.1)',color:'#FAC775'}}>{item}</span>
            ))}
          </div>
        </div>

        {saju.length > 0 && (
          <>
            <SajuBoard saju={saju} dayStem={dayStem} />
            <ElementScore />
            <UnsungBoard dayStem={dayStem} saju={saju} />
            <SinsalBoard saju={saju} yeonjji={yeonjji} iljji={iljji} />
            <GongmangBoard ilgan={dayStem} iljji={iljji} yeangan={yeangan} yeonjji={yeonjji} />
            <ConsultantDayun dayunList={dayunList} ilgan={dayStem} yeonjji={yeonjji} iljji={iljji} />
            <ConsultantSeyun seyunList={seyunList} ilgan={dayStem} yeonjji={yeonjji} iljji={iljji} />
            <ConsultantWolun ilgan={dayStem} yeonjji={yeonjji} iljji={iljji} />
            <Commentary />
            <AISummary
              consultationId={consultationId}
              consultantName="상담사"
              customerPhone={customerPhone}
            />
          </>
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
