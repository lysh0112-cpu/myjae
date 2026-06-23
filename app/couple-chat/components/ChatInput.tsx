'use client'
import { useState, useRef } from 'react'

interface Props {
  onSend: (message: string) => void
  freeCharsLeft: number
  startDate?: string
  ddayType?: string
  ddayTarget?: string
}

const EMOJIS = [
  '❤️','💕','💖','💗','💓','💞','💝','💘','🥰','😍',
  '😘','😗','😚','😙','🤗','🥺','😊','😄','😆','😂',
  '🤣','😭','😢','😅','🙈','🙉','🙊','🐱','🐶','🐰',
  '🐻','🐼','🦊','🐸','🌸','🌺','🌻','🌹','🍀','⭐',
  '✨','💫','🌙','☀️','🌈','🎉','🎊','🎁','🍕','🍰',
]

const FORTUNES = [
  '오늘 두 분의 오행 기운이 특히 잘 맞아요. 함께하는 시간이 더욱 빛날 거예요 ✨',
  '서로에게 솔직한 마음을 전해보세요. 작은 말 한마디가 큰 감동이 될 거예요 💫',
  '오늘은 새로운 약속을 잡기 좋은 날이에요. 함께 계획을 세워보세요 🌟',
  '두 분이 함께할수록 더 강해지는 인연이에요. 오늘도 서로를 응원해주세요 💪',
  '작은 배려가 큰 사랑이 되는 날이에요. 따뜻한 말 한마디를 건네보세요 🌸',
]

function calcDays(startDate: string): number {
  if (!startDate) return 0
  const start = new Date(startDate)
  const today = new Date()
  return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function calcDDayLeft(targetDate: string): number {
  if (!targetDate) return 0
  const target = new Date(targetDate)
  const today = new Date()
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function ChatInput({
  onSend, freeCharsLeft,
  startDate = '', ddayType = '기념일', ddayTarget = ''
}: Props) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
    setShowEmoji(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  const handleEmoji = (emoji: string) => {
    setText(prev => prev + emoji)
    textareaRef.current?.focus()
  }

  const handleFortune = () => {
    const today = new Date()
    const fortune = FORTUNES[today.getDate() % FORTUNES.length]
    onSend(`✦ 오늘의 궁합 운세\n${fortune}`)
  }

  const handleDDay = () => {
    const days = calcDays(startDate)
    const ddayLeft = calcDDayLeft(ddayTarget)
    const parts: string[] = []
    if (days > 0) parts.push(`💕 우리 만난 지 D+${days}일이에요!`)
    if (ddayTarget) {
      if (ddayLeft > 0) parts.push(`🎯 ${ddayType}까지 D-${ddayLeft}일 남았어요!`)
      else if (ddayLeft === 0) parts.push(`🎉 오늘이 ${ddayType}이에요!`)
      else parts.push(`🎊 ${ddayType} D+${Math.abs(ddayLeft)}일 지났어요!`)
    }
    if (parts.length === 0) parts.push('💕 설정에서 기념일 날짜를 입력해주세요!')
    onSend(parts.join('\n'))
  }

  const toolStyle = (active = false): React.CSSProperties => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '2px', cursor: 'pointer',
  })

  const labelStyle = (active = false): React.CSSProperties => ({
    fontSize: '9px', color: active ? '#c8b0ff' : '#444466'
  })

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0d0d1a', padding: '8px 16px 12px' }}>

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

      {/* 이모지 팔레트 */}
      {showEmoji && (
        <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px', marginBottom: '8px', maxHeight: '120px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
            {EMOJIS.map((emoji, i) => (
              <button key={i} onClick={() => handleEmoji(emoji)}
                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', padding: '4px', borderRadius: '6px', lineHeight: 1 }}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 툴바 */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '8px', paddingLeft: '4px' }}>
        <button onClick={() => setShowEmoji(!showEmoji)}
          style={{ ...toolStyle(), background: 'none', border: 'none', padding: 0 }}>
          <span style={{ fontSize: '20px' }}>😊</span>
          <span style={labelStyle(showEmoji)}>이모티콘</span>
        </button>
        <div style={toolStyle()}>
          <span style={{ fontSize: '20px' }}>📷</span>
          <span style={labelStyle()}>사진</span>
        </div>
        <button onClick={handleFortune}
          style={{ ...toolStyle(), background: 'none', border: 'none', padding: 0 }}>
          <span style={{ fontSize: '20px' }}>💕</span>
          <span style={labelStyle()}>운세</span>
        </button>
        <button onClick={handleDDay}
          style={{ ...toolStyle(), background: 'none', border: 'none', padding: 0 }}>
          <span style={{ fontSize: '20px' }}>📅</span>
          <span style={labelStyle()}>기념일</span>
        </button>
        <div style={toolStyle()}>
          <span style={{ fontSize: '20px' }}>🔒</span>
          <span style={labelStyle()}>잠금</span>
        </div>
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
            flex: 1, background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px',
            padding: '8px 14px', color: '#e8e4ff', fontSize: '13px',
            outline: 'none', resize: 'none', lineHeight: '1.5',
            maxHeight: '100px', overflow: 'auto',
          }}
        />
        <button onClick={handleSend}
          disabled={!text.trim() || freeCharsLeft <= 0}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
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
