'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ChatHeader from './components/ChatHeader'
import DailyFortune from './components/DailyFortune'
import ChatMessages, { Message } from './components/ChatMessages'
import ChatInput from './components/ChatInput'
import SettingsPanel from './components/SettingsPanel'

const FREE_LIMIT = 100
const CHAT_KEY = 'couple_chat_messages'

export default function CoupleChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [usedChars, setUsedChars] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem(CHAT_KEY)
    if (saved) {
      const data = JSON.parse(saved)
      setMessages(data.messages || [])
      setUsedChars(data.usedChars || 0)
    }
  }, [])

  const handleSend = (text: string) => {
    if (usedChars + text.length > FREE_LIMIT) return
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: 'me',
      message: text,
      created_at: new Date().toISOString(),
    }
    const updated = [...messages, newMsg]
    const newUsed = usedChars + text.length
    setMessages(updated)
    setUsedChars(newUsed)
    localStorage.setItem(CHAT_KEY, JSON.stringify({ messages: updated, usedChars: newUsed }))
  }

  const handleClearChat = () => {
    setMessages([])
    setUsedChars(0)
    localStorage.removeItem(CHAT_KEY)
  }

  const freeCharsLeft = FREE_LIMIT - usedChars

  return (
    <main style={{ minHeight: '100vh', background: '#0d0d1a', maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <ChatHeader onSettingsOpen={() => setSettingsOpen(true)} />
      
      {/* D+day */}
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <span style={{ background: 'rgba(212,83,126,0.2)', border: '1px solid rgba(212,83,126,0.3)', borderRadius: '20px', padding: '3px 12px', fontSize: '11px', color: '#f48fb1' }}>
          💕 D+365 · 기념일까지 D-30
        </span>
      </div>

      <DailyFortune />

      <ChatMessages messages={messages} />

      <ChatInput onSend={handleSend} freeCharsLeft={freeCharsLeft} />

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onClearChat={handleClearChat}
      />

      {/* 뒤로가기 — 궁합 결과로 */}
      <div style={{ position: 'fixed', bottom: '80px', right: '20px', zIndex: 30 }}>
        <button onClick={() => router.push('/manseryeok/couple-result')}
          style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(60,52,137,0.8)', border: '1px solid rgba(119,102,221,0.4)', color: '#c8b0ff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          💑
        </button>
      </div>
    </main>
  )
}
