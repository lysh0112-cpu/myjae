// app/manseryeok/couple-chat/page.tsx
'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ChatHeader from './ChatHeader'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import type { Message, Sender } from './data'

function CoupleChatInner() {
  const params = useSearchParams()
  const consultationId = params.get('consultationId') || ''
  const myRole = (params.get('role') || 'husband') as Sender

  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<'active' | 'completed'>('active')
  const [showSaju, setShowSaju] = useState(false)

  const supabase = createClient()

  // 메시지 로드
  useEffect(() => {
    if (!consultationId) return

    const loadMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: true })
      if (data) setMessages(data as Message[])
    }
    loadMessages()

    // Realtime 구독
    const channel = supabase
      .channel(`couple-chat-${consultationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `consultation_id=eq.${consultationId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [consultationId])

  // 텍스트 전송
  const handleSend = async (text: string) => {
    if (!consultationId) return
    await supabase.from('chat_messages').insert({
      consultation_id: consultationId,
      sender: myRole,
      message: text,
    })
  }

  // 이미지 전송
  const handleSendImage = async (file: File) => {
    if (!consultationId) return
    const ext = file.name.split('.').pop()
    const path = `chat/${consultationId}/${Date.now()}.${ext}`

    const { data: uploaded } = await supabase.storage
      .from('chat-images')
      .upload(path, file)

    if (!uploaded) return

    const { data: urlData } = supabase.storage
      .from('chat-images')
      .getPublicUrl(path)

    await supabase.from('chat_messages').insert({
      consultation_id: consultationId,
      sender: myRole,
      message: '[이미지]',
      image_url: urlData.publicUrl,
    })
  }

  // 음성 → 텍스트 전송
  const handleVoiceText = async (text: string) => {
    if (!text.trim() || !consultationId) return
    await supabase.from('chat_messages').insert({
      consultation_id: consultationId,
      sender: myRole,
      message: text,
    })
  }

  return (
    <main className="flex flex-col h-screen bg-[#0d0d1a]">
      <ChatHeader
        consultationStatus={status}
        onViewSaju={() => setShowSaju(prev => !prev)}
      />

      {/* 사주 보기 패널 */}
      {showSaju && (
        <div className="bg-[#13132a] border-b border-[#1e1e35] px-4 py-3">
          <div className="text-[11px] text-[#5555aa] mb-2">두 사람 사주</div>
          <div className="grid grid-cols-2 gap-2">
            {['남편', '아내'].map(who => (
              <div key={who} className="bg-[#0d0d1a] rounded-xl p-3 border border-[#252545]">
                <div className="text-[11px] text-[#7766bb] mb-2">{who}</div>
                <div className="flex gap-1">
                  {['甲', '子', '庚', '午'].map((c, i) => (
                    <div key={i} className="w-7 h-8 bg-[#13132a] rounded-md flex items-center justify-center text-[13px] text-[#c8c0ff] border border-[#252545]">
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ChatMessages messages={messages} myRole={myRole} />

      <ChatInput
        onSend={handleSend}
        onSendImage={handleSendImage}
        onVoiceText={handleVoiceText}
      />
    </main>
  )
}

export default function CoupleChatPage() {
  return (
    <Suspense>
      <CoupleChatInner />
    </Suspense>
  )
}
