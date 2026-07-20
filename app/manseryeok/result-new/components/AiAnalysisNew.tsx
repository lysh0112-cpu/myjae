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

export default function AiAnalysisNew({
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
  const promptParams = { saju, gender, calType, yearParam, monthParam, dayParam, hourIdx, leapMonth, solar }

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
      sessionStorage.setItem(FREE_KEY, cleaned)
      sessionStorage.setItem(CONSULT_FREE_KEY, cleaned)
    } catch {
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
      sessionStorage.setItem(PAID_KEY, cleaned)
      sessionStorage.setItem(CONSULT_PAID_KEY, cleaned)
    } catch {
      setPaidResult('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const savedFree = sessionStorage.getItem(FREE_KEY)
    const savedPaid = sessionStorage.getItem(PAID_KEY)
    const savedNote = sessionStorage.getItem(CONSULTANT_KEY)
    if (savedFree) { setFreeResult(savedFree); setFreeDone(true) }
    if (savedPaid) { setPaidResult(savedPaid); setIsPaidLocal(true) }
    if (savedNote) setConsultantNote(savedNote)
  }, [])

  useEffect(() => {
    if (saju && saju.length > 0 && !freeDone && !loading) {
      const savedFree = sessionStorage.getItem(FREE_KEY)
      if (!savedFree) handleFreeAnalysis()
    }
  }, [saju])

  return (
    <div style={{
      background: '#fff', border: '0.5px solid #e8e5de',
      borderRadius: '20px', overflow: 'hidden',
      fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '14px 18px 12px',
        borderBottom: '0.5px solid #f5f3ef',
      }}>
        <span style={{ color: '#8B6914', fontSize: '14px' }}>✦</span>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a' }}>사주 풀이</span>
        <span style={{
          fontSize: '11px', padding: '2px 10px', borderRadius: '10px', fontWeight: 600,
          background: isFullPaid ? '#fffbee' : '#f0fff5',
          border: isFullPaid ? '0.5px solid #e8d5a0' : '0.5px solid #b8e0c8',
          color: isFullPaid ? '#8B6914' : '#2e7d32',
        }}>
          {isFullPaid ? '전체 분석' : '기본'}
        </span>
        <span style={{ fontSize: '11px', color: '#6b5340', marginLeft: '4px' }}>
          {isFullPaid ? '10가지 항목 전체 분석' : '성격·기질 + 건강·체질'}
        </span>
      </div>

      <div style={{ padding: '16px' }}>

        {/* 로딩 */}
        {loading && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', padding: '32px 0', gap: '12px',
          }}>
            <div style={{ fontSize: '28px', animation: 'spin 1s linear infinite' }}>✦</div>
            <p style={{ fontSize: '13px', color: '#8B6914', textAlign: 'center', lineHeight: 1.7 }}>
              {isFullPaid ? '나머지 8가지를 분석하고 있습니다...' : '사주를 풀이하고 있습니다...'}<br />
              <span style={{ fontSize: '11px', color: '#6b5340' }}>(약 20~30초 소요)</span>
            </p>
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
          </div>
        )}

        {/* 무료 분석 결과 */}
        {freeDone && freeResult && (
          <div style={{
            background: '#fafaf8', border: '0.5px solid #eeebe4',
            borderRadius: '14px', padding: '16px', marginBottom: '12px',
          }}>
            <p style={{
              fontSize: '14px', lineHeight: 1.85,
              color: '#333', whiteSpace: 'pre-wrap', margin: 0,
            }}>{freeResult}</p>
          </div>
        )}

        {/* 유료 분석 결과 */}
        {paidResult && (
          <div style={{
            background: '#fffbee', border: '0.5px solid #e8d5a0',
            borderRadius: '14px', padding: '16px', marginBottom: '12px',
          }}>
            <div style={{
              fontSize: '12px', fontWeight: 700, color: '#8B6914',
              marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              ✨ 상세 풀이
            </div>
            <p style={{
              fontSize: '14px', lineHeight: 1.85,
              color: '#333', whiteSpace: 'pre-wrap', margin: 0,
            }}>{paidResult}</p>
          </div>
        )}

        {/* 상담사 부가 설명 */}
        {consultantNote && (
          <div style={{
            background: '#f0fff8', border: '0.5px solid #b8e0c8',
            borderRadius: '14px', padding: '16px', marginBottom: '12px',
          }}>
            <div style={{
              fontSize: '12px', fontWeight: 700, color: '#2e7d32',
              marginBottom: '10px',
            }}>💬 상담사 부가 설명</div>
            <p style={{
              fontSize: '14px', lineHeight: 1.85,
              color: '#333', whiteSpace: 'pre-wrap', margin: 0,
            }}>{consultantNote}</p>
          </div>
        )}

        {/* 다시 풀이하기 */}
        {freeDone && !loading && (
          <button
            onClick={handleFreeAnalysis}
            style={{
              width: '100%', height: '42px',
              background: '#fafaf8', border: '0.5px solid #e0ddd6',
              borderRadius: '10px', color: '#888',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              marginTop: '4px',
            }}
          >🔄 다시 풀이하기</button>
        )}
      </div>

      {/* 유료 잠금 섹션 — 지금은 숨김. 나중에 유료 기능 켤 때 아래 주석을 풀면 됩니다. */}
      {/* {!isFullPaid && freeDone && (
        <PaidLockSection onPay={handlePaidAnalysis} />
      )} */}
    </div>
  )
}
