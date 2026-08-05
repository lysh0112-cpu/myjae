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
 *   ★2026-07-26 — 옛 [TODO] "등급은 calcCoupleScore(...).grade 로 교체" 는 폐기.
 *     점수제 자체를 버렸다. 등급 자리에는 심산 판정 배지(judge.badge)가 들어간다.
 *   [TODO] 폭죽 연출 등급별 강도 차등(다음 단계).
 *
 * 계산/통변/저장은 [TODO] 자리로 표시. 지금은 화면 흐름만 확정.
 */

import { Suspense, useMemo, useState, useEffect, useRef } from 'react'
// ⚠️ spouseSectionTitle 은 CoupleJudgeCard 가 쓰던 것입니다. 되살릴 때 필요해 «남겨 둡니다» (2026-08-02)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { coupleKindOfPair, coupleTitleOf, spouseFortuneTitle, spouseSectionTitle, COUPLE_PRICE_KEY, type CoupleKind } from '@/lib/saju/coupleRelation'
import { useRouter, useSearchParams } from 'next/navigation'
import CoupleWonguk from './components/CoupleWonguk'
import OhaengCompareCard from './components/OhaengCompareCard'
// ★2026-07-26 — 옛 점수제(coupleScore.ts)를 걷어내면서, 거기 있던
//   SajuPillarSimple 타입을 simsanOhaeng 의 Pillar 로 갈아탄다. (구조가 완전히 같다)
import { calcSimsanOhaeng, type Pillar as SajuPillarSimple } from '@/lib/saju/simsanOhaeng'
// ⚠️ CoupleJudgeCard 는 «지우지 않았습니다» — 되살릴 때 필요합니다 (2026-08-02)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import CoupleJudgeCard from './components/CoupleJudgeCard'
// ★목업 정본 리포트 (44부 22차)
import CoupleReport, { type ReportSection } from './components/CoupleReport'
// ★A4 궁합서 (2026-08-03)
import { openCoupleCertificate, type CertPerson } from './components/CoupleCertificate'
import { elOfStem, elOfBranch } from '@/lib/saju/ohaengColor'
// ★닮음·채움은 «한 창구» 에서만 (화면과 같은 값이라야 합니다)
import { compareOhaeng } from '@/lib/saju/ohaengCompare'
import CoupleFollowUp, { MAX_FOLLOWUPS, type FollowUp } from './components/CoupleFollowUp'
import { judgeCouple, type CoupleJudgeV1, type Gender } from '@/lib/saju/coupleFilterV1'
import { COUPLE_QUESTIONS, groupCoupleByCategory } from '@/lib/saju/coupleQuestions'
import { MARRIED_QUESTIONS } from '@/lib/saju/marriedQuestions'
import type { SajuQuestion } from '@/lib/saju/questions'
// ★2026-07-26 — 옛 점수제 삭제 (대표님 지시)
//   coupleScore.ts(calcCoupleScore)·marriedScore.ts(calcMarriedScore)를 저장소에서 지웠다.
//   [왜] 26부에서 화면 판정을 심산(judgeCouple)으로 완전히 바꿨는데도
//        옛 100점 만점 계산이 뒤에서 계속 돌며 등급·점수를 만들어,
//        보관함 배지·상담사 화면에 "87점 / 천생연분" 같은 다른 계산이 새어 나갔다.
//        심산 궁합론에는 종합 점수식이 없다(238쪽). 두 벌을 굴릴 이유가 없다.
//   [무엇으로 대체] 등급 문구는 judge.badge 하나로 통일한다.
//   ⚠️ 되살릴 일은 없다고 보지만, 필요하면 git 이력에서 두 파일을 꺼내면 된다.
import { calcHourPillar } from '@/lib/saju/hourPillar'
import { toCoupleTongbyeonMaterial, type CouplePersonInput } from '@/lib/saju/toCoupleTongbyeonInput'
import { buildCouplePrompt, type CoupleRelationKind } from '@/lib/saju/buildCouplePrompt'
import { saveCoupleRecord, getCoupleRecord, updateCoupleRecordResult } from '@/lib/saju/coupleRecords'
import type { SavedInputData } from '@/lib/saju/savedPeople'

// ★2026-07-27 — 커플채팅을 걷어냈다. (대표님 지시: 테스트였으므로 전부 삭제)
//   전에는 COUPLE_CHAT_OPEN=false 스위치로 입구만 닫아 두고 CoupleChatFab 을
//   그대로 import 하고 있었다. 화면에는 안 보였지만 import 는 살아 있었으므로,
//   app/couple-chat 을 지우는 순간 이 화면 전체가 "Module not found" 로 깨졌을 것이다.
//   ★화면에 안 보인다고 참조가 끊긴 것이 아니다. (교훈 AM 의 짝)
//
//   ⚠️ 상담사–고객 채팅은 별개이며 살아 있다. 함께 지우지 말 것.
import ConsultButton from '@/app/components/common/ConsultButton'
import CopyTextButton from '@/app/components/common/CopyTextButton'
import { withNim } from '@/lib/saju/honorific'
import { LINE_OUTER } from '@/lib/ui/line'

type Mode = 'couple' | 'married'

// ★2026-07-25 — 새 심산 통변 엔진으로 자동 총평을 켠다. (대표님 지시)
//   결제 관문만 빼고 새 부품과 완전히 연결. 옛 coupleScore 통변은 차단.
const SHOW_AUTO_TONGBYEON = true

