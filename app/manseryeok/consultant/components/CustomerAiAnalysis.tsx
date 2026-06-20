'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function CustomerAiAnalysis({
  consultationId,
}: {
  consultationId: string | null
}) {
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!consultationId) return
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('consultations')
        .select('ai_analysis')
        .eq('id', consultationId)
        .single()
      if (data?.ai_analysis) setAnalysis(data.ai_analysis)
      setLoading(false)
    }
    load()
  }, [consultationId])

  if (!consultationId) return null
  if (loading) return (
    <div className="rounded-2xl p-4 text-center"
      style={{background:'#2C2C2A', border:'1px solid rgba(255,255,255,0.07)'}}>
      <div className="animate-spin text-2xl">✦</div>
    </div>
  )
  if (!analysis) return null

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{background:'#2C2C2A', border:'1px solid rgba(250,199,117,0.15)'}}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{borderBottom: open ? '1px solid rgba(255,255,255,0.06)' : 'none'}}>
        <div className="flex items-center gap-2">
          <span>🤖</span>
          <span className="text-sm font-bold text-white">고객 AI 분석 결과</span>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{background:'rgba(76,175,80,0.2)', color:'#4caf50'}}>저장됨</span>
        </div>
        <span style={{color:'#FAC775'}}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="p-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{color:'#e0dce8'}}>{analysis}</p>
        </div>
      )}
    </div>
  )
}
