// app/manseryeok/consultant-select/FilterChips.tsx
const FILTERS = ['전체', '지금 가능', '부부 전문', '커플 채팅', '낮은 가격순']

type Props = {
  selected: string
  onChange: (f: string) => void
}

export default function FilterChips({ selected, onChange }: Props) {
  return (
    <div className="flex gap-2 px-5 pt-4 overflow-x-auto scrollbar-hide">
      {FILTERS.map(f => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-[12px] border transition-colors
            ${selected === f
              ? 'bg-[#2d2060] text-[#c8b0ff] border-[#5544aa]'
              : 'bg-[#13132a] text-[#5555aa] border-[#252545]'
            }`}
        >
          {f}
        </button>
      ))}
    </div>
  )
}
