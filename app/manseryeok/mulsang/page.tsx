'use client'
import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsin } from '@/lib/saju/yongsin'
import { buildMulsangPrompt, STYLE_CONFIGS } from '@/lib/saju/mulsangPrompt'
import PageHeader from '@/app/components/common/PageHeader'

interface Commentary {
  title: string
  subject: string
  environment: string
  yongsin: string
  advice: string
}

function MulsangInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const gender = sp.get('gender') || '남'
  const calType = sp.get('calType') || '양력'
  const yearParam = parseInt(sp.get('year') || '0')
  const monthParam = parseInt(sp.get('month') || '0')
  const dayParam = parseInt(sp.get('day') || '0')
  const leapMonth = sp.get('leapMonth') || '0'
  const hourParam = sp.get('hour')
  const hourIdx = hourParam === '모름' || hourParam === null ? null : parseInt(hourParam)

  const { saju, dayStem, converting } =
    useResultSaju(calType, yearParam, monthParam, dayParam, leapMonth, hourIdx)

  const [style, setStyle] = useState<'oriental' | 'ghibli'>('oriental')
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageNote, setImageNote] = useState('')
  const [commentary, setCommentary] = useState<Commentary | null>(null)

  if (!yearParam || !monthParam || !dayParam) {
    return (
      <main style={{ minHeight: '100vh', background: '#1a1a18', maxWidth: '430px', margin: '0 auto' }}>
        <PageHeader title="내 사주가 그림이 된다면?" onBack={() => router.push('/')} />
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8a88a0' }}>
          <p style={{ marginBottom: '20px' }}>먼저 사주 정보를 입력해주세요.</p>
          <button
            onClick={() => router.push('/manseryeok')}
            style={{ padding: '12px 24px', borderRadius: '12px', background: 'linear-gradient(135deg,#3C3489,#FAC775)', border: 'none', color: '#1a1a18', fontWeight: 'bold', cursor: 'pointer' }}>
            사주 입력하러 가기 →
          </button>
        </div>
      </main>
    )
  }

  async function handleGenerate() {
    if (!saju || saju.length === 0 || !dayStem) return
    setLoading(true)
    setImageUrl(null)
    setCommentary(null)

    try {
      const monthBranch = saju.find(p => p.pillar === '월주')?.branch ?? ''
      const yongsinResult = calcYongsin(saju, dayStem)

      const built = buildMulsangPrompt({
        dayStem,
        monthBranch,
        elementScores: yongsinResult.score,
        yongsin: yongsinResult.yongsin,
        style,
      })

      const sajuText = saju.map(p => `${p.pillar}:${p.stem}${p.branch}`).join(', ')

      const res = await fetch('/api/mulsang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: built.prompt,
          dayStem,
          dayElement: built.dayElement,
          strongElement: built.strongElement,
          yongsin: yongsinResult.yongsin,
          season: built.season,
          styleLabel: built.styleLabel,
          sajuText,
        }),
      })
      const data = await res.json()
      setImageUrl(data.imageUrl ?? null)
      setImageNote(data.imageNote ?? '')
      setCommentary(data.commentary ?? null)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: '명카페 사주 풍경화',
        text: '내 사주를 그림으로 봤어요!',
        url: window.location.href,
      })
    }
  }

  const gold = '#FAC775'
  const cardBg = '#2C2C2A'
  const border = '1px solid rgba(250,199,117,0.15)'

  return (
    <main style={{ minHeight: '100vh', background: '#1a1a18', maxWidth: '430px', margin: '0 auto', paddingBottom: '40px' }}>
      <PageHeader title="내 사주가 그림이 된다면?" onBack={() => router.push('/')} />

      <div style={{ padding: '16px' }}>
        <div style={{ background: cardBg, border, borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#8a88a0', marginBottom: '6px' }}>내 사주</div>
          <div style={{ fontSize: '14px', color: '#e8e4ff' }}>
            {converting ? '사주를 불러오는 중...' : (
              <>일간 {dayStem} · {calType} {yearParam}.{monthParam}.{dayParam}
                {hourIdx !== null && ` ${['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][hourIdx]}시`}</>
            )}
          </div>
        </div>

        <div style={{ fontSize: '13px', color: '#8a88a0', marginBottom: '8px' }}>화풍 선택</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {(Object.keys(STYLE_CONFIGS) as Array<'oriental' | 'ghibli'>).map(key => (
            <button
              key={key}
              onClick={() => setStyle(key)}
              style={{
                padding: '16px 8px', borderRadius: '12px', cursor: 'pointer',
                background: style === key ? 'rgba(250,199,117,0.12)' : 'rgba(255,255,255,0.03)',
                border: style === key ? `2px solid ${gold}` : '1px solid rgba(255,255,255,0.08)',
                color: style === key ? gold : '#8a88a0', fontSize: '14px', fontWeight: 500,
              }}>
              {STYLE_CONFIGS[key].label}
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || converting}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', marginBottom: '20px',
            background: 'linear-gradient(135deg,#3C3489 0%,#FAC775 100%)',
            border: 'none', color: '#1a1a18', fontSize: '15px', fontWeight: 'bold',
            cursor: loading ? 'default' : 'pointer', opacity: loading || converting ? 0.5 : 1,
          }}>
          {loading ? '✦ 그림을 그리는 중...' : '✨ 나의 사주 그림 그리기'}
        </button>

        {(imageUrl || (imageNote && !loading && commentary)) && (
          <div style={{ background: cardBg, border, borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
            {imageUrl ? (
              <img src={imageUrl} alt="사주 풍경화" style={{ width: '100%', display: 'block' }} />
            ) : (
              <div style={{ aspectRatio: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#5555aa', padding: '20px', textAlign: 'center' }}>
                <span style={{ fontSize: '40px' }}>🖼️</span>
                <span style={{ fontSize: '12px' }}>그림 생성은 곧 제공됩니다<br />(이미지 API 연결 후 활성화)</span>
              </div>
            )}
            {imageUrl && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', padding: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <a href={imageUrl} download style={{ fontSize: '13px', color: gold, textDecoration: 'none' }}>⬇ 저장</a>
                <button onClick={handleShare} style={{ fontSize: '13px', color: gold, background: 'none', border: 'none', cursor: 'pointer' }}>↗ 공유</button>
              </div>
            )}
          </div>
        )}

        {commentary && (
          <div style={{ background: cardBg, border, borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: gold, marginBottom: '12px' }}>
              "{commentary.title}"
            </div>
            {[
              { label: '주인공 (나)', text: commentary.subject },
              { label: '환경', text: commentary.environment },
              { label: '핵심 에너지 (용신)', text: commentary.yongsin },
              { label: '삶의 조언', text: commentary.advice },
            ].filter(s => s.text).map((s, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${gold}`, padding: '4px 12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: gold, marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '13px', color: '#e0dce8', lineHeight: 1.7 }}>{s.text}</div>
              </div>
            ))}
          </div>
        )}

        {commentary && (
          <button
            onClick={() => {
              const params = new URLSearchParams(sp.toString())
              router.push(`/manseryeok/consulting?${params.toString()}`)
            }}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'transparent', border: `1px solid ${gold}`, color: gold, fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            🔮 이 그림에 대해 전문가와 상담하기 →
          </button>
        )}
      </div>
    </main>
  )
}

export default function MulsangPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a18' }}>
        <div style={{ color: '#FAC775' }}>로딩 중...</div>
      </div>
    }>
      <MulsangInner />
    </Suspense>
  )
}
