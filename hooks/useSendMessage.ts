import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useSendMessage(consultationId: string | null, sender: string) {
  const [sending, setSending] = useState(false)

  async function sendMessage(message: string) {
    if (!message.trim() || !consultationId) return
    setSending(true)
    await supabase.from('chat_messages').insert({
      consultation_id: consultationId,
      sender,
      message: message.trim(),
    })
    setSending(false)
  }

  return { sending, sendMessage }
}
