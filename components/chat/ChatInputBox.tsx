'use client'

export default function ChatInputBox({
  input,
  setInput,
  onSend,
  sending,
}: {
  input: string
  setInput: (v: string) => void
  onSend: () => void
  sending: boolean
}) {
  return (
    <div className="bg-stone-900 border-t border-stone-700 px-4 py-3 flex gap-2">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend()
          }
        }}
        placeholder="메시지를 입력하세요"
        className="flex-1 bg-stone-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 text-white"
      />
      <button
        onClick={onSend}
        disabled={sending || !input.trim()}
        className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50"
      >
        전송
      </button>
    </div>
  )
}
