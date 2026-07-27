'use client'

/**
 * 진로적성 카드 한 장
 * ─────────────────────────────────────────────
 * 판정 부품(lib/saju/career/*)이 내놓는 CareerCard 를 그대로 받아 그린다.
 *
 * ★카드가 늘어나도 이 파일은 안 고쳐도 된다.
 *   모든 판정이 같은 모양(key·title·badge·lines·reasons·data)으로 나오기 때문이다.
 *
 * ⚠️ reasons 는 절대 그리지 않는다. AI 통변에게만 주는 재료다. (교훈 AV)
 *    궁합에서 "(순화해서 전할 것)" 같은 지시문이 화면과 복사본으로 샌 적이 있다.
 */

import type { CareerCard } from '@/lib/saju/career'

const CARD = '#FFFBF7'
const LINE = '#f0e0d5'
const ACCENT = '#785aaa'

/** 오행 막대 색 */
const EL_COLOR: Record<string, string> = {
  목: '#639922', 화: '#d85a30', 토: '#ba7517', 금: '#888780', 수: '#378add',
}

interface Props {
  card: CareerCard
  /** 오행 그래프를 그릴지 (카드① 에만 쓴다) */
  showGraph?: boolean
}

export default function CareerJudgeCard({ card, showGraph }: Props) {
  const data = card.data as Record<string, unknown> | undefined
  const grades = data?.grades as Record<string, { points: number; count: number; grade: string }> | undefined

  return (
    <div style={{
      background: CARD, border: `0.5px solid ${LINE}`, borderRadius: 14,
      padding: '16px 16px 14px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500, color: '#3a2e28' }}>{card.title}</div>
        {card.badge && (
          <span style={{
            fontSize: 11, background: '#efeaf7', color: ACCENT,
            padding: '2px 9px', borderRadius: 8, fontWeight: 500,
          }}>{card.badge}</span>
        )}
      </div>

      {showGraph && grades && (
        <div style={{ marginBottom: 12 }}>
          {(['목', '화', '토', '금', '수'] as const).map(el => {
            const g = grades[el]
            if (!g) return null
            const on = g.grade === '발달' || g.grade === '과다'
            return (
              <div key={el} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ width: 16, fontSize: 12, color: on ? '#3a2e28' : '#8a7063', fontWeight: on ? 500 : 400 }}>{el}</span>
                <div style={{ flex: 1, height: 7, background: '#f5ece5', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, g.points)}%`, height: '100%', background: EL_COLOR[el], borderRadius: 4 }} />
                </div>
                <span style={{ width: 62, fontSize: 11.5, color: on ? '#3a2e28' : '#8a7063', textAlign: 'right' }}>
                  {g.points}점 · {g.count}자
                </span>
              </div>
            )
          })}
        </div>
      )}

      {card.lines.map((l, i) => (
        <p key={i} style={{
          fontSize: 13, color: '#4a3a30', lineHeight: 1.75, margin: '0 0 6px',
        }}>{l}</p>
      ))}
    </div>
  )
}
