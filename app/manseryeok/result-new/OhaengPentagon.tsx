'use client'

import React from 'react'

/**
 * 오행 오각형 상생상극 그래프 (명카페 공용 부품)
 *
 * 사주 분석 화면 어디서나 가져다 씁니다.
 *   import OhaengPentagon from '@/app/manseryeok/result-new/OhaengPentagon'
 *   <OhaengPentagon ohaeng={ohaeng} />
 *
 * ohaeng: [{el:'수', pct:25}, {el:'목', pct:25}, ...] 형태 (calcOhaeng 결과 그대로)
 *
 * 특징
 *  - 원 아래에서부터 비율만큼 오행 색으로 채움
 *  - 이웃한 원끼리 잇는 파란 곡선 화살표(生) — 원점 기준 균일 곡률
 *  - 한 칸 건너뛴 원끼리 잇는 빨간 별 화살표(剋) + 중앙 剋
 *  - 원 안 이름·% 크게 (포스텔러 스타일)
 */

const ELEMENT_COLOR: Record<string, string> = {
  목: '#a5d6a7', 화: '#f0a6ae', 토: '#f5cd76', 금: '#cccccc', 수: '#2b2b2b',
}

// ── 육친 라벨은 일간(日干) 기준으로 매번 계산해야 한다 ──
//   ★ 예전엔 '수=비겁' 식으로 하드코딩돼 있어, 일간이 水가 아닌 사람은 전부 틀렸음.
const GEN: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' } // A가 B를 생
const CON: Record<string, string> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' } // A가 B를 극

/** 일간 오행 기준으로 대상 오행의 육친 이름을 구한다 */
function yukchinOf(dayEl: string | undefined, el: string): string {
  if (!dayEl) return ''
  if (el === dayEl) return '비겁'
  if (GEN[dayEl] === el) return '식상'
  if (CON[dayEl] === el) return '재성'
  if (CON[el] === dayEl) return '관성'
  if (GEN[el] === dayEl) return '인성'
  return ''
}

// 오각형 꼭짓점 (viewBox 440 x 445 기준), 원 반지름 52
//   ★ 배치 순서: 木(맨 위) → 火 → 土 → 金 → 水 시계방향
//     명리 순서(갑을=목 → 병정=화 → 무기=토 → 경신=금 → 임계=수)와 일치.
const R = 52
const NODE: Record<string, { cx: number; cy: number }> = {
  목: { cx: 220, cy: 92 },
  화: { cx: 352, cy: 196 },
  토: { cx: 300, cy: 352 },
  금: { cx: 140, cy: 352 },
  수: { cx: 88, cy: 196 },
}
const CENTER = { x: 220, y: 237.6 }   // 다섯 원점 평균(곡선 방향 기준)
const GUK_CENTER_Y = 232               // 별 교차점(剋 글자 위치)

const SAENG = ['목', '화', '토', '금', '수']
const GUK: [string, string][] = [
  ['수', '화'], ['목', '토'], ['화', '금'], ['토', '수'], ['금', '목'],
]

function edge(from: string, to: string, gap = 5) {
  const a = NODE[from], b = NODE[to]
  const dx = b.cx - a.cx, dy = b.cy - a.cy
  const d = Math.hypot(dx, dy) || 1
  const ux = dx / d, uy = dy / d
  return {
    sx: a.cx + ux * (R + gap), sy: a.cy + uy * (R + gap),
    ex: b.cx - ux * (R + gap), ey: b.cy - uy * (R + gap),
  }
}

// 제미나이 arc3,rad 방식: 모든 화살표 동일 방향으로 균일하게 휨
function saengArc(from: string, to: string, rad = 0.2) {
  const { sx, sy, ex, ey } = edge(from, to)
  const mx = (sx + ex) / 2, my = (sy + ey) / 2
  const dx = ex - sx, dy = ey - sy
  const d = Math.hypot(dx, dy) || 1
  const px = dy / d, py = -dx / d
  const cx = mx + px * rad * d, cy = my + py * rad * d
  return {
    d: `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`,
    mx, my,
  }
}

