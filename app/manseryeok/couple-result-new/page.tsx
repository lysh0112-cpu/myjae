'use client'

/**
 * 궁합 결과 (새 버전 · 껍데기 + 질문단계)
 * ─────────────────────────────────────────────
 * 흐름: 두 사람 선택(couple-input-new) → [이 화면] 질문 선택 → 결과(명식+등급+해설)
 *   · submitted === null  → 질문 선택 단계 (coupleQuestions 11개, 복수선택)
 *   · submitted = 질문id[] → 결과 단계 (명식 나란히 + 등급 + 통변)
 *   · submitted = []       → "전체 궁합 총평"(질문 안 고르고 전체)
 *
 * 질문 UI: 사주 QuestionPicker와 "같은 모양"(전체선택·복수선택·모두담기·체크박스)
 *   이되, 공용 QuestionPicker 부품은 건드리지 않고 이 페이지가 직접 렌더한다.
 *   (대규모 안정: 공용부품 회귀 위험 없음 — 내사주그림과 같은 원칙)
 *
 * 점수 표기: C안 — 숫자 숨기고 "등급"만 노출(상처 방지 + 공유 훅).
 *   [TODO] 실제 등급은 calcCoupleScore(...).grade 로 교체(지금은 가짜 고정).
 *   [TODO] 폭죽 연출 등급별 강도 차등(다음 단계).
 *
 * 계산/통변/저장은 [TODO] 자리로 표시. 지금은 화면 흐름만 확정.
 */

