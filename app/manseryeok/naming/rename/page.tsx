'use client'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/app/components/common/PageHeader'

// 작명 메뉴 (2버튼) — 둘 다 같은 작명 엔진을 쓰되 입구만 구분
const MENUS = [
  {
    key: 'diagnosis',
    emoji: '🔍',
    title1: '내 이름 풀이',
    title2: '+ 개명하기',
    desc: '지금 내 이름이 사주에 맞는지 풀어주고, 더 좋은 한자로 바꿔드려요',
    price: '9,900원~',
    href: '/manseryeok/naming/diagnosis',
  },
  {
    key: 'newborn',
    emoji: '👶',
    title1: '내 아기',
    title2: '이름짓기',
    desc: '사주에 맞는 새 이름을 직접 지어드려요',
    price: '5,000원~',
    href: '/manseryeok/naming/rename/newname',
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

        {/* 메뉴 카드 2개 (가로 2열) */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {MENUS.map((m) => (
            <div
              key={m.key}
              onClick={() => router.push(m.href)}
              className="active:scale-95"
              style={{
                flex: 1,
                background: cardBg,
                border,
                borderRadius: '16px',
                padding: '18px 14px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                transition: 'transform 0.1s',
              }}
            >
              <span style={{ fontSize: '34px', marginBottom: '10px' }}>{m.emoji}</span>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#e8e4ff', lineHeight: 1.4 }}>
                {m.title1}<br />{m.title2}
              </div>
              <div style={{ fontSize: '11px', color: '#8a88a0', lineHeight: 1.6, marginTop: '8px', minHeight: '34px' }}>
                {m.desc}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: gold, marginTop: '10px' }}>{m.price}</div>
            </div>
          ))}
        </div>

        {/* 안내 */}
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginTop: '24px', lineHeight: 1.7 }}>
          이름 풀이 후 한자만 바꾸거나, 새 이름을 새로 지을 수 있어요
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
