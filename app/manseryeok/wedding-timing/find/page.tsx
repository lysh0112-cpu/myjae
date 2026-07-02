'use client'
import { Suspense, useState, useEffect, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PageHeader from '@/app/components/common/PageHeader'
import { supabase } from '@/lib/supabase'

const purple = '#7766dd'
const cardBg = '#13132a'
const sub = '#5555aa'
const text = '#e8e4ff'

const HOUR_LABELS: Record<string, string> = {
  '-1': '시간 모름',
  '0': '子시(23~01)', '1': '丑시(01~03)', '2': '寅시(03~05)', '3': '卯시(05~07)',
  '4': '辰시(07~09)', '5': '巳시(09~11)', '6': '午시(11~13)', '7': '未시(13~15)',
  '8': '申시(15~17)', '9': '酉시(17~19)', '10': '戌시(19~21)', '11': '亥시(21~23)',
}

interface PersonInput {
  year: string; month: string; day: string; hour: string
  gender: string; calType: string; job: string; mbti: string
}

interface WeddingSurvey {
  startDate: string
  endDate: string
  dayPref: string
  avoidNote: string
}

const DEFAULT_SURVEY: WeddingSurvey = {
  startDate: '', endDate: '', dayPref: 'weekend', avoidNote: '',
}

const SURVEY_KEY = 'wedding-timing-survey'

function Disclaimer({ full }: { full?: boolean }) {
  return (
    <div style={{ background: 'rgba(255,120,120,0.06)', border: '1px solid rgba(255,120,120,0.18)', borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#d88', lineHeight: 1.6 }}>
      {full
        ? '※ 본 분석은 전통 사주명리에 기반한 참고 정보입니다. 실제 예식일은 양가·예식장 사정과 두 분의 형편을 함께 고려해 결정하세요.'
        : '※ 전통 명리 참고용 · 실제 예식일은 양가·예식장 사정과 함께 결정하세요.'}
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        flex: '1 1 auto', minWidth: '64px', padding: '10px 8px', borderRadius: '10px', cursor: 'pointer',
        fontSize: '13px', fontWeight: active ? 600 : 400,
        background: active ? 'rgba(119,102,221,0.25)' : 'rgba(255,255,255,0.05)',
        color: active ? '#c8b0ff' : '#7777aa',
        border: '1px solid ' + (active ? purple : 'rgba(255,255,255,0.08)'),
      }}>
      {label}
    </button>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: '13px', color: '#c8c0ff', fontWeight: 600, margin: '20px 0 10px' }}>{children}</div>
}
function QLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: '13px', color: text, margin: '14px 0 8px' }}>{children}</div>
}

function personSummary(p: PersonInput | null): string {
  if (!p || !p.year) return '정보 없음'
  const hour = HOUR_LABELS[p.hour] ?? '시간 모름'
  return `${p.gender} · ${p.calType} ${p.year}.${p.month}.${p.day} · ${hour}`
}

function WeddingFindInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [groom, setGroom] = useState<PersonInput | null>(null)
  const [bride, setBride] = useState<PersonInput | null>(null)
  const [survey, setSurvey] = useState<WeddingSurvey>(DEFAULT_SURVEY)

  const [error, setError] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [price, setPrice] = useState(19900)

  useEffect(() => {
    supabase
      .from('analysis_prices')
      .select('price')
      .eq('price_key', 'wedding_pick')
      .maybeSingle()
      .then(({ data }) => { if (data) setPrice(data.price) })
  }, [])

  useEffect(() => {
    try {
      const p1 = sp.get('p1')
      const p2 = sp.get('p2')
      if (p1) setGroom(JSON.parse(decodeURIComponent(p1)))
      if (p2) setBride(JSON.parse(decodeURIComponent(p2)))
    } catch {}
    try {
      const saved = sessionStorage.getItem(SURVEY_KEY)
      if (saved) setSurvey({ ...DEFAULT_SURVEY, ...JSON.parse(saved) })
    } catch {}
  }, [sp])

  function setField<K extends keyof WeddingSurvey>(key: K, value: WeddingSurvey[K]) {
    setSurvey(prev => {
      const next = { ...prev, [key]: value }
      try { sessionStorage.setItem(SURVEY_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function handleAnalyze() {
    if (!groom || !groom.year || !bride || !bride.year) {
      setError('두 분의 사주 정보가 없어요. 이전 화면에서 신랑·신부 생년월일을 입력해 주세요 😊')
      return
    }
    if (!survey.startDate || !survey.endDate) {
      setError('희망 기간(시작일과 종료일)을 입력해 주세요 😊')
      return
    }
    if (new Date(survey.endDate) < new Date(survey.startDate)) {
      setError('종료일이 시작일보다 빠를 수 없어요. 기간을 다시 확인해 주세요.')
      return
    }
    setError('')
    setPayOpen(true)
  }

  function handlePay() {
    const params = new URLSearchParams()
    params.set('p1', JSON.stringify(groom))
    params.set('p2', JSON.stringify(bride))
    params.set('survey', JSON.stringify(survey))
    router.push('/manseryeok/wedding-timing/result?' + params.toString())
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0d0d1a', maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>
      <PageHeader
        title="결혼 길일 택일"
        subtitle="두 분께 좋은 결혼 날짜를 찾아드려요"
        onBack={() => router.push('/manseryeok/wedding-timing')}
      />

      <div style={{ padding: '16px' }}>
        <Disclaimer full />

        <SectionLabel>두 사람 정보</SectionLabel>
        <div style={{ background: cardBg, borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px' }}>🤵</span>
            <span style={{ fontSize: '12px', color: sub, width: '44px' }}>신랑</span>
            <span style={{ fontSize: '13px', color: text }}>{personSummary(groom)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>👰</span>
            <span style={{ fontSize: '12px', color: sub, width: '44px' }}>신부</span>
            <span style={{ fontSize: '13px', color: text }}>{personSummary(bride)}</span>
          </div>
        </div>
        <div style={{ fontSize: '11px', color: sub, marginTop: '6px' }}>
          수정하려면 ‹ 뒤로 가서 변경해 주세요
        </div>

        <SectionLabel>언제쯤 식을 올리고 싶으세요?</SectionLabel>

        <QLabel>희망 기간 시작 <span style={{ color: purple }}>*</span></QLabel>
        <input type="date" value={survey.startDate}
          onChange={e => setField('startDate', e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '12px 14px', color: survey.startDate ? '#c8b0ff' : '#5555aa', fontSize: '15px', colorScheme: 'dark', outline: 'none' }} />

        <QLabel>희망 기간 끝 <span style={{ color: purple }}>*</span></QLabel>
        <input type="date" value={survey.endDate}
          onChange={e => setField('endDate', e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '12px 14px', color: survey.endDate ? '#c8b0ff' : '#5555aa', fontSize: '15px', colorScheme: 'dark', outline: 'none' }} />

        <QLabel>요일은 어떻게 할까요?</QLabel>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[['weekend', '주말만'], ['holiday', '공휴일 포함'], ['all', '평일 포함']].map(([val, lab]) => (
            <Chip key={val} label={lab} active={survey.dayPref === val} onClick={() => setField('dayPref', val)} />
          ))}
        </div>
        <div style={{ fontSize: '11px', color: sub, marginTop: '6px', lineHeight: 1.6 }}>
          ‘공휴일 포함’은 토·일에 더해 평일에 낀 공휴일·연휴도 함께 찾아드려요.
        </div>

        <QLabel>피하고 싶은 날이 있나요? <span style={{ color: sub, fontSize: '11px' }}>(선택)</span></QLabel>
        <textarea value={survey.avoidNote}
          onChange={e => setField('avoidNote', e.target.value)}
          placeholder="예) 6월은 양가 제사가 있어 피하고 싶어요"
          rows={2}
          style={{ width: '100%', boxSizing: 'border-box', background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: text, fontSize: '14px', outline: 'none', resize: 'none', lineHeight: 1.6 }} />

        {error && (
          <div style={{ marginTop: '14px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#ff8888', lineHeight: 1.6 }}>
            {error}
          </div>
        )}

        <button onClick={handleAnalyze}
          style={{ width: '100%', marginTop: '20px', padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg,#5544bb,#7766dd)', border: 'none', color: text, fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
          💍 좋은 결혼 길일 찾기
        </button>

        <div style={{ marginTop: '14px' }}>
          <Disclaimer />
        </div>
      </div>

      {payOpen && (
        <div onClick={() => setPayOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', background: '#15152e', borderRadius: '20px 20px 0 0', padding: '10px 20px 28px', boxShadow: '0 -8px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)', margin: '0 auto 18px' }} />

            <div style={{ fontSize: '17px', fontWeight: 700, color: text, marginBottom: '4px' }}>💍 결혼 길일 택일 분석</div>
            <div style={{ fontSize: '13px', color: sub, marginBottom: '16px', lineHeight: 1.6 }}>
              두 분께 좋은 결혼 길일 5곳을 찾아드려요
            </div>

            <div style={{ background: cardBg, borderRadius: '12px', padding: '14px', marginBottom: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '12px', color: sub, marginBottom: '8px' }}>분석 내용</div>
              {['추천 결혼 길일 5순위', '각 날짜의 길신 풀이(천을귀인·용신·손없는날 등)', '피하면 좋은 날 안내', '두 사람 사주 함께 반영'].map((t, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#b8b4d8', lineHeight: 1.9 }}>· {t}</div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', color: sub }}>결제 금액</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#c8b0ff' }}>{price.toLocaleString()}원</span>
            </div>

            <button onClick={handlePay}
              style={{ width: '100%', padding: '15px', borderRadius: '12px', background: 'linear-gradient(135deg,#5544bb,#7766dd)', border: 'none', color: text, fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginBottom: '8px' }}>
              💳 {price.toLocaleString()}원 결제하기
            </button>
            <div style={{ fontSize: '11px', color: sub, textAlign: 'center', marginBottom: '14px' }}>
              (결제 시스템 첨부 예정 — 지금은 바로 결과를 봐요)
            </div>

            <button onClick={() => setPayOpen(false)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: sub, fontSize: '13px', cursor: 'pointer', marginBottom: '14px' }}>
              취소
            </button>

            <Disclaimer />
          </div>
        </div>
      )}
    </main>
  )
}

export default function WeddingFindPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d1a' }}>
        <div style={{ color: '#c8b0ff' }}>로딩 중...</div>
      </div>
    }>
      <WeddingFindInner />
    </Suspense>
  )
}
