// YongsinTrack1.tsx
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
  track1: {
    type: string
    yongsin: string
    heeksin: string
    gisin: string
    description: string
    lifeAdvice: string
  }
  detail: string
  loading: boolean
}

export default function YongsinTrack1({ track1, detail, loading }: Props) {
  return (
    <div className="mx-4 mb-3 rounded-xl overflow-hidden"
      style={{border:'1px solid rgba(33,150,243,0.3)'}}>
      <div className="p-4" style={{background:'rgba(33,150,243,0.1)'}}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{background:'rgba(33,150,243,0.3)', color:'#2196f3'}}>
            Track 1
          </span>
          <span className="text-sm font-bold text-white">내면·건강·행복 용신</span>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{background:'rgba(255,255,255,0.08)', color:'#8a88a0'}}>
            {track1.type}
          </span>
        </div>
        <p className="text-xs mb-3" style={{color:'#b0aec8'}}>{track1.description}</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            {label:'용신', value:track1.yongsin, highlight:true},
            {label:'희신', value:track1.heeksin, highlight:false},
            {label:'기신', value:track1.gisin, highlight:false},
          ].map(({label, value, highlight}) => (
            <div key={label} className="flex flex-col items-center rounded-xl py-2"
              style={{background: highlight ? 'rgba(250,199,117,0.15)' : 'rgba(255,255,255,0.04)',
                border: highlight ? '1px solid rgba(250,199,117,0.4)' : '1px solid rgba(255,255,255,0.08)'}}>
              <span className="text-[10px] mb-1" style={{color:'#8a88a0'}}>{label}</span>
              <span className="text-lg font-bold"
                style={{color: value ? ELEMENT_COLOR[value] : '#666'}}>
                {value ? ELEMENT_CHAR[value] : '-'}
              </span>
              <span className="text-[10px] mt-0.5"
                style={{color: value ? ELEMENT_COLOR[value] : '#666'}}>
                {value ? ELEMENT_KOR[value] : ''}
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-lg px-3 py-2" style={{background:'rgba(255,255,255,0.04)'}}>
          <p className="text-xs" style={{color:'#8a88a0'}}>💡 {track1.lifeAdvice}</p>
        </div>
      </div>
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4"
          style={{background:'rgba(33,150,243,0.05)'}}>
          <span className="animate-spin">✦</span>
          <span className="text-xs" style={{color:'#2196f3'}}>Track 1 분석 중...</span>
        </div>
      )}
      {detail && (
        <div className="p-4" style={{background:'rgba(33,150,243,0.05)',
          borderTop:'1px solid rgba(33,150,243,0.2)'}}>
          <p className="text-xs font-bold mb-2" style={{color:'#2196f3'}}>🤖 AI 상세 해설</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap"
            style={{color:'#e0dce8'}}>{detail}</p>
        </div>
      )}
    </div>
  )
}
