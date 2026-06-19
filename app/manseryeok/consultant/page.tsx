'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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

// 시간 → 시주 인덱스 변환
function timeToHourIdx(timeStr: string): number | null {
  if (!timeStr || timeStr.length < 3) return null
  const h = parseInt(timeStr.slice(0, 2))
  const m = parseInt(timeStr.slice(2, 4) || '0')
  const total = h * 60 + m
  // 子시: 23:30~01:29
  if (total >= 1410 || total < 90) return 0
  // 丑시: 01:30~03:29
  if (total < 210) return 1
  // 寅시: 03:30~05:29
  if (total < 330) return 2
  // 卯시: 05:30~07:29
  if (total < 450) return 3
  // 辰시: 07:30~09:29
  if (total < 570) return 4
  // 巳시: 09:30~11:29
  if (total < 690) return 5
  // 午시: 11:30~13:29
  if (total < 810) return 6
  // 未시: 13:30~15:29
  if (total < 930) return 7
  // 申시: 15:30~17:29
  if (total < 1050) return 8
  // 酉시: 17:30~19:29
  if (total < 1170) return 9
  // 戌시: 19:30~21:29
  if (total < 1290) return 10
  // 亥시: 21:30~23:29
  if (total < 1410) return 11
  return 0
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

// ── 상담사 입력 폼 컴포넌트 ──
function ConsultantInputForm({ onSubmit }: { onSubmit: (params: Record<string, string>) => void }) {
  const [birthInput, setBirthInput] = useState('')   // 19980105
  const [timeInput, setTimeInput] = useState('')     // 0200
  const [noTime, setNoTime] = useState(false)
  const [gender, setGender] = useState<'남' | '여'>('남')
  const [calType, setCalType] = useState<'양력' | '음력'>('양력')
  const [customerName, setCustomerName] = useState('')
  const [error, setError] = useState('')

  function formatBirth(val: string) {
    const n = val.replace(/\D/g, '').slice(0, 8)
    if (n.length <= 4) return n
    if (n.length <= 6) return `${n.slice(0,4)}.${n.slice(4)}`
    return `${n.slice(0,4)}.${n.slice(4,6)}.${n.slice(6)}`
  }

  function formatTime(val: string) {
    return val.replace(/\D/g, '').slice(0, 4)
  }

  function handleSubmit() {
    const digits = birthInput.replace(/\D/g, '')
    if (digits.length !== 8) {
      setError('생년월일 8자리를 입력해주세요 (예: 19980105)')
      return
    }
    const year = digits.slice(0, 4)
    const month = digits.slice(4, 6)
    const day = digits.slice(6, 8)

    let hourIdx = 'moeum'
    if (!noTime && timeInput.length >= 3) {
      const idx = timeToHourIdx(timeInput)
      hourIdx = idx !== null ? String(idx) : '모름'
    } else {
      hourIdx = '모름'
    }

    setError('')
    onSubmit({
      gender,
      calType,
      year: String(parseInt(year)),
      month: String(parseInt(month)),
      day: String(parseInt(day)),
      hour: hourIdx,
      customerName,
    })
  }

  return (
    <div className="rounded-2xl p-4"
      style={{background:'linear-gradient(135deg,#3C3489 0%,#2a2075 100%)',border:'1px solid rgba(250,199,117,0.2)'}}>
      <div className="text-xs font-semibold mb-3" style={{color:'rgba(250,199,117,0.8)'}}>
        ✦ 고객 정보 입력
      </div>

      {/* 고객 이름 */}
      <div className="mb-3">
        <label className="text-xs mb-1 block" style={{color:'rgba(255,255,255,0.6)'}}>고객 이름 (선택)</label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="홍길동"
          className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
          style={{background:'rgba(255,255,255,0.1)',color:'#fff',border:'1px solid rgba(255,255,255,0.15)'}}
        />
      </div>

      {/* 성별 + 양음력 */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="text-xs mb-1 block" style={{color:'rgba(255,255,255,0.6)'}}>성별</label>
          <div className="flex rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.15)'}}>
            {(['남','여'] as const).map(v => (
              <button key={v} onClick={() => setGender(v)}
                className="flex-1 py-2 text-sm font-bold transition-all"
                style={gender===v ? {background:'rgba(250,199,117,0.3)',color:'#FAC775'} : {background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)'}}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <label className="text-xs mb-1 block" style={{color:'rgba(255,255,255,0.6)'}}>달력</label>
          <div className="flex rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.15)'}}>
            {(['양력','음력'] as const).map(v => (
              <button key={v} onClick={() => setCalType(v)}
                className="flex-1 py-2 text-sm font-bold transition-all"
                style={calType===v ? {background:'rgba(250,199,117,0.3)',color:'#FAC775'} : {background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)'}}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 생년월일 */}
      <div className="mb-3">
        <label className="text-xs mb-1 block" style={{color:'rgba(255,255,255,0.6)'}}>생년월일 (8자리)</label>
        <input
          type="tel"
          value={birthInput}
          onChange={(e) => setBirthInput(formatBirth(e.target.value))}
          placeholder="1998.01.05"
          maxLength={10}
          className="w-full rounded-xl px-3 py-2.5 text-lg text-center font-bold tracking-widest focus:outline-none"
          style={{background:'rgba(255,255,255,0.1)',color:'#FAC775',border:'1px solid rgba(255,255,255,0.15)'}}
        />
      </div>

      {/* 출생시간 */}
      <div className="mb-4">
        <label className="text-xs mb-1 block" style={{color:'rgba(255,255,255,0.6)'}}>출생시간 (4자리)</label>
        <div className="flex gap-2 items-center">
          <input
            type="tel"
            value={timeInput}
            onChange={(e) => setTimeInput(formatTime(e.target.value))}
            placeholder="0200"
            maxLength={4}
            disabled={noTime}
            className="flex-1 rounded-xl px-3 py-2.5 text-lg text-center font-bold tracking-widest focus:outline-none"
            style={{
              background: noTime ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.1)',
              color: noTime ? 'rgba(255,255,255,0.3)' : '#FAC775',
              border:'1px solid rgba(255,255,255,0.15)'
            }}
          />
          <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{color:'rgba(255,255,255,0.6)'}}>
            <input type="checkbox" checked={noTime} onChange={(e) => setNoTime(e.target.checked)}
              className="w-4 h-4 rounded" />
            모름
          </label>
        </div>
        {timeInput.length >= 3 && !noTime && (
          <p className="text-xs mt-1" style={{color:'rgba(250,199,117,0.7)'}}>
            → {BRANCH_LIST[timeToHourIdx(timeInput) ?? 0]?.char}시
          </p>
        )}
      </div>

      {error && <p className="text-xs mb-3 text-center" style={{color:'#ff8080'}}>{error}</p>}

      <button
        onClick={handleSubmit}
        className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
        style={{background:'linear-gradient(135deg,#FAC775,#f0a030)',color:'#1a1a18'}}>
        ✦ 사주 조회하기
      </button>
    </div>
  )
}

function ConsultantContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [saju, setSaju] = useState<{pillar:string;stem:string;branch:string}[]>([])
  const [dayStem, setDayStem] = useState('')
  const [monthGanji, setMonthGanji] = useState('')
  const [yearStem, setYearStem] = useState('')
  const [converting, setConverting] = useState(false)
  const [consultationId, setConsultationId] = useState<string | null>(null)
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerName, setCustomerName] = useState('')

  // URL 파라미터
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

  const consultationIdParam = searchParams.get('consultationId') || null
  const customerPhoneParam = searchParams.get('customerPhone') || ''

  useEffect(() => {
    setConsultationId(consultationIdParam)
    setCustomerPhone(customerPhoneParam)
  }, [consultationIdParam, customerPhoneParam])

  // 폼 제출 → 사주 로드
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
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'rgba(60,52,137,0.3)'}}>
          <span style={{color:'#FAC775',fontSize:'16px'}}>✦</span>
        </div>
      </header>

      <main className="pt-20 pb-10 px-4 space-y-4">

        {/* 상담사 입력 폼 */}
        <ConsultantInputForm onSubmit={handleFormSubmit} />

        {/* 분석 대상 표시 */}
        {yearParam > 0 && (
          <div className="rounded-2xl p-4"
            style={{background:'linear-gradient(135deg,#3C3489 0%,#2a2075 100%)',border:'1px solid rgba(250,199,117,0.2)'}}>
            <div className="text-xs font-semibold mb-2" style={{color:'rgba(250,199,117,0.8)'}}>분석 대상</div>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                customerName || '',
                `${gender}성`,
                `${calType} ${yearParam}.${monthParam}.${dayParam}`,
                hourIdx === null ? '시 미지정' : `${BRANCH_LIST[hourIdx]?.char}시`
              ].filter(Boolean).map(item => (
                <span key={item} className="text-sm font-semibold px-3 py-1 rounded-full"
                  style={{background:'rgba(255,255,255,0.1)',color:'#FAC775'}}>{item}</span>
              ))}
            </div>
          </div>
        )}

        {/* 로딩 */}
        {converting && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="text-3xl animate-spin">✦</div>
            <p style={{color:'#FAC775'}}>사주 정보를 불러오는 중...</p>
          </div>
        )}

        {/* 사주 분석 결과 */}
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
