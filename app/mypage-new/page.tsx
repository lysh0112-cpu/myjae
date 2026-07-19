'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useResultSaju } from '@/hooks/useResultSaju'
// 커플채팅 플로팅은 당분간 닫음 (되살리려면 이 줄과 아래 사용처 주석만 풀면 됨)
// import CoupleChatFab from '@/app/couple-chat/CoupleChatFab'
import AiTalkFab from '@/app/manseryeok/components/AiTalkFab'
import InviteNotifier from '@/app/couple-chat/InviteNotifier'
import {
  hourLabelOf, normalizeHourLabel, toStoredHour,
  TIME_BANDS, MONTHS, dayOptions, clampDay, isValidBirthDate,
  crossesMidnight, type TimeBand,
} from '@/lib/saju/birthInput'

// 시(時) 목록 — 공용 birthInput.ts 기준 (30분법 · 공백없음).
//   ★ '모름'은 두지 않는다. 시를 반드시 고르게 한다(대표님 확정 2026-07).
//     정확히 모르면 시간대 버튼으로 3개까지 좁혀서 고른다.
//   ※ 다만 예전에 '모름'으로 저장된 회원이 있을 수 있으므로,
//     불러올 때는 빈 값으로 두고 새로 고르게 한다(openEdit 참조).
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i),
  label: hourLabelOf(i),
}))

