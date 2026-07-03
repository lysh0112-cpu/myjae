'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useResultSaju } from '@/hooks/useResultSaju'

const HOUR_LABELS: Record<string, string> = {
  '0': '子시(23~01)', '1': '丑시(01~03)', '2': '寅시(03~05)', '3': '卯시(05~07)',
  '4': '辰시(07~09)', '5': '巳시(09~11)', '6': '午시(11~13)', '7': '未시(13~15)',
  '8': '申시(15~17)', '9': '酉시(17~19)', '10': '戌시(19~21)', '11': '亥시(21~23)',
}
const HOURS = [
  '모름', '子시(23~01)', '丑시(01~03)', '寅시(03~05)', '卯시(05~07)',
  '辰시(07~09)', '巳시(09~11)', '午시(11~13)', '未시(13~15)',
  '申시(15~17)', '酉시(17~19)', '戌시(19~21)', '亥시(21~23)',
]
const HOUR_INDEX: Record<string, number> = {
  '子시(23~01)': 0, '丑시(01~03)': 1, '寅시(03~05)': 2, '卯시(05~07)': 3,
  '辰시(07~09)': 4, '巳시(09~11)': 5, '午시(11~13)': 6, '未시(13~15)': 7,
  '申시(15~17)': 8, '酉시(17~19)': 9, '戌시(19~21)': 10, '亥시(21~23)': 11,
}

