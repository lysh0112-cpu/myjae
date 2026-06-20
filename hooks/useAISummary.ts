import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useAISummary(consultationId: string | null, consultantName: string, customerPhone: string) {
  const [summary, setSummary] = useState('')
  const [commentary, setCommentary] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function generate(sajuData?: object) {
    if (!consultationId) {
      alert('채팅 탭 → 상담 선택 후 사주 탭으로 돌아오세요.')
      return
    }
    setLoading(true)
    try {
      // 채팅 내용
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('sender, message')
        .eq('consultation_id', consultationId)
        .order('created_at')

      if (!messages?.length) {
        alert('채팅 내용이 없습니다.')
        setLoading(false)
        return
      }

      // 상담사 해설
      const { data: cd } = await supabase
        .from('commentaries')
        .select('content')
        .eq('consultation_id', consultationId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      const commentary = cd?.content ?? ''
      setCommentary(commentary)

      // 고객 AI 분석 결과
      const { data: consultationData } = await supabase
        .from('consultations')
        .select('ai_analysis')
        .eq('id', consultationId)
        .single()

      const aiAnalysis = consultationData?.ai_analysis ?? ''

      const chatText = messages
        .filter(m => m.sender !== 'summary')
        .map(m => `${m.sender === 'customer' ? '고객' : '상담사'}: ${m.message}`)
        .join('\n')

      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultantName, customerPhone,
          chatText, sajuData, commentary, aiAnalysis,
        }),
      })
      const data = await res.json()
      setSummary(data.summary)
    } catch {
      alert('요약 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function sendToCustomer() {
    if (!consultationId || !summary.trim()) return
    setSending(true)
    try {
      await supabase.from('chat_messages').insert({
        consultation_id: consultationId,
        sender: 'summary',
        message: summary,
      })
      await supabase.from('consultations').update({ summary }).eq('id', consultationId)
      setSent(true)
    } catch {
      alert('전송 중 오류가 발생했습니다.')
    } finally {
      setSending(false)
    }
  }

  async function saveOnly() {
    if (!consultationId || !summary.trim()) return
    await supabase.from('consultations').update({ summary }).eq('id', consultationId)
    alert('저장 완료!')
  }

  return { summary, setSummary, commentary, loading, sending, sent, generate, sendToCustomer, saveOnly }
}
