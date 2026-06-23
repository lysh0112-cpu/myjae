import { CoupleResultData } from '../hooks/useCoupleResult'

export default function AreaAnalysis({ result }: { result: CoupleResultData }) {
  return (
    <div style={{ background: '#13132a', borderRadius: '14px', padding: '16px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: '13px', fontWeight: '500', color: '#c8c0ff', marginBottom: '12px' }}>영역별 분석</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ background: 'rgba(60,52,137,0.2)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '11px', color: '#7F77DD', fontWeight: '500', marginBottom: '4px' }}>🔮 사주 — 운명의 조화</div>
          <div style={{ fontSize: '11px', color: '#8888cc', lineHeight: '1.5' }}>{result.sajuMsg}</div>
        </div>

        <div style={{ background: 'rgba(212,83,126,0.15)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '11px', color: '#D4537E', fontWeight: '500', marginBottom: '4px' }}>💼 직업 — 현실의 조화</div>
          <div style={{ fontSize: '11px', color: '#8888cc', lineHeight: '1.5' }}>{result.jobMsg}</div>
        </div>

        <div style={{ background: 'rgba(29,158,117,0.15)', borderRadius: '10px', padding: '10px 12px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '11px', color: '#1D9E75', fontWeight: '500', marginBottom: '4px' }}>💬 MBTI — 소통의 조화</div>
          <div style={{ fontSize: '11px', color: '#8888cc', lineHeight: '1.5', filter: 'blur(3px)' }}>{result.mbtiMsg}</div>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#13132a', border: '1px solid #1D9E75', borderRadius: '20px', padding: '4px 12px', fontSize: '11px', color: '#1D9E75', whiteSpace: 'nowrap' }}>
            🔒 상세보기 (유료)
          </div>
        </div>
      </div>
    </div>
  )
}
