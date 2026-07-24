type Props = {
  mode: string
  score: string
  names: string
}

// 표시할 라벨. 여기 없는 mode(personal·saju·naming 등)는 띠 자체를 띄우지 않는다.
//   ★2026-07-21 2차: 예전에는 mode 값을 그대로 찍어서 사주 상담인데도
//     "두 사람 / personal" 이 떴다. 궁합류일 때만 보여주도록 바꿨다.
const modeLabel: Record<string, string> = {
  couple:     '💑 연인 사이',
  prewedding: '💍 예비 신혼부부',
  moving: '🏠 이사 택일',
  married:    '👫 부부',
}

export default function SummaryBand({ mode, score, names }: Props) {
  const label = modeLabel[mode]
  // 궁합·택일처럼 두 사람이 필요한 상담이 아니면 띠를 감춘다.
  if (!label) return null

  return (
    <div className="flex items-center gap-2 mx-5 mt-4 rounded-xl px-4 py-3"
      style={{ background: '#fffbf7', border: '0.5px solid #f0e0d5' }}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#b46e46' }} />
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#e0a878' }} />
      <span className="text-[13px] flex-1" style={{ color: '#5c3a1e' }}>{names || '두 사람'}</span>
      <span className="text-[11px] px-3 py-1 rounded-full"
        style={{ background: '#faede0', color: '#8f3d0e' }}>
        {label}
      </span>
      {score && (
        <span className="text-[13px] font-medium ml-2" style={{ color: '#96502e' }}>궁합 {score}점</span>
      )}
    </div>
  )
}
