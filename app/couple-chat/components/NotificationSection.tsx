interface Props {
  fortuneOn: boolean
  dDayOn: boolean
  lockOn: boolean
  onFortuneToggle: () => void
  onDDayToggle: () => void
  onLockToggle: () => void
}

const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <div onClick={onToggle}
    style={{ width: '36px', height: '20px', borderRadius: '20px', background: on ? '#5544bb' : 'rgba(255,255,255,0.15)', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: on ? '18px' : '2px', transition: 'left 0.2s' }} />
  </div>
)

export default function NotificationSection({ fortuneOn, dDayOn, lockOn, onFortuneToggle, onDDayToggle, onLockToggle }: Props) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', color: '#6666aa', marginBottom: '8px' }}>🔔 알림 설정</div>
      {[
        { label: '매일 오늘의 궁합 운세', on: fortuneOn, toggle: onFortuneToggle },
        { label: '기념일 알림', on: dDayOn, toggle: onDDayToggle },
        { label: '채팅방 잠금', on: lockOn, toggle: onLockToggle },
      ].map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ flex: 1, fontSize: '13px', color: '#c8c0ff' }}>{item.label}</div>
          <Toggle on={item.on} onToggle={item.toggle} />
        </div>
      ))}
    </div>
  )
}
