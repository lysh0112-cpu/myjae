// YongsinTrack2.tsx
'use client'

const ELEMENT_COLOR: Record<string,string> = {
  목:'#4caf50', 화:'#f44336', 토:'#ff9800', 금:'#9e9e9e', 수:'#2196f3'
}
const ELEMENT_CHAR: Record<string,string> = {
  목:'木', 화:'火', 토:'土', 금:'金', 수:'水'
}
const ELEMENT_KOR: Record<string,string> = {
  목:'목(木)', 화:'화(火)', 토:'토(土)', 금:'금(金)', 수:'수(水)'
}

interface Props {
  track2: {
    gyeokguk: string
    yongsin: string
    type: string
    description: string
    careerAdvice: string
  }
  detail: string
  loading: boolean
}

export default function YongsinTrack2({ track2, detail, loading }: Props) {
  return (
    <div className="mx-4 mb-3 rounded-xl overflow-hidden"
      style={{border:'1px solid rgba(250,199,117,0.2)'}}>
      <div className="p-4" style={{background:'rgba(250,199,117,0.08)'}}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{background:'rgba(250,199,117,0.3)', color:'#FAC775'}}>
            Track 2
          </span>
          <span className="text-sm font-bold text-white">사회·직업·성공 용신</span>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{background:'rgba(255,255,255,0.08)', color:'#8a88a0'}}>
            {track2.type}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs px-2 py-1 rounded-lg font-bold"
            style={{background:'rgba(250,199,117,0.2)', color:'#FAC775'}}>
            {track2.gyeokguk}
          </span>
          {track2.yongsin && (
            <span className="text-xs px-2 py-1 rounded-lg font-bold"
              style={{background:'rgba(255,255,255,0.08)',
                color:ELEMENT_COLOR[track2.yongsin]}}>
              용신: {ELEMENT_CHAR[track2.yongsin]} {ELEMENT_KOR[track2.yongsin]}
            </span>
          )}
        </div>
        <p className="text-xs mb-3" style={{color:'#b0aec8'}}>{track2.description}</p>
        <div className="rounded-lg px-3 py-2" style={{background:'rgba(255,255,255,0.04)'}}>
          <p className="text-xs" style={{color:'#8a88a0'}}>💼 {track2.careerAdvice}</p>
        </div>
      </div>
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4"
          style={{background:'rgba(250,199,117,0.03)'}}>
          <span className="animate-spin">✦</span>
          <span className="text-xs" style={{color:'#FAC775'}}>Track 2 분석 중...</span>
        </div>
      )}
      {detail && (
        <div className="p-4" style={{background:'rgba(250,199,117,0.03)',
          borderTop:'1px solid rgba(250,199,117,0.15)'}}>
          <p className="text-xs font-bold mb-2" style={{color:'#FAC775'}}>🤖 AI 상세 해설</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap"
            style={{color:'#e0dce8'}}>{detail}</p>
        </div>
      )}
    </div>
  )
}
