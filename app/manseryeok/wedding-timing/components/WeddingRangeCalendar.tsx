'use client'

/**
 * 결혼택일 기간 선택 달력 — 달력 하나로 시작일→끝일을 잇따라 고른다.
 * ─────────────────────────────────────────────
 * · 첫 탭 = 시작일, 두 번째 탭 = 끝일. 그 사이는 연하게 칠해 범위를 보여준다.
 * · 시작보다 앞선 날을 두 번째로 탭하면 그 날을 새 시작일로 다시 잡는다.
 * · 주말 색 구분 + 공휴일 이름(KASI /api/holidays) 표시.
 *
 * 값은 'YYYY-MM-DD' 문자열 두 개(start, end)로 주고받는다(find의 survey와 동일).
 */

import { useState, useEffect, useMemo } from 'react'

const C = {
  title: '#3a2e28',
  brown: '#96502e',
  sub: '#6b5d54',
  subLight: '#b4785a',
  sun: '#d4537e',
  sat: '#3c82a0',
  accent: '#96643c',   // 시작·끝 (진하게)
  range: '#f3e6db',    // 사이 범위 (연하게)
  cardBg: '#FFFBF7',
  border: '#f0e0d5',
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

function parse(value: string): { y: number; m: number; d: number } | null {
  const mt = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value || '')
  if (!mt) return null
  return { y: +mt[1], m: +mt[2], d: +mt[3] }
}
function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function key8(y: number, m: number, d: number): string {
  return `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`
}
// 비교용 정수 (YYYYMMDD)
function num(y: number, m: number, d: number): number {
  return y * 10000 + m * 100 + d
}
function numOf(v: string): number | null {
  const p = parse(v)
  return p ? num(p.y, p.m, p.d) : null
}
// 'YYYY.M.D' 짧은 표기
function short(v: string): string {
  const p = parse(v)
  return p ? `${p.y}.${p.m}.${p.d}` : ''
}

export default function WeddingRangeCalendar({
  start,
  end,
  onChange,
}: {
  start: string
  end: string
  onChange: (start: string, end: string) => void
}) {
  const today = new Date()
  const sStart = parse(start)

  const [viewY, setViewY] = useState(sStart?.y ?? today.getFullYear())
  const [viewM, setViewM] = useState(sStart?.m ?? today.getMonth() + 1)

  const [holidays, setHolidays] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    const s = fmt(viewY, viewM, 1)
    const lastDay = new Date(viewY, viewM, 0).getDate()
    const e = fmt(viewY, viewM, lastDay)
    fetch(`/api/holidays?start=${s}&end=${e}`)
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

  const cells = useMemo(() => {
    const firstDow = new Date(viewY, viewM - 1, 1).getDay()
    const lastDate = new Date(viewY, viewM, 0).getDate()
    const arr: (number | null)[] = []
    for (let i = 0; i < firstDow; i++) arr.push(null)
    for (let d = 1; d <= lastDate; d++) arr.push(d)
    return arr
  }, [viewY, viewM])

  const prevMonth = () => { if (viewM === 1) { setViewY(viewY - 1); setViewM(12) } else setViewM(viewM - 1) }
  const nextMonth = () => { if (viewM === 12) { setViewY(viewY + 1); setViewM(1) } else setViewM(viewM + 1) }

  const startN = numOf(start)
  const endN = numOf(end)

  // 날짜 탭 처리
  //  - 시작이 없으면 → 시작 지정 (끝 비움)
  //  - 시작만 있으면 → 끝 지정 (단, 시작보다 앞이면 그 날을 새 시작으로)
  //  - 둘 다 있으면 → 새로 시작부터 다시
  const onTap = (d: number) => {
    const picked = fmt(viewY, viewM, d)
    const pN = num(viewY, viewM, d)
    if (!start || (start && end)) {
      onChange(picked, '')
    } else {
      if (startN !== null && pN < startN) onChange(picked, '')
      else onChange(start, picked)
    }
  }

  return (
    <div>
      {/* 시작 → 끝 요약 (한 줄) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.cardBg, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: C.subLight }}>시작</span>
        <span style={{ fontSize: 14, color: start ? C.brown : C.subLight, fontWeight: start ? 600 : 400 }}>
          {start ? short(start) : '날짜 선택'}
        </span>
        <span style={{ color: C.subLight, margin: '0 2px' }}>→</span>
        <span style={{ fontSize: 11, color: C.subLight }}>끝</span>
        <span style={{ fontSize: 14, color: end ? C.brown : C.subLight, fontWeight: end ? 600 : 400 }}>
          {end ? short(end) : '날짜 선택'}
        </span>
      </div>

      {/* 달력 */}
      <div style={{ background: C.cardBg, border: `0.5px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={prevMonth} type="button"
            style={{ background: 'none', border: 'none', color: C.brown, fontSize: 20, cursor: 'pointer', padding: '2px 12px' }}>‹</button>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.title }}>{viewY}년 {viewM}월</div>
          <button onClick={nextMonth} type="button"
            style={{ background: 'none', border: 'none', color: C.brown, fontSize: 20, cursor: 'pointer', padding: '2px 12px' }}>›</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
          {WEEK.map((w, i) => (
            <div key={w} style={{ textAlign: 'center', fontSize: 11, padding: '2px 0', color: i === 0 ? C.sun : i === 6 ? C.sat : C.sub }}>{w}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 0, rowGap: 3 }}>
          {cells.map((d, idx) => {
            if (d === null) return <div key={`e${idx}`} />
            const dow = idx % 7
            const dN = num(viewY, viewM, d)
            const isStart = startN === dN
            const isEnd = endN === dN
            const inRange = startN !== null && endN !== null && dN > startN && dN < endN
            const holiName = holidays[key8(viewY, viewM, d)]
            const isHoli = !!holiName
            const isEdge = isStart || isEnd

            // 배경/모서리: 시작·끝은 진한 브라운, 사이는 연한 칠
            let bg = 'transparent'
            let radius = '8px'
            if (isEdge) { bg = C.accent }
            else if (inRange) { bg = C.range; radius = '0' }
            // 범위 양끝 모서리 둥글게
            if (isStart && endN !== null && endN !== startN) radius = '8px 0 0 8px'
            if (isEnd && startN !== null && endN !== startN) radius = '0 8px 8px 0'

            const color = isEdge ? '#fff' : isHoli || dow === 0 ? C.sun : dow === 6 ? C.sat : C.sub

            return (
              <button key={d} type="button" onClick={() => onTap(d)}
                style={{
                  background: bg, border: 'none', borderRadius: radius, cursor: 'pointer',
                  padding: '8px 0 5px', textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                }}>
                <span style={{ fontSize: 13, color, fontWeight: isEdge ? 600 : 400 }}>{d}</span>
                <span style={{ fontSize: 8.5, lineHeight: 1, height: 9, color: isEdge ? '#ffe' : C.sun, overflow: 'hidden' }}>
                  {isHoli ? holiName.slice(0, 4) : ''}
                </span>
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `0.5px solid ${C.border}`, fontSize: 11, color: C.subLight, textAlign: 'center' }}>
          {!start
            ? '결혼하고 싶은 기간의 시작일을 눌러주세요'
            : !end
              ? '끝나는 날을 눌러주세요'
              : '기간을 다시 고르려면 날짜를 눌러주세요'}
        </div>
      </div>
    </div>
  )
}
