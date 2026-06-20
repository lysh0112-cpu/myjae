'use client'
import { Message } from '@/hooks/useChatMessages'

export default function ChatMessageList({
  messages,
  myRole,
}: {
  messages: Message[]
  myRole: 'customer' | 'consultant'
}) {
  if (messages.length === 0) return (
    <div className="text-center text-stone-500 py-10 text-sm">
      {myRole === 'customer'
        ? '상담사가 곧 입장합니다\n궁금한 점을 먼저 입력해주세요'
        : '아직 메시지가 없습니다'}
    </div>
  )

  return (
    <div className="flex flex-col space-y-3">
      {messages.map((m) => (
        <div key={m.id} className={`flex ${m.sender === myRole ? 'justify-end' : 'justify-start'}`}>
          {m.sender !== myRole && m.sender !== 'summary' && (
            <div className="text-xs mr-2 mt-1 text-stone-400">
              {myRole === 'consultant' ? '고객' : '상담사'}
            </div>
          )}
          <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
            m.sender === myRole
              ? 'bg-amber-500 text-stone-950'
              : m.sender === 'summary'
              ? 'bg-stone-700 text-stone-100 w-full max-w-sm'
              : 'bg-stone-800 text-stone-100'
          }`}>
            {m.sender === 'summary' && (
              <div className="text-amber-400 text-xs font-bold mb-2">📋 상담 요약</div>
            )}
            {m.message}
          </div>
        </div>
      ))}
    </div>
  )
}
