'use client'

/**
 * 진로적성 카드 한 장
 * ─────────────────────────────────────────────
 * 판정 부품(lib/saju/career/*)이 내놓는 CareerCard 를 그대로 받아 그린다.
 *
 * ★카드가 늘어나도 이 파일은 안 고쳐도 된다.
 *   모든 판정이 같은 모양(key·title·badge·lines·reasons·data)으로 나오기 때문이다.
 *
 * ★막대그래프는 두 카드에만 붙는다.
 *     ohaeng_gijil — 오행 이름으로 (목·화·토·금·수)
 *     yukchin      — 육친 이름으로 (비겁·식상·재성·관성·인성)
 *   숫자는 한 벌이고 부르는 이름만 다르다. 색을 오행 색으로 통일해
 *   "아, 같은 것을 다르게 부르는구나"가 눈에 보이게 했다.
 *
 * ⚠️ reasons 는 절대 그리지 않는다. AI 통변에게만 주는 재료다. (교훈 AV)
 *    궁합에서 "(순화해서 전할 것)" 같은 지시문이 화면과 복사본으로 샌 적이 있다.
 */

import { useState } from 'react'
import type { CareerCard } from '@/lib/saju/career'

const CARD = '#FFFBF7'
const LINE = '#f0e0d5'
const ACCENT = '#785aaa'

/** 오행 막대 색 — 육친 막대도 같은 색을 쓴다 */
const EL_COLOR: Record<string, string> = {
  목: '#639922', 화: '#d85a30', 토: '#ba7517', 금: '#888780', 수: '#378add',
}
const EL_ORDER = ['목', '화', '토', '금', '수'] as const
const YUK_ORDER = ['비겁', '식상', '재성', '관성', '인성'] as const

/** 등급 뱃지 색 */
const GRADE_STYLE: Record<string, { bg: string; fg: string }> = {
  과다: { bg: '#f7e6ee', fg: '#993556' },
  발달: { bg: '#efeaf7', fg: '#5a4a86' },
  결핍: { bg: '#f0eeea', fg: '#7a6f63' },
}

interface Bar {
  label: string
  el: string
  points: number
  count: number
  grade: string
}

interface Props {
  card: CareerCard
  /** 이 대목의 AI 풀이. 있으면 판정 문장은 접어 둔다. */
  tong?: string
}

function barsOf(card: CareerCard): Bar[] | null {
  const d = card.data as Record<string, unknown> | undefined
  if (!d) return null

  if (card.key === 'ohaeng_gijil') {
    const g = d.grades as Record<string, { points: number; count: number; grade: string }> | undefined
    if (!g) return null
    return EL_ORDER.map(el => ({
      label: el, el, points: g[el]?.points ?? 0,
      count: g[el]?.count ?? 0, grade: g[el]?.grade ?? '',
    }))
  }

  if (card.key === 'yukchin') {
    const rows = d.rows as Array<{ group: string; el: string; points: number; count: number; grade: string }> | undefined
    if (!rows) return null
    return YUK_ORDER.map(gr => {
      const r = rows.find(x => x.group === gr)
      return {
        label: gr, el: r?.el ?? '목', points: r?.points ?? 0,
        count: r?.count ?? 0, grade: r?.grade ?? '',
      }
    })
  }
  return null
}

export default function CareerJudgeCard({ card, tong }: Props) {
  const bars = barsOf(card)
  const [openWhy, setOpenWhy] = useState(false)
  const hasTong = !!(tong && tong.trim())

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

      {bars && (
        <div style={{ marginBottom: 12 }}>
          {bars.map(b => {
            const on = b.grade === '발달' || b.grade === '과다'
            const gs = GRADE_STYLE[b.grade]
            return (
              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <span style={{
                  width: card.key === 'yukchin' ? 30 : 15, flexShrink: 0,
                  fontSize: 11.5, color: on ? '#3a2e28' : '#9c8a7c', fontWeight: on ? 500 : 400,
                }}>{b.label}</span>
                {card.key === 'yukchin' && (
                  <span style={{ width: 12, flexShrink: 0, fontSize: 10.5, color: '#b0a094' }}>{b.el}</span>
                )}
                <div style={{ flex: 1, height: 7, background: '#f5ece5', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, b.points)}%`, height: '100%',
                    background: EL_COLOR[b.el] || '#b0a094', borderRadius: 4,
                    opacity: on ? 1 : 0.45,
                  }} />
                </div>
                <span style={{
                  width: 52, flexShrink: 0, fontSize: 11, textAlign: 'right',
                  color: on ? '#3a2e28' : '#9c8a7c',
                }}>{b.points}점·{b.count}자</span>
                <span style={{
                  width: 26, flexShrink: 0, fontSize: 10, textAlign: 'center',
                  borderRadius: 5, padding: '1px 0',
                  background: gs ? gs.bg : 'transparent', color: gs ? gs.fg : 'transparent',
                }}>{gs ? b.grade : ''}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* ★풀이가 있으면 풀이를 본문으로 삼고, 판정 문장은 「근거 보기」로 접는다.
          같은 내용이 두 번 나오지 않게 하되, 근거는 언제든 펼쳐 볼 수 있다.
          (궁합은 판정 문장을 아예 껐지만, 진로적성은 "왜 그런지"가 값어치라 남긴다) */}
      {hasTong && (
        <p style={{ fontSize: 13.5, color: '#3a2e28', lineHeight: 1.85, margin: '0 0 4px', whiteSpace: 'pre-wrap' }}>
          {tong!.trim()}
        </p>
      )}

      {!hasTong && card.lines.map((l, i) => (
        <p key={i} style={{ fontSize: 13, color: '#4a3a30', lineHeight: 1.75, margin: '0 0 6px' }}>{l}</p>
      ))}

      {hasTong && card.lines.length > 0 && (
        <div style={{ marginTop: 10, borderTop: `0.5px solid ${LINE}`, paddingTop: 8 }}>
          <button onClick={() => setOpenWhy(o => !o)}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: ACCENT, fontSize: 12, fontFamily: 'inherit',
            }}>
            {openWhy ? '근거 접기' : '근거 보기'}
          </button>
          {openWhy && (
            <div style={{ marginTop: 7 }}>
              {card.lines.map((l, i) => (
                <p key={i} style={{ fontSize: 12.5, color: '#7a6858', lineHeight: 1.7, margin: '0 0 5px' }}>{l}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
