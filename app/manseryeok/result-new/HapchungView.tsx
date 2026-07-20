'use client'

import React from 'react'
import OhaengPentagon from './OhaengPentagon'
import { calcHapchungScore } from '@/lib/saju/hapchungScore'
import { calcYongsinScore, type Pillar, type Ohaeng } from '@/lib/saju/yongsinNew'

/**
 * 합충 반영 결과 뷰 (전문가 모드 전용)
 *
 * 합충 반영 오행 오각형 + 전/후 점수 비교 + 적용된 합충 목록.
 *   <HapchungView saju={saju} />
 */

interface Props {
  saju: Pillar[]
}

const ELS: Ohaeng[] = ['목', '화', '토', '금', '수']
const EL_HAN: Record<Ohaeng, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }
const EL_C: Record<Ohaeng, string> = { 목: '#2e7d32', 화: '#c62828', 토: '#f57f17', 금: '#8a7a5a', 수: '#2b6cb0' }

function toPct(score: Record<Ohaeng, number>): { el: string; pct: number }[] {
  const total = ELS.reduce((a, e) => a + score[e], 0) || 1
  return ELS.map(el => ({ el, pct: Math.round((score[el] / total) * 1000) / 10 }))
}

export default function HapchungView({ saju }: Props) {
  if (saju.length === 0) return null
  const base = calcYongsinScore(saju)
  const { score, notes } = calcHapchungScore(saju)
  const changed = ELS.some(e => Math.abs(base[e] - score[e]) > 0.05)
  // 오각형 육친 라벨용 일간 오행
  const STEM_EL: Record<string, string> = {
    甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
    己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
  }
  const dayEl = STEM_EL[saju.find(p => p.pillar === '일주')?.stem ?? '']

  return (
    <div style={{ fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif" }}>
      <div style={{ background: '#fff3e9', border: '0.5px solid #e8d5c5', borderRadius: 10, padding: '11px 13px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#b46e46', borderRadius: 6, padding: '3px 8px' }}>합충 반영됨</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#96502e' }}>합충 반영 오행</span>
        </div>
        <div style={{ fontSize: 10.5, color: '#a0836e' }}>용신 기준 · 辰戌丑未=土로 계산</div>
      </div>

      {/* 합충 반영 오각형 */}
      <div style={{ marginBottom: 12 }}>
        <OhaengPentagon ohaeng={toPct(score)} dayElement={dayEl} />
      </div>

      {/* 전/후 점수 비교표 */}
      <div style={{ background: '#faf3ee', border: '0.5px solid #f0e0d5', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr', gap: 4, fontSize: 11 }}>
          <div style={{ color: '#6b5340', fontWeight: 600 }}>오행</div>
          <div style={{ color: '#6b5340', fontWeight: 600, textAlign: 'right' }}>합충 전</div>
          <div style={{ color: '#96502e', fontWeight: 600, textAlign: 'right' }}>합충 후</div>
          {ELS.map(e => {
            const b = base[e], a = score[e]
            const diff = Math.round((a - b) * 10) / 10
            return (
              <React.Fragment key={e}>
                <div style={{ color: EL_C[e], fontWeight: 700 }}>{EL_HAN[e]} {e}</div>
                <div style={{ textAlign: 'right', color: '#999' }}>{Math.round(b * 10) / 10}</div>
                <div style={{ textAlign: 'right', color: '#333', fontWeight: 600 }}>
                  {Math.round(a * 10) / 10}
                  {diff !== 0 && <span style={{ fontSize: 9, color: diff > 0 ? '#2e7d32' : '#c62828', marginLeft: 4 }}>{diff > 0 ? '+' : ''}{diff}</span>}
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* 적용된 합충 목록 */}
      <div style={{ fontSize: 11, color: '#96502e', fontWeight: 700, marginBottom: 6 }}>적용된 합·충</div>
      {notes.length === 0 || !changed ? (
        <div style={{ fontSize: 11, color: '#6b5340', background: '#fff', border: '0.5px dashed #f0e0d5', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
          이 사주엔 점수를 바꾸는 합·충이 없어요.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {notes.map((n, i) => (
            <div key={i} style={{ fontSize: 11, color: '#5a4a3e', background: '#fff', border: '0.5px solid #f0e0d5', borderRadius: 8, padding: '8px 11px' }}>
              {n}
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 9.5, color: '#6b5340', marginTop: 8, lineHeight: 1.6 }}>
        ※ 합충 규칙(방합·삼합·반합·육합·천간합 + 충 + 거리가중치)을 반영한 결과예요. 유파에 따라 해석이 다를 수 있어요.
      </div>
    </div>
  )
}
