import { RelationType } from '../hooks/useCoupleInput'

const RELATION_TYPES = [
  { id: 'couple',     icon: '💑', label: '연인 사이',    desc: '궁합 점수 + 사주/직업/MBTI 분석' },
  { id: 'prewedding', icon: '💍', label: '예비 신혼부부', desc: '결혼 좋은 날 택일 추천' },
  { id: 'married',    icon: '👫', label: '부부',          desc: '궁합 분석 + 관계 개선' },
  { id: 'birth',      icon: '👶', label: '출산 시기',     desc: '최적 출산 월·일 추천' },
]

export default function RelationSelect({ relation, setRelation }: {
  relation: RelationType
  setRelation: (r: RelationType) => void
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '11px', color: '#5555aa', marginBottom: '10px' }}>우리 사이는?</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {RELATION_TYPES.map(r => (
          <div key={r.id} onClick={() => setRelation(r.id as RelationType)}
            style={{
              padding: '11px 14px', borderRadius: '11px', cursor: 'pointer',
              border: relation === r.id ? '1px solid rgba(119,102,221,0.6)' : '1px solid rgba(255,255,255,0.06)',
              background: relation === r.id ? 'rgba(60,52,137,0.25)' : 'rgba(255,255,255,0.02)',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
            <span style={{ fontSize: '16px' }}>{r.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', color: relation === r.id ? '#c8b0ff' : '#8888cc', fontWeight: '500' }}>{r.label}</div>
              <div style={{ fontSize: '11px', color: '#444466', marginTop: '1px' }}>{r.desc}</div>
            </div>
            {relation === r.id && (
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#5544aa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                  <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
