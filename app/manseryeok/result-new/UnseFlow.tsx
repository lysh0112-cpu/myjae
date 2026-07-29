'use client'

import React, { useState, useEffect } from 'react'
import { EL_BG, EL_BD, EL_C, EL_C_SUB, EL_HAN } from '@/lib/saju/ohaengColor'
import { calcSeyunList, calcWolunList, calcIlunList, type DayunItem } from '@/lib/saju/dayun'
// ★144칸 — 운에서 온 지지가 내 월지·일지를 만났을 때 (교재 49쪽 + 50~73쪽)
import { jijiRelation, type JijiGrade } from '@/lib/saju/jijiGrade'
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
  /** ★내 월지 — 교재 49쪽 "대운이나 세운을 일단 月支에 대입해라. 月支가 총사령관이다" */
  myMonthBranch?: string
  /** 내 일지 — 나 자신 쪽 반응 */
  myDayBranch?: string
  /** ★태어난 시(0~11). 절입일 당일 태생의 대운수를 가리는 데 쓴다. */
  hourIdx?: number | null
  /**
   * ★대운 목록을 밖에서 넘겨받는다 (2026-07-27).
   *   안 넘기면 전처럼 스스로 /api/dayun 을 부른다. 하위 호환이다.
   *   page.tsx 가 통변 재료로도 대운이 필요해져서, 한 번만 받아 함께 쓰려고 뚫었다.
   *   (작업지시 3장 ④ "나" 안 — 넘기면 그걸 쓰고, 안 넘기면 예전대로)
   */
  list?: DayunItem[]
  /**
   * ★2026-07-29 — 어느 줄까지 그릴지. (대표님 지시)
   *
   *   all         대운 + 세운 + 월운 + 일운 넉 줄   ← 만세력·전문가 화면 (기본값)
   *   daeunOnly   대운(10년 흐름) 한 줄만          ← 사주풀이 리포트 [대운 섹션]
   *   seyunOnly   세운(연운) 한 줄만               ← 사주풀이 리포트 [연운 섹션]
   *
   *   ⚠️⚠️ **이것은 «그리는 범위»만 가릅니다. 계산은 하나도 안 바뀝니다.**
   *     대운 산출은 /api/dayun 한 곳, 세운·월운·일운은 dayun.ts 의 calc* 함수가
   *     예전 그대로 돕니다. 어느 mode 로 부르든 «같은 값»이 나옵니다.
   *     (31부에서 대운 부품을 통일하며 사본을 걷어낸 자리입니다. 되돌리지 마십시오)
   *
   *   ⚠️ 기본값이 'all' 이라 이 prop 을 안 넘기는 기존 화면은 하나도 안 바뀝니다.
   */
  mode?: 'all' | 'daeunOnly' | 'seyunOnly'
}

