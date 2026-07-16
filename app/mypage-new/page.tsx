'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useResultSaju } from '@/hooks/useResultSaju'
import EmotionPicker from './EmotionPicker'
import ArchiveList from './ArchiveList'

const HOUR_LABELS: Record<string, string> = {
  '0': '子시(23:30~01:30)', '1': '丑시(01:30~03:30)', '2': '寅시(03:30~05:30)', '3': '卯시(05:30~07:30)',
  '4': '辰시(07:30~09:30)', '5': '巳시(09:30~11:30)', '6': '午시(11:30~13:30)', '7': '未시(13:30~15:30)',
  '8': '申시(15:30~17:30)', '9': '酉시(17:30~19:30)', '10': '戌시(19:30~21:30)', '11': '亥시(21:30~23:30)',
}
const HOURS = [
  '모름', '子시(23:30~01:30)', '丑시(01:30~03:30)', '寅시(03:30~05:30)', '卯시(05:30~07:30)',
  '辰시(07:30~09:30)', '巳시(09:30~11:30)', '午시(11:30~13:30)', '未시(13:30~15:30)',
  '申시(15:30~17:30)', '酉시(17:30~19:30)', '戌시(19:30~21:30)', '亥시(21:30~23:30)',
]
const HOUR_INDEX: Record<string, number> = {
  '子시(23:30~01:30)': 0, '丑시(01:30~03:30)': 1, '寅시(03:30~05:30)': 2, '卯시(05:30~07:30)': 3,
  '辰시(07:30~09:30)': 4, '巳시(09:30~11:30)': 5, '午시(11:30~13:30)': 6, '未시(13:30~15:30)': 7,
  '申시(15:30~17:30)': 8, '酉시(17:30~19:30)': 9, '戌시(19:30~21:30)': 10, '亥시(21:30~23:30)': 11,
}

