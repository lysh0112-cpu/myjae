export default function TodayFortuneBanner() {
  return (
    <section className="mx-4 mt-6">
      <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #3C3489 0%, #2a2075 100%)', border: '1px solid rgba(250,199,117,0.2)' }}>
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'rgba(250,199,117,0.7)' }}>오늘의 운세</p>
          <h3 className="text-white font-bold text-sm leading-snug">
            오늘은 새로운 인연이<br />찾아오는 날입니다 ✨
          </h3>
          <button className="mt-3 text-xs px-4 py-1.5 rounded-full font-semibold"
            style={{ background: '#FAC775', color: '#2C2C2A' }}>확인하기</button>
        </div>
        <div className="text-6xl opacity-80 select-none">🔮</div>
      </div>
    </section>
  )
}
