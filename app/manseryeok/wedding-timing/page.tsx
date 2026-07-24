'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const cardBg = '#FFFBF7'
const sub = '#b4785a'
const text = '#3a2e28'
const gold = '#c8783c'

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
      const a = p1 ? JSON.parse(decodeURIComponent(p1)) as PersonInput : null
      const b = p2 ? JSON.parse(decodeURIComponent(p2)) as PersonInput : null
      // ★2026-07-24 — p1 을 무조건 신랑으로 읽지 않고 성별로 가린다.
      //   앞 화면(input)에서 이미 정렬해 보내지만, 옛 보관함 링크처럼
      //   순서가 뒤바뀐 채 들어오는 경로가 있어 여기서도 한 번 더 본다.
      const swap = a?.gender === '여' && b?.gender === '남'
      setGroom(swap ? b : a)
      setBride(swap ? a : b)
      const q = new URLSearchParams()
      if (p1) q.set('p1', swap ? p2! : p1)
      if (p2) q.set('p2', swap ? p1! : p2)
      setQuery(q.toString())
    } catch {}
  }, [sp])

  const go = (path: string) => {
    router.push(`/manseryeok/wedding-timing/${path}${query ? '?' + query : ''}`)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.push('/manseryeok/wedding-timing/input')}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>결혼택일</div>
          <div style={{ fontSize: 10.5, color: '#5c3a1e' }}>무엇을 도와드릴까요?</div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <Disclaimer />

        <div style={{ fontSize: '13px', color: '#96502e', fontWeight: 600, margin: '20px 0 10px' }}>두 사람 정보</div>
        <div style={{ background: cardBg, borderRadius: '12px', padding: '14px', border: '1px solid #f0e0d5' }}>
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

        <div style={{ fontSize: '13px', color: '#96502e', fontWeight: 600, margin: '24px 0 10px' }}>무엇을 도와드릴까요?</div>

        <button onClick={() => go('check')}
          className="active:scale-95"
          style={{ width: '100%', textAlign: 'left', background: cardBg, border: '1px solid #f0e0d5', borderRadius: '14px', padding: '16px', marginBottom: '10px', cursor: 'pointer', transition: 'transform 0.15s ease' }}>
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
          style={{ width: '100%', textAlign: 'left', background: cardBg, border: '1px solid #f0e0d5', borderRadius: '14px', padding: '16px', cursor: 'pointer', transition: 'transform 0.15s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px' }}>💍</span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: text }}>좋은 날 찾아주기</span>
          </div>
          <div style={{ fontSize: '12px', color: sub, lineHeight: 1.6, paddingLeft: '28px' }}>
            희망하는 기간을 주시면 두 분께 맞는 날을 모두 찾아드려요
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FDF6F0' }}>
        <div style={{ color: '#96502e' }}>로딩 중...</div>
      </div>
    }>
      <MenuInner />
    </Suspense>
  )
}
