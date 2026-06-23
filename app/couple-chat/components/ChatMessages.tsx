'use client'
import { useEffect, useRef } from 'react'
import { ChatSettings } from './SettingsPanel'
import { BG_COLOR_MAP, BUBBLE_COLOR_MAP, PARTNER_BUBBLE_COLOR_MAP } from './AppearanceSection'

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

function isLightColor(hex: string): boolean {
  if (hex.startsWith('rgba')) return false
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return (r*299 + g*587 + b*114) / 1000 > 128
}

export default function ChatMessages({ messages, settings }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fontFamily = FONT_MAP[settings.font] || 'inherit'
  const fontSize = `${settings.fontSize}px`
  const fontWeight = String(settings.fontWeight)
  const bgColor = BG_COLOR_MAP[settings.bgColor] || '#0d0d1a'
  const myBubbleColor = BUBBLE_COLOR_MAP[settings.myBubble] || '#5544bb'
  const partnerBubbleColor = PARTNER_BUBBLE_COLOR_MAP[settings.partnerBubble] || 'rgba(255,255,255,0.12)'
  const myNick = settings.myNick || '나'
  const partnerNick = settings.partnerNick || '상대'

  const bgStyle: React.CSSProperties = settings.bgImage
    ? { backgroundImage: `url(${settings.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: bgColor }

  const lightBgs = ['rose','lavender','mint','peach','cloud']
  const isLight = lightBgs.includes(settings.bgColor)
  const timeColor = isLight ? '#888888' : '#444466'
  const emptyColor = isLight ? '#888888' : '#444466'

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', ...bgStyle }}>
      {messages.length === 0 && (
        <div style={{ textAlign: 'center', color: emptyColor, fontSize: '12px', marginTop: '40px' }}>
          아직 메시지가 없어요<br />첫 번째 메시지를 보내보세요 💕
        </div>
      )}
      {messages.map(msg => {
        const isMe = msg.sender === 'me'
        const bubbleBg = isMe ? myBubbleColor : partnerBubbleColor
        const textColor = isLightColor(bubbleBg) ? '#1a1a2e' : '#e8e4ff'

        return (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
            <div style={{ fontSize: '10px', color: isMe ? '#9d8cff' : '#f48fb1', marginBottom: '2px' }}>
              {isMe ? myNick : partnerNick}
            </div>
            <div style={{
              maxWidth: '75%',
              padding: '8px 12px',
              borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: bubbleBg,
              color: textColor,
              fontSize, fontWeight, fontFamily,
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.message}
            </div>
            <div style={{ fontSize: '10px', color: timeColor, marginTop: '3px' }}>
              {formatTime(msg.created_at)}
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
