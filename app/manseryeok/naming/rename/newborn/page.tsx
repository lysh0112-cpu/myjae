'use client'

import { useRouter } from 'next/navigation'

// 아기이름 짓기 — 준비중 안내 페이지
// (아기작명 기능은 폐쇄되었고, 홈 12지신 카드는 유지하기 위해 이 준비중 페이지로 연결한다)
export default function NewbornComingSoon() {
  const router = useRouter()

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#FDF6F0',
        maxWidth: 480,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 20 }}>👶</div>

      <div
        style={{
          fontSize: 22,
          fontWeight: 'bold',
          color: '#96502e',
          marginBottom: 12,
        }}
      >
        아기 이름 짓기
      </div>

      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#8f3d0e',
          marginBottom: 10,
        }}
      >
        준비 중이에요
      </div>

      <div
        style={{
          fontSize: 14,
          color: '#5c3a1e',
          lineHeight: 1.7,
          marginBottom: 36,
          maxWidth: 300,
        }}
      >
        더 좋은 모습으로 찾아뵙기 위해
        <br />
        정성껏 준비하고 있어요.
        <br />
        조금만 기다려 주세요 🌿
      </div>

      <button
        onClick={() => router.push('/home-new')}
        style={{
          padding: '14px 32px',
          borderRadius: 12,
          background: '#b46e46',
          color: '#fff',
          border: 'none',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        홈으로 돌아가기
      </button>
    </main>
  )
}
