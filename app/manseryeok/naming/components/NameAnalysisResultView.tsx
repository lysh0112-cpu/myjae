'use client'

// app/manseryeok/naming/components/NameAnalysisResultView.tsx
//
// ┌───────────────────────────────────────────────────────────────┐
// │  이름 결과 «공용 프레임» — 감정과 작명이 «같은 화면» 을 씁니다      │
// └───────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 (Phase 1-C) — 대표님 지시
//
//  [무엇이 문제였나]
//    감정(diagnosis)과 작명(rename/newresult)이 «각자» 결과를 그렸습니다.
//
//    🔴 그러다 작명 쪽이 «옛 통변 구조» 에 멈춰 있었습니다 —
//       newresult 는 commentary.summary / good / improve / advice 를 읽는데
//       /api/naming 은 5관점(yinyang·baleum·suri·jawon·yongsin·conclusion)을 줍니다.
//       ★조건이 «늘 거짓» 이라 손님은 통변을 불러도 «불러오기 버튼» 만 봤습니다.
//
//    ⚠️ 같은 값을 두 곳에서 그리면 «언젠가 갈립니다». 한쪽만 고치면 그 순간 갈립니다.
//       (교훈 ET — 39부에 개명 화면과 서버가 갈려 손님이 두 답을 본 적이 있습니다)
//
//  [그래서]
//    ★프레임을 «하나» 로 두고 두 화면이 가져다 씁니다.
//    작명은 위에 배지 한 줄과 [다른 추천 한자 보기] 만 더 얹습니다.
//
//  ⚠️ 색은 lib/saju/ohaengColor.ts 한 곳만 씁니다. 여기서 오행 색을 지어내지 마십시오.
// ══════════════════════════════════════════════════════════════════

import React from 'react'
import NamingSajuSummary from '@/app/manseryeok/naming/diagnosis/components/NamingSajuSummary'
import NamingAptitude from '@/app/manseryeok/naming/diagnosis/components/NamingAptitude'
import PerspectiveAccordion, { type PerspectiveCommentary } from '@/app/manseryeok/components/PerspectiveAccordion'
import type { StarResult, PerspectiveStar } from '@/lib/saju/starRating'
import type { Ohaeng } from '@/lib/saju/ohaeng'

/** 등급 색 — ⚠️ 새 색표를 만들지 않습니다. 이 화면 안 세 값뿐입니다 */
function gradeTone(g: string): string {
  if (g === '좋음') return '#4a9450'
  if (g === '아쉬움') return '#c8783c'
  return '#5c3a1e'
}

const GOLD = '#c8783c'
const CARD = '#FFFBF7'
const LINE = '#f0e0d5'

/** 눌림 모션 — 화면끼리 손맛을 맞춥니다 */
const PRESS = { transition: 'all .12s cubic-bezier(.4,0,.2,1)' } as const

interface Pillar { pillar: string; stem: string; branch: string }

/** 작명일 때 이름 위에 붙는 배지 */
export interface NameResultBadge {
  /** [개명] · [신생아] */
  /**
     * 배지에 쓸 말. ★2026-08-01 (43부 7차) — «관계» 도 옵니다 (손주·자녀 …).
     * ⚠️ 아무 말이나 넣지 마십시오 — 사람 고르기 화면이 쓰는 관계 이름만 넣습니다.
     */
    kind?: string
  /** 몇 순위로 뽑힌 이름인가 */
  rank?: number
  /** 종합 적합도 0~100 — ★화면에만 숫자로 보입니다 */
  score?: number
}

export interface NameAnalysisResultViewProps {
  hanjaName: string
  hangulName: string
  /** 작명이면 배지, 감정이면 비워 두십시오 */
  badge?: NameResultBadge
  /** 이름 아래 한 줄 (예: 「내 아이를 위한 추천 이름」) */
  subtitle?: string
  /**
   * ★이름 바로 아래 붙는 «네 기준 요약» (2026-08-01 · 43부 20차)
   *
   *  🔴 [왜 여기로 왔나]  전에는 작명 결과 화면 «위쪽» 에 따로 있었습니다.
   *     그래서 한 화면에 같은 이름이 두 번, 사주 요약도 두 번 나왔습니다.
   *     ★배지·이름·요약이 «한 덩이» 여야 손님이 헷갈리지 않습니다.
   *  ⚠️ 감정(내 이름 정밀분석)은 이 값을 «주지 않습니다» — 거기는 예전 그대로입니다.
   */
  summaryRows?: { label: string; grade: string }[]
  /** 요약 맨 아래 «종합» 한 줄. summaryRows 와 함께 옵니다 */
  summaryOverall?: string

  saju: Pillar[]
  solarYear: number
  solarMonth: number
  solarDay: number
  dayStem: string

  /** 5관점 통변. 없으면 아코디언을 안 그립니다 */
  commentary: PerspectiveCommentary | null
  stars: PerspectiveStar[] | null
  overallStar: StarResult | null

