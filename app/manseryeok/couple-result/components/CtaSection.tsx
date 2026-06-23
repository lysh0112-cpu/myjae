import { useRouter } from 'next/navigation'

export default function CtaSection({ commonMsg }: { commonMsg: string }) {
  const router = useRouter()

  return (
    <div style={{ background: '#13132a', borderRadius: '14px', padding: '16px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ borderLeft: '2px solid #7F77DD', padding: '8px 12px', fontSize: '11px', color: '#8888cc', fontStyle: 'italic', lineHeight: '1.6', marginBottom: '16px' }}>
        "{commonMsg}"
      </div>

      <button
        onClick={() => router.push('/manseryeok/consulting')}
        style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #5544bb, #7766dd)', border: 'none', color: '#e8e4ff', fontSize: '14px', fontWeight: '500', cursor: 'pointer', marginBottom: '8px' }}>
        전문가 상담 연결하기 →
      </button>

      <button
        onClick={() => router.push('/couple-chat')}
        style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(212,83,126,0.4)', color: '#f48fb1', fontSize: '13px', cursor: 'pointer', marginBottom: '16px' }}>
        💕 커플 채팅방 구독 (월 2,900원)
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: '명카페 궁합 결과', text: '우리 궁합 결과 확인해봐!', url: window.location.href })
            }
          }}
          style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8888cc', fontSize: '12px', cursor: 'pointer' }}>
          📤 결과 공유하기
        </button>
        <button
          onClick={() => router.push('/manseryeok/couple-input')}
          style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8888cc', fontSize: '12px', cursor: 'pointer' }}>
          🔄 다시 분석하기
        </button>
      </div>
    </div>
  )
}
