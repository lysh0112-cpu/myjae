'use client'
import { useState, useRef } from 'react'

const EMOJI_LIST = [
  '😊','😂','🥹','😍','🥰','😘','😭','😅','🙏','👍',
  '❤️','💕','💯','✨','🎉','💪','😀','😃','🤣','🙂',
  '😉','😇','🤩','❤️','🧡','💛','💚','💙','💜','💗',
  '💓','💞','💝','💘','💖','👏','🙌','🤝','✌️','🤞',
  '☯️','🌙','⭐','🌟','💫','🔮','🌸','🍀','🌿','🌊',
]

export default function ChatInputBox({
  input,
  setInput,
  onSend,
  sending,
  onSendImage,
}: {
  input: string
  setInput: (v: string) => void
  onSend: () => void
  sending: boolean
  onSendImage?: (file: File) => void
}) {
  const [showEmoji, setShowEmoji] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  const handleEmoji = (emoji: string) => {
    setInput(input + emoji)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onSendImage) onSendImage(file)
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
      setInput(input + transcript)
    }
    recognition.onend = () => setIsListening(false)
    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }

  return (
    <div className="bg-stone-900 border-t border-stone-700">
      {/* 이모지 피커 */}
      {showEmoji && (
        <div className="px-4 pt-3 pb-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-stone-400">이모지</span>
            <button onClick={() => setShowEmoji(false)} className="text-stone-400 text-sm">✕</button>
          </div>
          <div className="grid grid-cols-10 gap-1">
            {EMOJI_LIST.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleEmoji(emoji)}
                className="text-xl h-8 flex items-center justify-center rounded hover:bg-stone-700 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 입력창 */}
      <div className="px-3 py-3 flex gap-2 items-end">
        {/* 파일 첨부 */}
        <button
          onClick={() => fileRef.current?.click()}
          className="shrink-0 w-9 h-9 flex items-center justify-center text-stone-400 hover:text-amber-400 transition-colors"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        {/* 텍스트 입력 */}
        <div className="flex-1 bg-stone-800 rounded-2xl px-4 py-2 flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSend()
                setShowEmoji(false)
              }
            }}
            placeholder="메시지를 입력하세요"
            rows={1}
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-stone-500 resize-none"
            style={{ maxHeight: '100px', overflowY: 'auto' }}
            onInput={(e) => {
              const el = e.target as HTMLTextAreaElement
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 100) + 'px'
            }}
          />
          {/* 이모지 버튼 */}
          <button
            onClick={() => setShowEmoji(prev => !prev)}
            className={`shrink-0 text-xl transition-opacity ${showEmoji ? 'opacity-100' : 'opacity-50'}`}
          >
            😊
          </button>
        </div>

        {/* 전송 or 음성 버튼 */}
        {input.trim() ? (
          <button
            onClick={() => { onSend(); setShowEmoji(false) }}
            disabled={sending}
            className="shrink-0 w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center disabled:opacity-50"
          >
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          </button>
        ) : (
          <button
            onClick={handleVoice}
            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors
              ${isListening ? 'bg-red-600 animate-pulse' : 'bg-stone-700'}`}
          >
            <svg width="16" height="16" fill="none" stroke={isListening ? 'white' : '#a8a29e'} strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
            </svg>
          </button>
        )}
      </div>

      {/* 음성 입력 중 */}
      {isListening && (
        <div className="text-center pb-2 text-xs text-red-400 animate-pulse">
          🎤 듣고 있어요... 다시 누르면 종료
        </div>
      )}
    </div>
  )
}
