// app/manseryeok/consultant/components/UnsungBoard.tsx
'use client'

import { getUnsung, unsungColor } from '@/lib/saju'

const JIJI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

interface Props {
  dayStem: string
  saju: {pillar:string; stem:string; branch:string}[]
}

export default function UnsungBoard({ dayStem, saju }: Props) {
  return (
    <div className="rounded-2xl p-5 mb-4" style={{background:'#2C2C2A',border:'1px solid rgba(255,255,255,0.07)'}}>
      <h2 className="text-base font-bold text-white mb-4">12운성 (일간 기준)</h2>

      {/* 원국 4주 */}
      <p className="text-xs mb-2" style={{color:'rgba(250,199,117,0.8)'}}>원국</p>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {saju.map(({pillar, branch}) => {
          const unsung = getUnsung(dayStem, branch)
          return (
            <div key={pillar} className="flex flex-col items-center rounded-xl py-2"
              style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <span className="text-[10px] mb-1" style={{color:'#8a88a0'}}>{pillar}</span>
              <span className="text-lg font-bold" style={{color:'#e0dce8'}}>{branch}</span>
              <span className="text-xs font-semibold mt-1" style={{color:unsungColor(unsung)}}>{unsung}</span>
            </div>
          )
        })}
      </div>

      {/* 전체 지지 대조표 */}
      <p className="text-xs mb-2" style={{color:'rgba(250,199,117,0.8)'}}>전체 대조표</p>
      <div className="grid grid-cols-6 gap-1.5">
        {JIJI.map(jiji => {
          const unsung = getUnsung(dayStem, jiji)
          return (
            <div key={jiji} className="flex flex-col items-center rounded-lg py-2"
              style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)'}}>
              <span className="text-sm font-bold" style={{color:'#e0dce8'}}>{jiji}</span>
              <span className="text-[10px] font-semibold mt-0.5" style={{color:unsungColor(unsung)}}>{unsung}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
