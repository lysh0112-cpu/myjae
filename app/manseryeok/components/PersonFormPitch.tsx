'use client'
// app/manseryeok/components/PersonFormPitch.tsx
// ============================================================================
// "새로운 사람 추가" / "수정" 공용 입력폼 (피치톤, 신버전).
// 홈의 12서비스가 사람 선택 모달을 거칠 때 공통으로 사용한다.
// ----------------------------------------------------------------------------
// 특징(대표님·목업 확정):
//  - 아바타 + 이름(별명): 이름 첫 글자가 아바타에 실시간 반영
//  - 관계 칩 18개 + "직접 입력" (RELATIONS는 savedPeople.ts에서 가져옴)
//  - 성별·달력 세그먼트 / signup과 동일한 직접입력 생년월일 / 시 드롭다운
//  - 달력 '음력'이면 윤달 여부(평달/윤달) 블록 노출 (기존 PersonForm 규칙과 동일)
//  - "태어난 시간을 몰라요" 체크 → 시 선택 비활성 + '모름' 저장
//  - 추가/수정 겸용: initial이 있으면 수정 모드
//
// 저장은 이 컴포넌트가 직접 하지 않고, onSubmit(draft)로 부모(모달)에 넘긴다.
// 부모가 addSavedPerson/updateSavedPerson을 호출하고 중복 알림을 처리한다.
// (관심사 분리 — 폼은 값만 모으고, 저장·중복판정은 savedPeople.ts)
// ============================================================================

import { useState, useMemo } from 'react'
import { RELATIONS, type PersonDraft, type SavedInputData } from '@/lib/saju/savedPeople'
import { HOURS, HOUR_INDEX, INDEX_TO_HOUR } from '@/lib/saju/myInfo'
import { avatarChar } from '@/lib/saju/savedPeople'

// ── 피치톤 색 (인수인계서 3장 디자인 시스템) ──
const C = {
  cardBg: '#FFFBF7',
  border: '#f0e0d5',
  borderInput: '#e8d5c5',
  brown: '#b46e46',
  point: '#c8783c',
  title: '#3a2e28',
  titleWarm: '#96502e',
  sub: '#b4785a',
  subLight: '#c5a590',
  chipText: '#96502e',
  leapBg: '#fdf3ec',
  leapBorder: '#eabd97',
}

// 아바타 배경색 팔레트 (이름에 따라 안정적으로 하나 고름)
const AVATAR_BG = [
  { bg: '#f4c0d1', fg: '#72243e' },
  { bg: '#f5c4b3', fg: '#712b13' },
  { bg: '#fac775', fg: '#633806' },
  { bg: '#9fe1cb', fg: '#085041' },
  { bg: '#b5d4f4', fg: '#0c447c' },
  { bg: '#cecbf6', fg: '#3c3489' },
]
function avatarColor(title: string) {
  const t = (title ?? '').trim()
  let sum = 0
  for (let i = 0; i < t.length; i++) sum += t.charCodeAt(i)
  return AVATAR_BG[sum % AVATAR_BG.length]
}

export interface PersonFormPitchProps {
  // 수정 모드일 때 초기값 (없으면 추가 모드)
  initial?: { title: string; relation: string; input: SavedInputData }
  // 진입 서비스가 관계를 미리 지정할 수 있음 (예: 궁합에서 '연인')
  presetRelation?: string
  serviceType?: string | null
  // 저장 버튼 문구 (서비스별로 다르게 — 예: '저장하고 사주 보기' / '저장하기')
  submitLabel?: string
  submitting?: boolean
  errorMessage?: string   // 부모가 중복/에러 메시지 내려줌
  onSubmit: (draft: PersonDraft) => void
  onBack?: () => void
  onClose?: () => void
}

