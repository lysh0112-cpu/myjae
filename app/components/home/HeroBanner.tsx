export default function HeroBanner() {
  return (
    <section className="relative overflow-hidden pt-24 pb-10 px-5 text-center"
      style={{ background: 'linear-gradient(160deg, #1a1a18 0%, #2C2C2A 40%, #3C3489 100%)', minHeight: '340px' }}>
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #FAC775, transparent)' }} />
      <div className="absolute bottom-0 -left-10 w-48 h-48 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #3C3489, transparent)' }} />
      <div className="relative z-10">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mb-5"
          style={{ background: 'rgba(250,199,117,0.15)', color: '#FAC775', border: '1px solid rgba(250,199,117,0.3)' }}>
          ✨ AI 기반 정밀 사주 분석
        </div>
        <h1 className="text-3xl font-bold leading-tight mb-3" style={{ color: '#FAC775' }}>
          당신의 운명을<br /><span className="text-white">밝혀드립니다</span>
        </h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: '#b0aec8' }}>
          5,000년 동양철학과 AI 기술이 만나<br />정확하고 깊이 있는 사주 분석을 제공합니다
        </p>
        <div className="flex justify-center gap-6">
          {[['12만+', '누적 분석'], ['98%', '만족도'], ['47명', '전문 상담사']].map(([val, lbl], i) => (
            <div key={lbl} className="flex items-center gap-6">
              {i > 0 && <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.15)' }} />}
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: '#FAC775' }}>{val}</div>
                <div className="text-xs mt-0.5" style={{ color: '#8a88a0' }}>{lbl}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
