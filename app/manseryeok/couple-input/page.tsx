'use client'
import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCoupleInput } from './hooks/useCoupleInput'
import RelationSelect from './components/RelationSelect'
import PersonForm from './components/PersonForm'

function CoupleInputInner() {
  const router = useRouter()
  const [error, setError] = useState('')
  const {
    relation, setRelation,
    person1, setPerson1,
    person2, setPerson2,
    question, setQuestion,
    autoLoaded, handleClear,
  } = useCoupleInput()

  const handleStart = () => {
    if (!person1.year || !person1.month || !person1.day) {
      setError('나의 생년월일을 입력해주세요.'); return
    }
    if (!person2.year || !person2.month || !person2.day) {
      setError('상대방의 생년월일을 입력해주세요.'); return
    }
    setError('')
    const p1 = encodeURIComponent(JSON.stringify(person1))
    const p2 = encodeURIComponent(JSON.stringify(person2))
    const q = encodeURIComponent(question)
    router.push(`/manseryeok/couple-result?mode=${relation}&person1=${p1}&person2=${p2}&userQuestion=${q}`)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0d0d1a', maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>

      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: 0, background: '#0d0d1a', zIndex: 10 }}>
        <button onClick={() => router.push('/')}
          style={{ fontSize: '20px', color: '#9d8cff', background: 'none', border: 'none', cursor: 'pointer' }}>‹</button>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#e8e4ff' }}>궁합 분석</div>
          <div style={{ fontSize: '10px', color: '#9d8cff', fontStyle: 'italic' }}>나의 인연, 어디쯤 오고 있을까?</div>
        </div>
        <button onClick={handleClear}
          style={{ marginLeft: 'auto', fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(255,80,80,0.1)', color: 'rgba(255,120,120,0.7)', border: '1px solid rgba(255,80,80,0.2)', cursor: 'pointer' }}>
          초기화
        </button>
      </div>

      <div style={{ padding: '20px 16px' }}>

        <RelationSelect relation={relation} setRelation={setRelation} />

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#5555aa', marginBottom: '10px' }}>두 사람 정보</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <PersonForm who={1} relation={relation} person={person1}
              onChange={(k, v) => setPerson1(prev => ({ ...prev, [k]: v }))}
              autoLoaded={autoLoaded} />
            <PersonForm who={2} relation={relation} person={person2}
              onChange={(k, v) => setPerson2(prev => ({ ...prev, [k]: v }))} />
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
          <div style={{ fontSize: '12px', color: '#ff8888', marginBottom: '12px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button onClick={handleStart}
          style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, #5544bb, #7766dd)', border: 'none', color: '#e8e4ff', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
          💑 궁합 분석하기
        </button>

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
