export default function MbtiInput({ value, onChange }: {
  value: string
  onChange: (mbti: string) => void
}) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: '#5555aa', marginBottom: '8px' }}>MBTI (선택)</div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="예) INTJ"
          maxLength={4}
          value={value}
          onChange={e => onChange(e.target.value.toUpperCase())}
          style={{
            flex: 1, background: '#0d0d1a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', padding: '10px 12px',
            color: '#e8e4ff', fontSize: '14px', outline: 'none',
          }}
        />
        <button
          onClick={() => window.open('https://www.16personalities.com/ko', '_blank')}
          style={{
            padding: '10px 12px', borderRadius: '8px',
            background: 'rgba(60,52,137,0.3)',
            border: '1px solid rgba(119,102,221,0.3)',
            color: '#c8b0ff', fontSize: '11px',
            cursor: 'pointer', whiteSpace: 'nowrap',
            lineHeight: '1.4',
          }}>
          모르면<br />진단 →
        </button>
      </div>
    </div>
  )
}
