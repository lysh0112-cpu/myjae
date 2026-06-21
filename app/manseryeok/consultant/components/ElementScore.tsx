'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const ELEMENTS = ['목','화','토','금','수'] as const
const ELEMENT_COLOR: Record<string,string> = {목:'#4caf50',화:'#f44336',토:'#ff9800',금:'#9e9e9e',수:'#2196f3'}
const EMOJI: Record<string,string> = {목:'🌳',화:'🔥',토:'🪨',금:'⚙️',수:'💧'}

interface Props {
  consultationId?: string | null
  onScoreChange?: (scores: Record<string,number>) => void
}

export default function ElementScore({ consultationId, onScoreChange }: Props) {
  const [scores, setScores] = useState<Record<string,string>>({목:'',화:'',토:'',금:'',수:''})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // 고객별 저장된 점수 불러오기
  useEffect(() => {
    if (!consultationId) return
    async function loadScores() {
      const { data } = await supabase
        .from('consultations')
        .select('element_scores_custom')
        .eq('id', consultationId)
        .single()
      if (data?.element_scores_custom) {
        const s = data.element_scores_custom
        setScores({
          목: s['목']?.toString() || '',
          화: s['화']?.toString() || '',
          토: s['토']?.toString() || '',
          금: s['금']?.toString() || '',
          수: s['수']?.toString() || '',
        })
        // 부모에 초기값 전달
        onScoreChange?.({
          목: parseFloat(s['목']) || 0,
          화: parseFloat(s['화']) || 0,
          토: parseFloat(s['토']) || 0,
          금: parseFloat(s['금']) || 0,
          수: parseFloat(s['수']) || 0,
        })
      }
    }
    loadScores()
  }, [consultationId])

  const total = ELEMENTS.reduce((sum, el) => sum + (parseFloat(scores[el]) || 0), 0)

  function handleChange(el: string, value: string) {
    const newScores = {...scores, [el]: value}
    setScores(newScores)
    setSaved(false)
    // 부모에 변경값 실시간 전달
    onScoreChange?.({
      목: parseFloat(newScores['목']) || 0,
      화: parseFloat(newScores['화']) || 0,
      토: parseFloat(newScores['토']) || 0,
      금: parseFloat(newScores['금']) || 0,
      수: parseFloat(newScores['수']) || 0,
    })
  }

  async function handleSave() {
    if (!consultationId) return
    setSaving(true)
    const element_scores_custom = {
      목: parseFloat(scores['목']) || 0,
      화: parseFloat(scores['화']) || 0,
      토: parseFloat(scores['토']) || 0,
      금: parseFloat(scores['금']) || 0,
      수: parseFloat(scores['수']) || 0,
    }
    await supabase
      .from('consultations')
      .update({ element_scores_custom })
      .eq('id', consultationId)
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
          disabled={saving || !consultationId}
          className="text-xs px-3 py-1.5 rounded-xl font-bold transition-all disabled:opacity-40"
          style={{
            background: saved ? 'rgba(76,175,80,0.2)' : 'rgba(250,199,117,0.15)',
            color: saved ? '#81c784' : '#FAC775',
            border: saved ? '1px solid rgba(76,175,80,0.3)' : '1px solid rgba(250,199,117,0.3)',
          }}>
          {saved ? '✓ 저장됨' : saving ? '저장중...' : '저장'}
        </button>
      </div>
      <p className="text-xs mb-4" style={{color:'#8a88a0'}}>
        총점: {total > 0 ? total.toFixed(1) : '—'} · 저장하면 투트랙 용신에 반영됩니다
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
                type="number" min={0} step={0.1} placeholder="0"
                value={scores[el]}
                onChange={e => handleChange(el, e.target.value)}
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
      {!consultationId && (
        <p className="text-xs mt-2 text-center" style={{color:'rgba(255,255,255,0.3)'}}>
          ※ 상담 시작 후 저장 가능합니다
        </p>
      )}
    </div>
  )
}
