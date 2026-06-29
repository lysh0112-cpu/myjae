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

// 자기 화면 복원용 키
const FREE_KEY = 'saju_free_analysis'
const PAID_KEY = 'saju_paid_analysis'
const CONSULTANT_KEY = 'saju_consultant_note'
// 상담 신청 화면(consulting)이 읽어가는 전달용 키
const CONSULT_FREE_KEY = 'ai_free_analysis'
const CONSULT_PAID_KEY = 'ai_analysis'

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
      // 임시 저장(세션): 탭 닫으면 사라져 남의 사주가 남지 않음 + 상담 전달용 키도 함께 저장
      sessionStorage.setItem(FREE_KEY, cleaned)
      sessionStorage.setItem(CONSULT_FREE_KEY, cleaned)
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
      // 임시 저장(세션) + 상담 전달용 키도 함께 저장
      sessionStorage.setItem(PAID_KEY, cleaned)
      sessionStorage.setItem(CONSULT_PAID_KEY, cleaned)
    } catch (e) {
      setPaidResult('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  // 세션 복원 (같은 세션에서만, 탭 닫으면 사라짐)
  useEffect(() => {
    const savedFree = sessionStorage.getItem(FREE_KEY)
    const savedPaid = sessionStorage.getItem(PAID_KEY)
    const savedNote = sessionStorage.getItem(CONSULTANT_KEY)
    if (savedFree) { setFreeResult(savedFree); setFreeDone(true) }
    if (savedPaid) { setPaidResult(savedPaid); setIsPaidLocal(true) }
    if (savedNote) setConsultantNote(savedNote)
  }, [])

  // saju 데이터 로드되면 자동 시작
  useEffect(() => {
    if (saju && saju.length > 0 && !freeDone && !loading) {
      const savedFree = sessionStorage.getItem(FREE_KEY)
      if (!savedFree) {
        handleFreeAnalysis()
      }
    }
  }, [saju])

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

        {loading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="text-3xl animate-spin">✦</div>
            <p className="text-sm text-center" style={{ color: '#FAC775' }}>
              {isFullPaid ? '나머지 8가지를 분석하고 있습니다...' : '사주를 풀이하고 있습니다...'}<br />
              (약 20~30초 소요)
            </p>
          </div>
        )}

        {freeDone && freeResult && (
          <div className="rounded-xl p-4 mb-3"
            style={{ background: 'rgba(60,52,137,0.15)', border: '1px solid rgba(60,52,137,0.3)' }}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: '#e0dce8' }}>{freeResult}</p>
          </div>
        )}

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
