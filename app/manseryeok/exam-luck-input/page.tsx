'use client'

/**
 * 합격운 · 취업운 입력 — 무엇을 볼지 고르기
 * ─────────────────────────────────────────────
 * 진입: exam-luck(보관함) > 사람 선택 모달 > 이 화면
 * 다음: exam-luck-result
 *
 * 사람은 이미 정해져서 URL 로 넘어온다. 여기서는 "무엇을 볼지"만 고른다.
 * ★진로적성 career-input 과 같은 모양(큰 버튼 목록). 새로 설계하지 않는다.
 *
 * ⚠️ 나이는 lib/saju/ageDayun.ts 의 exactAge() 를 쓴다.
 *    career/calcPerson.ts 의 ageOf() 는 세는나이라 대운수(만 나이)와 잣대가 다르다. (작업지시 7장)
 */

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { exactAge } from '@/lib/saju/ageDayun'
// ★2026-07-27 — 손님이 시험 종류를 고르면 교재 230쪽 짝에 따라 볼 십신이 정해진다.
import { EXAM_KINDS } from '@/lib/saju/examLuck/tables/rules'
import { EXAM_CATEGORIES, TARGETS, STUDENT_GRADES } from '@/lib/saju/examLuck/tables/studentTarget'

const ACCENT = '#c85a8c'
const SOFT = '#f7e6ee'
const BG = '#FDF6F0'
const CARD = '#FFFBF7'
const LINE = '#f0e0d5'

/** 무엇을 볼까 */
type Kind = 'exam' | 'job'
/** 누구인가 */
type Target = 'student' | 'adult'

function ExamLuckInputInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const name = sp.get('name') || ''
  const year = parseInt(sp.get('year') || '') || 0
  const month = parseInt(sp.get('month') || '') || 1
  const day = parseInt(sp.get('day') || '') || 1
  const age = useMemo(() => (year ? exactAge(year, month, day) : null), [year, month, day])

  const [kind, setKind] = useState<Kind>(age !== null && age < 20 ? 'exam' : 'job')
  const [target, setTarget] = useState<Target>(age !== null && age < 20 ? 'student' : 'adult')
  /** ★어떤 시험인가 — 교재 230쪽이 십신마다 시험을 짝지어 놨다 */
  const [examKind, setExamKind] = useState<string>('')
  /** ★시험 날짜 — 몰라도 된다. 알면 그 달·그 날까지 짚어 준다 (교재 195쪽) */
  const [examDate, setExamDate] = useState<string>('')
  /**
   * ★2026-07-29 — 학생 목표 (2단 드롭다운). 대표님 지시.
   *   [왜] «어디를 목표로 하는지» 를 알면 그 자리에 쓰이는 힘을 짚어 줄 수 있습니다.
   *   ⚠️ 학생일 때만 씁니다. 성인에게는 뜻이 안 맞습니다.
   */
  /** ★2026-07-29 — 학년·신분. 같은 학생이라도 초등과 N수생은 결이 완전히 다릅니다. */
  const [studentGrade, setStudentGrade] = useState<string>('')
  const [examCategory, setExamCategory] = useState<string>('')
  const [targetType, setTargetType] = useState<string>('')
  const [targetCustomText, setTargetCustomText] = useState<string>('')

  /**
   * ★2026-07-29 — 목표와 날짜를 «필수» 로 돌렸습니다. (대표님 지시)
   *
   *   [왜] 목표와 D-Day 가 없으면 리포트가 «뜬구름» 이 됩니다.
   *     «어느 해가 좋다» 까지만 말할 수 있고, «그 학교에 이 힘이 쓰인다»·
   *     «그날 일진이 이러니 이렇게 하라» 는 못 합니다.
   *   ⚠️ 필수로 막으면 손님이 떠날 수도 있습니다. 그래서 **모를 때 고를 길**을 함께 둡니다.
   *     날짜는 [상반기]·[하반기]·[연말] 단추로, 목표는 «그 밖의 시험» 으로.
   */
  const gradeOk = target !== 'student' || !!studentGrade
  const targetOk = target === 'student'
    ? !!examCategory && !!targetType && (targetType !== 'custom' || !!targetCustomText.trim())
    : !!examKind
  const dateOk = !!examDate
  const canGo = gradeOk && targetOk && dateOk

  /** 모르는 손님을 위한 빠른 날짜 — 그 달의 대표 하루 */
  const quickDates = useMemo(() => {
    const y = new Date().getFullYear()
    const next = new Date() > new Date(y, 10, 15) ? y + 1 : y
    return [
      { label: '상반기 (6월경)', v: `${next}-06-15` },
      { label: '하반기 (11월경)', v: `${next}-11-15` },
      { label: '연말 (12월경)', v: `${next}-12-15` },
    ]
  }, [])

  const query = useMemo(() => {
    const p = new URLSearchParams()
    for (const k of ['year', 'month', 'day', 'gender', 'calType', 'leapMonth', 'hour', 'name']) {
      const v = sp.get(k)
      if (v) p.set(k, v)
    }
    p.set('kind', kind)
    p.set('target', target)
    if (examKind) p.set('examKind', examKind)
    if (examDate) p.set('examDate', examDate)
    // ★학생 목표 — 학생일 때만 싣는다
    if (target === 'student' && studentGrade) p.set('studentGrade', studentGrade)
    if (target === 'student' && examCategory) {
      p.set('examCategory', examCategory)
      if (targetType) p.set('targetType', targetType)
      if (targetType === 'custom' && targetCustomText.trim()) {
        p.set('targetCustomText', targetCustomText.trim())
      }
    }
    return p.toString()
  }, [sp, kind, target, examKind, examDate, studentGrade, examCategory, targetType, targetCustomText])

  const kinds: Array<{ key: Kind; title: string; sub: string }> = [
    { key: 'exam', title: '시험 · 합격운', sub: '입시 · 자격증 · 공무원 시험을 봅니다' },
    { key: 'job', title: '취업운', sub: '일자리를 구하고 자리를 잡는 흐름을 봅니다' },
  ]
  const targets: Array<{ key: Target; title: string; sub: string }> = [
    { key: 'student', title: '학생이에요', sub: '학업 흐름, 특목고, 수시·정시까지 함께 봅니다' },
    { key: 'adult', title: '성인이에요', sub: '시험과 일자리를 중심으로 봅니다' },
  ]

  const Btn = ({ on, title, sub, onClick }: { on: boolean; title: string; sub: string; onClick: () => void }) => (
    <button onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', marginBottom: 10, padding: '15px 16px',
        background: on ? SOFT : CARD,
        border: on ? `1.5px solid ${ACCENT}` : `0.5px solid ${LINE}`,
        borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
      }}>
      <div style={{ fontSize: 14.5, fontWeight: 500, color: on ? ACCENT : '#3a2e28', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#5c3a1e', lineHeight: 1.6 }}>{sub}</div>
    </button>
  )

  return (
    <main style={{ minHeight: '100vh', background: BG, maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: `0.5px solid ${LINE}`, padding: '13px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#3a2e28' }}>합격운 · 취업운</div>
      </div>

      <div style={{ padding: '22px 16px 0' }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: '#3a2e28', marginBottom: 6 }}>
          {name ? `${name}님, 무엇을 볼까요?` : '무엇을 볼까요?'}
        </div>
        <div style={{ fontSize: 12.5, color: '#5c3a1e', lineHeight: 1.7, marginBottom: 18 }}>
          보는 것에 따라 짚는 자리가 달라요.
          {age !== null && <><br />생년월일로 보아 만 {age}세로 잡았습니다. 다르면 아래에서 바꿔 주세요.</>}
        </div>

        {kinds.map(o => (
          <Btn key={o.key} on={kind === o.key} title={o.title} sub={o.sub} onClick={() => setKind(o.key)} />
        ))}

        <div style={{ fontSize: 12.5, color: '#8a7063', margin: '18px 2px 9px' }}>어느 쪽인가요?</div>
        {targets.map(o => (
          <Btn key={o.key} on={target === o.key} title={o.title} sub={o.sub} onClick={() => setTarget(o.key)} />
        ))}

        {/* ★2026-07-29 — 학생 목표 2단 드롭다운. (대표님 지시)
             학생일 때만 뜹니다. 성인에게는 «자사고·수시» 가 뜻이 안 맞습니다. */}
        {target === 'student' && (
          <>
            {/* ★학년·신분 — 목표보다 «먼저» 묻습니다. 학년에 따라 목표의 결이 달라집니다. */}
            <div style={{ fontSize: 12.5, color: '#8a7063', margin: '18px 2px 9px' }}>
              학년 · 신분 <span style={{ color: ACCENT, fontWeight: 600 }}>*</span>
            </div>
            <select value={studentGrade} onChange={e => setStudentGrade(e.target.value)}
              style={{
                width: '100%', padding: '13px 14px', borderRadius: 12, marginBottom: 4,
                background: CARD,
                border: studentGrade ? `0.5px solid ${LINE}` : `1.5px solid ${ACCENT}55`,
                color: '#3a2e28', fontSize: 14, fontFamily: 'inherit', appearance: 'none',
              }}>
              {STUDENT_GRADES.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
            <div style={{ fontSize: 11.5, color: '#8a7063', lineHeight: 1.7, margin: '4px 2px 4px' }}>
              * 같은 학생이라도 학년에 따라 필요한 이야기가 달라집니다.
            </div>

            <div style={{ fontSize: 12.5, color: '#8a7063', margin: '16px 2px 9px' }}>
              어디를 목표로 하나요? <span style={{ color: ACCENT, fontWeight: 600 }}>*</span>
            </div>
            <select
              value={examCategory}
              onChange={e => { setExamCategory(e.target.value); setTargetType(''); setTargetCustomText('') }}
              style={{
                width: '100%', padding: '13px 14px', borderRadius: 12, marginBottom: 9,
                background: CARD, border: `0.5px solid ${LINE}`, color: '#3a2e28',
                fontSize: 14, fontFamily: 'inherit', appearance: 'none',
              }}>
              {EXAM_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>

            {/* 2차 — 1차를 골랐을 때만 */}
            {examCategory && (
              <select
                value={targetType}
                onChange={e => { setTargetType(e.target.value); if (e.target.value !== 'custom') setTargetCustomText('') }}
                style={{
                  width: '100%', padding: '13px 14px', borderRadius: 12, marginBottom: 9,
                  background: CARD, border: `0.5px solid ${LINE}`, color: '#3a2e28',
                  fontSize: 14, fontFamily: 'inherit', appearance: 'none',
                }}>
                <option value="">목표 학교·계열을 고르세요</option>
                {(TARGETS[examCategory as keyof typeof TARGETS] ?? [])
                  .map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            )}

            <div style={{ fontSize: 11.5, color: '#8a7063', lineHeight: 1.7, margin: '2px 2px 4px' }}>
              * 목표를 정해 주셔야 사주와 그 목표 사이를 짚어 드릴 수 있습니다.
            </div>

            {/* 직접 입력 */}
            {targetType === 'custom' && (
              <input
                type="text"
                value={targetCustomText}
                onChange={e => setTargetCustomText(e.target.value)}
                placeholder="예: 서울대 의예과, 상산고 등"
                maxLength={40}
                style={{
                  width: '100%', padding: '13px 14px', borderRadius: 12, marginBottom: 10,
                  background: CARD, border: `0.5px solid ${LINE}`, color: '#3a2e28',
                  fontSize: 14, fontFamily: 'inherit',
                }}
              />
            )}
          </>
        )}

        {/* ★어떤 시험인지 — 고르면 그 시험에 힘을 싣는 십신이 드는 해를 짚어 준다 (교재 230쪽) */}
        <div style={{ fontSize: 12.5, color: '#8a7063', margin: '18px 2px 9px' }}>
          {target === 'student' ? '어떤 시험인가요?' : '목표 시험·직종'}
          {target !== 'student' && <span style={{ color: ACCENT, fontWeight: 600 }}> *</span>}
        </div>
        <select value={examKind} onChange={e => setExamKind(e.target.value)}
          style={{
            width: '100%', padding: '13px 14px', borderRadius: 12, marginBottom: 10,
            background: CARD, border: `0.5px solid ${LINE}`, color: '#3a2e28',
            fontSize: 14, fontFamily: 'inherit', appearance: 'none',
          }}>
          <option value="">{target === 'student' ? '고르지 않을게요' : '골라 주세요'}</option>
          {EXAM_KINDS.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
        </select>

        {/* ★시험 날짜 — 교재 195쪽 「세운 > 대운 > 월운 > 일진」·「시험일이 공망일이면」
             ★2026-07-29 «필수» 로 돌렸습니다. 대신 모를 때 고를 단추를 함께 둡니다. */}
        <div style={{ fontSize: 12.5, color: '#8a7063', margin: '14px 2px 9px' }}>
          시험(또는 발표) 날짜 <span style={{ color: ACCENT, fontWeight: 600 }}>*</span>
        </div>
        <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)}
          style={{
            width: '100%', padding: '13px 14px', borderRadius: 12,
            background: CARD,
            border: examDate ? `0.5px solid ${LINE}` : `1.5px solid ${ACCENT}55`,
            color: '#3a2e28', fontSize: 14, fontFamily: 'inherit',
          }} />

        {/* 모르는 손님을 위한 빠른 선택 */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {quickDates.map(q => (
            <button key={q.v} onClick={() => setExamDate(q.v)}
              style={{
                flex: 1, padding: '9px 4px', borderRadius: 10, cursor: 'pointer',
                background: examDate === q.v ? '#fdeef4' : CARD,
                border: examDate === q.v ? `1.5px solid ${ACCENT}` : `0.5px solid ${LINE}`,
                color: examDate === q.v ? ACCENT : '#8a7063',
                fontSize: 11.5, fontFamily: 'inherit', fontWeight: examDate === q.v ? 600 : 400,
              }}>{q.label}</button>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: '#8a7063', lineHeight: 1.7, margin: '8px 2px 0' }}>
          * 그날의 일진(日辰)과 월운을 짚어 드리려면 날짜가 필요합니다.
          정확히 모르시면 위 단추로 어림잡아 고르셔도 됩니다.
        </div>

        {/* ★못 넘어가는 까닭을 알려 준다. 단추만 흐리면 손님이 왜 안 되는지 모릅니다. */}
        {!canGo && (
          <div style={{
            marginTop: 13, padding: '11px 13px', borderRadius: 11,
            background: '#fdf4f7', border: `1px solid ${ACCENT}33`,
            fontSize: 11.5, color: '#8c4a63', lineHeight: 1.7,
          }}>
            {!gradeOk && <div>· 학년·신분을 골라 주세요.</div>}
            {!targetOk && <div>· {target === 'student' ? '가고자 하는 목표' : '목표 시험·직종'}를 골라 주세요.</div>}
            {!dateOk && <div>· 시험(또는 발표) 날짜를 골라 주세요.</div>}
          </div>
        )}

        <button
          onClick={() => { if (canGo) router.push(`/manseryeok/exam-luck-result?${query}`) }}
          disabled={!canGo}
          style={{
            width: '100%', marginTop: 14, padding: 15, borderRadius: 12,
            background: canGo ? ACCENT : '#e5d5cd', border: 'none', color: '#fff',
            fontSize: 14.5, fontWeight: 500, fontFamily: 'inherit',
            cursor: canGo ? 'pointer' : 'not-allowed',
          }}>
          {kind === 'job' ? '취업운 보기' : '합격운 보기'}
        </button>

        {/* ★이직·직업 변동은 교재 190~191쪽 자료를 아직 못 받았다. (작업지시 5장)
              "곧 나옵니다" 같은 예고는 화면에 적지 않는다. (교훈 BL) */}

        <div style={{ fontSize: 11.5, color: '#8a7063', lineHeight: 1.7, marginTop: 16, textAlign: 'center' }}>
          태어난 시(時)를 모르셔도 볼 수 있어요.<br />다만 시주를 비워 두고 보게 되니, 그만큼 조심해서 읽어 주세요.
        </div>
      </div>
    </main>
  )
}

export default function ExamLuckInputPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#5c3a1e' }}>불러오는 중…</div>}>
      <ExamLuckInputInner />
    </Suspense>
  )
}
