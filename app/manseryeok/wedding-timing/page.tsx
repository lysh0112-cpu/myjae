'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PageHeader from '@/app/components/common/PageHeader'

const cardBg = '#13132a'
const sub = '#5555aa'
const text = '#e8e4ff'
const gold = '#FAC775'

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

function Disclaimer() {
  return (
    <div style={{ background: 'rgba(255,120,120,0.06)', border: '1px solid rgba(255,120,120,0.18)', borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#d88', lineHeight: 1.6 }}>
      ※ 본 분석은 전통 사주명리에 기반한 참고 정보입니다. 실제 예식일은 양가·예식장 사정과 두 분의 형편을 함께 고려해 결정하세요.
    </div>
  )
}

function personSummary(p: PersonInput | null): string {
  if (!p || !p.year) return '정보 없음'
  const hour = HOUR_LABELS[p.hour] ?? '시간 모름'
  return `${p.gender} · ${p.calType} ${p.year}.${p.month}.${p.day} · ${hour}`
}

function MenuInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [groom, setGroom] = useState<PersonInput | null>(null)
  const [bride, setBride] = useState<PersonInput | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    try {
      const p1 = sp.get('p1')
      const p2 = sp.get('p2')
      if (p1) setGroom(JSON.parse(decodeURIComponent(p1)))
      if (p2) setBride(JSON.parse(decodeURIComponent(p2)))
      const q = new URLSearchParams()
      if (p1) q.set('p1', p1)
      if (p2) q.set('p2', p2)
      setQuery(q.toString())
    } catch {}
  }, [sp])

  const go = (path: string) => {
    router.push(`/manseryeok/wedding-timing/${path}${query ? '?' + query : ''}`)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0d0d1a', maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>
      <PageHeader
        title="결혼 택일"
        subtitle="무엇을 도와드릴까요?"
        onBack={() => router.push('/manseryeok/couple-input')}
      />

      <div style={{ padding: '16px' }}>
        <Disclaimer />

        <div style={{ fontSize: '13px', color: '#c8c0ff', fontWeight: 600, margin: '20px 0 10px' }}>두 사람 정보</div>
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

        <div style={{ fontSize: '13px', color: '#c8c0ff', fontWeight: 600, margin: '24px 0 10px' }}>무엇을 도와드릴까요?</div>

        <button onClick={() => go('check')}
          className="active:scale-95"
          style={{ width: '100%', textAlign: 'left', background: cardBg, border: '1px solid rgba(119,102,221,0.35)', borderRadius: '14px', padding: '16px', marginBottom: '10px', cursor: 'pointer', transition: 'transform 0.15s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px' }}>📅</span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: text }}>정한 날 봐주기</span>
          </div>
          <div style={{ fontSize: '12px', color: sub, lineHeight: 1.6, paddingLeft: '28px' }}>
            이미 생각해 둔 날짜가 두 분께 좋은 날인지 봐드려요 (예식장·상견례 날짜 등)
          </div>
        </button>

        <button onClick={() => go('find')}
          className="active:scale-95"
          style={{ width: '100%', textAlign: 'left', background: cardBg, border: '1px solid rgba(119,102,221,0.35)', borderRadius: '14px', padding: '16px', cursor: 'pointer', transition: 'transform 0.15s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px' }}>💍</span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: text }}>좋은 날 찾아주기</span>
          </div>
          <div style={{ fontSize: '12px', color: sub, lineHeight: 1.6, paddingLeft: '28px' }}>
            희망하는 기간을 주시면 두 분께 좋은 결혼 길일 5개를 찾아드려요
          </div>
        </button>

        <div style={{ marginTop: '20px' }}>
          <div style={{ fontSize: '11px', color: sub, textAlign: 'center', lineHeight: 1.6 }}>
            <span style={{ color: gold }}>·</span> 정한 날이 아쉬우면, 거기서 바로 좋은 날 찾기로 이어드려요
          </div>
        </div>
      </div>
    </main>
  )
}

export default function WeddingMenuPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d1a' }}>
        <div style={{ color: '#c8b0ff' }}>로딩 중...</div>
      </div>
    }>
      <MenuInner />
    </Suspense>
  )
}
