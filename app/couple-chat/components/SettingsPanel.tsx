'use client'
import { useState, useEffect } from 'react'
import AnniversarySection from './AnniversarySection'
import AppearanceSection from './AppearanceSection'
import NicknameSection from './NicknameSection'
import NotificationSection from './NotificationSection'

export interface ChatSettings {
  bgColor: string
  bgImage: string
  font: string
  fontSize: number
  fontWeight: number
  myNick: string
  partnerNick: string
  fortuneOn: boolean
  dDayOn: boolean
  lockOn: boolean
  startDate: string
  ddayType: string
  ddayTarget: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onClearChat: () => void
  onSaveSettings: (settings: ChatSettings) => void
  settings: ChatSettings
}

export default function SettingsPanel({ isOpen, onClose, onClearChat, onSaveSettings, settings }: Props) {
  const [bgColor, setBgColor] = useState(settings.bgColor)
  const [bgImage, setBgImage] = useState(settings.bgImage)
  const [font, setFont] = useState(settings.font)
  const [fontSize, setFontSize] = useState(settings.fontSize)
  const [fontWeight, setFontWeight] = useState(settings.fontWeight)
  const [myNick, setMyNick] = useState(settings.myNick)
  const [partnerNick, setPartnerNick] = useState(settings.partnerNick)
  const [fortuneOn, setFortuneOn] = useState(settings.fortuneOn)
  const [dDayOn, setDDayOn] = useState(settings.dDayOn)
  const [lockOn, setLockOn] = useState(settings.lockOn)
  const [startDate, setStartDate] = useState(settings.startDate)
  const [ddayType, setDdayType] = useState(settings.ddayType)
  const [ddayTarget, setDdayTarget] = useState(settings.ddayTarget)

  useEffect(() => {
    setBgColor(settings.bgColor)
    setBgImage(settings.bgImage)
    setFont(settings.font)
    setFontSize(settings.fontSize)
    setFontWeight(settings.fontWeight)
    setMyNick(settings.myNick)
    setPartnerNick(settings.partnerNick)
    setFortuneOn(settings.fortuneOn)
    setDDayOn(settings.dDayOn)
    setLockOn(settings.lockOn)
    setStartDate(settings.startDate)
    setDdayType(settings.ddayType)
    setDdayTarget(settings.ddayTarget)
  }, [settings])

  const handleSave = () => {
    onSaveSettings({
      bgColor, bgImage, font, fontSize, fontWeight,
      myNick, partnerNick, fortuneOn, dDayOn, lockOn,
      startDate, ddayType, ddayTarget,
    })
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

          <AnniversarySection
            startDate={startDate}
            ddayType={ddayType}
            ddayTarget={ddayTarget}
            onStartDateChange={setStartDate}
            onDdayTypeChange={setDdayType}
            onDdayTargetChange={setDdayTarget}
          />

          <AppearanceSection
            bgColor={bgColor}
            bgImage={bgImage}
            font={font}
            fontSize={fontSize}
            fontWeight={fontWeight}
            onBgColorChange={setBgColor}
            onBgImageChange={setBgImage}
            onFontChange={setFont}
            onFontSizeChange={setFontSize}
            onFontWeightChange={setFontWeight}
          />

          <NicknameSection
            myNick={myNick}
            partnerNick={partnerNick}
            onMyNickChange={setMyNick}
            onPartnerNickChange={setPartnerNick}
          />

          <NotificationSection
            fortuneOn={fortuneOn}
            dDayOn={dDayOn}
            lockOn={lockOn}
            onFortuneToggle={() => setFortuneOn(!fortuneOn)}
            onDDayToggle={() => setDDayOn(!dDayOn)}
            onLockToggle={() => setLockOn(!lockOn)}
          />

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
