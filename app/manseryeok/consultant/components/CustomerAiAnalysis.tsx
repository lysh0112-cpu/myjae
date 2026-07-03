'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function cleanMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^---+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface Props {
  consultationId: string | null
  saju?: {pillar:string; stem:string; branch:string}[]
  gender?: string
  calType?: string
  yearParam?: number
  monthParam?: number
  dayParam?: number
  hourIdx?: number | null
}

export default function CustomerAiAnalysis({
  consultationId, saju, gender, calType,
  yearParam, monthParam, dayParam, hourIdx
}: Props) {
  const [freeAnalysis, setFreeAnalysis] = useState('')   // 고객이 본 무료 기본 풀이
  const [paidAnalysis, setPaidAnalysis] = useState('')   // 고객이 본 유료 상세 풀이
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!consultationId) return
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('consultations')
        .select('ai_analysis, ai_free_analysis')
        .eq('id', consultationId)
        .single()
      if (data) {
        setFreeAnalysis(data.ai_free_analysis || '')
        setPaidAnalysis(data.ai_analysis || '')
      }
      setLoading(false)
    }
    load()
  }, [consultationId])

  // 고객이 본 해설이 하나도 없을 때만: 상담사가 직접 10항목 생성 (폴백)
  async function handleGenerate() {
    if (!saju || saju.length === 0) return
    setGenerating(true)
    try {
      const currentYear = new Date().getFullYear()
      const sajuText = saju.map(s => `${s.pillar}: ${s.stem}${s.branch}`).join(', ')
      const hourText = hourIdx === null || hourIdx === undefined ? '모름'
        : ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][hourIdx] + '시'

      const prompt = `사주 분석 전문가로서 아래 사주를 10가지 항목으로 분석해주세요.
마크다운 기호(##, **, ---)는 절대 사용하지 마세요.
각 항목은 핵심만 2~3문장, 100자 이내로 작성하세요.

성별: ${gender}성 / 생년월일: ${calType} ${yearParam}년 ${monthParam}월 ${dayParam}일
태어난 시: ${hourText} / 사주: ${sajuText}

1️⃣ 용신 분석 — 신강/신약, 용신·희신·기신, 활용법
2️⃣ 성격·기질 — 타고난 성격, 강점, 약점
3️⃣ 건강·체질 — 약한 부위, 주의 질병, 관리법
4️⃣ 연애·결혼 — 연애유형, 배우자 특징, 결혼 시기
5️⃣ 직업·취업 — 맞는 직업, 성공 시기
6️⃣ 재물·부동산 — 재물운, 돈 버는 시기
7️⃣ 사업·성공운 — 사업 적성, 성공 시기
8️⃣ 자녀운 — 자녀 인연, 출산 시기
9️⃣ 노후·안정 — 노후 재물, 평안한 시기
🔟 10년 운세 — ${currentYear}~${currentYear+9}년 흐름`

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({messages:[{role:'user', content: prompt}]}),
      })
      const data = await res.json()
      const rawText = data.content?.find((c:{type:string}) => c.type==='text')?.text || ''
      const cleaned = cleanMarkdown(rawText)
      setPaidAnalysis(cleaned)

      if (consultationId) {
        await supabase
          .from('consultations')
          .update({ ai_analysis: cleaned })
          .eq('id', consultationId)
      }
    } catch(e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  if (!consultationId) return null

  if (loading) return (
    <div className="rounded-2xl p-4 text-center"
      style={{background:'#2C2C2A', border:'1px solid rgba(255,255,255,0.07)'}}>
      <div className="animate-spin text-2xl">✦</div>
    </div>
  )

  const hasAny = !!(freeAnalysis || paidAnalysis)

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{background:'#2C2C2A', border:'1px solid rgba(250,199,117,0.15)'}}>

      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div className="flex items-center gap-2">
          <span>🤖</span>
          <span className="text-sm font-bold text-white">고객이 본 사주 풀이</span>
        </div>
        {hasAny && (
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{background:'rgba(76,175,80,0.2)', color:'#4caf50'}}>고객 조회분</span>
        )}
      </div>

      {/* 고객이 본 해설이 있으면: 무료·유료 가지런히 표시 */}
      {hasAny ? (
        <div className="p-4 space-y-3">
          {freeAnalysis && (
            <div className="rounded-xl p-4"
              style={{background:'rgba(60,52,137,0.15)', border:'1px solid rgba(60,52,137,0.3)'}}>
              <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{color:'#b0aec8'}}>
                <span>📖</span> 기본 풀이 <span style={{color:'#4caf50'}}>(무료로 본 내용)</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{color:'#e0dce8'}}>
                {freeAnalysis}
              </p>
            </div>
          )}

          {paidAnalysis && (
            <div className="rounded-xl p-4"
              style={{background:'rgba(250,199,117,0.08)', border:'1px solid rgba(250,199,117,0.2)'}}>
              <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{color:'#FAC775'}}>
                <span>✨</span> 상세 풀이 <span style={{color:'#FAC775', opacity:0.8}}>(유료 결제분)</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{color:'#e0dce8'}}>
                {paidAnalysis}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* 고객이 본 해설이 없을 때만: 상담사 직접 생성 (폴백) */
        <div className="p-4">
          <p className="text-xs mb-3 text-center" style={{color:'#8a88a0'}}>
            이 고객이 조회한 사주 풀이가 없습니다.<br/>전화 상담 등을 위해 직접 생성할 수 있어요.
          </p>
          <button onClick={handleGenerate} disabled={generating || !saju?.length}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 transition-all active:scale-95"
            style={{background:'linear-gradient(135deg,#3C3489 0%,#FAC775 100%)', color:'#1a1a18'}}>
            {generating
              ? <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">✦</span> AI 분석 생성 중...
                </span>
              : '✨ AI 전체 분석 생성 (1~10번)'}
          </button>
        </div>
      )}
    </div>
  )
}
