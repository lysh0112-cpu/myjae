// app/manseryeok/couple-result-new/components/OhaengCompareCard.tsx
// ============================================================================
// 궁합 시각화 부품 — "타고난 오행으로 본 우리의 차이"
//   두 사람 오행을 좌우 마주보는 막대로 그리고, 닮음도·보완도를 수치로 표시.
//   계산은 lib/saju/ohaengCompare.ts, 오행 색은 lib/saju/ohaengColor.ts(연재쌤 지정).
//
// 부부·연인 궁합 어디서든 재사용. props 로 두 사람 오행 점수만 넘기면 된다.
// ============================================================================
'use client'

import { useState } from 'react'
import { compareOhaeng, OHAENG_ORDER, type Ohaeng } from '@/lib/saju/ohaengCompare'
import { EL_BG } from '@/lib/saju/ohaengColor'

const EL_LABEL: Record<Ohaeng, string> = {
  목: '목 나무', 화: '화 불', 토: '토 흙', 금: '금 쇠', 수: '수 물',
}
// 막대 색은 연재쌤 지정 EL_BG. 단 라벨 글씨는 흰 배경에서 안 보이는 금·밝은 토를
// 살짝 어둡게 조정한 '글씨용' 색을 따로 둔다(막대 자체는 지정색 그대로).
const EL_TEXT: Record<Ohaeng, string> = {
  목: '#2e7d32', 화: '#c62828', 토: '#b8801a', 금: '#8a8a8a', 수: '#2b2b2b',
}

interface Props {
  /** A(남편/첫 번째) 오행 점수 { 목,화,토,금,수 } */
  aScores: Record<string, number>
  /** B(아내/두 번째) 오행 점수 */
  bScores: Record<string, number>
  /** 좌·우 라벨 (기본: 남편/아내) */
  aLabel?: string
  bLabel?: string
  /** 해설 문구 (없으면 자동 생성) */
  comment?: string
}

export default function OhaengCompareCard({
  aScores, bScores, aLabel = '남편', bLabel = '아내', comment,
}: Props) {
  const [open, setOpen] = useState(true)   // 기본 펼침. 제목 누르면 접힘
  const r = compareOhaeng(aScores, bScores)
  // 막대 길이 정규화: 두 사람 통틀어 가장 큰 값을 100%로
  const maxVal = Math.max(1, ...r.rows.flatMap(row => [row.a, row.b]))
  const pct = (v: number) => `${Math.round((v / maxVal) * 100)}%`

  const autoComment =
    r.leaning === 'similar'
      ? `${EL_LABEL[r.mostSimilar].split(' ')[1]}의 기운으로 깊이 통하는, 결이 비슷한 두 분이에요. 서로 닮아 편안하면서도, 다른 자리는 살며시 채워주는 사이예요.`
      : `서로 없는 기운을 채워주는 두 분이에요. ${aLabel}과 ${bLabel}이 각자 가진 기운으로 상대의 부족한 자리를 메워, 함께라서 더 단단해지는 사이예요.`

  return (
    <div style={{ background: '#FDF6F0', borderRadius: 16, padding: '18px 15px' }}>
      {/* 제목 = 접기/펴기 헤더 */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', marginBottom: open ? 16 : 0, WebkitTapHighlightColor: 'transparent', WebkitUserSelect: 'none', userSelect: 'none' }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: '#96502e' }}>
          타고난 오행으로 본 우리의 차이
        </span>
        <span style={{ fontSize: 11, color: '#c0a898', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </div>

      {open && (<>

      {/* 닮음·보완 수치 + 게이지 (한 줄) */}
      <div style={{ display: 'flex', gap: 9, marginBottom: 16 }}>
        <ScoreCard label="🫧 닮은 정도" value={r.similarity} track="#eaf1fa" fill="#378ADD" />
        <ScoreCard label="🤝 채워주는 정도" value={r.complement} track="#fbeaf0" fill="#d4537e" />
      </div>

      {/* 좌우 방향 표시 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, margin: '0 4px 10px' }}>
        <span style={{ color: '#8a6a52' }}>◀ {aLabel}</span>
        <span style={{ color: '#c0a898' }}>오행</span>
        <span style={{ color: '#8a6a52' }}>{bLabel} ▶</span>
      </div>

      {/* 오행별 좌우 막대 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {OHAENG_ORDER.map(el => {
          const row = r.rows.find(x => x.el === el)!
          const isGeum = el === '금'  // 흰색이라 테두리로 드러냄
          const barStyle = (side: 'l' | 'r') => ({
            display: 'block' as const,
            width: side === 'l' ? pct(row.a) : pct(row.b),
            height: 15,
            background: EL_BG[el],
            border: isGeum ? '0.5px solid #c8c8c8' : 'none',
            borderRadius: side === 'l' ? '3px 0 0 3px' : '0 3px 3px 0',
          })
          return (
            <div key={el} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <span style={barStyle('l')} />
              </div>
              <span style={{ width: 42, textAlign: 'center', fontSize: 11, color: EL_TEXT[el], fontWeight: 500, flexShrink: 0 }}>
                {EL_LABEL[el]}
              </span>
              <div style={{ flex: 1 }}>
                <span style={barStyle('r')} />
              </div>
            </div>
          )
        })}
      </div>

      {/* 해설 */}
      <div style={{ marginTop: 16, background: '#fdf3e9', borderRadius: 10, padding: '12px 13px', fontSize: 11.5, color: '#7a5638', lineHeight: 1.65 }}>
        {comment ?? autoComment}
      </div>

      </>)}
    </div>
  )
}

function ScoreCard({ label, value, track, fill }: { label: string; value: number; track: string; fill: string }) {
  return (
    <div style={{ flex: 1, background: '#fff', border: '0.5px solid #f0e0d5', borderRadius: 11, padding: '11px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: 11.5, color: '#96502e' }}>{label}</span>
        <span style={{ fontSize: 17, fontWeight: 500, color: fill }}>{value}%</span>
      </div>
      <div style={{ height: 7, background: track, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: fill }} />
      </div>
    </div>
  )
}
