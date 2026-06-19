// app/manseryeok/consultant/components/ElementScore.tsx
'use client'

import { useState } from 'react'

const ELEMENTS = ['목','화','토','금','수'] as const
const ELEMENT_COLOR: Record<string,string> = {목:'#4caf50',화:'#f44336',토:'#ff9800',금:'#9e9e9e',수:'#2196f3'}
const EMOJI: Record<string,string> = {목:'🌳',화:'🔥',토:'🪨',금:'⚙️',수:'💧'}

export default function ElementScore() {
  const [scores, setScores] = useState<Record<string,string>>({목:'',화:'',토:'',금:'',수:''})

  const total = ELEMENTS.reduce((sum, el) => sum + (parseFloat(scores[el]) || 0), 0)

  return (
    <div className="rounded-2xl p-5 mb-4" style={{background:'#2C2C2A',border:'1px solid rgba(255,255,255,0.07)'}}>
      <h2 className="text-base font-bold text-white mb-1">오행 분포 (전문가 입력)</h2>
      <p className="text-xs mb-4" style={{color:'#8a88a0'}}>총점: {total > 0 ? total.toFixed(1) : '—'}</p>

      <div className="space-y-3">
        {ELEMENTS.map(el => {
          const val = parseFloat(scores[el]) || 0
          const pct = total > 0 ? Math.round((val / total) * 100) : 0
          return (
            <div key={el} className="flex items-center gap-3">
              <span className="text-sm w-10 flex items-center gap-1" style={{color:ELEMENT_COLOR[el]}}>
                {EMOJI[el]} {el}
              </span>
              <input
                type="number"
                min={0}
                step={0.1}
                placeholder="0"
                value={scores[el]}
                onChange={e => setScores(prev => ({...prev, [el]: e.target.value}))}
                className="w-16 rounded-lg px-2 py-1.5 text-sm text-center outline-none"
                style={{background:'#1a1a18',border:'1px solid rgba(255,255,255,0.12)',color:'#FAC775',colorScheme:'dark'}}
              />
              <div className="flex-1 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)',height:'8px'}}>
                <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:ELEMENT_COLOR[el]}}/>
              </div>
              <span className="text-xs w-14 text-right" style={{color:'#8a88a0'}}>{el}{val > 0 ? val : 0} ({pct}%)</span>
            </div>
          )
        })}
      </div>

      {total > 0 && (
        <div className="mt-3 pt-3 border-t flex gap-2 flex-wrap" style={{borderColor:'rgba(255,255,255,0.06)'}}>
          <span className="text-xs" style={{color:'#8a88a0'}}>
            최강: <span style={{color:'#FAC775'}}>{ELEMENTS.reduce((a,b) => (parseFloat(scores[a])||0) > (parseFloat(scores[b])||0) ? a : b)}</span>
          </span>
          <span className="text-xs" style={{color:'#8a88a0'}}>
            최약: <span style={{color:'#4A90D9'}}>{ELEMENTS.reduce((a,b) => (parseFloat(scores[a])||0) < (parseFloat(scores[b])||0) ? a : b)}</span>
          </span>
        </div>
      )}
    </div>
  )
}
