'use client'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/app/components/common/PageHeader'

// 작명 메뉴 (3상품) — 1차는 "내 이름 풀이"만 활성
const MENUS = [
  {
    key: 'diagnosis',
    emoji: '🔍',
    title: '내 이름 풀이',
    desc: '지금 내 이름이 내 사주에 잘 맞는지 풀어드려요',
    price: '9,900원',
    active: true,
  },
  {
    key: 'rename',
    emoji: '✏️',
    title: '개명 후보 추천',
    desc: '사주에 더 잘 맞는 이름 후보를 추천해드려요',
    price: '19,900원',
    active: false,
  },
  {
    key: 'newborn',
    emoji: '👶',
    title: '신생아 작명',
    desc: '우리 아기 사주에 맞는 좋은 이름을 지어드려요',
    price: '49,900원',
    active: false,
  },
]

function NamingMenuInner() {
  const router = useRouter()

  const gold = '#FAC775'
  const cardBg = '#2C2C2A'
  const border = '1px solid rgba(250,199,117,0.15)'

  return (
    <main style={{ minHeight: '100vh', background: '#1a1a18', maxWidth: '430px', margin: '0 auto', paddingBottom: '40px' }}>
      <PageHeader title="이름으로 보는 내 사주" onBack={() => router.push('/')} />

      <div style={{ padding: '16px' }}>
        {/* 소개 문구 */}
        <div style={{ textAlign: 'center', padding: '12px 8px 24px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: gold, marginBottom: '8px', lineHeight: 1.5 }}>
            이름에는 기운이 담겨 있어요
          </div>
          <div style={{ fontSize: '13px', color: '#8a88a0', lineHeight: 1.7 }}>
            사주에 필요한 기운을 이름이 채워주는지<br />
            연재 선생님의 기준으로 정성껏 풀어드립니다
          </div>
        </div>

        {/* 메뉴 카드들 */}
        {MENUS.map((m) => (
          <div
            key={m.key}
            onClick={() => {
              if (m.active) router.push('/manseryeok/naming/diagnosis')
            }}
            style={{
              background: cardBg,
              border,
              borderRadius: '16px',
              padding: '18px',
              marginBottom: '14px',
              cursor: m.active ? 'pointer' : 'default',
              opacity: m.active ? 1 : 0.45,
              position: 'relative',
              transition: 'transform 0.1s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '32px' }}>{m.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#e8e4ff' }}>{m.title}</span>
                  {!m.active && (
                    <span style={{ fontSize: '11px', color: '#8a88a0', border: '1px solid #555', borderRadius: '6px', padding: '1px 6px' }}>
                      준비 중
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#8a88a0', lineHeight: 1.6 }}>{m.desc}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: m.active ? gold : '#666' }}>{m.price}</div>
                {m.active && <div style={{ fontSize: '18px', color: gold, marginTop: '2px' }}>→</div>}
              </div>
            </div>
          </div>
        ))}

        {/* 안내 */}
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginTop: '20px', lineHeight: 1.7 }}>
          개명 추천과 신생아 작명은 곧 만나보실 수 있어요
        </div>
      </div>
    </main>
  )
}

export default function NamingMenuPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a18' }}>
        <div style={{ color: '#FAC775' }}>로딩 중...</div>
      </div>
    }>
      <NamingMenuInner />
    </Suspense>
  )
}
