'use client'

import { useState } from 'react'
import { getUnsung, getSinsal, unsungColor, SINSAL_HIGHLIGHT } from '@/lib/saju'
import { calcSeyunList } from '@/lib/saju/dayun'

interface Props {
  dayStem: string
  currentYear: number
  ilgan: string
  yeonjji: string
  iljji: string
}

const CURRENT_YEAR = new Date().getFullYear()
const STEM_ELEMENT: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
const ELEMENT_COLOR: Record<string,string> = {목:'#2e7d32',화:'#c62828',토:'#795548',금:'#f57f17',수:'#1565c0'}

export default function SeyunTableNew({ dayStem, currentYear, ilgan, yeonjji, iljji }: Props) {
  const seyunList = calcSeyunList(dayStem, currentYear)
  const [selected, setSelected] = useState<number | null>(null)

  if (!seyunList || seyunList.length === 0) return null

  const currentIdx = seyunList.findIndex(s => s.year === CURRENT_YEAR)
  const startIdx = Math.max(0, currentIdx - 2)
  const displayList = [...seyunList.slice(startIdx, startIdx + 10)].reverse()
  const selectedSeyun = selected !== null ? displayList[selected] : null

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
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a' }}>세운</span>
        <span style={{
          fontSize: '11px', padding: '2px 10px', borderRadius: '10px',
          background: '#fffbee', border: '0.5px solid #e8d5a0',
          color: '#8B6914', fontWeight: 600,
        }}>{CURRENT_YEAR}년</span>
        <span style={{ fontSize: '11px', color: '#ccc', marginLeft: 'auto' }}>← 미래 · 과거 →</span>
      </div>

      {/* 5열 그리드 */}
      <div style={{
        padding: '14px',
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px',
      }}>
        {displayList.map((seyun, i) => {
          const isCurrent = seyun.year === CURRENT_YEAR
          const isSelected = selected === i
          const ganEl = STEM_ELEMENT[seyun.cheongan]
          const ganColor = ganEl ? ELEMENT_COLOR[ganEl] : '#888'

          return (
            <button
              key={i}
              onClick={() => setSelected(isSelected ? null : i)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '10px 4px',
                borderRadius: '12px',
                background: isSelected ? '#1a1a1a' : isCurrent ? '#fffbee' : '#fafaf8',
                border: isSelected ? '1.5px solid #1a1a1a'
                  : isCurrent ? '1.5px solid #e8d5a0'
                  : '0.5px solid #eeebe4',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {/* 연도 */}
              <div style={{
                fontSize: '9px', fontWeight: 600, marginBottom: '5px',
                color: isSelected ? '#d4b87a' : isCurrent ? '#8B6914' : '#bbb',
              }}>{seyun.year}</div>

              {/* 천간 */}
              <div style={{
                fontSize: '20px', fontWeight: 700, lineHeight: 1,
                color: isSelected ? '#fff' : '#1a1a1a',
                marginBottom: '3px',
              }}>{seyun.cheongan}</div>

              {/* 구분선 */}
              <div style={{
                width: '1px', height: '8px',
                background: isSelected ? 'rgba(255,255,255,0.2)' : '#e0ddd6',
                margin: '2px 0',
              }} />

              {/* 지지 */}
              <div style={{
                fontSize: '20px', fontWeight: 600, lineHeight: 1,
                color: isSelected ? '#d4b87a' : '#555',
                marginTop: '3px', marginBottom: '5px',
              }}>{seyun.jiji}</div>

              {/* 십성 */}
              <div style={{
                fontSize: '9px',
                color: isSelected ? 'rgba(255,255,255,0.6)' : '#bbb',
              }}>{seyun.ganYukchin}</div>

              {/* 현재 뱃지 */}
              {isCurrent && !isSelected && (
                <div style={{
                  marginTop: '5px', fontSize: '9px', fontWeight: 700,
                  background: '#8B6914', color: '#fff',
                  padding: '1px 7px', borderRadius: '6px',
                }}>올해</div>
              )}
            </button>
          )
        })}
      </div>

      {/* 상세 패널 */}
      {selectedSeyun && (
        <div style={{
          margin: '0 14px 14px',
          background: '#fafaf8', border: '0.5px solid #e8e5de',
          borderRadius: '14px', padding: '14px',
        }}>
          {/* 상세 헤더 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '26px', fontWeight: 700, color: '#1a1a1a' }}>
                {selectedSeyun.cheongan}{selectedSeyun.jiji}
              </span>
              <span style={{
                fontSize: '12px', fontWeight: 700,
                background: '#fffbee', border: '0.5px solid #e8d5a0',
                color: '#8B6914', padding: '3px 10px', borderRadius: '10px',
              }}>{selectedSeyun.year}년</span>
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', color: '#bbb', fontSize: '18px', cursor: 'pointer' }}
            >✕</button>
          </div>

          {/* 상세 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { label: '천간 십성', value: selectedSeyun.ganYukchin },
              { label: '12운성', value: getUnsung(ilgan, selectedSeyun.jiji), isUnsung: true },
              { label: '신살 (년지)', value: getSinsal(yeonjji, selectedSeyun.jiji) || '-', isSinsal: true, key: getSinsal(yeonjji, selectedSeyun.jiji) },
              { label: '신살 (일지)', value: getSinsal(iljji, selectedSeyun.jiji) || '-', isSinsal: true, key: getSinsal(iljji, selectedSeyun.jiji) },
            ].map((item, idx) => (
              <div key={idx} style={{
                background: '#fff', border: '0.5px solid #eeebe4',
                borderRadius: '10px', padding: '10px 12px',
              }}>
                <div style={{ fontSize: '10px', color: '#bbb', marginBottom: '4px' }}>{item.label}</div>
                <div style={{
                  fontSize: '14px', fontWeight: 700,
                  color: item.isUnsung
                    ? unsungColor(item.value)
                    : item.isSinsal
                    ? (SINSAL_HIGHLIGHT[item.key || ''] ?? '#1a1a1a')
                    : '#1a1a1a',
                }}>{item.value || '-'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
