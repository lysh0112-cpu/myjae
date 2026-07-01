'use client'
import { useState } from 'react'
import { CoupleResultData } from '../hooks/useCoupleResult'

interface ScoreItem {
  label: string
  score: number
  max: number
  color: string
}

export default function ScoreBoard({ result }: { result: CoupleResultData }) {
  const [expanded, setExpanded] = useState(false)

  const d = result.scoreDetails
  const hasSiju = d?.hasSiju ?? false

  // 새 배점: 일주28 용신18 년주10 월주8 공망6 오행10 조후8 시주12 = 100
  const sajuItems: ScoreItem[] = [
    { label: '일주', score: d?.iljuScore ?? 0,     max: 28, color: '#7F77DD' },
    { label: '용신', score: d?.yongsinScore ?? 0,  max: 18, color: '#9B77DD' },
    { label: '년주', score: d?.yeonScore ?? 0,     max: 10, color: '#7F99DD' },
    { label: '월주', score: d?.wolScore ?? 0,      max: 8,  color: '#7FBBDD' },
    { label: '공망', score: d?.gongmangScore ?? 0, max: 6,  color: '#7FDDCC' },
    { label: '오행', score: d?.ohaengScore ?? 0,   max: 10, color: '#7FDD99' },
    { label: '조후(온도)', score: d?.johuScore ?? 0, max: 8, color: '#DDBB7F' },
    // 시주는 두 사람 모두 태어난 시간을 알 때만 표시
    ...(hasSiju ? [{ label: '시주(말년)', score: d?.sijuScore ?? 0, max: 12, color: '#DD9977' }] : []),
  ]

  return (
    <div style={{
      background: '#13132a', borderRadius: '14px', padding: '20px 16px',
      marginBottom: '12px', border: '1px solid rgba(255,255,255,0.06)',
      textAlign: 'center'
    }}>
      {/* 총점 */}
      <div style={{ fontSize: '11px', color: '#5555aa', marginBottom: '8px' }}>두 분의 궁합 점수</div>
      <div style={{ fontSize: '52px', fontWeight: '700', color: '#c8b0ff', lineHeight: 1 }}>
        {result.totalScore}
      </div>
      <div style={{ fontSize: '14px', fontWeight: '500', color: '#c8b0ff', margin: '6px 0 4px' }}>
        {result.grade}
      </div>
      <div style={{ fontSize: '11px', color: '#8888cc', fontStyle: 'italic', marginBottom: '16px' }}>
        {result.gradeDesc}
      </div>

      {/* 사주/직업 요약 바 (MBTI는 점수에서 제외됨) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        {[
          { label: '🔮 사주 (운명)', score: result.sajuScore, max: 100, color: '#7F77DD' },
          ...(result.jobScore > 0 ? [{ label: '💼 직업 (현실)', score: result.jobScore, max: 30, color: '#D4537E' }] : []),
        ].map(item => (
          <div key={item.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8888cc', marginBottom: '4px' }}>
              <span>{item.label}</span>
              <span style={{ color: item.color, fontWeight: '500' }}>{item.score} / {item.max}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '20px', height: '7px' }}>
              <div style={{
                background: item.color, height: '7px', borderRadius: '20px',
                width: `${Math.min(100, Math.round(item.score / item.max * 100))}%`,
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* 사주 상세 접기/펼치기 */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', padding: '8px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          color: '#8888cc', fontSize: '11px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
        }}>
        <span>사주 상세 점수 보기</span>
        <span style={{
          transition: 'transform 0.3s', display: 'inline-block',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)'
        }}>▼</span>
      </button>

      {expanded && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sajuItems.map(item => (
            <div key={item.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8888cc', marginBottom: '4px' }}>
                <span>{item.label}</span>
                <span style={{ color: item.color, fontWeight: '500' }}>{item.score} / {item.max}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '20px', height: '6px' }}>
                <div style={{
                  background: item.color, height: '6px', borderRadius: '20px',
                  width: `${Math.min(100, Math.max(0, Math.round((item.score / item.max) * 100)))}%`,
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          ))}
          {!hasSiju && (
            <div style={{ fontSize: '10px', color: '#66668a', fontStyle: 'italic', marginTop: '2px' }}>
              태어난 시간을 몰라 시주는 빼고, 나머지로 100점 기준을 맞췄어요
            </div>
          )}
        </div>
      )}
    </div>
  )
}
