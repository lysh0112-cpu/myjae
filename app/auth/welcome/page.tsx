'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// 홈 화면(AiManseryeokSection)과 동일한 시주 목록 — 형식을 반드시 일치시킬 것
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

export default function WelcomePage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [nickname, setNickname] = useState('')

  // ── 사주 입력 상태 (신규) ──
  const [gender, setGender] = useState<'남' | '여'>('남')
  const [calType, setCalType] = useState<'양력' | '음력'>('양력')
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [birthHour, setBirthHour] = useState('')   // HOURS 중 하나(라벨)

  const [agreeRequired, setAgreeRequired] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth/login'); return }
      setUserId(data.user.id)
      supabase.from('profiles').select('nickname').eq('id', data.user.id).single()
        .then(({ data: p }) => { if (p?.nickname) setNickname(p.nickname) })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async () => {
    if (!userId) return
    if (!nickname.trim()) { setMsg('닉네임을 입력해주세요.'); return }

    // ── 사주 필수 입력 검증 ──
    const y = parseInt(birthYear, 10)
    const m = parseInt(birthMonth, 10)
    const d = parseInt(birthDay, 10)
    if (!y || birthYear.length !== 4 || y < 1900 || y > 2200) {
      setMsg('태어난 연도를 4자리로 정확히 입력해주세요. (예: 1990)'); return
    }
    if (!m || m < 1 || m > 12) {
      setMsg('태어난 월을 1~12 사이로 입력해주세요.'); return
    }
    if (!d || d < 1 || d > 31) {
      setMsg('태어난 일을 1~31 사이로 입력해주세요.'); return
    }
    if (!birthHour) {
      setMsg('태어난 시(시주)를 선택해주세요. 모르면 "모름"을 선택하세요.'); return
    }
    if (!agreeRequired) { setMsg('필수 약관에 동의해주세요.'); return }

    // 시주를 홈 화면과 동일한 형식으로 변환: 인덱스(0~11) 문자열 또는 '모름'
    const hourValue =
      birthHour === '모름' ? '모름' : String(HOUR_INDEX[birthHour])

    setLoading(true)
    const now = new Date().toISOString()
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      nickname: nickname.trim(),
      // ── 사주 저장 (신규) ──
      birth_year: y,
      birth_month: m,
      birth_day: d,
      birth_hour: hourValue,
      cal_type: calType,
      gender: gender,
      saju_saved: true,
      // ── 기존 약관 ──
      privacy_agreed: true,
      privacy_agreed_at: now,
      terms_agreed: true,
      marketing_agreed: agreeMarketing,
    }, { onConflict: 'id' })
    setLoading(false)

    if (error) { setMsg('저장 실패: ' + error.message); return }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
    if (profile?.role === 'consultant' || profile?.role === 'master') {
      router.push('/manseryeok/consultant')
    } else {
      router.push('/')
    }
  }

  // 숫자만 남기는 도우미
  const onlyNum = (v: string, maxLen: number) => v.replace(/[^0-9]/g, '').slice(0, maxLen)

  const segBtn = (on: boolean): React.CSSProperties => ({
    flex: 1, padding: '9px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    border: 'none', background: on ? '#3C3489' : 'transparent',
    color: on ? '#FAC775' : '#8a88a0', transition: 'all 0.15s',
  })

  const numInput: React.CSSProperties = {
    flex: 1, minWidth: 0, padding: '11px 8px', borderRadius: 10, textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.08)',
    color: '#fff', fontSize: 15, outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 460, background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#FAC775', marginBottom: 6 }}>명연재에 오신 걸 환영합니다</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>닉네임과 내 사주를 등록해주세요 (최초 1회)</div>
        </div>

        {/* 닉네임 */}
        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 6 }}>닉네임</label>
        <input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={20}
          placeholder="명연재에서 사용할 이름"
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 15, outline: 'none', marginBottom: 20, boxSizing: 'border-box' }} />

        {/* ── 내 사주 정보 (신규) ── */}
        <div style={{ background: 'rgba(60,52,137,0.12)', border: '1px solid rgba(250,199,117,0.25)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#FAC775', marginBottom: 14 }}>✦ 내 사주 정보</div>

          {/* 성별 / 달력 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#b0aec8', marginBottom: 6 }}>성별</div>
              <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <button onClick={() => setGender('남')} style={segBtn(gender === '남')}>남</button>
                <button onClick={() => setGender('여')} style={segBtn(gender === '여')}>여</button>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#b0aec8', marginBottom: 6 }}>달력</div>
              <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <button onClick={() => setCalType('양력')} style={segBtn(calType === '양력')}>양력</button>
                <button onClick={() => setCalType('음력')} style={segBtn(calType === '음력')}>음력</button>
              </div>
            </div>
          </div>

          {/* 생년월일 — 직접 입력 */}
          <div style={{ fontSize: 12, color: '#b0aec8', marginBottom: 6 }}>생년월일 (숫자로 직접 입력)</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 14 }}>
            <input value={birthYear} onChange={e => setBirthYear(onlyNum(e.target.value, 4))}
              inputMode="numeric" placeholder="1990" style={{ ...numInput, flex: 1.5 }} />
            <span style={{ fontSize: 13, color: '#8a88a0' }}>년</span>
            <input value={birthMonth} onChange={e => setBirthMonth(onlyNum(e.target.value, 2))}
              inputMode="numeric" placeholder="5" style={numInput} />
            <span style={{ fontSize: 13, color: '#8a88a0' }}>월</span>
            <input value={birthDay} onChange={e => setBirthDay(onlyNum(e.target.value, 2))}
              inputMode="numeric" placeholder="12" style={numInput} />
            <span style={{ fontSize: 13, color: '#8a88a0' }}>일</span>
          </div>

          {/* 시주 */}
          <div style={{ fontSize: 12, color: '#b0aec8', marginBottom: 6 }}>태어난 시 (시주)</div>
          <select value={birthHour} onChange={e => setBirthHour(e.target.value)}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.08)', color: birthHour ? '#fff' : '#8a88a0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
            <option value="">시간 선택 (모르면 "모름")</option>
            {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        {/* 약관 */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={agreeRequired} onChange={e => setAgreeRequired(e.target.checked)} style={{ marginTop: 3 }} />
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 600 }}>
              <span style={{ color: '#FAC775' }}>[필수]</span> 개인정보 수집·이용 및 이용약관에 동의합니다
            </span>
          </label>

          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxHeight: 180, overflowY: 'auto', marginBottom: 12 }}>
            <b style={{ color: 'rgba(255,255,255,0.8)' }}>· 수집 항목</b><br />
            이메일, 닉네임, 생년월일·출생시간·성별(사주 분석용), 상담·결제 내역<br /><br />
            <b style={{ color: 'rgba(255,255,255,0.8)' }}>· 이용 목적</b><br />
            사주·작명·궁합 등 명리 분석 서비스 제공, AI 분석 및 전문가 상담 연결, 결제·정산 처리<br /><br />
            <b style={{ color: 'rgba(255,255,255,0.8)' }}>· 보유 기간</b><br />
            회원 탈퇴 시까지. 관련 법령에 따라 일정 기간 보관될 수 있습니다.<br /><br />
            <b style={{ color: 'rgba(255,255,255,0.8)' }}>· AI 분석 안내</b><br />
            입력하신 사주 정보는 AI 분석에 활용되며, 분석 결과는 참고용입니다.<br /><br />
            동의를 거부할 수 있으나, 거부 시 서비스 이용이 제한됩니다.
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={agreeMarketing} onChange={e => setAgreeMarketing(e.target.checked)} />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              [선택] 이벤트·혜택 등 마케팅 정보 수신에 동의합니다
            </span>
          </label>
        </div>

        {msg && <div style={{ color: '#ff8080', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{msg}</div>}

        <button onClick={submit} disabled={loading}
          style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #FAC775, #f0a030)', color: '#1a1a18', fontWeight: 800, fontSize: 15, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? '저장 중…' : '동의하고 시작하기'}
        </button>
      </div>
    </div>
  )
}
