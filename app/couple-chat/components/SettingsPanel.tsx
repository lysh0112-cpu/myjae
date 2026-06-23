'use client'
import { useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onClearChat: () => void
}

const BACKGROUNDS = ['별빛 (기본)', '벚꽃', '노을', '직접 업로드']
const FONTS = ['기본체', '손글씨체', '귀여운체', '고딕체']

export default function SettingsPanel({ isOpen, onClose, onClearChat }: Props) {
  const [bg, setBg] = useState('별빛 (기본)')
  const [font, setFont] = useState('기본체')
  const [myNick, setMyNick] = useState('')
  const [partnerNick, setPartnerNick] = useState('')
  const [fortuneOn, setFortuneOn] = useState(true)
  const [dDayOn, setDDayOn] = useState(true)
  const [lockOn, setLockOn] = useState(false)

  const handleClear = () => {
    if (confirm('채팅 내역을 모두 삭제할까요?')) {
      onClearChat()
      onClose()
    }
  }

  const handleLeave = () => {
    if (confirm('채팅방을 나가시겠어요? 구독이 해지됩니다.')) {
      alert('채팅방을 나갔습니다.')
      onClose()
    }
  }

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <div onClick={onToggle}
      style={{
        width: '36px', height: '20px', borderRadius: '20px',
        background: on ? '#5544bb' : 'rgba(255,255,255,0.15)',
        cursor: 'pointer', position: 'relative',
        flexShrink: 0,
      }}>
      <div style={{
        width: '16px', height: '16px', borderRadius: '50%',
        background: '#fff', position: 'absolute',
        top: '2px', left: on ? '18px' : '2px',
        transition: 'left 0.2s',
      }} />
    </div>
  )

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    width: '100%',
    maxWidth: '480px',
    background: '#13132a',
    borderRadius: '20px 20px 0 0',
    border: '1px solid rgba(255,255,255,0.08)',
    zIndex: 50,
    maxHeight: '80vh',
    overflowY: 'auto',
    paddingBottom: '20px',
    transition: 'transform 0.3s ease',
  }

  if (isOpen) {
    panelStyle.transform = 'translateX(-50%) translateY(0%)'
  } else {
    panelStyle.transform = 'translateX(-50%) translateY(101%)'
  }

  return (
    <>
      {isOpen && (
        <div onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />
      )}

      <div style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '20px', background: 'rgba(255,255,255,0.2)' }} />
        </div>

        <div style={{ padding: '0 20px' }}>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#e8e4ff', marginBottom: '16px' }}>채팅방 설정</div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#6666aa', marginBottom: '8px' }}>배경 테마</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {BACKGROUNDS.map(b => (
                <div key={b} onClick={() => setBg(b)}
                  style={{
                    padding: '8px', borderRadius: '10px', textAlign: 'center',
                    fontSize: '12px', cursor: 'pointer',
                    border: bg === b ? '1px solid rgba(119,102,221,0.6)' : '1px solid rgba(255,255,255,0.06)',
                    background: bg === b ? 'rgba(60,52,137,0.3)' : 'rgba(255,255,255,0.02)',
                    color: bg === b ? '#c8b0ff' : '#8888cc',
                  }}>
                  {b}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#6666aa', marginBottom: '8px' }}>글씨체</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {FONTS.map(f => (
                <div key={f} onClick={() => setFont(f)}
                  style={{
                    padding: '8px', borderRadius: '10px', textAlign: 'center',
                    fontSize: '12px', cursor: 'pointer',
                    border: font === f ? '1px solid rgba(119,102,221,0.6)' : '1px solid rgba(255,255,255,0.06)',
                    background: font === f ? 'rgba(60,52,137,0.3)' : 'rgba(255,255,255,0.02)',
                    color: font === f ? '#c8b0ff' : '#8888cc',
                  }}>
                  {f}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#6666aa', marginBottom: '8px' }}>커플 닉네임</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={myNick} onChange={e => setMyNick(e.target.value)} placeholder="나의 닉네임"
                style={{ flex: 1, background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#e8e4ff', fontSize: '12px', outline: 'none' }} />
              <input value={partnerNick} onChange={e => setPartnerNick(e.target.value)} placeholder="상대방 닉네임"
                style={{ flex: 1, background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#e8e4ff', fontSize: '12px', outline: 'none' }} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#6666aa', marginBottom: '8px' }}>알림 설정</div>
            {[
              { label: '매일 오늘의 궁합 운세', on: fortuneOn, toggle: () => setFortuneOn(!fortuneOn) },
              { label: '기념일 알림', on: dDayOn, toggle: () => setDDayOn(!dDayOn) },
              { label: '채팅방 잠금', on: lockOn, toggle: () => setLockOn(!lockOn) },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ flex: 1, fontSize: '13px', color: '#c8c0ff' }}>{item.label}</div>
                <Toggle on={item.on} onToggle={item.toggle} />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <button onClick={handleClear}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff8888', fontSize: '13px', cursor: 'pointer' }}>
              🗑 채팅 내역 전체 삭제
            </button>
            <button onClick={handleLeave}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#6666aa', fontSize: '13px', cursor: 'pointer' }}>
              채팅방 나가기
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
