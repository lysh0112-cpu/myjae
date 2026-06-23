const JOBS = [
  { id: 'wood',  icon: '🌳', label: '목(木)', desc: '교육·의료·복지·출판' },
  { id: 'fire',  icon: '🔥', label: '화(火)', desc: 'IT·디자인·방송·마케팅' },
  { id: 'earth', icon: '🌍', label: '토(土)', desc: '공무원·부동산·건설·관리' },
  { id: 'metal', icon: '⚙️', label: '금(金)', desc: '금융·법조·공학·의학' },
  { id: 'water', icon: '💧', label: '수(水)', desc: '무역·여행·연구·상담' },
]

export default function JobSelect({ value, onChange }: {
  value: string
  onChange: (job: string) => void
}) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', color: '#5555aa', marginBottom: '8px' }}>직업 (오행)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {JOBS.map(j => (
          <div key={j.id} onClick={() => onChange(j.id)}
            style={{
              padding: '8px 10px', borderRadius: '10px', cursor: 'pointer',
              border: value === j.id ? '1px solid rgba(119,102,221,0.6)' : '1px solid rgba(255,255,255,0.06)',
              background: value === j.id ? 'rgba(60,52,137,0.25)' : 'rgba(255,255,255,0.02)',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
            <span style={{ fontSize: '14px' }}>{j.icon}</span>
            <div>
              <div style={{ fontSize: '11px', color: value === j.id ? '#c8b0ff' : '#8888cc', fontWeight: '500' }}>{j.label}</div>
              <div style={{ fontSize: '9px', color: '#444466' }}>{j.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
