// app/manseryeok/couple-chat/ChatInput.tsx
'use client'
import { useState, useRef } from 'react'
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
  const fileRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

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

  const handleEmoji = (emoji: string) => {
    setText(prev => prev + emoji)
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
      return
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = 'ko-KR'
    recognition.interimResults = false
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setText(prev => prev + transcript)
      onVoiceText(transcript)
    }
    recognition.onend = () => setIsListening(false)
    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }

  return (
    <div className="shrink-0 bg-[#0d0d1a] border-t border-[#1e1e35]">
      {/* 이모지 피커 */}
      {showEmoji && (
        <EmojiPicker onSelect={handleEmoji} onClose={() => setShowEmoji(false)} />
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
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요"
            rows={1}
            className="flex-1 bg-transparent border-none outline-none resize-none text-[13px] text-[#c8c0ff] placeholder-[#3d3570] max-h-[100px] leading-relaxed"
            style={{ scrollbarWidth: 'none' }}
          />
          {/* 이모지 버튼 */}
          <button
            onClick={() => setShowEmoji(prev => !prev)}
            className={`shrink-0 text-[20px] transition-colors ${showEmoji ? 'opacity-100' : 'opacity-50'}`}
          >
            😊
          </button>
        </div>

        {/* 음성 or 전송 버튼 */}
        {text.trim() ? (
          <button
            onClick={handleSend}
            className="shrink-0 w-9 h-9 rounded-full bg-[#5544bb] flex items-center justify-center"
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

      {/* 음성 입력 중 표시 */}
      {isListening && (
        <div className="text-center pb-2 text-[12px] text-red-400 animate-pulse">
          🎤 듣고 있어요... 다시 누르면 종료
        </div>
      )}
    </div>
  )
}