export default function OhaengPentagon({ ohaeng, dayElement }: { ohaeng: { el: string; pct: number }[]; dayElement?: string }) {
  // 라벨: 일간을 받으면 '목(비겁)'처럼 육친 병기, 없으면 오행만 표시
  const label = (el: string) => {
    const y = yukchinOf(dayElement, el)
    return y ? `${el}(${y})` : el
  }
  const pct = (el: string) => {
    const d = ohaeng.find((o) => o.el === el)
    return d ? d.pct : 0
  }

  return (
    <svg width="100%" viewBox="-30 -30 500 505" style={{ maxWidth: 400, display: 'block', margin: '0 auto' }}>
      <defs>
        <marker id="ohp-b" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="#3f8ae0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id="ohp-r" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="#e8908a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        {SAENG.map((el) => (
          <clipPath key={el} id={`ohp-clip-${el}`}>
            <circle cx={NODE[el].cx} cy={NODE[el].cy} r={R} />
          </clipPath>
        ))}
      </defs>

      {/* 상극(剋) — 별 모양 빨간 직선 화살표 */}
      {GUK.map(([from, to], i) => {
        const { sx, sy, ex, ey } = edge(from, to, 4)
        return (
          <line key={i} x1={sx} y1={sy} x2={ex} y2={ey}
            stroke="#e8908a" strokeWidth="1.3" opacity="0.9" markerEnd="url(#ohp-r)" />
        )
      })}
      <text x={CENTER.x} y={GUK_CENTER_Y} textAnchor="middle" dominantBaseline="central"
        fontSize="24" fontWeight="700" fill="#e8908a">극</text>

      {/* 상생(生) — 이웃 원끼리 균일 곡선 파란 화살표 */}
      {SAENG.map((from, i) => {
        const to = SAENG[(i + 1) % 5]
        const { d, mx, my } = saengArc(from, to)
        const ox = mx - CENTER.x, oy = my - CENTER.y
        const ol = Math.hypot(ox, oy) || 1
        const gx = mx + (ox / ol) * 30, gy = my + (oy / ol) * 30
        return (
          <g key={i}>
            <path d={d} fill="none" stroke="#3f8ae0" strokeWidth="2.2" markerEnd="url(#ohp-b)" />
            <text x={gx} y={gy} textAnchor="middle" dominantBaseline="central"
              fontSize="16" fontWeight="700" fill="#3f8ae0">生</text>
          </g>
        )
      })}

      {/* 오행 원 5개 (아래에서부터 비율만큼 채움) */}
      {SAENG.map((el) => {
        const { cx, cy } = NODE[el]
        const p = pct(el)
        const fh = (p / 100) * 2 * R
        const ft = cy + R - fh
        return (
          <g key={el}>
            {p > 0 && (
              <>
                <clipPath id={`ohp-fill-${el}`}>
                  <rect x={cx - R} y={ft} width={R * 2} height={fh} />
                </clipPath>
                <rect x={cx - R} y={ft} width={R * 2} height={fh}
                  fill={ELEMENT_COLOR[el]} clipPath={`url(#ohp-clip-${el})`} />
              </>
            )}
            {/* 내 일간 오행이면 굵은 갈색 테두리로 강조 ("여기가 나") */}
            <circle cx={cx} cy={cy} r={R} fill="none"
              stroke={el === dayElement ? '#b46e46' : '#cfcabf'}
              strokeWidth={el === dayElement ? 4 : 1.4} />
            {/* 기본(어두운) 글자 */}
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize="13.5" fontWeight="700" fill="#333">
              {label(el)}
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" fontSize="15" fontWeight="700" fill="#222">
              {p}%
            </text>
            {/* 채움 영역에 걸치는 부분만 흰색으로 덧그림 (검정 채움 위에서도 보이게) */}
            {p > 0 && (
              <g clipPath={`url(#ohp-fill-${el})`}>
                <text x={cx} y={cy - 8} textAnchor="middle" fontSize="13.5" fontWeight="700" fill="#fff">
                  {label(el)}
                </text>
                <text x={cx} y={cy + 14} textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff">
                  {p}%
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* 원 바깥 오행 한글 이름표 (나무·불·흙·쇠·물) */}
      {SAENG.map((el) => {
        const { cx, cy } = NODE[el]
        const CX = 220, CY = 222
        const dx = cx - CX, dy = cy - CY
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const off = R + 20
        const lx = cx + (dx / len) * off
        const ly = cy + (dy / len) * off + 5
        const HANGUL: Record<string, string> = { 목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물' }
        return (
          <text key={`lbl-${el}`} x={lx} y={ly} textAnchor="middle" fontSize="16" fontWeight="700" fill={ELEMENT_COLOR[el]}>
            {HANGUL[el]}
          </text>
        )
      })}
    </svg>
  )
}
