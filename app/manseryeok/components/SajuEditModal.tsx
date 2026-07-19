'use client'

// ============================================================================
// 내 정보 수정 모달 (닉네임 + 사주)
// ----------------------------------------------------------------------------
// 쓰는 법:
//   <SajuEditModal open={open} onClose={() => setOpen(false)} onSaved={reload} />
//
// ⚠ 이 파일은 마이페이지(app/mypage-new/page.tsx)의 검증된 편집폼을 그대로 옮긴 것.
//   2026-07-19 6단계 작업으로 정리된 내용(30분법 통일·시간대 4버튼·없는 날짜 차단)을
//   하나도 바꾸지 않고 이식했다. 새로 발명한 규칙 없음.
//
// 시각 기준은 lib/saju/birthInput.ts 의 USE_HALF_HOUR 하나가 통제한다.
// ============================================================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  hourLabelOf, normalizeHourLabel, toStoredHour,
  MONTHS, dayOptions, clampDay, isValidBirthDate,
  TIME_BANDS, crossesMidnight, type TimeBand,
} from '@/lib/saju/birthInput'

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i),
  label: hourLabelOf(i),
}))

type EditProfile = {
  nickname: string | null
  birth_year: number | null
  birth_month: number | null
  birth_day: number | null
  birth_hour: string | null
  cal_type: string | null
  gender: string | null
}

