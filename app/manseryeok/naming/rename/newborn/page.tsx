'use client'
// 임시 '준비 중' 안내 페이지.
//   아기이름 짓기 서비스는 중단됨. 홈의 카드는 남겨두되(나중에 다른 서비스로 재활용),
//   눌러도 죽은 링크가 되지 않게 이 안내 화면으로 연결한다.
//   ★ 재활용 시: 홈 카드의 name/href를 바꾸고, 이 파일을 새 서비스로 교체하면 됨.
import { useRouter } from 'next/navigation'

const GOLD = '#c8783c'
const SUB = '#b4785a'

export default function ComingSoonPage() {
  const router = useRouter()
  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <div style={{ padding: '13px 4px' }}>
        <button onClick={() => router.push('/')} aria-label="홈으로"
          style={{ background: 'none', border: 'none', color: '#999', fontSize: 20, cursor: 'pointer', padding: 0 }}>
          {'\u2039'}
        </button>
      </div>

      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 18 }}>🌱</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: GOLD, marginBottom: 10 }}>
          준비 중이에요
        </div>
        <div style={{ fontSize: 13, color: SUB, lineHeight: 1.8, marginBottom: 28 }}>
          이 서비스는 지금 준비하고 있어요.<br />
          조금만 기다려 주세요.
        </div>
        <button onClick={() => router.push('/')}
          style={{ padding: '13px 26px', borderRadius: 12, background: 'rgba(200,120,60,0.12)', border: '1px solid ' + GOLD, color: GOLD, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          홈으로 돌아가기 →
        </button>
      </div>
    </main>
  )
}
