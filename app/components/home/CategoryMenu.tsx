const CATEGORIES = [
  { icon: '🪬', label: '사주\n팔자' },
  { icon: '💕', label: '궁합\n연애' },
  { icon: '💰', label: '재물\n사업' },
  { icon: '🏠', label: '이사\n풍수' },
  { icon: '📅', label: '택일\n날짜' },
  { icon: '🌙', label: '타로\n점술' },
]

export default function CategoryMenu() {
  return (
    <section className="mt-6 px-4">
      <h2 className="text-base font-bold text-white mb-4">상담 분야</h2>
      <div className="grid grid-cols-6 gap-2">
        {CATEGORIES.map((cat) => (
          <button key={cat.label} className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform active:scale-90"
              style={{ background: 'rgba(60,52,137,0.25)', border: '1px solid rgba(60,52,137,0.3)' }}>
              {cat.icon}
            </div>
            <span className="text-center leading-tight whitespace-pre-line"
              style={{ color: '#8a88a0', fontSize: '10px' }}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
