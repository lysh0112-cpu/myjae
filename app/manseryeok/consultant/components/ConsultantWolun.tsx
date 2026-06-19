'use client'

import { useState } from 'react'
import { getUnsung, getSinsal, unsungColor, GAN_COLOR, JI_COLOR, SINSAL_HIGHLIGHT } from '@/lib/saju'
import { calcWolunList } from '@/lib/saju/dayun'

interface Props {
  ilgan: string
  yeonjji: string
  iljji: string
}

const STEM_ELEMENT: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
const ELEMENT_COLOR: Record<string,string> = {목:'#4caf50',화:'#f44336',토:'#ff9800',금:'#9e9e9e',수:'#2196f3'}

export default function ConsultantWolun({ ilgan, yeonjji, iljji }: Props) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selected, setSelected] = useState<number | null>(null)
  const wolunList = calcWolunList(ilgan, selectedYear)

  const firstRow = wolunList.slice(0, 6)
  const secondRow = wolunList.slice(6, 12)
  const selectedWolun = selected !== null ? wolunList[selected - 1] : null

  return (
    <div className="rounded-2xl p-4" style={{background:'#2C2C2A',border:'1px solid rgba(255,255,255,0.07)'}}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-white">월운</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => { setSelectedYear(y => y - 1); setSelected(null) }}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{background:'rgba(255,255,255,0.06)',color:'#e0dce8'}}>‹</button>
          <span className="text-sm font-semibold" style={{color:'#FAC775'}}>{selectedYear}년</span>
          <button onClick={() => { setSelectedYear(y => y + 1); setSelected(null) }}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{background:'rgba(255,255,255,0.06)',color:'#e0dce8'}}>›</button>
        </div>
        <span className="text-xs" style={{color:'#8a88a0'}}>클릭 → 상세</span>
      </div>

      {/* 1행: 1~6월 */}
      <div className="grid grid-cols-6 gap-1 mb-1">
        {firstRow.map((wolun) => {
          const isCurrentMonth = selectedYear === currentYear && wolun.month === currentMonth
          const isSelected = selected === wolun.month
          const ganColor = GAN_COLOR[wolun.cheongan] ?? ELEMENT_COLOR[STEM_ELEMENT[wolun.cheongan]] ?? '#FAC775'
          const jiColor = JI_COLOR[wolun.jiji] ?? '#e0dce8'
          return (
            <button key={wolun.month}
              onClick={() => setSelected(isSelected ? null : wolun.month)}
              className="flex flex-col items-center rounded-xl py-2 transition-all"
              style={{
                background: isSelected ? 'rgba(60,52,137,0.5)' : isCurrentMonth ? 'rgba(250,199,117,0.12)' : 'rgba(255,255,255,0.03)',
                border: isSelected ? '1.5px solid rgba(60,52,137,0.8)' : isCurrentMonth ? '1.5px solid rgba(250,199,117,0.5)' : '1px solid rgba(255,255,255,0.07)',
              }}>
              <div className="text-[10px] mb-0.5" style={{color: isCurrentMonth ? '#FAC775' : '#8a88a0'}}>
                {wolun.month}월
              </div>
              <div className="text-base font-bold leading-tight" style={{color: ganColor}}>{wolun.cheongan}</div>
              <div className="text-base font-bold leading-tight" style={{color: jiColor}}>{wolun.jiji}</div>
              <div className="text-[9px] mt-0.5" style={{color:'#8a88a0'}}>{wolun.ganYukchin}</div>
            </button>
          )
        })}
      </div>

      {/* 2행: 7~12월 */}
      <div className="grid grid-cols-6 gap-1">
        {secondRow.map((wolun) => {
          const isCurrentMonth = selectedYear === currentYear && wolun.month === currentMonth
          const isSelected = selected === wolun.month
          const ganColor = GAN_COLOR[wolun.cheongan] ?? ELEMENT_COLOR[STEM_ELEMENT[wolun.cheongan]] ?? '#FAC775'
          const jiColor = JI_COLOR[wolun.jiji] ?? '#e0dce8'
          return (
            <button key={wolun.month}
              onClick={() => setSelected(isSelected ? null : wolun.month)}
              className="flex flex-col items-center rounded-xl py-2 transition-all"
              style={{
                background: isSelected ? 'rgba(60,52,137,0.5)' : isCurrentMonth ? 'rgba(250,199,117,0.12)' : 'rgba(255,255,255,0.03)',
                border: isSelected ? '1.5px solid rgba(60,52,137,0.8)' : isCurrentMonth ? '1.5px solid rgba(250,199,117,0.5)' : '1px solid rgba(255,255,255,0.07)',
              }}>
              <div className="text-[10px] mb-0.5" style={{color: isCurrentMonth ? '#FAC775' : '#8a88a0'}}>
                {wolun.month}월
              </div>
              <div className="text-base font-bold leading-tight" style={{color: ganColor}}>{wolun.cheongan}</div>
              <div className="text-base font-bold leading-tight" style={{color: jiColor}}>{wolun.jiji}</div>
              <div className="text-[9px] mt-0.5" style={{color:'#8a88a0'}}>{wolun.ganYukchin}</div>
            </button>
          )
        })}
      </div>

      {/* 상세 팝업 */}
      {selectedWolun && (
        <div className="mt-3 rounded-xl p-4" style={{background:'rgba(60,52,137,0.2)',border:'1px solid rgba(60,52,137,0.4)'}}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold" style={{color: GAN_COLOR[selectedWolun.cheongan] ?? '#FAC775'}}>{selectedWolun.cheongan}</span>
              <span className="text-lg font-bold" style={{color: JI_COLOR[selectedWolun.jiji] ?? '#e0dce8'}}>{selectedWolun.jiji}</span>
              <span className="text-sm font-bold" style={{color:'#FAC775'}}>{selectedYear}년 {selectedWolun.month}월</span>
            </div>
            <button onClick={() => setSelected(null)} style={{color:'#8a88a0',fontSize:'18px'}}>✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg p-2.5" style={{background:'rgba(255,255,255,0.04)'}}>
              <div style={{color:'#8a88a0'}} className="mb-1">천간 십성</div>
              <div className="font-bold" style={{color:'#FAC775'}}>{selectedWolun.ganYukchin}</div>
            </div>
            <div className="rounded-lg p-2.5" style={{background:'rgba(255,255,255,0.04)'}}>
              <div style={{color:'#8a88a0'}} className="mb-1">12운성</div>
              <div className="font-bold" style={{color: unsungColor(getUnsung(ilgan, selectedWolun.jiji))}}>
                {getUnsung(ilgan, selectedWolun.jiji)}
              </div>
            </div>
            <div className="rounded-lg p-2.5" style={{background:'rgba(255,255,255,0.04)'}}>
              <div style={{color:'#8a88a0'}} className="mb-1">신살 (년지)</div>
              <div className="font-bold" style={{color: SINSAL_HIGHLIGHT[getSinsal(yeonjji, selectedWolun.jiji)] ?? '#aaa'}}>
                {getSinsal(yeonjji, selectedWolun.jiji) || '-'}
              </div>
            </div>
            <div className="rounded-lg p-2.5" style={{background:'rgba(255,255,255,0.04)'}}>
              <div style={{color:'#8a88a0'}} className="mb-1">신살 (일지)</div>
              <div className="font-bold" style={{color: SINSAL_HIGHLIGHT[getSinsal(iljji, selectedWolun.jiji)] ?? '#aaa'}}>
                {getSinsal(iljji, selectedWolun.jiji) || '-'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
