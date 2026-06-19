// app/manseryeok/consultant/components/SinsalBoard.tsx
'use client'

import { getSinsal, SINSAL_HIGHLIGHT } from '@/lib/saju'

const JIJI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

interface Props {
  saju: {pillar:string; stem:string; branch:string}[]
  yeonjji: string
  iljji: string
}

export default function SinsalBoard({ saju, yeonjji, iljji }: Props) {
  return (
    <div className="rounded-2xl p-5 mb-4" style={{background:'#2C2C2A',border:'1px solid rgba(255,255,255,0.07)'}}>
      <h2 className="text-base font-bold text-white mb-4">12신살</h2>

      {/* 년지 기준 */}
      <p className="text-xs mb-2" style={{color:'rgba(250,199,117,0.8)'}}>년지 기준 ({yeonjji})</p>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {saju.map(({pillar, branch}) => {
          const sinsal = getSinsal(yeonjji, branch)
          return (
            <div key={pillar} className="flex flex-col items-center rounded-xl py-2"
              style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <span className="text-[10px] mb-1" style={{color:'#8a88a0'}}>{pillar}</span>
              <span className="text-lg font-bold" style={{color:'#e0dce8'}}>{branch}</span>
              <span className="text-xs font-semibold mt-1" style={{color:SINSAL_HIGHLIGHT[sinsal]??'#aaa'}}>{sinsal}</span>
            </div>
          )
        })}
      </div>

      {/* 일지 기준 */}
      <p className="text-xs mb-2" style={{color:'rgba(250,199,117,0.8)'}}>일지 기준 ({iljji})</p>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {saju.map(({pillar, branch}) => {
          const sinsal = getSinsal(iljji, branch)
          return (
            <div key={pillar} className="flex flex-col items-center rounded-xl py-2"
              style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <span className="text-[10px] mb-1" style={{color:'#8a88a0'}}>{pillar}</span>
              <span className="text-lg font-bold" style={{color:'#e0dce8'}}>{branch}</span>
              <span className="text-xs font-semibold mt-1" style={{color:SINSAL_HIGHLIGHT[sinsal]??'#aaa'}}>{sinsal}</span>
            </div>
          )
        })}
      </div>

      {/* 전체 대조표 */}
      <p className="text-xs mb-2" style={{color:'rgba(250,199,117,0.8)'}}>전체 대조표</p>
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse min-w-[300px]">
          <thead>
            <tr>
              <th className="py-1.5 px-1 text-[10px]" style={{color:'#8a88a0'}}>지지</th>
              <th className="py-1.5 px-1 text-[10px]" style={{color:'rgba(250,199,117,0.8)'}}>년지({yeonjji})</th>
              <th className="py-1.5 px-1 text-[10px]" style={{color:'rgba(250,199,117,0.8)'}}>일지({iljji})</th>
            </tr>
          </thead>
          <tbody>
            {JIJI.map(jiji => {
              const s1 = getSinsal(yeonjji, jiji)
              const s2 = getSinsal(iljji, jiji)
              return (
                <tr key={jiji} className="border-t" style={{borderColor:'rgba(255,255,255,0.05)'}}>
                  <td className="py-1.5 px-1">
                    <span className="text-sm font-bold" style={{color:'#e0dce8'}}>{jiji}</span>
                  </td>
                  <td className="py-1.5 px-1">
                    <span className="text-xs font-medium" style={{color:SINSAL_HIGHLIGHT[s1]??'#aaa'}}>{s1}</span>
                  </td>
                  <td className="py-1.5 px-1">
                    <span className="text-xs font-medium" style={{color:SINSAL_HIGHLIGHT[s2]??'#aaa'}}>{s2}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
