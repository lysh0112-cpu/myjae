import { CoupleResultData } from '../hooks/useCoupleResult'

export default function ScoreBoard({ result }: { result: CoupleResultData }) {
  return (
    <div style={{ background: '#13132a', borderRadius: '14px', padding: '20px 16px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
      <div style={{ fontSize: '11px', color: '#5555aa', marginBottom: '8px' }}>두 분의 궁합 점수</div>
      <div style={{ fontSize: '52px', fontWeight: '700', color: '#c8b0ff', lineHeight: 1 }}>{result.totalScore}</div>
      <div style={{ fontSize: '14px', fontWeight: '500', color: '#c8b0ff', margin: '6px 0 4px' }}>{result.grade}</div>
      <div style={{ fontSize: '11px', color: '#8888cc', fontStyle: 'italic', marginBottom: '16px' }}>{result.gradeDesc}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          { label: '🔮 사주 (운명)', score: result.sajuScore, max: 60, color: '#7F77DD' },
          { label: '💼 직업 (현실)', score: result.jobScore, max: 15, color: '#D4537E' },
          { label: '💬 MBTI (소통)', score: result.mbtiScore, max: 25, color: '#1D9E75' },
        ].map(item => (
          <div key={item.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8888cc', marginBottom: '4px' }}>
              <span>{item.label}</span>
              <span style={{ color: item.color, fontWeight: '500' }}>{item.score} / {item.max}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '20px', height: '7px' }}>
              <div style={{ background: item.color, height: '7px', borderRadius: '20px', width: `${Math.round(item.score / item.max * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