const STEM_ELEMENT: Record<string, string> = { 甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수' }
const BRANCH_ELEMENT: Record<string, string> = { 子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수' }
const EL_COLOR: Record<string, string> = { 목:'#4caf50',화:'#f44336',토:'#ff9800',금:'#9e9e9e',수:'#2196f3' }
const EL_BG: Record<string, string> = { 목:'#e8f5e9',화:'#ffebee',토:'#fff3e0',금:'#f5f5f5',수:'#e3f2fd' }
const EL_BD: Record<string, string> = { 목:'#a5d6a7',화:'#ef9a9a',토:'#ffe082',금:'#bdbdbd',수:'#90caf9' }
const EL_HAN: Record<string, string> = { 목:'木',화:'火',토:'土',금:'金',수:'水' }

type Profile = {
  nickname: string | null
  role: string | null
  email: string | null
  birth_year: number | null
  birth_month: number | null
  birth_day: number | null
  birth_hour: string | null
  cal_type: string | null
  gender: string | null
  leap_month: boolean | null
  saju_saved: boolean | null
}

type MyName = {
  id: string
  hangul_name: string | null
  hanja_name: string | null
  kind: string | null
  created_at: string | null
}

type Consultation = {
  id: string
  status: string | null
  paid_amount: number | null
  created_at: string | null
  booking_date: string | null
  booking_hour: number | null
  consultant_id: string | null
  consultant_name?: string
}

function toHourIdx(h: string | null): number | null {
  if (!h || h === '모름') return null
  const n = parseInt(h, 10)
  return isNaN(n) ? null : n
}

export default function MyPageNew() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [myNames, setMyNames] = useState<MyName[]>([])
  const [consults, setConsults] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [deletingNameId, setDeletingNameId] = useState<string | null>(null)
  const [namesExpanded, setNamesExpanded] = useState(false)


  const [editMode, setEditMode] = useState(false)
  const [eYear, setEYear] = useState('')
  const [eMonth, setEMonth] = useState('')
  const [eDay, setEDay] = useState('')
  const [eHour, setEHour] = useState('')     // '0'~'11' (인덱스 문자열)
  const [eBand, setEBand] = useState<TimeBand | null>(null)   // 시간대 보조 필터
  const [eCal, setECal] = useState<'양력' | '음력'>('양력')
  const [eGender, setEGender] = useState<'남' | '여'>('남')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [nickEdit, setNickEdit] = useState(false)
  const [eNick, setENick] = useState('')
  const [nickSaving, setNickSaving] = useState(false)
  const [nickMsg, setNickMsg] = useState('')

  const [cashOpen, setCashOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  const { saju } = useResultSaju(
    profile?.cal_type || '양력',
    profile?.birth_year || 0,
    profile?.birth_month || 0,
    profile?.birth_day || 0,
    '0',
    toHourIdx(profile?.birth_hour ?? null),
  )

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setEmail(data.user.email || '')
      setUserId(data.user.id)

      const { data: p } = await supabase.from('profiles')
        .select('nickname, role, email, birth_year, birth_month, birth_day, birth_hour, cal_type, gender, leap_month, saju_saved')
        .eq('id', data.user.id).single()
      if (p) setProfile({ ...(p as Profile), email: (p as Profile).email || data.user.email || null })
      setLoading(false)

      supabase.from('my_names')
        .select('id, hangul_name, hanja_name, kind, created_at')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false })
        .then(({ data: rows }) => { if (rows) setMyNames(rows as MyName[]) })

      const { data: cs } = await supabase.from('consultations')
        .select('id, status, paid_amount, created_at, booking_date, booking_hour, consultant_id')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false })
      if (cs && cs.length > 0) {
        const ids = Array.from(new Set(cs.map((c) => c.consultant_id).filter(Boolean)))
        let nameMap: Record<string, string> = {}
        if (ids.length > 0) {
          const { data: cons } = await supabase.from('consultants').select('id, name').in('id', ids as string[])
          if (cons) nameMap = Object.fromEntries(cons.map((c) => [c.id, c.name]))
        }
        setConsults(cs.map((c) => ({ ...c, consultant_name: c.consultant_id ? nameMap[c.consultant_id] : undefined })) as Consultation[])
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const roleLabel = (r: string | null) =>
    r === 'master' ? '매니저' : r === 'consultant' ? '상담사' : '일반회원'
  const roleColor = (r: string | null) =>
    r === 'master' ? { bg: '#f0eaff', fg: '#785aaa' }
      : r === 'consultant' ? { bg: '#e1f5ee', fg: '#1d9e75' }
        : { bg: '#f5ebe2', fg: '#b4785a' }

  const hourTextFull = (h: string | null) => {
    const idx = normalizeHourLabel(h)
    if (idx == null) return h === '모름' ? '모름' : '-'
    return hourLabelOf(idx)
  }

  const dateText = (s: string | null) => {
    if (!s) return ''
    try {
      const d = new Date(s)
      return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
    } catch { return '' }
  }

  const statusInfo = (s: string | null) => {
    if (s === 'paid' || s === 'done' || s === '완료') return { label: '완료', color: '#1d9e75' }
    if (s === 'booked') return { label: '예약 확정', color: '#3c82a0' }
    if (s === 'pending') return { label: '대기중', color: '#e09030' }
    if (s === 'in_progress' || s === 'ongoing' || s === '진행중') return { label: '진행 중', color: '#c8783c' }
    if (s === 'cancelled' || s === 'canceled') return { label: '취소됨', color: '#c0a898' }
    return { label: '진행 중', color: '#e09030' }
  }

  const dayPillar = saju && saju.length >= 2 ? saju[1] : null

  const sajuDetailUrl = () => {
    if (!profile?.birth_year) return '/home-new'
    const g = profile.gender === '여' ? '여' : '남'
    const cal = profile.cal_type || '양력'
    const hourIdx = toHourIdx(profile.birth_hour ?? null)
    const hourParam = hourIdx == null ? '' : `&hour=${hourIdx}`
    const leap = profile.leap_month ? '1' : '0'
    return `/manseryeok/result-new?gender=${g}&calType=${cal}&year=${profile.birth_year}&month=${profile.birth_month}&day=${profile.birth_day}&leapMonth=${leap}${hourParam}&mode=chart`
  }

  const cancelBooking = async (c: Consultation) => {
    if (c.status !== 'booked') return
    const when = c.booking_date
      ? `${dateText(c.booking_date)}${c.booking_hour != null ? ` ${c.booking_hour}시` : ''}` : ''
    if (!confirm(`이 예약을 취소할까요?\n${c.consultant_name || '상담사'}${when ? ' · ' + when : ''}\n\n취소하면 되돌릴 수 없습니다.`)) return
    setCancelingId(c.id)
    try {
      const { data: bks } = await supabase.from('bookings').select('id, slot_id').eq('consultation_id', c.id)
      const slotIds = (bks ?? []).map(b => b.slot_id).filter(Boolean)
      if (slotIds.length > 0) {
        await supabase.from('consultant_slots').update({ is_booked: false }).in('id', slotIds as string[])
      }
      await supabase.from('bookings').update({ status: 'cancelled' }).eq('consultation_id', c.id)
      const { error: cErr } = await supabase.from('consultations').update({ status: 'cancelled' }).eq('id', c.id)
      if (cErr) { alert('취소 실패: ' + cErr.message); setCancelingId(null); return }
      setConsults(prev => prev.filter(x => x.id !== c.id))
      alert('예약이 취소되었습니다.')
    } catch (e) {
      alert('취소 중 오류가 발생했어요. 다시 시도해 주세요.')
      console.error(e)
    } finally {
      setCancelingId(null)
    }
  }

  const deleteName = async (n: MyName) => {
    const label = n.hanja_name || n.hangul_name || '이 이름풀이'
    if (!confirm(`"${label}" 이름풀이를 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`)) return
    setDeletingNameId(n.id)
    try {
      const { error } = await supabase.from('my_names').delete().eq('id', n.id)
      if (error) { alert('삭제 실패: ' + error.message); return }
      setMyNames(prev => prev.filter(x => x.id !== n.id))
    } catch (e) {
      alert('삭제 중 오류가 발생했어요. 다시 시도해 주세요.')
      console.error(e)
    } finally {
      setDeletingNameId(null)
    }
  }

  const openEdit = () => {
    if (!profile) return
    setEYear(profile.birth_year ? String(profile.birth_year) : '')
    setEMonth(profile.birth_month ? String(profile.birth_month) : '')
    setEDay(profile.birth_day ? String(profile.birth_day) : '')
    // 저장값('0'~'11')을 그대로 쓴다. 예전 '모름' 값은 빈칸으로 두어 새로 고르게 한다.
    const hIdx = normalizeHourLabel(profile.birth_hour)
    setEHour(hIdx == null ? '' : String(hIdx))
    setEBand(null)
    setECal((profile.cal_type as '양력' | '음력') || '양력')
    setEGender((profile.gender as '남' | '여') || '남')
    setMsg('')
    setEditMode(true)
  }

  const onlyNum = (v: string, len: number) => v.replace(/[^0-9]/g, '').slice(0, len)

  const saveSaju = async () => {
    const y = parseInt(eYear, 10), m = parseInt(eMonth, 10), d = parseInt(eDay, 10)
    if (!y || eYear.length !== 4 || y < 1900 || y > 2200) { setMsg('연도를 4자리로 정확히 입력해주세요.'); return }
    if (!m || m < 1 || m > 12) { setMsg('월을 골라주세요.'); return }
    if (!d || d < 1) { setMsg('일을 골라주세요.'); return }
    if (!isValidBirthDate(eYear, eMonth, eDay, eCal)) { setMsg('생년월일이 올바르지 않아요. 다시 확인해주세요.'); return }
    if (!eHour) { setMsg('시(시주)를 선택해주세요. 정확히 모르시면 시간대 버튼으로 골라주세요.'); return }
    const hourValue = toStoredHour(normalizeHourLabel(eHour))
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      birth_year: y, birth_month: m, birth_day: d,
      birth_hour: hourValue, cal_type: eCal, gender: eGender, saju_saved: true,
    }).eq('id', userId)
    setSaving(false)
    if (error) { setMsg('저장 실패: ' + error.message); return }
    setProfile(prev => prev ? { ...prev, birth_year: y, birth_month: m, birth_day: d, birth_hour: hourValue, cal_type: eCal, gender: eGender, saju_saved: true } : prev)
    setEditMode(false)
  }

  const openNickEdit = () => { setENick(profile?.nickname || ''); setNickMsg(''); setNickEdit(true) }

  const saveNick = async () => {
    const name = eNick.trim()
    if (!name) { setNickMsg('닉네임을 입력해주세요.'); return }
    if (name.length > 20) { setNickMsg('닉네임은 20자 이내로 입력해주세요.'); return }
    setNickSaving(true)
    const { error } = await supabase.from('profiles').update({ nickname: name }).eq('id', userId)
    setNickSaving(false)
    if (error) { setNickMsg('저장 실패: ' + error.message); return }
    setProfile(prev => prev ? { ...prev, nickname: name } : prev)
    setNickEdit(false)
  }

  const logout = async () => {
    if (!confirm('로그아웃 할까요?')) return
    await supabase.auth.signOut()
    try { sessionStorage.clear(); localStorage.clear() } catch {}
    window.location.href = '/'
  }

  const withdraw = async () => {
    if (!confirm('정말 회원 탈퇴를 진행할까요?\n탈퇴하면 내 정보와 사주가 삭제되며 되돌릴 수 없습니다.')) return
    await supabase.from('profiles').update({
      nickname: null, birth_year: null, birth_month: null, birth_day: null,
      birth_hour: null, cal_type: null, gender: null, saju_saved: false,
    }).eq('id', userId)
    alert('탈퇴 요청이 접수되었습니다. 이용해주셔서 감사합니다.')
    await supabase.auth.signOut()
    try { sessionStorage.clear(); localStorage.clear() } catch {}
    window.location.href = '/'
  }


  const displayName = profile?.nickname || '회원'
  const initial = (profile?.nickname || email || '?').charAt(0)
  const rc = roleColor(profile?.role || null)
  const isStaff = profile?.role === 'consultant' || profile?.role === 'master'
  const isMaster = profile?.role === 'master'

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#FDF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b4785a', fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif" }}>불러오는 중…</div>
  }

  const card: React.CSSProperties = { background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 14, padding: 14, marginBottom: 12 }
  const numInput: React.CSSProperties = { flex: 1, minWidth: 0, padding: '10px 6px', borderRadius: 8, textAlign: 'center', border: '0.5px solid #e8d5c5', background: '#fff', color: '#3a2e28', fontSize: 14, outline: 'none' }
  // 드롭다운 (좁은 칸에서 글자가 화살표에 가려지지 않게 직접 그림)
  const selInput: React.CSSProperties = {
    ...numInput, appearance: 'none', cursor: 'pointer', textAlign: 'left',
    paddingLeft: 8, paddingRight: 20,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23c5a590' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center',
  }

  // 연/월/달력을 바꾸면 이미 고른 '일'이 범위를 벗어날 수 있다 (3/31 → 2월)
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
  const seg = (on: boolean): React.CSSProperties => ({ flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: on ? '#b46e46' : 'transparent', color: on ? '#fff' : '#b4785a' })

  return (
    <div style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 430, margin: '0 auto', fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif", color: '#3a2e28' }}>

      <style>{`
        @keyframes mcCupSway { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
        @keyframes mcSteamA { 0% { opacity:0; transform:translateY(0) scaleX(1);} 15%{opacity:0.6;} 50%{opacity:0.4; transform:translateY(-9px) scaleX(1.3);} 100%{opacity:0; transform:translateY(-18px) scaleX(0.8);} }
        @keyframes mcSteamB { 0% { opacity:0; transform:translateY(0) scaleX(1);} 20%{opacity:0.5;} 55%{opacity:0.3; transform:translateY(-10px) scaleX(1.4);} 100%{opacity:0; transform:translateY(-20px) scaleX(0.7);} }
        .mc-cup { animation: mcCupSway 3.5s ease-in-out infinite; transform-origin: bottom center; }
        .mc-steam-a { animation: mcSteamA 2.8s ease-out infinite; }
        .mc-steam-b { animation: mcSteamB 2.8s ease-out infinite 0.9s; }
        .mc-steam-c { animation: mcSteamA 2.8s ease-out infinite 1.6s; }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#FFFBF7', borderBottom: '0.5px solid #f0e0d5', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="30" height="34" viewBox="0 0 46 50" style={{ overflow: 'visible' }}>
            <g>
              <path className="mc-steam-a" d="M16 14 q-3 -5 0 -10 q3 -5 0 -10" stroke="#c8a890" strokeWidth="2" fill="none" strokeLinecap="round" transform="translate(0,2)" />
              <path className="mc-steam-b" d="M23 13 q-3 -5 0 -10 q3 -5 0 -10" stroke="#c8a890" strokeWidth="2" fill="none" strokeLinecap="round" transform="translate(0,2)" />
              <path className="mc-steam-c" d="M30 14 q-3 -5 0 -10 q3 -5 0 -10" stroke="#c8a890" strokeWidth="2" fill="none" strokeLinecap="round" transform="translate(0,2)" />
            </g>
            <g className="mc-cup">
              <path d="M8 20 L38 20 L36 40 Q35 45 30 45 L16 45 Q11 45 10 40 Z" fill="#b46e46" />
              <path d="M8 20 L38 20 L37.5 24 L8.5 24 Z" fill="#c8783c" />
              <path d="M38 24 Q45 24 45 30 Q45 36 38 36 L37 32 Q41 32 41 30 Q41 28 37.5 28 Z" fill="#b46e46" />
              <ellipse cx="23" cy="21" rx="14" ry="2.5" fill="#96502e" />
            </g>
          </svg>
          <span style={{ fontSize: 18, fontWeight: 900, fontStyle: 'italic' }}>
            <span style={{ color: '#96502e' }}>Myung</span><span style={{ color: '#b46e46' }}>Cafe</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 18, color: '#b49080' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => router.push('/home-new')} role="button" aria-label="홈으로">☰</span>
        </div>
      </div>

      <main style={{ padding: 16, paddingBottom: 100 }}>

        <div style={{ background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 11, borderBottom: (nickEdit || editMode) ? '0.5px solid #f5e5da' : 'none' }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#fae6d5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: '#c8783c', flexShrink: 0 }}>{initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#3a2e28' }}>{displayName}님</span>
                <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: rc.bg, color: rc.fg, fontWeight: 500, flexShrink: 0 }}>{roleLabel(profile?.role || null)}</span>
              </div>
              <div style={{ fontSize: 10.5, color: '#9a8574', marginTop: 2 }}>
                {profile?.saju_saved && profile?.birth_year
                  ? `${profile.cal_type || '양력'} ${profile.birth_year}.${profile.birth_month}.${profile.birth_day} · ${hourTextFull(profile.birth_hour).split('(')[0]} · ${profile.gender === '여' ? '여성' : '남성'}`
                  : '사주 미등록'}
              </div>
            </div>
            {profile?.saju_saved && dayPillar && dayPillar.stem !== '?' && (
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                <GanjiBox char={dayPillar.stem} el={STEM_ELEMENT[dayPillar.stem]} />
                <GanjiBox char={dayPillar.branch} el={BRANCH_ELEMENT[dayPillar.branch]} />
              </div>
            )}
          </div>

          {nickEdit && (
            <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #f5e5da' }}>
              <div style={{ fontSize: 11, color: '#b4785a', marginBottom: 4 }}>닉네임</div>
              <input value={eNick} onChange={e => setENick(e.target.value)} placeholder="닉네임을 입력하세요" maxLength={20}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e8d5c5', background: '#fff', color: '#3a2e28', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
              {nickMsg && <div style={{ color: '#c05a5a', fontSize: 12, marginBottom: 8 }}>{nickMsg}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setNickEdit(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '0.5px solid #e8d5c5', background: 'none', color: '#b4785a', fontSize: 13, cursor: 'pointer' }}>취소</button>
                <button onClick={saveNick} disabled={nickSaving} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#b46e46', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: nickSaving ? 0.6 : 1 }}>{nickSaving ? '저장 중…' : '저장'}</button>
              </div>
            </div>
          )}

          <div style={{ padding: (nickEdit || editMode) ? 14 : '10px 14px' }}>
            {!editMode && !nickEdit && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { if (!profile?.birth_year) { openEdit() } else { router.push(sajuDetailUrl()) } }} style={{ flex: 1, fontSize: 11, color: '#96502e', background: '#faede0', border: '0.5px solid #ecd8c6', borderRadius: 8, padding: '8px 0', cursor: 'pointer', fontWeight: 600 }}>내 사주 자세히 보기 →</button>
                <button onClick={openNickEdit} style={{ fontSize: 11, color: '#b4785a', border: '0.5px solid #e8d5c5', borderRadius: 8, padding: '8px 12px', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>닉네임</button>
                <button onClick={openEdit} style={{ fontSize: 11, color: '#b4785a', border: '0.5px solid #e8d5c5', borderRadius: 8, padding: '8px 12px', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>수정</button>
              </div>
            )}

            {editMode && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#96502e', marginBottom: 8 }}>✦ 내 사주 수정</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#b4785a', marginBottom: 4 }}>성별</div>
                    <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '0.5px solid #e8d5c5' }}>
                      <button onClick={() => setEGender('남')} style={seg(eGender === '남')}>남</button>
                      <button onClick={() => setEGender('여')} style={seg(eGender === '여')}>여</button>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#b4785a', marginBottom: 4 }}>달력</div>
                    <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '0.5px solid #e8d5c5' }}>
                      <button onClick={() => applyECal('양력')} style={seg(eCal === '양력')}>양력</button>
                      <button onClick={() => applyECal('음력')} style={seg(eCal === '음력')}>음력</button>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#b4785a', marginBottom: 4 }}>생년월일</div>
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
                <div style={{ fontSize: 11, color: '#b4785a', marginBottom: 4 }}>태어난 시 (시주)</div>
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
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setEditMode(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '0.5px solid #e8d5c5', background: 'none', color: '#b4785a', fontSize: 13, cursor: 'pointer' }}>취소</button>
                  <button onClick={saveSaju} disabled={saving} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#b46e46', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? '저장 중…' : '저장'}</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>내 상담 내역</div>
          {consults.filter(c => c.status !== 'cancelled' && c.status !== 'canceled').length === 0 ? (
            <div style={{ fontSize: 13, color: '#b4785a', textAlign: 'center', padding: '12px 0' }}>아직 신청한 상담이 없습니다.</div>
          ) : (
            <div>
              {consults.filter(c => c.status !== 'cancelled' && c.status !== 'canceled').map((c, i, arr) => {
                const st = statusInfo(c.status)
                const isBooked = c.status === 'booked'
                return (
                  <div key={c.id} style={{ padding: '10px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #f5e5da' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 14 }}>{c.consultant_name || '상담사'}</div>
                        <div style={{ fontSize: 10, color: '#c0a898' }}>
                          {dateText(c.booking_date || c.created_at)}{c.booking_hour != null ? ` ${c.booking_hour}시` : ''}{c.paid_amount ? ` · ${c.paid_amount.toLocaleString()}원` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: st.color }}>{st.label}</span>
                    </div>
                    <button onClick={() => router.push(`/manseryeok/consulting?consultationId=${c.id}`)}
                      style={{ marginTop: 8, width: '100%', padding: '9px 0', borderRadius: 9, background: '#b46e46', border: 'none', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>💬 채팅방 입장</button>
                    {isBooked && (
                      <button onClick={() => cancelBooking(c)} disabled={cancelingId === c.id}
                        style={{ marginTop: 6, width: '100%', padding: '9px 0', borderRadius: 9, background: 'none', border: '0.5px solid #f0d0d0', color: '#c05a5a', fontSize: 12, fontWeight: 500, cursor: 'pointer', opacity: cancelingId === c.id ? 0.5 : 1 }}>{cancelingId === c.id ? '취소 처리 중…' : '예약 취소'}</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <button onClick={() => setCashOpen(v => !v)}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: 13, color: '#5a4a3e' }}>{cashOpen ? '▾' : '▸'} 캐시 · 포인트 · 이용권</span>
            <span style={{ fontSize: 12, color: '#b4785a' }}>0원 · 0P · 0회</span>
          </button>
          {cashOpen && (
            <div style={{ padding: '0 14px 14px' }}>
              <button style={{ width: '100%', height: 44, background: '#b46e46', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>☕ 캐시 충전하기</button>
              <div style={{ fontSize: 10, color: '#c0a898', marginTop: 8, textAlign: 'center' }}>명카페 충전 메뉴는 준비 중이에요</div>
            </div>
          )}
        </div>

        <div style={{ background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <button onClick={() => setPayOpen(v => !v)}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: 13, color: '#5a4a3e' }}>{payOpen ? '▾' : '▸'} 결제 내역 · 쿠폰 등록</span>
            <span style={{ fontSize: 16, color: '#d0b8a5' }}>{payOpen ? '' : '›'}</span>
          </button>
          {payOpen && (
            <div style={{ padding: '0 14px 14px' }}>
              <div style={{ padding: '10px 12px', background: '#faede0', borderRadius: 8, fontSize: 12, color: '#8a7868', textAlign: 'center', marginBottom: 8 }}>결제 내역이 여기에 표시됩니다</div>
              <button style={{ width: '100%', padding: '10px 0', background: 'none', border: '0.5px solid #e8d5c5', borderRadius: 10, color: '#b4785a', fontSize: 13, cursor: 'pointer' }}>🎁 쿠폰 등록하기</button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 12 }}>
          <div onClick={() => { setEditMode(true); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 12px', background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, cursor: 'pointer' }}>
            <span style={{ fontSize: 13, color: '#5a4a3e' }}>⚙️ 계정 설정</span>
          </div>
          <div onClick={() => router.push('/manseryeok/reviews/write')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 12px', background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, cursor: 'pointer' }}>
            <span style={{ fontSize: 13, color: '#5a4a3e' }}>❓ 문의하기</span>
          </div>
        </div>

        {isStaff && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={async () => {
              const { data: c } = await supabase.from('consultants').select('id').eq('email', email).single()
              router.push(c ? `/manseryeok/consultant?consultantId=${c.id}` : '/manseryeok/consultant')
            }} style={{ flex: 1, textAlign: 'center', background: '#FFFBF7', border: '0.5px solid #f5d5b8', borderRadius: 12, padding: '13px 8px', fontSize: 12.5, color: '#96502e', cursor: 'pointer' }}>🩺 상담 관리</button>
            {isMaster ? (
              <button onClick={() => router.push('/admin')} style={{ flex: 1, textAlign: 'center', background: '#FFFBF7', border: '0.5px solid #f5d5b8', borderRadius: 12, padding: '13px 8px', fontSize: 12.5, color: '#96502e', cursor: 'pointer' }}>🔐 관리자</button>
            ) : (
              <div style={{ flex: 1 }} />
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button onClick={logout} style={{ flex: 1, textAlign: 'center', background: '#f5ebe2', border: '0.5px solid #e8d5c5', borderRadius: 12, padding: 12, fontSize: 13, color: '#8a7868', cursor: 'pointer' }}>로그아웃</button>
          <button onClick={withdraw} style={{ flex: 1, textAlign: 'center', background: '#FFFBF7', border: '0.5px solid #f0d0d0', borderRadius: 12, padding: 12, fontSize: 13, color: '#c05a5a', cursor: 'pointer' }}>회원 탈퇴</button>
        </div>

        <div style={{ textAlign: 'center', fontSize: 10, color: '#c0a898', padding: '8px 0' }}>
          회사소개 &nbsp;|&nbsp; 이용약관 &nbsp;|&nbsp; 개인정보처리방침
        </div>

      </main>

      {/* 하단 고정 네비게이션 (홈과 동일한 피치톤) */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        display: 'flex', background: '#FFFBF7',
        borderTop: '0.5px solid #f0e0d5', zIndex: 20,
      }}>
        {[
          { icon: '🏠', label: '홈', href: '/home-new', active: false },
          { icon: '⊞', label: '서비스', href: '', wip: true, active: false },
          { icon: '💬', label: '상담', href: '/manseryeok/reviews', active: false },
          { icon: '📚', label: '보관함', href: '/archive', active: false },
        ].map((n) => (
          <button key={n.label} onClick={() => { if (n.wip) { alert('작업 중이에요. 곧 만나요!') } else { router.push(n.href) } }}
            style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 18 }}>{n.icon}</span>
            <span style={{ fontSize: 10, color: n.active ? '#c8783c' : '#b09079', fontWeight: n.active ? 600 : 400 }}>{n.label}</span>
            {/* 현재 위치 표시 — 아이콘을 흐리게 하는 대신 밑줄로 */}
            <span style={{ height: 2, width: 22, borderRadius: 2, background: n.active ? '#c8783c' : 'transparent' }} />
          </button>
        ))}
      </div>

      {/* <CoupleChatFab /> */}
      <AiTalkFab />
      <InviteNotifier />
    </div>
  )
}


function GanjiBox({ char, el }: { char: string; el: string }) {
  const color = el ? EL_COLOR[el] : '#888'
  const bg = el ? EL_BG[el] : '#f5f5f5'
  const bd = el ? EL_BD[el] : '#ddd'
  return (
    <div style={{ width: 38, height: 46, borderRadius: 7, background: bg, border: `1px solid ${bd}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <span style={{ fontSize: 19, fontWeight: 500, color, lineHeight: 1 }}>{char}</span>
      {el && <span style={{ fontSize: 8, color, marginTop: 1 }}>{EL_HAN[el]}</span>}
    </div>
  )
}
