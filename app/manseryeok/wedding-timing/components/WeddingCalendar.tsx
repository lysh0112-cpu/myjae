'use client'

/**
 * 결혼택일 달력 선택 부품 — 한 달 전체가 펼쳐 보이는 달력.
 * ─────────────────────────────────────────────
 * · 요일이 다 보이고, 일요일=빨강 / 토요일=파랑으로 주말이 한눈에.
 * · 공휴일은 KASI(/api/holidays)에서 받아 빨간색 + 이름(설날·추석 등) 표시.
 * · ‹ › 로 달을 넘겨 미래(2027 등)로 쉽게 이동.
 *
 * 값은 'YYYY-MM-DD' 문자열로 주고받는다(WeddingDateField와 동일 인터페이스).
 *   → find·check에서 부품만 바꿔 끼우면 되고 뒷단 로직은 그대로.
 */

import { useState, useEffect, useMemo } from 'react'

const C = {
  title: '#3a2e28',
  brown: '#96502e',
  sub: '#6b5d54',
  subLight: '#b4785a',
  sun: '#d4537e',    // 일요일·공휴일
  sat: '#3c82a0',    // 토요일
  accent: '#96643c', // 선택
  cardBg: '#FFFBF7',
  border: '#f0e0d5',
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

// 'YYYY-MM-DD' → {y,m,d} 숫자 (없으면 null)
function parse(value: string): { y: number; m: number; d: number } | null {
  const mt = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value || '')
  if (!mt) return null
  return { y: +mt[1], m: +mt[2], d: +mt[3] }
}
// 숫자 → 'YYYY-MM-DD'
function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
// 'YYYYMMDD'
function key8(y: number, m: number, d: number): string {
  return `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`
}

export default function WeddingCalendar({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const today = new Date()
  const sel = parse(value)

  // 보고 있는 달 (선택값이 있으면 그 달, 없으면 이번 달)
  const [viewY, setViewY] = useState(sel?.y ?? today.getFullYear())
  const [viewM, setViewM] = useState(sel?.m ?? today.getMonth() + 1)

  // 선택값이 바뀌면 그 달로 이동
  useEffect(() => {
    const p = parse(value)
    if (p) { setViewY(p.y); setViewM(p.m) }
  }, [value])

  // 이 달의 공휴일 {YYYYMMDD → 이름}
  const [holidays, setHolidays] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    const start = fmt(viewY, viewM, 1)
    const lastDay = new Date(viewY, viewM, 0).getDate()
    const end = fmt(viewY, viewM, lastDay)
    fetch(`/api/holidays?start=${start}&end=${end}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled || !Array.isArray(data.holidays)) return
        const map: Record<string, string> = {}
        for (const h of data.holidays) if (h.date) map[h.date] = h.name || '공휴일'
        setHolidays(map)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [viewY, viewM])

  // 달력 칸 배열 (앞 빈칸 + 1~말일)
  const cells = useMemo(() => {
    const firstDow = new Date(viewY, viewM - 1, 1).getDay() // 0=일
    const lastDate = new Date(viewY, viewM, 0).getDate()
    const arr: (number | null)[] = []
    for (let i = 0; i < firstDow; i++) arr.push(null)
    for (let d = 1; d <= lastDate; d++) arr.push(d)
    return arr
  }, [viewY, viewM])

  const prevMonth = () => {
    if (viewM === 1) { setViewY(viewY - 1); setViewM(12) }
    else setViewM(viewM - 1)
  }
  const nextMonth = () => {
    if (viewM === 12) { setViewY(viewY + 1); setViewM(1) }
    else setViewM(viewM + 1)
  }

  // 선택된 날의 공휴일 이름(있으면)
  const selHolidayName = sel && sel.y === viewY ? holidays[key8(sel.y, sel.m, sel.d)] : undefined
  const selDow = sel ? new Date(sel.y, sel.m - 1, sel.d).getDay() : -1

  return (
    <div style={{ background: C.cardBg, border: `0.5px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
      {/* 월 이동 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} type="button"
          style={{ background: 'none', border: 'none', color: C.brown, fontSize: 20, cursor: 'pointer', padding: '2px 12px' }}>‹</button>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.title }}>{viewY}년 {viewM}월</div>
        <button onClick={nextMonth} type="button"
          style={{ background: 'none', border: 'none', color: C.brown, fontSize: 20, cursor: 'pointer', padding: '2px 12px' }}>›</button>
      </div>

      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {WEEK.map((w, i) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 11, padding: '2px 0', color: i === 0 ? C.sun : i === 6 ? C.sat : C.sub }}>{w}</div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
        {cells.map((d, idx) => {
          if (d === null) return <div key={`e${idx}`} />
          const dow = idx % 7
          const isSel = sel && sel.y === viewY && sel.m === viewM && sel.d === d
          const holiName = holidays[key8(viewY, viewM, d)]
          const isHoli = !!holiName
          const color = isSel ? '#fff' : isHoli || dow === 0 ? C.sun : dow === 6 ? C.sat : C.sub
          return (
            <button key={d} type="button"
              onClick={() => onChange(fmt(viewY, viewM, d))}
              style={{
                background: isSel ? C.accent : 'transparent',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                padding: '8px 0 5px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              }}>
              <span style={{ fontSize: 13, color, fontWeight: isSel ? 600 : 400 }}>{d}</span>
              {/* 공휴일 이름 (칸이 좁아 4자까지) */}
              <span style={{ fontSize: 8.5, lineHeight: 1, height: 9, color: isSel ? '#ffe' : C.sun, overflow: 'hidden' }}>
                {isHoli ? holiName.slice(0, 4) : ''}
              </span>
            </button>
          )
        })}
      </div>

      {/* 범례 + 선택 표시 */}
      <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 10, borderTop: `0.5px solid ${C.border}`, fontSize: 11, color: C.subLight, flexWrap: 'wrap' }}>
        <span><span style={{ color: C.sun }}>●</span> 일·공휴일</span>
        <span><span style={{ color: C.sat }}>●</span> 토요일</span>
        {sel && (
          <span style={{ marginLeft: 'auto', color: C.brown, fontWeight: 500 }}>
            {sel.m}월 {sel.d}일 ({WEEK[selDow]}){selHolidayName ? ` · ${selHolidayName}` : ''}
          </span>
        )}
      </div>
    </div>
  )
}
