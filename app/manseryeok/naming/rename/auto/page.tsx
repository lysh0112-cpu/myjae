'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'
const GREEN = '#81c784'

const ALL = [
  { name: '吳娟熙', read: '오연희', grade: '좋음', key: '娟' },
  { name: '吳瑞潤', read: '오서윤', grade: '좋음', key: '瑞' },
  { name: '吳沇河', read: '오연하', grade: '좋음', key: '沇' },
  { name: '吳涓汐', read: '오연석', grade: '보통', key: '涓' },
  { name: '吳潗演', read: '오집연', grade: '보통', key: '演' },
  { name: '吳渷潾', read: '오연린', grade: '좋음', key: '渷' },
  { name: '吳洐沛', read: '오행패', grade: '보통', key: '洐' },
  { name: '吳浤湕', read: '오굉건', grade: '좋음', key: '浤' },
  { name: '吳潓澐', read: '오혜운', grade: '보통', key: '潓' },
  { name: '吳澔涀', read: '오호현', grade: '좋음', key: '澔' },
]

function AutoInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const n = Number(sp.get('n') || 5)
  const list = ALL.slice(0, n)

  return (
    <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 16px' }}>
        <button onClick={() => router.push('/manseryeok/naming')} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 20, cursor: 'pointer' }}>{'\u2039'}</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>추천 이름 {n}개</span>
      </div>
      <p style={{ fontSize: 12, color: SUB, margin: '0 0 16px', padding: '0 4px' }}>
        사주(용신)에 맞춰 지은 이름입니다 · 하나를 누르면 상세 해설
      </p>

      {list.map((x) => (
        <button key={x.name}
          onClick={() => router.push('/manseryeok/naming/rename/result?hanja=' + encodeURIComponent(x.key))}
          className="active:scale-95"
          style={{ width: '100%', textAlign: 'left', background: CARD, border: '1px solid rgba(250,199,117,0.15)',
            borderRadius: 14, padding: '13px 16px', marginBottom: 9, cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.15s ease' }}>
          <span>
            <span style={{ fontSize: 17, fontWeight: 600, color: '#fff', letterSpacing: 2 }}>{x.name}</span>
            <span style={{ fontSize: 12, color: SUB, marginLeft: 8 }}>{x.read}</span>
          </span>
          <span style={{ fontSize: 12, padding: '3px 9px', borderRadius: 6,
            background: x.grade === '좋음' ? 'rgba(129,199,132,0.18)' : 'rgba(138,136,160,0.18)',
            color: x.grade === '좋음' ? GREEN : SUB }}>{x.grade}</span>
        </button>
      ))}
    </main>
  )
}

export default function AutoRecPage() {
  return (
    <Suspense fallback={<div style={{ background: '#1f1e1c', minHeight: '100vh' }} />}>
      <AutoInner />
    </Suspense>
  )
}