export default function SajuEditModal({
  open, onClose, onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved?: () => void
}) {
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)

  const [eNick, setENick] = useState('')
  const [eYear, setEYear] = useState('')
  const [eMonth, setEMonth] = useState('')
  const [eDay, setEDay] = useState('')
  const [eHour, setEHour] = useState('')            // '0'~'11' (인덱스 문자열)
  const [eBand, setEBand] = useState<TimeBand | null>(null)
  const [eCal, setECal] = useState<'양력' | '음력'>('양력')
  const [eGender, setEGender] = useState<'남' | '여'>('남')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // 모달이 열릴 때마다 지금 저장된 값을 불러와 채운다
  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setMsg('')
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) { if (!cancelled) setLoading(false); return }
      if (cancelled) return
      setUserId(u.user.id)

      const { data: p } = await supabase.from('profiles')
        .select('nickname, birth_year, birth_month, birth_day, birth_hour, cal_type, gender')
        .eq('id', u.user.id)
        .maybeSingle()
      if (cancelled) return

      const prof = (p || {}) as EditProfile
      setENick(prof.nickname || '')
      setEYear(prof.birth_year ? String(prof.birth_year) : '')
      setEMonth(prof.birth_month ? String(prof.birth_month) : '')
      setEDay(prof.birth_day ? String(prof.birth_day) : '')
      // 저장값('0'~'11')을 그대로 쓴다. 예전 '모름' 값은 빈칸으로 두어 새로 고르게 한다.
      const hIdx = normalizeHourLabel(prof.birth_hour)
      setEHour(hIdx == null ? '' : String(hIdx))
      setEBand(null)
      setECal((prof.cal_type as '양력' | '음력') || '양력')
      setEGender((prof.gender as '남' | '여') || '남')
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [open])

  const onlyNum = (v: string, len: number) => v.replace(/[^0-9]/g, '').slice(0, len)

  const applyEYear = (v: string) => {
    const y = onlyNum(v, 4)
    setEYear(y)
    if (eMonth && eDay) setEDay(clampDay(eDay, parseInt(y, 10), parseInt(eMonth, 10), eCal))
  }
  const applyEMonth = (m: string) => {
    setEMonth(m)
    if (eDay) setEDay(clampDay(eDay, parseInt(eYear, 10), parseInt(m, 10), eCal))
  }
  const applyECal = (c: '양력' | '음력') => {
    setECal(c)
    if (eMonth && eDay) setEDay(clampDay(eDay, parseInt(eYear, 10), parseInt(eMonth, 10), c))
  }

  // 시간대를 고르면 그 안의 3개만 (band.hours 순서 = 시간 순)
  const eVisibleHours = eBand ? eBand.hours.map(i => HOUR_OPTIONS[i]) : HOUR_OPTIONS
  const pickEBand = (b: TimeBand) => {
    if (eBand?.key === b.key) { setEBand(null); return }
    setEBand(b)
    if (eHour && !b.hours.includes(Number(eHour))) setEHour('')
  }

  const save = async () => {
    const name = eNick.trim()
    if (!name) { setMsg('닉네임을 입력해주세요.'); return }
    if (name.length > 20) { setMsg('닉네임은 20자 이내로 입력해주세요.'); return }

    const y = parseInt(eYear, 10), m = parseInt(eMonth, 10), d = parseInt(eDay, 10)
    if (!y || eYear.length !== 4 || y < 1900 || y > 2200) { setMsg('연도를 4자리로 정확히 입력해주세요.'); return }
    if (!m || m < 1 || m > 12) { setMsg('월을 골라주세요.'); return }
    if (!d || d < 1) { setMsg('일을 골라주세요.'); return }
    if (!isValidBirthDate(eYear, eMonth, eDay, eCal)) { setMsg('생년월일이 올바르지 않아요. 다시 확인해주세요.'); return }
    if (!eHour) { setMsg('시(시주)를 선택해주세요. 정확히 모르시면 시간대 버튼으로 골라주세요.'); return }

    const hourValue = toStoredHour(normalizeHourLabel(eHour))
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      nickname: name,
      birth_year: y, birth_month: m, birth_day: d,
      birth_hour: hourValue, cal_type: eCal, gender: eGender, saju_saved: true,
    }).eq('id', userId)
    setSaving(false)
    if (error) { setMsg('저장 실패: ' + error.message); return }
    onSaved?.()
    onClose()
  }

  if (!open) return null

  const numInput: React.CSSProperties = { flex: 1, minWidth: 0, padding: '10px 6px', borderRadius: 8, textAlign: 'center', border: '0.5px solid #e8d5c5', background: '#fff', color: '#3a2e28', fontSize: 14, outline: 'none' }
  // 드롭다운 (좁은 칸에서 글자가 화살표에 가려지지 않게 직접 그림)
  const selInput: React.CSSProperties = {
    ...numInput, appearance: 'none', cursor: 'pointer', textAlign: 'left',
    paddingLeft: 8, paddingRight: 20,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23c5a590' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center',
  }
  const seg = (on: boolean): React.CSSProperties => ({ flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: on ? '#b46e46' : 'transparent', color: on ? '#fff' : '#b4785a' })
  const label: React.CSSProperties = { fontSize: 11, color: '#b4785a', marginBottom: 4 }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(60,40,30,0.35)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 430, background: '#FFFBF7',
          borderRadius: '18px 18px 0 0', padding: 16,
          maxHeight: '88vh', display: 'flex', flexDirection: 'column',
          color: '#3a2e28',
        }}
      >
        {/* 헤더 (고정) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#96502e' }}>✦ 내 정보 수정</span>
          <button onClick={onClose} aria-label="닫기" style={{ background: 'none', border: 'none', fontSize: 17, color: '#c5a590', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: '#c0a898', textAlign: 'center', padding: '30px 0' }}>불러오는 중…</div>
        ) : (
          <>
            {/* 가운데만 스크롤 */}
            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
              <div style={label}>닉네임</div>
              <input
                value={eNick}
                onChange={e => setENick(e.target.value)}
                placeholder="닉네임을 입력하세요"
                maxLength={20}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e8d5c5', background: '#fff', color: '#3a2e28', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
              />

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={label}>성별</div>
                  <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '0.5px solid #e8d5c5' }}>
                    <button onClick={() => setEGender('남')} style={seg(eGender === '남')}>남</button>
                    <button onClick={() => setEGender('여')} style={seg(eGender === '여')}>여</button>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={label}>달력</div>
                  <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '0.5px solid #e8d5c5' }}>
                    <button onClick={() => applyECal('양력')} style={seg(eCal === '양력')}>양력</button>
                    <button onClick={() => applyECal('음력')} style={seg(eCal === '음력')}>음력</button>
                  </div>
                </div>
              </div>

              <div style={label}>생년월일</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                <input value={eYear} onChange={e => applyEYear(e.target.value)} inputMode="numeric" placeholder="1990" style={{ ...numInput, flex: 1.5 }} />
                <span style={{ fontSize: 12, color: '#b4785a' }}>년</span>
                <select value={eMonth} onChange={e => applyEMonth(e.target.value)} style={{ ...selInput, color: eMonth ? '#3a2e28' : '#b4785a' }}>
                  <option value="">월</option>
                  {MONTHS.map(m => <option key={m} value={String(m)}>{m}</option>)}
                </select>
                <span style={{ fontSize: 12, color: '#b4785a' }}>월</span>
                <select value={eDay} onChange={e => setEDay(e.target.value)} style={{ ...selInput, color: eDay ? '#3a2e28' : '#b4785a' }}>
                  <option value="">일</option>
                  {dayOptions(parseInt(eYear, 10), parseInt(eMonth, 10), eCal).map(d => <option key={d} value={String(d)}>{d}</option>)}
                </select>
                <span style={{ fontSize: 12, color: '#b4785a' }}>일</span>
              </div>

              <div style={label}>태어난 시 (시주)</div>
              <select value={eHour} onChange={e => setEHour(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e8d5c5', background: '#fff', color: eHour ? '#3a2e28' : '#b4785a', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}>
                <option value="">시간 선택</option>
                {eVisibleHours.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>

              {/* 시를 정확히 모르는 사람용 — 고르면 3개로 좁혀진다 */}
              <div style={{ fontSize: 10.5, color: '#c5a590', marginBottom: 5 }}>정확히 모르시면 대략 언제쯤인지 골라보세요</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: eBand || (eHour !== '' && crossesMidnight(Number(eHour))) ? 6 : 12 }}>
                {TIME_BANDS.map(b => {
                  const on = eBand?.key === b.key
                  return (
                    <button key={b.key} type="button" onClick={() => pickEBand(b)} style={{
                      flex: 1, padding: '7px 2px', borderRadius: 8,
                      border: on ? 'none' : '0.5px solid #e8d5c5',
                      background: on ? '#b46e46' : '#fff',
                      color: on ? '#fff' : '#b4785a',
                      cursor: 'pointer', lineHeight: 1.3,
                    }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600 }}>{b.label}</div>
                      <div style={{ fontSize: 9, opacity: 0.75 }}>{b.range}</div>
                    </button>
                  )
                })}
              </div>
              {eBand && (
                <div style={{ fontSize: 10.5, color: '#96502e', marginBottom: 12, lineHeight: 1.6 }}>
                  {eBand.label} 시간대 3개 중에서 골라주세요. 다시 누르면 전체가 보여요.
                </div>
              )}
              {eHour !== '' && crossesMidnight(Number(eHour)) && (
                <div style={{ fontSize: 10.5, color: '#c05a5a', marginBottom: 12, lineHeight: 1.6 }}>
                  子시는 밤 11시 30분부터 다음 날 새벽 1시 30분까지예요. 자정을 넘겨 태어나셨다면 생년월일을 다시 확인해주세요.
                </div>
              )}
              {msg && <div style={{ color: '#c05a5a', fontSize: 12, marginBottom: 10 }}>{msg}</div>}
            </div>

            {/* 저장 버튼 (고정) */}
            <div style={{ display: 'flex', gap: 8, paddingTop: 12, flexShrink: 0 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '0.5px solid #e8d5c5', background: 'none', color: '#b4785a', fontSize: 13, cursor: 'pointer' }}>취소</button>
              <button onClick={save} disabled={saving} style={{ flex: 1.5, padding: '11px 0', borderRadius: 10, border: 'none', background: '#b46e46', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? '저장 중…' : '저장'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
