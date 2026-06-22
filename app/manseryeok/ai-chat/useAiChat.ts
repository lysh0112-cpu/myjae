import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Message, ChatMode } from './data'

export function useAiChat({
  mode, storageKey, userQuestion,
  saju1, saju2, gender1, gender2,
  firstAiMessage,
}: {
  mode: ChatMode
  storageKey: string
  userQuestion: string
  saju1: any[]
  saju2: any[]
  gender1: string
  gender2: string
  firstAiMessage: string
}) {
  const getInitialMessages = (): Message[] => {
    const msgs: Message[] = [{ role: 'assistant', content: firstAiMessage }]
    if (userQuestion) msgs.push({ role: 'user', content: userQuestion })
    return msgs
  }

  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(storageKey)
      if (saved) return JSON.parse(saved)
    }
    return getInitialMessages()
  })

  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [quickQuestions, setQuickQuestions] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const didAutoSend = useRef(false)

  useEffect(() => {
    supabase.from('quick_questions').select('questions')
      .eq('mode', mode).single()
      .then(({ data }) => {
        if (data?.questions) setQuickQuestions(data.questions)
      })
  }, [mode])

  // 메시지 변경 시 저장
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(storageKey, JSON.stringify(messages))
    }
  }, [messages, storageKey])

  // 최초 1회만 — userQuestion 자동 전송
  // 저장된 대화가 AI 답변으로 끝나면 이미 처리된 것 → 스킵
  // 저장된 대화가 user 메시지로 끝나면 AI 답변 없는 것 → 자동 전송
  useEffect(() => {
    if (didAutoSend.current) return
    if (!userQuestion) return
    didAutoSend.current = true

    const saved = sessionStorage.getItem(storageKey)
    const savedMsgs: Message[] = saved ? JSON.parse(saved) : []
    const lastMsg = savedMsgs[savedMsgs.length - 1]

    // 마지막이 AI 답변이면 이미 완료 → 유지만 하고 재전송 안 함
    if (lastMsg?.role === 'assistant' && lastMsg.content.length > 0) return

    // 아직 AI 답변 없음 → 자동 전송
    const initial = getInitialMessages()
    setMessages(initial)
    setTimeout(() => sendMessage(userQuestion, initial), 600)
  }, [])

  const sendMessage = async (text: string, baseMessages?: Message[]) => {
    if (!text.trim() || isStreaming) return

    const currentMessages = baseMessages || messages
    const userMsg: Message = { role: 'user', content: text }
    const newMessages = baseMessages ? currentMessages : [...currentMessages, userMsg]

    if (!baseMessages) setMessages(newMessages)
    setInput('')
    setIsStreaming(true)

    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (last?.role === 'user') return [...prev, { role: 'assistant', content: '' }]
      return [...prev, userMsg, { role: 'assistant', content: '' }]
    })

    try {
      abortRef.current = new AbortController()
      const res = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages, mode,
          saju1, saju2, gender1, gender2,
          yongsin1: null, yongsin2: null, userQuestion,
        }),
        signal: abortRef.current.signal,
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let aiText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
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
      didAutoSend.current = false
      const initial = getInitialMessages()
      setMessages(initial)
      if (userQuestion) {
        setTimeout(() => sendMessage(userQuestion, initial), 300)
      }
    }
  }

  return {
    messages, input, setInput,
    isStreaming, quickQuestions,
    sendMessage, handleClearChat,
    abortRef, userQuestion,
  }
}
