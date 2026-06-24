import { CoupleResultData } from '../hooks/useCoupleResult'

export default function AreaAnalysis({ result, mode = 'couple' }: { result: CoupleResultData; mode?: string }) {
  return (
    <div style={{ background: '#13132a', borderRadius: '14px', padding: '16px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: '13px', fontWeight: '500', color: '#c8c0ff', marginBottom: '12px' }}>
        {mode === 'prewedding' ? '💍 결혼 길일 추천' :
         mode === 'birth' ? '👶 출산 시기 추천' :
         mode === 'married' ? '💑 관계 개선 분석' : '영역별 분석'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* 질문 답변 또는 모드별 핵심 결과 최우선 표시 */}
        {result.questionAnswer && (
          <div style={{ background: 'rgba(250,199,117,0.1)', border: '1px solid rgba(250,199,117,0.3)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#FAC775', fontWeight: '500', marginBottom: '6px' }}>
              {mode === 'prewedding' ? '💍 추천 길일' :
               mode === 'birth' ? '👶 추천 출산 시기' :
               mode === 'married' ? '💑 관계 개선 방향' : '⭐ 질문 답변'}
            </div>
            <div style={{ fontSize: '12px', color: '#e8e0cc', lineHeight: '1.8', whiteSpace: 'pre-line' }}>{result.questionAnswer}</div>
          </div>
        )}

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