  yongsin: Ohaeng | null
  heeksin?: Ohaeng | null
  gisin?: Ohaeng | null
  /** 상단 칩 「이름에 담을 기운」 */
  fillElements?: Ohaeng[]
  /** 「상세 진로·적성 분석 보러가기」 */
  careerHref: string

  /** 작명일 때 — [다른 추천 한자 보기] */
  onOtherHanja?: () => void
  otherHanjaLabel?: string
  /** 아래에 더 붙일 것 (저장 표시·상담 버튼 등) */
  children?: React.ReactNode
}

export default function NameAnalysisResultView(p: NameAnalysisResultViewProps) {
  const hourBranch = p.saju.find((x) => x.pillar === '시주')?.branch ?? null
  const ready = p.saju.length > 0 && !!p.dayStem && p.dayStem !== '?'

  return (
    <>
      {/* ── 이름 ── */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        {/* ★작명 배지 — 감정에는 안 나옵니다 */}
        {p.badge && (p.badge.kind || p.badge.rank != null) && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 9, flexWrap: 'wrap',
          }}>
            {p.badge.kind && (
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#fff',
                // ★2026-08-01 (43부 7차) — 「손주·자녀」 같은 관계도 옵니다.
                //   ⚠️ 개명만 갈색이고 «나머지는 모두» 아기 쪽 초록입니다.
                background: p.badge.kind === '개명' ? '#8f3d0e' : '#4a7c59',
                padding: '4px 11px', borderRadius: 12,
              }}>
                {p.badge.kind} 작명
              </span>
            )}
            {p.badge.rank != null && (
              <span style={{
                fontSize: 11, fontWeight: 600, color: GOLD,
                background: '#fff', border: `1px solid ${LINE}`,
                padding: '4px 11px', borderRadius: 12,
              }}>
                추천 {p.badge.rank}순위
                {/* ⚠️ 숫자 점수는 «여기» 에만 보입니다. AI 문장에는 점수를 쓰지 않습니다 */}
                {p.badge.score != null && ` · ${Math.round(p.badge.score)}점`}
              </span>
            )}
          </div>
        )}

        <div style={{ fontSize: 34, fontWeight: 700, color: GOLD, letterSpacing: 4 }}>
          {p.hanjaName}
        </div>
        <div style={{ fontSize: 14, color: '#1a1a1a', marginTop: 4 }}>
          {p.hangulName}{p.subtitle ? ` · ${p.subtitle}` : ''}
        </div>

        {/* ★네 기준 요약 — 배지·이름 바로 아래에 «이어» 둡니다 (43부 20차) */}
        {p.summaryRows && p.summaryRows.length > 0 && (
          <div style={{
            marginTop: 14, textAlign: 'left',
            background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: '14px 16px',
          }}>
            {p.summaryRows.map((row, i) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 0',
                borderBottom: i === p.summaryRows!.length - 1 ? 'none' : `1px solid ${LINE}`,
              }}>
                <span style={{ fontSize: 13, color: '#2E2622' }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: gradeTone(row.grade) }}>{row.grade}</span>
              </div>
            ))}
            {p.summaryOverall && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${LINE}`, textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: '#6B5B50' }}>종합 </span>
                <span style={{ fontSize: 20, fontWeight: 700, color: gradeTone(p.summaryOverall) }}>
                  {p.summaryOverall}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ① 내 사주 한눈에 (펼친 채) ── */}
      {ready && (
        <NamingSajuSummary
          saju={p.saju}
          solarYear={p.solarYear}
          solarMonth={p.solarMonth}
          solarDay={p.solarDay}
          hourBranch={hourBranch}
          dayStem={p.dayStem}
          fillElements={p.fillElements}
        />
      )}

      {/* ── ② 다섯 관점 아코디언 ── */}
      {p.commentary && (
        <PerspectiveAccordion
          commentary={p.commentary}
          stars={p.stars}
          overallStar={p.overallStar}
        />
      )}

      {/* ── ③ 이름에 담을 기운 · 六 명리적성 (六 은 접힌 채) ── */}
      {ready && (
        <NamingAptitude
          saju={p.saju}
          solarYear={p.solarYear}
          solarMonth={p.solarMonth}
          solarDay={p.solarDay}
          hourBranch={hourBranch}
          dayStem={p.dayStem}
          yongsin={p.yongsin}
          heeksin={p.heeksin}
          gisin={p.gisin}
          careerHref={p.careerHref}
        />
      )}

      {/* ── ④ 작명일 때 — 다른 한자로 바꿔 보기 ── */}
      {p.onOtherHanja && (
        <button
          onClick={p.onOtherHanja}
          style={{
            ...PRESS,
            width: '100%', padding: 13, borderRadius: 12, marginBottom: 12,
            background: CARD, border: `1px solid ${GOLD}`, color: GOLD,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
          {p.otherHanjaLabel ?? '다른 추천 한자 보기'} →
        </button>
      )}

      {p.children}
    </>
  )
}
