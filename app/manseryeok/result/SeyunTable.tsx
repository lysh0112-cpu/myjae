'use client'

import { useState } from 'react'
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
const STEM_ELEMENT: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
const ELEMENT_COLOR: Record<string,string> = {목:'#4caf50',화:'#f44336',토:'#ff9800',금:'#9e9e9e',수:'#2196f3'}

export default function SeyunTable({ dayStem, currentYear, ilgan, yeonjji, iljji }: Props) {
  const seyunList = calcSeyunList(dayStem, currentYear)
  const [selected, setSelected] = useState<number | null>(null)

  if (!seyunList || seyunList.length === 0) return null

  // 현재 년도 기준 앞뒤 5년씩 10년치
  const currentIdx = seyunList.findIndex(s => s.year === CURRENT_YEAR)
  const startIdx = Math.max(0, currentIdx - 2)
  const displayList = seyunList.slice(startIdx, startIdx + 10)
  const selectedSeyun = selected !== null ? displayList[selected] : null

  return (
    <div className="rounded-2xl p-4" style={{background:'#2C2C2A',border:'1px solid rgba(255,255,255,0.07)'}}>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold" style={{color:'rgba(250,199,117,0.8)'}}>세운</h3>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{background:'rgba(250,199,117,0.15)',color:'#FAC775'}}>
          {CURRENT_YEAR}년
        </span>
        <span className="text-xs ml-auto" style={{color:'#8a88a0'}}>카드 클릭 → 상세</span>
      </div>

      {/* 10년 그리드 */}
      <div className="grid gap-1.5" style={{gridTemplateColumns:'repeat(5, 1fr)'}}>
        {displayList.map((seyun, i) => {
          const isCurrent = seyun.year === CURRENT_YEAR
          const isSelected = selected === i
          const ganColor = GAN_COLOR[seyun.cheongan] ?? ELEMENT_COLOR[STEM_ELEMENT[seyun.cheongan]] ?? '#FAC775'
          const jiColor = JI_COLOR[seyun.jiji] ?? '#e0dce8'
          return (
            <button key={i}
              onClick={() => setSelected(isSelected ? null : i)}
              className="flex flex-col items-center rounded-xl py-2 px-1 transition-all"
              style={{
                background: isSelected ? 'rgba(60,52,137,0.5)' : isCurrent ? 'rgba(250,199,117,0.12)' : 'rgba(255,255,255,0.03)',
                border: isSelected ? '1.5px solid rgba(60,52,137,0.8)' : isCurrent ? '1.5px solid rgba(250,199,117,0.5)' : '1px solid rgba(255,255,255,0.07)',
              }}>
              <div className="text-[10px] mb-0.5" style={{color: isCurrent ? '#FAC775' : '#8a88a0'}}>
                {seyun.year}
              </div>
              <div className="text-base font-bold leading-tight" style={{color: ganColor}}>
                {seyun.cheongan}
              </div>
              <div className="text-base font-bold leading-tight" style={{color: jiColor}}>
                {seyun.jiji}
              </div>
              <div className="text-[10px] mt-0.5" style={{color:'#8a88a0'}}>
                {seyun.ganYukchin}
              </div>
            </button>
          )
        })}
      </div>

      {/* 상세 팝업 */}
      {selectedSeyun && (
        <div className="mt-3 rounded-xl p-4" style={{background:'rgba(60,52,137,0.2)',border:'1px solid rgba(60,52,137,0.4)'}}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold" style={{color: GAN_COLOR[selectedSeyun.cheongan] ?? '#FAC775'}}>
                {selectedSeyun.cheongan}
              </span>
              <span className="text-lg font-bold" style={{color: JI_COLOR[selectedSeyun.jiji] ?? '#e0dce8'}}>
                {selectedSeyun.jiji}
              </span>
              <span className="text-sm font-bold" style={{color:'#FAC775'}}>{selectedSeyun.year}년</span>
            </div>
            <button onClick={() => setSelected(null)} style={{color:'#8a88a0',fontSize:'18px'}}>✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg p-2.5" style={{background:'rgba(255,255,255,0.04)'}}>
              <div style={{color:'#8a88a0'}} className="mb-1">천간 십성</div>
              <div className="font-bold" style={{color:'#FAC775'}}>{selectedSeyun.ganYukchin}</div>
            </div>
            <div className="rounded-lg p-2.5" style={{background:'rgba(255,255,255,0.04)'}}>
              <div style={{color:'#8a88a0'}} className="mb-1">12운성</div>
              <div className="font-bold" style={{color: unsungColor(getUnsung(ilgan, selectedSeyun.jiji))}}>
                {getUnsung(ilgan, selectedSeyun.jiji)}
              </div>
            </div>
            <div className="rounded-lg p-2.5" style={{background:'rgba(255,255,255,0.04)'}}>
              <div style={{color:'#8a88a0'}} className="mb-1">신살 (년지)</div>
              <div className="font-bold" style={{color: SINSAL_HIGHLIGHT[getSinsal(yeonjji, selectedSeyun.jiji)] ?? '#aaa'}}>
                {getSinsal(yeonjji, selectedSeyun.jiji) || '-'}
              </div>
            </div>
            <div className="rounded-lg p-2.5" style={{background:'rgba(255,255,255,0.04)'}}>
              <div style={{color:'#8a88a0'}} className="mb-1">신살 (일지)</div>
              <div className="font-bold" style={{color: SINSAL_HIGHLIGHT[getSinsal(iljji, selectedSeyun.jiji)] ?? '#aaa'}}>
                {getSinsal(iljji, selectedSeyun.jiji) || '-'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
