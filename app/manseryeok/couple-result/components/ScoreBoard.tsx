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

  const sajuItems: ScoreItem[] = result.scoreDetails ? [
    { label: '일주', score: result.scoreDetails.iljuScore,     max: 30, color: '#7F77DD' },
    { label: '용신', score: result.scoreDetails.yongsinScore,  max: 20, color: '#9B77DD' },
    { label: '년주', score: result.scoreDetails.yeonScore,     max: 15, color: '#7F99DD' },
    { label: '월주', score: result.scoreDetails.wolScore,      max: 10, color: '#7FBBDD' },
    { label: '공망', score: result.scoreDetails.gongmangScore, max: 10, color: '#7FDDCC' },
    { label: '오행', score: result.scoreDetails.ohaengScore,   max: 15, color: '#7FDD99' },
  ] : []

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

      {/* 사주/직업/MBTI 요약 바 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        {[
          { label: '🔮 사주 (운명)', score: result.sajuScore, max: 100, color: '#7F77DD' },
          ...(result.jobScore > 0 ? [{ label: '💼 직업 (현실)', score: result.jobScore, max: 30, color: '#D4537E' }] : []),
          ...(result.hasMbti ? [{ label: '💬 MBTI (소통)', score: result.mbtiScore, max: 25, color: '#1D9E75' }] : []),
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
      {sajuItems.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              width: '100%', padding: '8px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#8888cc', fontSize: '11px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
            }}>
            <span>사주 상세 점수 보기</span>
            <span style={{ transition: 'transform 0.3s', display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
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
            </div>
          )}
        </>
      )}
    </div>
  )
}
