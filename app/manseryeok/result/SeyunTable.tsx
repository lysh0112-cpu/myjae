// app/manseryeok/result/SeyunTable.tsx
'use client'

import { getUnsung, getSinsal, unsungColor, GAN_COLOR, JI_COLOR, SINSAL_HIGHLIGHT } from '@/lib/saju'

interface Seyun {
  year: number
  cheongan: string
  jiji: string
  ganYukchin: string
  jiYukchin: string
}

interface Props {
  seyunList: Seyun[]
  ilgan: string
  yeonjji: string
  iljji: string
}

const CURRENT_YEAR = new Date().getFullYear()

export default function SeyunTable({ seyunList, ilgan, yeonjji, iljji }: Props) {
  if (!seyunList || seyunList.length === 0) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
      <h3 className="text-sm font-semibold text-gray-500 mb-4 tracking-wide">세운표</h3>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-center border-collapse min-w-[560px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="py-2 px-2 text-xs text-gray-400 font-medium border-b border-gray-100">연도</th>
              <th className="py-2 px-2 text-xs text-gray-400 font-medium border-b border-gray-100">천간</th>
              <th className="py-2 px-2 text-xs text-gray-400 font-medium border-b border-gray-100">지지</th>
              <th className="py-2 px-2 text-xs text-gray-400 font-medium border-b border-gray-100">12운성</th>
              <th className="py-2 px-2 text-xs text-gray-400 font-medium border-b border-gray-100">
                신살<br/><span className="text-[10px] text-gray-300">년지기준</span>
              </th>
              <th className="py-2 px-2 text-xs text-gray-400 font-medium border-b border-gray-100">
                신살<br/><span className="text-[10px] text-gray-300">일지기준</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {seyunList.map((seyun, i) => {
              const unsung  = getUnsung(ilgan, seyun.jiji)
              const sinsal1 = getSinsal(yeonjji, seyun.jiji)
              const sinsal2 = getSinsal(iljji, seyun.jiji)
              const isCurrent = seyun.year === CURRENT_YEAR
              return (
                <tr key={i} className={`border-b border-gray-50 transition-colors ${isCurrent ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}`}>
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-center gap-1">
                      <span className={`text-xs font-semibold ${isCurrent ? 'text-amber-600' : 'text-gray-600'}`}>
                        {seyun.year}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] bg-amber-200 text-amber-700 px-1 rounded">올해</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] text-gray-400">{seyun.ganYukchin}</span>
                      <span className="text-lg font-bold" style={{ color: GAN_COLOR[seyun.cheongan] ?? '#333' }}>
                        {seyun.cheongan}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-lg font-bold" style={{ color: JI_COLOR[seyun.jiji] ?? '#333' }}>
                        {seyun.jiji}
                      </span>
                      <span className="text-[10px] text-gray-400">{seyun.jiYukchin}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-xs font-semibold" style={{ color: unsungColor(unsung) }}>
                      {unsung}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-xs font-medium" style={{ color: SINSAL_HIGHLIGHT[sinsal1] ?? '#666' }}>
                      {sinsal1}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-xs font-medium" style={{ color: SINSAL_HIGHLIGHT[sinsal2] ?? '#666' }}>
                      {sinsal2}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-3 text-[11px] text-gray-400">
        <span><span className="font-semibold" style={{color:'#2d7a2d'}}>■</span> 강한 운성</span>
        <span><span className="font-semibold" style={{color:'#b03030'}}>■</span> 약한 운성</span>
        <span><span className="font-semibold" style={{color:'#D97706'}}>■</span> 역마</span>
        <span><span className="font-semibold" style={{color:'#DC2626'}}>■</span> 겁살</span>
        <span><span className="font-semibold" style={{color:'#DB2777'}}>■</span> 년살(도화)</span>
      </div>
    </div>
  )
}
