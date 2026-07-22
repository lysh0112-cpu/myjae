// app/manseryeok/couple-result-new/components/CoupleInsightToggle.tsx
// ============================================================================
// 연인 궁합 전용 — "오행 | MBTI" 토글 카드.
//   한 카드 안에서 타고난 오행(OhaengCompareCard)과 성격(MbtiCompareCard)을
//   토글로 전환. 전체는 아코디언으로 접힌다. 공간을 아끼려는 목적.
//   부부 궁합은 이 래퍼를 안 쓰고 OhaengCompareCard만 단독으로 쓴다.
// ============================================================================
'use client'

import { useState } from 'react'
import OhaengCompareCard from './OhaengCompareCard'
import MbtiCompareCard from './MbtiCompareCard'

interface Props {
  aScores: Record<string, number>
  bScores: Record<string, number>
  name1: string
  name2: string
  mbti1?: string
  mbti2?: string
}

export default function CoupleInsightToggle({
  aScores, bScores, name1, name2, mbti1, mbti2,
}: Props) {
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState<'ohaeng' | 'mbti'>('ohaeng')
  const hasMbti = !!(mbti1 && mbti2 && mbti1.length >= 4 && mbti2.length >= 4)

  const tabBtn = (key: 'ohaeng' | 'mbti', label: string) => {
    const on = tab === key
    return (
      <div
        onClick={() => setTab(key)}
        style={{
          flex: 1, textAlign: 'center', fontSize: 12, padding: '7px 0', cursor: 'pointer',
          borderRadius: 8,
          fontWeight: on ? 500 : 400,
          color: on ? '#96502e' : '#b09680',
          background: on ? '#fff' : 'transparent',
          boxShadow: on ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
          WebkitTapHighlightColor: 'transparent', WebkitUserSelect: 'none', userSelect: 'none',
        }}
      >
        {label}
      </div>
    )
  }

  return (
    <div style={{ background: '#FDF6F0', borderRadius: 16, padding: '18px 15px' }}>
      {/* 제목 = 접기/펴기 헤더 */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', marginBottom: open ? 14 : 0, WebkitTapHighlightColor: 'transparent', WebkitUserSelect: 'none', userSelect: 'none' }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: '#96502e' }}>두 사람 궁합 들여다보기</span>
        <span style={{ fontSize: 11, color: '#c0a898', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </div>

      {open && (
        <>
          {/* 토글 — MBTI 있을 때만 */}
          {hasMbti && (
            <div style={{ display: 'flex', gap: 6, background: '#f3e7db', borderRadius: 10, padding: 3, marginBottom: 16 }}>
              {tabBtn('ohaeng', '타고난 오행')}
              {tabBtn('mbti', 'MBTI')}
            </div>
          )}

          {tab === 'ohaeng' || !hasMbti ? (
            <OhaengCompareCard aScores={aScores} bScores={bScores} aLabel={name1} bLabel={name2} embedded />
          ) : (
            <MbtiCompareCard mbti1={mbti1!} mbti2={mbti2!} name1={name1} name2={name2} />
          )}
        </>
      )}
    </div>
  )
}
