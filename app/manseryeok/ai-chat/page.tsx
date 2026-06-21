'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ChatBubble from './ChatBubble'
import { FIRST_MESSAGE, QUICK_QUESTIONS, type Message, type ChatMode } from './data'

// 사주 계산 함수
const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

function calcSaju(year: number, month: number, day: number, hour: number) {
  // 간단한 년주·월주·일주·시주 계산
  const yIdx = (year - 4) % 60
  const yearStem = STEMS[yIdx % 10]
  const yearBranch = BRANCHES[yIdx % 12]

  // 일주 계산 (기준일: 2000.1.1 = 甲子일)
  const base = new Date(2000, 0, 1)
  const target = new Date(year, month - 1, day)
  const diff = Math.round((target.getTime() - base.getTime()) / 86400000)
  const dayIdx = ((diff % 60) + 60) % 60
  const dayStem = STEMS[dayIdx % 10]
  const dayBranch = BRANCHES[dayIdx % 12]

  // 월주 (절기 무시 간략 계산)
  const mIdx = ((year - 4) * 12 + (month - 1)) % 60
  const monthStem = STEMS[((mIdx % 60) + 60) % 60 % 10]
  const monthBranch = BRANCHES[((month + 1) % 12)]

  // 시주
  const hIdx = hour < 0 ? -1 : Math.floor((hour + 1) / 2) % 12
  const hourStem = hour < 0 ? '' : STEMS[(dayIdx % 5) * 2 + (hIdx % 10)] || ''
  const hourBranch = hour < 0 ? '' : BRANCHES[hIdx] || ''

  const saju = [
    { pillar: '년주', stem: yearStem, branch: yearBranch },
    { pillar: '월주', stem: monthStem, branch: monthBranch },
    { pillar: '일주', stem: dayStem, branch: dayBranch },
  ]

  if (hour >= 0 && hourBranch) {
    saju.push({ pillar: '시주', stem: hourStem, branch: hourBranch })
  }

  return { saju, dayStem }
}

function getSajuText(saju: any[]) {
  return saju.map(s => `${s.pillar}: ${s.stem}${s.branch}`).join(', ')
}

