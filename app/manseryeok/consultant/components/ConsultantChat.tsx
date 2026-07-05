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

  // 이 상담 건의 시작·종료 시각
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [completedAt, setCompletedAt] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // 경과시간 초시계용 — 매초 갱신되는 현재시각
  const [now, setNow] = useState<number>(Date.now())

  // 채팅창이 열리면 현재 시작·종료 상태를 읽어옴
  // (자동으로 in_progress 로 바꾸지 않음 — 시작은 반드시 [상담 시작] 버튼으로)
  useEffect(() => {
    let cancelled = false
    supabase.from('consultations')
      .select('started_at, completed_at')
      .eq('id', consultationId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return
        setStartedAt(data.started_at ?? null)
        setCompletedAt(data.completed_at ?? null)
      })
    return () => { cancelled = true }
  }, [consultationId])

  // 상담 진행 중일 때만 초시계가 매초 흐름 (시작됨 & 아직 종료 안 됨)
  useEffect(() => {
    if (!startedAt || completedAt) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [startedAt, completedAt])

  async function handleSend() {
    if (!input.trim()) return
    await sendMessage(input)
    setInput('')
  }

  // [상담 시작] → started_at 기록, status=in_progress
  async function handleStart() {
    if (busy) return
    setBusy(true)
    try {
      const iso = new Date().toISOString()
      await supabase.from('consultations')
        .update({ started_at: iso, status: 'in_progress' })
        .eq('id', consultationId)
      setStartedAt(iso)
      setNow(Date.now())
    } catch (err) {
      console.error(err)
      alert('시작 처리 중 문제가 생겼어요.')
    } finally {
      setBusy(false)
    }
  }

  // [상담 종료] → completed_at 기록, status=completed → 목록으로 복귀
  async function handleEnd() {
    if (busy) return
    if (!startedAt) {
      if (!confirm('아직 [상담 시작]을 누르지 않았어요. 그래도 종료할까요?')) return
    }
    if (!confirm('이 상담을 종료할까요? 종료 시각이 기록됩니다.')) return
    setBusy(true)
    try {
      const iso = new Date().toISOString()
      await supabase.from('consultations')
        .update({ completed_at: iso, status: 'completed' })
        .eq('id', consultationId)
      setCompletedAt(iso)
      onBack()   // 목록으로 복귀
    } catch (err) {
      console.error(err)
      alert('종료 처리 중 문제가 생겼어요.')
      setBusy(false)
    }
  }

  // 시각 → "14:35"
  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''

  // 경과시간 → "00:12:34"
  function elapsedText(): string {
    if (!startedAt) return '00:00:00'
    const end = completedAt ? new Date(completedAt).getTime() : now
    let sec = Math.floor((end - new Date(startedAt).getTime()) / 1000)
    if (sec < 0) sec = 0
    const h = String(Math.floor(sec / 3600)).padStart(2, '0')
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0')
    const s = String(sec % 60).padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  // 초시계 배지 색 — 진행중(초록) / 종료됨(회색)
  const running = !!startedAt && !completedAt

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>

      {/* 헤더 */}
      <div style={{
        display:'flex', alignItems:'center', gap:'10px',
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
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:'14px',fontWeight:'500',color:'#e8e4ff'}}>{customerPhone}</div>
          <div style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',marginTop:'1px'}}>
            {completedAt
              ? `상담 종료 · ${fmtTime(startedAt)}~${fmtTime(completedAt)}`
              : startedAt
                ? `상담 중 · ${fmtTime(startedAt)} 시작`
                : (pcMode ? '대기 중 — 상담 시작을 눌러주세요' : '고객 채팅방')}
          </div>
        </div>

        {/* ⏱ 경과시간 배지 — 시작 이후에만 표시 */}
        {startedAt && (
          <div style={{
            display:'flex', alignItems:'center', gap:'5px',
            fontSize:'13px', fontWeight:700, fontVariantNumeric:'tabular-nums',
            padding:'4px 10px', borderRadius:'8px', whiteSpace:'nowrap',
            border: running ? '1px solid rgba(97,196,89,0.45)' : '1px solid rgba(255,255,255,0.12)',
            background: running ? 'rgba(97,196,89,0.12)' : 'rgba(255,255,255,0.04)',
            color: running ? '#97c459' : '#9a98b0',
          }}>
            <span style={{fontSize:'12px'}}>⏱</span>
            <span>{elapsedText()}</span>
          </div>
        )}

        {/* 사주보기 (모바일에서만 기존처럼) */}
        {!pcMode && (
          <button onClick={onViewSaju}
            style={{fontSize:'11px',padding:'5px 12px',borderRadius:'8px',border:'1px solid rgba(250,199,117,0.3)',background:'rgba(250,199,117,0.1)',color:'#FAC775',cursor:'pointer'}}>
            사주보기
          </button>
        )}

        {/* 시작 / 종료 버튼 */}
        {!completedAt ? (
          !startedAt ? (
            <button onClick={handleStart} disabled={busy}
              style={{fontSize:'11px',padding:'6px 14px',borderRadius:'8px',border:'1px solid rgba(250,199,117,0.5)',background:'rgba(250,199,117,0.15)',color:'#FAC775',cursor:'pointer',fontWeight:600,opacity:busy?0.5:1,whiteSpace:'nowrap'}}>
              ▶ 상담 시작
            </button>
          ) : (
            <button onClick={handleEnd} disabled={busy}
              style={{fontSize:'11px',padding:'6px 14px',borderRadius:'8px',border:'1px solid rgba(255,80,80,0.35)',background:'rgba(255,80,80,0.12)',color:'rgba(255,120,120,0.95)',cursor:'pointer',fontWeight:600,opacity:busy?0.5:1,whiteSpace:'nowrap'}}>
              ■ 상담 종료
            </button>
          )
        ) : (
          <span style={{fontSize:'11px',padding:'6px 12px',borderRadius:'8px',border:'1px solid rgba(97,196,89,0.4)',background:'rgba(97,196,89,0.15)',color:'#97c459',fontWeight:600,whiteSpace:'nowrap'}}>
            ✓ 완료됨
          </span>
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
