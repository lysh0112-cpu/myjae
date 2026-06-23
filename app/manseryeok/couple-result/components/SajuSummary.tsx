'use client'
import { useState } from 'react'
import { CoupleResultData, PersonInput } from '../hooks/useCoupleResult'

interface Props {
  result: CoupleResultData
  person1: PersonInput
  person2: PersonInput
}

async function fetchSaju(person: PersonInput) {
  const res = await fetch(
    `/api/lunar?year=${person.year}&month=${person.month}&day=${person.day}&calType=${person.calType}&leapMonth=0`
  )
  const d = await res.json()
  return d
}

export default function SajuSummary({ result, person1, person2 }: Props) {
  const [detail, setDetail] = useState('')
  const [loading, setLoading] = useState(false)
  const [shown, setShown] = useState(false)

  const handleDetail = async () => {
    if (shown) { setShown(false); return }
    setLoading(true)
    try {
      const [d1, d2] = await Promise.all([
        fetchSaju(person1),
        fetchSaju(person2),
      ])

      const p1Solar = person1.calType === '음력'
        ? `양력 ${d1.solarYear}년 ${d1.solarMonth}월 ${d1.solarDay}일`
        : `양력 ${person1.year}년 ${person1.month}월 ${person1.day}일`

      const p2Solar = person2.calType === '음력'
        ? `양력 ${d2.solarYear}년 ${d2.solarMonth}월 ${d2.solarDay}일`
        : `양력 ${person2.year}년 ${person2.month}월 ${person2.day}일`

      const p1Saju = `${d1.yearGanji} ${d1.monthGanji} ${d1.dayGanji}`
      const p2Saju = `${d2.yearGanji} ${d2.monthGanji} ${d2.dayGanji}`

      const prompt = `두 사람의 사주 궁합을 분석해주세요.
마크다운 기호(##, **, ---)는 절대 사용하지 마세요.

나 (${person1.gender}): ${person1.calType} ${person1.year}년 ${person1.month}월 ${person1.day}일 → ${p1Solar}
사주: ${p1Saju}

상대방 (${person2.gender}): ${person2.calType} ${person2.year}년 ${person2.month}월 ${person2.day}일 → ${p2Solar}
사주: ${p2Saju}

1. 두 사람 각각의 일간 특성과 용신
2. 두 사람 오행의 조화와 보완 관계
3. 궁합의 핵심 포인트 한 줄 요약

각 항목은 2~3문장으로 핵심만 작성해주세요.`

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await res.json()
      const text = data.content?.find((c: { type: string }) => c.type === 'text')?.text || ''
      setDetail(text)
      setShown(true)
    } catch (e) {
      setDetail('오류가 발생했습니다. 다시 시도해주세요.')
      setShown(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: '#13132a', borderRadius: '14px', padding: '16px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: '13px', fontWeight: '500', color: '#c8c0ff', marginBottom: '12px' }}>사주 요약</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ background: 'rgba(60,52,137,0.2)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '11px', color: '#7F77DD', marginBottom: '3px' }}>나</div>
          <div style={{ fontSize: '12px', color: '#c8c0ff' }}>{result.person1Summary}</div>
        </div>
        <div style={{ background: 'rgba(212,83,126,0.15)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '11px', color: '#D4537E', marginBottom: '3px' }}>상대방</div>
          <div style={{ fontSize: '12px', color: '#c8c0ff' }}>{result.person2Summary}</div>
        </div>
      </div>

      <div style={{ marginTop: '10px' }}>
        {!shown && !loading && (
          <button onClick={handleDetail}
            style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'rgba(60,52,137,0.3)', border: '1px solid #7F77DD', fontSize: '12px', color: '#c8b0ff', cursor: 'pointer' }}>
            ✨ 사주 상세 풀이 보기
          </button>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: '#c8b0ff' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>✦</div>
            사주를 풀이하고 있습니다...
          </div>
        )}

        {shown && detail && (
          <div style={{ background: 'rgba(60,52,137,0.15)', borderRadius: '10px', padding: '12px', fontSize: '12px', color: '#c8c0ff', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
            {detail}
            <button onClick={handleDetail}
              style={{ marginTop: '10px', width: '100%', padding: '8px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', color: '#8888cc', cursor: 'pointer' }}>
              접기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
