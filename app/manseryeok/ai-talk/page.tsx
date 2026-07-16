'use client'

// app/manseryeok/ai-talk/page.tsx
// ----------------------------------------------------------------------------
// 마이페이지 전용 AI 채팅 — 피치톤. 말/채팅 둘 다 + AI 목소리 선택(무료).
//   - Claude 응답: 기존 /api/chat-stream 재사용 (mode='personal')
//   - 음성 입력(사용자 말하기): Web Speech API (couple-chat 패턴 재사용)
//   - 음성 출력(AI 목소리): 브라우저 SpeechSynthesis (무료). 한국어 음성 중 선택 + 속도.
//   - 내 사주: URL person1=... (마이페이지에서 로그인 사주를 실어 보냄)
// 대화 영구저장·이력주입은 다음 단계(연재쌤 검수 후).
// ----------------------------------------------------------------------------

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { calcSaju } from '@/app/manseryeok/ai-chat/useSaju'

type Msg = { role: 'user' | 'assistant'; content: string }

function AiTalkInner() {
  const params = useSearchParams()
  const router = useRouter()

  const person1Raw = params.get('person1')
  const person1 = person1Raw ? JSON.parse(decodeURIComponent(person1Raw)) : null
  const saju1 = person1
    ? calcSaju(Number(person1.year), Number(person1.month), Number(person1.day), Number(person1.hour))
    : []
  const gender1 = person1?.gender || '남'

  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: '안녕하세요, 저는 명카페 AI예요. 사주를 바탕으로 편하게 이야기 나눠요. 요즘 어떤 게 궁금하세요?' },
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // ── 음성 출력(AI 목소리) 설정 ──
  const [voiceOn, setVoiceOn] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceIdx, setVoiceIdx] = useState(0)
  const [rate, setRate] = useState(1)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const load = () => {
      const all = window.speechSynthesis.getVoices()
      const ko = all.filter((v) => v.lang?.startsWith('ko'))
      setVoices(ko.length ? ko : all)
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
  }, [])

  const speak = (text: string) => {
    if (!voiceOn || typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    if (voices[voiceIdx]) u.voice = voices[voiceIdx]
    u.lang = 'ko-KR'
    u.rate = rate
    window.speechSynthesis.speak(u)
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── 음성 입력(사용자 말하기) ──
  const [listening, setListening] = useState(false)
  const recRef = useRef<any>(null)
  const startVoice = () => {
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) { alert('이 브라우저는 음성 입력을 지원하지 않아요.'); return }
    if (listening) { recRef.current?.stop(); setListening(false); return }
    const rec = new SR()
    rec.lang = 'ko-KR'; rec.continuous = false; rec.interimResults = true
    let finalText = ''
    rec.onresult = (e: any) => {
      let t = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tr = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += tr; else t += tr
      }
      setInput(finalText || t)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.start(); recRef.current = rec; setListening(true)
  }

  const send = async () => {
    const text = input.trim()
    if (!text || streaming) return
    if (!saju1.length) { alert('내 사주 정보가 없어요. 마이페이지에서 사주를 먼저 등록해 주세요.'); return }

    const next: Msg[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setStreaming(true)
    setMessages((m) => [...m, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          mode: 'personal',
          saju1, saju2: [],
          gender1, gender2: '여',
          yongsin1: null, yongsin2: null,
          userQuestion: text,
        }),
      })
      if (!res.body) throw new Error('no stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              acc += parsed.text
              setMessages((m) => {
                const copy = [...m]
                copy[copy.length - 1] = { role: 'assistant', content: acc }
                return copy
              })
            }
          } catch {}
        }
      }
      if (acc) speak(acc)
    } catch {
      setMessages((m) => {
        const copy = [...m]
        copy[copy.length - 1] = { role: 'assistant', content: '앗, 잠시 연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.' }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ padding: '13px 16px', background: '#FFFBF7', borderBottom: '0.5px solid #f0e0d5', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ fontSize: 22, color: '#b46e46', background: 'none', border: 'none', cursor: 'pointer' }}>‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#96502e' }}>명카페 AI</div>
          <div style={{ fontSize: 11, color: '#b4785a' }}>내 사주를 바탕으로 대화해요</div>
        </div>
        <button onClick={() => { setVoiceOn(v => !v); if (voiceOn && window.speechSynthesis) window.speechSynthesis.cancel() }}
          style={{ fontSize: 12, padding: '5px 12px', borderRadius: 16, cursor: 'pointer', border: '0.5px solid ' + (voiceOn ? '#c8783c' : '#e8d5c5'), background: voiceOn ? '#faede0' : '#fff', color: voiceOn ? '#96502e' : '#b4785a' }}>
          {voiceOn ? '🔊 목소리 켜짐' : '🔈 목소리 꺼짐'}
        </button>
      </div>

      {/* 목소리 설정 (켰을 때만) */}
      {voiceOn && (
        <div style={{ padding: '10px 16px', background: '#fef7f1', borderBottom: '0.5px solid #f5e5da', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#96502e', fontWeight: 600 }}>목소리</span>
          <select value={voiceIdx} onChange={(e) => setVoiceIdx(Number(e.target.value))}
            style={{ fontSize: 11, padding: '5px 8px', borderRadius: 8, border: '0.5px solid #e8d5c5', background: '#fff', color: '#5a4a3e', flex: 1, minWidth: 120 }}>
            {voices.length === 0 && <option>기본 음성</option>}
            {voices.map((v, i) => <option key={i} value={i}>{v.name.replace(/Microsoft |Google /g, '')}</option>)}
          </select>
          <span style={{ fontSize: 11, color: '#96502e', fontWeight: 600 }}>속도 {rate.toFixed(1)}</span>
          <input type="range" min="0.6" max="1.4" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))}
            style={{ width: 80, accentColor: '#c8783c' }} />
        </div>
      )}

      {/* 메시지 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
            <div style={{
              maxWidth: '78%', padding: '10px 13px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.6,
              background: m.role === 'user' ? '#b46e46' : '#FFFBF7',
              color: m.role === 'user' ? '#fff' : '#3a2e28',
              border: m.role === 'user' ? 'none' : '0.5px solid #f0e0d5',
              borderBottomRightRadius: m.role === 'user' ? 4 : 14,
              borderBottomLeftRadius: m.role === 'user' ? 14 : 4,
              whiteSpace: 'pre-wrap',
            }}>
              {m.content || (streaming && i === messages.length - 1 ? '…' : '')}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div style={{ padding: '10px 12px', background: '#FFFBF7', borderTop: '0.5px solid #f0e0d5', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', bottom: 0 }}>
        <button onClick={startVoice}
          style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: '0.5px solid ' + (listening ? '#c8783c' : '#e8d5c5'), background: listening ? '#faede0' : '#fff', fontSize: 17 }}>
          {listening ? '🔴' : '🎙️'}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) send() }}
          placeholder={listening ? '말씀해 주세요…' : '메시지를 입력하거나 마이크를 눌러 말하세요'}
          style={{ flex: 1, height: 40, fontSize: 13, color: '#3a2e28', background: '#fff', border: '0.5px solid #e8d5c5', borderRadius: 20, padding: '0 15px', outline: 'none' }}
        />
        <button onClick={send} disabled={streaming || !input.trim()}
          style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: 'none', background: input.trim() && !streaming ? '#b46e46' : '#d8bfae', color: '#fff', fontSize: 16 }}>
          ↑
        </button>
      </div>
    </main>
  )
}

export default function AiTalkPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#b4785a' }}>불러오는 중…</div>}>
      <AiTalkInner />
    </Suspense>
  )
}
