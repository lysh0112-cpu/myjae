'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCoupleInput } from './hooks/useCoupleInput'
import RelationSelect from './components/RelationSelect'
import PersonForm from './components/PersonForm'
import PageHeader from '@/app/components/common/PageHeader'

const MY_INFO_KEY = 'myinfo'
const LAST_COUPLE_RESULT_KEY = 'couple_last_result_url'

function CoupleInputInner() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [lastResultUrl, setLastResultUrl] = useState('')
  const {
    relation, setRelation,
    person1, setPerson1,
    person2, setPerson2,
    question, setQuestion,
    autoLoaded, handleClear,
    handleClearPerson1,
    handleClearPerson2,
  } = useCoupleInput()

  // 이전 결과 URL 복원
  useEffect(() => {
    const lastUrl = localStorage.getItem(LAST_COUPLE_RESULT_KEY)
    if (lastUrl) setLastResultUrl(lastUrl)
  }, [])

  const handleStart = () => {
    const myInfo = sessionStorage.getItem(MY_INFO_KEY)
    if (!myInfo || !person1.year || !person1.month || !person1.day) {
      setError('먼저 홈화면에서 나의 생년월일을 입력하고 사주 분석을 해주세요 😊 나의 사주 정보가 있어야 더 정확한 궁합 분석이 가능해요!')
      return
    }
    if (!person2.year || !person2.month || !person2.day) {
      setError('상대방의 생년월일을 입력해주세요.'); return
    }
    setError('')
    const p1 = encodeURIComponent(JSON.stringify(person1))
    const p2 = encodeURIComponent(JSON.stringify(person2))
    const q = encodeURIComponent(question)
    const url = `/manseryeok/couple-result?mode=${relation}&person1=${p1}&person2=${p2}&userQuestion=${q}`
    // 결과 URL 저장
    localStorage.setItem(LAST_COUPLE_RESULT_KEY, url)
    setLastResultUrl(url)
    router.push(url)
  }

  const handleClearAll = () => {
    handleClear()
    localStorage.removeItem(LAST_COUPLE_RESULT_KEY)
    setLastResultUrl('')
  }

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
              <div style={{ fontSize: '11px', color: '#8a88a0', lineHeight: '1.5' }}>홈화면에서 나의 생년월일을 먼저 입력하시면 궁합 분석이 더 정확해져요 😊</div>
              <button onClick={() => router.push('/')}
                style={{ marginTop: '8px', fontSize: '11px', padding: '5px 12px', borderRadius: '20px', background: 'rgba(250,199,117,0.15)', color: '#FAC775', border: '1px solid rgba(250,199,117,0.3)', cursor: 'pointer' }}>
                홈으로 가서 입력하기 →
              </button>
            </div>
          </div>
        )}

        <RelationSelect relation={relation} setRelation={setRelation} />

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#5555aa', marginBottom: '10px' }}>두 사람 정보</div>
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

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#5555aa', marginBottom: '8px' }}>가장 궁금한 것 (선택)</div>
          <textarea value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="예) 우리 결혼해도 될까요?"
            rows={2}
            style={{ width: '100%', background: '#13132a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#e8e4ff', fontSize: '14px', outline: 'none', resize: 'none', lineHeight: '1.6', boxSizing: 'border-box' }} />
        </div>

        {error && (
          <div style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#ff8888', marginBottom: '12px', lineHeight: '1.6' }}>
            {error}
          </div>
        )}

        {/* 궁합 분석하기 버튼 */}
        <button onClick={handleStart}
          style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, #5544bb, #7766dd)', border: 'none', color: '#e8e4ff', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
          💑 궁합 분석하기
        </button>

        {/* 이전 결과 보기 버튼 — 데이터 있을 때만 표시 */}
        {lastResultUrl && (
          <button
            onClick={() => router.push(lastResultUrl)}
            style={{ width: '100%', marginTop: '8px', padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,176,255,0.2)', color: '#c8b0ff', fontSize: '13px', cursor: 'pointer' }}>
            📋 이전 궁합 결과 보기 →
          </button>
        )}

        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: '#333355' }}>
          기본 분석은 무료 · 심층 분석은 전문 상담사와 연결
        </div>
      </div>
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
