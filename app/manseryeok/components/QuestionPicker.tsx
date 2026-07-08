// app/manseryeok/components/QuestionPicker.tsx
// ============================================================================
// AI 통변용 "질문 선택" 화면.
// ----------------------------------------------------------------------------
// 사람(연령대·성별)이 정해지면 그에 맞는 질문만 보여주고,
// 대분류별로 접기/펼치기 + 전체선택/해제 + 개별선택으로 고르게 한다.
// 테스트 단계라 선택 개수 제한 없음(전체 선택 가능).
//
// props:
//   ageGroup   : '20s'|'30s'|... (birthYearToGroup로 만들어 넘김)
//   gender     : 'male'|'female'
//   personName : 상단 표시용 이름
//   ageLabel   : 상단 표시용 "28세" 등
//   onSubmit   : 고른 질문(SajuQuestion[])을 부모로 넘김 → 부모가 프롬프트 만들어 AI 호출
//   onBack     : 뒤로
// ============================================================================

'use client'

import { useMemo, useState } from 'react'
import {
  questionsFor, groupByCategory,
  type AgeGroup, type SajuQuestion,
} from '@/lib/saju/questions'

const C = {
  cardBg: '#FFFBF7',
  divider: '#f5e5da',
  point: '#c8783c',
  brown: '#b46e46',
  title: '#3a2e28',
  titleWarm: '#96502e',
  sub: '#b4785a',
  subLight: '#c5a590',
  border: '#f0e0d5',
  chipBorder: '#e8d5c5',
  disabled: '#d8c4b4',
  selBg: '#fff3e9',
}

// 대분류별 색 (없으면 기본 갈색). 화면 구분감을 위해.
const CAT_COLOR: Record<string, string> = {
  '연애·결혼': '#c85a8c', '연애': '#c85a8c',
  '직업·진로': '#3c82a0', '직업·사업': '#3c82a0', '취업': '#3c82a0',
  '재물': '#c8783c', '노후·재물': '#c8783c',
  '출산·자녀': '#6e50a0', '자녀': '#6e50a0', '가정': '#6e50a0', '가족': '#6e50a0',
  '건강': '#3c9a6e', '건강·자기': '#3c9a6e',
  '진로·적성': '#9a6ec8',
  '인간관계': '#b4785a', '관계·마음': '#b4785a',
  '부모': '#a0703c', '노후': '#c8783c', '인생후반': '#96826e',
}
function catColor(cat: string): string {
  return CAT_COLOR[cat] ?? C.brown
}
function catBg(cat: string): string {
  const c = catColor(cat)
  return c + '14' // 아주 옅은 배경
}

export interface QuestionPickerProps {
  ageGroup: AgeGroup
  gender: 'male' | 'female'
  personName?: string
  ageLabel?: string
  onSubmit: (selected: SajuQuestion[]) => void
  onBack?: () => void
}

