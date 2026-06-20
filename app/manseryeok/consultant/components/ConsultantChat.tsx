'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Message = {
  id: string
  sender: string
  message: string
  created_at: string
}

export default function ConsultantChat({
  consultationId,
  customerPhone,
  onBack,
}: {
  consultationId: string
  customerPhone: string
  onBack: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchMessages()
    // 상담 상태를 진행중으로 업데이트
    supabase
      .from('consultations')
      .update({ status: 'in_progress' })
      .eq('id', consultationId)

    const channel = supabase
      .channel(`chat:${consultationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `consultation_id=eq.${consultationId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [consultationId])

  async function fetchMessages() {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('created_at')
    if (data) setMessages(data)
  }

  async function sendMessage() {
    if (!input.trim()) return
    setSending(true)
    await supabase.from('chat_messages').insert({
      consultation_id: consultationId,
      sender: 'consultant',
      message: input.trim(),
    })
    setInput('')
    setSending(false)
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-white">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <div className="font-bold text-white text-sm">{customerPhone}</div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>고객 채팅방</div>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10 text-sm"
            style={{ color: 'rgba(255,255,255,0.3)' }}>
            아직 메시지가 없습니다
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id}
            className={`flex ${m.sender === 'consultant' ? 'justify-end' : 'justify-start'}`}>
            {m.sender !== 'consultant' && (
              <div className="text-xs mr-2 mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                고객
              </div>
            )}
            <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
              m.sender === 'consultant'
                ? 'text-stone-950'
                : m.sender === 'summary'
                ? 'whitespace-pre-wrap w-full max-w-sm'
                : ''
            }`}
              style={{
                background: m.sender === 'consultant'
                  ? '#FAC775'
                  : m.sender === 'summary'
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(255,255,255,0.08)',
                color: m.sender === 'consultant'
                  ? '#1a1a18'
                  : '#fff',
              }}
            >
              {m.sender === 'summary' && (
                <div className="text-xs font-bold mb-2" style={{ color: '#FAC775' }}>
                  📋 상담 요약
                </div>
              )}
              {m.message}
            </div>
          </div>
        ))}
      </div>

      {/* 입력창 */}
      <div className="px-4 py-3 flex gap-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder="답장 입력..."
          className="flex-1 rounded-xl px-4 py-2 text-sm focus:outline-none"
          style={{
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          style={{ background: '#FAC775', color: '#1a1a18' }}
        >
          전송
        </button>
      </div>
    </div>
  )
}
