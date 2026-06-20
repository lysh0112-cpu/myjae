'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useSendMessage } from '@/hooks/useSendMessage'
import ChatMessageList from '@/components/chat/ChatMessageList'
import ChatInputBox from '@/components/chat/ChatInputBox'

export default function ChatRoom({
  consultationId,
  consultantName,
  customerPhone,
}: {
  consultationId: string
  consultantName: string
  customerPhone: string
}) {
  const router = useRouter()
  const { messages } = useChatMessages(consultationId)
  const { sending, sendMessage } = useSendMessage(consultationId, 'customer')
  const [input, setInput] = useState('')

  async function handleSend() {
    if (!input.trim()) return
    await sendMessage(input)
    setInput('')
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col"
      style={{ maxWidth: '430px', margin: '0 auto' }}>
      <div className="bg-stone-900 border-b border-stone-700 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{background:'rgba(255,255,255,0.08)'}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-white">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <div className="font-bold">{consultantName} 상담사</div>
          <div className="text-stone-400 text-xs">{customerPhone}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <ChatMessageList messages={messages} myRole="customer" />
      </div>
      <ChatInputBox
        input={input}
        setInput={setInput}
        onSend={handleSend}
        sending={sending}
      />
    </div>
  )
}
