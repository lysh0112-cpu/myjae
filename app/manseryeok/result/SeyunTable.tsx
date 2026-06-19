// app/manseryeok/result/SeyunTable.tsx
'use client'

import { getUnsung, getSinsal, unsungColor, GAN_COLOR, JI_COLOR, SINSAL_HIGHLIGHT } from '@/lib/saju'
import { calcSeyunList } from '@/lib/saju/dayun'

interface Props {
  dayStem: string
  currentYear: number
  ilgan: string
  yeonjji: string
  iljji: string
}

const CURRENT_YEAR = new Date().getFullYear()

export default function SeyunTable({ dayStem, currentYear, ilgan, yeonjji, iljji }: Props) {
  const seyunList = calcSeyunList(dayStem, currentYear)

  if (!seyunList || seyunList.length === 0) return null

  return (
    <div className="rounded-2xl p-5 mb-4" style={{background:'#2C2C2A',border:'1px solid rgba(255,255,255,0.07)'}}>
      <h3 className="text-sm font-semibold mb-4 tracking-wide" style={{color:'rgba(250,199,117,0.8)'}}>세운표</h3>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-center border-collapse min-w-[360px]">
          <thead>
            <tr style={{background:'rgba(255,255,255,0.04)'}}>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>연도</th>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>천간</th>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>지지</th>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>12운성</th>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>신살<br/><span style={{color:'rgba(250,199,117,0.5)'}}>년지</span></th>
              <th className="py-2 px-2 text-[10px] border-b" style={{color:'#8a88a0',borderColor:'rgba(255,255,255,0.06)'}}>신살<br/><span style={{color:'rgba(250,199,117,0.5)'}}>일지</span></th>
            </tr>
          </thead>
          <tbody>
            {seyunList.map((seyun, i) => {
              const unsung  = getUnsung(ilgan, seyun.jiji)
              const sinsal1 = getSinsal(yeonjji, seyun.jiji)
              const sinsal2 = getSinsal(iljji, seyun.jiji)
              const isCurrent = seyun.year === CURRENT_YEAR
              return (
                <tr key={i} className="border-b transition-colors"
                  style={{borderColor:'rgba(255,255,255,0.04)',
                    background: isCurrent ? 'rgba(250,199,117,0.08)' : 'transparent'}}>
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs font-semibold" style={{color: isCurrent ? '#FAC775' : '#e0dce8'}}>{seyun.year}</span>
                      {isCurrent && <span className="text-[10px] px-1 rounded" style={{background:'rgba(250,199,117,0.2)',color:'#FAC775'}}>올해</span>}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px]" style={{color:'#8a88a0'}}>{seyun.ganYukchin}</span>
                      <span className="text-lg font-bold" style={{color:GAN_COLOR[seyun.cheongan]??'#FAC775'}}>{seyun.cheongan}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-lg font-bold" style={{color:JI_COLOR[seyun.jiji]??'#e0dce8'}}>{seyun.jiji}</span>
                      <span className="text-[10px]" style={{color:'#8a88a0'}}>{seyun.jiYukchin}</span>
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
