'use client'
import { Suspense, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ChatBubble from './ChatBubble'
import { FIRST_MESSAGE, type ChatMode } from './data'
import { calcSaju, getSajuText } from './useSaju'
import { useAiChat } from './useAiChat'

function AiChatInner() {
  const params = useSearchParams()
  const router = useRouter()

  const mode = (params.get('mode') || 'personal') as ChatMode
  const person1Raw = params.get('person1')
  const person2Raw = params.get('person2')
  const userQuestion = decodeURIComponent(params.get('userQuestion') || '')
  const storageKey = `ai-chat-${mode}-${person1Raw?.slice(0, 20)}`

  const person1 = person1Raw ? JSON.parse(decodeURIComponent(person1Raw)) : null
  const person2 = person2Raw ? JSON.parse(decodeURIComponent(person2Raw)) : null

  const saju1 = person1 ? calcSaju(Number(person1.year), Number(person1.month), Number(person1.day), Number(person1.hour)) : []
  const saju2 = person2 ? calcSaju(Number(person2.year), Number(person2.month), Number(person2.day), Number(person2.hour)) : []
  const saju1Text = getSajuText(saju1)
  const saju2Text = getSajuText(saju2)

  const {
    messages, input, setInput,
    isStreaming, quickQuestions,
    sendMessage, handleClearChat,
    abortRef,
  } = useAiChat({
    mode, storageKey, userQuestion,
    saju1, saju2,
    gender1: person1?.gender || '남',
    gender2: person2?.gender || '여',
    firstAiMessage: FIRST_MESSAGE[mode],
  })

  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const modeLabel: Record<ChatMode, string> = {
    couple: '💑 연인 궁합',
    prewedding: '💍 예비 신혼',
    married: '👫 부부 상담',
    birth: '👶 출산 시기',
    personal: '🔮 개인 상담',
  }

  return (
    <main style={{minHeight:'100vh', background:'#0d0d1a', display:'flex', flexDirection:'column', maxWidth:'480px', margin:'0 auto'}}>

      {/* 헤더 */}
      <div style={{padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:'10px', position:'sticky', top:0, background:'#0d0d1a', zIndex:10}}>
        <button onClick={() => router.back()}
          style={{fontSize:'20px', color:'#9d8cff', background:'none', border:'none', cursor:'pointer'}}>‹</button>
        <div style={{flex:1}}>
          <div style={{fontSize:'15px', fontWeight:'500', color:'#e8e4ff'}}>명연재 AI 상담</div>
          <div style={{fontSize:'11px', color:'#5555aa', marginTop:'1px'}}>{modeLabel[mode]}</div>
        </div>
        <div style={{display:'flex', gap:'6px'}}>
          <button onClick={handleClearChat}
            style={{fontSize:'11px', padding:'4px 10px', borderRadius:'20px', background:'rgba(255,80,80,0.1)', color:'rgba(255,120,120,0.7)', border:'1px solid rgba(255,80,80,0.2)', cursor:'pointer'}}>
            초기화
          </button>
          <button onClick={() => router.push(`/manseryeok/consultant-select?mode=${mode}`)}
            style={{fontSize:'11px', padding:'4px 10px', borderRadius:'20px', background:'rgba(60,52,137,0.4)', color:'#b8a9ff', border:'1px solid rgba(119,102,221,0.4)', cursor:'pointer'}}>
            전문가 →
          </button>
        </div>
      </div>

      {/* 사주 요약 바 */}
      {saju1Text && (
        <div style={{padding:'7px 16px', background:'rgba(60,52,137,0.15)', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap'}}>
          <span style={{fontSize:'10px', color:'#7766aa'}}>
            {person1?.gender === '여' ? '여' : '남'}: {saju1Text}
          </span>
          {saju2Text && <>
            <span style={{fontSize:'10px', color:'#444466'}}>|</span>
            <span style={{fontSize:'10px', color:'#7766aa'}}>
              {person2?.gender === '여' ? '여' : '남'}: {saju2Text}
            </span>
          </>}
          <button onClick={() => router.back()}
            style={{marginLeft:'auto', fontSize:'10px', color:'#5544aa', background:'none', border:'none', cursor:'pointer', textDecoration:'underline'}}>
            수정
          </button>
        </div>
      )}

      {/* 채팅 영역 */}
      <div style={{flex:1, overflowY:'auto', padding:'20px 16px'}}>
        {messages.map((msg, i) => (
          <ChatBubble key={i} role={msg.role} content={msg.content}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 빠른 질문 */}
      {messages.length <= 2 && !isStreaming && !userQuestion && quickQuestions.length > 0 && (
        <div style={{padding:'0 16px 12px'}}>
          <div style={{fontSize:'11px', color:'#444466', marginBottom:'8px'}}>빠른 질문</div>
          <div style={{display:'flex', flexWrap:'wrap', gap:'6px'}}>
            {quickQuestions.map((q: string) => (
              <button key={q} onClick={() => sendMessage(q)}
                style={{fontSize:'12px', padding:'7px 12px', borderRadius:'20px', background:'#13132a', color:'#9977cc', border:'1px solid rgba(119,102,221,0.3)', cursor:'pointer'}}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 입력창 */}
      <div style={{padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.06)', background:'#0d0d1a', display:'flex', gap:'8px', alignItems:'flex-end'}}>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
          placeholder="궁금한 점을 입력하세요..." rows={1}
          style={{flex:1, background:'#13132a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px', padding:'10px 16px', color:'#e8e4ff', fontSize:'14px', resize:'none', outline:'none', fontFamily:'inherit', lineHeight:'1.5', maxHeight:'100px', overflowY:'auto'}}
          onInput={e => { const el = e.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px' }}
        />
        {isStreaming ? (
          <button onClick={() => abortRef.current?.abort()}
            style={{width:'40px', height:'40px', borderRadius:'50%', background:'rgba(255,80,80,0.2)', border:'none', color:'rgba(255,120,120,0.8)', cursor:'pointer', fontSize:'16px', flexShrink:0}}>
            ■
          </button>
        ) : (
          <button onClick={() => sendMessage(input)} disabled={!input.trim()}
            style={{width:'40px', height:'40px', borderRadius:'50%', flexShrink:0, background: input.trim() ? '#5544bb' : '#1a1a35', border:'none', cursor: input.trim() ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center'}}>
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
