'use client'

import { GAN_COLOR, JI_COLOR } from '@/lib/saju'
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
  if (!seyunList || seyunList.length === 0) return null

  return (
    <div className="rounded-2xl p-4" style={{background:'#2C2C2A',border:'1px solid rgba(255,255,255,0.07)'}}>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold" style={{color:'rgba(250,199,117,0.8)'}}>세운</h3>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{background:'rgba(250,199,117,0.15)',color:'#FAC775'}}>
          {CURRENT_YEAR}년
        </span>
      </div>
      <div className="grid gap-1.5" style={{gridTemplateColumns:'repeat(5, 1fr)'}}>
        {seyunList.map((seyun, i) => {
          const isCurrent = seyun.year === CURRENT_YEAR
          const ganColor = GAN_COLOR[seyun.cheongan] ?? ELEMENT_COLOR[STEM_ELEMENT[seyun.cheongan]] ?? '#FAC775'
          const jiColor = JI_COLOR[seyun.jiji] ?? '#e0dce8'
          return (
            <div key={i} className="flex flex-col items-center rounded-xl py-2 px-1"
              style={{
                background: isCurrent ? 'rgba(250,199,117,0.12)' : 'rgba(255,255,255,0.03)',
                border: isCurrent ? '1.5px solid rgba(250,199,117,0.5)' : '1px solid rgba(255,255,255,0.07)',
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
