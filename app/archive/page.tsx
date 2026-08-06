'use client'
import HomeBottomNav from '@/app/components/HomeBottomNav'

// ============================================================================
// 보관함 — 나의 운명 아카이브 전용 화면
// ----------------------------------------------------------------------------
// 하단 네비 "📚 보관함"으로 들어온다.
// 내용은 공용 부품 ArchiveList 하나가 전부 담당한다(목록·태그·다시보기·삭제).
// 이 파일은 헤더·하단네비 같은 껍데기만 씌운다.
// ============================================================================

import { useRouter } from 'next/navigation'
import ArchiveList from '@/app/manseryeok/components/ArchiveList'


export default function ArchivePage() {
  const router = useRouter()

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
        borderBottom: '0.5px solid #9c7a58',
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

      {/* ★48부 8차 — 하단바 ★부품 (HomeBottomNav). ⛔ 여기에 다시 적지 마십시오. */}
      <HomeBottomNav />
    </div>
  )
}
