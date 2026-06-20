'use client'
import { useState } from 'react'
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
      <div className="bg-stone-900 border-b border-stone-700 px-4 py-3">
        <div className="font-bold">{consultantName} 상담사</div>
        <div className="text-stone-400 text-xs">{customerPhone}</div>
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
