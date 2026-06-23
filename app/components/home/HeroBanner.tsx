import Link from 'next/link'
export default function HeroBanner() {
  return (
    <section
      className="relative overflow-hidden pt-24 pb-8 px-5 text-center"
      style={{
        background: 'linear-gradient(160deg, #1a1a18 0%, #2C2C2A 40%, #3C3489 100%)',
        minHeight: '320px',
      }}
    >
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #FAC775, transparent)' }} />
      <div className="absolute bottom-0 -left-10 w-48 h-48 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #3C3489, transparent)' }} />
      <div className="relative z-10">
        <div
          className="inline-flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-full mb-3"
          style={{
            background: 'rgba(250,199,117,0.15)',
            color: '#FAC775',
            border: '1px solid rgba(250,199,117,0.3)',
            fontSize: '11px',
          }}
        >
          ✦ 명리 전문 플랫폼
        </div>
        <p
          className="font-bold leading-relaxed mb-3"
          style={{ fontSize: '15px', color: '#FAC775', letterSpacing: '0.2px' }}
        >
          정밀 사주분석에서<br />
          <span style={{ color: '#ffffff' }}>사주명리 전문가 상담연결까지</span>
        </p>
        <h1 className="text-3xl font-bold leading-tight mb-3" style={{ color: '#FAC775' }}>
          당신의 운명을<br />
          <span className="text-white">밝혀드립니다</span>
        </h1>
        <p className="text-sm leading-relaxed mb-0" style={{ color: '#b0aec8' }}>
          5,000년 동양철학과 현대 명리학이 만나<br />
          정확하고 깊이 있는 사주 분석을 제공합니다
        </p>
      </div>
    </section>
  )
}
