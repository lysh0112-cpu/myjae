// app/manseryeok/consultant/components/ConsultantDayun.tsx
'use client'

import { getUnsung, getSinsal, unsungColor, GAN_COLOR, JI_COLOR, SINSAL_HIGHLIGHT } from '@/lib/saju'
import { DayunItem } from '@/lib/saju/dayun'

interface Props {
  dayunList: DayunItem[]
  ilgan: string
  yeonjji: string
  iljji: string
}

export default function ConsultantDayun({ dayunList, ilgan, yeonjji, iljji }: Props) {
  if (!dayunList || dayunList.length === 0) return null

  return (
    <div className="rounded-2xl p-5 mb-4" style={{background:'#2C2C2A',border:'1px solid rgba(255,255,255,0.07)'}}>
      <h2 className="text-base font-bold text-white mb-4">대운표 (상세)</h2>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-center border-collapse min-w-[420px]">
          <thead>
            <tr style={{background:'rgba(255,255,255,0.04)'}}>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>나이</th>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>천간</th>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>지지</th>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>12운성</th>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>신살<br/><span style={{color:'rgba(250,199,117,0.5)'}}>년지</span></th>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>신살<br/><span style={{color:'rgba(250,199,117,0.5)'}}>일지</span></th>
            </tr>
          </thead>
          <tbody>
            {dayunList.map((dayun, i) => {
              const unsung  = getUnsung(ilgan, dayun.jiji)
              const sinsal1 = getSinsal(yeonjji, dayun.jiji)
              const sinsal2 = getSinsal(iljji, dayun.jiji)
              return (
                <tr key={i} className="border-b transition-colors hover:bg-white/5"
                  style={{borderColor:'rgba(255,255,255,0.04)'}}>
                  <td className="py-3 px-2">
                    <span className="text-xs font-semibold" style={{color:'#FAC775'}}>{dayun.age}세</span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px]" style={{color:'#8a88a0'}}>{dayun.ganYukchin}</span>
                      <span className="text-lg font-bold" style={{color:GAN_COLOR[dayun.cheongan]??'#FAC775'}}>{dayun.cheongan}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-lg font-bold" style={{color:JI_COLOR[dayun.jiji]??'#e0dce8'}}>{dayun.jiji}</span>
                      <span className="text-[10px]" style={{color:'#8a88a0'}}>{dayun.jiYukchin}</span>
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
