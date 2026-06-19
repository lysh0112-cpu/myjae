'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const ELEMENTS = ['목','화','토','금','수'] as const
const ELEMENT_COLOR: Record<string,string> = {목:'#4caf50',화:'#f44336',토:'#ff9800',금:'#9e9e9e',수:'#2196f3'}
const EMOJI: Record<string,string> = {목:'🌳',화:'🔥',토:'🪨',금:'⚙️',수:'💧'}

export default function ElementScore() {
  const [scores, setScores] = useState<Record<string,string>>({목:'',화:'',토:'',금:'',수:''})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [consultantId, setConsultantId] = useState<string | null>(null)

  // 로그인한 상담사의 기존 오행 비중 불러오기
  useEffect(() => {
    async function loadScores() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('consultants')
        .select('id, element_scores')
        .eq('email', user.email)
        .single()

      if (data) {
        setConsultantId(data.id)
        if (data.element_scores) {
          setScores({
            목: data.element_scores['목']?.toString() || '',
            화: data.element_scores['화']?.toString() || '',
            토: data.element_scores['토']?.toString() || '',
            금: data.element_scores['금']?.toString() || '',
            수: data.element_scores['수']?.toString() || '',
          })
        }
      }
    }
    loadScores()
  }, [])

  const total = ELEMENTS.reduce((sum, el) => sum + (parseFloat(scores[el]) || 0), 0)

  async function handleSave() {
    if (!consultantId) return
    setSaving(true)
    const element_scores = {
      목: parseFloat(scores['목']) || 0,
      화: parseFloat(scores['화']) || 0,
      토: parseFloat(scores['토']) || 0,
      금: parseFloat(scores['금']) || 0,
      수: parseFloat(scores['수']) || 0,
    }
    await supabase
      .from('consultants')
      .update({ element_scores })
      .eq('id', consultantId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="rounded-2xl p-5 mb-4" style={{background:'#2C2C2A',border:'1px solid rgba(255,255,255,0.07)'}}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-bold text-white">오행 분포 (전문가 입력)</h2>
        <button
          onClick={handleSave}
          disabled={saving || !consultantId}
          className="text-xs px-3 py-1.5 rounded-xl font-bold transition-all disabled:opacity-40"
          style={{
            background: saved ? 'rgba(76,175,80,0.2)' : 'rgba(250,199,117,0.15)',
            color: saved ? '#81c784' : '#FAC775',
            border: saved ? '1px solid rgba(76,175,80,0.3)' : '1px solid rgba(250,199,117,0.3)',
          }}
        >
          {saved ? '✓ 저장됨' : saving ? '저장중...' : '저장'}
        </button>
      </div>
      <p className="text-xs mb-4" style={{color:'#8a88a0'}}>
        총점: {total > 0 ? total.toFixed(1) : '—'} · 저장하면 다음 상담에도 유지됩니다
      </p>
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
                onChange={e => {
                  setScores(prev => ({...prev, [el]: e.target.value}))
                  setSaved(false)
                }}
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
