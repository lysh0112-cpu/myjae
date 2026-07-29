'use client'

// ============================================================================
// MBTI 고르기 — 콤보박스 + [잘 모름 / 검사하기]
// ----------------------------------------------------------------------------
// ★2026-07-29 — 대표님 지시로 되살렸습니다.
//   2026-07-24 에 궁합에서 MbtiInput.tsx 를 지웠던 그 자리입니다.
//   그때는 «판정 점수»에 쓰려던 것이라 지웠고, 이번엔 «진로적성 해설»에 씁니다.
//   ⚠️ 점수에 쓰지 마십시오. 사주 판정에 MBTI 를 섞으면 근거가 흐려집니다.
//
//   [잘 모름]을 고르면 검사 안내가 뜹니다. 값은 빈 문자열로 둡니다.
//   → 리포트는 「사주 추정 MBTI」만 보여 주고, 실제 값을 넣도록 권합니다.
// ============================================================================

import { useState } from 'react'

export const MBTI_LIST = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
] as const

/** 검사 안내에서 띄울 곳 — 바꾸실 때 여기 한 곳만 고치면 됩니다 */
const TEST_URL = 'https://www.16personalities.com/ko'

interface Props {
  value: string
  onChange: (v: string) => void
  accent?: string
}

export default function MbtiSelect({ value, onChange, accent = '#785aaa' }: Props) {
  const [guide, setGuide] = useState(false)

  return (
    <div>
      <label
        htmlFor="mbti-select"
        style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#3a2e28', marginBottom: 7 }}
      >
        MBTI <span style={{ fontWeight: 400, color: '#8a6a52' }}>(모르셔도 괜찮아요)</span>
      </label>

      <select
        id="mbti-select"
        value={value}
        onChange={(e) => {
          const v = e.target.value
          if (v === '__UNKNOWN__') { onChange(''); setGuide(true); return }
          onChange(v); setGuide(false)
        }}
        style={{
          width: '100%', padding: '13px 12px', fontSize: 14,
          borderRadius: 12, border: '1px solid rgba(120,53,15,0.15)',
          background: '#fff', color: value ? '#1e293b' : '#64748b',
          appearance: 'none', cursor: 'pointer',
          backgroundImage:
            'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\'><path d=\'M1 1l5 5 5-5\' stroke=\'%2394a3b8\' stroke-width=\'1.6\' fill=\'none\' stroke-linecap=\'round\'/></svg>")',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 14px center',
        }}
      >
        <option value="">선택해 주세요</option>
        <option value="__UNKNOWN__">잘 모름 / MBTI 검사하기</option>
        {MBTI_LIST.map(m => <option key={m} value={m}>{m}</option>)}
      </select>

      {guide && (
        <div
          role="status"
          style={{
            marginTop: 9, padding: '12px 13px', borderRadius: 12,
            background: '#faf7ff', border: `1px solid ${accent}33`,
            fontSize: 12, color: '#4a3b60', lineHeight: 1.65,
          }}
        >
          MBTI 를 모르셔도 리포트는 그대로 나옵니다. 사주로 추정한 결을 보여 드려요.
          <br />
          더 정확히 견주고 싶으시면 검사를 해 보시고 다시 골라 주세요.
          <div style={{ marginTop: 9, display: 'flex', gap: 7 }}>
            <a
              href={TEST_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1, textAlign: 'center', padding: '9px 10px', borderRadius: 10,
                background: accent, color: '#fff', fontSize: 12, fontWeight: 600,
                textDecoration: 'none',
              }}
            >무료 검사 하러 가기 ↗</a>
            <button
              onClick={() => setGuide(false)}
              style={{
                padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
                background: '#fff', border: '1px solid rgba(120,53,15,0.15)',
                fontSize: 12, color: '#64748b',
              }}
            >나중에</button>
          </div>
        </div>
      )}
    </div>
  )
}
