'use client'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCoupleResult } from './hooks/useCoupleResult'
import ScoreBoard from './components/ScoreBoard'
import SajuSummary from './components/SajuSummary'
import AreaAnalysis from './components/AreaAnalysis'
import CtaSection from './components/CtaSection'
import PageHeader from '@/app/components/common/PageHeader'
const MODE_TITLES: Record<string, { title: string; sub: string }> = {
  couple:     { title: '궁합 결과',     sub: '나의 인연, 어디쯤 오고 있을까?' },
  prewedding: { title: '결혼 택일 결과', sub: '두 사람에게 가장 좋은 날을 골랐어요' },
  married:    { title: '부부 궁합 결과', sub: '더 깊이 이해하고 더 행복하게' },
  birth:      { title: '출산 시기 결과', sub: '새 생명을 맞이할 최적의 시기예요' },
}
function CoupleResultInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const person1 = JSON.parse(decodeURIComponent(searchParams.get('person1') || '{}'))
  const person2 = JSON.parse(decodeURIComponent(searchParams.get('person2') || '{}'))
  const userQuestion = decodeURIComponent(searchParams.get('userQuestion') || '')
  const mode = searchParams.get('mode') || 'couple'
  const result = useCoupleResult(person1, person2, userQuestion, mode)
  const titleInfo = MODE_TITLES[mode] || MODE_TITLES.couple
  if (!result) {
    return (
      <>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0d0d1a', gap: '12px' }}>
          <div style={{ fontSize: '32px', animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>✦</div>
          <div style={{ color: '#FAC775', fontSize: '14px' }}>
            {mode === 'prewedding' ? '두 분의 사주로 좋은 날을 찾고 있어요...' :
             mode === 'birth' ? '최적의 출산 시기를 분석 중이에요...' :
             '궁합을 분석 중이에요...'}
          </div>
        </div>
      </>
    )
  }
  return (
    <main style={{ minHeight: '100vh', background: '#0d0d1a', maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>
      <PageHeader
        title={titleInfo.title}
        subtitle={titleInfo.sub}
        onBack={() => router.push('/manseryeok/couple-input')}
      />
      <div style={{ padding: '16px' }}>
        {userQuestion && (
          <div style={{ background: 'rgba(250,199,117,0.08)', border: '1px solid rgba(250,199,117,0.2)', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#FAC775' }}>
            💬 "{userQuestion}"
          </div>
        )}
        {mode !== 'prewedding' && mode !== 'birth' && (
          <ScoreBoard result={result} />
        )}
        <SajuSummary result={result} person1={person1} person2={person2} mode={mode} />
        <AreaAnalysis result={result} mode={mode} />
        <CtaSection commonMsg={result.commonMsg} mode={mode} />
      </div>
    </main>
  )
}
export default function CoupleResultPage() {
  return (
    <Suspense fallback={
      <>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0d0d1a', gap: '12px' }}>
          <div style={{ fontSize: '32px', animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>✦</div>
          <div style={{ color: '#FAC775', fontSize: '14px' }}>로딩 중...</div>
        </div>
      </>
    }>
      <CoupleResultInner />
    </Suspense>
  )
}
