'use client'
// app/manseryeok/components/PersonFormPitch.tsx
// ============================================================================
// "새로운 사람 추가" / "수정" 공용 입력폼 (피치톤, 신버전).
// 홈의 12서비스가 사람 선택 모달을 거칠 때 공통으로 사용한다.
// ----------------------------------------------------------------------------
// 특징(대표님·목업 확정):
//  - 아바타 + 이름(별명): 이름 첫 글자가 아바타에 실시간 반영
//  - 관계는 카테고리(가족/연인/지인/직접입력) → 세부 2단으로 고른다.
//    칩 17개를 전부 펼치면 화면 절반을 먹어서 2026-07에 접었다.
//    저장되는 relation 문자열은 예전과 동일 (분류는 화면용).
//  - 성별·달력 세그먼트 / 연도는 손입력·월일은 드롭다운 (전 화면 통일 규칙)
//  - 달력 '음력'이면 윤달 여부(평달/윤달) 블록 노출 (기존 PersonForm 규칙과 동일)
//  - 시(時)는 반드시 입력받는다 (대표님 확정 2026-07 — 회원가입과 동일 규칙).
//    예전엔 "태어난 시간을 몰라요" 체크박스가 있었으나 제거.
//    정확히 모르면 시간대 버튼(새벽/아침낮/오후/밤)으로 3개까지 좁혀서 고른다.
//  - 추가/수정 겸용: initial이 있으면 수정 모드
//
// 저장은 이 컴포넌트가 직접 하지 않고, onSubmit(draft)로 부모(모달)에 넘긴다.
// 부모가 addSavedPerson/updateSavedPerson을 호출하고 중복 알림을 처리한다.
// (관심사 분리 — 폼은 값만 모으고, 저장·중복판정은 savedPeople.ts)
// ============================================================================

import { useState, useMemo } from 'react'
import {
  RELATIONS, RELATION_CATEGORIES, categoryOfRelation,
  type PersonDraft, type SavedInputData,
} from '@/lib/saju/savedPeople'
import {
  hourLabelOf, normalizeHourLabel, toStoredHour,
  TIME_BANDS, MONTHS, dayOptions, clampDay, isValidBirthDate,
  crossesMidnight, type TimeBand,
} from '@/lib/saju/birthInput'

