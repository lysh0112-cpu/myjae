// app/manseryeok/couple-chat/EmojiPicker.tsx
'use client'

const EMOJI_CATEGORIES = [
  {
    label: '자주 쓰는',
    emojis: ['😊','😂','🥹','😍','🥰','😘','😭','😅','🙏','👍','❤️','💕','💯','✨','🎉','💪'],
  },
  {
    label: '감정',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩'],
  },
  {
    label: '사랑',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💗','💓','💞','💕','💝','💘','💖','💟'],
  },
  {
    label: '손동작',
    emojis: ['👏','🙌','🤝','👐','🤲','🙏','✌️','🤞','👍','👎','✊','👊','🤜','🤛','💪','🫶'],
  },
  {
    label: '사주·명리',
    emojis: ['☯️','🌙','⭐','🌟','💫','✨','🔮','📿','🌸','🍀','🌿','🌊','🔥','⛰️','🌈','🎋'],
  },
]

type Props = {
  onSelect: (emoji: string) => void
  onClose: () => void
}

export default function EmojiPicker({ onSelect, onClose }: Props) {
  return (
    <div className="bg-[#13132a] border-t border-[#1e1e35] px-4 pt-3 pb-4">
      {/* 카테고리 탭 */}
      <div className="flex gap-3 mb-3 overflow-x-auto scrollbar-hide">
        {EMOJI_CATEGORIES.map(cat => (
          <span key={cat.label} className="whitespace-nowrap text-[11px] text-[#7766bb] cursor-pointer shrink-0">
            {cat.label}
          </span>
        ))}
        <button onClick={onClose} className="ml-auto text-[#5555aa] shrink-0">✕</button>
      </div>

      {/* 이모지 그리드 */}
      {EMOJI_CATEGORIES.map(cat => (
        <div key={cat.label} className="mb-3">
          <div className="text-[10px] text-[#5555aa] mb-2">{cat.label}</div>
          <div className="grid grid-cols-8 gap-1">
            {cat.emojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => onSelect(emoji)}
                className="text-[22px] h-9 flex items-center justify-center rounded-lg hover:bg-[#2d2060] transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
