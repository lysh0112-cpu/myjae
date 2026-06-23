'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ChatHeader from './components/ChatHeader'
import DailyFortune from './components/DailyFortune'
import ChatMessages, { Message } from './components/ChatMessages'
import ChatInput from './components/ChatInput'
import SettingsPanel, { ChatSettings } from './components/SettingsPanel'

const FREE_LIMIT = 100
const CHAT_KEY = 'couple_chat_messages'
const SETTINGS_KEY = 'couple_chat_settings'

const DEFAULT_SETTINGS: ChatSettings = {
  bg: 'star',
  bgImage: '',
  font: '기본체',
  fontSize: '보통',
  fontWeight: '보통',
  myNick: '',
  partnerNick: '',
  fortuneOn: true,
  dDayOn: true,
  lockOn: false,
  startDate: '',
}

function calcDays(startDate: string): number {
  if (!startDate) return 0
  const start = new Date(startDate)
  const today = new Date()
  return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function getNextMilestone(days: number): { milestone: number; daysLeft: number } | null {
  const MILESTONES = [30, 50, 100, 200, 300, 365, 500, 1000]
  for (const m of MILESTONES) {
    if (days < m) return { milestone: m, daysLeft: m - days }
  }
  return null
}

export default function CoupleChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [usedChars, setUsedChars] = useState(0)
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    const savedChat = localStorage.getItem(CHAT_KEY)
    if (savedChat) {
      const data = JSON.parse(savedChat)
      setMessages(data.messages || [])
      setUsedChars(data.usedChars || 0)
    }
    const savedSettings = localStorage.getItem(SETTINGS_KEY)
    if (savedSettings) {
      setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) })
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

  const handleSaveSettings = (newSettings: ChatSettings) => {
    setSettings(newSettings)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings))
  }

  const freeCharsLeft = FREE_LIMIT - usedChars
  const days = calcDays(settings.startDate)
  const next = getNextMilestone(days)

  return (
    <main style={{ minHeight: '100vh', background: '#0d0d1a', maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <ChatHeader onSettingsOpen={() => setSettingsOpen(true)} />

      {settings.startDate && days > 0 && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <span style={{ background: 'rgba(212,83,126,0.2)', border: '1px solid rgba(212,83,126,0.3)', borderRadius: '20px', padding: '3px 12px', fontSize: '11px', color: '#f48fb1' }}>
            💕 D+{days} {next ? `· D+${next.milestone}까지 ${next.daysLeft}일` : '· 축하해요! 🎉'}
          </span>
        </div>
      )}

      {settings.fortuneOn && <DailyFortune />}

      <ChatMessages messages={messages} settings={settings} />

      <ChatInput onSend={handleSend} freeCharsLeft={freeCharsLeft} />

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onClearChat={handleClearChat}
        onSaveSettings={handleSaveSettings}
        settings={settings}
      />

      <div style={{ position: 'fixed', bottom: '80px', right: '20px', zIndex: 30 }}>
        <button onClick={() => router.push('/manseryeok/couple-result')}
          style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(60,52,137,0.8)', border: '1px solid rgba(119,102,221,0.4)', color: '#c8b0ff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          💑
        </button>
      </div>
    </main>
  )
}
