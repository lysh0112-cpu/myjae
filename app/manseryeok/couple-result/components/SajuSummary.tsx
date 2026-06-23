import { CoupleResultData } from '../hooks/useCoupleResult'

export default function SajuSummary({ result }: { result: CoupleResultData }) {
  return (
    <div style={{ background: '#13132a', borderRadius: '14px', padding: '16px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: '13px', fontWeight: '500', color: '#c8c0ff', marginBottom: '12px' }}>사주 요약</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ background: 'rgba(60,52,137,0.2)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '11px', color: '#7F77DD', marginBottom: '3px' }}>나</div>
          <div style={{ fontSize: '12px', color: '#c8c0ff' }}>{result.person1Summary}</div>
        </div>
        <div style={{ background: 'rgba(212,83,126,0.15)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '11px', color: '#D4537E', marginBottom: '3px' }}>상대방</div>
          <div style={{ fontSize: '12px', color: '#c8c0ff' }}>{result.person2Summary}</div>
        </div>
      </div>

      <div style={{ marginTop: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '10px 12px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ fontSize: '11px', color: '#8888cc', lineHeight: '1.5', filter: 'blur(3px)' }}>
          두 분의 오행을 합치면 목·화가 강하고 금·수가 보완됩니다. 서로의 부족한 기운을 채워주는 이상적인 조합으로 함께할수록 더욱 강해지는 인연이에요.
        </div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#13132a', border: '1px solid #7F77DD', borderRadius: '20px', padding: '4px 12px', fontSize: '11px', color: '#c8b0ff', whiteSpace: 'nowrap' }}>
          🔒 상세보기 (유료)
        </div>
      </div>
    </div>
  )
}
