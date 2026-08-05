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
import { EL_CHART } from '@/lib/saju/ohaengColor'
import { LINE_OUTER } from '@/lib/ui/line'

const CARD = '#FFFBF7'
// ★2026-08-05 (47부 25차) — 옛 선 상수를 걷었습니다 ('#f0e0d5').
//   선은 lib/ui/line.ts 의 LINE_OUTER · LINE_INNER 에서 받습니다.
const ACCENT = '#785aaa'

/**
 * ★「근거 보기」를 손님께 보일 것인가 (44부 46차)
 *
 *  ⚠️ false 이면 접기 단추가 «아예 안 그려집니다».
 *     교재 원문의 판정 문장에 명리 술어와 단정하는 험한 말이 섞여 있어
 *     ★2026-08-03 대표님 지시로 감췄습니다.
 *  ★되살리시려면 이 한 줄을 true 로 두십시오. 지운 것은 하나도 없습니다.
 */
const SHOW_WHY = false

/**
 * 오행 막대 색 — 육친 막대도 같은 색을 쓴다.
 *
 * ★2026-08-01 — «오행도포표» 색으로 통일했습니다. (대표님 지시)
 *   전에는 이 파일이 자기 색을 갖고 있어 사주보기 도포표와 «달랐습니다» —
 *     목 #639922 · 화 #d85a30 · 토 #ba7517 · 금 #888780 · 수 #378add
 *   같은 오행인데 화면마다 색이 다르면 손님이 이어 보지 못합니다.
 *   ⚠️ 여기서 색을 정하지 마십시오. lib/saju/ohaengColor.ts 한 곳만 씁니다.
 */
const EL_COLOR = EL_CHART
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
      background: CARD, border: LINE_OUTER, borderRadius: 14,
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

      {/* ══════════════════════════════════════════════════════════
          🔴★2026-08-03 (44부 46차) — 「근거 보기」를 «감췄습니다». (대표님 지시)

          [까닭]  펼쳐 보이던 것은 ★교재 원문 그대로의 «판정 문장» 입니다.
            ⚠️ 명리 술어가 날것으로 나갑니다 — 식상 · 격국용신 · 활인업 · 현침살
            🔴 그보다 무거운 것은 ★«단정하는 험한 말» 입니다 —
               「독선적이고 융통성이 부족하며 자존심과 집착이 강해요」
               「남을 배려하는 마음이 부족하고 … 대인 관계가 매끄럽지 못한」
               「변덕이 있고 비밀을 발설하며 … 구설수가 따릅니다」
            ★14세 손님과 부모님이 «함께» 읽습니다.
            AI 풀이는 같은 내용을 「장점이 지나치면 단점으로 나타난다」로 다듬어 전합니다.
            ⇒ 다듬은 말이 이미 있는데 날것을 곁들일 까닭이 없습니다.

          ⚠️⚠️ 「지운」 것이 아니라 «감춘» 것입니다 —
             card.lines 도 openWhy 도 그대로 있습니다.
             ★되살리시려면 아래 SHOW_WHY 를 true 로 두십시오.
          ⚠️ 44부 3-3장에서 궁합 판정 카드를 끈 것과 «같은 결» 입니다.
             ⇒ 그때 배운 것 — 「한 곳만 끄면 «새어 나갑니다»」.
               ★여기는 화면 한 곳뿐이라, AI 재료(reasons)는 원래 따로입니다.
          ══════════════════════════════════════════════════════════ */}
      {SHOW_WHY && hasTong && card.lines.length > 0 && (
        <div style={{ marginTop: 10, borderTop: LINE_OUTER, paddingTop: 8 }}>
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
