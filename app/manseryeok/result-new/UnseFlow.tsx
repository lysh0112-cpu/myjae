'use client'

import React, { useState, useEffect } from 'react'
import { EL_BG, EL_BD, EL_C, EL_C_SUB, EL_HAN } from '@/lib/saju/ohaengColor'
import { calcSeyunList, calcWolunList, calcIlunList, type DayunItem } from '@/lib/saju/dayun'
import TermModal from './TermModal'
import { SAJU_TERMS } from './sajuTerms'

/**
 * 대운·세운·월운·일운 연동 흐름 (명카페)
 *
 * 대운 클릭 → 그 대운 10년의 세운 / 세운 클릭 → 그 해 월운 / 월운 클릭 → 그 달 일운
 * 네모박스(테두리 강조)가 선택 위치로 옮겨진다.
 *
 *   <UnseFlow solarYear={..} solarMonth={..} solarDay={..} monthGanji={..}
 *             yearStem={..} dayStem={..} gender={..} birthYear={..} currentYear={..} />
 */

interface Props {
  solarYear: number
  solarMonth: number
  solarDay: number
  monthGanji: string
  yearStem: string
  dayStem: string
  gender: string
  birthYear: number
  currentYear: number
}

type Element = '목' | '화' | '토' | '금' | '수'
const STEM_EL: Record<string, Element> = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' }
const BRANCH_EL: Record<string, Element> = { 子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화', 午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수' }
const SS_C: Record<string, string> = {
  비견: '#9e9e9e', 겁재: '#9e9e9e', 식신: '#43a047', 상관: '#43a047',
  편재: '#fb8c00', 정재: '#fb8c00', 편관: '#e53935', 정관: '#e53935',
  편인: '#1e88e5', 정인: '#1e88e5',
}

interface Cell {
  key: string
  label: string
  stem: string
  branch: string
  stemSS: string
  branchSS: string
  selected: boolean
  onClick?: () => void
}

