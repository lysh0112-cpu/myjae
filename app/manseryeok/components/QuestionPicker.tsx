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
import {
  unseQuestionsForEntry, groupUnseByKind,
  type UnseEntry, type UnseKind,
} from '@/lib/saju/unseQuestions'
import { withNim } from '@/lib/saju/honorific'

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
  // 시간운(대운/세운)일 때만 지정. 없으면 기존 사주 통변 그대로.
  //   'daeun' → 대운 질문, 'seyun' → 세운+월운 질문(올해/월별 소제목)
  unseEntry?: UnseEntry
}

// 화면에 그릴 한 "덩어리" (사주는 1개, 세운은 올해/월별 2개)
interface Section {
  kind?: UnseKind          // 시간운일 때만. 소제목 판단용
  label?: string           // "올해" / "올해 중 몇 월" (시간운일 때만)
  groups: { category: string; items: SajuQuestion[] }[]
}

export default function QuestionPicker({
  ageGroup, gender, personName = '', ageLabel = '', onSubmit, onBack, unseEntry,
}: QuestionPickerProps) {
  // 시간운이면 kind별 섹션(올해/월별), 아니면 사주 한 섹션.
  const sections = useMemo<Section[]>(() => {
    if (unseEntry) {
      const list = unseQuestionsForEntry(unseEntry)
      return groupUnseByKind(list).map(g => ({ kind: g.kind, label: g.label, groups: g.groups }))
    }
    const list = questionsFor(ageGroup, gender)
    return [{ groups: groupByCategory(list) }]
  }, [unseEntry, ageGroup, gender])

  // 전 섹션의 질문을 평평하게 (전체선택/제출용)
  const list = useMemo<SajuQuestion[]>(
    () => sections.flatMap(s => s.groups.flatMap(g => g.items)),
    [sections],
  )
  const groups = useMemo(() => sections.flatMap(s => s.groups), [sections])
  const isUnse = !!unseEntry

  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [openCats, setOpenCats] = useState<Set<string>>(
    () => new Set(groups.length ? [groups[0].category] : [])
  )

  // ── 직접 물어보기 (자유 질문 1개) ──
  const [directText, setDirectText] = useState('')
  const [directQ, setDirectQ] = useState<SajuQuestion | null>(null)  // 확정된 직접질문(있으면 잠금)
  const [directHint, setDirectHint] = useState('')                   // 필터 안내문구

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

  function confirmDirect() {
    const text = directText.trim()
    // 전송 전 가벼운 필터: 너무 짧거나 빈 입력이면 안내만 (비용 0)
    if (text.length < 5) {
      setDirectHint('사주에 대해 궁금한 점을 조금 더 자세히 적어주세요.')
      return
    }
    const q: SajuQuestion = {
      id: 'direct_' + Date.now(),
      age: ageGroup,
      ageLabel: ageLabel || '',
      gender: 'all',
      category: '직접 질문',
      sub: '자유 질문',
      question: text,
      link: '사용자가 직접 입력한 질문입니다. 이 질문이 사주·운세·명리와 관련되면 이 사람의 사주 명식을 근거로 풀이하세요. 만약 사주와 무관한 질문(일상 잡담, 시사, 계산 등)이라면 억지로 답하지 말고 "사주에 관해 궁금한 점을 물어봐 주세요"라고 정중히 안내하세요.',
      detail: '사용자가 직접 입력한 자유 질문입니다. 이 질문이 사주·운세·명리와 관련되면 이 사람의 사주 명식과 용신·격국 등을 근거로 깊이 있게 풀이하세요. 사주와 무관한 질문이라면 억지로 답하지 말고 "사주에 관해 궁금한 점을 물어봐 주세요"라고 정중히 안내하세요.',
      enabled: true,
    }
    setDirectQ(q)
    setDirectHint('')
  }
  function cancelDirect() {
    setDirectQ(null)
    setDirectText('')
    setDirectHint('')
  }

  function submit() {
    const chosen = list.filter(q => picked.has(q.id))
    const all = directQ ? [...chosen, directQ] : chosen
    if (all.length === 0) return
    onSubmit(all)
  }

  const n = picked.size + (directQ ? 1 : 0)

  // 대분류 카드 하나 렌더 (사주·시간운 공용)
  function renderCategory({ category, items }: { category: string; items: SajuQuestion[] }) {
    const col = catColor(category)
    const gPicked = items.filter(q => picked.has(q.id)).length
    const allOn = gPicked === items.length
    const open = openCats.has(category)
    return (
      <div key={category} style={{ marginBottom: 10, border: `0.5px solid ${gPicked > 0 ? col + '55' : C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div onClick={() => toggleCat(category)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', background: gPicked > 0 ? catBg(category) : '#fff', cursor: 'pointer' }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: col }}>{category}</span>
          {gPicked > 0 && <span style={{ fontSize: 10, color: '#fff', background: col, borderRadius: 9, padding: '2px 7px' }}>{gPicked}</span>}
          <button type="button" onClick={(e) => { e.stopPropagation(); toggleCatAll(category, items) }} style={{ fontSize: 10, color: col, border: `0.5px solid ${col}88`, borderRadius: 8, padding: '3px 8px', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>{allOn ? '모두 해제' : '모두 담기'}</button>
          <span style={{ color: col, fontSize: 12 }}>{open ? '▾' : '▸'}</span>
        </div>
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
  }

  return (
    <div style={{ background: C.cardBg, borderRadius: 18, border: `0.5px solid ${C.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
      {/* 헤더 */}
      <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {onBack && <button type="button" onClick={onBack} style={{ color: C.subLight, fontSize: 18, cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>‹</button>}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.title }}>무엇이 궁금하세요?</div>
          <div style={{ fontSize: 10, color: C.point, marginTop: 1 }}>
            {personName && `${withNim(personName)} · `}{ageLabel && `${ageLabel} · `}궁금한 걸 마음껏 골라보세요
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
        {sections.map((sec, si) => (
          <div key={sec.kind ?? `sec${si}`}>
            {/* 시간운 소제목 (올해 / 올해 중 몇 월). 사주면 label 없어 안 나옴 */}
            {isUnse && sec.label && (
              <div style={{ fontSize: 11, fontWeight: 700, color: C.point, letterSpacing: 0.5, margin: si === 0 ? '2px 2px 8px' : '16px 2px 8px' }}>
                ━ {sec.label}
              </div>
            )}
            {sec.groups.map(renderCategory)}
          </div>
        ))}

        {/* ── 직접 물어보기 (맨 아래) ── */}
        <div style={{ marginTop: 6, border: `1px dashed #d8b89a`, borderRadius: 12, background: '#faf3ec', padding: '12px 13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>✏️</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#96502e' }}>직접 물어보기</span>
          </div>
          {directQ ? (
            <div>
              <div style={{ background: '#fff', border: '0.5px solid #e8d5c5', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, color: '#3a2e28', lineHeight: 1.5 }}>
                {directQ.question}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                <span style={{ fontSize: 11, color: '#4a9450', flex: 1 }}>✓ 아래 풀이에 함께 담겨요</span>
                <button type="button" onClick={cancelDirect} style={{ fontSize: 11, color: '#5c3a1e', border: '0.5px solid #e0c0a8', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', background: '#fff', fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>지우고 다시 쓰기</button>
              </div>
            </div>
          ) : (
            <div>
              <textarea
                value={directText}
                onChange={(e) => { setDirectText(e.target.value); if (directHint) setDirectHint('') }}
                placeholder="내 사주에 대해 궁금한 걸 자유롭게 적어보세요"
                style={{ width: '100%', boxSizing: 'border-box', minHeight: 52, background: '#fff', border: '0.5px solid #e8d5c5', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, color: '#3a2e28', resize: 'none', fontFamily: 'inherit', outline: 'none', lineHeight: 1.5 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                <span style={{ fontSize: 10.5, color: directHint ? '#c8783c' : '#c5a590', flex: 1, lineHeight: 1.5 }}>
                  {directHint || '위에서 고른 질문들과 함께 풀이돼요.'}
                </span>
                <button type="button" onClick={confirmDirect} style={{ fontSize: 12, color: '#fff', background: directText.trim() ? '#b46e46' : '#d8bfae', borderRadius: 8, padding: '6px 14px', cursor: directText.trim() ? 'pointer' : 'default', flexShrink: 0, border: 'none', fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>담기</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div style={{ padding: '11px 14px 15px', borderTop: `0.5px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={submit} disabled={n === 0} style={{ width: '100%', height: 46, background: n > 0 ? C.brown : C.disabled, border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: n > 0 ? 'pointer' : 'not-allowed' }}>
          {n > 0
            ? `${n}개 질문으로 ${unseEntry === 'daeun' ? '대운' : unseEntry === 'seyun' ? '세운' : '사주'} 풀이 받기`
            : '궁금한 것을 골라주세요'}
        </button>
      </div>
    </div>
  )
}
