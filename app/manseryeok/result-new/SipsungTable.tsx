'use client'

import React from 'react'

/**
 * 십성표 (명카페 공용 부품 · 포스텔러 스타일)
 *
 * 사주 분석 화면 어디서나 가져다 씁니다.
 *   import SipsungTable from '@/app/manseryeok/result-new/SipsungTable'
 *   <SipsungTable sipsung={sipsung} />
 *
 * sipsung: [{ss:'상관', pct:28.6}, ...] 형태 (calcSipsung 결과 그대로)
 *
 * 특징
 *  - 십성 10개 고정 순서로 표시, 값 없으면 '-'
 *  - 이름은 오행색 계열로 (식상=초록, 재성=주황, 관성=빨강, 인성=파랑, 비겁=회색)
 *  - 글자 작게 + 가운데 정렬 (좁은 폭에서 오각형 그래프 옆에 나란히 두기 좋음)
 */

const SIPSIN_ORDER = ['상관', '식신', '정재', '편재', '정관', '편관', '정인', '편인', '겁재', '비견']

const SIPSIN_COLOR: Record<string, string> = {
  비견: '#9e9e9e', 겁재: '#9e9e9e',
  식신: '#4caf50', 상관: '#4caf50',
  편재: '#ff9800', 정재: '#ff9800',
  편관: '#f44336', 정관: '#f44336',
  편인: '#2196f3', 정인: '#2196f3',
}

const th: React.CSSProperties = {
  padding: '3px 2px', textAlign: 'center', fontWeight: 600,
  color: '#555', fontSize: '9px', border: '0.5px solid #eeebe4',
}

export default function SipsungTable({ sipsung }: { sipsung: { ss: string; pct: number }[] }) {
  const pct = (ss: string) => {
    const d = sipsung.find((s) => s.ss === ss)
    return d ? d.pct : null
  }

  return (
    <table style={{ borderCollapse: 'collapse', fontSize: '9.5px', width: '100%' }}>
      <thead>
        <tr style={{ background: '#f5f3ef' }}>
          <th style={th}>십성</th>
          <th style={th}>비율</th>
        </tr>
      </thead>
      <tbody>
        {SIPSIN_ORDER.map((ss) => {
          const p = pct(ss)
          return (
            <tr key={ss}>
              <td style={{
                padding: '3px 2px', textAlign: 'center', fontWeight: 600,
                color: SIPSIN_COLOR[ss] || '#555', border: '0.5px solid #eeebe4',
              }}>
                {ss}
              </td>
              <td style={{
                padding: '3px 2px', textAlign: 'center',
                fontWeight: p !== null ? 700 : 400,
                color: p !== null ? '#1a1a1a' : '#bbb',
                border: '0.5px solid #eeebe4',
              }}>
                {p !== null ? `${p}%` : '-'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
