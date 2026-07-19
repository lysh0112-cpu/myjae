'use client'

/**
 * 궁합 등급 폭죽 연출 — 등급별 강도 차등.
 * 점수는 안 보이고(C안) 등급만 주인공. 등급이 높을수록 더 화려하게 터진다.
 *   90+ 천생연분 / 80+ 소울메이트 → 팡팡(최고)
 *   70+ 황금 커플                → 넉넉히
 *   55+ 탐구 / 40+ 드라마틱      → 잔잔히
 *   그 외 반전 매력              → 은은히
 *
 * grade 문자열(getGrade 결과)로 강도를 판정하고, 캔버스 폭죽을 시간차로 터뜨린다.
 * prefers-reduced-motion이면 폭죽 없이 등급만 표시.
 */

import { useEffect, useRef } from 'react'

interface Props {
  grade: string
  gradeDesc: string
  headline?: string     // 위 작은 글씨 (예: "류승현님과 김서연님, 두 사람의 만남")
  accent: string        // 배경색 (mode별)
}

// 등급 문자열 → 강도(0~3)
function intensityOf(grade: string): number {
  if (grade.includes('천생연분') || grade.includes('소울메이트')) return 3
  if (grade.includes('황금')) return 2
  if (grade.includes('탐구') || grade.includes('드라마틱')) return 1
  return 0
}

const COLORS = ['#f6c945', '#ec6f9e', '#6ec2f0', '#9b7fd4', '#f08a5d', '#7ed6a5', '#ffffff']

export default function GradeFireworks({ grade, gradeDesc, headline, accent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const ctx = cv.getContext('2d')
    if (!ctx) return
    const W = cv.width, H = cv.height
    const level = intensityOf(grade)

    type P = { x: number; y: number; vx: number; vy: number; life: number; color: string; r: number }
    let parts: P[] = []
    let raf = 0
    let alive = true

    const burst = (x: number, y: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + Math.random() * 0.3
        const sp = 2 + Math.random() * 3.2
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color: COLORS[(Math.random() * COLORS.length) | 0], r: 2 + Math.random() * 2 })
      }
    }

    const tick = () => {
      if (!alive) return
      ctx.clearRect(0, 0, W, H)
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.x += p.vx; p.y += p.vy; p.vy += 0.045; p.vx *= 0.985; p.life -= 0.016
        if (p.life <= 0) { parts.splice(i, 1); continue }
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = p.color
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(tick)
    }
    tick()

    // 강도별 폭죽 시나리오
    const cx = W / 2
    const timers: number[] = []
    const play = () => {
      if (level >= 1) burst(cx, H * 0.42, 30 + level * 6)
      if (level >= 2) timers.push(window.setTimeout(() => { burst(W * 0.28, H * 0.32, 26); burst(W * 0.72, H * 0.34, 26) }, 260))
      if (level >= 3) {
        timers.push(window.setTimeout(() => { burst(W * 0.4, H * 0.25, 24); burst(W * 0.62, H * 0.48, 24) }, 540))
        timers.push(window.setTimeout(() => { burst(cx, H * 0.38, 34) }, 880))
      }
      if (level === 0) burst(cx, H * 0.44, 16) // 은은히 한 번
    }
    timers.push(window.setTimeout(play, 250))

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      timers.forEach(t => clearTimeout(t))
    }
  }, [grade])

  return (
    <div style={{ position: 'relative', background: accent, borderRadius: 14, padding: '24px 16px', textAlign: 'center', marginBottom: 10, overflow: 'hidden' }}>
      <canvas ref={canvasRef} width={360} height={220}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {headline && <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, marginBottom: 12 }}>{headline}</div>}
        <div style={{ fontSize: 22, fontWeight: 500, color: '#fff', lineHeight: 1.3 }}>{grade}</div>
        <div style={{ display: 'inline-block', fontSize: 11.5, color: accent, background: '#fff', borderRadius: 99, padding: '3px 14px', marginTop: 12 }}>
          {gradeDesc}
        </div>
      </div>
    </div>
  )
}