/** 등급 배지 색 — 겁주지 않는 결로 (교훈 AX) */
const GRADE_C: Record<JijiGrade, { bg: string; fg: string }> = {
  A: { bg: '#e9f2ea', fg: '#3b6d3b' },
  B: { bg: '#e6eef5', fg: '#2f5f80' },
  C: { bg: '#f3ecdf', fg: '#8a6a3c' },
  D: { bg: '#faeef1', fg: '#8c4a63' },
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
  const { solarYear, solarMonth, solarDay, monthGanji, yearStem, dayStem, gender, birthYear, currentYear,
          myMonthBranch = '', myDayBranch = '', list, hourIdx = null, mode = 'all' } = props

  const [dayunList, setDayunList] = useState<DayunItem[]>([])
  const [selDaeun, setSelDaeun] = useState<number | null>(null)   // 대운 index
  const [selYear, setSelYear] = useState<number | null>(null)     // 선택 연도
  const [selMonth, setSelMonth] = useState<number | null>(null)   // 선택 월
  const [term, setTerm] = useState<string | null>(null)
  /** 144칸 자세히 보기 — 어느 칸을 눌렀나 */
  const [detail, setDetail] = useState<{ label: string; stem: string; branch: string } | null>(null)
  const openTerm = (v?: string) => { if (v && SAJU_TERMS[v]) setTerm(v) }

  // 대운 로드 — 밖에서 넘겨받았으면 그걸 쓰고, 아니면 API 를 부른다
  useEffect(() => {
    if (list && list.length) {
      setDayunList(list)
      const age = currentYear - birthYear
      let idx = list.findIndex((dv, i) => age >= dv.age && (i === list.length - 1 || age < list[i + 1].age))
      if (idx < 0) idx = 0
      setSelDaeun(idx)
      setSelYear(currentYear)
      setSelMonth(new Date().getMonth() + 1)
      return
    }
    if (!solarYear || !monthGanji || !yearStem || !dayStem) return
    let ok = true
    fetch('/api/dayun', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solarYear, solarMonth, solarDay, monthGanji, yearStem, gender, dayStem, hourIdx }),
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
  }, [solarYear, solarMonth, solarDay, monthGanji, yearStem, gender, dayStem, list, hourIdx])

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
        {/* ★144칸 등급 — 월지(총사령관)가 그해 지지를 만났을 때. 누르면 자세히. */}
        {(() => {
          const rel = jijiRelation(myMonthBranch, c.branch)
          if (!rel) return null
          const g = GRADE_C[rel.grade]
          return (
            <div onClick={(e) => { e.stopPropagation(); setDetail({ label: c.label, stem: c.stem, branch: c.branch }) }}
              style={{
                fontSize: 9.5, fontWeight: 700, lineHeight: 1.5, cursor: 'pointer',
                padding: '1px 7px', borderRadius: 7, background: g.bg, color: g.fg,
                border: `0.5px solid ${g.fg}22`, whiteSpace: 'nowrap',
              }}>{rel.grade}</div>
          )
        })()}
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
      <div style={{ fontSize: 10, color: '#8f3d0e', padding: '5px 15px 0' }}>
        👆 눌러서 자세히 보기{myMonthBranch ? ' · A~D는 내 월지와의 어울림이에요' : ''}
      </div>
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
      {/* ★mode 는 «그리는 범위»만 가립니다. 위쪽 계산은 mode 와 무관하게 늘 같습니다. */}
      {mode !== 'seyunOnly' && section('대운 (10년 흐름)', daeunBadge, daeunCells, false)}
      {mode !== 'daeunOnly' && section('세운 (연운)', seyunBadge, seyunCells, true)}
      {mode === 'all' && selYear !== null && wolunCells.length > 0 && section('월운 (달별)', `${selYear}년`, wolunCells, true)}
      {mode === 'all' && selYear !== null && selMonth !== null && ilunCells.length > 0 && section('일운 (날짜별)', `${selYear}년 ${selMonth}월`, ilunCells, true)}
      {/* ★144칸 자세히 보기 — 월지 반응(환경)과 일지 반응(나)을 함께 보여 준다 */}
      {detail && (() => {
        const env = jijiRelation(myMonthBranch, detail.branch)
        const self = jijiRelation(myDayBranch, detail.branch)
        const row = (title: string, mine: string, rel: ReturnType<typeof jijiRelation>) => {
          if (!rel) return null
          const g = GRADE_C[rel.grade]
          return (
            <div style={{ background: '#faf6f1', border: '0.5px solid #f0e0d5', borderRadius: 10, padding: '10px 12px', marginBottom: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#9e8878' }}>{title}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#5c4a3a' }}>{mine}{detail.branch}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 8px', borderRadius: 7, background: g.bg, color: g.fg }}>{rel.grade}</span>
                <span style={{ fontSize: 11, color: '#8f3d0e', fontWeight: 600 }}>{rel.tag}</span>
              </div>
              <div style={{ fontSize: 12.5, color: '#4a3a30', lineHeight: 1.75 }}>{rel.desc}</div>
            </div>
          )
        }
        return (
          <div onClick={() => setDetail(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(60,40,30,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 950 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ maxWidth: 340, width: '100%', maxHeight: '80vh', overflowY: 'auto', background: '#fff', borderRadius: 16, padding: '16px 15px 14px', position: 'relative' }}>
              <button onClick={() => setDetail(null)}
                style={{ position: 'absolute', top: 12, right: 13, background: 'none', border: 'none', fontSize: 15, color: '#c5a590', cursor: 'pointer' }}>✕</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <span style={{ fontSize: 19, fontWeight: 700, color: '#1a1a1a' }}>{detail.stem}{detail.branch}</span>
                <span style={{ fontSize: 11, color: '#b4785a' }}>{detail.label}</span>
              </div>
              <div style={{ fontSize: 10.5, color: '#c5a590', marginBottom: 11 }}>내 지지가 이 지지를 만났을 때</div>
              {row('일·환경 · 월지', myMonthBranch, env)}
              {row('나 · 일지', myDayBranch, self)}
              {!env && !self && (
                <div style={{ fontSize: 12.5, color: '#8a7a6c' }}>월지·일지를 알 수 없어 견줄 수 없어요.</div>
              )}
              <div style={{ fontSize: 10, color: '#c5a590', lineHeight: 1.6, marginTop: 4 }}>
                『명리적성 비법노트』 49쪽 · 50~73쪽. 등급은 흐름을 견주는 눈금이지 좋고 나쁨의 판정이 아닙니다.
              </div>
            </div>
          </div>
        )
      })()}

      <TermModal term={term} onClose={() => setTerm(null)} />
    </div>
  )
}
