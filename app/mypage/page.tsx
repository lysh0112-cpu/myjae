'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// 홈/welcome과 동일한 시주 형식 (인덱스 0~11 또는 '모름')
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
  consultant_id: string | null
  consultant_name?: string
}

export default function MyPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [myNames, setMyNames] = useState<MyName[]>([])
  const [consults, setConsults] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)

  // 사주 수정 모드
  const [editMode, setEditMode] = useState(false)
  const [eYear, setEYear] = useState('')
  const [eMonth, setEMonth] = useState('')
  const [eDay, setEDay] = useState('')
  const [eHour, setEHour] = useState('')
  const [eCal, setECal] = useState<'양력' | '음력'>('양력')
  const [eGender, setEGender] = useState<'남' | '여'>('남')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

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

      // 내 상담 내역 (user_id 기준) + 상담사 이름 붙이기
      const { data: cs } = await supabase.from('consultations')
        .select('id, status, paid_amount, created_at, booking_date, consultant_id')
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
    if (s === 'pending') return { label: '대기중', color: '#FAC775' }
    return { label: s || '진행중', color: 'rgba(255,255,255,0.5)' }
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
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const withdraw = async () => {
    if (!confirm('정말 회원 탈퇴를 진행할까요?\n탈퇴하면 내 정보와 사주가 삭제되며 되돌릴 수 없습니다.')) return
    await supabase.from('profiles').update({
      nickname: null, birth_year: null, birth_month: null, birth_day: null,
      birth_hour: null, cal_type: null, gender: null, saju_saved: false,
    }).eq('id', userId)
    alert('탈퇴 요청이 접수되었습니다. 이용해주셔서 감사합니다.')
    await supabase.auth.signOut()
    router.push('/')
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

        {/* 4. 내 상담 내역 (user_id 기준) */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 10 }}>내 상담 내역</div>
          {consults.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '12px 0' }}>아직 신청한 상담이 없습니다.</div>
          ) : (
            <div>
              {consults.map((c, i) => {
                const st = statusInfo(c.status)
                return (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < consults.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 14, color: '#fff' }}>{c.consultant_name || '상담사'}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                        {dateText(c.booking_date || c.created_at)}
                        {c.paid_amount ? ` · ${c.paid_amount.toLocaleString()}원` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: st.color }}>{st.label}</span>
                  </div>
                )
              })}
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
