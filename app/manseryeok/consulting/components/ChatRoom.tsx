'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Message = {
  id: string
  sender: string
  message: string
  created_at: string
}

export default function ChatRoom({
  consultationId,
  consultantName,
  customerPhone,
}: {
  consultationId: string
  consultantName: string
  customerPhone: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchMessages()
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
      sender: 'customer',
      message: input.trim(),
    })
    setInput('')
    setSending(false)
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <div className="bg-stone-900 border-b border-stone-700 px-4 py-3">
        <div className="font-bold">{consultantName} 상담사</div>
        <div className="text-stone-400 text-xs">{customerPhone}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-stone-500 py-10 text-sm">
            상담사가 곧 입장합니다<br/>궁금한 점을 먼저 입력해주세요
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
              m.sender === 'customer'
                ? 'bg-amber-500 text-stone-950'
                : m.sender === 'summary'
                ? 'bg-stone-700 text-stone-100 whitespace-pre-wrap w-full max-w-sm'
                : 'bg-stone-800 text-stone-100'
            }`}>
              {m.sender === 'summary' && (
                <div className="text-amber-400 text-xs font-bold mb-2">📋 상담 요약</div>
              )}
              {m.message}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-stone-900 border-t border-stone-700 px-4 py-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="메시지를 입력하세요"
          className="flex-1 bg-stone-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50"
        >
          전송
        </button>
      </div>
    </div>
  )
}
