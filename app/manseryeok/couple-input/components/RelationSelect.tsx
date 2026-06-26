'use client'
import { useState } from 'react'
import { RelationType } from '../hooks/useCoupleInput'

const RELATION_TYPES = [
  { id: 'couple',     icon: '💑', label: '연인 사이',    desc: '궁합 점수 + 사주/직업/MBTI' },
  { id: 'prewedding', icon: '💍', label: '예비 신혼부부', desc: '결혼 좋은 날 택일 추천' },
  { id: 'married',    icon: '👫', label: '부부',          desc: '궁합 분석 + 관계 개선' },
  { id: 'birth',      icon: '👶', label: '출산 시기',     desc: '최적 출산 월·일 추천' },
]

export default function RelationSelect({ relation, setRelation }: {
  relation: RelationType
  setRelation: (r: RelationType) => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '11px', color: '#5555aa', marginBottom: '10px' }}>우리 사이는?</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
        {RELATION_TYPES.map(r => {
          const selected = relation === r.id
          const isHover = hovered === r.id
          return (
            <div key={r.id}
              onClick={() => setRelation(r.id as RelationType)}
              onMouseEnter={() => setHovered(r.id)}
              onMouseLeave={() => setHovered(null)}
              className="active:scale-95"
              style={{
                position: 'relative',
                padding: '14px 12px',
                borderRadius: '13px',
                cursor: 'pointer',
                minHeight: '92px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                border: selected
                  ? '1px solid rgba(119,102,221,0.7)'
                  : isHover
                    ? '1px solid rgba(119,102,221,0.4)'
                    : '1px solid rgba(255,255,255,0.06)',
                background: selected
                  ? 'linear-gradient(160deg, rgba(85,68,170,0.32), rgba(60,52,137,0.22))'
                  : isHover
                    ? 'rgba(60,52,137,0.14)'
                    : 'rgba(255,255,255,0.02)',
                boxShadow: selected
                  ? '0 8px 22px rgba(0,0,0,0.4), 0 0 16px rgba(119,102,221,0.25)'
                  : isHover
                    ? '0 6px 16px rgba(0,0,0,0.3)'
                    : 'none',
                transform: isHover && !selected ? 'translateY(-3px) scale(1.03)'
                  : selected ? 'translateY(-1px)' : 'translateY(0)',
                transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, background 0.22s ease',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '22px' }}>{r.icon}</span>
                {selected && (
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#5544aa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="9" height="7" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
              <div style={{ fontSize: '14px', color: selected ? '#d8c8ff' : '#9999d0', fontWeight: 600 }}>{r.label}</div>
              <div style={{ fontSize: '11px', color: selected ? '#9b86d8' : '#555577', lineHeight: 1.4 }}>{r.desc}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
