'use client'

import { getSinsal, SINSAL_HIGHLIGHT } from '@/lib/saju'

const JIJI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

interface Props {
  saju: {pillar:string; stem:string; branch:string}[]
  yeonjji: string
  iljji: string
}

export default function SinsalBoard({ saju, yeonjji, iljji }: Props) {
  const firstRow = JIJI.slice(0, 6)
  const secondRow = JIJI.slice(6, 12)

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

      {/* 전체 대조표 — 두 줄 (6개씩) */}
      <p className="text-xs mb-2" style={{color:'rgba(250,199,117,0.8)'}}>전체 대조표</p>

      {/* 1행: 子~巳 */}
      <div className="grid grid-cols-6 gap-1 mb-1">
        {firstRow.map(jiji => (
          <div key={jiji} className="flex flex-col items-center rounded-lg py-2"
            style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)'}}>
            <span className="text-sm font-bold mb-1" style={{color:'#e0dce8'}}>{jiji}</span>
            <span className="text-[10px] font-medium leading-tight text-center"
              style={{color:SINSAL_HIGHLIGHT[getSinsal(yeonjji,jiji)]??'#aaa'}}>
              {getSinsal(yeonjji,jiji)||'-'}
            </span>
            <span className="text-[10px] font-medium leading-tight text-center"
              style={{color:SINSAL_HIGHLIGHT[getSinsal(iljji,jiji)]??'#aaa'}}>
              {getSinsal(iljji,jiji)||'-'}
            </span>
          </div>
        ))}
      </div>

      {/* 2행: 午~亥 */}
      <div className="grid grid-cols-6 gap-1">
        {secondRow.map(jiji => (
          <div key={jiji} className="flex flex-col items-center rounded-lg py-2"
            style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)'}}>
            <span className="text-sm font-bold mb-1" style={{color:'#e0dce8'}}>{jiji}</span>
            <span className="text-[10px] font-medium leading-tight text-center"
              style={{color:SINSAL_HIGHLIGHT[getSinsal(yeonjji,jiji)]??'#aaa'}}>
              {getSinsal(yeonjji,jiji)||'-'}
            </span>
            <span className="text-[10px] font-medium leading-tight text-center"
              style={{color:SINSAL_HIGHLIGHT[getSinsal(iljji,jiji)]??'#aaa'}}>
              {getSinsal(iljji,jiji)||'-'}
            </span>
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div className="flex gap-3 mt-2">
        <span className="text-[10px]" style={{color:'rgba(250,199,117,0.6)'}}>위: 년지({yeonjji}) 기준</span>
        <span className="text-[10px]" style={{color:'rgba(250,199,117,0.6)'}}>아래: 일지({iljji}) 기준</span>
      </div>
    </div>
  )
}
