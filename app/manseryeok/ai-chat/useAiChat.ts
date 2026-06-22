import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Message, ChatMode } from './data'

export function useAiChat({
  mode, storageKey, userQuestion,
  saju1, saju2, gender1, gender2,
}: {
  mode: ChatMode
  storageKey: string
  userQuestion: string
  saju1: any[]
  saju2: any[]
  gender1: string
  gender2: string
}) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(storageKey)
      if (saved) return JSON.parse(saved)
    }
    return []
  })

  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [quickQuestions, setQuickQuestions] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const didInitRef = useRef(false)

  useEffect(() => {
    supabase.from('quick_questions').select('questions')
      .eq('mode', mode).single()
      .then(({ data }) => {
        if (data?.questions) setQuickQuestions(data.questions)
      })
  }, [mode])

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(storageKey, JSON.stringify(messages))
    }
  }, [messages, storageKey])

  // 최초 진입 시 AI가 첫 멘트 생성
  useEffect(() => {
    if (didInitRef.current) return
    const saved = sessionStorage.getItem(storageKey)
    if (saved) {
      // 저장된 대화 있으면 유지 — 마지막이 user면 AI 답변 트리거
      const savedMsgs: Message[] = JSON.parse(saved)
      const last = savedMsgs[savedMsgs.length - 1]
      if (last?.role === 'user') {
        didInitRef.current = true
        setTimeout(() => streamAI(savedMsgs), 300)
      }
      return
    }

    // 처음 진입 — AI가 첫 멘트 생성
    didInitRef.current = true
    const initMessages: Message[] = userQuestion
      ? [{ role: 'user', content: userQuestion }]
      : []

    setMessages(initMessages)
    setTimeout(() => streamAI(initMessages), 300)
  }, [])

  const streamAI = async (currentMessages: Message[]) => {
    setIsStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      abortRef.current = new AbortController()
      const res = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages,
          mode, saju1, saju2,
          gender1, gender2,
          yongsin1: null, yongsin2: null,
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

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return

    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    await streamAI(newMessages)
  }

  const handleClearChat = () => {
    if (confirm('대화 내용을 초기화할까요?')) {
      sessionStorage.removeItem(storageKey)
      didInitRef.current = false
      setMessages([])
      const initMessages: Message[] = userQuestion
        ? [{ role: 'user', content: userQuestion }]
        : []
      setMessages(initMessages)
      setTimeout(() => streamAI(initMessages), 300)
    }
  }

  return {
    messages, input, setInput,
    isStreaming, quickQuestions,
    sendMessage, handleClearChat,
    abortRef,
  }
}
