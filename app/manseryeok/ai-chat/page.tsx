'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ChatBubble from './ChatBubble'
import { FIRST_MESSAGE, QUICK_QUESTIONS, type Message, type ChatMode } from './data'

function AiChatInner() {
  const params = useSearchParams()
  const router = useRouter()

  const mode = (params.get('mode') || 'personal') as ChatMode
  const consultationId = params.get('consultationId') || ''

  // URL에서 사주·용신 파라미터 파싱
  const saju1 = params.get('saju1') ? JSON.parse(decodeURIComponent(params.get('saju1')!)) : []
  const saju2 = params.get('saju2') ? JSON.parse(decodeURIComponent(params.get('saju2')!)) : []
  const gender1 = params.get('gender1') || '남'
  const gender2 = params.get('gender2') || '여'
  const yongsin1 = params.get('yongsin1') ? JSON.parse(decodeURIComponent(params.get('yongsin1')!)) : null
  const yongsin2 = params.get('yongsin2') ? JSON.parse(decodeURIComponent(params.get('yongsin2')!)) : null
  const userQuestion = params.get('userQuestion') || ''

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: FIRST_MESSAGE[mode] }
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return

    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setIsStreaming(true)

    // AI 답변 버블 미리 추가
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      abortRef.current = new AbortController()

      const res = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          mode, saju1, saju2,
          gender1, gender2,
          yongsin1, yongsin2,
          userQuestion,
        }),
        signal: abortRef.current.signal,
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let aiText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const { text } = JSON.parse(data)
              aiText += text
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: aiText }
                return updated
              })
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: '오류가 발생했어요. 다시 시도해주세요.' }
          return updated
        })
      }
    } finally {
      setIsStreaming(false)
    }
  }

  const modeLabel: Record<ChatMode, string> = {
    couple: '💑 연인 궁합',
    prewedding: '💍 예비 신혼',
    married: '👫 부부 상담',
    birth: '👶 출산 시기',
    personal: '🔮 개인 상담',
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#0d0d1a',
      display: 'flex', flexDirection: 'column',
      maxWidth: '480px', margin: '0 auto',
    }}>

      {/* 헤더 */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: '10px',
        position: 'sticky', top: 0, background: '#0d0d1a', zIndex: 10,
      }}>
        <button onClick={() => router.back()}
          style={{fontSize: '20px', color: '#9d8cff', background: 'none', border: 'none', cursor: 'pointer'}}>
          ‹
        </button>
        <div style={{flex: 1}}>
          <div style={{fontSize: '15px', fontWeight: '500', color: '#e8e4ff'}}>
            명연재 AI 상담
          </div>
          <div style={{fontSize: '11px', color: '#5555aa', marginTop: '1px'}}>
            {modeLabel[mode]}
          </div>
        </div>
        {/* 전문가 상담 연결 버튼 */}
        <button
          onClick={() => router.push(`/manseryeok/consultant-select?mode=${mode}`)}
          style={{
            fontSize: '11px', padding: '5px 12px', borderRadius: '20px',
            background: 'rgba(60,52,137,0.4)', color: '#b8a9ff',
            border: '1px solid rgba(119,102,221,0.4)', cursor: 'pointer',
          }}>
          전문가 상담 →
        </button>
      </div>

      {/* 채팅 영역 */}
      <div style={{flex: 1, overflowY: 'auto', padding: '20px 16px'}}>
        {messages.map((msg, i) => (
          <ChatBubble
            key={i}
            role={msg.role}
            content={msg.content}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 빠른 질문 버튼 (첫 메시지 후에만 표시) */}
      {messages.length <= 2 && !isStreaming && (
        <div style={{padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
          {QUICK_QUESTIONS[mode].map(q => (
            <button key={q} onClick={() => sendMessage(q)}
              style={{
                fontSize: '12px', padding: '7px 12px', borderRadius: '20px',
                background: '#13132a', color: '#9977cc',
                border: '1px solid rgba(119,102,221,0.3)', cursor: 'pointer',
              }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* 입력창 */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
        background: '#0d0d1a', display: 'flex', gap: '8px', alignItems: 'flex-end',
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage(input)
            }
          }}
          placeholder="궁금한 점을 입력하세요..."
          rows={1}
          style={{
            flex: 1, background: '#13132a', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px', padding: '10px 16px',
            color: '#e8e4ff', fontSize: '14px', resize: 'none',
            outline: 'none', fontFamily: 'inherit', lineHeight: '1.5',
            maxHeight: '100px', overflowY: 'auto',
          }}
          onInput={e => {
            const el = e.target as HTMLTextAreaElement
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 100) + 'px'
          }}
        />

        {isStreaming ? (
          <button
            onClick={() => abortRef.current?.abort()}
            style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(255,80,80,0.2)', border: 'none',
              color: 'rgba(255,120,120,0.8)', cursor: 'pointer', fontSize: '16px',
            }}>
            ■
          </button>
        ) : (
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: input.trim() ? '#5544bb' : '#1a1a35',
              border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          </button>
        )}
      </div>

    </main>
  )
}

export default function AiChatPage() {
  return (
    <Suspense fallback={
      <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0d0d1a'}}>
        <div style={{color:'#FAC775'}}>로딩 중...</div>
      </div>
    }>
      <AiChatInner />
    </Suspense>
  )
}
