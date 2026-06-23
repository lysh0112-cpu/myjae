'use client'

export default function PaidLockSection({ onPay }: { onPay: () => void }) {
  return (
    <div style={{
      borderTop: '1px solid rgba(255,255,255,0.07)',
      padding: '20px',
      background: 'rgba(60,52,137,0.08)',
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '14px',
      }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#FAC775', marginBottom: '6px' }}>
          사주가 말해주는 나다운 삶의 방향
        </div>
        <div style={{ fontSize: '11px', color: '#8a88a0', lineHeight: '1.6' }}>
          성격 · 건강 · 연애 · 직업 · 재물 · 운세 · 앞으로 10년
        </div>
      </div>
      <button onClick={onPay}
        className="w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #3C3489 0%, #FAC775 100%)',
          color: '#1a1a18',
          boxShadow: '0 4px 20px rgba(60,52,137,0.4)',
        }}>
        ✨ 정밀하게 분석하기
      </button>
    </div>
  )
}