function AiChatInner() {
  const params = useSearchParams()
  const router = useRouter()

  const mode = (params.get('mode') || 'personal') as ChatMode
  const person1Raw = params.get('person1')
  const person2Raw = params.get('person2')
  const userQuestion = params.get('userQuestion') || ''

  // sessionStorage 키
  const storageKey = `ai-chat-${mode}-${person1Raw?.slice(0,20)}`

  // 사주 계산
  const person1 = person1Raw ? JSON.parse(decodeURIComponent(person1Raw)) : null
  const person2 = person2Raw ? JSON.parse(decodeURIComponent(person2Raw)) : null

  const saju1 = person1 ? calcSaju(
    Number(person1.year), Number(person1.month), Number(person1.day),
    Number(person1.hour)
  ).saju : []

  const saju2 = person2 ? calcSaju(
    Number(person2.year), Number(person2.month), Number(person2.day),
    Number(person2.hour)
  ).saju : []

  const saju1Text = getSajuText(saju1)
  const saju2Text = getSajuText(saju2)

  // 초기 메시지 (사주 정보 포함)
  const getFirstMessage = () => {
    const base = FIRST_MESSAGE[mode]
    if (saju1Text) {
      return base + (saju1Text ? `\n\n사주 정보를 확인했어요.\n${person1?.gender === '여' ? '여성' : '남성'}: ${saju1Text}${saju2Text ? `\n${person2?.gender === '여' ? '여성' : '남성'}: ${saju2Text}` : ''}` : '')
    }
    return base
  }

  const [messages, setMessages] = useState<Message[]>(() => {
    // sessionStorage에서 복원
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(storageKey)
      if (saved) return JSON.parse(saved)
    }
    return [{ role: 'assistant', content: getFirstMessage() }]
  })

  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // 메시지 변경 시 sessionStorage 저장
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(storageKey, JSON.stringify(messages))
    }
  }, [messages, storageKey])

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

    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      abortRef.current = new AbortController()

      const res = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          mode,
          saju1, saju2,
          gender1: person1?.gender || '남',
          gender2: person2?.gender || '여',
          yongsin1: null,
          yongsin2: null,
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

  const handleClearChat = () => {
    if (confirm('대화 내용을 초기화할까요?')) {
      sessionStorage.removeItem(storageKey)
      setMessages([{ role: 'assistant', content: getFirstMessage() }])
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
          style={{fontSize:'20px', color:'#9d8cff', background:'none', border:'none', cursor:'pointer'}}>
          ‹
        </button>
        <div style={{flex:1}}>
          <div style={{fontSize:'15px', fontWeight:'500', color:'#e8e4ff'}}>명연재 AI 상담</div>
          <div style={{fontSize:'11px', color:'#5555aa', marginTop:'1px'}}>{modeLabel[mode]}</div>
        </div>
        <div style={{display:'flex', gap:'6px', alignItems:'center'}}>
          {/* 초기화 버튼 */}
          <button onClick={handleClearChat}
            style={{
              fontSize:'11px', padding:'4px 10px', borderRadius:'20px',
              background:'rgba(255,80,80,0.1)', color:'rgba(255,120,120,0.7)',
              border:'1px solid rgba(255,80,80,0.2)', cursor:'pointer',
            }}>
            초기화
          </button>
          {/* 전문가 상담 */}
          <button onClick={() => router.push(`/manseryeok/consultant-select?mode=${mode}`)}
            style={{
              fontSize:'11px', padding:'4px 10px', borderRadius:'20px',
              background:'rgba(60,52,137,0.4)', color:'#b8a9ff',
              border:'1px solid rgba(119,102,221,0.4)', cursor:'pointer',
            }}>
            전문가 →
          </button>
        </div>
      </div>

      {/* 사주 정보 요약 바 */}
      {saju1Text && (
        <div style={{
          padding:'8px 16px', background:'rgba(60,52,137,0.15)',
          borderBottom:'1px solid rgba(255,255,255,0.04)',
          display:'flex', alignItems:'center', gap:'8px',
          flexWrap:'wrap',
        }}>
          <span style={{fontSize:'10px', color:'#7766aa'}}>
            {person1?.gender === '여' ? '여' : '남'}: {saju1Text}
          </span>
          {saju2Text && (
            <>
              <span style={{fontSize:'10px', color:'#444466'}}>|</span>
              <span style={{fontSize:'10px', color:'#7766aa'}}>
                {person2?.gender === '여' ? '여' : '남'}: {saju2Text}
              </span>
            </>
          )}
          <button
            onClick={() => router.back()}
            style={{
              marginLeft:'auto', fontSize:'10px', color:'#5544aa',
              background:'none', border:'none', cursor:'pointer',
              textDecoration:'underline',
            }}>
            수정
          </button>
        </div>
      )}

      {/* 채팅 영역 */}
      <div style={{flex:1, overflowY:'auto', padding:'20px 16px'}}>
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

      {/* 빠른 질문 */}
      {messages.length <= 2 && !isStreaming && (
        <div style={{padding:'0 16px 12px', display:'flex', flexWrap:'wrap', gap:'6px'}}>
          {QUICK_QUESTIONS[mode].map(q => (
            <button key={q} onClick={() => sendMessage(q)}
              style={{
                fontSize:'12px', padding:'7px 12px', borderRadius:'20px',
                background:'#13132a', color:'#9977cc',
                border:'1px solid rgba(119,102,221,0.3)', cursor:'pointer',
              }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* 입력창 */}
      <div style={{
        padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.06)',
        background:'#0d0d1a', display:'flex', gap:'8px', alignItems:'flex-end',
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
            flex:1, background:'#13132a',
            border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:'20px', padding:'10px 16px',
            color:'#e8e4ff', fontSize:'14px', resize:'none',
            outline:'none', fontFamily:'inherit', lineHeight:'1.5',
            maxHeight:'100px', overflowY:'auto',
          }}
          onInput={e => {
            const el = e.target as HTMLTextAreaElement
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 100) + 'px'
          }}
        />

        {isStreaming ? (
          <button onClick={() => abortRef.current?.abort()}
            style={{
              width:'40px', height:'40px', borderRadius:'50%',
              background:'rgba(255,80,80,0.2)', border:'none',
              color:'rgba(255,120,120,0.8)', cursor:'pointer', fontSize:'16px',
              flexShrink:0,
            }}>
            ■
          </button>
        ) : (
          <button onClick={() => sendMessage(input)} disabled={!input.trim()}
            style={{
              width:'40px', height:'40px', borderRadius:'50%', flexShrink:0,
              background: input.trim() ? '#5544bb' : '#1a1a35',
              border:'none', cursor: input.trim() ? 'pointer' : 'default',
              display:'flex', alignItems:'center', justifyContent:'center',
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
