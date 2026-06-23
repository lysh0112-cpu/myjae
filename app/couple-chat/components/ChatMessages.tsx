'use client'
import { useEffect, useRef } from 'react'
import { ChatSettings } from './SettingsPanel'

export interface Message {
  id: string
  sender: 'me' | 'partner'
  message: string
  created_at: string
}

interface Props {
  messages: Message[]
  settings: ChatSettings
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  const h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? '오후' : '오전'
  return `${ampm} ${h > 12 ? h - 12 : h}:${m}`
}

const FONT_MAP: Record<string, string> = {
  pretendard:   "'Pretendard', sans-serif",
  noto:         "'Noto Sans KR', sans-serif",
  nanumgothic:  "'Nanum Gothic', sans-serif",
  spoqa:        "'Spoqa Han Sans Neo', sans-serif",
  doHyeon:      "'Do Hyeon', sans-serif",
  kyobo:        "'KyoboHandwriting', cursive",
  cafe24:       "'Cafe24Ssurround', sans-serif",
  notoserifkr:  "'Noto Serif KR', serif",
}

import { BG_COLOR_MAP } from './AppearanceSection'

function getBgStyle(settings: ChatSettings): React.CSSProperties {
  if (settings.bgImage) {
    return {
      backgroundImage: `url(${settings.bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  return { background: BG_COLOR_MAP[settings.bgColor] || '#0d0d1a' }
}

function getTextColor(bgColor: string): string {
  const lightBgs = ['cloud', 'icy', 'lavender', 'rose', 'caramel', 'terra', 'olive']
  return lightBgs.includes(bgColor) ? '#1a1a2e' : '#e8e4ff'
}

export default function ChatMessages({ messages, settings }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fontFamily = FONT_MAP[settings.font] || 'inherit'
  const fontSize = `${settings.fontSize}px`
  const fontWeight = String(settings.fontWeight)
  const bgStyle = getBgStyle(settings)
  const textColor = getTextColor(settings.bgColor)
  const myNick = settings.myNick || '나'
  const partnerNick = settings.partnerNick || '상대'

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', ...bgStyle }}>
      {messages.length === 0 && (
        <div style={{ textAlign: 'center', color: '#444466', fontSize: '12px', marginTop: '40px' }}>
          아직 메시지가 없어요<br />첫 번째 메시지를 보내보세요 💕
        </div>
      )}
      {messages.map(msg => (
        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'me' ? 'flex-end' : 'flex-start' }}>
          {/* 닉네임 */}
          <div style={{ fontSize: '10px', color: msg.sender === 'me' ? '#9d8cff' : '#f48fb1', marginBottom: '2px' }}>
            {msg.sender === 'me' ? myNick : partnerNick}
          </div>
          {/* 말풍선 */}
          <div style={{
            maxWidth: '75%',
            padding: '8px 12px',
            borderRadius: msg.sender === 'me' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            background: msg.sender === 'me' ? '#5544bb' : 'rgba(255,255,255,0.15)',
            color: '#e8e4ff',
            fontSize, fontWeight, fontFamily,
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {msg.message}
          </div>
          <div style={{ fontSize: '10px', color: '#444466', marginTop: '3px' }}>
            {formatTime(msg.created_at)}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
