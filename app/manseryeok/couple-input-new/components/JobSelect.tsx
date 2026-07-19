'use client'
import { useState } from 'react'

const JOBS = [
  { id: 'wood',  icon: '🌳', label: '목(木)', desc: '교육·의료·복지·출판' },
  { id: 'fire',  icon: '🔥', label: '화(火)', desc: 'IT·디자인·방송·요리·마케팅' },
  { id: 'earth', icon: '🌍', label: '토(土)', desc: '공무원·부동산·건설·관리' },
  { id: 'metal', icon: '⚙️', label: '금(金)', desc: '금융·법조·공학·의학' },
  { id: 'water', icon: '💧', label: '수(水)', desc: '무역·여행·연구·상담' },
  { id: 'home',  icon: '🏠', label: '가사·무직', desc: '전업주부·육아·가사' },
]

export default function JobSelect({ value, onChange }: {
  value: string
  onChange: (job: string) => void
}) {
  const [jobQuery, setJobQuery] = useState('')
  const [jobHint, setJobHint] = useState('')
  const [hinting, setHinting] = useState(false)

  const handleJobQuery = async (query: string) => {
    setJobQuery(query)
    setJobHint('')
    if (query.length < 2) return

    setHinting(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `명리학 오행 기준으로 "${query}" 직업은 목/화/토/금/수/가사 중 어디에 해당하나요?
반드시 아래 형식으로만 답하세요 (다른 말 없이):
오행: 화
이유: 한 줄 이유`
          }]
        }),
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      setJobHint(text.trim())
    } catch {
      setJobHint('')
    } finally {
      setHinting(false)
    }
  }

  // 힌트에서 오행 추출해서 자동 선택 제안
  const suggestedId = (() => {
    if (!jobHint) return null
    if (jobHint.includes('목')) return 'wood'
    if (jobHint.includes('화')) return 'fire'
    if (jobHint.includes('토')) return 'earth'
    if (jobHint.includes('금')) return 'metal'
    if (jobHint.includes('수')) return 'water'
    if (jobHint.includes('가사')) return 'home'
    return null
  })()

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', color: '#5555aa', marginBottom: '8px' }}>직업 (오행)</div>

      {/* 직업 선택 버튼 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
        {JOBS.map(j => (
          <div key={j.id} onClick={() => onChange(j.id)}
            style={{
              padding: '8px 10px', borderRadius: '10px', cursor: 'pointer',
              border: value === j.id
                ? '1px solid rgba(119,102,221,0.6)'
                : suggestedId === j.id
                ? '1px solid rgba(250,199,117,0.5)'
                : '1px solid rgba(255,255,255,0.06)',
              background: value === j.id
                ? 'rgba(60,52,137,0.25)'
                : suggestedId === j.id
                ? 'rgba(250,199,117,0.06)'
                : 'rgba(255,255,255,0.02)',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
            <span style={{ fontSize: '14px' }}>{j.icon}</span>
            <div>
              <div style={{ fontSize: '11px', color: value === j.id ? '#c8b0ff' : '#8888cc', fontWeight: '500' }}>
                {j.label}
              </div>
              <div style={{ fontSize: '9px', color: '#444466' }}>{j.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 직업 검색 한 줄 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          value={jobQuery}
          onChange={e => handleJobQuery(e.target.value)}
          placeholder="직업명 입력 → 오행 안내"
          style={{
            flex: 1, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px', padding: '6px 10px',
            color: '#c8c0ff', fontSize: '11px', outline: 'none',
          }}
        />
        {hinting && (
          <span style={{ fontSize: '11px', color: '#6666aa' }}>...</span>
        )}
      </div>

      {/* 힌트 표시 */}
      {jobHint && !hinting && (
        <div style={{ marginTop: '4px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(250,199,117,0.08)', border: '1px solid rgba(250,199,117,0.2)' }}>
          <span style={{ fontSize: '11px', color: '#FAC775' }}>{jobHint}</span>
          {suggestedId && (
            <button
              onClick={() => { onChange(suggestedId); setJobQuery(''); setJobHint('') }}
              style={{ marginLeft: '8px', fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(250,199,117,0.2)', border: '1px solid rgba(250,199,117,0.4)', color: '#FAC775', cursor: 'pointer' }}>
              선택 ✓
            </button>
          )}
        </div>
      )}
    </div>
  )
}
