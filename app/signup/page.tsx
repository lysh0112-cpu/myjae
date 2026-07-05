'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const HOURS = [
  '모름',
  '子시 (23:00~01:00)', '丑시 (01:00~03:00)', '寅시 (03:00~05:00)',
  '卯시 (05:00~07:00)', '辰시 (07:00~09:00)', '巳시 (09:00~11:00)',
  '午시 (11:00~13:00)', '未시 (13:00~15:00)', '申시 (15:00~17:00)',
  '酉시 (17:00~19:00)', '戌시 (19:00~21:00)', '亥시 (21:00~23:00)',
]

export default function SignupPage() {
  const router = useRouter()

  const [step, setStep] = useState<1 | 2>(1)

  // Step 1 — 사주 정보
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'여자' | '남자' | ''>('')
  const [calType, setCalType] = useState<'양력' | '음력'>('양력')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [hour, setHour] = useState('')
  const [city, setCity] = useState('')

  // Step 2 — 계정 정보
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [agreed, setAgreed] = useState(false)

  const onlyNum = (v: string, len: number) => v.replace(/[^0-9]/g, '').slice(0, len)

  const step1Valid = name && gender && year.length === 4 && month && day && hour

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF8',
      maxWidth: '430px',
      margin: '0 auto',
      fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
      color: '#1a1a1a',
    }}>

      {/* 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '14px 18px',
        borderBottom: '0.5px solid #f0ede6',
        background: '#FAFAF8',
        position: 'sticky', top: 0, zIndex: 10,
        gap: '12px',
      }}>
        <button
          onClick={() => step === 2 ? setStep(1) : router.back()}
          style={{ background: 'none', border: 'none', color: '#999', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: 0 }}
        >←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}>
            {step === 1 ? '내 사주 입력' : '계정 만들기'}
          </div>
        </div>
        {/* 스텝 인디케이터 */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div style={{
            width: '20px', height: '4px', borderRadius: '2px',
            background: '#1a1a1a',
          }} />
          <div style={{
            width: '20px', height: '4px', borderRadius: '2px',
            background: step === 2 ? '#1a1a1a' : '#e0ddd6',
          }} />
        </div>
      </div>

      <main style={{ padding: '28px 20px 120px' }}>

        {step === 1 ? (
          <>
            {/* ── STEP 1: 사주 정보 ── */}
            <div style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.4, margin: '0 0 6px' }}>
                나의 사주를<br />알려주세요
              </p>
              <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>
                정확한 분석을 위해 생년월일과 태어난 곳이 필요해요
              </p>
            </div>

            <div style={{ height: '24px' }} />

            {/* 이름 */}
            <Field label="이름">
              <input
                value={name}
                onChange={e => setName(e.target.value.slice(0, 12))}
                placeholder="최대 12글자 이내로 입력하세요"
                style={inputStyle}
              />
            </Field>

            {/* 성별 */}
            <Field label="성별">
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['여자', '남자'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    style={{
                      flex: 1, height: '46px', borderRadius: '12px',
                      border: gender === g ? '1.5px solid #1a1a1a' : '0.5px solid #e0ddd6',
                      background: gender === g ? '#1a1a1a' : '#fff',
                      color: gender === g ? '#fff' : '#888',
                      fontSize: '14px', fontWeight: gender === g ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >{g}</button>
                ))}
              </div>
            </Field>

            {/* 생년월일 */}
            <Field label="생년월일">
              {/* 양력/음력 */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                {(['양력', '음력'] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => setCalType(c)}
                    style={{
                      padding: '6px 18px', borderRadius: '20px',
                      border: calType === c ? '1.5px solid #1a1a1a' : '0.5px solid #e0ddd6',
                      background: calType === c ? '#1a1a1a' : '#fff',
                      color: calType === c ? '#fff' : '#888',
                      fontSize: '12px', cursor: 'pointer',
                    }}
                  >{c}</button>
                ))}
              </div>
              {/* 날짜 입력 */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  value={year} onChange={e => setYear(onlyNum(e.target.value, 4))}
                  inputMode="numeric" placeholder="1990"
                  style={{ ...inputStyle, flex: 1.5, textAlign: 'center' as const }}
                />
                <span style={{ color: '#bbb', fontSize: '13px' }}>년</span>
                <input
                  value={month} onChange={e => setMonth(onlyNum(e.target.value, 2))}
                  inputMode="numeric" placeholder="01"
                  style={{ ...inputStyle, flex: 1, textAlign: 'center' as const }}
                />
                <span style={{ color: '#bbb', fontSize: '13px' }}>월</span>
                <input
                  value={day} onChange={e => setDay(onlyNum(e.target.value, 2))}
                  inputMode="numeric" placeholder="01"
                  style={{ ...inputStyle, flex: 1, textAlign: 'center' as const }}
                />
                <span style={{ color: '#bbb', fontSize: '13px' }}>일</span>
              </div>
            </Field>

            {/* 태어난 시간 */}
            <Field label="태어난 시간">
              <select
                value={hour}
                onChange={e => setHour(e.target.value)}
                style={{
                  ...inputStyle,
                  color: hour ? '#1a1a1a' : '#bbb',
                  appearance: 'none' as const,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23bbb' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  paddingRight: '36px',
                }}
              >
                <option value="">시간을 선택해주세요</option>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </Field>

            {/* 태어난 도시 */}
            <Field label={<>태어난 도시 <span style={{ fontSize: '10px', color: '#8B6914', fontWeight: 500 }}>일출·일몰 정밀 계산에 사용</span></>}>
              <div style={{ position: 'relative' as const }}>
                <input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="도시명을 입력하세요 (예: 서울)"
                  style={{ ...inputStyle, paddingRight: '42px' }}
                />
                <span style={{
                  position: 'absolute' as const, right: '14px', top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '16px', color: '#bbb',
                }}>🔍</span>
              </div>
            </Field>

            {/* 다음 버튼 */}
            <button
              onClick={() => step1Valid && setStep(2)}
              style={{
                width: '100%', height: '52px',
                background: step1Valid ? '#1a1a1a' : '#e0ddd6',
                border: 'none', borderRadius: '14px',
                color: step1Valid ? '#fff' : '#bbb',
                fontSize: '15px', fontWeight: 600,
                cursor: step1Valid ? 'pointer' : 'default',
                marginTop: '8px',
                transition: 'background 0.2s',
              }}
            >
              다음 →
            </button>

            {/* 로그인 링크 */}
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#bbb' }}>
              이미 계정이 있으신가요?{' '}
              <span
                onClick={() => router.push('/auth/login')}
                style={{ color: '#8B6914', fontWeight: 600, cursor: 'pointer' }}
              >로그인</span>
            </div>
          </>
        ) : (
          <>
            {/* ── STEP 2: 계정 정보 ── */}
            <div style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.4, margin: '0 0 6px' }}>
                계정을 만들어<br />내 사주를 저장하세요
              </p>
              <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>
                다음부터 로그인만 하면 바로 확인할 수 있어요
              </p>
            </div>

            <div style={{ height: '24px' }} />

            {/* 소셜 로그인 */}
            <div style={{ marginBottom: '20px' }}>
              <button style={{
                width: '100%', height: '50px',
                background: '#FEE500', border: 'none', borderRadius: '14px',
                color: '#3C1E1E', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', marginBottom: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
                <span style={{ fontSize: '18px' }}>💬</span> 카카오로 시작하기
              </button>
              <button style={{
                width: '100%', height: '50px',
                background: '#fff', border: '0.5px solid #e0ddd6',
                borderRadius: '14px',
                color: '#333', fontSize: '14px', fontWeight: 500,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
                <span style={{ fontSize: '18px' }}>G</span> 구글로 시작하기
              </button>
            </div>

            {/* OR 구분선 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '0.5px', background: '#e8e5de' }} />
              <span style={{ fontSize: '11px', color: '#ccc' }}>또는 이메일로 가입</span>
              <div style={{ flex: 1, height: '0.5px', background: '#e8e5de' }} />
            </div>

            {/* 이메일 */}
            <Field label="이메일">
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                placeholder="이메일 주소를 입력하세요"
                style={inputStyle}
              />
            </Field>

            {/* 비밀번호 */}
            <Field label="비밀번호">
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                placeholder="8자 이상 입력하세요"
                style={inputStyle}
              />
            </Field>

            {/* 비밀번호 확인 */}
            <Field label="비밀번호 확인">
              <input
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                style={{
                  ...inputStyle,
                  borderColor: passwordConfirm && password !== passwordConfirm ? '#e24b4a' : undefined,
                }}
              />
              {passwordConfirm && password !== passwordConfirm && (
                <div style={{ fontSize: '11px', color: '#e24b4a', marginTop: '6px' }}>
                  비밀번호가 일치하지 않습니다
                </div>
              )}
            </Field>

            {/* 약관 동의 */}
            <div style={{
              background: '#fff', border: '0.5px solid #e8e5de',
              borderRadius: '14px', padding: '16px',
              marginBottom: '20px',
            }}>
              <div
                onClick={() => setAgreed(!agreed)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '6px',
                  border: agreed ? 'none' : '1.5px solid #e0ddd6',
                  background: agreed ? '#1a1a1a' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {agreed && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
                </div>
                <span style={{ fontSize: '13px', color: '#333' }}>서비스 이용약관 및 개인정보처리방침 동의 (필수)</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px', paddingLeft: '30px' }}>
                <span style={{ fontSize: '11px', color: '#8B6914', textDecoration: 'underline', cursor: 'pointer' }}>이용약관</span>
                <span style={{ fontSize: '11px', color: '#8B6914', textDecoration: 'underline', cursor: 'pointer' }}>개인정보처리방침</span>
              </div>
            </div>

            {/* 가입 완료 버튼 */}
            <button
              style={{
                width: '100%', height: '52px',
                background: email && password && password === passwordConfirm && agreed ? '#1a1a1a' : '#e0ddd6',
                border: 'none', borderRadius: '14px',
                color: email && password && password === passwordConfirm && agreed ? '#fff' : '#bbb',
                fontSize: '15px', fontWeight: 600,
                cursor: email && password && password === passwordConfirm && agreed ? 'pointer' : 'default',
                marginBottom: '12px',
              }}
            >
              회원가입 완료
            </button>

            <div style={{ textAlign: 'center', fontSize: '12px', color: '#bbb' }}>
              이미 계정이 있으신가요?{' '}
              <span
                onClick={() => router.push('/auth/login')}
                style={{ color: '#8B6914', fontWeight: 600, cursor: 'pointer' }}
              >로그인</span>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

/* ── 공통 컴포넌트 ── */

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '48px',
  padding: '0 14px',
  border: '0.5px solid #e0ddd6',
  borderRadius: '12px',
  background: '#fff',
  color: '#1a1a1a',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {label}
      </div>
      {children}
    </div>
  )
}