const STEM_ELEMENT: Record<string, string> = { 甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수' }
const BRANCH_ELEMENT: Record<string, string> = { 子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수' }
const EL_COLOR: Record<string, string> = { 목:'#4caf50',화:'#f44336',토:'#ff9800',금:'#9e9e9e',수:'#2196f3' }
const EL_BG: Record<string, string> = { 목:'#e8f5e9',화:'#ffebee',토:'#fff3e0',금:'#f5f5f5',수:'#e3f2fd' }
const EL_BD: Record<string, string> = { 목:'#a5d6a7',화:'#ef9a9a',토:'#ffe082',금:'#bdbdbd',수:'#90caf9' }
const EL_HAN: Record<string, string> = { 목:'木',화:'火',토:'土',금:'金',수:'水' }

function luckyColorChip(name: string | null): string {
  if (!name) return '#ddd'
  const n = name.replace(/\s/g, '')
  if (/(아이보리|미색|크림|상아)/.test(n)) return '#f5f0e0'
  if (/(흰|화이트|백)/.test(n)) return '#ffffff'
  if (/(검|블랙|흑)/.test(n)) return '#333333'
  if (/(빨|적|레드|다홍|주홍)/.test(n)) return '#e24b4a'
  if (/(주황|오렌지)/.test(n)) return '#ff9800'
  if (/(노랑|노란|옐로|황금|골드|금색)/.test(n)) return '#f5c518'
  if (/(초록|녹색|그린|연두)/.test(n)) return '#4caf50'
  if (/(파랑|파란|블루|남색|하늘|스카이)/.test(n)) return '#2196f3'
  if (/(보라|퍼플|자주|바이올렛)/.test(n)) return '#9c5fc4'
  if (/(분홍|핑크)/.test(n)) return '#ec87b1'
  if (/(갈색|브라운|밤색)/.test(n)) return '#8d6e63'
  if (/(회색|그레이|은색|실버)/.test(n)) return '#9e9e9e'
  return '#e0c890'
}

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

type Fortune = {
  fortune_date: string
  iljin_gan: string | null
  iljin_ji: string | null
  score: number | null
  summary: string | null
  love: string | null
  money: string | null
  health: string | null
  lucky_color: string | null
  lucky_dir: string | null
  today_insight: string | null
}

function toHourIdx(h: string | null): number | null {
  if (!h || h === '모름') return null
  const n = parseInt(h, 10)
  return isNaN(n) ? null : n
}

function todayKST(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(kst.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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

  const [fortune, setFortune] = useState<Fortune | null>(null)
  const [fortuneLoading, setFortuneLoading] = useState(false)
  const [fortuneChecked, setFortuneChecked] = useState(false)

  const [editMode, setEditMode] = useState(false)
  const [eYear, setEYear] = useState('')
  const [eMonth, setEMonth] = useState('')
  const [eDay, setEDay] = useState('')
  const [eHour, setEHour] = useState('')
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

  const { saju, dayStem, iljji, converting } = useResultSaju(
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

      const { data: fRow } = await supabase.from('daily_fortune')
        .select('fortune_date, iljin_gan, iljin_ji, score, summary, love, money, health, lucky_color, lucky_dir, today_insight')
        .eq('user_id', data.user.id)
        .eq('fortune_date', todayKST())
        .maybeSingle()
      if (fRow) setFortune(fRow as Fortune)
      setFortuneChecked(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!fortuneChecked) return
    if (fortune) return
    if (fortuneLoading) return
    if (converting) return
    if (!userId) return
    if (!profile?.saju_saved || !dayStem || !iljji) return

    let cancelled = false
    ;(async () => {
      setFortuneLoading(true)
      try {
        const res = await fetch('/api/daily-fortune', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ saju, dayStem, iljji, nickname: profile?.nickname || undefined }),
        })
        const data = await res.json()
        if (data.error) { console.error('운세 생성 오류:', data.error); return }
        if (cancelled) return

        const row: Fortune = {
          fortune_date: data.fortune_date,
          iljin_gan: data.iljin_gan, iljin_ji: data.iljin_ji,
          score: data.score, summary: data.summary,
          love: data.love, money: data.money, health: data.health,
          lucky_color: data.lucky_color, lucky_dir: data.lucky_dir,
          today_insight: data.today_insight,
        }
        setFortune(row)
        await supabase.from('daily_fortune').upsert({ user_id: userId, ...row }, { onConflict: 'user_id,fortune_date' })
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setFortuneLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fortuneChecked, converting, dayStem, iljji, userId, profile?.saju_saved])

  const roleLabel = (r: string | null) =>
    r === 'master' ? '매니저' : r === 'consultant' ? '상담사' : '일반회원'
  const roleColor = (r: string | null) =>
    r === 'master' ? { bg: '#f0eaff', fg: '#785aaa' }
      : r === 'consultant' ? { bg: '#e1f5ee', fg: '#1d9e75' }
        : { bg: '#f5ebe2', fg: '#b4785a' }

  const hourTextFull = (h: string | null) => {
    if (!h) return '-'
    if (h === '모름') return '모름'
    return HOUR_LABELS[h] || h
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
    if (s === 'cancelled' || s === 'canceled') return { label: '취소됨', color: '#c0a898' }
    return { label: s || '진행중', color: '#e09030' }
  }

  const dayPillar = saju && saju.length >= 2 ? saju[1] : null

  const sajuDetailUrl = () => {
    if (!profile?.birth_year) return '/manseryeok'
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
    setEHour(profile.birth_hour ? (profile.birth_hour === '모름' ? '모름' : (HOUR_LABELS[profile.birth_hour] || '')) : '')
    setECal((profile.cal_type as '양력' | '음력') || '양력')
    setEGender((profile.gender as '남' | '여') || '남')
    setMsg('')
    setEditMode(true)
  }

  const onlyNum = (v: string, len: number) => v.replace(/[^0-9]/g, '').slice(0, len)

  const saveSaju = async () => {
    const y = parseInt(eYear, 10), m = parseInt(eMonth, 10), d = parseInt(eDay, 10)
    if (!y || eYear.length !== 4 || y < 1900 || y > 2200) { setMsg('연도를 4자리로 정확히 입력해주세요.'); return }
    if (!m || m < 1 || m > 12) { setMsg('월을 1~12로 입력해주세요.'); return }
    if (!d || d < 1 || d > 31) { setMsg('일을 1~31로 입력해주세요.'); return }
    if (!eHour) { setMsg('시(시주)를 선택해주세요.'); return }
    const hourValue = eHour === '모름' ? '모름' : String(HOUR_INDEX[eHour])
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      birth_year: y, birth_month: m, birth_day: d,
      birth_hour: hourValue, cal_type: eCal, gender: eGender, saju_saved: true,
    }).eq('id', userId)
    setSaving(false)
    if (error) { setMsg('저장 실패: ' + error.message); return }
    setProfile(prev => prev ? { ...prev, birth_year: y, birth_month: m, birth_day: d, birth_hour: hourValue, cal_type: eCal, gender: eGender, saju_saved: true } : prev)
    setEditMode(false)
    setFortune(null)
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

  const stars = (n: number | null) => {
    const s = Math.max(0, Math.min(5, n || 0))
    return '★★★★★'.slice(0, s) + '☆☆☆☆☆'.slice(0, 5 - s)
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
          <span style={{ cursor: 'pointer' }} onClick={() => router.push('/home-new')}>🔔</span>
          <span style={{ cursor: 'pointer' }} onClick={() => router.push('/home-new')}>☰</span>
        </div>
      </div>

      <main style={{ padding: 16, paddingBottom: 100 }}>

        <div style={{ background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, borderBottom: '0.5px solid #f5e5da' }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#fae6d5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#c8783c', flexShrink: 0 }}>{initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{displayName}님</div>
              <div style={{ fontSize: 11, color: '#c8783c' }}>오늘도 좋은 기운 가득하세요 ✦</div>
            </div>
            <span style={{ fontSize: 10, padding: '4px 11px', borderRadius: 12, background: rc.bg, color: rc.fg, fontWeight: 500, flexShrink: 0 }}>{roleLabel(profile?.role || null)}</span>
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

          <div style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#96502e', whiteSpace: 'nowrap' }}>✦ 내 사주</span>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {!nickEdit && <button onClick={openNickEdit} style={{ fontSize: 11, color: '#b4785a', border: '0.5px solid #e8d5c5', borderRadius: 8, padding: '3px 11px', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>닉네임</button>}
                {!editMode && <button onClick={openEdit} style={{ fontSize: 11, color: '#b4785a', border: '0.5px solid #e8d5c5', borderRadius: 8, padding: '3px 11px', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>수정</button>}
              </div>
            </div>

            {!editMode ? (
              profile?.saju_saved && profile?.birth_year ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {dayPillar && dayPillar.stem !== '?' && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <GanjiBox char={dayPillar.stem} el={STEM_ELEMENT[dayPillar.stem]} />
                      <GanjiBox char={dayPillar.branch} el={BRANCH_ELEMENT[dayPillar.branch]} />
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#7a6858', lineHeight: 1.7 }}>
                    {profile.cal_type || '양력'} {profile.birth_year}. {profile.birth_month}. {profile.birth_day}<br />
                    {hourTextFull(profile.birth_hour)} · {profile.gender === '여' ? '여성' : '남성'}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#b4785a' }}>아직 등록된 사주가 없습니다. "수정"을 눌러 등록하세요.</div>
              )
            ) : (
              <div>
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
                      <button onClick={() => setECal('양력')} style={seg(eCal === '양력')}>양력</button>
                      <button onClick={() => setECal('음력')} style={seg(eCal === '음력')}>음력</button>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#b4785a', marginBottom: 4 }}>생년월일</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                  <input value={eYear} onChange={e => setEYear(onlyNum(e.target.value, 4))} inputMode="numeric" placeholder="1990" style={{ ...numInput, flex: 1.5 }} />
                  <span style={{ fontSize: 12, color: '#b4785a' }}>년</span>
                  <input value={eMonth} onChange={e => setEMonth(onlyNum(e.target.value, 2))} inputMode="numeric" placeholder="5" style={numInput} />
                  <span style={{ fontSize: 12, color: '#b4785a' }}>월</span>
                  <input value={eDay} onChange={e => setEDay(onlyNum(e.target.value, 2))} inputMode="numeric" placeholder="12" style={numInput} />
                  <span style={{ fontSize: 12, color: '#b4785a' }}>일</span>
                </div>
                <div style={{ fontSize: 11, color: '#b4785a', marginBottom: 4 }}>태어난 시 (시주)</div>
                <select value={eHour} onChange={e => setEHour(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e8d5c5', background: '#fff', color: eHour ? '#3a2e28' : '#b4785a', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}>
                  <option value="">시간 선택</option>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                {msg && <div style={{ color: '#c05a5a', fontSize: 12, marginBottom: 10 }}>{msg}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setEditMode(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '0.5px solid #e8d5c5', background: 'none', color: '#b4785a', fontSize: 13, cursor: 'pointer' }}>취소</button>
                  <button onClick={saveSaju} disabled={saving} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#b46e46', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? '저장 중…' : '저장'}</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <button onClick={() => router.push(sajuDetailUrl())}
          style={{ width: '100%', background: '#b46e46', border: 'none', borderRadius: 10, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>내 사주 자세히 보기 →</span>
        </button>

        <EmotionPicker />

        <div style={{ background: '#FFFBF7', border: '0.5px solid #f5d5b8', borderRadius: 14, padding: 15, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#96502e' }}>✦ 오늘의 운세</span>
            {fortune?.iljin_gan && (
              <span style={{ fontSize: 10, color: '#b4785a', background: '#faede0', padding: '3px 9px', borderRadius: 10 }}>
                {todayKST().slice(5).replace('-', '.')} · {fortune.iljin_gan}{fortune.iljin_ji}일
              </span>
            )}
          </div>

          {!profile?.saju_saved ? (
            <div style={{ fontSize: 13, color: '#b4785a', textAlign: 'center', padding: '10px 0', lineHeight: 1.7 }}>
              사주를 등록하면 매일 나만의 운세를 볼 수 있어요.<br />
              <button onClick={openEdit} style={{ marginTop: 8, fontSize: 12, color: '#c8783c', background: 'none', border: '0.5px solid #f0d0a0', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>사주 등록하러 가기</button>
            </div>
          ) : (fortuneLoading || (!fortune && !fortuneChecked) || converting) ? (
            <div style={{ fontSize: 13, color: '#c0a898', textAlign: 'center', padding: '16px 0' }}>오늘의 운세를 준비하는 중…</div>
          ) : fortune ? (
            <div>
              <div style={{ color: '#e09030', letterSpacing: 2, fontSize: 15, marginBottom: 10 }}>{stars(fortune.score)}</div>
              <p style={{ fontSize: 12.5, color: '#6a5848', lineHeight: 1.75, margin: '0 0 12px' }}>{fortune.summary}</p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, background: '#faede0', borderRadius: 8, padding: '9px 7px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#b4785a', marginBottom: 4 }}>행운의 색</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <span style={{ width: 13, height: 13, borderRadius: '50%', background: luckyColorChip(fortune.lucky_color), border: '1px solid #ddd', display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#96502e' }}>{fortune.lucky_color || '-'}</span>
                  </div>
                </div>
                <div style={{ flex: 1, background: '#faede0', borderRadius: 8, padding: '9px 7px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#b4785a', marginBottom: 4 }}>행운의 방향</div>
                  <div style={{ fontSize: 12, color: '#96502e' }}>{fortune.lucky_dir || '-'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, marginBottom: fortune.today_insight ? 12 : 0 }}>
                <div style={{ flex: 1, background: '#fdf4ec', borderRadius: 8, padding: 8 }}>
                  <div style={{ fontSize: 9, color: '#c8967a', marginBottom: 3 }}>❤️ 애정</div>
                  <div style={{ fontSize: 10.5, color: '#8a7868', lineHeight: 1.5 }}>{fortune.love || '-'}</div>
                </div>
                <div style={{ flex: 1, background: '#fdf4ec', borderRadius: 8, padding: 8 }}>
                  <div style={{ fontSize: 9, color: '#c8967a', marginBottom: 3 }}>💰 재물</div>
                  <div style={{ fontSize: 10.5, color: '#8a7868', lineHeight: 1.5 }}>{fortune.money || '-'}</div>
                </div>
                <div style={{ flex: 1, background: '#fdf4ec', borderRadius: 8, padding: 8 }}>
                  <div style={{ fontSize: 9, color: '#c8967a', marginBottom: 3 }}>🌿 건강</div>
                  <div style={{ fontSize: 10.5, color: '#8a7868', lineHeight: 1.5 }}>{fortune.health || '-'}</div>
                </div>
              </div>

              {fortune.today_insight && (
                <div style={{ paddingTop: 12, borderTop: '0.5px solid #f0e0d5' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#c8783c', marginBottom: 6 }}>🔥 오늘의 명리 한 조각</div>
                  <p style={{ fontSize: 11.5, color: '#7a6858', lineHeight: 1.7, margin: 0 }}>{fortune.today_insight}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#c0a898', textAlign: 'center', padding: '12px 0' }}>운세를 불러오지 못했어요. 잠시 후 다시 들어와 주세요.</div>
          )}
        </div>

        <ArchiveList />

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

        <div style={{ background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <div onClick={() => router.push('/mypage-new/edit')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottom: '0.5px solid #f5e5da', cursor: 'pointer' }}>
            <span style={{ fontSize: 13, color: '#5a4a3e' }}>⚙️ 계정 설정</span><span style={{ fontSize: 16, color: '#d0b8a5' }}>›</span>
          </div>
          <div onClick={() => router.push('/manseryeok/reviews/write')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottom: '0.5px solid #f5e5da', cursor: 'pointer' }}>
            <span style={{ fontSize: 13, color: '#5a4a3e' }}>❓ 문의하기</span><span style={{ fontSize: 16, color: '#d0b8a5' }}>›</span>
          </div>
          <div onClick={() => router.push('/manseryeok/expert')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, cursor: 'pointer' }}>
            <span style={{ fontSize: 13, color: '#5a4a3e' }}>🔎 전문가용 만세력 계산기</span><span style={{ fontSize: 16, color: '#d0b8a5' }}>›</span>
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
          { icon: '⊞', label: '서비스', href: '/manseryeok', active: false },
          { icon: '💬', label: '상담', href: '/manseryeok/consultant-select', active: false },
          { icon: '♡', label: '찜', href: '/home-new', active: false },
        ].map((n) => (
          <button key={n.label} onClick={() => router.push(n.href)}
            style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 18, opacity: n.active ? 1 : 0.4 }}>{n.icon}</span>
            <span style={{ fontSize: 10, color: n.active ? '#c8783c' : '#c5a590', fontWeight: n.active ? 600 : 400 }}>{n.label}</span>
          </button>
        ))}
      </div>
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