export default function QuestionPicker({
  ageGroup, gender, personName = '', ageLabel = '', onSubmit, onBack,
}: QuestionPickerProps) {
  const list = useMemo(() => questionsFor(ageGroup, gender), [ageGroup, gender])
  const groups = useMemo(() => groupByCategory(list), [list])

  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [openCats, setOpenCats] = useState<Set<string>>(
    () => new Set(groups.length ? [groups[0].category] : [])
  )

  const allIds = useMemo(() => list.map(q => q.id), [list])

  function toggleQ(id: string) {
    setPicked(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }
  function toggleCat(cat: string) {
    setOpenCats(prev => {
      const n = new Set(prev)
      if (n.has(cat)) n.delete(cat); else n.add(cat)
      return n
    })
  }
  function toggleCatAll(cat: string, items: SajuQuestion[]) {
    const ids = items.map(i => i.id)
    const allOn = ids.every(id => picked.has(id))
    setPicked(prev => {
      const n = new Set(prev)
      if (allOn) ids.forEach(id => n.delete(id))
      else ids.forEach(id => n.add(id))
      return n
    })
    setOpenCats(prev => new Set(prev).add(cat))
  }
  function selectAll() {
    setPicked(new Set(allIds))
    setOpenCats(new Set(groups.map(g => g.category)))
  }
  function clearAll() { setPicked(new Set()) }

  function submit() {
    if (picked.size === 0) return
    onSubmit(list.filter(q => picked.has(q.id)))
  }

  const n = picked.size

  return (
    <div style={{ background: C.cardBg, borderRadius: 18, border: `0.5px solid ${C.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
      {/* 헤더 */}
      <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {onBack && <span onClick={onBack} style={{ color: C.subLight, fontSize: 18, cursor: 'pointer' }}>‹</span>}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.title }}>무엇이 궁금하세요?</div>
          <div style={{ fontSize: 10, color: C.point, marginTop: 1 }}>
            {personName && `${personName}님 · `}{ageLabel && `${ageLabel} · `}궁금한 걸 마음껏 골라보세요
          </div>
        </div>
        {onBack && <span style={{ width: 16 }} />}
      </div>

      {/* 전체 선택/해제 */}
      <div style={{ padding: '10px 14px', display: 'flex', gap: 8, borderBottom: `0.5px solid ${C.divider}`, flexShrink: 0 }}>
        <button onClick={selectAll} style={{ flex: 1, height: 34, background: C.selBg, border: `0.5px solid #e0c0a8`, borderRadius: 9, color: C.titleWarm, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓ 전체 선택</button>
        <button onClick={clearAll} style={{ flex: 1, height: 34, background: '#fff', border: `0.5px solid ${C.chipBorder}`, borderRadius: 9, color: C.sub, fontSize: 12, cursor: 'pointer' }}>전체 해제</button>
      </div>

      {/* 대분류 목록 */}
      <div style={{ padding: '12px 14px', overflowY: 'auto', flex: 1 }}>
        {groups.length === 0 && (
          <div style={{ padding: '36px 12px', textAlign: 'center', color: C.sub, fontSize: 13 }}>
            표시할 질문이 없어요.
          </div>
        )}
        {groups.map(({ category, items }) => {
          const col = catColor(category)
          const gPicked = items.filter(q => picked.has(q.id)).length
          const allOn = gPicked === items.length
          const open = openCats.has(category)
          return (
            <div key={category} style={{ marginBottom: 10, border: `0.5px solid ${gPicked > 0 ? col + '55' : C.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {/* 헤더 */}
              <div onClick={() => toggleCat(category)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', background: gPicked > 0 ? catBg(category) : '#fff', cursor: 'pointer' }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: col }}>{category}</span>
                {gPicked > 0 && <span style={{ fontSize: 10, color: '#fff', background: col, borderRadius: 9, padding: '2px 7px' }}>{gPicked}</span>}
                <span onClick={(e) => { e.stopPropagation(); toggleCatAll(category, items) }} style={{ fontSize: 10, color: col, border: `0.5px solid ${col}88`, borderRadius: 8, padding: '3px 8px', background: '#fff' }}>{allOn ? '모두 해제' : '모두 담기'}</span>
                <span style={{ color: col, fontSize: 12 }}>{open ? '▾' : '▸'}</span>
              </div>
              {/* 질문들 */}
              {open && (
                <div style={{ padding: '8px 10px' }}>
                  {items.map(q => {
                    const on = picked.has(q.id)
                    return (
                      <div key={q.id} onClick={() => toggleQ(q.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px', borderRadius: 8, background: on ? catBg(category) : 'transparent', marginBottom: 3, cursor: 'pointer' }}>
                        <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${on ? col : C.disabled}`, background: on ? col : '#fff', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on ? '✓' : ''}</span>
                        <span style={{ fontSize: 12.5, color: C.title }}>{q.question}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 하단 버튼 */}
      <div style={{ padding: '11px 14px 15px', borderTop: `0.5px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={submit} disabled={n === 0} style={{ width: '100%', height: 46, background: n > 0 ? C.brown : C.disabled, border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: n > 0 ? 'pointer' : 'not-allowed' }}>
          {n > 0 ? `${n}개 질문으로 사주 풀이 받기` : '궁금한 것을 골라주세요'}
        </button>
      </div>
    </div>
  )
}
