'use client'

/**
 * 전문가용 만세력 계산기 — 저장목록 + 인적사항 등록 + 만세력 조회
 * ─────────────────────────────────────────────
 * 진입: 마이페이지 > 전문가용 만세력 계산기
 * 흐름: 저장목록 > [+ 새로 등록] > 인적사항 입력 > 저장 > 목록
 *       목록 카드 클릭 > 만세력 조회 (?pro=1&mode=chart — 통변 없음, 합충 토글)
 *
 * 저장/조회는 전용 테이블 expert_people 사용 (고객용 saju_records와 완전 분리).
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listExpertPeople, addExpertPerson, deleteExpertPerson,
  toExpertResultUrl, expertAvatarChar,
  type ExpertPerson,
} from '@/lib/saju/expertPeople'
import {
  hourLabelOf, MONTHS, dayOptions, clampDay, isValidBirthDate,
} from '@/lib/saju/birthInput'

// 시(時) 목록 — 공용 birthInput.ts 기준 (30분법 · 공백없음).
//   ★ 전문가용은 '모름'을 남긴다.
//     고객 사주를 대신 등록할 때 시를 모르는 경우가 실제로 있기 때문.
//     (일반 회원가입은 '모름' 없이 반드시 입력 — 대표님 확정 2026-07)
const HOUR_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '모름', label: '모름' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: hourLabelOf(i) })),
]

function ExpertInner() {
  const router = useRouter()
  const [people, setPeople] = useState<ExpertPerson[] | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDel, setConfirmDel] = useState<ExpertPerson | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // 입력 상태
  const [nick, setNick] = useState('')
  const [gender, setGender] = useState('남')
  const [calType, setCalType] = useState('양력')
  const [leapMonth, setLeapMonth] = useState('0')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [hour, setHour] = useState('모름')   // '모름' 또는 '0'~'11'

  const load = () => { listExpertPeople().then(setPeople) }
  useEffect(() => { load() }, [])

  const resetForm = () => {
    setNick(''); setGender('남'); setCalType('양력'); setLeapMonth('0')
    setYear(''); setMonth(''); setDay(''); setHour('모름'); setErr('')
  }

  const save = async () => {
    setErr('')
    if (!nick.trim()) { setErr('닉네임을 입력해 주세요.'); return }
    if (year.length !== 4 || !month || !day) { setErr('생년월일을 정확히 입력해 주세요.'); return }
    if (!isValidBirthDate(year, month, day, calType)) { setErr('생년월일이 올바르지 않아요. 다시 확인해 주세요.'); return }
    setBusy(true)
    const res = await addExpertPerson({
      name: nick.trim(),
      gender, calType, year, month, day, leapMonth,
      hour,   // '모름' 또는 '0'~'11' (그대로 저장)
    })
    setBusy(false)
    if (!res.ok) {
      if (res.reason === 'duplicate') setErr('이미 같은 사주가 저장되어 있어요.')
      else if (res.reason === 'not_logged_in') { router.push('/login'); return }
      else if (res.reason === 'invalid') setErr('입력값을 확인해 주세요.')
      else setErr('저장하지 못했어요.')
      return
    }
    resetForm(); setShowForm(false); load()
  }

  // 연/월/달력을 바꾸면 이미 고른 '일'이 범위를 벗어날 수 있다 (3/31 → 2월)
  const applyYear = (v: string) => {
    const y = v.replace(/\D/g, '').slice(0, 4)
    setYear(y)
    if (month && day) setDay(clampDay(day, parseInt(y, 10), parseInt(month, 10), calType))
  }
  const applyMonth = (m: string) => {
    setMonth(m)
    if (day) setDay(clampDay(day, parseInt(year, 10), parseInt(m, 10), calType))
  }
  const applyCalType = (c: string) => {
    setCalType(c)
    if (month && day) setDay(clampDay(day, parseInt(year, 10), parseInt(month, 10), c))
  }

  const del = async () => {
    if (!confirmDel) return
    setBusy(true)
    await deleteExpertPerson(confirmDel.id)
    setBusy(false); setConfirmDel(null); load()
  }

  const seg = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
    background: active ? '#b46e46' : '#f5efe9', color: active ? '#fff' : '#b09a88',
  })
  const inp: React.CSSProperties = {
    flex: 1, background: '#faf7f4', border: '0.5px solid #eaddd2', borderRadius: 8,
    padding: '10px 8px', color: '#5a4a3e', fontSize: 15, outline: 'none', textAlign: 'center', width: '100%',
  }
  // 드롭다운 (기본 화살표 숨기고 직접 그림 — 좁은 칸에서 글자가 가려지지 않게)
  const sel: React.CSSProperties = {
    ...inp, textAlign: 'left', appearance: 'none', cursor: 'pointer',
    paddingRight: 22, paddingLeft: 8,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23c5a590' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 7px center',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 430, margin: '0 auto', fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif" }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#fff', borderBottom: '0.5px solid #f0e0d5' }}>
        <span onClick={() => router.back()} style={{ fontSize: 20, color: '#96502e', cursor: 'pointer' }}>‹</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#96502e' }}>전문가용 만세력 계산기</span>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 11, color: '#c5a590', marginBottom: 12 }}>아무 사주나 등록해 만세력을 확인하는 도구예요. (통변 없음)</div>

        {/* 새로 등록 버튼 */}
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true) }}
            style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: '0.5px dashed #d0a878', background: '#fffbf7', color: '#96502e', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>
            + 새로 등록
          </button>
        )}

        {/* 입력 폼 */}
        {showForm && (
          <div style={{ background: '#fff', border: '0.5px solid #f0e0d5', borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: '#999', marginBottom: 4 }}>닉네임</div>
            <input value={nick} onChange={e => setNick(e.target.value.slice(0, 20))} placeholder="예: 김고객 / A씨 / 상담123"
              style={{ ...inp, textAlign: 'left', marginBottom: 12 }} />

            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <button onClick={() => setGender('남')} style={seg(gender === '남')}>남성</button>
              <button onClick={() => setGender('여')} style={seg(gender === '여')}>여성</button>
              <div style={{ width: 8 }} />
              <button onClick={() => applyCalType('양력')} style={seg(calType === '양력')}>양력</button>
              <button onClick={() => applyCalType('음력')} style={seg(calType === '음력')}>음력</button>
            </div>

            {calType === '음력' && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <button onClick={() => setLeapMonth('0')} style={seg(leapMonth === '0')}>평달</button>
                <button onClick={() => setLeapMonth('1')} style={seg(leapMonth === '1')}>윤달</button>
              </div>
            )}

            {/* 연도는 손 입력, 월·일은 드롭다운 (전 화면 통일 규칙) */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
              <input value={year} onChange={e => applyYear(e.target.value)}
                inputMode="numeric" placeholder="년(4자리)" style={{ ...inp, flex: 1.5 }} />
              <select value={month} onChange={e => applyMonth(e.target.value)}
                style={{ ...sel, flex: 1, color: month ? '#5a4a3e' : '#c5a590' }}>
                <option value="">월</option>
                {MONTHS.map(m => <option key={m} value={String(m)}>{m}월</option>)}
              </select>
              <select value={day} onChange={e => setDay(e.target.value)}
                style={{ ...sel, flex: 1, color: day ? '#5a4a3e' : '#c5a590' }}>
                <option value="">일</option>
                {dayOptions(parseInt(year, 10), parseInt(month, 10), calType)
                  .map(d => <option key={d} value={String(d)}>{d}일</option>)}
              </select>
            </div>

            <select value={hour} onChange={e => setHour(e.target.value)}
              style={{ ...sel, marginBottom: 12 }}>
              {HOUR_OPTIONS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>

            {err && <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 10 }}>{err}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowForm(false); resetForm() }}
                style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '0.5px solid #e8d5c5', background: 'none', color: '#b4785a', fontSize: 14, cursor: 'pointer' }}>취소</button>
              <button onClick={save} disabled={busy}
                style={{ flex: 2, padding: '12px 0', borderRadius: 10, border: 'none', background: '#b46e46', color: '#fff', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                {busy ? '저장 중…' : '저장하고 목록에 추가'}
              </button>
            </div>
          </div>
        )}

        {/* 저장목록 */}
        <div style={{ fontSize: 12, fontWeight: 700, color: '#96502e', margin: '6px 2px 10px' }}>
          저장 목록 {people ? `(${people.length})` : ''}
        </div>

        {people === null ? (
          <div style={{ textAlign: 'center', color: '#c5a590', fontSize: 12, padding: 20 }}>불러오는 중…</div>
        ) : people.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#c5a590', fontSize: 12, padding: 24, background: '#fff', border: '0.5px dashed #f0e0d5', borderRadius: 12 }}>
            아직 등록한 사주가 없어요.<br />위 [+ 새로 등록]으로 추가해 보세요.
          </div>
        ) : (
          people.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#fff', border: '0.5px solid #f0e0d5', borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#f3ece5', color: '#96502e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                {expertAvatarChar(p.name)}
              </div>
              <div onClick={() => router.push(toExpertResultUrl(p))} style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#a08e7e' }}>
                  {p.calType} {p.year}.{p.month}.{p.day} · {p.gender === '여' ? '여성' : '남성'}
                </div>
              </div>
              <button onClick={() => router.push(toExpertResultUrl(p))}
                style={{ fontSize: 11, color: '#96502e', border: '0.5px solid #e8d5c5', borderRadius: 8, padding: '5px 11px', background: '#fffbf7', cursor: 'pointer', flexShrink: 0 }}>조회</button>
              <button onClick={() => setConfirmDel(p)}
                style={{ fontSize: 11, color: '#c09080', border: '0.5px solid #f0e0d5', borderRadius: 8, padding: '5px 9px', background: 'none', cursor: 'pointer', flexShrink: 0 }}>삭제</button>
            </div>
          ))
        )}
      </div>

      {/* 삭제 확인 */}
      {confirmDel && (
        <div onClick={() => setConfirmDel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 300, width: '100%', background: '#fff', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>삭제할까요?</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>“{confirmDel.name}”을(를) 목록에서 지웁니다.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDel(null)} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '0.5px solid #e8d5c5', background: 'none', color: '#b4785a', fontSize: 13, cursor: 'pointer' }}>취소</button>
              <button onClick={del} disabled={busy} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: '#c0392b', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? '삭제 중…' : '삭제'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ExpertPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#FDF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#c8783c', fontSize: 14 }}>로딩 중...</div>
      </div>
    }>
      <ExpertInner />
    </Suspense>
  )
}
