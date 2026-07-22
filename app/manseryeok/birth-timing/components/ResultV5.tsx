'use client'
// app/manseryeok/birth-timing/components/ResultV5.tsx
//
// ★ 출산택일 v5 결과 화면 (설계안 §7)
//   15일 중 선발된 '좋은 날 3개'를 순위·별점·날짜로 보여준다.
//   · 점수·등급 숫자는 감춤 (교훈 A). 별점 3줄(건강/성공/재물·명예)만.
//   · 종격 의심 → 점수 대신 전문가 상담 안내.
//   · 기존 화면 톤(따뜻한 크림) 유지. 상세 사주풀이는 사주보기로 이관.

import { useState } from 'react'
import type { RecommendationV5 } from '../lib/recommendV5'
import { toStarLines } from '../lib/starMapV5'

// 팔레트 (기존 birth-timing 톤 유지)
const C = {
  bg: '#fbf6ef', card: '#fffdfa', cardGold: '#fffaf2',
  text: '#4a3728', sub: '#9b8574', gold: '#c8963e',
  line: '#f0e0d5', lineGold: '#f0d5b8', accent: '#96502e',
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ letterSpacing: '1px', fontSize: '13px', color: C.gold }}>
      {'★'.repeat(n)}<span style={{ color: '#e6d5c4' }}>{'☆'.repeat(5 - n)}</span>
    </span>
  )
}

function rankBadge(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
}

function DayCard({ rec, onOpen }: { rec: RecommendationV5; onOpen: (r: RecommendationV5) => void }) {
  const stars = toStarLines(rec.breakdown, rec.dayunScore)
  const top = rec.rank === 1

  if (rec.needExpert) {
    return (
      <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.line}`, marginBottom: 10, padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>{rankBadge(rec.rank)}</span>
          <span style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{rec.dateLabel}</span>
        </div>
        <div style={{ fontSize: 12, color: C.accent, lineHeight: 1.6 }}>
          이 아기 사주는 특수한 구성이라, 정확한 건 전문가 상담을 권해요.
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => onOpen(rec)}
      style={{
        display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
        background: top ? C.cardGold : C.card,
        borderRadius: 12, border: `1px solid ${top ? C.lineGold : C.line}`,
        marginBottom: 10, padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 18 }}>{rankBadge(rec.rank)}</span>
          <div>
            <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{rec.dateLabel}</div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{rec.hourLabel}</div>
          </div>
        </div>
        <span style={{ fontSize: 12, color: C.gold }}>자세히 ›</span>
      </div>
      <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {stars.map((s) => (
          <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.accent }}>{s.label}</span>
            <Stars n={s.stars} />
          </div>
        ))}
      </div>
    </button>
  )
}

export default function ResultV5({
  recommendations,
  excludedWeekend,
  onOpenDetail,
}: {
  recommendations: RecommendationV5[]
  excludedWeekend?: number
  onOpenDetail?: (r: RecommendationV5) => void
}) {
  const [open, setOpen] = useState<RecommendationV5 | null>(null)
  const handleOpen = (r: RecommendationV5) => {
    if (onOpenDetail) onOpenDetail(r)
    else setOpen(r)
  }

  if (recommendations.length === 0) {
    return (
      <div style={{ background: C.bg, borderRadius: 12, padding: 20, textAlign: 'center', color: C.sub, fontSize: 13 }}>
        조건에 맞는 평일이 없어요. 예정일 범위를 넓혀 다시 시도해 주세요.
      </div>
    )
  }

  return (
    <div style={{ background: C.bg, borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 13, color: C.accent, fontWeight: 600, marginBottom: 4 }}>
        예정일 앞뒤 15일 중, 평일에서 고른 좋은 날이에요
      </div>
      <div style={{ fontSize: 11, color: C.sub, marginBottom: 14, lineHeight: 1.5 }}>
        타고난 사주(원국)를 봅니다. 인생의 운은 살면서 정해져요.
      </div>

      {recommendations.map((r) => (
        <DayCard key={r.dateKey} rec={r} onOpen={handleOpen} />
      ))}

      {open && (
        <div
          onClick={() => setOpen(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(40,28,18,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: 14, padding: 20, maxWidth: 360, width: '100%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 2 }}>{open.dateLabel}</div>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>{open.hourLabel}</div>
            <div style={{ fontSize: 13, color: C.accent, letterSpacing: 2, marginBottom: 14 }}>{open.saju}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {toStarLines(open.breakdown, open.dayunScore).map((s) => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: C.accent }}>{s.label}</span>
                  <Stars n={s.stars} />
                </div>
              ))}
            </div>
            {open.dayunNote && (
              <div style={{ background: C.cardGold, borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: C.gold, marginBottom: 3 }}>대운 흐름</div>
                <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>🌊 {open.dayunNote}</div>
              </div>
            )}
            <button
              onClick={() => setOpen(null)}
              style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: C.gold, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
