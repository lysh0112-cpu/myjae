'use client'

const MILESTONES = [30, 50, 100, 200, 300, 365, 500, 1000]

const DDAY_TYPES = [
  '결혼기념일', '생일', '여행', '졸업', '입학', '취업', '기타'
]

function calcDays(startDate: string): number {
  if (!startDate) return 0
  const start = new Date(startDate)
  const today = new Date()
  return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function calcDDayLeft(targetDate: string): number {
  if (!targetDate) return 0
  const target = new Date(targetDate)
  const today = new Date()
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getNextMilestone(days: number) {
  for (const m of MILESTONES) {
    if (days < m) return { milestone: m, daysLeft: m - days }
  }
  return null
}

interface Props {
  startDate: string
  ddayType: string
  ddayTarget: string
  onStartDateChange: (v: string) => void
  onDdayTypeChange: (v: string) => void
  onDdayTargetChange: (v: string) => void
}

const lbl: React.CSSProperties = {
  fontSize: '11px', color: '#6666aa', marginBottom: '5px'
}
const selectBox: React.CSSProperties = {
  width: '100%', background: '#0d0d1a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px', padding: '8px 12px',
  color: '#e8e4ff', fontSize: '12px', outline: 'none',
  appearance: 'none' as const,
}

export default function AnniversarySection({
  startDate, ddayType, ddayTarget,
  onStartDateChange, onDdayTypeChange, onDdayTargetChange
}: Props) {
  const days = calcDays(startDate)
  const next = getNextMilestone(days)
  const ddayLeft = calcDDayLeft(ddayTarget)

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', color: '#6666aa', marginBottom: '10px' }}>💕 기념일 설정</div>

      {/* D+ 처음 만난 날 */}
      <div style={{ marginBottom: '10px' }}>
        <div style={lbl}>처음 만난 날 (D+)</div>
        <input type="date" value={startDate} onChange={e => onStartDateChange(e.target.value)}
          style={{ ...selectBox, colorScheme: 'dark' }} />
      </div>

      {startDate && days > 0 && (
        <div style={{ background: 'rgba(60,52,137,0.2)', borderRadius: '10px', padding: '10px 12px', marginBottom: '10px' }}>
          <div style={{ fontSize: '13px', color: '#c8b0ff', marginBottom: '4px' }}>
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

      {/* D- 카운트다운 */}
      <div style={{ marginBottom: '6px' }}>
        <div style={lbl}>카운트다운 목표일 (D-)</div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
          <select value={ddayType} onChange={e => onDdayTypeChange(e.target.value)}
            style={{ ...selectBox, flex: 1 }}>
            {DDAY_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input type="date" value={ddayTarget} onChange={e => onDdayTargetChange(e.target.value)}
            style={{ ...selectBox, flex: 1, colorScheme: 'dark' }} />
        </div>
        {ddayTarget && (
          <div style={{ background: 'rgba(212,83,126,0.15)', borderRadius: '10px', padding: '8px 12px' }}>
            <div style={{ fontSize: '12px', color: '#f48fb1' }}>
              {ddayType}까지{' '}
              <span style={{ fontSize: '16px', fontWeight: '500', color: '#FAC775' }}>
                {ddayLeft > 0 ? `D-${ddayLeft}` : ddayLeft === 0 ? 'D-Day!' : `D+${Math.abs(ddayLeft)}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
