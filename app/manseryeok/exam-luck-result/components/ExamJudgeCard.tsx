'use client'

/**
 * 합격운 카드 한 장
 * ─────────────────────────────────────────────
 * 판정 부품(lib/saju/examLuck/*)이 내놓는 ExamCard 를 그대로 받아 그린다.
 * ★진로적성 CareerJudgeCard 를 그대로 본떴다. 새로 설계하지 않는다. (작업지시 2장)
 *
 * ⚠️ reasons 는 절대 그리지 않는다. AI 통변에게만 주는 재료다. (교훈 AV)
 *
 * ★등급 배지는 겁주지 않는 결로 (작업지시 8장)
 *   '많이 조심' 도 붉게 칠하지 않는다. 흐린 자두빛까지만 간다.
 */

import { useState } from 'react'
import type { ExamCard, Grade } from '@/lib/saju/examLuck/types'

const CARD = '#FFFBF7'
const LINE = '#f0e0d5'
const ACCENT = '#c85a8c'

/** 다섯 칸 등급 색 — 좋은 쪽은 따뜻하게, 살필 쪽은 차분하게 */
export const GRADE_STYLE: Record<Grade, { bg: string; fg: string }> = {
  '아주 좋음': { bg: '#e9f2ea', fg: '#3b6d3b' },
  '좋음': { bg: '#eef3ea', fg: '#5a7a45' },
  '보통': { bg: '#f4efe8', fg: '#7a6858' },
  '조심': { bg: '#f7f0e6', fg: '#8a6a3c' },
  '많이 조심': { bg: '#f7eef1', fg: '#8c4a63' },
}

interface Props {
  card: ExamCard
  /** 그 카드에 붙는 AI 통변. 없으면 판정 문장을 본문으로 쓴다. */
  tong?: string
}

export default function ExamJudgeCard({ card, tong }: Props) {
  const [openWhy, setOpenWhy] = useState(false)
  const hasTong = !!(tong && tong.trim())

  return (
    <div style={{
      background: CARD, border: `0.5px solid ${LINE}`, borderRadius: 14,
      padding: '16px 16px 14px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 14.5, fontWeight: 500, color: '#3a2e28' }}>{card.title}</div>
        {card.badge && (
          <span style={{
            fontSize: 11, background: '#f7e6ee', color: ACCENT,
            padding: '2px 9px', borderRadius: 8, fontWeight: 500,
          }}>{card.badge}</span>
        )}
      </div>

      {/* 풀이가 있으면 풀이를 본문으로, 판정 문장은 「근거 보기」로 접는다 */}
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
