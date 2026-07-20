'use client'

// ============================================================================
// 보관함 — 나의 운명 아카이브 전용 화면
// ----------------------------------------------------------------------------
// 하단 네비 "📚 보관함"으로 들어온다.
// 내용은 공용 부품 ArchiveList 하나가 전부 담당한다(목록·태그·다시보기·삭제).
// 이 파일은 헤더·하단네비 같은 껍데기만 씌운다.
// ============================================================================

import { useRouter, usePathname } from 'next/navigation'
import ArchiveList from '@/app/manseryeok/components/ArchiveList'

const NAV = [
  { icon: '🏠', label: '홈', href: '/home-new' },
  { icon: '⊞', label: '서비스', href: '', wip: true },
  { icon: '💬', label: '상담', href: '/manseryeok/reviews' },
  { icon: '📚', label: '보관함', href: '/archive' },
]

export default function ArchivePage() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div style={{
      minHeight: '100vh', background: '#FDF6F0', maxWidth: 430, margin: '0 auto',
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif", color: '#3a2e28',
      paddingBottom: 72,
    }}>
      {/* 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '13px 16px',
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #f0e0d5',
      }}>
        <button
          onClick={() => router.push('/home-new')}
          aria-label="홈으로"
          style={{ background: 'none', border: 'none', fontSize: 18, color: '#5c3a1e', cursor: 'pointer', padding: 0, lineHeight: 1 }}
        >←</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#3a2e28' }}>📚 보관함</span>
      </div>

      <main style={{ padding: '12px 16px 20px' }}>
        <ArchiveList />
      </main>

      {/* 하단 고정 네비게이션 */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        display: 'flex', background: '#FFFBF7',
        borderTop: '0.5px solid #f0e0d5', zIndex: 20,
      }}>
        {NAV.map((n) => {
          const active = n.href === pathname
          return (
            <button
              key={n.label}
              onClick={() => { if (n.wip) { alert('작업 중이에요. 곧 만나요!') } else { router.push(n.href) } }}
              style={{
                flex: 1, padding: '10px 0', background: 'none', border: 'none',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 3,
              }}
            >
              <span style={{ fontSize: 18 }}>{n.icon}</span>
              <span style={{ fontSize: 10, color: active ? '#c8783c' : '#b09079', fontWeight: active ? 600 : 400 }}>
                {n.label}
              </span>
              {/* 현재 위치 표시 — 아이콘을 흐리게 하는 대신 밑줄로 */}
              <span style={{ height: 2, width: 22, borderRadius: 2, background: active ? '#c8783c' : 'transparent' }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
