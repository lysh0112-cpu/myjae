import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type Message = {
  id: string
  sender: string
  message: string
  created_at: string
}

export function useChatMessages(consultationId: string) {
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    if (!consultationId) return

    async function fetchMessages() {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at')
      if (data) setMessages(data)
    }

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

  return { messages }
}