// 시(時) 목록 — 공용 birthInput.ts 기준 (30분법 · 공백없음). '모름' 없음.
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i),
  label: hourLabelOf(i),
}))
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
  // 열려 있는 카테고리. 수정 모드면 저장된 관계가 속한 곳을, 새로 추가면 '가족'을 편다.
  const [relCat, setRelCat] = useState<typeof RELATION_CATEGORIES[number]['key']>(() => {
    const r = initial?.relation ?? presetRelation
    return r ? categoryOfRelation(r) : 'family'
  })

  const [gender, setGender] = useState(initial?.input.gender ?? '남')
  const [calType, setCalType] = useState(initial?.input.calType ?? '양력')
  const [leapMonth, setLeapMonth] = useState(initial?.input.leapMonth ?? '0')
  const [year, setYear] = useState(initial?.input.year ?? '')
  const [month, setMonth] = useState(initial?.input.month ?? '')
  const [day, setDay] = useState(initial?.input.day ?? '')

  // 시: 수정 모드면 저장값('0'~'11') 그대로. 옛 '모름' 값은 빈칸으로 두어 새로 고르게 한다.
  const initHourIdx = normalizeHourLabel(initial?.input.hour)
  const [hour, setHour] = useState(initHourIdx == null ? '' : String(initHourIdx))
  const [band, setBand] = useState<TimeBand | null>(null)   // 시간대 보조 필터

  const [localErr, setLocalErr] = useState('')

  const onlyNum = (v: string, len: number) => v.replace(/[^0-9]/g, '').slice(0, len)

  // 연/월/달력을 바꾸면 이미 고른 '일'이 범위를 벗어날 수 있다 (3/31 → 2월)
  const applyYear = (v: string) => {
    const y = onlyNum(v, 4)
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

  // 시간대를 고르면 그 안의 3개만 (band.hours 순서 = 시간 순)
  const visibleHours = band ? band.hours.map(i => HOUR_OPTIONS[i]) : HOUR_OPTIONS
  const pickBand = (b: TimeBand) => {
    if (band?.key === b.key) { setBand(null); return }
    setBand(b)
    if (hour && !b.hours.includes(Number(hour))) setHour('')
  }

  const avatar = useMemo(() => avatarColor(title), [title])
  const effectiveRelation = useCustom ? customRelation.trim() : relation

  function handleSubmit() {
    setLocalErr('')
    const t = title.trim()
    if (!t) { setLocalErr('이름을 입력해주세요.'); return }
    if (!effectiveRelation) { setLocalErr('관계를 선택해주세요.'); return }
    const y = parseInt(year, 10), m = parseInt(month, 10), d = parseInt(day, 10)
    if (year.length !== 4 || !y || y < 1900 || y > 2200) { setLocalErr('연도를 4자리로 정확히 입력해주세요.'); return }
    if (!m || m < 1 || m > 12) { setLocalErr('월을 골라주세요.'); return }
    if (!d || d < 1) { setLocalErr('일을 골라주세요.'); return }
    if (!isValidBirthDate(year, month, day, calType)) { setLocalErr('생년월일이 올바르지 않아요. 다시 확인해주세요.'); return }
    if (!hour) { setLocalErr('태어난 시를 선택해주세요. 정확히 모르시면 시간대 버튼으로 골라주세요.'); return }

    const hourValue = toStoredHour(normalizeHourLabel(hour))
    const input: SavedInputData = {
      gender, calType,
      year: String(y), month: String(m), day: String(d),
      leapMonth: calType === '음력' ? leapMonth : '0',
      hour: hourValue,
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

        {/* 관계 — ① 탭으로 갈래를 고르고 ② 그 안에서 세부 관계를 고른다
            ★2026-07-21 2차: 탭과 세부 칩이 같은 모양이라 헷갈린다는 지적을 반영.
              탭은 홈 「오늘의 운세 / 이달의 운세」와 같은 모양(회색 바탕에 선택만 채움),
              세부는 둥근 칩으로 바꿔 한눈에 구분되게 했다. */}
        <div style={label}>관계</div>
        <div style={{ display: 'flex', gap: 4, background: '#f5ebe2', borderRadius: 9, padding: 3, marginBottom: 10 }}>
          {RELATION_CATEGORIES.map(c => {
            const on = relCat === c.key
            return (
              <button key={c.key}
                onClick={() => {
                  setRelCat(c.key)
                  if (c.key === 'custom') { setUseCustom(true) }
                  else { setUseCustom(false); if (!c.items.includes(relation)) setRelation('') }
                }}
                style={{
                  flex: 1, fontSize: 12, borderRadius: 7, padding: '7px 2px', cursor: 'pointer',
                  border: 'none', fontWeight: on ? 600 : 400,
                  background: on ? C.brown : 'transparent',
                  color: on ? '#fff' : C.sub,
                }}>{c.label}</button>
            )
          })}
        </div>

        {relCat === 'custom' ? (
          <input value={customRelation} onChange={e => setCustomRelation(e.target.value.slice(0, 20))}
            placeholder="관계를 직접 입력 (예: 사장님, 은사님)"
            style={{ ...numInput, textAlign: 'left', marginBottom: 16, color: customRelation ? C.title : C.subLight }} />
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {(RELATION_CATEGORIES.find(c => c.key === relCat)?.items ?? []).map(r => {
              const active = !useCustom && relation === r
              return (
                <button key={r}
                  onClick={() => { setUseCustom(false); setRelation(r) }}
                  style={{
                    fontSize: 12, borderRadius: 20, padding: '7px 14px', cursor: 'pointer',
                    background: active ? '#faede0' : '#fff',
                    color: active ? '#8f3d0e' : C.chipText,
                    border: active ? '0.5px solid #f5d5b8' : `0.5px solid ${C.borderInput}`,
                    fontWeight: active ? 600 : 400,
                  }}>{r}</button>
              )
            })}
          </div>
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
              <button onClick={() => { applyCalType('양력'); setLeapMonth('0') }} style={seg(calType === '양력')}>양력</button>
              <button onClick={() => applyCalType('음력')} style={seg(calType === '음력')}>음력</button>
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
          <input value={year} onChange={e => applyYear(e.target.value)} inputMode="numeric" placeholder="1990" style={{ ...numInput, flex: 1.6 }} />
          <span style={{ fontSize: 12, color: C.sub }}>년</span>
          <select value={month} onChange={e => applyMonth(e.target.value)}
            style={{ ...numInput, flex: 1, padding: '9px 4px', appearance: 'none', color: month ? C.title : C.subLight, cursor: 'pointer' }}>
            <option value="">월</option>
            {MONTHS.map(m => <option key={m} value={String(m)}>{m}</option>)}
          </select>
          <span style={{ fontSize: 12, color: C.sub }}>월</span>
          <select value={day} onChange={e => setDay(e.target.value)}
            style={{ ...numInput, flex: 1, padding: '9px 4px', appearance: 'none', color: day ? C.title : C.subLight, cursor: 'pointer' }}>
            <option value="">일</option>
            {dayOptions(parseInt(year, 10), parseInt(month, 10), calType).map(d => <option key={d} value={String(d)}>{d}</option>)}
          </select>
          <span style={{ fontSize: 12, color: C.sub }}>일</span>
        </div>

        {/* 태어난 시 */}
        <div style={label}>태어난 시 (시주)</div>
        <select value={hour} onChange={e => setHour(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8, border: `0.5px solid ${C.borderInput}`,
            background: '#fff', color: hour ? C.title : C.subLight,
            fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 8,
          }}>
          <option value="">시간 선택</option>
          {visibleHours.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
        </select>

        {/* 시를 정확히 모를 때 — 고르면 3개로 좁혀진다 */}
        <div style={{ fontSize: 10.5, color: C.subLight, marginBottom: 5 }}>정확히 모르시면 대략 언제쯤인지 골라보세요</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          {TIME_BANDS.map(b => {
            const on = band?.key === b.key
            return (
              <button key={b.key} type="button" onClick={() => pickBand(b)} style={{
                flex: 1, padding: '7px 2px', borderRadius: 8,
                border: on ? 'none' : `0.5px solid ${C.borderInput}`,
                background: on ? C.brown : '#fff',
                color: on ? '#fff' : C.sub,
                cursor: 'pointer', lineHeight: 1.3,
              }}>
                <div style={{ fontSize: 11.5, fontWeight: 600 }}>{b.label}</div>
                <div style={{ fontSize: 9, opacity: 0.75 }}>{b.range}</div>
              </button>
            )
          })}
        </div>
        {band && (
          <div style={{ fontSize: 10.5, color: C.titleWarm, marginBottom: 6, lineHeight: 1.6 }}>
            {band.label} 시간대 3개 중에서 골라주세요. 다시 누르면 전체가 보여요.
          </div>
        )}
        {hour !== '' && crossesMidnight(Number(hour)) && (
          <div style={{ fontSize: 10.5, color: '#c05a5a', marginBottom: 6, lineHeight: 1.6 }}>
            子시는 밤 11시 30분부터 다음 날 새벽 1시 30분까지예요. 자정을 넘겨 태어났다면 생년월일을 다시 확인해주세요.
          </div>
        )}
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
