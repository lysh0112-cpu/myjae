'use client'
import { useEffect, useRef } from 'react'

export interface Message {
  id: string
  sender: 'me' | 'partner'
  message: string
  created_at: string
}

interface Props {
  messages: Message[]
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  const h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? '오후' : '오전'
  return `${ampm} ${h > 12 ? h - 12 : h}:${m}`
}

export default function ChatMessages({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            fontSize: '13px',
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
