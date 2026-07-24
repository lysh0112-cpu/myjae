// app/manseryeok/exam-luck/page.tsx
// ============================================================================
//  합격운 / 취업운 — 자리만 잡아 둔 화면
//
//  ★2026-07-24 — 연인궁합·부부궁합을 하나로 합치면서 빈 자리에 넣었다.
//    아직 내용은 없다. 홈에서 눌렀을 때 아무것도 없으면 고장인 줄 아시므로
//    "준비 중"임을 알리고 돌아갈 길을 둔다.
//
//  ※ 다음에 만들 때 이 파일을 지우고 실제 화면으로 바꾸면 된다.
//    다른 서비스처럼 보관함(exam-storage) → 입력 → 결과 흐름이 될 가능성이 크다.
// ============================================================================
'use client'

import { useRouter } from 'next/navigation'

export default function ExamLuckPage() {
  const router = useRouter()

  return (
    <main style={{
      minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* 머리말 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button
          onClick={() => router.push('/home-new')}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}
        >←</button>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>합격운 / 취업운</div>
      </div>

      {/* 본문 */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14, padding: '40px 24px',
      }}>
        <div style={{ fontSize: 40 }}>🌱</div>

        <div style={{ textAlign: 'center', lineHeight: 1.8 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#96502e', marginBottom: 6 }}>
            지금 준비하고 있어요
          </div>
          <div style={{ fontSize: 12.5, color: '#8a7063', letterSpacing: '-.01em' }}>
            시험과 일자리의 흐름을 보는 자리예요.<br />
            곧 만나 보실 수 있도록 다듬고 있습니다.
          </div>
        </div>

        <button
          onClick={() => router.push('/home-new')}
          style={{
            marginTop: 8, background: '#b46e46', border: 'none', borderRadius: 12,
            color: '#fff', fontSize: 13.5, fontWeight: 600, padding: '12px 26px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          홈으로 돌아가기
        </button>
      </div>
    </main>
  )
}
