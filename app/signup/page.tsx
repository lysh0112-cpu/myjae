'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// 시(時) 목록 — 공용 birthInput.ts 기준 (30분법 · 공백없음).
//   ★ '모름'은 두지 않는다. 시를 반드시 입력받는다(대표님 확정 2026-07).
//     정확히 모르는 사람은 아래 시간대 버튼으로 3개까지 좁혀서 고른다.


const inputStyle: React.CSSProperties = {
  width: '100%', height: '48px', padding: '0 14px',
  border: '0.5px solid #e0ddd6', borderRadius: '12px',
  background: '#fff', color: '#1a1a1a', fontSize: '14px',
  outline: 'none', boxSizing: 'border-box',
}

// 드롭다운 공통 (기본 화살표 숨기고 직접 그림)

export default function SignupPage() {
  const router = useRouter()

  // 사주 정보
  const [nickname, setNickname] = useState('')

  // 계정 정보
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [agreed, setAgreed] = useState(false)
  /* ★2026-09-10 — 만 14세 확인 [대표님 판단]
   *   ⛔ 빼지 마십시오 — 약관 제5조가 「가입 시 확인합니다」라고 적고 있습니다.
   *   ⛔ app/auth/welcome/page.tsx 에도 «같은 줄» 이 있습니다. 두 곳을 함께 고치십시오. */
  const [agreedAge, setAgreedAge] = useState(false)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')


  // 연/월이 바뀌면 이미 고른 '일'이 범위를 벗어날 수 있다 (3/31 → 2월).

  // 시간대를 고르면 그 안의 3개 시진만 목록에 남긴다.
  // 시간대를 고르면 그 안의 3개만. band.hours 순서를 그대로 따른다
  //   (밤 = 戌·亥·子 순. 인덱스 오름차순으로 뽑으면 子가 앞으로 와서 어색함)

  // 소셜 로그인 (아직 준비 중)
  /* 🔴 ★2026-09-10 (밤) — 「준비 중입니다」라고만 하던 handleSocial 을
   *   ★«진짜로 도는» 카카오 가입으로 갈아 끼웠습니다.
   *   ⚠️ app/login/page.tsx 의 handleKakao 와 «같은 방식» 입니다.
   *      ⛔ 한쪽만 고치지 마십시오 — 둘이 어긋나면 한쪽에서만 로그인이 됩니다.
   *   ⚠️ 카카오로 오시면 ★/auth/callback → /auth/welcome 으로 가서
   *      닉네임·약관·만 14세를 받습니다. ⇒ ★이 화면의 긴 칸들은 «안 봅니다». */
  const [social, setSocial] = useState(false)
  const handleKakao = async () => {
    setMsg('')
    setSocial(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    /* ⚠️ 잘 되면 «카카오 화면으로 떠나» 아래 줄까지 못 옵니다.
       여기 닿았다는 것은 ★출발조차 못 했다는 뜻입니다. 조용히 넘기지 않습니다. */
    if (error) {
      setMsg('카카오 가입을 시작하지 못했어요. 잠시 뒤 다시 해보시거나 이메일로 가입해주세요.')
      setSocial(false)
    }
  }

  // 회원가입 실행
  const handleSignup = async () => {
    setMsg('')
    /* 🔴 ★2026-09-10 (밤) — 가입은 ★«계정만» 만듭니다.
     *   [대표님] 「회원가입은 모두 통일하고, 명연재 정보 입력을 따로 가져가자」
     *            「접어두지 말고 ★완전 분리를 하고」
     *   ⇒ 사주는 ★마이페이지 «한 곳» 에서만 받습니다.
     *   ⛔ 여기에 사주 저장을 «다시» 넣지 마십시오 — 두 곳이 되면 어긋납니다. */
    if (!nickname) { setMsg('닉네임을 입력해주세요.'); return }
    if (!email || !email.includes('@')) { setMsg('올바른 이메일을 입력해주세요.'); return }
    if (password.length < 6) { setMsg('비밀번호는 6자 이상으로 입력해주세요.'); return }
    if (password !== passwordConfirm) { setMsg('비밀번호가 일치하지 않습니다.'); return }
    if (!agreed) { setMsg('필수 약관에 동의해주세요.'); return }
    if (!agreedAge) { setMsg('만 14세 이상만 가입하실 수 있습니다.'); return }

    setLoading(true)

    // 1) 계정 생성
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { nickname } },
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

    // 2) profiles 저장 — ★닉네임·이메일·동의 «만»
    const now = new Date().toISOString()
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      nickname,
      email,
      /* ⚠️ 사주 칸은 ★건드리지 «않습니다». 마이페이지에서 넣으면 그때 찹니다.
         ⛔ 0 이나 빈 문자열을 넣지 마십시오 — 풀이 쪽이 «있는 값» 으로 읽습니다.
         ★saju_saved 가 홈 카드의 갈림길입니다 (UserCard:157) —
           false 면 「생년월일시를 넣으면…」이 뜨고 마이페이지로 데려갑니다. */
      saju_saved: false,
      privacy_agreed: true,
      privacy_agreed_at: now,
      terms_agreed: true,
      marketing_agreed: false,
    }, { onConflict: 'id' })

    setLoading(false)
    if (profileError) {
      setMsg('계정은 생성됐지만 정보 저장에 실패했습니다: ' + profileError.message)
      return
    }

    /* ★홈으로 보냅니다. 홈 카드가 「생년월일시를 넣으면…」이라 데려갑니다.
       ⛔ 만세력 결과로 보내지 마십시오 — 사주가 없어 ★빈 원국표가 뜹니다. */
    router.push('/')
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {/* ★2026-09-10 — 커피잔 + MyungCafe 를 ★새 로고 + 「명연재(明然載)」 로.
              홈·로그인 화면과 «같은 모양» 입니다. ⛔ 옛 커피잔으로 되돌리지 마십시오. */}
          <Image src="/logo-myjae.png" alt="명연재" width={26} height={26} priority />
          <span style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: 17, fontWeight: 600, color: '#38414B', letterSpacing: 2, lineHeight: 1 }}>명연재</span>
            <span style={{ fontSize: 10, color: '#68112E', lineHeight: 1 }}>(明然載)</span>
          </span>
        </div>
      </div>

      <main style={{ padding: '26px 20px 60px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.4, margin: '0 0 6px' }}>
            계정을 만들어주세요
          </h1>
          <p style={{ fontSize: '12px', color: '#6b5340', margin: 0 }}>
            {/* ★2026-09-10 (밤) — 옛말을 고쳤습니다.
                [전] 「가입 한 번으로 ★내 사주를 영구 저장해요」
                     ⇒ 이제 가입할 때 ★사주를 «안 받습니다». 사실과 달랐습니다. */}
            한 번 가입하면 명연재 · 큐보드 · 골프온에서 그대로 쓰입니다
          </p>
        </div>

        {/* ★2026-09-10 (밤) — 카카오를 «맨 위» 로 [대표님 목업 승낙]
            ⚠️ 손님 대부분은 카카오로 오십니다. 긴 칸을 먼저 보면 «나가 버립니다».
            ⛔ 아래 이메일 가입 칸보다 «뒤» 로 내리지 마십시오. */}
        <button onClick={handleKakao} disabled={social}
          style={{
            width: '100%', height: '52px', background: '#FEE500', border: 'none',
            borderRadius: '14px', color: '#3C1E1E', fontSize: '15px', fontWeight: 600,
            cursor: social ? 'default' : 'pointer', opacity: social ? 0.6 : 1, marginBottom: '9px',
          }}>
          {social ? '카카오로 넘어가는 중…' : '카카오톡으로 회원가입'}
        </button>
        <div style={{ fontSize: '11.5px', color: '#6b5340', lineHeight: 1.6, marginBottom: '8px' }}>
          큐보드 · 골프온과 같은 계정입니다. 한 번 가입하면 세 곳에서 그대로 쓰입니다.
        </div>
        <div style={{
          background: '#FFFBF7', border: '0.5px solid #e8dccf', borderRadius: '10px',
          padding: '9px 11px', fontSize: '11px', color: '#8a7565', lineHeight: 1.6, marginBottom: '22px',
        }}>
          3초면 끝나요. 이름과 사주는 나중에 넣으셔도 됩니다.
        </div>

        {/* 가르는 줄 — /login 과 «같은 말» 입니다 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '0.5px', background: '#e8d5c5' }} />
          <span style={{ fontSize: '11px', color: '#6b5340' }}>또는 이메일로</span>
          <div style={{ flex: 1, height: '0.5px', background: '#e8d5c5' }} />
        </div>

        {/* 🔴 ★2026-09-10 (밤) — 사주 칸 여섯을 ★«통째로 뺐습니다».
            [대표님] 「너무 복잡해 보이지 않아? 내가 손님이라도 질리겠는데」
                     「접어두지 말고 ★완전 분리를 하고」

            [뺀 것]  이름(한글) · 이름(한자) · 성별 · 생년월일 · 태어난 시간 · 태어난 도시
            [남긴 것] ★닉네임 «하나» — 손님을 부를 이름이라 꼭 있어야 합니다.

            [사주는 어디서 넣나]
              ★마이페이지 «한 곳» 입니다 (app/mypage-new/page.tsx · ⚙️ 계정 설정).
              홈 카드가 「생년월일시를 넣으면 오늘의 운세를 볼 수 있어요 →」로 데려갑니다.
              ⇒ 넣는 자리가 ★하나가 되었습니다. 전에는 여기와 마이페이지 «둘» 이었습니다.
              ⛔ 여기에 사주 칸을 «다시» 만들지 마십시오 — 두 곳이 되면 반드시 어긋납니다.
                 (로그인 화면이 셋이던 것과 «같은 문제» 입니다)

            ⚠️ 세 앱 가입 화면이 ★같은 짜임이 되었습니다 —
               카카오 맨 위 · 「같은 계정입니다」 · 「또는 이메일로」 · 넉 칸.
               ⛔ 색만 각자 것입니다. 명연재는 피치톤. */}
        <Field label="닉네임">
          <input value={nickname} onChange={e => setNickname(e.target.value.slice(0, 12))}
            placeholder="서비스에서 사용할 이름" style={inputStyle} />
        </Field>

        {/* 이메일 구분선 */}
        

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
          {/* ★2026-09-10 — 갈 화면이 없던 「약관」을 «이었습니다».
              ⚠️ 바깥 div 에 onClick 토글이 있어 ★stopPropagation 이 필요합니다. */}
          <span style={{ fontSize: '13px', color: '#333' }}>
            <a href="/terms" target="_blank" rel="noopener noreferrer"
               onClick={e => e.stopPropagation()}
               style={{ color: '#333', textDecoration: 'underline' }}>서비스 이용약관</a>
            {' 및 '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer"
               onClick={e => e.stopPropagation()}
               style={{ color: '#333', textDecoration: 'underline' }}>개인정보처리방침</a>
            {' 동의 (필수)'}
          </span>
        </div>

        {/* ★만 14세 확인 — ⛔ 빼지 마십시오 (약관 제5조가 이 줄을 근거로 삼습니다) */}
        <div onClick={() => setAgreedAge(!agreedAge)} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: '#fff', border: '0.5px solid #e8e5de',
          borderRadius: '14px', padding: '16px', marginBottom: '20px', cursor: 'pointer',
        }}>
          <div style={{
            width: '20px', height: '20px', borderRadius: '6px',
            border: agreedAge ? 'none' : '1.5px solid #e0ddd6',
            background: agreedAge ? '#1a1a1a' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>{agreedAge && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}</div>
          <span style={{ fontSize: '13px', color: '#333' }}>만 14세 이상입니다 (필수)</span>
        </div>

        {msg && (
          <div style={{ fontSize: '13px', color: '#e24b4a', textAlign: 'center', marginBottom: '12px', lineHeight: 1.6 }}>{msg}</div>
        )}

        <button onClick={handleSignup} disabled={loading} style={{
          width: '100%', height: '54px',
          /* ★2026-09-10 (밤) — 검정(#1a1a1a) → ★피치톤 갈색.
             ⇒ 로그인 화면의 [로그인]과 «같은 값» 입니다 (#b46e46).
             ⛔ 명연재에 검정 단추는 없습니다. 되돌리지 마십시오. */
          background: loading ? '#e0ddd6' : '#b46e46',
          border: 'none', borderRadius: '14px',
          color: loading ? '#bbb' : '#fff',
          fontSize: '15px', fontWeight: 600,
          cursor: loading ? 'default' : 'pointer', marginBottom: '14px',
        }}>{loading ? '가입 처리 중…' : '회원가입 완료'}</button>

        <div style={{ textAlign: 'center', fontSize: '12px', color: '#6b5340' }}>
          이미 계정이 있으신가요?{' '}
          <button type="button" onClick={() => router.push('/login')} style={{ color: '#8B6914', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>로그인</button>
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
