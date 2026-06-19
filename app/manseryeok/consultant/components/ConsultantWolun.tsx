// app/manseryeok/consultant/components/ConsultantWolun.tsx
'use client'

import { useState } from 'react'
import { getUnsung, getSinsal, unsungColor, GAN_COLOR, JI_COLOR, SINSAL_HIGHLIGHT } from '@/lib/saju'
import { calcWolunList } from '@/lib/saju/dayun'

interface Props {
  ilgan: string
  yeonjji: string
  iljji: string
}

export default function ConsultantWolun({ ilgan, yeonjji, iljji }: Props) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const wolunList = calcWolunList(ilgan, selectedYear)

  return (
    <div className="rounded-2xl p-5 mb-4" style={{background:'#2C2C2A',border:'1px solid rgba(255,255,255,0.07)'}}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-white">월운표</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedYear(y => y - 1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{background:'rgba(255,255,255,0.06)',color:'#e0dce8'}}>‹</button>
          <span className="text-sm font-semibold" style={{color:'#FAC775'}}>{selectedYear}년</span>
          <button onClick={() => setSelectedYear(y => y + 1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{background:'rgba(255,255,255,0.06)',color:'#e0dce8'}}>›</button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-center border-collapse min-w-[420px]">
          <thead>
            <tr style={{background:'rgba(255,255,255,0.04)'}}>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>월</th>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>천간</th>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>지지</th>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>12운성</th>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>신살<br/><span style={{color:'rgba(250,199,117,0.5)'}}>년지</span></th>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>신살<br/><span style={{color:'rgba(250,199,117,0.5)'}}>일지</span></th>
            </tr>
          </thead>
          <tbody>
            {wolunList.map((wolun, i) => {
              const unsung  = getUnsung(ilgan, wolun.jiji)
              const sinsal1 = getSinsal(yeonjji, wolun.jiji)
              const sinsal2 = getSinsal(iljji, wolun.jiji)
              const isCurrentMonth = selectedYear === currentYear && wolun.month === new Date().getMonth() + 1
              return (
                <tr key={i} className="border-b transition-colors"
                  style={{borderColor:'rgba(255,255,255,0.04)',
                    background: isCurrentMonth ? 'rgba(250,199,117,0.08)' : 'transparent'}}>
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs font-semibold" style={{color: isCurrentMonth ? '#FAC775' : '#e0dce8'}}>{wolun.month}월</span>
                      {isCurrentMonth && <span className="text-[10px] px-1 rounded" style={{background:'rgba(250,199,117,0.2)',color:'#FAC775'}}>이번달</span>}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px]" style={{color:'#8a88a0'}}>{wolun.ganYukchin}</span>
                      <span className="text-lg font-bold" style={{color:GAN_COLOR[wolun.cheongan]??'#FAC775'}}>{wolun.cheongan}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-lg font-bold" style={{color:JI_COLOR[wolun.jiji]??'#e0dce8'}}>{wolun.jiji}</span>
                      <span className="text-[10px]" style={{color:'#8a88a0'}}>{wolun.jiYukchin}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-xs font-semibold" style={{color:unsungColor(unsung)}}>{unsung}</span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-xs font-medium" style={{color:SINSAL_HIGHLIGHT[sinsal1]??'#aaa'}}>{sinsal1}</span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-xs font-medium" style={{color:SINSAL_HIGHLIGHT[sinsal2]??'#aaa'}}>{sinsal2}</span>
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
