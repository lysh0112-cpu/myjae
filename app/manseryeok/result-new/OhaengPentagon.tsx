'use client'

import React from 'react'

/**
 * 오행 오각형 상생상극 그래프 (명카페 / result-new)
 *
 * Gemini 시안과 동일 스타일:
 *  - 원 아래 반원을 오행 색으로 채워 비율 표현
 *  - 이웃한 두 원 테두리끼리 잇는 짧은 파란 곡선 화살표(生)
 *  - 별 모양(한 칸 건너뛰기) 빨간 직선 화살표(剋) + 중앙 剋
 *
 * 사용 예:
 *   <OhaengPentagon
 *     ilgan="임수"
 *     data={{ 목:25, 화:12.5, 토:37.5, 금:0, 수:25 }}
 *     sipsin={{ 목:'식상', 화:'재성', 토:'관성', 금:'인성', 수:'비겁' }}
 *   />
 *
 * data 미지정 시 아래 SAMPLE로 표시됩니다.
 */

type Element = '목' | '화' | '토' | '금' | '수'

interface Props {
  ilgan?: string
  data?: Record<Element, number>
  sipsin?: Record<Element, string>
}

const FILL: Record<Element, string> = {
  목: '#87cefa',
  화: '#f4a6b0',
  토: '#f5d76e',
  금: '#cccccc',
  수: '#b0aeb8',
}

const SAMPLE_DATA: Record<Element, number> = { 목: 25, 화: 12.5, 토: 37.5, 금: 0, 수: 25 }
const SAMPLE_SIPSIN: Record<Element, string> = { 목: '식상', 화: '재성', 토: '관성', 금: '인성', 수: '비겁' }

// viewBox 680 x 640 기준 오각형 꼭짓점 (수 위 → 시계방향)
const R = 78
const NODE: Record<Element, { cx: number; cy: number }> = {
  수: { cx: 340, cy: 150 },
  목: { cx: 548, cy: 300 },
  화: { cx: 468, cy: 520 },
  토: { cx: 212, cy: 520 },
  금: { cx: 132, cy: 300 },
}

const CENTER = { x: 340, y: 350 }

// 상생 순환 순서 (시계방향)
const SAENG_ORDER: Element[] = ['수', '목', '화', '토', '금']
// 상극 (한 칸 건너뛰기): 수→화, 목→토, 화→금, 토→수, 금→목
const GUK_PAIRS: [Element, Element][] = [
  ['수', '화'], ['목', '토'], ['화', '금'], ['토', '수'], ['금', '목'],
]

function edgePoint(from: Element, to: Element, gap = 6) {
  const a = NODE[from], b = NODE[to]
  const dx = b.cx - a.cx, dy = b.cy - a.cy
  const d = Math.hypot(dx, dy)
  const ux = dx / d, uy = dy / d
  return {
    sx: a.cx + ux * (R + gap), sy: a.cy + uy * (R + gap),
    ex: b.cx - ux * (R + gap), ey: b.cy - uy * (R + gap),
  }
}

// 살짝 바깥으로 휜 곡선 path
function arcPath(sx: number, sy: number, ex: number, ey: number, bow = 24) {
  const mx = (sx + ex) / 2, my = (sy + ey) / 2
  const dx = ex - sx, dy = ey - sy
  const len = Math.hypot(dx, dy) || 1
  let nx = -dy / len, ny = dx / len
  // 중심에서 먼 쪽(바깥)으로 제어점을 밀기
  if ((mx + nx - CENTER.x) ** 2 + (my + ny - CENTER.y) ** 2 <
      (mx - CENTER.x) ** 2 + (my - CENTER.y) ** 2) {
    nx = -nx; ny = -ny
  }
  const cx = mx + nx * bow, cy = my + ny * bow
  return `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`
}

