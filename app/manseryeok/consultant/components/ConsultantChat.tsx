'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useSendMessage } from '@/hooks/useSendMessage'
import ChatInputBox from '@/components/chat/ChatInputBox'

export default function ConsultantChat({
  consultationId,
  customerPhone,
  onBack,
  onViewSaju,
  pcMode = false,
  myBubbleColor = '#3d3488',
  customerBubbleColor = '#2a2a3a',
  fontSize = 13,
}: {
  consultationId: string
  customerPhone: string
  onBack: () => void
  onViewSaju: () => void
  pcMode?: boolean
  myBubbleColor?: string
  customerBubbleColor?: string
  fontSize?: number
}) {
  const { messages } = useChatMessages(consultationId)
  const { sending, sendMessage } = useSendMessage(consultationId, 'consultant')
  const [input, setInput] = useState('')

  useEffect(() => {
    supabase.from('consultations')
      .update({ status: 'in_progress' })
      .eq('id', consultationId)
  }, [consultationId])

  async function handleSend() {
    if (!input.trim()) return
    await sendMessage(input)
    setInput('')
  }

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>

      {/* 헤더 */}
      <div style={{
        display:'flex', alignItems:'center', gap:'12px',
        padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)',
        flexShrink:0,
      }}>
        {!pcMode && (
          <button onClick={onBack}
            style={{width:'32px',height:'32px',borderRadius:'10px',border:'none',background:'rgba(255,255,255,0.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="16" height="16">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}
        <div style={{flex:1}}>
          <div style={{fontSize:'14px',fontWeight:'500',color:'#e8e4ff'}}>{customerPhone}</div>
          <div style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',marginTop:'1px'}}>
            {pcMode ? '채팅 상담 중' : '고객 채팅방'}
          </div>
        </div>
        {pcMode ? (
          <button onClick={onBack}
            style={{fontSize:'11px',padding:'5px 12px',borderRadius:'8px',border:'1px solid rgba(255,80,80,0.2)',background:'transparent',color:'rgba(255,100,100,0.7)',cursor:'pointer'}}>
            상담 종료
          </button>
        ) : (
          <button onClick={onViewSaju}
            style={{fontSize:'11px',padding:'5px 12px',borderRadius:'8px',border:'1px solid rgba(250,199,117,0.3)',background:'rgba(250,199,117,0.1)',color:'#FAC775',cursor:'pointer'}}>
            사주보기
          </button>
        )}
      </div>

      {/* 메시지 영역 */}
      <div style={{flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'10px'}}>
        {messages.map((msg: any) => {
          const isMe = msg.sender === 'consultant'
          return (
            <div key={msg.id}
              style={{display:'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap:'8px', alignItems:'flex-end'}}>

              {/* 고객 아바타 */}
              {!isMe && (
                <div style={{
                  width:'28px', height:'28px', borderRadius:'50%', flexShrink:0,
                  background:'rgba(255,255,255,0.08)', display:'flex',
                  alignItems:'center', justifyContent:'center',
                  fontSize:'11px', color:'rgba(255,255,255,0.5)',
                }}>고</div>
              )}

              <div style={{maxWidth:'65%', display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start'}}>
                {!isMe && (
                  <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'3px'}}>고객</div>
                )}
                {/* 이미지 메시지 */}
                {msg.image_url ? (
                  <img src={msg.image_url} alt="이미지"
                    style={{maxWidth:'200px',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.1)'}}/>
                ) : (
                  <div style={{
                    padding:'9px 13px',
                    borderRadius: isMe ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                    background: isMe ? myBubbleColor : customerBubbleColor,
                    color: '#e8e4ff',
                    fontSize: fontSize + 'px',
                    lineHeight:'1.6',
                    whiteSpace:'pre-wrap',
                    wordBreak:'break-word',
                  }}>
                    {msg.message}
                  </div>
                )}
                <div style={{fontSize:'10px',color:'rgba(255,255,255,0.25)',marginTop:'3px'}}>
                  {new Date(msg.created_at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>

              {/* 상담사 아바타 */}
              {isMe && (
                <div style={{
                  width:'28px', height:'28px', borderRadius:'50%', flexShrink:0,
                  background:'rgba(119,102,221,0.3)', display:'flex',
                  alignItems:'center', justifyContent:'center',
                  fontSize:'11px', color:'#b8a9ff',
                }}>나</div>
              )}
            </div>
          )
        })}
      </div>

      {/* 입력창 */}
      <ChatInputBox
        input={input}
        setInput={setInput}
        onSend={handleSend}
        sending={sending}
      />
    </div>
  )
}