export default function UnseFlow(props: Props) {
  const { solarYear, solarMonth, solarDay, monthGanji, yearStem, dayStem, gender, birthYear, currentYear } = props

  const [dayunList, setDayunList] = useState<DayunItem[]>([])
  const [selDaeun, setSelDaeun] = useState<number | null>(null)   // 대운 index
  const [selYear, setSelYear] = useState<number | null>(null)     // 선택 연도
  const [selMonth, setSelMonth] = useState<number | null>(null)   // 선택 월
  const [term, setTerm] = useState<string | null>(null)
  const openTerm = (v?: string) => { if (v && SAJU_TERMS[v]) setTerm(v) }

  // 대운 로드 (API)
  useEffect(() => {
    if (!solarYear || !monthGanji || !yearStem || !dayStem) return
    let ok = true
    fetch('/api/dayun', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solarYear, solarMonth, solarDay, monthGanji, yearStem, gender, dayStem }),
    })
      .then(r => r.json())
      .then(d => {
        if (!ok) return
        const list: DayunItem[] = d.dayunList || []
        setDayunList(list)
        // 현재 나이가 든 대운을 기본 선택
        const age = currentYear - birthYear
        let idx = list.findIndex((dv, i) => age >= dv.age && (i === list.length - 1 || age < list[i + 1].age))
        if (idx < 0) idx = 0
        setSelDaeun(idx)
        setSelYear(currentYear)
        setSelMonth(new Date().getMonth() + 1)
      })
      .catch(() => { if (ok) setDayunList([]) })
    return () => { ok = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solarYear, solarMonth, solarDay, monthGanji, yearStem, gender, dayStem])

  if (dayunList.length === 0 || selDaeun === null) return null

  // 선택 대운 → 10년 세운 (대운 시작 나이의 연도부터)
  const daeun = dayunList[selDaeun]
  const daeunStartYear = birthYear + daeun.age
  const seyunAll = calcSeyunList(dayStem, daeunStartYear + 5)  // 넉넉히 뽑고 아래서 자름
  const seyun10 = Array.from({ length: 10 }, (_, i) => {
    const y = daeunStartYear + i
    return seyunAll.find(s => s.year === y)
  }).filter(Boolean) as typeof seyunAll

  // 선택 연도 → 월운
  const wolun = selYear !== null ? calcWolunList(dayStem, selYear) : []
  // 선택 월 → 일운
  const ilun = (selYear !== null && selMonth !== null) ? calcIlunList(dayStem, selYear, selMonth) : []

  // ── 셀 렌더 ──
  const renderCell = (c: Cell, small: boolean) => {
    const sEl = STEM_EL[c.stem]
    const bEl = BRANCH_EL[c.branch]
    const blk = (el: Element | undefined, ch: string) => (
      <div style={{
        width: small ? 38 : 44, height: small ? 38 : 44, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: small ? 19 : 23, fontWeight: 700, position: 'relative', boxSizing: 'border-box',
        background: el ? EL_BG[el] : '#f5f5f5', border: `1px solid ${el ? EL_BD[el] : '#ddd'}`,
        color: el ? EL_C[el] : '#888',
      }}>
        {ch}
        {el && <span style={{ position: 'absolute', right: 3, bottom: 0, fontSize: 10.5, fontWeight: 600, color: EL_C_SUB[el] }}>{EL_HAN[el]}</span>}
      </div>
    )
    return (
      <div key={c.key} onClick={c.onClick}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          padding: '3px 2px', flexShrink: 0, cursor: c.onClick ? 'pointer' : 'default',
          border: c.selected ? '2px solid #555' : '2px solid transparent', borderRadius: 10,
        }}>
        <div style={{ fontSize: 10, color: '#9e9e9e', whiteSpace: 'nowrap' }}>{c.label}</div>
        <div onClick={(e) => { e.stopPropagation(); openTerm(c.stemSS) }}
          style={{ fontSize: 10, fontWeight: 600, color: SS_C[c.stemSS] || '#9e9e9e', whiteSpace: 'nowrap', cursor: SAJU_TERMS[c.stemSS] ? 'pointer' : 'inherit' }}>
          {c.stemSS || '-'}
        </div>
        {blk(sEl, c.stem)}
        {blk(bEl, c.branch)}
        <div onClick={(e) => { e.stopPropagation(); openTerm(c.branchSS) }}
          style={{ fontSize: 10, color: SS_C[c.branchSS] || '#9e9e9e', textAlign: 'center', whiteSpace: 'nowrap', cursor: SAJU_TERMS[c.branchSS] ? 'pointer' : 'inherit' }}>
          {c.branchSS || '-'}
        </div>
      </div>
    )
  }

  const section = (title: string, badge: string, cells: Cell[], small: boolean) => (
    <div style={{ background: '#fff', border: '0.5px solid #f0e0d5', borderRadius: 14, overflow: 'hidden', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 15px 8px', borderBottom: '0.5px solid #f7ede4' }}>
        <span style={{ color: '#8f3d0e', fontSize: 12 }}>✦</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a1a' }}>{title}</span>
        {badge && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: '#fff3e9', border: '0.5px solid #e8d5c5', color: '#8f3d0e', fontWeight: 600 }}>{badge}</span>}
      </div>
      <div style={{ fontSize: 10, color: '#8f3d0e', padding: '5px 15px 0' }}>👆 눌러서 자세히 보기</div>
      <div style={{ overflowX: 'auto', padding: '4px 12px 10px' }}>
        <div style={{ display: 'flex', gap: 4 }}>{[...cells].reverse().map(c => renderCell(c, small))}</div>
      </div>
    </div>
  )

  // 대운 셀
  const daeunCells: Cell[] = dayunList.map((d, i) => ({
    key: 'd' + i, label: `${d.age}세`, stem: d.cheongan, branch: d.jiji,
    stemSS: d.ganYukchin, branchSS: d.jiYukchin, selected: selDaeun === i,
    onClick: () => { setSelDaeun(i); const y = birthYear + d.age; setSelYear(y); setSelMonth(1) },
  }))

  // 세운 셀
  const seyunCells: Cell[] = seyun10.map(s => ({
    key: 's' + s.year, label: `${s.year}`, stem: s.cheongan, branch: s.jiji,
    stemSS: s.ganYukchin, branchSS: s.jiYukchin, selected: selYear === s.year,
    onClick: () => { setSelYear(s.year); setSelMonth(1) },
  }))

  // 월운 셀
  const wolunCells: Cell[] = wolun.map(w => ({
    key: 'w' + w.month, label: `${w.month}월`, stem: w.cheongan, branch: w.jiji,
    stemSS: w.ganYukchin, branchSS: w.jiYukchin, selected: selMonth === w.month,
    onClick: () => setSelMonth(w.month),
  }))

  // 일운 셀
  const ilunCells: Cell[] = ilun.map(d => ({
    key: 'i' + d.day, label: `${d.day}일`, stem: d.cheongan, branch: d.jiji,
    stemSS: d.ganYukchin, branchSS: d.jiYukchin, selected: false,
  }))

  const daeunBadge = `현재 ${currentYear - birthYear}세`
  const seyunBadge = `${daeunStartYear}~${daeunStartYear + 9}년`

  return (
    <div style={{ fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif" }}>
      {section('대운 (10년 흐름)', daeunBadge, daeunCells, false)}
      {section('세운 (연운)', seyunBadge, seyunCells, true)}
      {selYear !== null && wolunCells.length > 0 && section('월운 (달별)', `${selYear}년`, wolunCells, true)}
      {selYear !== null && selMonth !== null && ilunCells.length > 0 && section('일운 (날짜별)', `${selYear}년 ${selMonth}월`, ilunCells, true)}
      <TermModal term={term} onClose={() => setTerm(null)} />
    </div>
  )
}
