'use client'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCoupleResult } from './hooks/useCoupleResult'
import ScoreBoard from './components/ScoreBoard'
import SajuSummary from './components/SajuSummary'
import AreaAnalysis from './components/AreaAnalysis'
import CtaSection from './components/CtaSection'

function CoupleResultInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const person1 = JSON.parse(decodeURIComponent(searchParams.get('person1') || '{}'))
  const person2 = JSON.parse(decodeURIComponent(searchParams.get('person2') || '{}'))

  const result = useCoupleResult(person1, person2)

  if (!result) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d1a' }}>
        <div style={{ color: '#FAC775', fontSize: '14px' }}>분석 중...</div>
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0d0d1a', maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>

      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: 0, background: '#0d0d1a', zIndex: 10 }}>
        <button onClick={() => router.push('/manseryeok/couple-input')}
          style={{ fontSize: '20px', color: '#9d8cff', background: 'none', border: 'none', cursor: 'pointer' }}>‹</button>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#e8e4ff' }}>궁합 결과</div>
          <div style={{ fontSize: '10px', color: '#9d8cff', fontStyle: 'italic' }}>나의 인연, 어디쯤 오고 있을까?</div>
        </div>
        <button onClick={() => router.push('/')}
          style={{ marginLeft: 'auto', fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', color: '#8888cc', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
          홈
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        <ScoreBoard result={result} />
        <SajuSummary result={result} person1={person1} person2={person2} />
        <AreaAnalysis result={result} />
        <CtaSection commonMsg={result.commonMsg} />
      </div>

    </main>
  )
}

export default function CoupleResultPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d1a' }}>
        <div style={{ color: '#FAC775' }}>로딩 중...</div>
      </div>
    }>
      <CoupleResultInner />
    </Suspense>
  )
}
