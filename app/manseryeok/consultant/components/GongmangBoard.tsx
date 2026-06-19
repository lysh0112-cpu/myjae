// app/manseryeok/consultant/components/GongmangBoard.tsx
'use client'

import { getGongmang, JI_COLOR } from '@/lib/saju'

interface Props {
  ilgan: string
  iljji: string
  yeangan: string
  yeonjji: string
}

export default function GongmangBoard({ ilgan, iljji, yeangan, yeonjji }: Props) {
  const [ilGm1, ilGm2] = getGongmang(ilgan, iljji)
  const [yeonGm1, yeonGm2] = getGongmang(yeangan, yeonjji)

  const GmBox = ({ jiji }: { jiji: string }) => (
    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2"
      style={{borderColor: JI_COLOR[jiji]??'#999', backgroundColor:`${JI_COLOR[jiji]??'#999'}18`}}>
      <span className="text-2xl font-bold" style={{color: JI_COLOR[jiji]??'#555'}}>{jiji}</span>
    </div>
  )

  return (
    <div className="rounded-2xl p-5 mb-4" style={{background:'#2C2C2A',border:'1px solid rgba(255,255,255,0.07)'}}>
      <h2 className="text-base font-bold text-white mb-4">공망 (空亡)</h2>

      <div className="space-y-4">
        <div>
          <p className="text-xs mb-2" style={{color:'rgba(250,199,117,0.8)'}}>일주 기준 ({ilgan}{iljji})</p>
          <div className="flex items-center gap-3">
            <GmBox jiji={ilGm1} />
            <GmBox jiji={ilGm2} />
            <p className="text-xs" style={{color:'#8a88a0'}}>이 지지가 놓인<br/>기둥은 힘이 약해집니다</p>
          </div>
        </div>

        <div>
          <p className="text-xs mb-2" style={{color:'rgba(250,199,117,0.8)'}}>년주 기준 ({yeangan}{yeonjji})</p>
          <div className="flex items-center gap-3">
            <GmBox jiji={yeonGm1} />
            <GmBox jiji={yeonGm2} />
            <p className="text-xs" style={{color:'#8a88a0'}}>이 지지가 놓인<br/>기둥은 힘이 약해집니다</p>
          </div>
        </div>
      </div>
    </div>
  )
}
