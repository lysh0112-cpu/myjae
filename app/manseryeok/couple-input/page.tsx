'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCoupleInput } from './hooks/useCoupleInput'
import RelationSelect from './components/RelationSelect'
import PersonForm from './components/PersonForm'
import PageHeader from '@/app/components/common/PageHeader'
import { supabase } from '@/lib/supabase'

const MY_INFO_KEY = 'myinfo'
const LAST_COUPLE_RESULT_KEY = 'couple_last_result_url'

function CoupleInputInner() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [lastResultUrl, setLastResultUrl] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [pendingUrl, setPendingUrl] = useState('')
  const [price, setPrice] = useState(10000)
  const {
    relation, setRelation,
    person1, setPerson1,
    person2, setPerson2,
    question, setQuestion,
    autoLoaded, handleClear,
    handleClearPerson1,
    handleClearPerson2,
  } = useCoupleInput()

  useEffect(() => {
    const lastUrl = sessionStorage.getItem(LAST_COUPLE_RESULT_KEY)
    if (lastUrl) setLastResultUrl(lastUrl)
  }, [])

  useEffect(() => {
    supabase
      .from('analysis_prices')
      .select('price')
      .eq('price_key', 'couple_ai')
      .maybeSingle()
      .then(({ data }) => { if (data) setPrice(data.price) })
  }, [])

  const handleStart = () => {
    const myInfo = sessionStorage.getItem(MY_INFO_KEY)
    if (!myInfo || !person1.year || !person1.month || !person1.day) {
      setError('먼저 홈화면에서 나의 생년월일을 입력하고 사주 분석을 해주세요 😊 나의 사주 정보가 있어야 더 정확한 분석이 가능해요!')
      return
    }
    if (!person2.year || !person2.month || !person2.day) {
      setError('상대방의 생년월일을 입력해주세요.'); return
    }
    setError('')

    const p1 = encodeURIComponent(JSON.stringify(person1))
    const p2 = encodeURIComponent(JSON.stringify(person2))

    // 출산·결혼택일은 각자 화면(자체 결제 팝업 있음)으로 바로 이동
    if (relation === 'birth') {
      router.push(`/manseryeok/birth-timing?p1=${p1}&p2=${p2}`)
      return
    }
    if (relation === 'prewedding') {
      router.push(`/manseryeok/wedding-timing?p1=${p1}&p2=${p2}`)
      return
    }

    // 연인/부부 궁합 → 결제 팝업 먼저
    const q = encodeURIComponent(question)
    const url = `/manseryeok/couple-result?mode=${relation}&person1=${p1}&person2=${p2}&userQuestion=${q}`
    setPendingUrl(url)
    setPayOpen(true)
  }

  // 결제 팝업에서 '결제하기' 누르면 결과로 이동
  const goResult = () => {
    setPayOpen(false)
    sessionStorage.setItem(LAST_COUPLE_RESULT_KEY, pendingUrl)
    setLastResultUrl(pendingUrl)
    router.push(pendingUrl)
  }

  const handleClearAll = () => {
    handleClear()
    sessionStorage.removeItem(LAST_COUPLE_RESULT_KEY)
    setLastResultUrl('')
  }

  const isBirth = relation === 'birth'
  const isWedding = relation === 'prewedding'
  const startLabel = isBirth ? '🍼 좋은 출산일 찾기'
    : isWedding ? '💍 결혼 길일 찾기'
    : `💑 궁합 분석하기 · ${price.toLocaleString()}원`

  const isTiming = isBirth || isWedding

  return (
    <main style={{ minHeight: '100vh', background: '#0d0d1a', maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>

      <PageHeader
        title="궁합 분석"
        subtitle="나의 인연, 어디쯤 오고 있을까?"
        onBack={() => router.push('/')}
        rightButton={
          <button onClick={handleClearAll}
            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(255,80,80,0.1)', color: 'rgba(255,120,120,0.7)', border: '1px solid rgba(255,80,80,0.2)', cursor: 'pointer' }}>
            전체초기화
          </button>
        }
      />

      <div style={{ padding: '20px 16px' }}>

        {!autoLoaded && (
          <div style={{ background: 'rgba(250,199,117,0.08)', border: '1px solid rgba(250,199,117,0.2)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '18px' }}>💡</span>
            <div>
              <div style={{ fontSize: '12px', color: '#FAC775', fontWeight: '500', marginBottom: '4px' }}>나의 사주 정보가 없어요</div>
              <div style={{ fontSize: '11px', color: '#8a88a0', lineHeight: '1.5' }}>홈화면에서 나의 생년월일을 먼저 입력하시면 분석이 더 정확해져요 😊</div>
              <button onClick={() => router.push('/')}
                style={{ marginTop: '8px', fontSize: '11px', padding: '5px 12px', borderRadius: '20px', background: 'rgba(250,199,117,0.15)', color: '#FAC775', border: '1px solid rgba(250,199,117,0.3)', cursor: 'pointer' }}>
                홈으로 가서 입력하기 →
              </button>
            </div>
          </div>
        )}

        <RelationSelect relation={relation} setRelation={setRelation} />

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#5555aa', marginBottom: '10px' }}>
            {isBirth ? '부모 정보' : isWedding ? '신랑·신부 정보' : '두 사람 정보'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <PersonForm
              who={1}
              relation={relation}
              person={person1}
              onChange={(k, v) => setPerson1(prev => ({ ...prev, [k]: v }))}
              autoLoaded={autoLoaded}
              onClear={handleClearPerson1}
            />
            <PersonForm
              who={2}
              relation={relation}
              person={person2}
              onChange={(k, v) => setPerson2(prev => ({ ...prev, [k]: v }))}
              onClear={handleClearPerson2}
            />
          </div>
        </div>

        {!isTiming && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: '#5555aa', marginBottom: '8px' }}>가장 궁금한 것 (선택)</div>
            <textarea value={question} onChange={e => setQuestion(e.target.value)}
              placeholder="예) 우리 결혼해도 될까요?"
              rows={2}
              style={{ width: '100%', background: '#13132a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#e8e4ff', fontSize: '14px', outline: 'none', resize: 'none', lineHeight: '1.6', boxSizing: 'border-box' }} />
          </div>
        )}

        {isBirth && (
          <div style={{ marginBottom: '20px', background: 'rgba(119,102,221,0.08)', border: '1px solid rgba(119,102,221,0.25)', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#b8b4d8', lineHeight: 1.6 }}>
            👶 부모 두 분의 정보를 입력하시면, 다음 화면에서 출산예정일 등 몇 가지를 여쭤본 뒤 아기에게 좋은 출산일을 찾아드려요.
          </div>
        )}

        {isWedding && (
          <div style={{ marginBottom: '20px', background: 'rgba(119,102,221,0.08)', border: '1px solid rgba(119,102,221,0.25)', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#b8b4d8', lineHeight: 1.6 }}>
            💍 신랑·신부 두 분의 정보를 입력하시면, 다음 화면에서 희망 기간 등을 여쭤본 뒤 두 분께 좋은 결혼 길일을 찾아드려요.
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#ff8888', marginBottom: '12px', lineHeight: '1.6' }}>
            {error}
          </div>
        )}

        <button onClick={handleStart}
          style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, #5544bb, #7766dd)', border: 'none', color: '#e8e4ff', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
          {startLabel}
        </button>

        {!isTiming && lastResultUrl && (
          <button
            onClick={() => router.push(lastResultUrl)}
            style={{ width: '100%', marginTop: '8px', padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,176,255,0.2)', color: '#c8b0ff', fontSize: '13px', cursor: 'pointer' }}>
            📋 이전 결과 보기 →
          </button>
        )}
      </div>

      {/* 궁합 분석 결제 팝업 (연인/부부 궁합만) */}
      {payOpen && (
        <div onClick={() => setPayOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', background: '#15152e', borderRadius: '20px 20px 0 0', padding: '10px 20px 28px', boxShadow: '0 -8px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)', margin: '0 auto 18px' }} />
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#e8e4ff', marginBottom: '4px' }}>💑 궁합 분석</div>
            <div style={{ fontSize: '13px', color: '#5555aa', marginBottom: '16px', lineHeight: 1.6 }}>
              두 사람의 사주로 인연의 흐름을 풀어드려요
            </div>

            <div style={{ background: '#13132a', borderRadius: '12px', padding: '14px', marginBottom: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '12px', color: '#5555aa', marginBottom: '8px' }}>분석 내용</div>
              {['두 사람 궁합 점수', '사주·직업·소통의 조화', '관계 개선 방향', '함께 걸어갈 길 안내'].map((t, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#b8b4d8', lineHeight: 1.9 }}>· {t}</div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', color: '#5555aa' }}>결제 금액</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#c8b0ff' }}>{price.toLocaleString()}원</span>
            </div>

            <button onClick={goResult}
              style={{ width: '100%', padding: '15px', borderRadius: '12px', background: 'linear-gradient(135deg,#5544bb,#7766dd)', border: 'none', color: '#e8e4ff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginBottom: '8px' }}>
              💳 {price.toLocaleString()}원 결제하고 결과 보기
            </button>
            <button onClick={() => setPayOpen(false)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#5555aa', fontSize: '13px', cursor: 'pointer' }}>
              취소
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default function CoupleInputPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d1a' }}>
        <div style={{ color: '#FAC775' }}>로딩 중...</div>
      </div>
    }>
      <CoupleInputInner />
    </Suspense>
  )
}
