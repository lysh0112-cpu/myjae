const REVIEWS = [
  {
    stars: 5,
    title: '이명연 선생님 상담 후 실제로 취업됐어요 😭',
    author: '별빛달빛',
    time: '2시간 전',
    likes: 128,
    hot: true,
  },
  {
    stars: 5,
    title: '물상도 그림 받고 너무 신기해서 친구들한테 다 공유했어요',
    author: '연분홍봄날',
    time: '어제',
    likes: 203,
    hot: false,
  },
  {
    stars: 4,
    title: 'AI 사주 분석이 이렇게 정확할 줄 몰랐어요. 소름돋았습니다',
    author: '운세연구가',
    time: '2일 전',
    likes: 312,
    hot: false,
  },
]

export default function ReviewSection() {
  return (
    <section className="px-4 py-5 pb-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-white">추천 후기</h2>
        <button style={{ color: '#FAC775', fontSize: '13px' }}>전체보기 →</button>
      </div>

      <div className="flex flex-col gap-2">
        {REVIEWS.map((r, i) => (
          <div
            key={i}
            className="rounded-2xl p-4"
            style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div style={{ color: '#FAC775', fontSize: '12px', marginBottom: '4px' }}>
              {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}
            </div>
            <p className="text-sm font-medium text-white leading-snug">
              {r.title}
              {r.hot && (
                <span
                  className="ml-2 text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,80,80,0.15)', color: '#ff8080', fontSize: '10px' }}
                >
                  🔥 HOT
                </span>
              )}
            </p>
            <p style={{ color: '#8a88a0', fontSize: '11px', marginTop: '6px' }}>
              {r.author} · {r.time} · ♥ {r.likes}
            </p>
          </div>
        ))}
      </div>

      <button
        className="w-full mt-4 py-3 rounded-2xl text-sm font-semibold"
        style={{ border: '1px solid rgba(60,52,137,0.5)', color: '#b0aec8', background: 'rgba(60,52,137,0.1)' }}
      >
        + 후기 작성하기
      </button>
    </section>
  )
}