import { Suspense, useMemo, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CoupleWonguk from './components/CoupleWonguk'
import OhaengCompareCard from './components/OhaengCompareCard'
import CoupleInsightToggle from './components/CoupleInsightToggle'
import { calcSimsanOhaeng } from '@/lib/saju/simsanOhaeng'
import CoupleJudgeCard from './components/CoupleJudgeCard'
import CoupleFollowUp, { MAX_FOLLOWUPS, type FollowUp } from './components/CoupleFollowUp'
import { judgeCouple, type CoupleJudgeV1, type Gender } from '@/lib/saju/coupleFilterV1'
import { COUPLE_QUESTIONS, groupCoupleByCategory } from '@/lib/saju/coupleQuestions'
import { MARRIED_QUESTIONS } from '@/lib/saju/marriedQuestions'
import type { SajuQuestion } from '@/lib/saju/questions'
import { calcCoupleScore, type SajuPillarSimple, type CoupleScoreResult, type SolarInfo } from '@/lib/saju/coupleScore'
import { calcMarriedScore } from '@/lib/saju/marriedScore'
import { getGongmang } from '@/lib/saju/gongmang'
import { calcHourPillar } from '@/lib/saju/hourPillar'
import { buildCoupleTongbyeonPrompt, type CouplePerson } from '@/lib/saju/coupleTongbyeonPrompt'
import { saveCoupleRecord, getCoupleRecord, updateCoupleRecordResult } from '@/lib/saju/coupleRecords'
import type { SavedInputData } from '@/lib/saju/savedPeople'
import CoupleChatFab from '@/app/couple-chat/CoupleChatFab'

// 커플채팅 열림 스위치. 기능·부품은 그대로 살아 있고 입구만 닫아둔 상태.
// 되살릴 때는 이 한 줄만 true 로 바꾸면 시작 버튼과 플로팅이 함께 돌아온다.
const COUPLE_CHAT_OPEN = false
import ConsultButton from '@/app/components/common/ConsultButton'
import CopyTextButton from '@/app/components/common/CopyTextButton'
import { withNim } from '@/lib/saju/honorific'

type Mode = 'couple' | 'married'

const MODE_INFO: Record<Mode, { label: string; accent: string }> = {
  couple:  { label: '연인 궁합', accent: '#c85a8c' },
  married: { label: '부부 궁합', accent: '#c85a6e' },
}

// 대분류별 포인트색 (질문 화면 구분감)
const CAT_COLOR: Record<string, string> = {
  '끌림·첫인상': '#c85a8c',
  '성격·기질': '#9a6ec8',
  '소통·감정': '#3c82a0',
  '관계 지속성': '#3c9a6e',
  '갈등·주의점': '#c8783c',
  '속궁합·친밀감': '#c85a6e',
  '결혼·미래운': '#b46e46',
  '관계 조언·개운': '#6e50a0',
  '종합': '#96502e',
}
const catColor = (c: string) => CAT_COLOR[c] ?? '#b46e46'


function CoupleResultInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = (searchParams.get('mode') === 'married' ? 'married' : 'couple') as Mode
  const info = MODE_INFO[mode]

  const parse = (key: string): Record<string, string> => {
    try { return JSON.parse(decodeURIComponent(searchParams.get(key) || '{}')) } catch { return {} }
  }
  const person1 = parse('person1')
  const person2 = parse('person2')

  const name1 = person1.name || '첫 번째'
  const name2 = person2.name || '두 번째'

  // 보관함에서 "다시 보기"로 온 경우: recordId 있으면 질문 선택 건너뛰고 바로 결과(스냅샷)
  const recordId = searchParams.get('recordId') || undefined

  // ── 질문 선택 단계 상태 (사주 QuestionPicker와 동일: 복수선택) ──
  //   submitted === null → 질문 선택 화면
  //   submitted = 질문 배열(빈 배열이면 전체 총평) → 결과 화면
  // 부부(married)면 부부 전용 질문, 연인(couple)이면 기존 궁합 질문.
  // 두 세트 모두 동일한 SajuQuestion 형식이라 아래 로직·부품 그대로 재사용.
  const QUESTIONS = mode === 'married' ? MARRIED_QUESTIONS : COUPLE_QUESTIONS
  const groups = useMemo(() => groupCoupleByCategory(QUESTIONS), [QUESTIONS])
  const allIds = useMemo(() => QUESTIONS.map(q => q.id), [QUESTIONS])

  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [openCats, setOpenCats] = useState<Set<string>>(
    () => new Set(groups.length ? [groups[0].category] : [])
  )
  // ★2026-07-24 — 질문 고르기 화면을 건너뛴다. (연재쌤·대표님 지시)
  //
  //   [왜]
  //   질문 12개 카테고리를 미리 고르게 하면, 고객은 결과를 보기도 전에
  //   무엇이 궁금한지 정해야 한다. 결과(판정 카드)를 먼저 보여 드리고
  //   그 아래에서 자유 질문을 받는 쪽이 자연스럽다.
  //
  //   [어떻게]
  //   submitted 를 처음부터 [] 로 두면 질문 선택 단계를 지나 바로 결과로 간다.
  //   ([] = "고른 질문 없음 = 전체 총평". 원래 '그냥 전체 총평 볼래요' 버튼과 같은 값)
  //
  //   ⚠️ 화면 코드와 COUPLE_QUESTIONS / MARRIED_QUESTIONS 는 지우지 않았다.
  //      되살리려면 아래 상수를 true 로만 바꾸면 된다. 아래 로직은 그대로 살아 있다.
  const SHOW_QUESTION_PICKER = false
  const [submitted, setSubmitted] = useState<string[] | null>(
    (recordId || !SHOW_QUESTION_PICKER) ? [] : null
  )

  // ── 직접 물어보기 (자유 질문 1개) ──
  const [directText, setDirectText] = useState('')
  const [directQ, setDirectQ] = useState<SajuQuestion | null>(null)
  const [directHint, setDirectHint] = useState('')
  function confirmDirect() {
    const text = directText.trim()
    if (text.length < 5) { setDirectHint('궁합에 대해 궁금한 점을 조금 더 자세히 적어주세요.'); return }
    setDirectQ({
      id: 'direct_' + Date.now(),
      age: '30s', ageLabel: '', gender: 'all',
      category: '직접 질문', sub: '자유 질문', question: text,
      link: '사용자가 직접 입력한 질문입니다. 이 질문이 두 사람의 궁합·사주·명리와 관련되면 두 사람의 사주 명식을 근거로 풀이하세요. 사주와 무관한 질문이라면 억지로 답하지 말고 "궁합에 관해 궁금한 점을 물어봐 주세요"라고 정중히 안내하세요.',
      detail: '사용자가 직접 입력한 자유 질문입니다. 이 질문이 두 사람의 궁합·사주·명리와 관련되면 두 사람의 사주 명식을 근거로 깊이 있게 풀이하세요. 사주와 무관한 질문이라면 억지로 답하지 말고 "궁합에 관해 궁금한 점을 물어봐 주세요"라고 정중히 안내하세요.',
      enabled: true,
    })
    setDirectHint('')
  }
  function cancelDirect() { setDirectQ(null); setDirectText(''); setDirectHint('') }

  const toggleQ = (id: string) => setPicked(prev => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n
  })
  const toggleCat = (cat: string) => setOpenCats(prev => {
    const n = new Set(prev); if (n.has(cat)) n.delete(cat); else n.add(cat); return n
  })
  const toggleCatAll = (cat: string, items: typeof COUPLE_QUESTIONS) => {
    const ids = items.map(i => i.id)
    const allOn = ids.every(id => picked.has(id))
    setPicked(prev => {
      const n = new Set(prev)
      if (allOn) ids.forEach(id => n.delete(id)); else ids.forEach(id => n.add(id))
      return n
    })
    setOpenCats(prev => new Set(prev).add(cat))
  }
  const selectAll = () => { setPicked(new Set(allIds)); setOpenCats(new Set(groups.map(g => g.category))) }
  const clearAll = () => setPicked(new Set())

  // ────────────────────────────────────────────
  // 질문 선택 단계 (사주 화면과 동일한 모양: 전체선택·복수·모두담기)
  // ────────────────────────────────────────────
  if (submitted === null) {
    const nPicked = picked.size
    return (
      <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 5,
          background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
          borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {/* ★질문 고르기 화면의 뒤로가기 — 사람 고르는 입력 화면으로.
              router.back() 은 진입 경로에 따라 홈으로 튀었다. (2026-07-21) */}
          <button onClick={() => router.push(`/manseryeok/couple-input-new?mode=${mode}`)}
            style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>무엇이 궁금하세요?</div>
            <div style={{ fontSize: 10.5, color: '#8f3d0e', marginTop: 1 }}>{name1} ♥ {name2} · 궁금한 걸 마음껏 골라보세요</div>
          </div>
          <span style={{ width: 16 }} />
        </div>

        {/* 전체 선택/해제 */}
        <div style={{ padding: '10px 14px', display: 'flex', gap: 8, borderBottom: '0.5px solid #f5e5da' }}>
          <button onClick={selectAll} style={{ flex: 1, height: 34, background: '#fff3e9', border: '0.5px solid #e0c0a8', borderRadius: 9, color: '#96502e', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓ 전체 선택</button>
          <button onClick={clearAll} style={{ flex: 1, height: 34, background: '#fff', border: '0.5px solid #e8d5c5', borderRadius: 9, color: '#5c3a1e', fontSize: 12, cursor: 'pointer' }}>전체 해제</button>
        </div>

        {/* 대분류 목록 */}
        <div style={{ padding: '12px 14px 0' }}>
          {groups.map(({ category, items }) => {
            const col = catColor(category)
            const gPicked = items.filter(q => picked.has(q.id)).length
            const allOn = gPicked === items.length
            const open = openCats.has(category)
            return (
              <div key={category} style={{ marginBottom: 10, border: `0.5px solid ${gPicked > 0 ? col + '55' : '#f0e0d5'}`, borderRadius: 12, overflow: 'hidden' }}>
                <div onClick={() => toggleCat(category)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', background: gPicked > 0 ? col + '14' : '#fff', cursor: 'pointer' }}>
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
                        <div key={q.id} onClick={() => toggleQ(q.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px', borderRadius: 8, background: on ? col + '14' : 'transparent', marginBottom: 3, cursor: 'pointer' }}>
                          <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${on ? col : '#d8c4b4'}`, background: on ? col : '#fff', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on ? '✓' : ''}</span>
                          <span style={{ fontSize: 12.5, color: '#3a2e28' }}>{q.question}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── 직접 물어보기 (맨 아래) ── */}
        <div style={{ padding: '0 14px' }}>
          <div style={{ marginTop: 2, marginBottom: 4, border: '1px dashed #d8b89a', borderRadius: 12, background: '#faf3ec', padding: '12px 13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>✏️</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#96502e' }}>직접 물어보기</span>
            </div>
            {directQ ? (
              <div>
                <div style={{ background: '#fff', border: '0.5px solid #e8d5c5', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, color: '#3a2e28', lineHeight: 1.5 }}>{directQ.question}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                  <span style={{ fontSize: 11, color: '#4a9450', flex: 1 }}>✓ 아래 풀이에 함께 담겨요</span>
                  <button type="button" onClick={cancelDirect} style={{ fontSize: 11, color: '#5c3a1e', border: '0.5px solid #e0c0a8', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', background: '#fff', fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>지우고 다시 쓰기</button>
                </div>
              </div>
            ) : (
              <div>
                <textarea value={directText}
                  onChange={(e) => { setDirectText(e.target.value); if (directHint) setDirectHint('') }}
                  placeholder="두 사람 궁합에 대해 궁금한 걸 자유롭게 적어보세요"
                  style={{ width: '100%', boxSizing: 'border-box', minHeight: 52, background: '#fff', border: '0.5px solid #e8d5c5', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, color: '#3a2e28', resize: 'none', fontFamily: 'inherit', outline: 'none', lineHeight: 1.5 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                  <span style={{ fontSize: 10.5, color: directHint ? '#c8783c' : '#c5a590', flex: 1, lineHeight: 1.5 }}>{directHint || '위에서 고른 질문들과 함께 풀이돼요.'}</span>
                  <button type="button" onClick={confirmDirect} style={{ fontSize: 12, color: '#fff', background: directText.trim() ? '#b46e46' : '#d8bfae', borderRadius: 8, padding: '6px 14px', cursor: directText.trim() ? 'pointer' : 'default', flexShrink: 0, border: 'none', fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>담기</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 하단 버튼: 고른 질문으로 / 전체 총평 */}
        <div style={{ padding: '4px 14px 0' }}>
          <button onClick={() => setSubmitted([...picked])} disabled={nPicked === 0 && !directQ}
            style={{ width: '100%', height: 46, background: (nPicked > 0 || directQ) ? '#b46e46' : '#d8c4b4', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: (nPicked > 0 || directQ) ? 'pointer' : 'not-allowed' }}>
            {(nPicked + (directQ ? 1 : 0)) > 0 ? `${nPicked + (directQ ? 1 : 0)}개 질문으로 궁합 풀이 받기` : '궁금한 것을 골라주세요'}
          </button>
          <button onClick={() => setSubmitted([])}
            style={{ width: '100%', height: 42, background: 'transparent', border: '0.5px solid #d8c4b4', borderRadius: 12, color: '#96502e', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
            그냥 전체 궁합 총평 볼래요
          </button>
        </div>
      </main>
    )
  }

  // ────────────────────────────────────────────
  // 결과 단계 → 자식 컴포넌트에 위임 (명식 계산·등급·통변 훅 사용)
  // ────────────────────────────────────────────
  const pickedQuestions = [
    ...QUESTIONS.filter(q => submitted.includes(q.id)),
    ...(directQ ? [directQ] : []),
  ]

  return (
    <CoupleResultView
      mode={mode}
      info={info}
      person1={person1}
      person2={person2}
      name1={name1}
      name2={name2}
      pickedQuestions={pickedQuestions}
      directQ={directQ}
      recordId={recordId}
      /* ★2026-07-21: router.back() 은 브라우저 히스토리 한 칸 뒤로라
         진입 경로에 따라 홈으로 튀었다. 보관함으로 명시적으로 보낸다. */
      onBack={() => router.push(`/manseryeok/couple-storage?mode=${mode}`)}
      onOther={() => router.push(`/manseryeok/couple-input-new?mode=${mode}`)}
      onInviteChat={(grade?: string) => {
        // 두 사람 사주 + 궁합 등급을 방으로 넘겨 AI가 알게 함
        const compat = {
          person1, person2,
          name1, name2,
          grade: grade || '',
          mode,
        }
        const q = encodeURIComponent(JSON.stringify(compat))
        router.push(`/couple-chat/invite?compat=${q}`)
      }}
    />
  )
}

// 이름이 비었을 때 카피가 어색해지지 않게 방어
function dummyHeadlineSafe(s: string): string {
  return s.replace('undefined', '').replace('님과 님', '두 사람')
}

// ── 통변 텍스트 → 카드 아코디언 파싱 (사주/대운/연운 TongbyeonView와 동일 방식) ──
interface TCard { title: string; body: string; icon: string }
function tbIcon(t: string): string {
  if (t.includes('큰 그림') || t.includes('첫인상') || t.includes('만남')) return '✨'
  if (t.includes('끌림') || t.includes('사랑') || t.includes('인연')) return '💗'
  if (t.includes('성격') || t.includes('기질') || t.includes('마음')) return '🌙'
  if (t.includes('소통') || t.includes('대화')) return '🤝'
  if (t.includes('지속') || t.includes('오래')) return '🌿'
  if (t.includes('갈등') || t.includes('조심') || t.includes('주의')) return '⚠️'
  if (t.includes('속궁합') || t.includes('친밀')) return '💞'
  if (t.includes('결혼') || t.includes('미래') || t.includes('시기')) return '💍'
  if (t.includes('재물') || t.includes('돈')) return '💰'
  if (t.includes('개운') || t.includes('조언') || t.includes('살리는') || t.includes('맞춰')) return '🔮'
  return '🌟'
}
function tbClean(s: string): string {
  return s.replace(/^#{1,6}\s*/, '').replace(/^\s*[-*]{3,}\s*$/, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/^■\s*/, '').trim()
}
function parseTCards(text: string): { intro: string; cards: TCard[] } {
  const lines = text.split('\n')
  let intro = ''
  const cards: TCard[] = []
  let cur: { title: string; bodyLines: string[] } | null = null
  const isHeading = (ln: string) => /^\s*(#{1,6}\s*)?■/.test(ln) || /^\s*#{2,6}\s+/.test(ln)
  for (const ln of lines) {
    if (isHeading(ln)) {
      if (cur) cards.push({ title: tbClean(cur.title), body: cur.bodyLines.join('\n').trim(), icon: tbIcon(tbClean(cur.title)) })
      cur = { title: ln, bodyLines: [] }
    } else if (cur) { cur.bodyLines.push(ln) }
    else { const c = tbClean(ln); if (c) intro += (intro ? '\n' : '') + c }
  }
  if (cur) cards.push({ title: tbClean(cur.title), body: cur.bodyLines.join('\n').trim(), icon: tbIcon(tbClean(cur.title)) })
  return { intro, cards: cards.filter(c => c.title || c.body) }
}

// ============================================================================
// 결과 뷰: 두 사람 명식 계산 → 등급 → 통변 스트리밍
// ============================================================================
type PersonRaw = Record<string, string>
interface Mode2Info { label: string; accent: string }
const HANGUL_STEM: Record<string, string> = { 甲:'갑',乙:'을',丙:'병',丁:'정',戊:'무',己:'기',庚:'경',辛:'신',壬:'임',癸:'계' }
const pill = (s: string, b: string) => (s && b && s !== '?' ? `${s}${b}` : '모름')

// 시각 라벨(예: "진시") → hourIdx(0~11, 자시=0). couple-input의 hour는 "0"~"11" 또는 "모름"
function hourToIdx(hour: string | undefined): number | null {
  if (!hour || hour === '모름') return null
  const n = parseInt(hour)
  return isNaN(n) ? null : n
}

// /api/lunar 로 한 사람의 4기둥 계산
// 심산 오행 점수 계산에 필요한 양력 날짜·시지를 명식과 함께 담는다.
//   (월지 계절 치환 — 丑월=水, 未월=火 등 — 을 적용하려면 양력 날짜가 필요하다)
export interface PersonCalc {
  saju: SajuPillarSimple[]
  solarMonth: number
  solarDay: number
  hourBranch: string | null
}

async function calcOnePerson(p: PersonRaw): Promise<PersonCalc | null> {
  const calType = p.calType || '양력'
  const y = parseInt(p.year), m = parseInt(p.month), d = parseInt(p.day)
  if (!y || !m || !d) return null
  const leap = p.leapMonth || '0'
  const url = `/api/lunar?year=${y}&month=${m}&day=${d}&calType=${calType}&leapMonth=${leap}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.error) return null
  const split = (g: string) => {
    if (!g) return { stem: '?', branch: '?' }
    const mt = g.match(/\(([^)]+)\)/)
    if (mt && mt[1].length >= 2) return { stem: mt[1][0], branch: mt[1][1] }
    if (g.length >= 2) return { stem: g[0], branch: g[1] }
    return { stem: '?', branch: '?' }
  }
  const year = split(data.yearGanji), month = split(data.monthGanji), day = split(data.dayGanji)
  const hIdx = hourToIdx(p.hour)
  const hour = hIdx !== null ? calcHourPillar(day.stem, hIdx) : { stem: '?', branch: '?' }
  return {
    saju: [
      { pillar: '시주', stem: hour.stem, branch: hour.branch },
      { pillar: '일주', stem: day.stem, branch: day.branch },
      { pillar: '월주', stem: month.stem, branch: month.branch },
      { pillar: '년주', stem: year.stem, branch: year.branch },
    ],
    solarMonth: Number(data.solarMonth) || m,
    solarDay: Number(data.solarDay) || d,
    hourBranch: hour.branch === '?' ? null : hour.branch,
  }
}

function toCouplePerson(
  p: PersonRaw,
  saju: SajuPillarSimple[],
  solar?: { month: number; day: number; hourBranch: string | null } | null,
): CouplePerson {
  const find = (k: string) => saju.find(s => s.pillar === k)
  const y = find('년주'), mo = find('월주'), da = find('일주'), h = find('시주')
  const birth = p.year ? `${p.year}.${p.month}.${p.day}` : ''
  // 부부 궁합 통변의 나이대 톤 조절용 만 나이(대략). 생년만 있으면 계산.
  const birthYear = parseInt(p.year || '')
  const age = birthYear ? new Date().getFullYear() - birthYear : undefined
  return {
    name: p.name || '', gender: p.gender || '', birthLabel: birth,
    yearPillar: pill(y?.stem ?? '', y?.branch ?? ''),
    monthPillar: pill(mo?.stem ?? '', mo?.branch ?? ''),
    dayPillar: pill(da?.stem ?? '', da?.branch ?? ''),
    hourPillar: pill(h?.stem ?? '', h?.branch ?? ''),
    dayStem: da?.stem ?? '',
    age,
    // ★MBTI — 점수에는 안 쓰고 해설 참고용으로만 넘긴다. (궁합 설계서 3-2b)
    mbti: (p.mbti || '').trim().toUpperCase() || undefined,
    // ★ "서로 채워주는 용신·귀인" 계산용 양력 정보 (있을 때만)
    solarMonth: solar?.month,
    solarDay: solar?.day,
    hourBranch: solar?.hourBranch ?? null,
  }
}

function CoupleResultView({
  mode, info, person1, person2, name1, name2, pickedQuestions, directQ, recordId, onBack, onOther, onInviteChat,
}: {
  mode: 'couple' | 'married'
  info: Mode2Info
  person1: PersonRaw
  person2: PersonRaw
  name1: string
  name2: string
  pickedQuestions: SajuQuestion[]
  directQ?: SajuQuestion | null
  recordId?: string
  onBack: () => void
  onOther: () => void
  onInviteChat: (grade?: string) => void
}) {
  const [saju1, setSaju1] = useState<SajuPillarSimple[] | null>(null)
  const [saju2, setSaju2] = useState<SajuPillarSimple[] | null>(null)
  // 오행 비교 카드용 점수 (계산 시점에 c1/c2의 양력월·시지로 산출해 보관)
  const [ohaeng1, setOhaeng1] = useState<Record<string, number> | null>(null)
  const [ohaeng2, setOhaeng2] = useState<Record<string, number> | null>(null)
  // 해설 "서로 채워주는" 계산용 양력 정보 (c1/c2에서 보관)
  const [solar1, setSolar1] = useState<{ month: number; day: number; hourBranch: string | null } | null>(null)
  const [solar2, setSolar2] = useState<{ month: number; day: number; hourBranch: string | null } | null>(null)
  const [score, setScore] = useState<CoupleScoreResult | null>(null)
  const [calcErr, setCalcErr] = useState(false)

  // 통변
  const [tongLoading, setTongLoading] = useState(false)
  const [judge, setJudge] = useState<CoupleJudgeV1 | null>(null)
  // ── 자유 질문 (최대 3개) ──
  //   savedId: 저장된 행 id. 답이 올 때마다 이 id 로 update 한다.
  //   ⚠️ 교훈 K — setSavedId 직후 state 를 읽으면 아직 null 이다.
  //      항상 지역변수/인자로 넘긴다.
  const [savedId, setSavedId] = useState<string | null>(recordId ?? null)
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [fuLoading, setFuLoading] = useState(false)
  const [fuStreaming, setFuStreaming] = useState<FollowUp | null>(null)
  const [tongResult, setTongResult] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>(recordId ? 'saved' : 'idle')
  const [openCard, setOpenCard] = useState(0)
  const ranRef = useRef(false)

  // 보관함 다시보기: recordId 있으면 저장된 스냅샷을 그대로 로드 (재계산·AI 없음)
  useEffect(() => {
    if (!recordId) return
    let cancelled = false
    getCoupleRecord(recordId).then(rec => {
      if (cancelled) return
      const snap = rec?.resultData as {
        grade?: string; gradeDesc?: string
        saju1?: SajuPillarSimple[]; saju2?: SajuPillarSimple[]; tongResult?: string
        ohaeng1?: Record<string, number>; ohaeng2?: Record<string, number>
        judge?: CoupleJudgeV1
        followUps?: FollowUp[]
      } | undefined
      if (snap?.saju1 && snap?.saju2) {
        setSaju1(snap.saju1); setSaju2(snap.saju2)
        if (snap.ohaeng1 && snap.ohaeng2) { setOhaeng1(snap.ohaeng1); setOhaeng2(snap.ohaeng2) }
        if (snap.judge) setJudge(snap.judge)   // 옛 기록은 없다 → 판정 카드 생략
        if (snap.followUps) setFollowUps(snap.followUps)
        setScore({ grade: snap.grade || '', gradeDesc: snap.gradeDesc || '' } as CoupleScoreResult)
        setTongResult(snap.tongResult || '')
        ranRef.current = true       // 통변 재호출 막기
        setSaveState('saved')       // 이미 저장된 것
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [recordId])

  // 두 사람 명식 계산 + 등급 (새 궁합일 때만 — recordId 있으면 스냅샷 사용)
  useEffect(() => {
    if (recordId) return
    let cancelled = false
    async function run() {
      try {
        const [c1, c2] = await Promise.all([calcOnePerson(person1), calcOnePerson(person2)])
        if (cancelled) return
        if (!c1 || !c2) { setCalcErr(true); return }
        const s1 = c1.saju, s2 = c2.saju
        setSaju1(s1); setSaju2(s2)
        // 오행 비교 카드용: c1/c2의 양력월·시지로 심산 오행 점수 산출해 보관
        setOhaeng1(calcSimsanOhaeng(s1, c1.solarMonth, c1.solarDay, c1.hourBranch))
        setOhaeng2(calcSimsanOhaeng(s2, c2.solarMonth, c2.solarDay, c2.hourBranch))
        setSolar1({ month: c1.solarMonth, day: c1.solarDay, hourBranch: c1.hourBranch })
        setSolar2({ month: c2.solarMonth, day: c2.solarDay, hourBranch: c2.hourBranch })
        const ilju1 = s1.find(p => p.pillar === '일주')
        const ilju2 = s2.find(p => p.pillar === '일주')
        const gm1 = ilju1 ? getGongmang(ilju1.stem, ilju1.branch) : ['', ''] as [string, string]
        const gm2 = ilju2 ? getGongmang(ilju2.stem, ilju2.branch) : ['', ''] as [string, string]
        // 심산 오행 점수(월지 계절 치환)를 쓰도록 두 사람의 양력 날짜·시지를 넘긴다.
        const dates: [SolarInfo, SolarInfo] = [
          { month: c1.solarMonth, day: c1.solarDay, hourBranch: c1.hourBranch },
          { month: c2.solarMonth, day: c2.solarDay, hourBranch: c2.hourBranch },
        ]
        // 부부(married)는 부부 전용 계산식(조후·월주 가중 + 원진/귀문/구응),
        // 연인(couple)은 기존 계산식.
        setScore(
          mode === 'married'
            ? calcMarriedScore(s1, s2, gm1, gm2, dates)
            : calcCoupleScore(s1, s2, gm1, gm2, dates)
        )
        // ★2026-07-24 — 심산 기준 판정(점수·등급 없음).
        //   성별이 있어야 남=재성 / 여=관성으로 갈린다. 없으면 판정을 만들지 않는다.
        //   (조용히 기본값을 넣으면 남녀가 뒤바뀐 판정이 나온다 — 교훈 R·U)
        const g1 = person1.gender === '남' || person1.gender === '여' ? person1.gender as Gender : null
        const g2 = person2.gender === '남' || person2.gender === '여' ? person2.gender as Gender : null
        if (g1 && g2) {
          setJudge(judgeCouple(
            { name: name1, gender: g1, saju: s1, solarMonth: c1.solarMonth, solarDay: c1.solarDay, hourBranch: c1.hourBranch },
            { name: name2, gender: g2, saju: s2, solarMonth: c2.solarMonth, solarDay: c2.solarDay, hourBranch: c2.hourBranch },
          ))
        }
      } catch { if (!cancelled) setCalcErr(true) }
    }
    run()
    return () => { cancelled = true }
  }, [person1, person2, recordId, mode])

  // 통변 스트리밍 (새 궁합, 계산 끝나면 자동 1회 — recordId면 스냅샷이라 안 함)
  useEffect(() => {
    if (recordId || !saju1 || !saju2 || !score || ranRef.current) return
    ranRef.current = true
    let cancelled = false
    async function runTongbyeon() {
      setTongLoading(true); setTongResult(null)
      let acc = ''
      try {
        const prompt = buildCoupleTongbyeonPrompt(
          { mode, person1: toCouplePerson(person1, saju1!, solar1), person2: toCouplePerson(person2, saju2!, solar2), score: score! },
          pickedQuestions,
        )
        const res = await fetch('/api/tongbyeon', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemPrompt: prompt, premium: false }),
        })
        if (!res.ok || !res.body) { if (!cancelled) setTongResult('통변을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'); return }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done || cancelled) break
          for (const line of decoder.decode(value).split('\n')) {
            if (!line.startsWith('data: ')) continue
            const dstr = line.slice(6)
            if (dstr === '[DONE]') continue
            try { const parsed = JSON.parse(dstr); if (parsed.text) { acc += parsed.text; if (!cancelled) setTongResult(acc) } } catch {}
          }
        }
      } catch { if (!cancelled) setTongResult('통변을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.') }
      finally {
        if (!cancelled) {
          setTongLoading(false)
          // ★통변이 끝나면 바로 보관함에 저장한다. (2026-07-21 2차)
          //   acc 를 인자로 넘기는 이유는 setTongResult 가 아직 state 에 반영되기 전이기 때문.
          //   다시보기(recordId)면 이미 'saved' 라 handleSave 가 그냥 빠져나온다.
          if (acc.trim()) handleSave(acc)
        }
      }
    }
    runTongbyeon()
    return () => { cancelled = true }
  }, [saju1, saju2, score, mode, person1, person2, pickedQuestions, recordId])

  const headline = dummyHeadlineSafe(`${withNim(name1)}과 ${withNim(name2)}, 두 사람의 만남`)
  const isMe1 = person1.isMe === 'true' || person1.isMe === '1'
  const { intro: tbIntro, cards: tbCards } = useMemo(
    () => (tongResult ? parseTCards(tongResult) : { intro: '', cards: [] }),
    [tongResult],
  )

  // 보관함에 저장 (두 사람 + 등급 + 결과 스냅샷)
  //   ★2026-07-21 2차: 자동 저장. 통변이 끝나면 스스로 호출된다.
  //     tongOverride 는 setTongResult 반영 전이라 인자로 받는다.
  async function handleSave(tongOverride?: string) {
    if (!saju1 || !saju2 || !score) return
    if (saveState !== 'idle' && saveState !== 'failed') return
    setSaveState('saving')
    // person raw → SavedInputData 형태로 정리
    const toInput = (p: PersonRaw): SavedInputData & { name?: string } => ({
      gender: p.gender || '', calType: p.calType || '양력',
      year: p.year || '', month: p.month || '', day: p.day || '',
      leapMonth: p.leapMonth || '0', hour: p.hour || '모름', name: p.name || '',
    })
    // 결과 스냅샷 — 다시보기용(등급·명식·통변). grade는 목록 표시에도 씀.
    const snapshot = {
      // ★grade 는 보관함 목록 배지로 쓰인다. 점수제를 버렸으므로
      //   심산 판정에서 뽑은 상태 문구(judge.badge)를 넣는다.
      //   판정이 없으면(성별 미입력 등) 옛 등급으로 물러선다.
      grade: judge?.badge || score.grade,
      gradeDesc: score.gradeDesc,
      judge,              // 심산 판정 — 다시보기 시 재계산 없이 그대로 그린다
      saju1, saju2,
      ohaeng1, ohaeng2,   // 오행 비교 카드용 (다시보기 시 재계산 없이 사용)
      tongResult: tongOverride ?? tongResult ?? '',
      followUps,
      questionIds: pickedQuestions.filter(q => !q.id.startsWith('direct_')).map(q => q.id),
      directQuestion: directQ || null,
    }
    const res = await saveCoupleRecord({
      mode,
      name1, name2,
      relation: mode === 'married' ? '부부' : '연인',
      grade: judge?.badge || score.grade,
      input1: toInput(person1),
      input2: toInput(person2),
      resultData: snapshot,
    })
    if (res.ok && res.id) setSavedId(res.id)
    setSaveState(res.ok ? 'saved' : 'failed')
  }

  // ── 자유 질문 (최대 3개) ──
  //   총평 통변과 같은 /api/tongbyeon 을 쓰되, 질문 하나만 담아 보낸다.
  //   답이 끝나면 그 자리에서 result_data 를 덮어써(update) 보관함에 남긴다.
  //   ⚠️ 교훈 K — 저장 함수에 넘기는 목록·id 는 state 가 아니라 지역변수를 쓴다.
  async function askFollowUp(question: string) {
    if (!saju1 || !saju2 || !score) return
    if (followUps.length >= MAX_FOLLOWUPS || fuLoading) return

    setFuLoading(true)
    setFuStreaming({ q: question, a: '' })
    let acc = ''
    try {
      const fq: SajuQuestion = {
        id: 'follow_' + Date.now(),
        age: '30s', ageLabel: '', gender: 'all',
        category: '직접 질문', sub: '자유 질문', question,
        link: '사용자가 직접 입력한 질문입니다. 두 사람의 사주 명식을 근거로 풀이하세요. 사주와 무관하면 정중히 안내하세요.',
        detail: '사용자가 직접 입력한 자유 질문입니다. 두 사람의 사주 명식을 근거로 깊이 있게 풀이하세요. 사주와 무관하면 억지로 답하지 말고 정중히 안내하세요.',
        enabled: true,
      }
      const prompt = buildCoupleTongbyeonPrompt(
        { mode, person1: toCouplePerson(person1, saju1, solar1), person2: toCouplePerson(person2, saju2, solar2), score },
        [fq],
      )
      const res = await fetch('/api/tongbyeon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: prompt, premium: false }),
      })
      if (!res.ok || !res.body) {
        acc = '풀이를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
      } else {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          for (const line of decoder.decode(value).split('\n')) {
            if (!line.startsWith('data: ')) continue
            const d = line.slice(6)
            if (d === '[DONE]') continue
            try {
              const parsed = JSON.parse(d)
              if (parsed.text) { acc += parsed.text; setFuStreaming({ q: question, a: acc }) }
            } catch {}
          }
        }
      }
    } catch {
      acc = '풀이를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
    } finally {
      const next = [...followUps, { q: question, a: acc }]
      setFollowUps(next)
      setFuStreaming(null)
      setFuLoading(false)
      // 보관함에 덮어쓰기 — next(지역변수)를 넘긴다. state 는 아직 반영 전이다.
      if (savedId) {
        await updateCoupleRecordResult(savedId, {
          grade: judge?.badge || score.grade,
          gradeDesc: score.gradeDesc,
          judge,
          saju1, saju2, ohaeng1, ohaeng2,
          tongResult: tongResult ?? '',
          followUps: next,
        })
      }
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>{info.label} 결과</div>
      </div>

      <div style={{ padding: '16px 14px' }}>
        {/* ① 머리말 — 등급·폭죽을 걷어냈다. (점수제 폐기 2026-07-24)
               GradeFireworks.tsx 는 지우지 않았다. 되돌릴 때 필요하다. */}
        {!judge && (
          <div style={{ background: info.accent, borderRadius: 14, padding: '30px 16px', textAlign: 'center', marginBottom: 10, color: '#fff', fontSize: 13 }}>
            {calcErr ? '두 사람 정보를 다시 확인해 주세요.' : '두 사람의 인연을 살펴보는 중…'}
          </div>
        )}

        {/* ②③ 두 사람 명식 */}
        <CoupleWonguk
          left={{ name: name1, birth: person1.year ? `${person1.year}.${person1.month}.${person1.day}` : '', isMe: isMe1, saju: saju1 ?? [] }}
          right={{ name: name2, birth: person2.year ? `${person2.year}.${person2.month}.${person2.day}` : '', saju: saju2 ?? [] }}
        />

        {/* ③-b 궁합 시각화 — 부부는 오행만, 연인은 오행+MBTI 토글 */}
        {ohaeng1 && ohaeng2 && (
          <div style={{ marginTop: 10 }}>
            {mode === 'married' ? (
              <OhaengCompareCard
                aScores={ohaeng1}
                bScores={ohaeng2}
                aLabel={person1.gender === '남' ? '남편' : person1.gender === '여' ? '아내' : name1}
                bLabel={person2.gender === '남' ? '남편' : person2.gender === '여' ? '아내' : name2}
              />
            ) : (
              <CoupleInsightToggle
                aScores={ohaeng1}
                bScores={ohaeng2}
                name1={name1}
                name2={name2}
                mbti1={person1.mbti}
                mbti2={person2.mbti}
              />
            )}
          </div>
        )}

        {/* ③-c 심산 판정 — 별표 6개 카테고리 + 총평 (2026-07-24 신규) */}
        {judge && <CoupleJudgeCard judge={judge} />}

        {/* ④ 통변 — 질문별 카드 아코디언 (사주/대운/연운과 통일) */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingLeft: 2 }}>
            <span style={{ color: '#8f3d0e' }}>✦</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#96502e' }}>두 사람의 궁합 이야기</span>
          </div>

          {tongLoading && !tongResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 24, color: '#5c3a1e', fontSize: 13, background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12 }}>
              <span style={{ fontSize: 28, display: 'inline-block', animation: 'spin 1.1s linear infinite', color: '#8f3d0e' }}>✦</span>
              <span>두 사람의 인연을 찬찬히 살펴보는 중이에요…</span>
              <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : tongResult ? (
            <>
              {tbIntro && (
                <div style={{ fontSize: 12.5, color: '#5c3a1e', lineHeight: 1.8, marginBottom: 10, paddingLeft: 2 }}>{tbIntro}</div>
              )}
              {tbCards.map((c, i) => {
                const open = tongLoading ? i === tbCards.length - 1 : openCard === i
                return (
                  <div key={i} style={{ background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
                    <div onClick={() => setOpenCard(open ? -1 : i)}
                      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 14px', cursor: 'pointer' }}>
                      <span style={{ fontSize: 16 }}>{c.icon}</span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#96502e', lineHeight: 1.35 }}>{c.title}</span>
                      <span style={{ color: '#8f3d0e', fontSize: 12, transition: 'transform .25s', transform: `rotate(${open ? '180' : '0'}deg)` }}>▾</span>
                    </div>
                    <div style={{ maxHeight: open ? '3000px' : '0', overflow: 'hidden', transition: 'max-height .3s ease' }}>
                      <div style={{ fontSize: 13.5, lineHeight: 1.85, color: '#3a2e28', whiteSpace: 'pre-wrap', padding: '0 14px 14px' }}>{c.body}</div>
                    </div>
                  </div>
                )
              })}
              {tongLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 4px', color: '#5c3a1e', fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#b46e46', animation: 'tbpulse 1s infinite' }} />
                  정성껏 풀이하고 있어요…
                  <style>{`@keyframes tbpulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: '#5c3a1e', lineHeight: 1.8, background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
              두 사람의 명식을 준비하는 중이에요…
            </div>
          )}
        </div>

        {/* ⑤ 자유 질문 (최대 3개) — 2026-07-24 신규 */}
        {judge && (
          <CoupleFollowUp
            items={followUps}
            onAsk={askFollowUp}
            loading={fuLoading}
            streaming={fuStreaming}
          />
        )}

        {/* 저장 상태 — 자동 저장이라 누르는 버튼이 아니다. (2026-07-21 2차)
            실패했을 때만 [다시 저장]으로 바뀐다.
            ⚠️ idle(아직 저장 시작 전 = 통변 실패 등)일 때는 아무것도 안 띄운다.
               안 그러면 '저장 중…'이 영원히 남는다. */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {saveState === 'failed' ? (
            <button onClick={() => handleSave()}
              style={{
                flex: 1, borderRadius: 11, padding: 12, fontSize: 13, cursor: 'pointer',
                background: '#b46e46', border: 'none', color: '#fff',
              }}>
              💾 다시 저장하기
            </button>
          ) : saveState === 'idle' ? (
            <div style={{ flex: 1 }} />
          ) : (
            <div style={{
              flex: 1, borderRadius: 11, padding: 12, fontSize: 13, textAlign: 'center',
              background: saveState === 'saved' ? '#eef5e8' : '#f7f2ec',
              color: saveState === 'saved' ? '#4a7a3a' : '#6b5340',
            }}>
              {saveState === 'saved' ? '✓ 보관함에 저장됐어요' : '저장 중…'}
            </div>
          )}
          <button onClick={onOther} style={{ flex: 1, background: '#b46e46', border: 'none', borderRadius: 11, padding: 12, fontSize: 13, color: '#fff', cursor: 'pointer' }}>다른 궁합 보기</button>
        </div>

        {/* ★해설 복사 — 카톡 등에 붙여넣기 (공용 부품) */}
        <CopyTextButton
          text={tongResult}
          label={mode === 'married' ? '부부 궁합 분석' : '궁합 분석'}
        />

        {/* 전문가 상담 — 저장 표시 아래.
            ★ 연인/부부가 서로 다른 가격표(price_key)를 쓴다.
              관리자 > 가격 관리에서 '노출'이 꺼져 있으면 ConsultButton이
              스스로 null을 돌려주므로 이 영역 전체가 보이지 않는다. */}
        {(
          <div style={{ marginTop: 12 }}>
            <ConsultButton
              priceKey={mode === 'married' ? 'married' : 'couple'}
              mode={mode}
              /* ★고객이 본 궁합 결과를 상담사에게 넘긴다 (2026-07-21)
                 couples 테이블(점수·두 사람 명식) + ai_analysis(통변) 두 벌을 담는다. */
              payload={() => {
                if (!score) return null
                return {
                  aiAnalysis: (tongResult || '').trim() || undefined,
                  coupleFull: {
                    person_a_birth: person1,
                    person_b_birth: person2,
                    mode,
                    result: {
                      totalScore: score.totalScore,
                      grade: score.grade,
                      gradeDesc: score.gradeDesc,
                      scoreDetails: score as unknown as Record<string, number | boolean | undefined>,
                    },
                  },
                }
              }}
            />
          </div>
        )}

        {/* 커플 채팅 초대 — 연인 궁합에서만 (부부 제외)
            ⚠ 2026-07-19: 커플채팅 당분간 닫음. 되살리려면 위 COUPLE_CHAT_OPEN 을 true 로. */}
        {COUPLE_CHAT_OPEN && mode !== 'married' && (
          <button onClick={() => onInviteChat(score?.grade)}
            style={{
              width: '100%', marginTop: 10, borderRadius: 11, padding: 13,
              background: '#fbeaf0', border: '0.5px solid #f0c9d8',
              color: '#993556', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            💗 이 사람과 커플 채팅 시작하기
          </button>
        )}

        {/* 참고용 안내 — 결과에 과몰입하지 않도록 다정하게 */}
        <div style={{
          marginTop: 18, padding: '13px 14px', borderRadius: 11,
          background: '#faf3ec', border: '0.5px solid #f0e0d5',
          fontSize: 11.5, lineHeight: 1.7, color: '#5c3a1e', textAlign: 'center',
        }}>
          이 풀이는 두 분을 더 깊이 이해하기 위한 다정한 참고예요.<br />
          인연을 정하는 건 사주가 아니라 두 사람의 마음과 노력이랍니다. 🌿
        </div>
      </div>
      {COUPLE_CHAT_OPEN && mode !== 'married' && <CoupleChatFab />}
    </main>
  )
}

export default function CoupleResultNewPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <CoupleResultInner />
    </Suspense>
  )
}
