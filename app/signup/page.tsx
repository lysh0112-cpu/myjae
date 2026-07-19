'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  hourLabelOf, normalizeHourLabel, toStoredHour,
  TIME_BANDS, MONTHS, dayOptions, clampDay, isValidBirthDate,
  crossesMidnight, type TimeBand,
} from '@/lib/saju/birthInput'

// 시(時) 목록 — 공용 birthInput.ts 기준 (30분법 · 공백없음).
//   ★ '모름'은 두지 않는다. 시를 반드시 입력받는다(대표님 확정 2026-07).
//     정확히 모르는 사람은 아래 시간대 버튼으로 3개까지 좁혀서 고른다.
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i),
  label: hourLabelOf(i),
}))

function genderToValue(g: '여자' | '남자' | ''): '남' | '여' {
  return g === '여자' ? '여' : '남'
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: '48px', padding: '0 14px',
  border: '0.5px solid #e0ddd6', borderRadius: '12px',
  background: '#fff', color: '#1a1a1a', fontSize: '14px',
  outline: 'none', boxSizing: 'border-box',
}

// 드롭다운 공통 (기본 화살표 숨기고 직접 그림)
const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23bbb' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: '28px',
  cursor: 'pointer',
}

export default function SignupPage() {
  const router = useRouter()

  // 사주 정보
  const [hangulName, setHangulName] = useState('')
  const [hanjaName, setHanjaName] = useState('')
  const [nickname, setNickname] = useState('')
  const [gender, setGender] = useState<'여자' | '남자' | ''>('')
  const [calType, setCalType] = useState<'양력' | '음력'>('양력')
  const [leap, setLeap] = useState(false)
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [hour, setHour] = useState('')       // '0'~'11' (인덱스 문자열)
  const [band, setBand] = useState<TimeBand | null>(null)  // 시간대 보조 필터
  const [city, setCity] = useState('')

  // 계정 정보
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [agreed, setAgreed] = useState(false)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const onlyNum = (v: string, len: number) => v.replace(/[^0-9]/g, '').slice(0, len)

  // 연/월이 바뀌면 이미 고른 '일'이 범위를 벗어날 수 있다 (3/31 → 2월).
  const applyYear = (v: string) => {
    const y = onlyNum(v, 4)
    setYear(y)
    if (month && day) setDay(clampDay(day, parseInt(y, 10), parseInt(month, 10), calType))
  }
  const applyMonth = (m: string) => {
    setMonth(m)
    if (day) setDay(clampDay(day, parseInt(year, 10), parseInt(m, 10), calType))
  }
  const applyCalType = (c: '양력' | '음력') => {
    setCalType(c)
    if (month && day) setDay(clampDay(day, parseInt(year, 10), parseInt(month, 10), c))
  }

  // 시간대를 고르면 그 안의 3개 시진만 목록에 남긴다.
  // 시간대를 고르면 그 안의 3개만. band.hours 순서를 그대로 따른다
  //   (밤 = 戌·亥·子 순. 인덱스 오름차순으로 뽑으면 子가 앞으로 와서 어색함)
  const visibleHours = band
    ? band.hours.map(i => HOUR_OPTIONS[i])
    : HOUR_OPTIONS

  const pickBand = (b: TimeBand) => {
    if (band?.key === b.key) { setBand(null); return }   // 다시 누르면 해제
    setBand(b)
    if (hour && !b.hours.includes(Number(hour))) setHour('')  // 범위 밖이면 초기화
  }

  // 소셜 로그인 (아직 준비 중)
  const handleSocial = (provider: string) => {
    setMsg(`${provider} 로그인은 준비 중입니다. 이메일로 가입해주세요.`)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  // 회원가입 실행
  const handleSignup = async () => {
    setMsg('')
    if (!hangulName) { setMsg('이름(한글)을 입력해주세요.'); return }
    if (!gender) { setMsg('성별을 선택해주세요.'); return }
    if (year.length !== 4 || !month || !day) { setMsg('생년월일을 정확히 입력해주세요.'); return }
    if (!isValidBirthDate(year, month, day, calType)) { setMsg('생년월일이 올바르지 않아요. 다시 확인해주세요.'); return }
    if (!hour) { setMsg('태어난 시간을 선택해주세요. 정확히 모르시면 시간대 버튼으로 골라주세요.'); return }
    if (!email || !email.includes('@')) { setMsg('올바른 이메일을 입력해주세요.'); return }
    if (password.length < 6) { setMsg('비밀번호는 6자 이상으로 입력해주세요.'); return }
    if (password !== passwordConfirm) { setMsg('비밀번호가 일치하지 않습니다.'); return }
    if (!agreed) { setMsg('필수 약관에 동의해주세요.'); return }

    setLoading(true)

    // 1) 계정 생성
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { nickname: nickname || hangulName } },
    })
    if (signUpError) {
      setLoading(false)
      setMsg('회원가입 실패: ' + signUpError.message)
      return
    }
    const userId = signUpData.user?.id
    if (!userId) {
      setLoading(false)
      setMsg('계정 생성은 됐지만 사용자 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.')
      return
    }

    // 2) profiles 저장
    const hourValue = toStoredHour(normalizeHourLabel(hour))
    const genderValue = genderToValue(gender)
    const leapValue = calType === '음력' && leap
    const now = new Date().toISOString()

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      hangul_name: hangulName,
      hanja_name: hanjaName || null,
      nickname: nickname || hangulName,
      email,
      birth_year: parseInt(year, 10),
      birth_month: parseInt(month, 10),
      birth_day: parseInt(day, 10),
      birth_hour: hourValue,
      cal_type: calType,
      gender: genderValue,
      leap_month: leapValue,
      birth_city: city || null,
      saju_saved: true,
      privacy_agreed: true,
      privacy_agreed_at: now,
      terms_agreed: true,
      marketing_agreed: false,
    }, { onConflict: 'id' })

    setLoading(false)
    if (profileError) {
      setMsg('계정은 생성됐지만 사주 정보 저장에 실패했습니다: ' + profileError.message)
      return
    }

    // 3) 만세력 결과로 이동 (저장 확인)
    const leapMonth = leapValue ? '1' : '0'
    const params = new URLSearchParams({
      gender: genderValue, calType, year, month, day, leapMonth, hour: hourValue,
    })
    router.push(`/manseryeok/result-new?${params.toString()}`)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAF8',
      maxWidth: '430px', margin: '0 auto',
      fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
      color: '#1a1a1a',
    }}>

      <style>{`
        @keyframes mcCupSway { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
        @keyframes mcSteamA { 0% { opacity:0; transform:translateY(0) scaleX(1);} 15%{opacity:0.6;} 50%{opacity:0.4; transform:translateY(-9px) scaleX(1.3);} 100%{opacity:0; transform:translateY(-18px) scaleX(0.8);} }
        @keyframes mcSteamB { 0% { opacity:0; transform:translateY(0) scaleX(1);} 20%{opacity:0.5;} 55%{opacity:0.3; transform:translateY(-10px) scaleX(1.4);} 100%{opacity:0; transform:translateY(-20px) scaleX(0.7);} }
        .mc-cup { animation: mcCupSway 3.5s ease-in-out infinite; transform-origin: bottom center; }
        .mc-steam-a { animation: mcSteamA 2.8s ease-out infinite; }
        .mc-steam-b { animation: mcSteamB 2.8s ease-out infinite 0.9s; }
        .mc-steam-c { animation: mcSteamA 2.8s ease-out infinite 1.6s; }
      `}</style>
      {/* 헤더 (통일용 뒤로가기 버튼) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '14px 16px', background: '#FAFAF8',
        borderBottom: '0.5px solid #f0ede6',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => router.push('/landing')}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            border: '0.5px solid #e8e5de', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '16px', color: '#555', padding: 0,
          }}
          aria-label="뒤로가기"
        >‹</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="28" height="32" viewBox="0 0 46 50" style={{ overflow: 'visible' }}>
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
          <span style={{ fontSize: 17, fontWeight: 900, fontStyle: 'italic' }}>
            <span style={{ color: '#96502e' }}>Myung</span><span style={{ color: '#b46e46' }}>Cafe</span>
          </span>
        </div>
      </div>

      <main style={{ padding: '26px 20px 60px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.4, margin: '0 0 6px' }}>
            나의 사주와<br />계정을 만들어주세요
          </h1>
          <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>
            가입 한 번으로 내 사주를 영구 저장해요
          </p>
        </div>

        {/* 이름(한글) */}
        <Field label="이름 (한글)">
          <input value={hangulName} onChange={e => setHangulName(e.target.value.slice(0, 20))}
            placeholder="성함을 입력하세요" style={inputStyle} />
        </Field>

        {/* 이름(한자) + 권장 멘트 */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px' }}>
            이름 (한자) <span style={{ fontSize: '10px', color: '#8B6914', fontWeight: 500 }}>선택</span>
          </div>
          <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px' }}>
            정확한 이름풀이를 위해 한자를 함께 입력해 주시면 좋아요
          </div>
          <input value={hanjaName} onChange={e => setHanjaName(e.target.value.slice(0, 20))}
            placeholder="예: 洪吉童 (한자 이름)" style={inputStyle} />
        </div>

        {/* 닉네임 */}
        <Field label="닉네임">
          <input value={nickname} onChange={e => setNickname(e.target.value.slice(0, 12))}
            placeholder="서비스에서 사용할 이름" style={inputStyle} />
        </Field>

        {/* 성별 */}
        <Field label="성별">
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['여자', '남자'] as const).map(g => (
              <button key={g} onClick={() => setGender(g)} style={{
                flex: 1, height: '46px', borderRadius: '12px',
                border: gender === g ? '1.5px solid #1a1a1a' : '0.5px solid #e0ddd6',
                background: gender === g ? '#1a1a1a' : '#fff',
                color: gender === g ? '#fff' : '#888',
                fontSize: '14px', fontWeight: gender === g ? 600 : 400, cursor: 'pointer',
              }}>{g}</button>
            ))}
          </div>
        </Field>

        {/* 생년월일 */}
        <Field label="생년월일">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            {(['양력', '음력'] as const).map(c => (
              <button key={c} onClick={() => applyCalType(c)} style={{
                padding: '6px 18px', borderRadius: '20px',
                border: calType === c ? '1.5px solid #1a1a1a' : '0.5px solid #e0ddd6',
                background: calType === c ? '#1a1a1a' : '#fff',
                color: calType === c ? '#fff' : '#888',
                fontSize: '12px', cursor: 'pointer',
              }}>{c}</button>
            ))}
          </div>
          {calType === '음력' && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              {([['평달', false], ['윤달', true]] as const).map(([lbl, val]) => (
                <button key={lbl} onClick={() => setLeap(val)} style={{
                  padding: '6px 18px', borderRadius: '20px',
                  border: leap === val ? '1.5px solid #8B6914' : '0.5px solid #e0ddd6',
                  background: leap === val ? '#8B6914' : '#fff',
                  color: leap === val ? '#fff' : '#888',
                  fontSize: '12px', cursor: 'pointer',
                }}>{lbl}</button>
              ))}
            </div>
          )}
          {/* 연도는 손 입력, 월·일은 드롭다운 (전 화면 통일 규칙) */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input value={year} onChange={e => applyYear(e.target.value)}
              inputMode="numeric" placeholder="1990"
              style={{ ...inputStyle, flex: 1.5, textAlign: 'center' as const }} />
            <span style={{ color: '#bbb', fontSize: '13px' }}>년</span>
            <select value={month} onChange={e => applyMonth(e.target.value)}
              style={{ ...selectStyle, flex: 1, color: month ? '#1a1a1a' : '#bbb' }}>
              <option value="">월</option>
              {MONTHS.map(m => <option key={m} value={String(m)}>{m}</option>)}
            </select>
            <span style={{ color: '#bbb', fontSize: '13px' }}>월</span>
            <select value={day} onChange={e => setDay(e.target.value)}
              style={{ ...selectStyle, flex: 1, color: day ? '#1a1a1a' : '#bbb' }}>
              <option value="">일</option>
              {dayOptions(parseInt(year, 10), parseInt(month, 10), calType)
                .map(d => <option key={d} value={String(d)}>{d}</option>)}
            </select>
            <span style={{ color: '#bbb', fontSize: '13px' }}>일</span>
          </div>
        </Field>

        {/* 태어난 시간 — 반드시 하나 고르게 한다 ('모름' 없음) */}
        <Field label="태어난 시간">
          <select value={hour} onChange={e => setHour(e.target.value)}
            style={{ ...selectStyle, color: hour ? '#1a1a1a' : '#bbb' }}>
            <option value="">시간을 선택해주세요</option>
            {visibleHours.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
          </select>

          {/* 시를 정확히 모르는 사람용 — 시간대를 고르면 3개로 좁혀진다 */}
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '6px' }}>
              시를 정확히 모르시나요? 대략 언제쯤인지 골라보세요
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              {TIME_BANDS.map(b => {
                const on = band?.key === b.key
                return (
                  <button key={b.key} type="button" onClick={() => pickBand(b)} style={{
                    flex: 1, padding: '9px 2px', borderRadius: '10px',
                    border: on ? '1.5px solid #1a1a1a' : '0.5px solid #e0ddd6',
                    background: on ? '#1a1a1a' : '#fff',
                    color: on ? '#fff' : '#888',
                    cursor: 'pointer', lineHeight: 1.35,
                  }}>
                    <div style={{ fontSize: '12px' }}>{b.label}</div>
                    <div style={{ fontSize: '9px', opacity: 0.75 }}>{b.range}</div>
                  </button>
                )
              })}
            </div>
            {band && (
              <div style={{ fontSize: '11px', color: '#8B6914', marginTop: '7px', lineHeight: 1.6 }}>
                {band.label} 시간대의 3개 중에서 골라주세요. 다시 누르면 전체가 보여요.
              </div>
            )}
            {hour !== '' && crossesMidnight(Number(hour)) && (
              <div style={{ fontSize: '11px', color: '#c0392b', marginTop: '7px', lineHeight: 1.6 }}>
                子시는 밤 11시 30분부터 다음 날 새벽 1시 30분까지예요.
                자정을 넘겨 태어나셨다면 생년월일을 다시 확인해주세요.
              </div>
            )}
          </div>
        </Field>

        {/* 태어난 도시 */}
        <div style={{ marginBottom: '26px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '8px' }}>
            태어난 도시 <span style={{ fontSize: '10px', color: '#8B6914' }}>일출·일몰 정밀 계산에 사용</span>
          </div>
          <input value={city} onChange={e => setCity(e.target.value)}
            placeholder="도시명을 입력하세요 (예: 서울)" style={inputStyle} />
        </div>

        {/* 소셜 구분선 */}
        <Divider text="간편하게 시작하기" />

        {/* 소셜 버튼 3개 (준비 중) */}
        <button onClick={() => handleSocial('카카오')} style={{
          width: '100%', height: '50px', background: '#FEE500', border: 'none',
          borderRadius: '14px', color: '#3C1E1E', fontSize: '14px', fontWeight: 600,
          cursor: 'pointer', marginBottom: '10px',
        }}>💬 카카오로 시작하기</button>
        <button onClick={() => handleSocial('네이버')} style={{
          width: '100%', height: '50px', background: '#03C75A', border: 'none',
          borderRadius: '14px', color: '#fff', fontSize: '14px', fontWeight: 600,
          cursor: 'pointer', marginBottom: '10px',
        }}>Ｎ 네이버로 시작하기</button>
        <button onClick={() => handleSocial('구글')} style={{
          width: '100%', height: '50px', background: '#fff', border: '0.5px solid #e0ddd6',
          borderRadius: '14px', color: '#333', fontSize: '14px', fontWeight: 500,
          cursor: 'pointer', marginBottom: '24px',
        }}>Ｇ 구글로 시작하기</button>

        {/* 이메일 구분선 */}
        <Divider text="또는 이메일로 가입" />

        {/* 이메일 가입폼 */}
        <Field label="이메일">
          <input value={email} onChange={e => setEmail(e.target.value)}
            type="email" placeholder="이메일 주소를 입력하세요" style={inputStyle} />
        </Field>
        <Field label="비밀번호">
          <input value={password} onChange={e => setPassword(e.target.value)}
            type="password" placeholder="6자 이상 입력하세요" style={inputStyle} />
        </Field>
        <Field label="비밀번호 확인">
          <input value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
            type="password" placeholder="비밀번호를 다시 입력하세요"
            style={{ ...inputStyle, borderColor: passwordConfirm && password !== passwordConfirm ? '#e24b4a' : '#e0ddd6' }} />
          {passwordConfirm && password !== passwordConfirm && (
            <div style={{ fontSize: '11px', color: '#e24b4a', marginTop: '6px' }}>비밀번호가 일치하지 않습니다</div>
          )}
        </Field>

        {/* 약관 */}
        <div onClick={() => setAgreed(!agreed)} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: '#fff', border: '0.5px solid #e8e5de',
          borderRadius: '14px', padding: '16px', marginBottom: '20px', cursor: 'pointer',
        }}>
          <div style={{
            width: '20px', height: '20px', borderRadius: '6px',
            border: agreed ? 'none' : '1.5px solid #e0ddd6',
            background: agreed ? '#1a1a1a' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>{agreed && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}</div>
          <span style={{ fontSize: '13px', color: '#333' }}>서비스 이용약관 및 개인정보처리방침 동의 (필수)</span>
        </div>

        {msg && (
          <div style={{ fontSize: '13px', color: '#e24b4a', textAlign: 'center', marginBottom: '12px', lineHeight: 1.6 }}>{msg}</div>
        )}

        <button onClick={handleSignup} disabled={loading} style={{
          width: '100%', height: '54px',
          background: loading ? '#e0ddd6' : '#1a1a1a',
          border: 'none', borderRadius: '14px',
          color: loading ? '#bbb' : '#fff',
          fontSize: '15px', fontWeight: 600,
          cursor: loading ? 'default' : 'pointer', marginBottom: '14px',
        }}>{loading ? '가입 처리 중…' : '회원가입 완료'}</button>

        <div style={{ textAlign: 'center', fontSize: '12px', color: '#bbb' }}>
          이미 계정이 있으신가요?{' '}
          <span onClick={() => router.push('/login')} style={{ color: '#8B6914', fontWeight: 600, cursor: 'pointer' }}>로그인</span>
        </div>
      </main>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '8px' }}>{label}</div>
      {children}
    </div>
  )
}

function Divider({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
      <div style={{ flex: 1, height: '0.5px', background: '#e8e5de' }} />
      <span style={{ fontSize: '11px', color: '#aaa' }}>{text}</span>
      <div style={{ flex: 1, height: '0.5px', background: '#e8e5de' }} />
    </div>
  )
}
