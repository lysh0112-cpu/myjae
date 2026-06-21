'use client'
import { useEffect, useRef } from 'react'
import type { Message } from './data'
import { senderConfig } from './data'

type ActiveSender = 'consultant' | 'husband' | 'wife'

type Props = {
  messages: Message[]
  myRole: ActiveSender
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  const h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${m}`
}

export default function ChatMessages({ messages, myRole }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
      {messages.map((msg) => {
        if (msg.sender === 'system') {
          return (
            <div key={msg.id} className="text-center">
              <span className="text-[11px] text-[#5555aa] bg-[#13132a] px-3 py-[5px] rounded-full">
                {msg.message}
              </span>
            </div>
          )
        }

        const isMe = msg.sender === myRole
        const cfg = senderConfig[msg.sender]

        return (
          <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
            {!isMe && (
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 ${cfg.avatar}`}>
                {cfg.short}
              </div>
            )}

            <div className={`max-w-[200px] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && (
                <div className={`text-[10px] mb-1 px-1 ${cfg.nameColor}`}>{cfg.label}</div>
              )}

              {msg.image_url ? (
                <img
                  src={msg.image_url}
                  alt="전송된 이미지"
                  className="max-w-[180px] rounded-xl border border-[#252545]"
                />
              ) : (
                <div className={`px-3 py-[10px] rounded-2xl text-[13px] leading-[1.55]
                  ${isMe ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'} ${cfg.bubble}`}>
                  {msg.message}
                </div>
              )}

              <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                <span className="text-[10px] text-[#333355]">{formatTime(msg.created_at)}</span>
                {isMe && msg.read_at && (
                  <span className="text-[10px] text-[#5544aa]">읽음</span>
                )}
              </div>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
