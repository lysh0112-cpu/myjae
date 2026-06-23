export default function DailyFortune() {
  const fortunes = [
    '서로에게 솔직한 마음을 전해보세요. 작은 말 한마디가 큰 감동이 될 거예요 💫',
    '오늘은 함께하는 시간이 더욱 빛나는 날이에요. 소소한 일상을 나눠보세요 🌟',
    '두 분의 오행 기운이 조화롭게 흐르는 날이에요. 서로를 응원해주세요 ✨',
    '작은 배려가 큰 사랑이 되는 날이에요. 따뜻한 말 한마디를 건네보세요 🌸',
    '오늘은 새로운 계획을 함께 세워보기 좋은 날이에요 🎯',
  ]

  const today = new Date()
  const fortune = fortunes[today.getDate() % fortunes.length]

  return (
    <div style={{
      background: 'rgba(60,52,137,0.25)',
      border: '1px solid rgba(119,102,221,0.3)',
      borderRadius: '12px',
      padding: '12px 14px',
      margin: '8px 16px',
    }}>
      <div style={{ fontSize: '10px', color: '#9d8cff', marginBottom: '4px' }}>✦ 오늘의 궁합 운세</div>
      <div style={{ fontSize: '12px', color: '#c8c0ff', lineHeight: '1.6' }}>{fortune}</div>
    </div>
  )
}
