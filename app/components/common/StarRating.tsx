'use client'

// app/components/common/StarRating.tsx
//
// ┌───────────────────────────────────────────────────────────────┐
// │  별점(★) — 서비스 «전체» 가 나눠 쓰는 단 하나의 부품              │
// └───────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 (43부 30차) — 대표님 지시
//    「별점은 서비스의 «핵심 데이터» 다. 공용 부품으로 분리하라」
//
//  🔴 [무엇이 있었나]
//    ① 별점을 그리는 코드가 PerspectiveAccordion «안» 에 숨어 있었습니다.
//       다른 화면에서 쓰려면 그 파일을 열어야 했고, 결국 «안 쓰게» 됩니다.
//    ② 작명 결과 화면은 stars={null} 을 넘기고 있었습니다.
//       ★API 가 별점을 «주고 있었는데» 화면이 그것을 버렸습니다.
//       → 공들여 만든 점수화가 화면에서 통째로 사라졌습니다.
//
//  ★[이제]  별점은 «여기서만» 그립니다.
//    요약 카드 · 아코디언 머리 · 앞으로 생길 어느 자리든 이 부품을 부릅니다.
//    ⚠️ 별 모양을 다른 곳에 «다시 그리지» 마십시오. 두 모양이 되면
//       손님은 같은 이름의 별점이 화면마다 다르다고 느끼십니다. (교훈 CJ)
//
//  ⚠️ 이 부품은 «판정하지 않습니다». 받은 별점을 그리기만 합니다.
//     점수 → 별점 환산은 lib/saju/starRating.ts 가 정본입니다.
// ══════════════════════════════════════════════════════════════════

import React from 'react'
import type { PerspectiveStar, StarResult } from '@/lib/saju/starRating'

export interface StarRatingProps {
  /** starRating.ts 가 낸 별점. ⚠️ 없으면(옛 기록) 아무것도 안 그립니다 */
  s?: PerspectiveStar | StarResult | null
  /** 별 하나의 크기(px) */
  size?: number
  /** 숫자(4.5)를 옆에 적을까 */
  showValue?: boolean
  /** 「매우 조화로움」 같은 말을 옆에 적을까 */
  showLabel?: boolean
}

const GOLD = '#c8783c'
const DIM = '#e0d5c8'

/**
 * ★별점을 그립니다.
 *
 * ⚠️ 반쪽 별은 «글자를 반만 덮어» 그립니다 —
 *    ★半 같은 글자를 쓰면 글꼴마다 다르게 보입니다.
 * ⚠️ 별점이 없으면 «빈 자리» 를 냅니다. 0점으로 그리면 «아주 나쁜 이름» 으로 보입니다.
 *    ★없는 것과 나쁜 것은 다릅니다. (교훈 EJ)
 */
export default function StarRating({
  s, size = 13, showValue = false, showLabel = false,
}: StarRatingProps) {
  if (!s) return null
  const star = typeof s.star === 'number' ? s.star : 0
  const full = Math.floor(star)
  const half = star - full >= 0.5

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
      <span style={{ display: 'inline-flex', gap: 1, lineHeight: 1 }} aria-label={`별점 ${star}점`}>
        {[0, 1, 2, 3, 4].map((i) => {
          if (i < full) {
            return <span key={i} style={{ fontSize: size, color: GOLD, lineHeight: 1 }}>★</span>
          }
          if (i === full && half) {
            // ★반쪽 — 빈 별 위에 «왼쪽 절반» 만 덮어 그립니다
            return (
              <span key={i} style={{ position: 'relative', display: 'inline-block', lineHeight: 1 }}>
                <span style={{ fontSize: size, color: DIM, lineHeight: 1 }}>★</span>
                <span style={{
                  position: 'absolute', left: 0, top: 0, width: '50%', overflow: 'hidden',
                  fontSize: size, color: GOLD, lineHeight: 1,
                }}>★</span>
              </span>
            )
          }
          return <span key={i} style={{ fontSize: size, color: DIM, lineHeight: 1 }}>★</span>
        })}
      </span>
      {showValue && (
        <span style={{ fontSize: Math.max(10, size - 2), color: GOLD, fontWeight: 700 }}>
          {star.toFixed(1)}
        </span>
      )}
      {showLabel && s.label && (
        <span style={{ fontSize: Math.max(10, size - 2), color: '#6B5B50' }}>{s.label}</span>
      )}
    </span>
  )
}
