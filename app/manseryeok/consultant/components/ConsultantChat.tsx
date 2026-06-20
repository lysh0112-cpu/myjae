'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useSendMessage } from '@/hooks/useSendMessage'
import ChatMessageList from '@/components/chat/ChatMessageList'
import ChatInputBox from '@/components/chat/ChatInputBox'

export default function ConsultantChat({
  consultationId,
  customerPhone,
  onBack,
  onViewSaju,
}: {
  consultationId: string
  customerPhone: string
  onBack: () => void
  onViewSaju: () => void
}) {
  const { messages } = useChatMessages(consultationId)
  const { sending, sendMessage } = useSendMessage(consultationId, 'consultant')
  const [input, setInput] = useState('')

  useEffect(() => {
    supabase
      .from('consultations')
      .update({ status: 'in_progress' })
      .eq('id', consultationId)
  }, [consultationId])

  async function handleSend() {
    if (!input.trim()) return
    await sendMessage(input)
    setInput('')
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      <div className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={onBack}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-white">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="flex-1">
          <div className="font-bold text-white text-sm">{customerPhone}</div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>고객 채팅방</div>
        </div>
        <button onClick={onViewSaju}
          className="text-xs px-3 py-1.5 rounded-xl font-semibold"
          style={{ background: 'rgba(250,199,117,0.15)', color: '#FAC775', border: '1px solid rgba(250,199,117,0.3)' }}>
          사주보기
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <ChatMessageList messages={messages} myRole="consultant" />
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