export default function OhaengPentagon({
  ilgan = '임수',
  data = SAMPLE_DATA,
  sipsin = SAMPLE_SIPSIN,
}: Props) {
  return (
    <svg width="100%" viewBox="0 0 680 640" role="img" xmlns="http://www.w3.org/2000/svg"
         style={{ display: 'block', maxWidth: 480, margin: '0 auto', background: '#FDFBF7' }}>
      <title>오행 오각형 상생상극 그래프</title>
      <desc>오행 비율과 상생(生)·상극(剋)을 표현한 오각형 그래프</desc>

      <defs>
        <marker id="oh-blue" viewBox="0 0 10 10" refX="8" refY="5"
                markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="#2f7fe0"
                strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id="oh-red" viewBox="0 0 10 10" refX="8" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="#e05353"
                strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        {SAENG_ORDER.map((el) => (
          <clipPath key={`clip-${el}`} id={`clip-${el}`}>
            <circle cx={NODE[el].cx} cy={NODE[el].cy} r={R} />
          </clipPath>
        ))}
      </defs>

      {/* 제목 */}
      <text x="28" y="40" style={{ fontSize: 17, fontWeight: 700, fill: '#2b2b2b' }}>
        나의 오행: {ilgan}
      </text>

      {/* 범례 */}
      <g>
        <line x1="30" y1="66" x2="54" y2="66" stroke="#2f7fe0" strokeWidth="2" markerEnd="url(#oh-blue)" />
        <text x="62" y="70" style={{ fontSize: 13, fill: '#666' }}>생(生)</text>
        <line x1="30" y1="90" x2="54" y2="90" stroke="#e05353" strokeWidth="2" markerEnd="url(#oh-red)" />
        <text x="62" y="94" style={{ fontSize: 13, fill: '#666' }}>극(剋)</text>
      </g>

      {/* 상극(剋) — 별 모양 빨간 직선 화살표 */}
      {GUK_PAIRS.map(([from, to], i) => {
        const { sx, sy, ex, ey } = edgePoint(from, to)
        return (
          <line key={`guk-${i}`} x1={sx} y1={sy} x2={ex} y2={ey}
                stroke="#e05353" strokeWidth="1.8" opacity="0.9"
                markerEnd="url(#oh-red)" />
        )
      })}
      <text x="340" y="360" textAnchor="middle"
            style={{ fontSize: 26, fontWeight: 700, fill: '#e05353' }}>剋</text>

      {/* 상생(生) — 이웃 원 테두리끼리 잇는 짧은 파란 곡선 화살표 */}
      {SAENG_ORDER.map((from, i) => {
        const to = SAENG_ORDER[(i + 1) % 5]
        const { sx, sy, ex, ey } = edgePoint(from, to)
        const d = arcPath(sx, sy, ex, ey)
        const mx = (sx + ex) / 2, my = (sy + ey) / 2
        const ox = mx - CENTER.x, oy = my - CENTER.y
        const ol = Math.hypot(ox, oy) || 1
        const gx = mx + (ox / ol) * 44
        const gy = my + (oy / ol) * 44
        return (
          <g key={`saeng-${i}`}>
            <path d={d} fill="none" stroke="#2f7fe0" strokeWidth="2.4"
                  markerEnd="url(#oh-blue)" />
            <text x={gx} y={gy} textAnchor="middle" dominantBaseline="central"
                  style={{ fontSize: 17, fontWeight: 700, fill: '#2f7fe0' }}>生</text>
          </g>
        )
      })}

      {/* 오행 원 5개 */}
      {SAENG_ORDER.map((el) => {
        const { cx, cy } = NODE[el]
        const pct = data[el] ?? 0
        const fillHeight = (pct / 100) * 2 * R
        const fillTop = cy + R - fillHeight
        return (
          <g key={el}>
            {pct > 0 && (
              <rect x={cx - R} y={fillTop} width={R * 2} height={fillHeight}
                    fill={FILL[el]} clipPath={`url(#clip-${el})`} />
            )}
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="#c9c4bb" strokeWidth="1.6" />
            <text x={cx} y={cy - 12} textAnchor="middle"
                  style={{ fontSize: 15, fontWeight: 700, fill: '#2b2b2b' }}>
              {el}({sipsin[el]})
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle"
                  style={{ fontSize: 15, fontWeight: 700, fill: '#2b2b2b' }}>
              {pct.toFixed(1)}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}
