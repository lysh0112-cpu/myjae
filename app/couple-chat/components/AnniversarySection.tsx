import { ChatSettings } from './SettingsPanel'

const MILESTONES = [30, 50, 100, 200, 300, 365, 500, 1000]

function calcDays(startDate: string): number {
  if (!startDate) return 0
  const start = new Date(startDate)
  const today = new Date()
  return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function getNextMilestone(days: number) {
  for (const m of MILESTONES) {
    if (days < m) return { milestone: m, daysLeft: m - days }
  }
  return null
}

interface Props {
  startDate: string
  onChange: (date: string) => void
}

export default function AnniversarySection({ startDate, onChange }: Props) {
  const days = calcDays(startDate)
  const next = getNextMilestone(days)

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', color: '#6666aa', marginBottom: '8px' }}>💕 기념일 설정</div>
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '11px', color: '#8888cc', marginBottom: '4px' }}>처음 만난 날</div>
        <input type="date" value={startDate} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#e8e4ff', fontSize: '13px', outline: 'none', colorScheme: 'dark' }} />
      </div>
      {startDate && days > 0 && (
        <div style={{ background: 'rgba(60,52,137,0.2)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '13px', color: '#c8b0ff', marginBottom: '6px' }}>
            만난 지 <span style={{ fontSize: '18px', fontWeight: '500', color: '#FAC775' }}>D+{days}</span> 일
          </div>
          {next && (
            <div style={{ fontSize: '11px', color: '#9d8cff', marginBottom: '8px' }}>
              다음 기념일 D+{next.milestone} 까지 {next.daysLeft}일 남았어요 🎉
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {MILESTONES.map(m => (
              <span key={m} style={{
                padding: '2px 8px', borderRadius: '20px', fontSize: '10px',
                background: days >= m ? 'rgba(250,199,117,0.2)' : 'rgba(255,255,255,0.05)',
                color: days >= m ? '#FAC775' : '#555577',
                border: days >= m ? '1px solid rgba(250,199,117,0.3)' : '1px solid rgba(255,255,255,0.06)',
              }}>
                {days >= m ? '✓ ' : ''}D+{m}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
