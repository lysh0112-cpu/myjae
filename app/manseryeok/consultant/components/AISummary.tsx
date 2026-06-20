'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type SajuData = {
  time?: { stem: string; branch: string }
  day?: { stem: string; branch: string }
  month?: { stem: string; branch: string }
  year?: { stem: string; branch: string }
  relations?: string[]
  dayStem?: string
}

type Props = {
  consultationId: string | null
  consultantName: string
  customerPhone: string
  sajuData?: SajuData
}

export default function AISummary({ consultationId, consultantName, customerPhone, sajuData }: Props) {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function generateSummary() {
    if (!consultationId) {
      alert('고객 채팅방을 먼저 연결해주세요.\n채팅 탭 → 상담 선택 후 사주 탭으로 돌아오세요.')
      return
    }
    setLoading(true)
    try {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('sender, message, created_at')
        .eq('consultation_id', consultationId)
        .order('created_at')

      if (!messages || messages.length === 0) {
        alert('채팅 내용이 없습니다. 고객과 대화를 먼저 진행해주세요.')
        setLoading(false)
        return
      }

      const chatText = messages
        .map(m => `${m.sender === 'customer' ? '고객' : m.sender === 'consultant' ? '상담사' : '시스템'}: ${m.message}`)
        .join('\n')

      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultantName,
          customerPhone,
          chatText,
          sajuData,
        }),
      })
      const data = await res.json()
      setSummary(data.summary)
    } catch (e) {
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
      await supabase
        .from('consultations')
        .update({ summary })
        .eq('id', consultationId)
      setSent(true)
    } catch (e) {
      alert('전송 중 오류가 발생했습니다.')
    } finally {
      setSending(false)
    }
  }

  async function saveOnly() {
    if (!consultationId || !summary.trim()) return
    await supabase
      .from('consultations')
      .update({ summary })
      .eq('id', consultationId)
    alert('저장 완료!')
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{background:'#2C2C2A', border:'1px solid rgba(250,199,117,0.15)'}}>
      <div className="flex items-center justify-between px-4 py-3"
        style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div>
          <div className="text-sm font-bold text-white">상담 요약</div>
          <div className="text-xs mt-0.5" style={{color: consultationId ? '#4caf50' : '#8a88a0'}}>
            {consultationId ? `● ${customerPhone} 연결됨` : '채팅 탭에서 상담을 선택해주세요'}
          </div>
        </div>
        <button
          onClick={generateSummary}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold transition-all"
          style={{background:'rgba(60,52,137,0.4)', color:'#FAC775', border:'1px solid rgba(60,52,137,0.5)'}}
        >
          {loading ? (
            <><span className="animate-spin">✦</span>분석 중...</>
          ) : (
            <>✨ AI 요약 생성</>
          )}
        </button>
      </div>

      <div className="p-4">
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="AI 요약 생성 버튼을 눌러주세요&#10;채팅 대화 + 사주 분석을 함께 요약합니다"
          rows={10}
          className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none"
          style={{
            background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.08)',
            color:'#e0ddd0',
            lineHeight:'1.7',
          }}
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={sendToCustomer}
            disabled={sending || !summary.trim() || sent}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
            style={{
              background: sent ? 'rgba(76,175,80,0.2)' : 'rgba(60,52,137,0.5)',
              color: sent ? '#81c784' : '#FAC775',
              border: sent ? '1px solid rgba(76,175,80,0.3)' : '1px solid rgba(60,52,137,0.5)',
            }}
          >
            {sent ? '✓ 고객에게 전송 완료' : sending ? '전송 중...' : '고객에게 전송 + DB 저장'}
          </button>
          <button
            onClick={saveOnly}
            disabled={!summary.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{background:'rgba(255,255,255,0.06)', color:'#8a88a0', border:'1px solid rgba(255,255,255,0.08)'}}
          >
            저장만
          </button>
        </div>
        {sent && (
          <p className="text-xs text-center mt-2" style={{color:'#81c784'}}>
            고객 채팅방에 요약이 전달됐습니다 ✓
          </p>
        )}
      </div>
    </div>
  )
}
