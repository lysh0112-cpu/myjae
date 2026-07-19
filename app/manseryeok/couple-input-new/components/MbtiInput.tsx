'use client'
// ★ 2026-07: 구버전(couple-input)에서 이 폴더로 옮기며 'use client' 추가.
//   window.open을 쓰는데 지시문이 없었다. 지금까지는 부모(page.tsx)가
//   client component라 경계를 상속받아 우연히 동작했을 뿐이다.
//   다른 곳에서 이 부품을 쓰면 'window is not defined'로 터진다.
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
