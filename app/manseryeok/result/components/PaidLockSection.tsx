'use client'

import { useState, useEffect } from 'react'
import { getFreePrompt, getPaidPrompt } from './prompts'
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

const FREE_KEY = 'saju_free_analysis'
const PAID_KEY = 'saju_paid_analysis'
const CONSULTANT_KEY = 'saju_consultant_note'

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
  const [freeResult, setFreeResult] = useState('')
  const [paidResult, setPaidResult] = useState('')
  const [consultantNote, setConsultantNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [freeDone, setFreeDone] = useState(false)
  const [isPaidLocal, setIsPaidLocal] = useState(false)

  const isFullPaid = isPaid || isPaidLocal

  // 페이지 로드 시 localStorage에서 복원
  useEffect(() => {
    const savedFree = localStorage.getItem(FREE_KEY)
    const savedPaid = localStorage.getItem(PAID_KEY)
    const savedNote = localStorage.getItem(CONSULTANT_KEY)
    if (savedFree) { setFreeResult(savedFree); setFreeDone(true) }
    if (savedPaid) { setPaidResult(savedPaid); setIsPaidLocal(true) }
    if (savedNote) setConsultantNote(savedNote)
  }, [])

  const promptParams = {
    saju, gender, calType, yearParam, monthParam, dayParam,
    hourIdx, leapMonth, solar
  }

  const handleFreeAnalysis = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: getFreePrompt(promptParams) }] }),
      })
      const data = await res.json()
      const rawText = data.content?.find((c: { type: string }) => c.type === 'text')?.text || ''
      const cleaned = cleanMarkdown(rawText)
      setFreeResult(cleaned)
      setFreeDone(true)
      localStorage.setItem(FREE_KEY, cleaned)
    } catch (e) {
      setFreeResult('오류가 발생했습니다. 다시 시도해주세요.')
      setFreeDone(true)
    } finally {
      setLoading(false)
    }
  }

  const handlePaidAnalysis = async () => {
    onPayRequest?.()
    setIsPaidLocal(true)
    setLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: getPaidPrompt(promptParams) }] }),
      })
      const data = await res.json()
      const rawText = data.content?.find((c: { type: string }) => c.type === 'text')?.text || ''
      const cleaned = cleanMarkdown(rawText)
      setPaidResult(cleaned)
      localStorage.setItem(PAID_KEY, cleaned)
    } catch (e) {
      setPaidResult('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">✦</span>
          <h2 className="text-base font-bold text-white">사주 풀이</h2>
          {!isFullPaid ? (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(76,175,80,0.2)', color: '#4caf50' }}>기본</span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(250,199,117,0.2)', color: '#FAC775' }}>전체 분석</span>
          )}
        </div>
        <p className="text-xs mb-4" style={{ color: '#8a88a0' }}>
          {isFullPaid ? '10가지 항목 전체 분석' : '성격·기질 + 건강·체질 기본 풀이'}
        </p>

        {/* 분석 결과 없을 때만 버튼 표시 */}
        {!freeDone && !loading && (
          <button onClick={handleFreeAnalysis}
            className="w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#3C3489 0%,#FAC775 100%)',
              color: '#1a1a18', boxShadow: '0 4px 20px rgba(60,52,137,0.4)' }}>
            ✨ 사주 풀이 시작하기
          </button>
        )}

        {loading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="text-3xl animate-spin">✦</div>
            <p className="text-sm text-center" style={{ color: '#FAC775' }}>
              {isFullPaid ? '나머지 8가지를 분석하고 있습니다...' : '사주를 풀이하고 있습니다...'}<br />
              (약 20~30초 소요)
            </p>
          </div>
        )}

        {/* 기본 풀이 */}
        {freeDone && freeResult && (
          <div className="rounded-xl p-4 mb-3"
            style={{ background: 'rgba(60,52,137,0.15)', border: '1px solid rgba(60,52,137,0.3)' }}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: '#e0dce8' }}>{freeResult}</p>
          </div>
        )}

        {/* 상세 풀이 (유료) */}
        {paidResult && (
          <div className="rounded-xl p-4 mb-3 mt-3"
            style={{ background: 'rgba(250,199,117,0.08)', border: '1px solid rgba(250,199,117,0.2)' }}>
            <div className="text-xs font-bold mb-2" style={{ color: '#FAC775' }}>
              ✨ 상세 풀이
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: '#e0dce8' }}>{paidResult}</p>
          </div>
        )}

        {/* 상담사 부가 설명 */}
        {consultantNote && (
          <div className="rounded-xl p-4 mb-3 mt-3"
            style={{ background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.2)' }}>
            <div className="text-xs font-bold mb-2" style={{ color: '#1D9E75' }}>
              💬 상담사 부가 설명
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: '#e0dce8' }}>{consultantNote}</p>
          </div>
        )}

        {/* 다시하기 버튼 — 기본 풀이 있을 때만 */}
        {freeDone && !loading && (
          <button onClick={handleFreeAnalysis}
            className="w-full py-2.5 rounded-xl text-sm font-semibold mt-2"
            style={{ border: '1px solid rgba(60,52,137,0.5)', color: '#b0aec8',
              background: 'rgba(60,52,137,0.1)' }}>
            🔄 다시 풀이하기
          </button>
        )}
      </div>

      {!isFullPaid && freeDone && (
        <PaidLockSection onPay={handlePaidAnalysis} />
      )}
    </div>
  )
}
