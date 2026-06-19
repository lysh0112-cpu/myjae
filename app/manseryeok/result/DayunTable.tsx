'use client'

import { useState } from 'react'
import { getUnsung, getSinsal, unsungColor, GAN_COLOR, JI_COLOR, SINSAL_HIGHLIGHT } from '@/lib/saju'
import { calcDayunList } from '@/lib/saju/dayun'

interface Props {
  birthYear: number
  birthMonth: number
  birthDay: number
  gender: string
  monthGanji: string
  yearStem: string
  dayStem: string
  currentYear: number
  ilgan: string
  yeonjji: string
  iljji: string
}

const STEM_ELEMENT: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
const ELEMENT_COLOR: Record<string,string> = {목:'#4caf50',화:'#f44336',토:'#ff9800',금:'#9e9e9e',수:'#2196f3'}

export default function DayunTable({
  birthYear, birthMonth, birthDay, gender, monthGanji, yearStem, dayStem, currentYear, ilgan, yeonjji, iljji
}: Props) {
  const dayunList = calcDayunList(birthYear, birthMonth, birthDay, monthGanji, yearStem, gender, dayStem)
  const [selected, setSelected] = useState<number | null>(null)

  if (!dayunList || dayunList.length === 0) return null

  const currentAge = currentYear - birthYear
  const selectedDayun = selected !== null ? dayunList[selected] : null

  return (
    <div className="rounded-2xl p-4" style={{background:'#2C2C2A',border:'1px solid rgba(255,255,255,0.07)'}}>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold" style={{color:'rgba(250,199,117,0.8)'}}>대운</h3>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{background:'rgba(250,199,117,0.15)',color:'#FAC775'}}>
          현재 {currentAge}세
        </span>
        <span className="text-xs ml-auto" style={{color:'#8a88a0'}}>카드 클릭 → 상세</span>
      </div>

      {/* 가로 스크롤 카드 */}
      <div className="flex gap-2 overflow-x-auto pb-2" style={{scrollbarWidth:'none'}}>
        {dayunList.map((dayun, i) => {
          const isCurrent = dayun.age <= currentAge && currentAge < dayun.age + 10
          const isSelected = selected === i
          const ganColor = GAN_COLOR[dayun.cheongan] ?? ELEMENT_COLOR[STEM_ELEMENT[dayun.cheongan]] ?? '#FAC775'
          const jiColor = JI_COLOR[dayun.jiji] ?? '#e0dce8'
          return (
            <button key={i}
              onClick={() => setSelected(isSelected ? null : i)}
              className="flex-shrink-0 flex flex-col items-center rounded-xl py-3 px-3 transition-all"
              style={{
                minWidth:'58px',
                background: isSelected ? 'rgba(60,52,137,0.5)' : isCurrent ? 'rgba(250,199,117,0.12)' : 'rgba(60,52,137,0.2)',
                border: isSelected ? '1.5px solid rgba(60,52,137,0.8)' : isCurrent ? '1.5px solid rgba(250,199,117,0.5)' : '1px solid rgba(60,52,137,0.35)',
              }}>
              <div className="text-[10px] mb-1" style={{color: isCurrent ? '#FAC775' : '#8a88a0'}}>
                {dayun.age}세~
              </div>
              <div className="text-xl font-bold leading-tight" style={{color: ganColor}}>
                {dayun.cheongan}
              </div>
              <div className="text-xl font-bold leading-tight" style={{color: jiColor}}>
                {dayun.jiji}
              </div>
              <div className="text-[10px] mt-1 text-center" style={{color:'#8a88a0'}}>
                {dayun.ganYukchin}
              </div>
            </button>
          )
        })}
      </div>

      {/* 상세 팝업 */}
      {selectedDayun && (
        <div className="mt-3 rounded-xl p-4" style={{background:'rgba(60,52,137,0.2)',border:'1px solid rgba(60,52,137,0.4)'}}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold" style={{color: GAN_COLOR[selectedDayun.cheongan] ?? '#FAC775'}}>
                {selectedDayun.cheongan}
              </span>
              <span className="text-lg font-bold" style={{color: JI_COLOR[selectedDayun.jiji] ?? '#e0dce8'}}>
                {selectedDayun.jiji}
              </span>
              <span className="text-sm" style={{color:'#FAC775'}}>{selectedDayun.age}세~</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{background:'rgba(255,255,255,0.06)',color:'#8a88a0'}}>
                {birthYear + selectedDayun.age}년~{birthYear + selectedDayun.age + 9}년
              </span>
            </div>
            <button onClick={() => setSelected(null)} style={{color:'#8a88a0',fontSize:'18px'}}>✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg p-2.5" style={{background:'rgba(255,255,255,0.04)'}}>
              <div style={{color:'#8a88a0'}} className="mb-1">천간 십성</div>
              <div className="font-bold" style={{color:'#FAC775'}}>{selectedDayun.ganYukchin}</div>
            </div>
            <div className="rounded-lg p-2.5" style={{background:'rgba(255,255,255,0.04)'}}>
              <div style={{color:'#8a88a0'}} className="mb-1">지지 십성</div>
              <div className="font-bold" style={{color:'#FAC775'}}>{selectedDayun.jiYukchin}</div>
            </div>
            <div className="rounded-lg p-2.5" style={{background:'rgba(255,255,255,0.04)'}}>
              <div style={{color:'#8a88a0'}} className="mb-1">12운성</div>
              <div className="font-bold" style={{color: unsungColor(getUnsung(ilgan, selectedDayun.jiji))}}>
                {getUnsung(ilgan, selectedDayun.jiji)}
              </div>
            </div>
            <div className="rounded-lg p-2.5" style={{background:'rgba(255,255,255,0.04)'}}>
              <div style={{color:'#8a88a0'}} className="mb-1">신살 (년지)</div>
              <div className="font-bold" style={{color: SINSAL_HIGHLIGHT[getSinsal(yeonjji, selectedDayun.jiji)] ?? '#aaa'}}>
                {getSinsal(yeonjji, selectedDayun.jiji) || '-'}
              </div>
            </div>
            <div className="rounded-lg p-2.5 col-span-2" style={{background:'rgba(255,255,255,0.04)'}}>
              <div style={{color:'#8a88a0'}} className="mb-1">신살 (일지)</div>
              <div className="font-bold" style={{color: SINSAL_HIGHLIGHT[getSinsal(iljji, selectedDayun.jiji)] ?? '#aaa'}}>
                {getSinsal(iljji, selectedDayun.jiji) || '-'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
