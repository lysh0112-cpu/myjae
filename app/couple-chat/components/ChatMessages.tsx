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

function getFontFamily(font: string): string {
  switch (font) {
    case '손글씨체': return 'cursive'
    case '귀여운체': return '"Comic Sans MS", cursive'
    case '고딕체': return '"Noto Sans KR", sans-serif'
    default: return 'inherit'
  }
}

function getFontSize(size: string): string {
  switch (size) {
    case '작게': return '11px'
    case '크게': return '16px'
    default: return '13px'
  }
}

function getFontWeight(weight: string): string {
  switch (weight) {
    case '얇게': return '300'
    case '굵게': return '600'
    default: return '400'
  }
}

function getBgStyle(settings: ChatSettings): React.CSSProperties {
  if (settings.bg === 'upload' && settings.bgImage) {
    return {
      backgroundImage: `url(${settings.bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  switch (settings.bg) {
    case 'cherry': return { background: 'linear-gradient(180deg, #2a1020 0%, #1a0818 100%)' }
    case 'sunset': return { background: 'linear-gradient(180deg, #1a0d05 0%, #0d0808 100%)' }
    default: return { background: '#0d0d1a' }
  }
}

export default function ChatMessages({ messages, settings }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fontFamily = getFontFamily(settings.font)
  const fontSize = getFontSize(settings.fontSize)
  const fontWeight = getFontWeight(settings.fontWeight)
  const bgStyle = getBgStyle(settings)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', ...bgStyle }}>
      {messages.length === 0 && (
        <div style={{ textAlign: 'center', color: '#444466', fontSize: '12px', marginTop: '40px' }}>
          아직 메시지가 없어요<br />첫 번째 메시지를 보내보세요 💕
        </div>
      )}
      {messages.map(msg => (
        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'me' ? 'flex-end' : 'flex-start' }}>
          <div style={{
            maxWidth: '75%',
            padding: '8px 12px',
            borderRadius: msg.sender === 'me' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            background: msg.sender === 'me' ? '#5544bb' : 'rgba(255,255,255,0.1)',
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
