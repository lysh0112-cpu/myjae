interface Props {
  myNick: string
  partnerNick: string
  onMyNickChange: (v: string) => void
  onPartnerNickChange: (v: string) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0d0d1a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '8px 12px',
  color: '#e8e4ff',
  fontSize: '12px',
  outline: 'none',
}

export default function NicknameSection({ myNick, partnerNick, onMyNickChange, onPartnerNickChange }: Props) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', color: '#6666aa', marginBottom: '10px' }}>👤 커플 닉네임</div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#8888cc', marginBottom: '4px' }}>나</div>
          <input
            value={myNick}
            onChange={e => onMyNickChange(e.target.value)}
            placeholder="내 닉네임"
            maxLength={8}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#8888cc', marginBottom: '4px' }}>상대방</div>
          <input
            value={partnerNick}
            onChange={e => onPartnerNickChange(e.target.value)}
            placeholder="상대방 닉네임"
            maxLength={8}
            style={inputStyle}
          />
        </div>
      </div>
      <div style={{ fontSize: '10px', color: '#444466', marginTop: '4px' }}>
        최대 8자 · 채팅창 아바타에 바로 반영돼요
      </div>
    </div>
  )
}