export default function PersonFormPitch({
  initial,
  presetRelation,
  serviceType,
  submitLabel = '저장하기',
  submitting = false,
  errorMessage,
  onSubmit,
  onBack,
  onClose,
}: PersonFormPitchProps) {
  const isEdit = !!initial

  const [title, setTitle] = useState(initial?.title ?? '')
  const [relation, setRelation] = useState(initial?.relation ?? presetRelation ?? '')
  const [customRelation, setCustomRelation] = useState(
    initial && !RELATIONS.includes(initial.relation as typeof RELATIONS[number]) ? initial.relation : ''
  )
  const [useCustom, setUseCustom] = useState(
    !!initial && !RELATIONS.includes(initial.relation as typeof RELATIONS[number])
  )

  const [gender, setGender] = useState(initial?.input.gender ?? '남')
  const [calType, setCalType] = useState(initial?.input.calType ?? '양력')
  const [leapMonth, setLeapMonth] = useState(initial?.input.leapMonth ?? '0')
  const [year, setYear] = useState(initial?.input.year ?? '')
  const [month, setMonth] = useState(initial?.input.month ?? '')
  const [day, setDay] = useState(initial?.input.day ?? '')

  // 시: 수정 모드면 저장값 반영, 새 추가면 '시간 입력'이 기본(몰라요 해제)
  const initHour = initial?.input.hour
  const [unknownHour, setUnknownHour] = useState(!!initial && initHour === '모름')
  const [hourLabel, setHourLabel] = useState(
    initHour && initHour !== '모름' ? (INDEX_TO_HOUR[initHour] ?? '') : ''
  )

  const [localErr, setLocalErr] = useState('')

  const onlyNum = (v: string, len: number) => v.replace(/[^0-9]/g, '').slice(0, len)

  const avatar = useMemo(() => avatarColor(title), [title])
  const effectiveRelation = useCustom ? customRelation.trim() : relation

  function handleSubmit() {
    setLocalErr('')
    const t = title.trim()
    if (!t) { setLocalErr('이름을 입력해주세요.'); return }
    if (!effectiveRelation) { setLocalErr('관계를 선택해주세요.'); return }
    const y = parseInt(year, 10), m = parseInt(month, 10), d = parseInt(day, 10)
    if (year.length !== 4 || !y || y < 1900 || y > 2200) { setLocalErr('연도를 4자리로 정확히 입력해주세요.'); return }
    if (!m || m < 1 || m > 12) { setLocalErr('월을 1~12로 입력해주세요.'); return }
    if (!d || d < 1 || d > 31) { setLocalErr('일을 1~31로 입력해주세요.'); return }
    if (!unknownHour && !hourLabel) { setLocalErr('태어난 시를 선택하거나 "시간을 몰라요"를 체크해주세요.'); return }

    const hour = unknownHour ? '모름' : String(HOUR_INDEX[hourLabel] ?? '모름')
    const input: SavedInputData = {
      gender, calType,
      year: String(y), month: String(m), day: String(d),
      leapMonth: calType === '음력' ? leapMonth : '0',
      hour,
    }
    onSubmit({ title: t, relation: effectiveRelation, input, serviceType: serviceType ?? null })
  }

  // ── 스타일 헬퍼 ──
  const label: React.CSSProperties = { fontSize: 11, color: C.sub, marginBottom: 4 }
  const numInput: React.CSSProperties = {
    background: '#fff', border: `0.5px solid ${C.borderInput}`, borderRadius: 8,
    padding: 9, fontSize: 14, color: C.title, textAlign: 'center', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }
  const seg = (active: boolean): React.CSSProperties => ({
    flex: 1, textAlign: 'center', fontSize: 13, padding: '8px 0', cursor: 'pointer',
    background: active ? C.brown : '#fff', color: active ? '#fff' : C.chipText,
    border: 'none',
  })

  return (
    <div style={{ background: C.cardBg, borderRadius: 20, overflow: 'hidden', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>
      {/* 헤더 (고정) */}
      <div style={{ padding: '18px 18px 14px', position: 'relative', textAlign: 'center', borderBottom: `0.5px solid #f5e5da`, flexShrink: 0 }}>
        {onBack && (
          <button onClick={onBack} aria-label="뒤로"
            style={{ position: 'absolute', top: 16, left: 16, background: 'none', border: 'none', cursor: 'pointer', color: C.subLight, fontSize: 18, lineHeight: 1 }}>‹</button>
        )}
        {onClose && (
          <button onClick={onClose} aria-label="닫기"
            style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: C.subLight, fontSize: 19, lineHeight: 1 }}>×</button>
        )}
        <div style={{ fontSize: 17, fontWeight: 500, color: C.title }}>
          {isEdit ? '사람 정보 수정' : '새로운 사람 추가'}
        </div>
      </div>

      <div style={{ padding: '18px 18px 6px', overflowY: 'auto', flex: 1 }}>
        {/* 아바타 + 이름 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, background: avatar.bg, color: avatar.fg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 500, flexShrink: 0,
          }}>{avatarChar(title)}</div>
          <div style={{ flex: 1 }}>
            <div style={label}>이름 (별명)</div>
            <input value={title} onChange={e => setTitle(e.target.value.slice(0, 20))}
              placeholder="예: 아내, 큰딸, 김대표"
              style={{ ...numInput, textAlign: 'left', color: title ? C.title : C.subLight }} />
          </div>
        </div>

        {/* 관계 칩 */}
        <div style={label}>관계</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {RELATIONS.map(r => {
            const active = !useCustom && relation === r
            return (
              <button key={r}
                onClick={() => { setUseCustom(false); setRelation(r) }}
                style={{
                  fontSize: 12, borderRadius: 8, padding: '7px 13px', cursor: 'pointer',
                  background: active ? C.brown : '#fff',
                  color: active ? '#fff' : C.chipText,
                  border: active ? 'none' : `0.5px solid ${C.borderInput}`,
                }}>{r}</button>
            )
          })}
          <button
            onClick={() => setUseCustom(true)}
            style={{
              fontSize: 12, borderRadius: 8, padding: '7px 13px', cursor: 'pointer',
              background: useCustom ? C.brown : '#fff',
              color: useCustom ? '#fff' : C.point,
              border: useCustom ? 'none' : `0.5px dashed ${C.leapBorder}`,
            }}>직접 입력</button>
        </div>

        {/* 직접 입력 칸 */}
        {useCustom && (
          <input value={customRelation} onChange={e => setCustomRelation(e.target.value.slice(0, 20))}
            placeholder="관계를 직접 입력"
            style={{ ...numInput, textAlign: 'left', marginBottom: 16, color: customRelation ? C.title : C.subLight }} />
        )}

        {/* 성별 · 달력 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={label}>성별</div>
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `0.5px solid ${C.borderInput}` }}>
              <button onClick={() => setGender('남')} style={seg(gender === '남')}>남</button>
              <button onClick={() => setGender('여')} style={seg(gender === '여')}>여</button>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={label}>달력</div>
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `0.5px solid ${C.borderInput}` }}>
              <button onClick={() => { setCalType('양력'); setLeapMonth('0') }} style={seg(calType === '양력')}>양력</button>
              <button onClick={() => setCalType('음력')} style={seg(calType === '음력')}>음력</button>
            </div>
          </div>
        </div>

        {/* 윤달 — 음력일 때만 */}
        {calType === '음력' && (
          <div style={{ background: C.leapBg, border: `0.5px dashed ${C.leapBorder}`, borderRadius: 10, padding: '11px 12px', marginBottom: 14 }}>
            <div style={{ ...label, marginBottom: 7 }}>윤달 여부 <span style={{ color: C.subLight }}>(음력 생일이 윤달이면 선택)</span></div>
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `0.5px solid ${C.borderInput}` }}>
              <button onClick={() => setLeapMonth('0')} style={seg(leapMonth !== '1')}>평달</button>
              <button onClick={() => setLeapMonth('1')} style={seg(leapMonth === '1')}>윤달</button>
            </div>
          </div>
        )}

        {/* 생년월일 (년: 손 입력 / 월·일: 드롭다운) */}
        <div style={label}>생년월일 {calType === '음력' && <span style={{ color: C.subLight }}>(음력)</span>}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 14 }}>
          <input value={year} onChange={e => setYear(onlyNum(e.target.value, 4))} inputMode="numeric" placeholder="1990" style={{ ...numInput, flex: 1.6 }} />
          <span style={{ fontSize: 12, color: C.sub }}>년</span>
          <select value={month} onChange={e => setMonth(e.target.value)}
            style={{ ...numInput, flex: 1, padding: '9px 4px', appearance: 'none', color: month ? C.title : C.subLight, cursor: 'pointer' }}>
            <option value="">월</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
          </select>
          <span style={{ fontSize: 12, color: C.sub }}>월</span>
          <select value={day} onChange={e => setDay(e.target.value)}
            style={{ ...numInput, flex: 1, padding: '9px 4px', appearance: 'none', color: day ? C.title : C.subLight, cursor: 'pointer' }}>
            <option value="">일</option>
            {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
          </select>
          <span style={{ fontSize: 12, color: C.sub }}>일</span>
        </div>

        {/* 태어난 시 */}
        <div style={label}>태어난 시 (시주)</div>
        <select value={hourLabel} disabled={unknownHour}
          onChange={e => setHourLabel(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8, border: `0.5px solid ${C.borderInput}`,
            background: unknownHour ? '#f7f0ea' : '#fff',
            color: unknownHour ? C.subLight : (hourLabel ? C.title : C.subLight),
            fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10,
          }}>
          <option value="">시간 선택</option>
          {HOURS.filter(h => h !== '모름').map(h => <option key={h} value={h}>{h}</option>)}
        </select>

        {/* 시간 몰라요 */}
        <button onClick={() => { setUnknownHour(v => !v); setHourLabel('') }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 6 }}>
          <span style={{
            width: 18, height: 18, borderRadius: 5, border: `0.5px solid ${C.borderInput}`,
            background: unknownHour ? C.brown : '#fff', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
          }}>{unknownHour ? '✓' : ''}</span>
          <span style={{ fontSize: 12, color: C.sub }}>태어난 시간을 몰라요</span>
        </button>
      </div>

      {/* 저장 버튼 (하단 고정 — 항상 보임) */}
      <div style={{ padding: '10px 16px 16px', flexShrink: 0, borderTop: `0.5px solid #f5e5da`, background: C.cardBg }}>
        {(localErr || errorMessage) && (
          <div style={{ color: '#c05a5a', fontSize: 12, marginBottom: 8, textAlign: 'center' }}>{localErr || errorMessage}</div>
        )}
        <button onClick={handleSubmit} disabled={submitting}
          style={{
            width: '100%', background: C.brown, borderRadius: 12, padding: 14, border: 'none',
            color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: submitting ? 0.6 : 1,
          }}>
          {submitting ? '저장 중…' : (isEdit ? '수정 완료' : submitLabel)}
        </button>
      </div>
    </div>
  )
}
