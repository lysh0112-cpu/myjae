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

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CoupleWonguk from '@/app/manseryeok/couple-result/components/CoupleWonguk'
import { COUPLE_QUESTIONS, groupCoupleByCategory } from '@/lib/saju/coupleQuestions'

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

// ── 가짜 명식 (껍데기용 고정 예시) ──────────────
// [TODO] 나중에 buildSajuPillars(person1) 결과로 교체
const DUMMY_SAJU_1 = [
  { pillar: '시주', stem: '壬', branch: '寅' },
  { pillar: '일주', stem: '壬', branch: '子' },
  { pillar: '월주', stem: '壬', branch: '子' },
  { pillar: '연주', stem: '丁', branch: '丑' },
]
const DUMMY_SAJU_2 = [
  { pillar: '시주', stem: '庚', branch: '午' },
  { pillar: '일주', stem: '己', branch: '酉' },
  { pillar: '월주', stem: '辛', branch: '巳' },
  { pillar: '연주', stem: '乙', branch: '亥' },
]

function fmtBirth(p: Record<string, string>): string {
  if (!p.year) return ''
  return `${p.year}.${p.month}.${p.day}`
}

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

  // ── 질문 선택 단계 상태 (사주 QuestionPicker와 동일: 복수선택) ──
  //   submitted === null → 질문 선택 화면
  //   submitted = 질문 배열(빈 배열이면 전체 총평) → 결과 화면
  const groups = useMemo(() => groupCoupleByCategory(COUPLE_QUESTIONS), [])
  const allIds = useMemo(() => COUPLE_QUESTIONS.map(q => q.id), [])

  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [openCats, setOpenCats] = useState<Set<string>>(
    () => new Set(groups.length ? [groups[0].category] : [])
  )
  const [submitted, setSubmitted] = useState<string[] | null>(null)

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
          <button onClick={() => router.back()}
            style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>무엇이 궁금하세요?</div>
            <div style={{ fontSize: 10.5, color: '#c8783c', marginTop: 1 }}>{name1} ♥ {name2} · 궁금한 걸 마음껏 골라보세요</div>
          </div>
          <span style={{ width: 16 }} />
        </div>

        {/* 전체 선택/해제 */}
        <div style={{ padding: '10px 14px', display: 'flex', gap: 8, borderBottom: '0.5px solid #f5e5da' }}>
          <button onClick={selectAll} style={{ flex: 1, height: 34, background: '#fff3e9', border: '0.5px solid #e0c0a8', borderRadius: 9, color: '#96502e', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓ 전체 선택</button>
          <button onClick={clearAll} style={{ flex: 1, height: 34, background: '#fff', border: '0.5px solid #e8d5c5', borderRadius: 9, color: '#b4785a', fontSize: 12, cursor: 'pointer' }}>전체 해제</button>
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
                  <span onClick={(e) => { e.stopPropagation(); toggleCatAll(category, items) }} style={{ fontSize: 10, color: col, border: `0.5px solid ${col}88`, borderRadius: 8, padding: '3px 8px', background: '#fff' }}>{allOn ? '모두 해제' : '모두 담기'}</span>
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

        {/* 하단 버튼: 고른 질문으로 / 전체 총평 */}
        <div style={{ padding: '4px 14px 0' }}>
          <button onClick={() => setSubmitted([...picked])} disabled={nPicked === 0}
            style={{ width: '100%', height: 46, background: nPicked > 0 ? '#b46e46' : '#d8c4b4', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: nPicked > 0 ? 'pointer' : 'not-allowed' }}>
            {nPicked > 0 ? `${nPicked}개 질문으로 궁합 풀이 받기` : '궁금한 것을 골라주세요'}
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
  // 결과 단계
  // ────────────────────────────────────────────
  const pickedQuestions = COUPLE_QUESTIONS.filter(q => submitted.includes(q.id))
  const isAll = pickedQuestions.length === 0

  // [TODO] 등급: calcCoupleScore(person1, person2, ...).grade 로 교체
  const dummyGrade = mode === 'couple' ? '서로를 성장시키는 황금 커플' : '오래 함께할 든든한 인연'
  const dummyGradeDesc = mode === 'couple' ? '함께할수록 더 빛나는 인연이에요' : '서로를 채워주는 사이예요'
  const dummyHeadline = `${name1}님과 ${name2}님, 두 사람의 만남`

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => setSubmitted(null)}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>{info.label} 결과</div>
        <div style={{ marginLeft: 'auto', fontSize: 10, color: '#c8783c', background: '#f9ebe0', borderRadius: 99, padding: '2px 10px' }}>
          껍데기 · 계산 예정
        </div>
      </div>

      <div style={{ padding: '16px 14px' }}>
        {/* ① 등급 (점수 숨김 · C안) [TODO] 폭죽 연출 */}
        <div style={{ background: info.accent, borderRadius: 14, padding: '22px 16px', textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, marginBottom: 12 }}>{dummyHeadlineSafe(dummyHeadline)}</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: '#fff', lineHeight: 1.3 }}>{dummyGrade}</div>
          <div style={{ display: 'inline-block', fontSize: 11.5, color: info.accent, background: '#fff', borderRadius: 99, padding: '3px 14px', marginTop: 12 }}>
            {dummyGradeDesc}
          </div>
        </div>

        {/* 고른 질문 표시 (복수) */}
        <div style={{ background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, padding: '10px 13px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isAll ? 0 : 6 }}>
            <span style={{ color: '#c8783c', fontSize: 13 }}>❝</span>
            <span style={{ flex: 1, fontSize: 12, color: '#b4785a' }}>
              {isAll ? '두 사람 궁합 전체 총평' : `고른 질문 ${pickedQuestions.length}개`}
            </span>
            <span onClick={() => setSubmitted(null)} style={{ fontSize: 11, color: '#c8783c', cursor: 'pointer' }}>바꾸기</span>
          </div>
          {!isAll && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {pickedQuestions.map(q => (
                <span key={q.id} style={{ fontSize: 11, color: '#96502e', background: '#f9ebe0', borderRadius: 8, padding: '3px 8px' }}>{q.question}</span>
              ))}
            </div>
          )}
        </div>

        {/* ②③ 두 사람 정보 + 나란히 명식 (CoupleWonguk) */}
        <CoupleWonguk
          left={{ name: name1, birth: fmtBirth(person1), isMe: person1.isMe === 'true' || person1.isMe === '1', saju: DUMMY_SAJU_1 }}
          right={{ name: name2, birth: fmtBirth(person2), saju: DUMMY_SAJU_2 }}
        />

        {/* ④ 통변 카드 (해설 자리) */}
        <div style={{ background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, padding: 14, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ color: '#c8783c' }}>✦</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#96502e' }}>두 사람의 궁합 이야기</span>
          </div>
          {/* [TODO] /api/tongbyeon 스트리밍 통변으로 교체.
              프롬프트 = coupleTongbyeonPrompt(계산값 + 두사람 사주 + pickedQuestions) */}
          <div style={{ fontSize: 12.5, color: '#b4785a', lineHeight: 1.8, background: '#FDF6F0', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
            {isAll
              ? <>두 사람 궁합 전체 총평이 들어갈 자리예요.</>
              : <>고른 {pickedQuestions.length}개 질문으로<br />두 사람 궁합을 풀어드릴 자리예요.</>}
            <br />(계산·통변은 다음 단계에서 붙입니다)
          </div>
        </div>

        {/* 저장/다시보기 [TODO] saju_records(service_type='couple') 저장 + 보관함 연결 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button style={{ flex: 1, background: '#fff', border: '0.5px solid #e0c9b8', borderRadius: 11, padding: 12, fontSize: 13, color: '#96502e', cursor: 'pointer' }}>
            보관함에 저장
          </button>
          <button onClick={() => router.push(`/manseryeok/couple-input-new?mode=${mode}`)}
            style={{ flex: 1, background: '#b46e46', border: 'none', borderRadius: 11, padding: 12, fontSize: 13, color: '#fff', cursor: 'pointer' }}>
            다른 궁합 보기
          </button>
        </div>
      </div>
    </main>
  )
}

// 이름이 비었을 때 카피가 어색해지지 않게 방어
function dummyHeadlineSafe(s: string): string {
  return s.replace('undefined', '').replace('님과 님', '두 사람')
}

export default function CoupleResultNewPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <CoupleResultInner />
    </Suspense>
  )
}
