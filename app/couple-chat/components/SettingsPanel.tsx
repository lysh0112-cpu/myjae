'use client'
import { useState, useEffect } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onClearChat: () => void
  onSaveSettings: (settings: ChatSettings) => void
  settings: ChatSettings
}

export interface ChatSettings {
  bg: string
  font: string
  myNick: string
  partnerNick: string
  fortuneOn: boolean
  dDayOn: boolean
  lockOn: boolean
  startDate: string
}

const BACKGROUNDS = ['별빛 (기본)', '벚꽃', '노을', '직접 업로드']
const FONTS = ['기본체', '손글씨체', '귀여운체', '고딕체']

const MILESTONES = [30, 50, 100, 200, 300, 365, 500, 1000]

function calcDays(startDate: string): number {
  if (!startDate) return 0
  const start = new Date(startDate)
  const today = new Date()
  const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return diff + 1
}

function getNextMilestone(days: number): { milestone: number; daysLeft: number } | null {
  for (const m of MILESTONES) {
    if (days < m) return { milestone: m, daysLeft: m - days }
  }
  return null
}

export default function SettingsPanel({ isOpen, onClose, onClearChat, onSaveSettings, settings }: Props) {
  const [bg, setBg] = useState(settings.bg)
  const [font, setFont] = useState(settings.font)
  const [myNick, setMyNick] = useState(settings.myNick)
  const [partnerNick, setPartnerNick] = useState(settings.partnerNick)
  const [fortuneOn, setFortuneOn] = useState(settings.fortuneOn)
  const [dDayOn, setDDayOn] = useState(settings.dDayOn)
  const [lockOn, setLockOn] = useState(settings.lockOn)
  const [startDate, setStartDate] = useState(settings.startDate)

  useEffect(() => {
    setBg(settings.bg)
    setFont(settings.font)
    setMyNick(settings.myNick)
    setPartnerNick(settings.partnerNick)
    setFortuneOn(settings.fortuneOn)
    setDDayOn(settings.dDayOn)
    setLockOn(settings.lockOn)
    setStartDate(settings.startDate)
  }, [settings])

  const days = calcDays(startDate)
  const next = getNextMilestone(days)

  const handleSave = () => {
    onSaveSettings({ bg, font, myNick, partnerNick, fortuneOn, dDayOn, lockOn, startDate })
    onClose()
  }

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
      style={{ width: '36px', height: '20px', borderRadius: '20px', background: on ? '#5544bb' : 'rgba(255,255,255,0.15)', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: on ? '18px' : '2px', transition: 'left 0.2s' }} />
    </div>
  )

  const panelStyle: React.CSSProperties = {
    position: 'fixed', bottom: 0, left: '50%',
    width: '100%', maxWidth: '480px',
    background: '#13132a',
    borderRadius: '20px 20px 0 0',
    border: '1px solid rgba(255,255,255,0.08)',
    zIndex: 50, maxHeight: '85vh', overflowY: 'auto',
    paddingBottom: '20px',
    transition: 'transform 0.3s ease',
    transform: isOpen ? 'translateX(-50%) translateY(0%)' : 'translateX(-50%) translateY(101%)',
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

          {/* 기념일 설정 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#6666aa', marginBottom: '8px' }}>💕 기념일 설정</div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: '#8888cc', marginBottom: '4px' }}>처음 만난 날</div>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ width: '100%', background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#e8e4ff', fontSize: '13px', outline: 'none', colorScheme: 'dark' }} />
            </div>
            {startDate && days > 0 && (
              <div style={{ background: 'rgba(60,52,137,0.2)', borderRadius: '10px', padding: '10px 12px' }}>
                <div style={{ fontSize: '13px', color: '#c8b0ff', marginBottom: '6px' }}>
                  만난 지 <span style={{ fontSize: '18px', fontWeight: '500', color: '#FAC775' }}>D+{days}</span> 일
                </div>
                {next && (
                  <div style={{ fontSize: '11px', color: '#9d8cff' }}>
                    다음 기념일 D+{next.milestone} 까지 {next.daysLeft}일 남았어요 🎉
                  </div>
                )}
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {MILESTONES.map(m => (
                    <span key={m}
                      style={{
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

          {/* 배경 테마 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#6666aa', marginBottom: '8px' }}>배경 테마</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {BACKGROUNDS.map(b => (
                <div key={b} onClick={() => setBg(b)}
                  style={{ padding: '8px', borderRadius: '10px', textAlign: 'center', fontSize: '12px', cursor: 'pointer', border: bg === b ? '1px solid rgba(119,102,221,0.6)' : '1px solid rgba(255,255,255,0.06)', background: bg === b ? 'rgba(60,52,137,0.3)' : 'rgba(255,255,255,0.02)', color: bg === b ? '#c8b0ff' : '#8888cc' }}>
                  {b}
                </div>
              ))}
            </div>
          </div>

          {/* 글씨체 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#6666aa', marginBottom: '8px' }}>글씨체</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {FONTS.map(f => (
                <div key={f} onClick={() => setFont(f)}
                  style={{ padding: '8px', borderRadius: '10px', textAlign: 'center', fontSize: '12px', cursor: 'pointer', border: font === f ? '1px solid rgba(119,102,221,0.6)' : '1px solid rgba(255,255,255,0.06)', background: font === f ? 'rgba(60,52,137,0.3)' : 'rgba(255,255,255,0.02)', color: font === f ? '#c8b0ff' : '#8888cc' }}>
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* 커플 닉네임 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#6666aa', marginBottom: '8px' }}>커플 닉네임</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={myNick} onChange={e => setMyNick(e.target.value)} placeholder="나의 닉네임"
                style={{ flex: 1, background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#e8e4ff', fontSize: '12px', outline: 'none' }} />
              <input value={partnerNick} onChange={e => setPartnerNick(e.target.value)} placeholder="상대방 닉네임"
                style={{ flex: 1, background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#e8e4ff', fontSize: '12px', outline: 'none' }} />
            </div>
          </div>

          {/* 알림 설정 */}
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

          {/* 완료 버튼 */}
          <button onClick={handleSave}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #5544bb, #7766dd)', border: 'none', color: '#e8e4ff', fontSize: '14px', fontWeight: '500', cursor: 'pointer', marginBottom: '12px' }}>
            ✓ 설정 완료
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
