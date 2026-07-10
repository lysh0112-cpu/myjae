'use client'

/**
 * 결혼택일 날짜 선택 필드 — 앱 표준 방식(연도 손입력 + 월·일 드롭다운).
 * ─────────────────────────────────────────────
 * PersonFormPitch(생년월일)와 동일한 UX. type="date" 기본 달력 대신 사용.
 *   미래 날짜(예: 2027년)를 달력으로 수십 번 넘길 필요 없이 연도를 바로 입력.
 *
 * 값은 'YYYY-MM-DD' 문자열로 주고받는다(기존 로직과 100% 호환).
 *   비어있으면 '' 를 반환.
 */

import { useState, useEffect } from 'react'

// 피치톤 색
const C = {
  title: '#96502e',
  sub: '#b4785a',
  subLight: '#c5a590',
  cardBg: '#FFFBF7',
  border: '#f0e0d5',
}

const numInput: React.CSSProperties = {
  boxSizing: 'border-box',
  background: C.cardBg,
  border: `0.5px solid ${C.border}`,
  borderRadius: 10,
  padding: '11px 12px',
  fontSize: 15,
  outline: 'none',
  color: C.title,
}

function onlyNum(v: string, max: number): string {
  return v.replace(/[^0-9]/g, '').slice(0, max)
}

// 'YYYY-MM-DD' → {y, m, d} (없으면 빈 문자열)
function split(value: string): { y: string; m: string; d: string } {
  const mt = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value || '')
  if (!mt) return { y: '', m: '', d: '' }
  return { y: mt[1], m: String(parseInt(mt[2], 10)), d: String(parseInt(mt[3], 10)) }
}

// {y, m, d} → 'YYYY-MM-DD' (셋 다 있어야 완성, 아니면 '')
function join(y: string, m: string, d: string): string {
  if (y.length !== 4 || !m || !d) return ''
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

export default function WeddingDateField({
  value,
  onChange,
  yearPlaceholder = '2027',
}: {
  value: string
  onChange: (v: string) => void
  yearPlaceholder?: string
}) {
  const init = split(value)
  const [y, setY] = useState(init.y)
  const [m, setM] = useState(init.m)
  const [d, setD] = useState(init.d)

  // 외부 value가 바뀌면(초기화 등) 내부도 맞춘다
  useEffect(() => {
    const s = split(value)
    setY(s.y); setM(s.m); setD(s.d)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // 내부 값이 바뀌면 'YYYY-MM-DD'로 부모에 알린다
  const emit = (ny: string, nm: string, nd: string) => onChange(join(ny, nm, nd))

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        value={y}
        onChange={e => { const v = onlyNum(e.target.value, 4); setY(v); emit(v, m, d) }}
        inputMode="numeric"
        placeholder={yearPlaceholder}
        style={{ ...numInput, flex: 1.6, color: y ? C.title : C.subLight }}
      />
      <span style={{ fontSize: 12, color: C.sub }}>년</span>
      <select
        value={m}
        onChange={e => { setM(e.target.value); emit(y, e.target.value, d) }}
        style={{ ...numInput, flex: 1, padding: '11px 4px', appearance: 'none', textAlign: 'center', cursor: 'pointer', color: m ? C.title : C.subLight }}>
        <option value="">월</option>
        {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
      </select>
      <span style={{ fontSize: 12, color: C.sub }}>월</span>
      <select
        value={d}
        onChange={e => { setD(e.target.value); emit(y, m, e.target.value) }}
        style={{ ...numInput, flex: 1, padding: '11px 4px', appearance: 'none', textAlign: 'center', cursor: 'pointer', color: d ? C.title : C.subLight }}>
        <option value="">일</option>
        {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
      </select>
      <span style={{ fontSize: 12, color: C.sub }}>일</span>
    </div>
  )
}
