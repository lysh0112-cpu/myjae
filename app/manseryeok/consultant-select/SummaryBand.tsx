type Props = {
  mode: string
  score: string
  names: string
}

const modeLabel: Record<string, string> = {
  couple:     '💑 연인 사이',
  prewedding: '💍 예비 신혼부부',
  married:    '👫 부부',
}

export default function SummaryBand({ mode, score, names }: Props) {
  return (
    <div className="flex items-center gap-2 mx-5 mt-4 bg-[#13132a] rounded-xl px-4 py-3 border border-[#252545]">
      <span className="w-2 h-2 rounded-full bg-[#9977ff] shrink-0" />
      <span className="w-2 h-2 rounded-full bg-[#5599ff] shrink-0" />
      <span className="text-[13px] text-[#9988cc] flex-1">{names || '두 사람'}</span>
      <span className="text-[11px] bg-[#1a2030] text-[#88aadd] px-3 py-1 rounded-full">
        {modeLabel[mode] || mode}
      </span>
      {score && (
        <span className="text-[13px] text-[#b8a9ff] font-medium ml-2">궁합 {score}점</span>
      )}
    </div>
  )
}
