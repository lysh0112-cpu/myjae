'use client'
import { useState, useRef, useEffect } from 'react'
import EmojiPicker from './EmojiPicker'

type Props = {
  onSend: (text: string) => void
  onSendImage: (file: File) => void
  onVoiceText: (text: string) => void
}

export default function ChatInput({ onSend, onSendImage, onVoiceText }: Props) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 텍스트 변경 시 textarea 높이 자동 조절
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 100) + 'px'
    }
  }, [text])

  const handleSend = () => {
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
    setShowEmoji(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onSendImage(file)
    e.target.value = ''
  }

  const handleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('이 브라우저는 음성 입력을 지원하지 않아요.')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      setInterimText('')
      return
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true

    let finalText = ''

    recognition.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          finalText += transcript
          setText(finalText)
          setInterimText('')
          onVoiceText(transcript)
        } else {
          interim += transcript
          setInterimText(interim)
        }
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimText('')
    }

    recognition.onerror = () => {
      setIsListening(false)
      setInterimText('')
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }

  const hasSendText = text.trim().length > 0

  return (
    <div className="shrink-0 bg-[#0d0d1a] border-t border-[#1e1e35]">

      {/* 이모지 피커 */}
      {showEmoji && (
        <EmojiPicker
          onSelect={(emoji) => setText(prev => prev + emoji)}
          onClose={() => setShowEmoji(false)}
        />
      )}

      {/* 음성 인식 중 실시간 텍스트 */}
      {isListening && (
        <div className="px-4 pt-2 pb-1">
          <div className="bg-[#13132a] rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-red-400 animate-pulse text-xs">🎤 듣는 중</span>
            <span className="text-[#7766bb] text-xs flex-1 truncate">
              {interimText || '말씀해주세요...'}
            </span>
            <button
              onClick={handleVoice}
              className="text-xs text-[#9977ff] hover:text-white shrink-0 px-2 py-1 bg-[#2d2060] rounded-lg"
            >
              완료
            </button>
          </div>
        </div>
      )}

      {/* 입력창 */}
      <div className="flex items-end gap-2 px-3 py-3">

        {/* 파일 첨부 */}
        <button
          onClick={() => fileRef.current?.click()}
          className="shrink-0 w-9 h-9 flex items-center justify-center text-[#5555aa] hover:text-[#9977ff] transition-colors"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        {/* 텍스트 입력 */}
        <div className="flex-1 bg-[#13132a] border border-[#252545] rounded-2xl px-4 py-[10px] flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요"
            rows={1}
            className="flex-1 bg-transparent border-none outline-none resize-none text-[13px] text-[#c8c0ff] placeholder-[#3d3570] leading-relaxed"
            style={{ maxHeight: '100px', overflowY: 'auto', scrollbarWidth: 'none' }}
          />
          <button
            onClick={() => setShowEmoji(prev => !prev)}
            className={`shrink-0 text-[20px] transition-opacity ${showEmoji ? 'opacity-100' : 'opacity-40'}`}
          >
            😊
          </button>
        </div>

        {/* 전송 or 음성 버튼 */}
        {hasSendText ? (
          <button
            onClick={handleSend}
            className="shrink-0 w-9 h-9 rounded-full bg-[#5544bb] flex items-center justify-center active:scale-95 transition-transform"
          >
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          </button>
        ) : (
          <button
            onClick={handleVoice}
            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors
              ${isListening ? 'bg-red-600 animate-pulse' : 'bg-[#1a1a35]'}`}
          >
            <svg width="16" height="16" fill="none" stroke={isListening ? 'white' : '#7766cc'} strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
