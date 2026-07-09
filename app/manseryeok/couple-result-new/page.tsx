'use client'

/**
 * 궁합 결과 (새 버전 · 껍데기 + 질문단계)
 * ─────────────────────────────────────────────
 * 흐름: 두 사람 선택(couple-input-new) → [이 화면] 질문 선택 → 결과(명식+등급+해설)
 *   · pickedQuestion === null  → 질문 선택 단계 (coupleQuestions 11개)
 *   · pickedQuestion 정해짐     → 결과 단계 (명식 나란히 + 등급 + 통변)
 *   · '__all__'                → "전체 궁합 총평"(질문 안 고르고 전체)
 *
 * 방식: 내사주그림(mulsang)과 동일 — QuestionPicker 공용부품을 건드리지 않고
 *       이 페이지가 coupleQuestions를 직접 렌더(대규모 안정: 공용부품 회귀 없음).
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

  // ── 질문 선택 단계 상태 ──
  // null = 질문 선택 화면 / 질문id 또는 '__all__' = 결과 화면
  const [picked, setPicked] = useState<string | null>(null)
  const [openCat, setOpenCat] = useState<string | null>(null)

  const groups = useMemo(() => groupCoupleByCategory(COUPLE_QUESTIONS), [])

  // ────────────────────────────────────────────
  // 질문 선택 단계
  // ────────────────────────────────────────────
  if (picked === null) {
    return (
      <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 5,
          background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
          borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <button onClick={() => router.back()}
            style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>무엇이 궁금하세요?</div>
            <div style={{ fontSize: 10.5, color: '#b4785a' }}>{name1} ♥ {name2} · 궁금한 걸 골라보세요</div>
          </div>
        </div>

        <div style={{ padding: '14px 14px 0' }}>
          {groups.map(({ category, items }) => {
            const col = catColor(category)
            const open = openCat === category
            const hasPicked = items.some(q => q.id === picked)
            return (
              <div key={category} style={{ border: `0.5px solid ${hasPicked ? col + '55' : '#f0e0d5'}`, borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
                <div onClick={() => setOpenCat(open ? null : category)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', background: open ? col + '10' : '#fff', cursor: 'pointer' }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: col }}>{category}</span>
                  <span style={{ color: col, fontSize: 12 }}>{open ? '▾' : '▸'}</span>
                </div>
                {open && (
                  <div style={{ padding: '6px 10px 10px' }}>
                    {items.map(q => (
                      <div key={q.id} onClick={() => setPicked(q.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 8, cursor: 'pointer', marginBottom: 2 }}>
                        <span style={{ width: 17, height: 17, borderRadius: '50%', border: '1.5px solid #d8c4b4', flexShrink: 0 }} />
                        <span style={{ fontSize: 12.5, color: '#3a2e28' }}>{q.question}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <button onClick={() => setPicked('__all__')}
            style={{ width: '100%', height: 46, marginTop: 6, background: '#b46e46', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            전체 궁합 총평 보기
          </button>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#b4785a', marginTop: 8 }}>
            궁금한 항목을 누르면 그 주제로 풀어드려요
          </div>
        </div>
      </main>
    )
  }

  // ────────────────────────────────────────────
  // 결과 단계
  // ────────────────────────────────────────────
  const pickedQuestion = picked === '__all__'
    ? null
    : COUPLE_QUESTIONS.find(q => q.id === picked) ?? null

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
        <button onClick={() => setPicked(null)}
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

        {/* 고른 질문 표시 */}
        <div style={{ background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, padding: '10px 13px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#c8783c', fontSize: 13 }}>❝</span>
          <span style={{ flex: 1, fontSize: 12.5, color: '#96502e', fontWeight: 500 }}>
            {pickedQuestion ? pickedQuestion.question : '두 사람 궁합 전체 총평'}
          </span>
          <span onClick={() => setPicked(null)} style={{ fontSize: 11, color: '#c8783c', cursor: 'pointer' }}>바꾸기</span>
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
              프롬프트 = coupleTongbyeonPrompt(계산값 + 두사람 사주 + pickedQuestion) */}
          <div style={{ fontSize: 12.5, color: '#b4785a', lineHeight: 1.8, background: '#FDF6F0', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
            {pickedQuestion
              ? <>‘{pickedQuestion.question}’<br />이 질문으로 두 사람 궁합을 풀어드릴 자리예요.</>
              : <>두 사람 궁합 전체 총평이 들어갈 자리예요.</>}
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
