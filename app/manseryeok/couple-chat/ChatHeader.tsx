// app/manseryeok/couple-chat/ChatHeader.tsx
'use client'
import { useRouter } from 'next/navigation'
import { senderConfig } from './data'

type Props = {
  consultationStatus: 'active' | 'completed'
  onViewSaju: () => void
}

export default function ChatHeader({ consultationStatus, onViewSaju }: Props) {
  const router = useRouter()

  return (
    <div className="shrink-0 border-b border-[#1e1e35]">
      {/* 메인 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => router.back()} className="text-[#9d8cff] text-xl shrink-0">‹</button>

        {/* 아바타 3개 */}
        <div className="flex shrink-0">
          {(['consultant','husband','wife'] as const).map((s, i) => (
            <div
              key={s}
              style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i }}
              className={`relative w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium border-2 border-[#0d0d1a] ${senderConfig[s].avatar}`}
            >
              {senderConfig[s].short}
            </div>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[14px] text-[#e8e4ff] font-medium truncate">
            연재 선생님 · 부부 상담
          </div>
          <div className="text-[11px] text-[#5555aa] mt-[1px]">
            {consultationStatus === 'active' ? '3명 참여 중 · 비공개 채팅방' : '상담 완료 · 부부 채팅방'}
          </div>
        </div>

        <button onClick={onViewSaju} className="shrink-0 text-[11px] bg-[#1a1a35] text-[#7766cc] border border-[#252545] px-3 py-[5px] rounded-full">
          사주 보기
        </button>
      </div>

      {/* 상태 필 */}
      <div className="flex gap-2 px-4 pb-3">
        <span className={`text-[10px] px-3 py-[4px] rounded-full border
          ${consultationStatus === 'active'
            ? 'bg-[#0f2a1a] text-[#66bb88] border-[#2a5535]'
            : 'bg-[#1a1a35] text-[#6655aa] border-[#252545]'}`}>
          {consultationStatus === 'active' ? '● 상담 진행 중' : '✓ 상담 완료'}
        </span>
        <span className="text-[10px] px-3 py-[4px] rounded-full bg-[#1a1228] text-[#cc88ff] border border-[#3d2060]">
          👫 부부 채팅방
        </span>
      </div>
    </div>
  )
}
