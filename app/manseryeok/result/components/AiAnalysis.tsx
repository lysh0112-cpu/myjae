'use client'

import { useState } from 'react'
import { getFreePrompt, getFullPrompt } from './prompts'
import PaidLockSection from './PaidLockSection'

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
  saju: { pillar: string; stem: string; branch: string }[]
  gender: string
  calType: string
  yearParam: number
  monthParam: number
  dayParam: number
  hourIdx: number | null
  leapMonth: string
  solar: { year: number; month: number; day: number } | null
  isPaid?: boolean
  onPayRequest?: () => void
}

export default function AiAnalysis({
  saju, gender, calType, yearParam, monthParam, dayParam,
  hourIdx, leapMonth, solar, isPaid = false, onPayRequest
}: Props) {
  const [aiResult, setAiResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [isPaidLocal, setIsPaidLocal] = useState(false)

  const isFullPaid = isPaid || isPaidLocal

  const promptParams = {
    saju, gender, calType, yearParam, monthParam, dayParam,
    hourIdx, leapMonth, solar
  }

  const handleAiAnalysis = async (paid: boolean) => {
    setLoading(true)
    setAiResult('')
    setDone(false)
    const prompt = paid ? getFullPrompt(promptParams) : getFreePrompt(promptParams)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({messages:[{role:'user',content:prompt}]}),
      })
      const data = await res.json()
      const rawText = data.content?.find((c:{type:string}) => c.type==='text')?.text || ''
      setAiResult(cleanMarkdown(rawText))
    } catch(e) {
      setAiResult('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
      setDone(true)
    }
  }

  const handlePayAndAnalyze = () => {
    onPayRequest?.()
    setIsPaidLocal(true)
    setDone(false)
    setAiResult('')
    handleAiAnalysis(true)
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{background:"#2C2C2A",border:"1px solid rgba(255,255,255,0.07)"}}>

      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🤖</span>
          <h2 className="text-base font-bold text-white">AI 사주 분석</h2>
          {!isFullPaid ? (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{background:"rgba(76,175,80,0.2)",color:"#4caf50"}}>무료</span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{background:"rgba(250,199,117,0.2)",color:"#FAC775"}}>전체 분석</span>
          )}
        </div>
        <p className="text-xs mb-4" style={{color:"#8a88a0"}}>
          {isFullPaid ? '10가지 항목 전체 분석' : '사주팔자·성격 분석 + 건강·체질 분석'}
        </p>

        {!done && !loading && (
          <button onClick={() => handleAiAnalysis(false)}
            className="w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all active:scale-95"
            style={{background:"linear-gradient(135deg,#3C3489 0%,#FAC775 100%)",
              color:"#1a1a18",boxShadow:"0 4px 20px rgba(60,52,137,0.4)"}}>
            ✨ 무료 AI 분석 시작하기
          </button>
        )}
        {loading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="text-3xl animate-spin">✦</div>
            <p className="text-sm text-center" style={{color:"#FAC775"}}>
              {isFullPaid ? 'AI가 10가지 항목을 분석하고 있습니다...' : 'AI가 사주를 분석하고 있습니다...'}<br/>
              (약 20~30초 소요)
            </p>
          </div>
        )}
        {done && aiResult && (
          <div>
            <div className="rounded-xl p-4 mb-3"
              style={{background:"rgba(60,52,137,0.15)",border:"1px solid rgba(60,52,137,0.3)"}}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{color:"#e0dce8"}}>{aiResult}</p>
            </div>
            <button onClick={() => handleAiAnalysis(isFullPaid)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold mb-2"
              style={{border:"1px solid rgba(60,52,137,0.5)",color:"#b0aec8",
                background:"rgba(60,52,137,0.1)"}}>
              🔄 다시 분석하기
            </button>
          </div>
        )}
      </div>

      {!isFullPaid && <PaidLockSection onPay={handlePayAndAnalyze} />}
    </div>
  )
}
