// app/manseryeok/couple-result-new/components/MbtiCompareCard.tsx
// ============================================================================
// 연인 궁합 MBTI 카드 — 네 축(에너지·인식·판단·생활)의 어울림을 보여준다.
//   계산·문구는 lib/saju/mbtiCompareView.ts. 점수 숫자 없이 "잘 맞아요" 등급 말로.
//   오행 카드(OhaengCompareCard)와 같은 톤. CoupleInsightToggle 안에서 쓰인다.
// ============================================================================
'use client'

import { buildMbtiCompareView } from '@/lib/saju/mbtiCompareView'

interface Props {
  mbti1: string
  mbti2: string
  name1?: string
  name2?: string
}

export default function MbtiCompareCard({ mbti1, mbti2, name1 = '', name2 = '' }: Props) {
  const v = buildMbtiCompareView(mbti1, mbti2)
  if (!v.hasMbti) {
    return (
      <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 12, color: '#b09680' }}>
        두 분의 MBTI를 입력하면 성격 궁합도 볼 수 있어요.
      </div>
    )
  }

  return (
    <div>
      {/* 두 사람 MBTI */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#378ADD', letterSpacing: 1 }}>{v.mbti1}</div>
          {name1 && <div style={{ fontSize: 10.5, color: '#b4785a', marginTop: 1 }}>{name1}</div>}
        </div>
        <span style={{ color: '#d4537e', fontSize: 14 }}>♥</span>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#d4537e', letterSpacing: 1 }}>{v.mbti2}</div>
          {name2 && <div style={{ fontSize: 10.5, color: '#b4785a', marginTop: 1 }}>{name2}</div>}
        </div>
      </div>

      {/* 네 축 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {v.axes.map((ax, i) => (
          <div key={i} style={{ background: '#fff', border: '0.5px solid #f0e0d5', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: '#96502e' }}>
                {ax.label}
                {ax.note && <span style={{ color: '#c0a898' }}> ({ax.note})</span>}
              </span>
              <span style={{ fontSize: 10, color: ax.gradeColor, background: ax.gradeColor + '18', padding: '1px 8px', borderRadius: 20 }}>
                {ax.grade}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: '#6b5340', lineHeight: 1.5 }}>{ax.desc}</div>
          </div>
        ))}
      </div>

      {/* 종합 */}
      <div style={{ marginTop: 14, background: '#fdf3e9', borderRadius: 10, padding: '12px 13px', fontSize: 11.5, color: '#7a5638', lineHeight: 1.65 }}>
        {v.summary}
      </div>
    </div>
  )
}