type Profile = {
  nickname: string | null
  role: string | null
  birth_year: number | null
  birth_month: number | null
  birth_day: number | null
  birth_hour: string | null
  cal_type: string | null
  gender: string | null
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

// 내 후기 타입
type MyReview = {
  id: string
  rating: number
  service_type: string | null
  content: string
  is_approved: boolean
  created_at: string | null
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

export default function MyPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [myNames, setMyNames] = useState<MyName[]>([])
  const [consults, setConsults] = useState<Consultation[]>([])
  const [myReviews, setMyReviews] = useState<MyReview[]>([])
  const [reviewsOpen, setReviewsOpen] = useState(false)         // 아코디언 열림
  const [rvEditId, setRvEditId] = useState<string | null>(null) // 수정 중인 후기 id
  const [rvText, setRvText] = useState('')                      // 수정 입력값
  const [rvSaving, setRvSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState<string | null>(null) // 취소 처리 중인 예약 id

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
      if (!data.user) { router.push('/auth/login'); return }
      setEmail(data.user.email || '')
      setUserId(data.user.id)

      const { data: p } = await supabase.from('profiles')
        .select('nickname, role, birth_year, birth_month, birth_day, birth_hour, cal_type, gender, saju_saved')
        .eq('id', data.user.id).single()
      if (p) setProfile(p as Profile)
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

      // 내 후기 (user_id 기준)
      supabase.from('reviews')
        .select('id, rating, service_type, content, is_approved, created_at')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false })
        .then(({ data: rows }) => { if (rows) setMyReviews(rows as MyReview[]) })

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
          body: JSON.stringify({
            saju, dayStem, iljji,
            nickname: profile?.nickname || undefined,
          }),
        })
        const data = await res.json()
        if (data.error) { console.error('운세 생성 오류:', data.error); return }
        if (cancelled) return

        const row: Fortune = {
          fortune_date: data.fortune_date,
          iljin_gan: data.iljin_gan,
          iljin_ji: data.iljin_ji,
          score: data.score,
          summary: data.summary,
          love: data.love,
          money: data.money,
          health: data.health,
          lucky_color: data.lucky_color,
          lucky_dir: data.lucky_dir,
          today_insight: data.today_insight,
        }
        setFortune(row)

        await supabase.from('daily_fortune').upsert({
          user_id: userId,
          ...row,
        }, { onConflict: 'user_id,fortune_date' })
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
    r === 'master' ? { bg: 'rgba(83,74,183,0.15)', fg: '#AFA9EC' }
      : r === 'consultant' ? { bg: 'rgba(29,158,117,0.15)', fg: '#5DCAA5' }
        : { bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.6)' }

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
    if (s === 'paid' || s === 'done' || s === '완료') return { label: '완료', color: '#5DCAA5' }
    if (s === 'booked') return { label: '예약 확정', color: '#7DA3FF' }
    if (s === 'pending') return { label: '대기중', color: '#FAC775' }
    if (s === 'cancelled' || s === 'canceled') return { label: '취소됨', color: 'rgba(255,255,255,0.4)' }
    return { label: s || '진행중', color: 'rgba(255,255,255,0.5)' }
  }

  // 예약 취소: 상담 상태 → cancelled, 예약(bookings) → cancelled, 잠긴 시간(slot) 풀기
  const cancelBooking = async (c: Consultation) => {
    if (c.status !== 'booked') return
    const when = c.booking_date
      ? `${dateText(c.booking_date)}${c.booking_hour != null ? ` ${c.booking_hour}시` : ''}`
      : ''
    if (!confirm(`이 예약을 취소할까요?\n${c.consultant_name || '상담사'}${when ? ' · ' + when : ''}\n\n취소하면 되돌릴 수 없습니다.`)) return

    setCancelingId(c.id)
    try {
      // 1) 이 상담에 연결된 예약(bookings)에서 잠긴 슬롯 id 찾기
      const { data: bks } = await supabase
        .from('bookings')
        .select('id, slot_id')
        .eq('consultation_id', c.id)

      // 2) 잠긴 시간(consultant_slots) 풀기 — 다른 고객이 다시 예약할 수 있게
      const slotIds = (bks ?? []).map(b => b.slot_id).filter(Boolean)
      if (slotIds.length > 0) {
        await supabase.from('consultant_slots')
          .update({ is_booked: false })
          .in('id', slotIds as string[])
      }

      // 3) 예약(bookings) 상태 취소로
      await supabase.from('bookings')
        .update({ status: 'cancelled' })
        .eq('consultation_id', c.id)

      // 4) 상담(consultations) 상태 취소로
      const { error: cErr } = await supabase.from('consultations')
        .update({ status: 'cancelled' })
        .eq('id', c.id)
      if (cErr) { alert('취소 실패: ' + cErr.message); setCancelingId(null); return }

      // 5) 화면에서 즉시 제거(취소된 건은 목록에 남기지 않음) + 알림
      setConsults(prev => prev.filter(x => x.id !== c.id))
      alert('예약이 취소되었습니다.')
    } catch (e: any) {
      alert('취소 중 오류가 발생했어요. 다시 시도해 주세요.')
      console.error(e)
    } finally {
      setCancelingId(null)
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

  const openNickEdit = () => {
    setENick(profile?.nickname || '')
    setNickMsg('')
    setNickEdit(true)
  }

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

  // 내 후기 수정 열기
  const openRvEdit = (r: MyReview) => {
    setRvEditId(r.id)
    setRvText(r.content)
  }

  // 내 후기 저장 → 다시 대기(is_approved=false)로 돌려 재승인
  const saveRv = async (r: MyReview) => {
    const text = rvText.trim()
    if (!text) { alert('후기 내용을 입력해 주세요.'); return }
    setRvSaving(true)
    const { error } = await supabase.from('reviews')
      .update({ content: text, is_approved: false })
      .eq('id', r.id)
    setRvSaving(false)
    if (error) { alert('저장 실패: ' + error.message); return }
    setMyReviews(prev => prev.map(x => x.id === r.id ? { ...x, content: text, is_approved: false } : x))
    setRvEditId(null)
  }

  // 내 후기 삭제
  const deleteRv = async (r: MyReview) => {
    if (!confirm('이 후기를 삭제할까요?\n삭제하면 되돌릴 수 없습니다.')) return
    const { error } = await supabase.from('reviews').delete().eq('id', r.id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setMyReviews(prev => prev.filter(x => x.id !== r.id))
  }

  const logout = async () => {
    await supabase.auth.signOut()
    try {
      sessionStorage.clear()
      localStorage.clear()
    } catch {}
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
    try {
      sessionStorage.clear()
      localStorage.clear()
    } catch {}
    window.location.href = '/'
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>불러오는 중…</div>
  }

  const rc = roleColor(profile?.role || null)
  const isStaff = profile?.role === 'consultant' || profile?.role === 'master'
  const isMaster = profile?.role === 'master'
  const initial = (profile?.nickname || email || '?').charAt(0)

  const card: React.CSSProperties = { background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, marginBottom: 12 }
  const numInput: React.CSSProperties = { flex: 1, minWidth: 0, padding: '10px 6px', borderRadius: 8, textAlign: 'center', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, outline: 'none' }
  const seg = (on: boolean): React.CSSProperties => ({ flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: on ? '#3C3489' : 'transparent', color: on ? '#FAC775' : '#8a88a0' })

  const stars = (n: number | null) => {
    const s = Math.max(0, Math.min(5, n || 0))
    return '★★★★★'.slice(0, s) + '☆☆☆☆☆'.slice(0, 5 - s)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a18', padding: '20px 16px 40px' }}>
      <div style={{ maxWidth: 460, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>마이페이지</span>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer' }}>← 홈</button>
        </div>

        {/* 1. 내 정보 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(83,74,183,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#AFA9EC' }}>{initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{profile?.nickname || '(닉네임 없음)'}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
            </div>
            <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 12, background: rc.bg, color: rc.fg, fontWeight: 600, flexShrink: 0 }}>{roleLabel(profile?.role || null)}</span>
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {!nickEdit ? (
              <button onClick={openNickEdit} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>닉네임 수정</button>
            ) : (
              <div>
                <div style={{ fontSize: 11, color: '#b0aec8', marginBottom: 4 }}>닉네임</div>
                <input value={eNick} onChange={e => setENick(e.target.value)} placeholder="닉네임을 입력하세요" maxLength={20}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                {nickMsg && <div style={{ color: '#ff8080', fontSize: 12, marginBottom: 8 }}>{nickMsg}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setNickEdit(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>취소</button>
                  <button onClick={saveNick} disabled={nickSaving} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #FAC775, #f0a030)', color: '#1a1a18', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: nickSaving ? 0.6 : 1 }}>{nickSaving ? '저장 중…' : '저장'}</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ★ 오늘의 운세 */}
        <div style={{ ...card, border: '1px solid rgba(250,199,117,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#FAC775' }}>✦ 오늘의 운세</span>
            {fortune?.iljin_gan && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: 12 }}>
                {todayKST().slice(5).replace('-', '.')} · {fortune.iljin_gan}{fortune.iljin_ji}일
              </span>
            )}
          </div>

          {!profile?.saju_saved ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '10px 0', lineHeight: 1.7 }}>
              사주를 등록하면 매일 나만의 운세를 볼 수 있어요.<br />
              <button onClick={openEdit} style={{ marginTop: 8, fontSize: 12, color: '#FAC775', background: 'none', border: '1px solid rgba(250,199,117,0.4)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>사주 등록하러 가기</button>
            </div>
          ) : (fortuneLoading || (!fortune && !fortuneChecked) || converting) ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '16px 0' }}>오늘의 운세를 준비하는 중…</div>
          ) : fortune ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 15, color: '#FAC775', letterSpacing: 2 }}>{stars(fortune.score)}</span>
              </div>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.75, margin: '0 0 12px' }}>{fortune.summary}</p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, background: 'rgba(250,199,117,0.08)', borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>행운의 색</div>
                  <div style={{ fontSize: 12, color: '#FAC775', marginTop: 2 }}>{fortune.lucky_color || '-'}</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(250,199,117,0.08)', borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>행운의 방향</div>
                  <div style={{ fontSize: 12, color: '#FAC775', marginTop: 2 }}>{fortune.lucky_dir || '-'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: fortune.today_insight ? 12 : 0 }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 6px' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>❤️ 애정</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{fortune.love || '-'}</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 6px' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>💰 재물</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{fortune.money || '-'}</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 6px' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>🌿 건강</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{fortune.health || '-'}</div>
                </div>
              </div>

              {fortune.today_insight && (
                <div style={{ paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#FAC775', marginBottom: 6 }}>🔥 오늘의 명리 한 조각</div>
                  <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: 0 }}>{fortune.today_insight}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '12px 0' }}>운세를 불러오지 못했어요. 잠시 후 다시 들어와 주세요.</div>
          )}
        </div>

        {/* 2. 내 사주 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#FAC775' }}>✦ 내 사주</span>
            {!editMode && (
              <button onClick={openEdit} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}>수정</button>
            )}
          </div>

          {!editMode ? (
            profile?.saju_saved && profile?.birth_year ? (
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.9 }}>
                {profile.cal_type || '양력'} {profile.birth_year}. {profile.birth_month}. {profile.birth_day} · {hourTextFull(profile.birth_hour)}<br />
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{profile.gender === '여' ? '여성' : '남성'}</span>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>아직 등록된 사주가 없습니다. "수정"을 눌러 등록하세요.</div>
            )
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#b0aec8', marginBottom: 4 }}>성별</div>
                  <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <button onClick={() => setEGender('남')} style={seg(eGender === '남')}>남</button>
                    <button onClick={() => setEGender('여')} style={seg(eGender === '여')}>여</button>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#b0aec8', marginBottom: 4 }}>달력</div>
                  <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <button onClick={() => setECal('양력')} style={seg(eCal === '양력')}>양력</button>
                    <button onClick={() => setECal('음력')} style={seg(eCal === '음력')}>음력</button>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#b0aec8', marginBottom: 4 }}>생년월일</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                <input value={eYear} onChange={e => setEYear(onlyNum(e.target.value, 4))} inputMode="numeric" placeholder="1990" style={{ ...numInput, flex: 1.5 }} />
                <span style={{ fontSize: 12, color: '#8a88a0' }}>년</span>
                <input value={eMonth} onChange={e => setEMonth(onlyNum(e.target.value, 2))} inputMode="numeric" placeholder="5" style={numInput} />
                <span style={{ fontSize: 12, color: '#8a88a0' }}>월</span>
                <input value={eDay} onChange={e => setEDay(onlyNum(e.target.value, 2))} inputMode="numeric" placeholder="12" style={numInput} />
                <span style={{ fontSize: 12, color: '#8a88a0' }}>일</span>
              </div>

              <div style={{ fontSize: 11, color: '#b0aec8', marginBottom: 4 }}>태어난 시 (시주)</div>
              <select value={eHour} onChange={e => setEHour(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.08)', color: eHour ? '#fff' : '#8a88a0', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}>
                <option value="">시간 선택</option>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>

              {msg && <div style={{ color: '#ff8080', fontSize: 12, marginBottom: 10 }}>{msg}</div>}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditMode(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>취소</button>
                <button onClick={saveSaju} disabled={saving} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #FAC775, #f0a030)', color: '#1a1a18', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? '저장 중…' : '저장'}</button>
              </div>
            </div>
          )}
        </div>

        {/* 3. 내 이름풀이 기록 */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#FAC775', marginBottom: 12 }}>✦ 내 이름풀이</div>
          {myNames.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '8px 0' }}>아직 풀이한 이름이 없습니다.</div>
          ) : (
            <div>
              {myNames.map((n, i) => (
                <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < myNames.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
                      {n.hanja_name || '-'} <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{n.hangul_name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{dateText(n.created_at)}{n.kind === 'self' ? ' · 내 이름' : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. 내 상담 내역 */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 10 }}>내 상담 내역</div>
          {consults.filter(c => c.status !== 'cancelled' && c.status !== 'canceled').length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '12px 0' }}>아직 신청한 상담이 없습니다.</div>
          ) : (
            <div>
              {consults
                .filter(c => c.status !== 'cancelled' && c.status !== 'canceled')
                .map((c, i, arr) => {
                const st = statusInfo(c.status)
                const isBooked = c.status === 'booked'
                return (
                  <div key={c.id} style={{ padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 14, color: '#fff' }}>{c.consultant_name || '상담사'}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                          {dateText(c.booking_date || c.created_at)}
                          {c.booking_hour != null ? ` ${c.booking_hour}시` : ''}
                          {c.paid_amount ? ` · ${c.paid_amount.toLocaleString()}원` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: st.color }}>{st.label}</span>
                    </div>

                    <button
                      onClick={() => router.push(`/manseryeok/consulting?consultationId=${c.id}`)}
                      style={{ marginTop: 8, width: '100%', padding: '9px 0', borderRadius: 10,
                        background: 'rgba(83,74,183,0.25)', border: '1px solid rgba(119,102,221,0.4)',
                        color: '#c8b0ff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      💬 채팅방 입장
                    </button>

                    {/* 예약 확정(booked) 상태일 때만 취소 버튼 노출 */}
                    {isBooked && (
                      <button
                        onClick={() => cancelBooking(c)}
                        disabled={cancelingId === c.id}
                        style={{ marginTop: 6, width: '100%', padding: '9px 0', borderRadius: 10,
                          background: 'none', border: '1px solid rgba(226,75,74,0.4)',
                          color: '#ff8080', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          opacity: cancelingId === c.id ? 0.5 : 1 }}>
                        {cancelingId === c.id ? '취소 처리 중…' : '예약 취소'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 4-1. 내 후기 (아코디언) */}
        <div style={card}>
          <button
            onClick={() => setReviewsOpen(v => !v)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#FAC775' }}>✦ 내 후기 <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>{myReviews.length}</span></span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{reviewsOpen ? '▲' : '▼'}</span>
          </button>

          {reviewsOpen && (
            <div style={{ marginTop: 12 }}>
              {myReviews.length === 0 ? (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '8px 0' }}>아직 작성한 후기가 없습니다.</div>
              ) : (
                myReviews.map((r, i) => (
                  <div key={r.id} style={{ padding: '12px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    {/* 상단: 별점 · 상태 · 서비스 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ color: '#FAC775', fontSize: 13 }}>{stars(r.rating)}</span>
                      {r.is_approved
                        ? <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(120,200,120,0.15)', color: '#7ec87e' }}>노출 중</span>
                        : <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,180,80,0.15)', color: '#ffb450' }}>대기</span>}
                      {r.service_type && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>{r.service_type}</span>}
                    </div>

                    {rvEditId === r.id ? (
                      /* 수정 모드 */
                      <div>
                        <textarea
                          value={rvText}
                          onChange={e => setRvText(e.target.value)}
                          maxLength={1000}
                          rows={4}
                          style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, lineHeight: 1.6, resize: 'vertical', outline: 'none', marginBottom: 4 }}
                        />
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>수정하면 다시 관리자 승인을 거쳐 노출됩니다.</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setRvEditId(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>취소</button>
                          <button onClick={() => saveRv(r)} disabled={rvSaving} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #FAC775, #f0a030)', color: '#1a1a18', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: rvSaving ? 0.6 : 1 }}>{rvSaving ? '저장 중…' : '저장'}</button>
                        </div>
                      </div>
                    ) : (
                      /* 보기 모드 */
                      <div>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: '0 0 6px', whiteSpace: 'pre-wrap' }}>{r.content}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{dateText(r.created_at)}</span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => openRvEdit(r)} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>수정</button>
                            <button onClick={() => deleteRv(r)} style={{ fontSize: 12, color: '#ff8080', background: 'none', border: '1px solid rgba(226,75,74,0.4)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>삭제</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 5. 관리 화면 버튼 (상담사·매니저만) */}
        {isStaff && (
          <div style={{ border: '1px solid rgba(250,199,117,0.3)', borderRadius: 14, padding: '8px 16px', marginBottom: 12 }}>
            <button onClick={async () => {
              const { data: c } = await supabase.from('consultants').select('id').eq('email', email).single()
              router.push(c ? `/manseryeok/consultant?consultantId=${c.id}` : '/manseryeok/consultant')
            }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', background: 'none', border: 'none', borderBottom: isMaster ? '1px solid rgba(255,255,255,0.08)' : 'none', color: '#fff', fontSize: 14, cursor: 'pointer' }}>
              <span>🩺 상담 관리 화면</span><span style={{ color: 'rgba(255,255,255,0.4)' }}>›</span>
            </button>
            {isMaster && (
              <button onClick={() => router.push('/admin')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', background: 'none', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer' }}>
                <span>🔐 관리자 화면</span><span style={{ color: 'rgba(255,255,255,0.4)' }}>›</span>
              </button>
            )}
          </div>
        )}

        {/* 6. 로그아웃 / 탈퇴 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={logout} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer' }}>로그아웃</button>
          <button onClick={withdraw} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid rgba(226,75,74,0.4)', background: 'none', color: '#ff8080', fontSize: 13, cursor: 'pointer' }}>회원 탈퇴</button>
        </div>

      </div>
    </div>
  )
}
