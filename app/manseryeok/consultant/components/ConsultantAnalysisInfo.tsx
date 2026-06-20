const BRANCH_LIST = [
  {char:'子'},{char:'丑'},{char:'寅'},{char:'卯'},
  {char:'辰'},{char:'巳'},{char:'午'},{char:'未'},
  {char:'申'},{char:'酉'},{char:'戌'},{char:'亥'},
]

type Props = {
  customerName: string
  gender: string
  calType: string
  yearParam: number
  monthParam: number
  dayParam: number
  hourIdx: number | null
}

export default function ConsultantAnalysisInfo({
  customerName, gender, calType,
  yearParam, monthParam, dayParam, hourIdx,
}: Props) {
  return (
    <div className="rounded-2xl p-4"
      style={{background:'linear-gradient(135deg,#3C3489 0%,#2a2075 100%)',
        border:'1px solid rgba(250,199,117,0.2)'}}>
      <div className="text-xs font-semibold mb-2" style={{color:'rgba(250,199,117,0.8)'}}>분석 대상</div>
      <div className="flex items-center gap-2 flex-wrap">
        {[customerName||'', `${gender}성`,
          `${calType} ${yearParam}.${monthParam}.${dayParam}`,
          hourIdx===null ? '시 미지정' : `${BRANCH_LIST[hourIdx]?.char}시`
        ].filter(Boolean).map(item => (
          <span key={item} className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{background:'rgba(255,255,255,0.1)', color:'#FAC775'}}>{item}</span>
        ))}
      </div>
    </div>
  )
}
