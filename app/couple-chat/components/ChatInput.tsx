'use client'
import { useState, useRef } from 'react'

interface Props {
  onSend: (message: string) => void
  freeCharsLeft: number
}

export default function ChatInput({ onSend, freeCharsLeft }: Props) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0d0d1a', padding: '8px 16px 12px' }}>

      {/* 무료 글자수 표시 */}
      {freeCharsLeft <= 30 && freeCharsLeft > 0 && (
        <div style={{ fontSize: '11px', color: '#ff8888', textAlign: 'center', marginBottom: '6px' }}>
          무료 글자 {freeCharsLeft}자 남음
        </div>
      )}
      {freeCharsLeft <= 0 && (
        <div style={{ background: 'rgba(212,83,126,0.15)', border: '1px solid rgba(212,83,126,0.3)', borderRadius: '10px', padding: '8px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '11px', color: '#f48fb1' }}>무료 글자를 모두 사용했어요</div>
          <button style={{ background: '#D4537E', borderRadius: '20px', padding: '4px 10px', fontSize: '11px', color: '#fff', border: 'none', cursor: 'pointer' }}>
            쿠폰 구매
          </button>
        </div>
      )}

      {/* 툴바 */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', paddingLeft: '4px' }}>
        {[
          { icon: '😊', label: '이모티콘' },
          { icon: '📷', label: '사진' },
          { icon: '💕', label: '운세' },
          { icon: '📅', label: '기념일' },
          { icon: '🔒', label: '잠금' },
        ].map(t => (
          <div key={t.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
            <span style={{ fontSize: '18px' }}>{t.icon}</span>
            <span style={{ fontSize: '9px', color: '#444466' }}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* 입력창 */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="메시지 입력... (Shift+Enter 줄바꿈)"
          disabled={freeCharsLeft <= 0}
          rows={1}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '8px 14px',
            color: '#e8e4ff',
            fontSize: '13px',
            outline: 'none',
            resize: 'none',
            lineHeight: '1.5',
            maxHeight: '100px',
            overflow: 'auto',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || freeCharsLeft <= 0}
          style={{
            width: '36px', height: '36px',
            borderRadius: '50%',
            background: text.trim() && freeCharsLeft > 0 ? '#5544bb' : 'rgba(255,255,255,0.1)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', flexShrink: 0,
          }}>
          ➤
        </button>
      </div>
    </div>
  )
}