// ★2026-07-24 — "더 궁금한 것"(AI 자유 질문) 섹션을 화면에서 내린다. (대표님 지시)
//
//   [무엇이 없어지나]
//   · "더 궁금한 것" 라벨 · 지난 문답 카드 · "무엇이든 물어보세요" 입력칸
//   · 새로 물어볼 길이 없으므로 궁합에서 /api/tongbyeon 호출이 0 이 된다.
//
//   [코드는 남겨 둔다]
//   · CoupleFollowUp.tsx · askFollowUp() · followUps 상태·저장 로직
//   · 이 상수만 true 로 바꾸면 그대로 돌아온다.
const SHOW_FOLLOWUP = false

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


  const parse = (key: string): Record<string, string> => {
    try { return JSON.parse(decodeURIComponent(searchParams.get(key) || '{}')) } catch { return {} }
  }
  const person1 = parse('person1')
  const person2 = parse('person2')

  const name1 = person1.name || '첫 번째'
  const name2 = person2.name || '두 번째'

  // ★2026-07-24 — 메뉴를 하나로 합쳤다. 부부/연인은 '관계'로 가른다.
  //   URL 의 mode 는 옛 링크 호환용일 뿐, 관계가 우선이다.
  const kind = coupleKindOfPair(person1.relation, person2.relation)
  const mode: Mode = kind === 'married' ? 'married' : 'couple'
  const info = { ...MODE_INFO[mode], label: coupleTitleOf(kind) }

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
          borderBottom: LINE_OUTER, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
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
        <div style={{ padding: '10px 14px', display: 'flex', gap: 8, borderBottom: LINE_OUTER }}>
          <button onClick={selectAll} style={{ flex: 1, height: 34, background: '#fff3e9', border: LINE_OUTER, borderRadius: 9, color: '#96502e', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓ 전체 선택</button>
          <button onClick={clearAll} style={{ flex: 1, height: 34, background: '#fff', border: LINE_OUTER, borderRadius: 9, color: '#5c3a1e', fontSize: 12, cursor: 'pointer' }}>전체 해제</button>
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
                  <span aria-hidden style={{ color: col, fontSize: 22, lineHeight: 1, padding: '4px 2px', display: 'inline-block' }}>{open ? '▾' : '▸'}</span>
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
          <div style={{ marginTop: 2, marginBottom: 4, border: '1px dashed #9c7a58', borderRadius: 12, background: '#faf3ec', padding: '12px 13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>✏️</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#96502e' }}>직접 물어보기</span>
            </div>
            {directQ ? (
              <div>
                <div style={{ background: '#fff', border: LINE_OUTER, borderRadius: 10, padding: '10px 12px', fontSize: 12.5, color: '#3a2e28', lineHeight: 1.5 }}>{directQ.question}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                  <span style={{ fontSize: 11, color: '#4a9450', flex: 1 }}>✓ 아래 풀이에 함께 담겨요</span>
                  <button type="button" onClick={cancelDirect} style={{ fontSize: 11, color: '#5c3a1e', border: LINE_OUTER, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', background: '#fff', fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>지우고 다시 쓰기</button>
                </div>
              </div>
            ) : (
              <div>
                <textarea value={directText}
                  onChange={(e) => { setDirectText(e.target.value); if (directHint) setDirectHint('') }}
                  placeholder="두 사람 궁합에 대해 궁금한 걸 자유롭게 적어보세요"
                  style={{ width: '100%', boxSizing: 'border-box', minHeight: 52, background: '#fff', border: LINE_OUTER, borderRadius: 10, padding: '9px 12px', fontSize: 12.5, color: '#3a2e28', resize: 'none', fontFamily: 'inherit', outline: 'none', lineHeight: 1.5 }} />
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
            style={{ width: '100%', height: 42, background: 'transparent', border: LINE_OUTER, borderRadius: 12, color: '#96502e', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
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
      kind={kind}
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
    />
  )
}

// 판정 결과를 상담사용 텍스트로 — 화면과 같은 내용을 글로 풀어 넘긴다.
//   (자동 통변을 걷어낸 뒤, 상담사가 고객이 본 것을 알 수 있게 하려고 만들었다)
//
// ★2026-07-26 — 내부 지시문 걸러내기.
//   판정 문구에는 통변 엔진에게만 하는 말("(순화해서 전할 것)")이 섞일 수 있다.
//   근원(coupleFilterV1)에서 reasons 로 옮겼지만, 앞으로 누가 또 lines 에 적을 수 있으니
//   내보내는 문 앞에서 한 번 더 훑어낸다. 두 겹으로 막는다.
//   ⚠️ reasons 는 여기서 아예 쓰지 않는다 — 통변 전용 재료이고, 고객이 볼 글이 아니다.
function stripInternalMarks(s: string): string {
  return s.replace(/\s*\((?:순화해서 전할 것|순화)\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}
function judgeToText(j: CoupleJudgeV1): string {
  // ══════════════════════════════════════════════════════════════
  //  ★★2026-08-02 — 재료에서 «별표를 뺐습니다» (대표님 확정)
  //    "점수제는 없애고 «깊이» 로 상대하자"
  //    "별점은 없애고 «프리미엄 해설» 로 대신하는 걸로 하자"
  //
  //  ⚠️⚠️ 화면에서만 끄면 «모자랍니다» —
  //     이 글은 «AI 재료» 로 갑니다. 별을 보여 주면 AI 가
  //     "★★★★★인 자리라 아주 좋습니다" 처럼 «별을 근거로» 풀어 버립니다.
  //     ⇒ 화면에는 별이 없는데 글에는 별 이야기가 남는 어긋남이 생깁니다.
  //  ★그래서 재료에서도 «뺍니다». 판정(stars 값)은 그대로 살아 있습니다.
  //
  //  ⚠️ 「본문도 별도 없는 카드는 건너뛴다」는 조건은 «그대로» 둡니다 —
  //     stars 값 자체는 남아 있으므로 부부운·자식운 카드가 여전히 걸러집니다.
  // ══════════════════════════════════════════════════════════════
  const lines: string[] = ['■ 궁합 판정', `한줄: ${j.badge}`, '']
  for (const c of j.cats) {
    // 본문도 별도 없는 카드(부부운·자식운)는 통변 본문에 내용이 담기므로 제목만 남기지 않는다.
    if (!c.lines.length && !c.dual?.length && !c.stars) continue
    lines.push(`[${c.title}]`)
    c.lines.forEach(l => lines.push(`  - ${stripInternalMarks(l)}`))
    c.dual?.forEach(d => lines.push(`  - ${stripInternalMarks(d.text)}`))
    lines.push('')
  }
  if (j.good.length) { lines.push('· 도움이 되는 자리'); j.good.forEach(t => lines.push(`  - ${stripInternalMarks(t)}`)) }
  if (j.watch.length) { lines.push('· 살피면 좋은 자리'); j.watch.forEach(t => lines.push(`  - ${stripInternalMarks(t)}`)) }
  if (j.note.length) { lines.push('· 알아두면 좋은 점'); j.note.forEach(t => lines.push(`  - ${stripInternalMarks(t)}`)) }
  return lines.join('\n')
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
  // ★2026-08-02 — 프리미엄 궁합 새 대목 셋 (4차)
  //   ⚠️ 「시기」가 앞줄(결혼·미래)에 걸려 있어, 「열 해」를 «먼저» 봐야 합니다.
  //      ★그래서 위가 아니라 «여기» 에 두되, 앞줄보다 좁은 말로 잡습니다.
  if (t.includes('열 해') || t.includes('앞으로의')) return '🗓️'
  if (t.includes('어떤 분')) return '🌱'
  if (t.includes('함께 살아가는')) return '🏡'
  return '🌟'
}
function tbClean(s: string): string {
  return s.replace(/^#{1,6}\s*/, '').replace(/^\s*[-*]{3,}\s*$/, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/^■\s*/, '').trim()
}
// ★2026-07-25 — AI가 제목을 본문 첫 줄에 또 쓰는 경우가 있어, 본문 첫 줄이
//   제목과 (거의) 같으면 제거한다. (프롬프트 지시만으로 안 걸러져서 코드로 강제)
function stripEchoedTitle(title: string, body: string): string {
  const norm = (s: string) => s.replace(/[\s·!?.]/g, '')
  const t = norm(title)
  if (!t) return body
  const lines = body.split('\n')
  // 앞쪽 빈 줄 건너뛰고 첫 실질 줄을 본다
  let i = 0
  while (i < lines.length && !lines[i].trim()) i++
  if (i < lines.length) {
    const first = norm(tbClean(lines[i]))
    if (first === t || (first.length <= t.length + 4 && first.startsWith(t))) {
      lines.splice(i, 1)
      // 제거 후 남은 앞쪽 빈 줄도 정리
      while (lines[i] !== undefined && !lines[i].trim()) lines.splice(i, 1)
    }
  }
  return lines.join('\n').trim()
}
function parseTCards(text: string): { intro: string; cards: TCard[] } {
  const lines = text.split('\n')
  let intro = ''
  const cards: TCard[] = []
  let cur: { title: string; bodyLines: string[] } | null = null
  const isHeading = (ln: string) => /^\s*(#{1,6}\s*)?■/.test(ln) || /^\s*#{2,6}\s+/.test(ln)
  const flush = (c: { title: string; bodyLines: string[] }) => {
    const title = tbClean(c.title)
    const body = stripEchoedTitle(title, c.bodyLines.join('\n').trim())
    cards.push({ title, body, icon: tbIcon(title) })
  }
  for (const ln of lines) {
    if (isHeading(ln)) {
      if (cur) flush(cur)
      cur = { title: ln, bodyLines: [] }
    } else if (cur) { cur.bodyLines.push(ln) }
    else { const c = tbClean(ln); if (c) intro += (intro ? '\n' : '') + c }
  }
  if (cur) flush(cur)
  return { intro, cards: cards.filter(c => c.title || c.body) }
}

// ============================================================================
// 결과 뷰: 두 사람 명식 계산 → 등급 → 통변 스트리밍
// ============================================================================
type PersonRaw = Record<string, string>
interface Mode2Info { label: string; accent: string }

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
  const hIdx = hourToIdx(p.hour)
  const url = `/api/lunar?year=${y}&month=${m}&day=${d}&calType=${calType}&leapMonth=${leap}`
    // ★2026-07-27 — 태어난 시를 함께 넘긴다 (절입일 당일 태생 대비)
    + (hIdx !== null ? `&hour=${hIdx}` : '')
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

/** ★2026-07-25 — 새 궁합 통변 엔진용 변환.
 *   toCoupleTongbyeonMaterial 이 받는 CouplePersonInput 형식으로 바꾼다. */
function toCoupleInput(
  p: PersonRaw,
  saju: SajuPillarSimple[],
  solar?: { month: number; day: number; hourBranch: string | null } | null,
): CouplePersonInput {
  const birthYear = parseInt(p.year || '')
  const age = birthYear ? new Date().getFullYear() - birthYear : undefined
  return {
    name: p.name || '',
    gender: (p.gender === '남' || p.gender === '여') ? p.gender : '남',
    saju: saju.map(s => ({ pillar: s.pillar, stem: s.stem, branch: s.branch })),
    solarMonth: solar?.month ?? 1,
    solarDay: solar?.day ?? 1,
    hourBranch: solar?.hourBranch ?? null,
    birthLabel: p.year ? `${p.year}.${p.month}.${p.day}` : undefined,
    age,
  }
}

/** 관계(kind) → 통변 호칭 갈래 */
function relationKindOf(kind: string): CoupleRelationKind {
  if (kind === 'married' || kind === 'spouse' || kind === 'ex_spouse') return '부부'
  if (kind === 'lover' || kind === 'some' || kind === 'ex_lover') return '연인'
  return '일반'
}


function CoupleResultView({
  mode, kind, info, person1, person2, name1, name2, pickedQuestions, directQ, recordId, onBack, onOther,
}: {
  mode: 'couple' | 'married'
  kind: CoupleKind
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
}) {
  const [saju1, setSaju1] = useState<SajuPillarSimple[] | null>(null)
  const [saju2, setSaju2] = useState<SajuPillarSimple[] | null>(null)
  // 오행 비교 카드용 점수 (계산 시점에 c1/c2의 양력월·시지로 산출해 보관)
  const [ohaeng1, setOhaeng1] = useState<Record<string, number> | null>(null)
  const [ohaeng2, setOhaeng2] = useState<Record<string, number> | null>(null)
  // 해설 "서로 채워주는" 계산용 양력 정보 (c1/c2에서 보관)
  const [solar1, setSolar1] = useState<{ month: number; day: number; hourBranch: string | null } | null>(null)
  const [solar2, setSolar2] = useState<{ month: number; day: number; hourBranch: string | null } | null>(null)
  // ★2026-07-26 — score(옛 100점 계산) 상태를 없앴다. 등급은 judge.badge 하나로 본다.
  const [calcErr, setCalcErr] = useState(false)

  // 통변
  const [tongLoading, setTongLoading] = useState(false)
  const [judge, setJudge] = useState<CoupleJudgeV1 | null>(null)
  // ── 자유 질문 (최대 3개) ──
  //   savedId: 저장된 행 id. 답이 올 때마다 이 id 로 update 한다.
  //   ⚠️ 교훈 K — setSavedId 직후 state 를 읽으면 아직 null 이다.
  //      항상 지역변수/인자로 넘긴다.
  const [savedId, setSavedId] = useState<string | null>(recordId ?? null)
  // ★2026-07-26 — savedId 를 ref 로도 들고 있는다. (교훈 K 의 확장)
  //   통변은 30초 넘게 흐르는 async 함수라, 시작 시점의 state(그때는 null)를 붙들고 있다.
  //   그 사이에 자동저장이 끝나 id 가 생겨도 통변 쪽 클로저는 못 본다.
  //   그래서 "지금 값"을 읽을 통로가 따로 필요하다.
  const savedIdRef = useRef<string | null>(recordId ?? null)
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
        // ★grade 는 옛 기록 호환용으로만 읽는다 (판정이 없던 시절 배지 문구).
        //   새 기록은 judge.badge 를 그대로 grade 에 넣어 저장한다.
        grade?: string
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
        // ★2026-07-26 — 옛 점수제를 지우면서 setScore 복원 블록도 없앴다.
        //   (빈 details·0점을 채워 넣어 "터지지 않게" 방어하던 코드였는데,
        //    점수 자체가 사라져 방어할 대상이 없어졌다 — 교훈 U 의 부담 하나가 줄었다)
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
        setOhaeng1(calcSimsanOhaeng(s1, c1.solarMonth, c1.solarDay, c1.hourBranch, { forCouple: true }))
        setOhaeng2(calcSimsanOhaeng(s2, c2.solarMonth, c2.solarDay, c2.hourBranch, { forCouple: true }))
        setSolar1({ month: c1.solarMonth, day: c1.solarDay, hourBranch: c1.hourBranch })
        setSolar2({ month: c2.solarMonth, day: c2.solarDay, hourBranch: c2.hourBranch })
        // ★2026-07-26 — 옛 점수 계산(공망 두 벌·양력 날짜 묶음·calcCoupleScore /
        //   calcMarriedScore)을 전부 걷어냈다. 이제 이 화면의 유일한 판정은 아래 judgeCouple 이다.
        // ★2026-07-24 — 심산 기준 판정(점수·등급 없음).
        //   성별이 있어야 남=재성 / 여=관성으로 갈린다. 없으면 판정을 만들지 않는다.
        //   (조용히 기본값을 넣으면 남녀가 뒤바뀐 판정이 나온다 — 교훈 R·U)
        const g1 = person1.gender === '남' || person1.gender === '여' ? person1.gender as Gender : null
        const g2 = person2.gender === '남' || person2.gender === '여' ? person2.gender as Gender : null
        if (g1 && g2) {
          setJudge(judgeCouple(
            { name: name1, gender: g1, saju: s1, solarMonth: c1.solarMonth, solarDay: c1.solarDay, hourBranch: c1.hourBranch },
            { name: name2, gender: g2, saju: s2, solarMonth: c2.solarMonth, solarDay: c2.solarDay, hourBranch: c2.hourBranch },
            (n) => spouseFortuneTitle(n, kind),
            kind === 'married',   // ★부부 궁합일 때만 자식운 카드 표시
          ))
        }
      } catch { if (!cancelled) setCalcErr(true) }
    }
    run()
    return () => { cancelled = true }
  }, [person1, person2, recordId, mode])

  // ★2026-07-24 — 자동 통변을 걷어냈다.
  //
  //   [왜]
  //   예전에는 결과 화면에 들어오면 AI 가 무조건 한 번 돌아 총평을 썼다.
  //   이제는 판정 카드(CoupleJudgeCard)가 근거를 다 보여 주므로,
  //   AI 는 고객이 실제로 물어볼 때만 답한다. (자유 질문 최대 3개)
  //   → API 호출이 "무조건 1회 + 질문 3회" 에서 "물어본 만큼만" 으로 줄었다.
  //
  //   [저장 시점이 바뀐다]
  //   예전에는 통변이 끝나면 저장했다. 통변이 없어졌으니
  //   판정이 나오는 즉시 저장한다. 질문을 안 하셔도 보관함에 남아야 하고,
  //   나중에 다시 열어 물어보실 수 있어야 하기 때문.
  //
  //   ⚠️ 되살리려면: 이 블록을 옛 runTongbyeon 으로 되돌리면 된다.
  //      통변을 그리는 화면 코드와 parseTCards 는 지우지 않았다.
  useEffect(() => {
    if (recordId || !saju1 || !saju2 || ranRef.current) return
    // ⚠️ judge 가 들어오기 전에 저장하면 판정이 빈 채로 남아
    //    보관함 다시보기에서 판정 카드가 안 나온다.
    //    성별이 없어 judge 를 못 만드는 경우는 기다려도 안 오므로,
    //    그때는 judge 없이 저장한다. (성별 유무로 갈린다)
    const needJudge =
      (person1.gender === '남' || person1.gender === '여') &&
      (person2.gender === '남' || person2.gender === '여')
    if (needJudge && !judge) return
    ranRef.current = true
    handleSave('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saju1, saju2, judge, recordId])

  const isMe1 = person1.isMe === 'true' || person1.isMe === '1'
  const { intro: tbIntro, cards: tbCards } = useMemo(
    () => (tongResult ? parseTCards(tongResult) : { intro: '', cards: [] }),
    [tongResult],
  )

  // ══════════════════════════════════════════════════════════════
  //  ★★2026-08-02 — 통변을 «그대로» 그립니다 (44부 22차 · 대표님 지시)
  //
  //  🔴 [무엇이 있었나]  통변을 «판정 카드 키» 에 매핑하고 있었습니다.
  //     catKeys = ohaeng·gwiin·ilju·spouse_a·spouse_b·couple_overall·child
  //     ⇒ ★새 대목 셋(그릇과 온도 · 함께 살아가는 결 · 앞으로의 열 해)은
  //       «키가 없어» 매핑에 실패하고, 「판정 카드를 다 채운 뒤 남은 것」으로
  //       밀려 outro 에 뭉치거나 «사라졌습니다».
  //     ⇒ 실기에서 연표가 「두 분의 자식운」 카드 안에 들어가 있던 까닭입니다.
  //
  //  ★[이제]  AI 가 쓴 «■ 대목» 을 차례 그대로 그립니다.
  //     ⇒ 대목이 늘어도 «그냥 나옵니다». 키를 더할 필요가 없습니다.
  //  ⚠️ 판정(coupleFilterV1)은 «건드리지 않았습니다». 판정은 코드가 하고
  //     AI 는 풀기만 하며, 화면은 «그리기만» 합니다.
  // ══════════════════════════════════════════════════════════════
  const { reportSections, tongIntro, tongOutro } = useMemo(() => {
    const nm = (s: string) => s.replace(/\s/g, '')
    const secs: ReportSection[] = []
    const intro = tbIntro || ''
    const outroParts: string[] = []
    for (const c of tbCards) {
      const body = c.body.trim()
      if (!body) continue
      // ★맺는말은 «맺음글» 로 (대목이 아닙니다)
      if (nm(c.title).includes('맺는말') || nm(c.title).includes('맺음말')) {
        outroParts.push(body)
        continue
      }
      secs.push({ title: c.title, body, icon: c.icon })
    }
    return {
      reportSections: secs,
      tongIntro: intro,
      tongOutro: outroParts.join('\n\n'),
    }
  }, [tbCards, tbIntro])


  // ══════════════════════════════════════════════════════════════
  //  ★A4 궁합서 (2026-08-03 · 대표님 지시 · 44부 23차)
  //
  //  ⚠️ PDF 라이브러리를 «더하지 않았습니다» — 한글 글꼴 때문에 꾸러미가
  //     몇 MB 늘고, 안 실으면 «글자가 깨진» 궁합서가 나갑니다. (교훈 [의존])
  //  ★브라우저 인쇄가 어느 기기에서나 「PDF로 저장」을 함께 줍니다.
  //  ★43부 선명장(NamingCertificate)과 «같은 방식» 입니다. 전례를 따릅니다.
  //
  //  ⚠️⚠️ 값을 «다시 계산하지 않습니다». 화면이 쓰는 것을 그대로 넘깁니다. (교훈 CJ)
  //  ⚠️ 팝업이 막히면 «조용히 넘어가지 않고» 알려 드립니다. (교훈 U)
  // ══════════════════════════════════════════════════════════════
  function onPrintCert() {
    const toCert = (
      nm: string, birth: string, pillars: SajuPillarSimple[],
    ): CertPerson => ({
      name: nm, birth,
      // ★화면(CoupleWonguk)과 «같은 차례» — 시·일·월·년
      pillars: ['시주', '일주', '월주', '년주'].map(k => {
        const q = pillars.find(x => x.pillar === k)
        return {
          label: k[0],
          stem: q?.stem ?? '', branch: q?.branch ?? '',
          stemEl: elOfStem(q?.stem ?? '') ?? '토',
          branchEl: elOfBranch(q?.branch ?? '') ?? '토',
        }
      }),
    })
    const aName = kind === 'married'
      ? (person1.gender === '남' ? '남편' : person1.gender === '여' ? '아내' : name1)
      : name1
    const bName = kind === 'married'
      ? (person2.gender === '남' ? '남편' : person2.gender === '여' ? '아내' : name2)
      : name2
    const r = openCoupleCertificate({
      kindLabel: coupleTitleOf(kind),
      badge: judge?.badge ?? '',
      a: toCert(name1, person1.year ? `${person1.year}.${person1.month}.${person1.day}` : '', saju1 ?? []),
      b: toCert(name2, person2.year ? `${person2.year}.${person2.month}.${person2.day}` : '', saju2 ?? []),
      aLabel: aName, bLabel: bName,
      intro: tongIntro,
      sections: reportSections.map(x => ({ title: x.title, body: x.body })),
      outro: tongOutro,
      // ⚠️⚠️ 닮음·채움을 «다시 계산하지 않습니다» —
      //    compareOhaeng «한 창구» 를 씁니다. 화면(OhaengCompareCard)과 같은 값입니다.
      //    ★두 벌로 세면 종이와 화면이 «다른 수» 를 말하는 날이 옵니다. (교훈 CJ)
      ohaeng: ohaeng1 && ohaeng2
        ? (() => {
            const cmp = compareOhaeng(ohaeng1, ohaeng2)
            return {
              // ⚠️ 화면 그래프와 «같은 방향» — 왼쪽이 A, 오른쪽이 B 입니다.
              rows: cmp.rows.map(x => ({ el: x.el as string, a: x.a, b: x.b })),
              similarity: cmp.similarity,
              complement: cmp.complement,
            }
          })()
        : undefined,
    })
    if (!r.ok && r.message) alert(r.message)
  }

  /** ★2026-07-26 — 완성된 통변을 보관함 행에 덮어쓴다.
   *
   *  저장 순서가 "판정 저장(insert) → 통변 완성(update)" 두 걸음이라,
   *  통변이 끝나는 순간 아직 insert 가 안 끝났을 수도 있다(저장이 느릴 때).
   *  그래서 id 가 생길 때까지 잠깐(최대 5초) 기다렸다가 덮어쓴다.
   *  그래도 없으면 아직 아무것도 저장되지 않은 것이니 그때는 새로 저장한다.
   *  ⚠️ 조용히 넘어가지 않는다 — 실패하면 로그를 남긴다. (교훈 U) */
  async function persistTongbyeon(acc: string) {
    if (!acc.trim()) return
    let sid = savedIdRef.current
    for (let i = 0; i < 10 && !sid; i++) {
      await new Promise(r => setTimeout(r, 500))
      sid = savedIdRef.current
    }
    if (sid) {
      const r = await updateCoupleRecordResult(sid, buildSnapshot(acc, followUps))
      if (!r.ok) console.error('[궁합] 통변 보관함 덮어쓰기 실패', r.message)
      return
    }
    if (!recordId) {
      // 아직 저장된 행이 없다 → 통변까지 담아 처음부터 저장한다.
      await handleSave(acc)
      if (!savedIdRef.current) console.error('[궁합] 통변을 보관함에 남기지 못했어요')
    }
  }

  // ★2026-07-25 — 새 궁합 통변 엔진 실행 (심산 판정 재료 → buildCouplePrompt → AI)
  //   옛 coupleScore 기반 통변을 완전히 대체한다. 결제 관문은 아직 붙이지 않았다(바로 시험용).
  const tongRanRef = useRef(false)
  async function runCoupleTongbyeon() {
    if (!saju1 || !saju2 || tongLoading) return
    // 성별이 있어야 심산 판정이 나온다 (남=재성 / 여=관성)
    if (!judge) return
    setTongLoading(true)
    setTongResult(null)
    let acc = ''
    try {
      const material = toCoupleTongbyeonMaterial(
        toCoupleInput(person1, saju1, solar1),
        toCoupleInput(person2, saju2, solar2),
        judge,
        // ★2026-07-28 — 손님이 고른 질문의 갈래를 재료 쪽에도 넘긴다.
        //   갈래가 없거나 모르는 갈래(자유질문)면 교재 자료가 다 나간다.
        { questionCategories: pickedQuestions?.map(q => q.category) },
      )
      const { systemPrompt } = buildCouplePrompt(material, { relation: relationKindOf(kind) })
      const res = await fetch('/api/tongbyeon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, premium: true }),
      })
      if (!res.ok || !res.body) {
        let why = ''
        try { why = (await res.text()).slice(0, 200) } catch (e) { console.error('tongbyeon read fail', e) }
        console.error('궁합 통변 실패', res.status, why)
        setTongResult('풀이를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      // ★SSE 파싱 — /api/tongbyeon 은 'data: {"text":"..."}' 형식으로 보낸다.
      //   원본을 그대로 붙이면 화면에 data:{...} 가 찍힌다. text 만 뽑아 이어붙인다.
      //   청크가 줄 중간에 잘릴 수 있어 buf 로 완성된 줄만 처리한다.
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''   // 마지막(미완성)은 다음 청크로
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6)
          if (d === '[DONE]') continue
          try {
            const parsed = JSON.parse(d)
            if (parsed.text) { acc += parsed.text; setTongResult(acc) }
          } catch (e) { console.error('tongbyeon parse', e) }
        }
      }
      // ★2026-07-26 — 통변을 보관함에 남긴다. (v19c 까지 여기가 조용히 실패하고 있었다)
      //
      //   [무엇이 틀렸었나]
      //   전에는 `if (!recordId) handleSave(acc)` 였다. 그런데 판정(judge)이 통변보다
      //   먼저 나오므로 자동저장 effect 가 이미 handleSave('') 로 "빈 통변"을 저장해 둔다.
      //   그 뒤에 이 줄이 handleSave(acc) 를 불러도, handleSave 첫머리의
      //   `if (saveState !== 'idle' && saveState !== 'failed') return` 에 걸려 되돌아간다.
      //   → 통변이 끝나도 보관함에는 tongResult: '' 가 남고,
      //     다시보기(recordId)로 들어오면 통변을 다시 돌리지도 않으므로(아래 effect)
      //     돈 들여 뽑은 풀이가 영구히 사라졌다. 오류도 안 났다. (교훈 U)
      //
      //   [고친 방법]
      //   이미 저장된 행이 있으면 새로 저장(insert)하지 말고 그 행을 덮어쓴다(update).
      //   savedId 는 state 라 이 async 함수의 클로저가 낡았을 수 있어 ref 로 읽는다.
      await persistTongbyeon(acc)
    } catch (e) {
      console.error('궁합 통변 오류', e)
      setTongResult('풀이를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setTongLoading(false)
    }
  }

  // 자동 통변 — 명식·판정이 준비되면 한 번 실행 (새 기록일 때만)
  useEffect(() => {
    if (!SHOW_AUTO_TONGBYEON || recordId || tongRanRef.current) return
    if (!saju1 || !saju2 || !judge) return
    tongRanRef.current = true
    // setState 동기 호출 경고 회피 — 다음 틱에 실행
    const t = setTimeout(() => { runCoupleTongbyeon() }, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saju1, saju2, judge, recordId])


  // ★2026-07-26 — 스냅샷 만드는 자리를 하나로 모았다.
  //
  //   [왜]
  //   전에는 handleSave 와 askFollowUp 이 각각 스냅샷을 손으로 지었다.
  //   그래서 자유 질문으로 덮어쓸 때 questionIds·directQuestion 이 조용히 사라졌다.
  //   (다시보기에서 "고객이 무엇을 물었나"가 비어 보이던 원인)
  //   통변 저장까지 세 곳이 되니 더는 손으로 짤 수 없다. 한 함수로 묶는다.
  function buildSnapshot(tong: string, fups: FollowUp[]) {
    return {
      // ★grade 는 보관함 목록 배지로 쓰인다. 심산 판정 문구(judge.badge)를 넣는다.
      //   ★2026-07-26 — 판정이 없을 때 물러설 옛 등급(score.grade)이 사라졌으므로
      //     빈 문자열로 둔다. 보관함 목록은 배지가 비면 그냥 안 그린다.
      //     (성별을 안 넣으면 판정 자체가 없다 — 없는 등급을 지어내지 않는다. 교훈 U)
      grade: judge?.badge || '',
      judge,              // 심산 판정 — 다시보기 시 재계산 없이 그대로 그린다
      saju1, saju2,
      ohaeng1, ohaeng2,   // 오행 비교 카드용 (다시보기 시 재계산 없이 사용)
      tongResult: tong,
      followUps: fups,
      questionIds: pickedQuestions.filter(q => !q.id.startsWith('direct_')).map(q => q.id),
      directQuestion: directQ || null,
    }
  }

  // 보관함에 저장 (두 사람 + 등급 + 결과 스냅샷)
  //   ★2026-07-21 2차: 자동 저장. 판정이 나오는 즉시 한 번 저장한다.
  //     tongOverride 는 setTongResult 반영 전이라 인자로 받는다.
  async function handleSave(tongOverride?: string) {
    if (!saju1 || !saju2) return
    if (saveState !== 'idle' && saveState !== 'failed') return
    setSaveState('saving')
    // person raw → SavedInputData 형태로 정리
    const toInput = (p: PersonRaw): SavedInputData & { name?: string } => ({
      gender: p.gender || '', calType: p.calType || '양력',
      year: p.year || '', month: p.month || '', day: p.day || '',
      leapMonth: p.leapMonth || '0', hour: p.hour || '모름', name: p.name || '',
    })
    const res = await saveCoupleRecord({
      mode,
      name1, name2,
      relation: mode === 'married' ? '부부' : '연인',
      grade: judge?.badge || '',
      input1: toInput(person1),
      input2: toInput(person2),
      resultData: buildSnapshot(tongOverride ?? tongResult ?? '', followUps),
    })
    if (res.ok && res.id) { setSavedId(res.id); savedIdRef.current = res.id }
    setSaveState(res.ok ? 'saved' : 'failed')
  }

  // ── 자유 질문 (최대 3개) ──
  //   총평 통변과 같은 /api/tongbyeon 을 쓰되, 질문 하나만 담아 보낸다.
  //   답이 끝나면 그 자리에서 result_data 를 덮어써(update) 보관함에 남긴다.
  //   ⚠️ 교훈 K — 저장 함수에 넘기는 목록·id 는 state 가 아니라 지역변수를 쓴다.
  async function askFollowUp(question: string) {
    if (!saju1 || !saju2 || !judge) return
    if (followUps.length >= MAX_FOLLOWUPS || fuLoading) return

    setFuLoading(true)
    setFuStreaming({ q: question, a: '' })
    let acc = ''
    try {
      // ★고객이 화면에서 본 판정을 프롬프트에 함께 넣는다.
      //   안 넣으면 AI 가 화면과 다른 이야기를 할 수 있다.
      // ★2026-07-25 — 자유 질문도 새 심산 통변 엔진으로. 옛 buildCoupleTongbyeonPrompt 차단.
      const material = toCoupleTongbyeonMaterial(
        toCoupleInput(person1, saju1, solar1),
        toCoupleInput(person2, saju2, solar2),
        judge,
      )
      const { systemPrompt } = buildCouplePrompt(material, {
        relation: relationKindOf(kind),
        question,
      })
      const res = await fetch('/api/tongbyeon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, premium: true }),
      })
      if (!res.ok || !res.body) {
        // ⚠️ 교훈 U — 조용히 넘어가면 원인을 못 찾는다. 상태와 본문을 남긴다.
        let why = ''
        try { why = (await res.text()).slice(0, 200) } catch {}
        console.error('[followUp] 응답 실패', res.status, why)
        acc = `풀이를 불러오지 못했어요. (${res.status}) ${why || '잠시 후 다시 시도해 주세요.'}`
      } else {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        // ★2026-07-26 — 교훈 AG 를 여기에도 적용한다.
        //   SSE 청크는 줄 경계에서 안 끊긴다. buf 없이 청크마다 split('\n') 하면
        //   줄 중간에 잘린 delta 가 통째로 버려져, 답이 길수록 뒷부분이 사라진다.
        //   (총평 통변에서 실제로 터졌던 그 버그다. 자유 질문 쪽만 안 고쳐져 있었다)
        let fuBuf = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          fuBuf += decoder.decode(value, { stream: true })
          const lines = fuBuf.split('\n')
          fuBuf = lines.pop() ?? ''   // 마지막(미완성)은 다음 청크로
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const d = line.slice(6)
            if (d === '[DONE]') continue
            try {
              const parsed = JSON.parse(d)
              if (parsed.text) { acc += parsed.text; setFuStreaming({ q: question, a: acc }) }
            } catch (e) { console.error('[followUp] SSE 파싱', e) }
          }
        }
      }
    } catch (e) {
      // ⚠️ 교훈 U — 무엇이 터졌는지 남긴다. catch {} 로 삼키면 못 찾는다.
      console.error('[followUp] 예외', e)
      const msg = e instanceof Error ? e.message : String(e)
      acc = `풀이를 불러오지 못했어요. (${msg})`
    } finally {
      const next = [...followUps, { q: question, a: acc }]
      setFollowUps(next)
      setFuStreaming(null)
      setFuLoading(false)
      // 보관함에 덮어쓰기 — next(지역변수)를 넘긴다. state 는 아직 반영 전이다.
      //   ★2026-07-26 — 손으로 짜던 스냅샷을 buildSnapshot 으로 바꿨다.
      //     전에는 questionIds·directQuestion 이 여기서 조용히 지워졌다.
      const sid = savedIdRef.current || savedId
      if (sid) {
        const r = await updateCoupleRecordResult(sid, buildSnapshot(tongResult ?? '', next))
        if (!r.ok) console.error('[궁합] 자유질문 저장 실패', r.message)
      }
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: LINE_OUTER, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>{info.label} 결과</div>
      </div>

      <div style={{ padding: '16px 14px' }}>
        {/* ① 머리말 — 등급·폭죽을 걷어냈다. (점수제 폐기 2026-07-24)
               ★2026-07-24 GradeFireworks.tsx 파일도 삭제했다 (참조 0건). */}
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

        {/* ③-b 심산 판정 — 별표 6개 카테고리 + 총평 (2026-07-24 신규)
               ★2026-07-24 — 독립 섹션이던 오행 비교 카드를
                 '필요한 기운을 채워 주는가' 카드 안으로 넣었다. (대표님 지시)
                 같은 이야기를 두 곳에서 하지 않기 위해서다.
                 embedded=true 라 자체 제목·배경·접기를 끄고 내용만 그린다. */}
        {/* ══════════════════════════════════════════════════════
              ★★2026-08-02 — 목업 정본 리포트 (44부 22차 · 대표님 지시)

              🔴 [무엇이 있었나]  CoupleJudgeCard 는 —
                 · 제목만 보이고 «눌러야» 열렸습니다 (프리미엄인데 내용이 숨음)
                 · 판정 카드 → 접힌 풀이 → AI 글 «두 겹» 이었습니다
                 · 통변을 «판정 카드 키» 에 매핑해 ★새 대목 셋을 삼켰습니다
                 · 맨 아래 「도움이 되는 자리…」 부록이 목업에 없습니다

              ★[이제]  CoupleReport — 모두 «펼친 채» · «한 겹» · AI 차례 그대로
              ⚠️ CoupleJudgeCard 는 «지우지 않았습니다» — 되살릴 때 필요합니다.
                 ⚠️ 되살리려면 대표님께 여쭈십시오.
              ⚠️ 오행 그래프는 «살립니다» (대표님 지시) — 해당 대목 «안» 에 넣습니다.
           ══════════════════════════════════════════════════════ */}
        {judge && (reportSections.length > 0 || tongIntro || tongOutro) && (
          <CoupleReport
            badge={judge.badge}
            intro={tongIntro}
            sections={reportSections}
            outro={tongOutro}
            graph={ohaeng1 && ohaeng2 ? (
              <OhaengCompareCard
                aScores={ohaeng1}
                bScores={ohaeng2}
                aLabel={kind === 'married'
                  ? (person1.gender === '남' ? '남편' : person1.gender === '여' ? '아내' : name1)
                  : name1}
                bLabel={kind === 'married'
                  ? (person2.gender === '남' ? '남편' : person2.gender === '여' ? '아내' : name2)
                  : name2}
                embedded
              />
            ) : undefined}
          />
        )}

        {/* ④ 통변 — 자동 총평을 걷어냈다. (2026-07-24)
               ★SHOW_AUTO_TONGBYEON 을 true 로 바꾸면 예전처럼 돌아온다.
                 아래 화면 코드와 parseTCards 는 그대로 살려 두었다.
               ※ AI 는 이제 아래 '자유 질문' 에서만 답한다. */}
        {/* ④ 통변 — ★2026-07-25 통변을 판정 카드 안으로 넣었다. (대표님 지시)
               각 판정 카드 안에 그 주제 풀이가 접기로 붙고, 여는말·맺는말은
               CoupleJudgeCard 가 카드 위·아래에 독립으로 그린다.
               여기서는 생성 중 로딩 표시만 남긴다. (통변 카드 중복 제거) */}
        {SHOW_AUTO_TONGBYEON && tongLoading && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 24, color: '#5c3a1e', fontSize: 13, background: '#FFFBF7', border: LINE_OUTER, borderRadius: 12 }}>
              <span style={{ fontSize: 28, display: 'inline-block', animation: 'spin 1.1s linear infinite', color: '#8f3d0e' }}>✦</span>
              <span>두 사람의 인연을 찬찬히 풀이하는 중이에요…</span>
              <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            </div>
          </div>
        )}

        {/* ⑤ 더 궁금한 것 — ★2026-07-24 화면에서 제거 (대표님 지시)
            섹션 전체(라벨 · 지난 문답 · 입력칸)를 내린다.
            SHOW_FOLLOWUP 을 true 로 바꾸면 예전처럼 돌아온다.
            CoupleFollowUp.tsx 와 askFollowUp 은 지우지 않았다. */}
        {SHOW_FOLLOWUP && judge && (
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

        {/* ══════════════════════════════════════════════════════
             ★A4 궁합서 — 인쇄 / PDF 저장 (2026-08-03 · 대표님 지시)
             ⚠️ PDF 라이브러리를 «더하지 않았습니다» — 한글 글꼴 때문에
                꾸러미가 몇 MB 늘고, 안 실으면 «글자가 깨집니다». (교훈 [의존])
             ★브라우저 인쇄가 어느 기기에서나 「PDF로 저장」을 함께 줍니다.
             ★43부 선명장(NamingCertificate)과 «같은 방식» 입니다.
             ⚠️ 통변이 «다 나온 뒤» 에만 보입니다. 반쪽 궁합서를 내지 않습니다.
           ══════════════════════════════════════════════════════ */}
        {/* ══════════════════════════════════════════════════════
             ★2026-08-03 — 두 버튼을 «나란히» 둡니다 (대표님 지시)
               전  세로로 둘 — 하단이 길어졌습니다
               ★후 가로로 둘 — 각자 절반씩
             ⚠️ CopyTextButton 은 «공용 부품» 입니다 (작명·사주보기도 씁니다).
                ★부품을 고치지 않고 «감싸서» 너비를 맞춥니다. (교훈 E)
                fullWidth={false} 로 두면 안쪽 버튼이 제 너비만 차지하므로,
                감싼 div 에 flex:1 을 주고 부품에는 width:100% 를 걸어 줍니다.
             ⚠️ 부품 안에 marginTop:8 이 박혀 있어 높이가 어긋납니다 —
                ★A4 버튼에도 같은 marginTop 을 주어 «윗선» 을 맞췄습니다.
           ══════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'stretch' }}>
          {reportSections.length > 0 && (
            <button
              onClick={onPrintCert}
              /* ★2026-08-05 (47부 11차) — 「해설 복사」와 높이·간격을 맞췄습니다.
                         minHeight 44 · 글자 13 · marginTop 0 (줄 간격은 «감싸는 쪽» 이 정합니다)
                         ⛔ 짝(CopyTextButton)만 바꾸면 또 어긋납니다. 둘을 «함께» 보십시오. */
              style={{
                flex: 1, marginTop: 0, background: '#b48a3c', border: 'none',
                minHeight: 44, boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 11, padding: 13, fontSize: 13, fontWeight: 600,
                color: '#fff', cursor: 'pointer', lineHeight: 1.3,
              }}
            >🖨 A4 PDF저장/인쇄</button>
          )}

          {/* ★해설 복사 — 카톡 등에 붙여넣기 (공용 부품) */}
          {/* ★2026-07-24 — 판정 결과 + 이미 받은 문답을 함께 담는다. */}
          {/* ⚠️ 통변이 아직이면 A4 버튼이 «없습니다» — 그때는 복사 버튼이
                 혼자 남으므로 «가로로 꽉» 차야 합니다. flex:1 하나로 됩니다. */}
          <div style={{ flex: 1, display: 'flex' }} className="copy-half">
            <CopyTextButton
              text={[
                judge ? judgeToText(judge) : '',
                followUps.length
                  ? '\n■ 더 궁금했던 것\n' + followUps.map((f, i) => `Q${i + 1}. ${f.q}\nA. ${f.a}`).join('\n\n')
                  : '',
                (tongResult || '').trim(),
              ].filter(Boolean).join('\n')}
              label={`${coupleTitleOf(kind)} 분석`}
              inRow
            />
          </div>
          {/* ⚠️ 공용 부품을 «고치지 않고» 감싼 자리에서만 너비를 맞춥니다 */}
          <style>{`.copy-half > button { width: 100%; }`}</style>
        </div>



        {/* 참고용 안내 — 결과에 과몰입하지 않도록 다정하게 */}
        <div style={{
          marginTop: 18, padding: '13px 14px', borderRadius: 11,
          background: '#faf3ec', border: LINE_OUTER,
          fontSize: 11.5, lineHeight: 1.7, color: '#5c3a1e', textAlign: 'center',
        }}>
          이 풀이는 두 분을 더 깊이 이해하기 위한 다정한 참고예요.<br />
          인연을 정하는 건 사주가 아니라 두 사람의 마음과 노력이랍니다. 🌿
        </div>

        {/* ★2026-08-05 (47부 9차) — 상담 카드를 «화면 맨 끝» 으로 내렸습니다. [대표님 지시]
            「다시그리기 보다 더 아래…맨 끝으로 옮겨줘」
            ⚠️ 그래서 참고용 안내가 상담 카드 «위» 로 올라갔습니다. 뜻한 대로입니다.
            ⛔ 다시 위로 올리지 마십시오. */}
        {/* 전문가 상담 — 저장 표시 아래.
            ★ 연인/부부가 서로 다른 가격표(price_key)를 쓴다.
              관리자 > 가격 관리에서 '노출'이 꺼져 있으면 ConsultButton이
              스스로 null을 돌려주므로 이 영역 전체가 보이지 않는다. */}
        {(
          <div>
            <ConsultButton
              priceKey={COUPLE_PRICE_KEY}
              mode={mode}
              /* ★고객이 본 궁합 결과를 상담사에게 넘긴다 (2026-07-21)
                 couples 테이블(두 사람 명식·판정 배지) + ai_analysis(통변) 두 벌을 담는다.
                 ★2026-07-26 — 점수제를 지우면서 totalScore·scoreDetails 를 빼고
                   판정 배지(judge.badge)만 넘긴다. 상담사 화면은 값이 없으면
                   그 줄을 안 그리도록 이미 방어돼 있다(CustomerAiAnalysis). */
              payload={() => {
                // ★2026-07-24 — 자동 총평을 걷어내 tongResult 가 비었다.
                //   상담사가 "고객이 무엇을 보고 왔는지" 알아야 하므로
                //   판정 결과와 이미 받은 문답을 글로 풀어 넘긴다.
                const forConsultant = [
                  judge ? judgeToText(judge) : '',
                  followUps.length
                    ? '\n\n■ 고객이 물어본 것\n' +
                      followUps.map((f, i) => `Q${i + 1}. ${f.q}\nA. ${f.a}`).join('\n\n')
                    : '',
                  (tongResult || '').trim(),
                ].filter(Boolean).join('\n')
                return {
                  aiAnalysis: forConsultant.trim() || undefined,
                  coupleFull: {
                    person_a_birth: person1,
                    person_b_birth: person2,
                    mode,
                    result: {
                      grade: judge?.badge || '',
                    },
                  },
                }
              }}
            />
          </div>
        )}
      </div>
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
