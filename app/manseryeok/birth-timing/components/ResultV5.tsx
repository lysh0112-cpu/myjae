'use client'
// app/manseryeok/birth-timing/components/ResultV5.tsx
//
// ★ 출산택일 v5 결과 화면 (설계안 §7 · 21-5 모달 사양)
//   15일 중 선발된 '좋은 날 3개'를 순위·별점으로. 점수·등급 숫자는 감춤(교훈 A).
//
//   [모달 사양] 한줄요약 + 별점3줄 + 원국표(SajuWonguk 재사용) + 일간공망
//              + 3문장 해설 + 오행분포 + 대운 흐름 + 사주보기 연결(결제 관문)

import { useState } from 'react'
import type { RecommendationV5 } from '../lib/recommendV5'
import { toStarLines } from '../lib/starMapV5'
import SajuWonguk from '@/app/manseryeok/result-new/SajuWonguk'
import { getGongmang } from '@/lib/saju/gongmang'

interface AiNote { oneLine: string; detail?: string }

const C = {
  bg: '#fbf6ef', card: '#fffdfa', cardGold: '#fffaf2',
  text: '#4a3728', sub: '#9b8574', gold: '#c8963e',
  line: '#f0e0d5', lineGold: '#f0d5b8', accent: '#96502e',
}

const GRADE_COLOR: Record<string, string> = {
  결핍: '#c85a5a', 약함: '#c8963e', 발달: '#5a9e6f', 과다: '#c85a5a',
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

// "연 월 일 시" 문자열 → SajuWonguk용 Pillar[](시→일→월→연)
function parseToWonguk(saju: string): { pillar: string; stem: string; branch: string }[] {
  const parts = saju.trim().split(/\s+/)
  if (parts.length < 4) return []
  const [yr, mo, dy, hr] = parts
  const mk = (g: string, name: string) => ({ pillar: name, stem: g[0] ?? '', branch: g[1] ?? '' })
  return [mk(hr, '시주'), mk(dy, '일주'), mk(mo, '월주'), mk(yr, '년주')]
}

function DayCard({ rec, note, onOpen }: { rec: RecommendationV5; note?: AiNote; onOpen: (r: RecommendationV5) => void }) {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 18 }}>{rankBadge(rec.rank)}</span>
          <div>
            <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{rec.dateLabel}</div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{rec.hourLabel}</div>
          </div>
        </div>
        <span style={{ fontSize: 12, color: C.gold }}>자세히 ›</span>
      </div>
      {note?.oneLine && (
        <div style={{ fontSize: 12, color: C.accent, lineHeight: 1.5, marginBottom: 10 }}>
          &ldquo;{note.oneLine}&rdquo;
        </div>
      )}
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

function DetailModal({
  rec, note, onClose, onViewSaju,
}: {
  rec: RecommendationV5
  note?: AiNote
  onClose: () => void
  onViewSaju?: (r: RecommendationV5) => void
}) {
  const stars = toStarLines(rec.breakdown, rec.dayunScore)
  const pillars = parseToWonguk(rec.saju)
  const dayStem = pillars.find(p => p.pillar === '일주')?.stem ?? ''
  const iljji = pillars.find(p => p.pillar === '일주')?.branch ?? ''
  const yeonjji = pillars.find(p => p.pillar === '년주')?.branch ?? ''
  const [gm1, gm2] = dayStem && iljji ? getGongmang(dayStem, iljji) : ['', '']
  const grade = rec.breakdown.elementGrade
  const els = ['목', '화', '토', '금', '수']

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(40,28,18,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.card, borderRadius: 16, padding: 20, maxWidth: 380, width: '100%', maxHeight: '86vh', overflow: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
              {rankBadge(rec.rank)} {rec.dateLabel}
            </div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{rec.hourLabel}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: C.sub, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {note?.oneLine && (
          <div style={{ fontSize: 13, color: C.accent, fontWeight: 600, lineHeight: 1.5, margin: '10px 0 14px' }}>
            &ldquo;{note.oneLine}&rdquo;
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
          {stars.map((s) => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: C.accent }}>{s.label}</span>
              <Stars n={s.stars} />
            </div>
          ))}
        </div>

        {pillars.length === 4 && (
          <div style={{ margin: '0 -4px 8px', overflowX: 'auto' }}>
            <SajuWonguk saju={pillars} dayStem={dayStem} yeonjji={yeonjji} iljji={iljji} gm1={gm1} gm2={gm2} />
          </div>
        )}

        {(gm1 || gm2) && (
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 14 }}>
            <span style={{ color: C.gold }}>일간 공망</span> · {gm1}{gm2 && `·${gm2}`}
          </div>
        )}

        {note?.detail && (
          <div style={{ background: C.cardGold, borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.gold, marginBottom: 5 }}>이 아이는</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{note.detail}</div>
          </div>
        )}

        {rec.dayunNote && (
          <div style={{ background: '#f2f6f8', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#5a8ba0', marginBottom: 5 }}>대운 흐름</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>🌊 {rec.dayunNote}</div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: C.gold, marginBottom: 6 }}>오행 분포</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {els.map((e) => (
              <div key={e} style={{ flex: 1, textAlign: 'center', background: '#faf5ee', borderRadius: 8, padding: '8px 0' }}>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{e}</div>
                <div style={{ fontSize: 10, color: GRADE_COLOR[grade[e]] ?? C.sub, marginTop: 2 }}>{grade[e]}</div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => onViewSaju?.(rec)}
          style={{ width: '100%', padding: 13, borderRadius: 11, border: 'none', background: C.gold, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}
        >
          이 아이 사주 자세히 보기
        </button>
        <button
          onClick={onClose}
          style={{ width: '100%', padding: 12, borderRadius: 11, border: `1px solid ${C.line}`, background: '#fff', color: C.sub, fontSize: 13, cursor: 'pointer' }}
        >
          닫기
        </button>
      </div>
    </div>
  )
}

export default function ResultV5({
  recommendations,
  aiNotes,
  onOpenDetail,
  onViewSaju,
}: {
  recommendations: RecommendationV5[]
  aiNotes?: Record<number, AiNote>
  onOpenDetail?: (r: RecommendationV5) => void
  onViewSaju?: (r: RecommendationV5) => void
}) {
  const [open, setOpen] = useState<RecommendationV5 | null>(null)
  const handleOpen = (r: RecommendationV5) => {
    if (onOpenDetail) onOpenDetail(r)
    setOpen(r)
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
        <DayCard key={r.dateKey} rec={r} note={aiNotes?.[r.rank]} onOpen={handleOpen} />
      ))}

      {open && (
        <DetailModal
          rec={open}
          note={aiNotes?.[open.rank]}
          onClose={() => setOpen(null)}
          onViewSaju={onViewSaju}
        />
      )}
    </div>
  )
}
