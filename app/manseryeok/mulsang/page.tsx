'use client'
import { Suspense, useState, useEffect } from 'react'
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

const MY_INFO_KEY = 'myinfo'

function MulsangInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [info, setInfo] = useState<{
    gender: string; calType: string
    year: number; month: number; day: number
    leapMonth: string; hourIdx: number | null
  } | null>(null)

  useEffect(() => {
    const urlYear = parseInt(sp.get('year') || '0')
    if (urlYear) {
      const hourParam = sp.get('hour')
      setInfo({
        gender: sp.get('gender') || '남',
        calType: sp.get('calType') || '양력',
        year: urlYear,
        month: parseInt(sp.get('month') || '0'),
        day: parseInt(sp.get('day') || '0'),
        leapMonth: sp.get('leapMonth') || '0',
        hourIdx: hourParam === '모름' || hourParam === null ? null : parseInt(hourParam),
      })
      return
    }
    const saved = localStorage.getItem(MY_INFO_KEY)
    if (saved) {
      try {
        const m = JSON.parse(saved)
        if (m.year) {
          setInfo({
            gender: m.gender || '남',
            calType: m.calType || '양력',
            year: parseInt(m.year),
            month: parseInt(m.month),
            day: parseInt(m.day),
            leapMonth: m.leapMonth || '0',
            hourIdx: m.hour === '모름' || m.hour == null ? null : parseInt(m.hour),
          })
        }
      } catch {}
    }
  }, [sp])

  const { saju, dayStem, converting } = useResultSaju(
    info?.calType || '양력',
    info?.year || 0,
    info?.month || 0,
    info?.day || 0,
    info?.leapMonth || '0',
    info?.hourIdx ?? null,
  )

  const [style, setStyle] = useState<'oriental' | 'ghibli'>('oriental')
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [commentary, setCommentary] = useState<Commentary | null>(null)

  const gold = '#FAC775'
  const cardBg = '#2C2C2A'
  const border = '1px solid rgba(250,199,117,0.15)'

  if (!info) {
    return (
      <main style={{ minHeight: '100vh', background: '#1a1a18', maxWidth: '430px', margin: '0 auto' }}>
        <PageHeader title="내 사주가 그림이 된다면?" onBack={() => router.push('/')} />
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8a88a0' }}>
          <p style={{ marginBottom: '20px' }}>먼저 홈에서 사주 정보를 입력해주세요.</p>
          <button onClick={() => router.push('/')}
            style={{ padding: '12px 24px', borderRadius: '12px', background: 'linear-gradient(135deg,#3C3489,#FAC775)', border: 'none', color: '#1a1a18', fontWeight: 'bold', cursor: 'pointer' }}>
            홈으로 가기 →
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
        dayStem, monthBranch,
        elementScores: yongsinResult.score,
        yongsin: yongsinResult.yongsin,
        style,
      })
      const sajuText = saju.map(p => `${p.pillar}:${p.stem}${p.branch}`).join(', ')
      const res = await fetch('/api/mulsang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: built.prompt, dayStem,
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
      setCommentary(data.commentary ?? null)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: '명카페 사주 풍경화', text: '내 사주를 그림으로 봤어요!', url: window.location.href })
    }
  }

  const branchList = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

  return (
    <main style={{ minHeight: '100vh', background: '#1a1a18', maxWidth: '430px', margin: '0 auto', paddingBottom: '40px' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <PageHeader title="내 사주가 그림이 된다면?" onBack={() => router.push('/')} />
      <div style={{ padding: '16px' }}>
        <div style={{ background: cardBg, border, borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#8a88a0', marginBottom: '6px' }}>내 사주</div>
          <div style={{ fontSize: '14px', color: '#e8e4ff' }}>
            {converting ? '사주를 불러오는 중...' : (
              <>일간 {dayStem} · {info.calType} {info.year}.{info.month}.{info.day}
                {info.hourIdx !== null && ` ${branchList[info.hourIdx]}시`}</>
            )}
          </div>
        </div>

        <div style={{ fontSize: '13px', color: '#8a88a0', marginBottom: '8px' }}>화풍 선택</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {(Object.keys(STYLE_CONFIGS) as Array<'oriental' | 'ghibli'>).map(key => (
            <button key={key} onClick={() => setStyle(key)} disabled={loading}
              style={{
                padding: '16px 8px', borderRadius: '12px', cursor: loading ? 'default' : 'pointer',
                background: style === key ? 'rgba(250,199,117,0.12)' : 'rgba(255,255,255,0.03)',
                border: style === key ? `2px solid ${gold}` : '1px solid rgba(255,255,255,0.08)',
                color: style === key ? gold : '#8a88a0', fontSize: '14px', fontWeight: 500,
              }}>
              {STYLE_CONFIGS[key].label}
            </button>
          ))}
        </div>

        <button onClick={handleGenerate} disabled={loading || converting}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', marginBottom: '20px',
            background: 'linear-gradient(135deg,#3C3489 0%,#FAC775 100%)',
            border: 'none', color: '#1a1a18', fontSize: '15px', fontWeight: 'bold',
            cursor: loading ? 'default' : 'pointer', opacity: loading || converting ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
          {loading ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>✦</span>
              그림과 해설을 만드는 중...
            </>
          ) : '✨ 나의 사주 그림 그리기'}
        </button>

        {/* 로딩 중 안내 박스 */}
        {loading && (
          <div style={{ background: cardBg, border, borderRadius: '14px', padding: '40px 20px', marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '40px', display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>✦</span>
            <div style={{ textAlign: 'center', color: gold, fontSize: '13px', lineHeight: 1.7 }}>
              당신의 사주를 풍경으로 그리고 있어요<br />
              <span style={{ color: '#8a88a0', fontSize: '12px' }}>잠시만 기다려 주세요 (최대 1분)</span>
            </div>
          </div>
        )}

        {!loading && (imageUrl || commentary) && (
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

        {!loading && commentary && (
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

        {!loading && commentary && (
          <button onClick={() => router.push('/manseryeok/consulting')}
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
