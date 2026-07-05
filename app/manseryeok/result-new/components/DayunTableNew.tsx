'use client'

import { useState, useEffect, useRef } from 'react'
import { getUnsung, getSinsal, unsungColor, GAN_COLOR, JI_COLOR, SINSAL_HIGHLIGHT } from '@/lib/saju'
import type { DayunItem } from '@/lib/saju/dayun'

interface Props {
  solarYear: number
  solarMonth: number
  solarDay: number
  gender: string
  monthGanji: string
  yearStem: string
  dayStem: string
  currentYear: number
  birthYear: number
  ilgan: string
  yeonjji: string
  iljji: string
}

const STEM_ELEMENT: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
const ELEMENT_COLOR: Record<string,string> = {목:'#2e7d32',화:'#c62828',토:'#795548',금:'#f57f17',수:'#1565c0'}

export default function DayunTableNew({
  solarYear, solarMonth, solarDay, gender, monthGanji, yearStem, dayStem,
  currentYear, birthYear, ilgan, yeonjji, iljji
}: Props) {
  const [dayunList, setDayunList] = useState<DayunItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const currentAge = currentYear - birthYear

  useEffect(() => {
    if (!solarYear || !solarMonth || !solarDay || !monthGanji || !yearStem || !dayStem) return
    let alive = true
    setLoading(true)
    fetch('/api/dayun', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solarYear, solarMonth, solarDay, monthGanji, yearStem, gender, dayStem }),
    })
      .then(r => r.json())
      .then(d => { if (alive) setDayunList(d.dayunList || []) })
      .catch(e => { console.error('대운 로딩 실패:', e); if (alive) setDayunList([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [solarYear, solarMonth, solarDay, monthGanji, yearStem, gender, dayStem])

  const reversedDayunList = [...(dayunList || [])].reverse()

  useEffect(() => {
    if (!scrollRef.current || !reversedDayunList.length) return
    const currentIdx = reversedDayunList.findIndex(d => d.age <= currentAge && currentAge < d.age + 10)
    if (currentIdx >= 0) {
      scrollRef.current.scrollLeft = Math.max(0, currentIdx * 72 - 72)
    }
  }, [dayunList, currentAge])

  if (loading) return (
    <div style={{
      background: '#fff', border: '0.5px solid #e8e5de',
      borderRadius: '20px', padding: '20px', textAlign: 'center',
      fontSize: '13px', color: '#bbb',
    }}>
      대운을 계산하는 중...
    </div>
  )

  if (!dayunList || dayunList.length === 0) return null

  const selectedDayun = selected !== null ? reversedDayunList[selected] : null

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
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a' }}>대운</span>
        <span style={{
          fontSize: '11px', padding: '2px 10px', borderRadius: '10px',
          background: '#fffbee', border: '0.5px solid #e8d5a0',
          color: '#8B6914', fontWeight: 600,
        }}>현재 {currentAge}세</span>
        <span style={{ fontSize: '11px', color: '#ccc', marginLeft: 'auto' }}>← 미래 · 과거 →</span>
      </div>

      {/* 가로 스크롤 카드 */}
      <div style={{ padding: '14px 14px 10px' }}>
        <div
          ref={scrollRef}
          style={{
            display: 'flex', gap: '6px',
            overflowX: 'auto', paddingBottom: '4px',
            scrollbarWidth: 'none',
          }}
        >
          {reversedDayunList.map((dayun, i) => {
            const isCurrent = dayun.age <= currentAge && currentAge < dayun.age + 10
            const isSelected = selected === i
            const ganEl = STEM_ELEMENT[dayun.cheongan]
            const ganColor = ganEl ? ELEMENT_COLOR[ganEl] : '#888'

            return (
              <button
                key={i}
                onClick={() => setSelected(isSelected ? null : i)}
                style={{
                  flexShrink: 0, minWidth: '64px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '10px 6px',
                  borderRadius: '14px',
                  background: isSelected ? '#1a1a1a' : isCurrent ? '#fffbee' : '#fafaf8',
                  border: isSelected ? '1.5px solid #1a1a1a'
                    : isCurrent ? '1.5px solid #e8d5a0'
                    : '0.5px solid #eeebe4',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {/* 나이 */}
                <div style={{
                  fontSize: '9px', fontWeight: 600, marginBottom: '6px',
                  color: isSelected ? '#d4b87a' : isCurrent ? '#8B6914' : '#bbb',
                }}>
                  {dayun.age}~{dayun.age + 9}
                </div>

                {/* 천간 */}
                <div style={{
                  fontSize: '22px', fontWeight: 700, lineHeight: 1,
                  color: isSelected ? '#fff' : '#1a1a1a',
                  marginBottom: '4px',
                }}>{dayun.cheongan}</div>

                {/* 구분선 */}
                <div style={{
                  width: '1px', height: '10px',
                  background: isSelected ? 'rgba(255,255,255,0.2)' : '#e0ddd6',
                  margin: '2px 0',
                }} />

                {/* 지지 */}
                <div style={{
                  fontSize: '22px', fontWeight: 600, lineHeight: 1,
                  color: isSelected ? '#d4b87a' : '#555',
                  marginTop: '4px', marginBottom: '6px',
                }}>{dayun.jiji}</div>

                {/* 십성 */}
                <div style={{
                  fontSize: '9px', color: isSelected ? 'rgba(255,255,255,0.6)' : '#bbb',
                  lineHeight: 1.4, textAlign: 'center',
                }}>
                  {dayun.ganYukchin}<br />{dayun.jiYukchin}
                </div>

                {/* 현재 뱃지 */}
                {isCurrent && !isSelected && (
                  <div style={{
                    marginTop: '6px', fontSize: '9px', fontWeight: 700,
                    background: '#8B6914', color: '#fff',
                    padding: '2px 8px', borderRadius: '8px',
                  }}>현재</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 상세 패널 */}
      {selectedDayun && (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a' }}>
                {selectedDayun.cheongan}{selectedDayun.jiji}
              </span>
              <span style={{
                fontSize: '12px', fontWeight: 700, color: '#8B6914',
                background: '#fffbee', border: '0.5px solid #e8d5a0',
                padding: '3px 10px', borderRadius: '10px',
              }}>{selectedDayun.age}~{selectedDayun.age + 9}세</span>
              <span style={{ fontSize: '11px', color: '#bbb' }}>
                {birthYear + selectedDayun.age}~{birthYear + selectedDayun.age + 9}년
              </span>
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', color: '#bbb', fontSize: '18px', cursor: 'pointer' }}
            >✕</button>
          </div>

          {/* 상세 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { label: '천간 십성', value: selectedDayun.ganYukchin },
              { label: '지지 십성', value: selectedDayun.jiYukchin },
              { label: '12운성', value: getUnsung(ilgan, selectedDayun.jiji), highlight: true },
              { label: '신살 (년지)', value: getSinsal(yeonjji, selectedDayun.jiji) || '-' },
            ].map(item => (
              <div key={item.label} style={{
                background: '#fff', border: '0.5px solid #eeebe4',
                borderRadius: '10px', padding: '10px 12px',
              }}>
                <div style={{ fontSize: '10px', color: '#bbb', marginBottom: '4px' }}>{item.label}</div>
                <div style={{
                  fontSize: '14px', fontWeight: 700,
                  color: item.highlight
                    ? unsungColor(item.value)
                    : SINSAL_HIGHLIGHT[item.value] ?? '#1a1a1a',
                }}>{item.value || '-'}</div>
              </div>
            ))}
            <div style={{
              background: '#fff', border: '0.5px solid #eeebe4',
              borderRadius: '10px', padding: '10px 12px',
              gridColumn: '1 / -1',
            }}>
              <div style={{ fontSize: '10px', color: '#bbb', marginBottom: '4px' }}>신살 (일지)</div>
              <div style={{
                fontSize: '14px', fontWeight: 700,
                color: SINSAL_HIGHLIGHT[getSinsal(iljji, selectedDayun.jiji)] ?? '#1a1a1a',
              }}>{getSinsal(iljji, selectedDayun.jiji) || '-'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
