'use client'
import { Suspense, useState, useEffect, type ReactNode } from 'react'
//  ★2026-09-09 — 결제 시트는 공용 부품 «한 곳» 입니다 [대표님 「통일」]
import WalletPaySheet from '@/app/components/common/WalletPaySheet'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import WeddingRangeCalendar from '../components/WeddingRangeCalendar'

const purple = '#b46e46'
const cardBg = '#FFFBF7'
const sub = '#b4785a'
const text = '#3a2e28'

const HOUR_LABELS: Record<string, string> = {
  '-1': '시간 모름',
  '0': '子시(23:30~01:30)', '1': '丑시(01:30~03:30)', '2': '寅시(03:30~05:30)', '3': '卯시(05:30~07:30)',
  '4': '辰시(07:30~09:30)', '5': '巳시(09:30~11:30)', '6': '午시(11:30~13:30)', '7': '未시(13:30~15:30)',
  '8': '申시(15:30~17:30)', '9': '酉시(17:30~19:30)', '10': '戌시(19:30~21:30)', '11': '亥시(21:30~23:30)',
}

interface PersonInput {
  year: string; month: string; day: string; hour: string
  gender: string; calType: string; job: string; mbti: string
}

interface WeddingSurvey {
  startDate: string
  endDate: string
}

const DEFAULT_SURVEY: WeddingSurvey = { startDate: '', endDate: '' }

const SURVEY_KEY = 'wedding-timing-survey'

function Disclaimer({ full }: { full?: boolean }) {
  return (
    <div style={{ background: 'rgba(255,120,120,0.06)', border: '1px solid rgba(193,69,69,0.65)', borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#d88', lineHeight: 1.6 }}>
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
        background: active ? '#f6e3d6' : '#FFFBF7',
        color: active ? '#96502e' : '#b4785a',
        border: '1px solid ' + (active ? '#c8783c' : '#f0e0d5'),
      }}>
      {label}
    </button>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: '13px', color: '#96502e', fontWeight: 600, margin: '20px 0 10px' }}>{children}</div>
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
    // ★v7: 옛 /result(점수제 화면)를 접고 /pick(필터 화면)으로 보낸다.
    //   되돌리려면 이 경로만 바꾸면 된다.
    router.push('/manseryeok/wedding-timing/pick?' + params.toString())
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #9c7a58', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>결혼 길일 택일</div>
          <div style={{ fontSize: 10.5, color: '#5c3a1e' }}>두 분께 좋은 결혼 날짜를 찾아드려요</div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <Disclaimer full />

        <SectionLabel>두 사람 정보</SectionLabel>
        <div style={{ background: cardBg, borderRadius: '12px', padding: '14px', border: '1px solid #9c7a58' }}>
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

        <WeddingRangeCalendar
          start={survey.startDate}
          end={survey.endDate}
          onChange={(s, e) => setSurvey(prev => ({ ...prev, startDate: s, endDate: e }))}
        />

        <div style={{ fontSize: '11px', color: sub, marginTop: '10px', lineHeight: 1.7 }}>
          주말만 볼지 평일까지 볼지는 <b style={{ color: '#96502e' }}>다음 화면에서</b> 켜고 끄며
          바로 확인하실 수 있어요.
        </div>

        {error && (
          <div style={{ marginTop: '14px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(193,69,69,0.65)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#C64B4B', lineHeight: 1.6 }}>
            {error}
          </div>
        )}

        <button onClick={handleAnalyze}
          style={{ width: '100%', marginTop: '20px', padding: '16px', borderRadius: '14px', background: '#b46e46', border: 'none', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
          💍 좋은 결혼 길일 찾기
        </button>

        <div style={{ marginTop: '14px' }}>
          <Disclaimer />
        </div>
      </div>

      {/* 🔴 ★2026-09-09 — 여기 있던 «자기 결제 팝업» 을 ★공용 시트로 바꿨습니다
          [대표님]  「기존에 있던 결제화면과 다르다 · ★통일시켜야 하는 것 아닌가?」
                    「궁합부터 타로까지 ai결제화면을 ★동일하게 붙여줘」
          ⚠️ 아홉 화면이 «저마다» 팝업을 갖고 있어서 결이 갈렸습니다.
          ⚠️ 늘어난 것 — ★「지갑 잔액」 · 「보시고 나면」 두 줄 (1부 3-1)
          ⛔⛔ 여기에 결제 팝업을 ★«다시 만들지» 마십시오 — 시트는 한 곳입니다.
          ⛔ 낱말(item)을 지어내지 마십시오 — mc_price 의 것입니다 (2부 5-2). */}
      <WalletPaySheet
        open={payOpen}
        title="💍 결혼 길일 택일"
        subtitle={"두 분께 맞는 좋은 날을 모두 찾아드려요"}
        includes={['희망 기간의 모든 날을 하루씩 판정', '공망·충·형을 미리 걸러낸 날짜 목록', '신부·신랑 용신일을 켜고 끄며 고르기', '각 조건이 무슨 뜻인지 설명']}
        item="wedding_pick"
        actionLabel="길일 찾기"
        onClose={() => setPayOpen(false)}
        onConfirm={() => { setPayOpen(false); handlePay() }}
          footer={<Disclaimer />}
      />
    </main>
  )
}

export default function WeddingFindPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FDF6F0' }}>
        <div style={{ color: '#96502e' }}>로딩 중...</div>
      </div>
    }>
      <WeddingFindInner />
    </Suspense>
  )
}
