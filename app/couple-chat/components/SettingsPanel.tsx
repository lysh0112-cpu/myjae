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
              <div style={{ fontSize: '11px', color:
