'use client'

import { GAN_COLOR, JI_COLOR } from '@/lib/saju'
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
  if (!dayunList || dayunList.length === 0) return null

  const currentAge = currentYear - birthYear

  return (
    <div className="rounded-2xl p-4" style={{background:'#2C2C2A',border:'1px solid rgba(255,255,255,0.07)'}}>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold" style={{color:'rgba(250,199,117,0.8)'}}>대운</h3>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{background:'rgba(250,199,117,0.15)',color:'#FAC775'}}>
          현재 {currentAge}세
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2" style={{scrollbarWidth:'none'}}>
        {dayunList.map((dayun, i) => {
          const isCurrent = dayun.age <= currentAge && currentAge < dayun.age + 10
          const ganColor = GAN_COLOR[dayun.cheongan] ?? ELEMENT_COLOR[STEM_ELEMENT[dayun.cheongan]] ?? '#FAC775'
          const jiColor = JI_COLOR[dayun.jiji] ?? '#e0dce8'
          return (
            <div key={i} className="flex-shrink-0 flex flex-col items-center rounded-xl py-3 px-3"
              style={{
                minWidth:'60px',
                background: isCurrent ? 'rgba(250,199,117,0.12)' : 'rgba(60,52,137,0.2)',
                border: isCurrent ? '1.5px solid rgba(250,199,117,0.5)' : '1px solid rgba(60,52,137,0.35)',
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
              <div className="text-[10px] mt-1 text-center leading-tight" style={{color:'#8a88a0'}}>
                {dayun.ganYukchin}
              </div>
              <div className="text-[10px] text-center leading-tight" style={{color:'#8a88a0'}}>
                {dayun.jiYukchin}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
