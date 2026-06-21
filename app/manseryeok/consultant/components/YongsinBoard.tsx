// app/manseryeok/consultant/components/YongsinBoard.tsx
'use client'
import { calcYongsin } from '@/lib/saju/yongsin'

const ELEMENT_COLOR: Record<string,string> = {
  목:'#4caf50', 화:'#f44336', 토:'#ff9800', 금:'#9e9e9e', 수:'#2196f3'
}
const ELEMENT_CHAR: Record<string,string> = {
  목:'木', 화:'火', 토:'土', 금:'金', 수:'水'
}

interface Props {
  saju: {pillar:string; stem:string; branch:string}[]
  dayStem: string
}

export default function YongsinBoard({ saju, dayStem }: Props) {
  if (!dayStem || saju.length === 0) return null

  const { isStrong, yongsin, heeksin, gisin, gusin, hansin, score, description } =
    calcYongsin(saju, dayStem)

  const items = [
    { label: '용신', value: yongsin, desc: '가장 필요한 오행' },
    { label: '희신', value: heeksin, desc: '용신을 돕는 오행' },
    { label: '기신', value: gisin, desc: '해로운 오행' },
    { label: '구신', value: gusin, desc: '기신을 돕는 오행' },
    { label: '한신', value: hansin, desc: '중립 오행' },
  ]

  return (
    <div className="rounded-2xl p-5 mb-4"
      style={{background:'#2C2C2A', border:'1px solid rgba(250,199,117,0.2)'}}>
      <div className="flex items-center gap-2 mb-1">
        <span style={{color:'#FAC775', fontSize:'18px'}}>⚡</span>
        <h2 className="text-base font-bold text-white">용신 분석</h2>
        <span className="text-xs px-2 py-0.5 rounded-full"
          style={{background: isStrong ? 'rgba(244,67,54,0.2)' : 'rgba(33,150,243,0.2)',
            color: isStrong ? '#f44336' : '#2196f3'}}>
          {isStrong ? '신강' : '신약'}
        </span>
      </div>
      <p className="text-xs mb-4" style={{color:'#8a88a0'}}>{description}</p>

      {/* 오행 점수 */}
      <div className="grid grid-cols-5 gap-1.5 mb-4">
        {Object.entries(score).map(([el, val]) => (
          <div key={el} className="flex flex-col items-center rounded-xl py-2"
            style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)'}}>
            <span className="text-sm font-bold" style={{color:ELEMENT_COLOR[el]}}>
              {ELEMENT_CHAR[el]}
            </span>
            <span className="text-xs font-bold mt-0.5" style={{color:'#e0dce8'}}>{val}</span>
          </div>
        ))}
      </div>

      {/* 용신·희신·기신·구신·한신 */}
      <div className="grid grid-cols-5 gap-1.5">
        {items.map(({label, value, desc}) => (
          <div key={label} className="flex flex-col items-center rounded-xl py-3"
            style={{background: label === '용신' ? 'rgba(250,199,117,0.15)' : 'rgba(255,255,255,0.04)',
              border: label === '용신' ? '1px solid rgba(250,199,117,0.4)' : '1px solid rgba(255,255,255,0.08)'}}>
            <span className="text-[10px] mb-1" style={{color:'#8a88a0'}}>{label}</span>
            <span className="text-lg font-bold" style={{color: value ? ELEMENT_COLOR[value] : '#666'}}>
              {value ? ELEMENT_CHAR[value] : '-'}
            </span>
            <span className="text-[9px] mt-1 text-center" style={{color:'#8a88a0'}}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
