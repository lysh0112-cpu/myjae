interface Props {
  myNick: string
  partnerNick: string
  onMyNickChange: (v: string) => void
  onPartnerNickChange: (v: string) => void
}

export default function NicknameSection({ myNick, partnerNick, onMyNickChange, onPartnerNickChange }: Props) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', color: '#6666aa', marginBottom: '8px' }}>👤 커플 닉네임</div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input value={myNick} onChange={e => onMyNickChange(e.target.value)} placeholder="나의 닉네임"
          style={{ flex: 1, background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#e8e4ff', fontSize: '12px', outline: 'none' }} />
        <input value={partnerNick} onChange={e => onPartnerNickChange(e.target.value)} placeholder="상대방 닉네임"
          style={{ flex: 1, background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#e8e4ff', fontSize: '12px', outline: 'none' }} />
      </div>
    </div>
  )
}
