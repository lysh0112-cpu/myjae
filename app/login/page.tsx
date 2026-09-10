'use client'

import { useState } from 'react'
/* ★2026-09-10 — 머리 로고를 넣으려고 더했습니다 (public/logo-myjae.png) */
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [keepLogin, setKeepLogin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 로그인 후 이동: 프로필 미완료면 마이페이지(내 사주 수정), 아니면 신버전 홈
  //   ★ 2026-07: 예전에는 미완료 시 /auth/welcome(구버전 다크 화면)으로 보냈는데,
  //     피치톤 로그인에서 갑자기 어두운 화면으로 떨어져 흐름이 끊겼다.
  //     고객 화면은 전부 피치톤이어야 하므로(인수인계서 3부) 연결을 끊고
  //     마이페이지로 보낸다. 거기서 닉네임·사주를 수정할 수 있다.
  //     (/auth/* 폴더는 상담사 화면들이 아직 쓰므로 삭제하지 않고 남겨 둠)
  /* ★2026-09-08 — 로그인 뒤 ★«왔던 자리» 로 돌려보냅니다.
   *   [겪은 일]  골프온·큐보드에서 /wallet?from=glf 로 넘어온 손님이
   *     로그인을 안 했으면 로그인 화면으로 보내는데,
   *     로그인하고 나면 ★명카페 마이페이지에 «떨어졌습니다». 골프온으로 못 돌아갔습니다.
   *   ⇒ /login?next=/wallet%3Ffrom%3Dglf  처럼 «갈 곳» 을 받아 그리로 보냅니다.
   *
   *   ⛔⛔ ★«/» 로 시작하는 «우리 집 주소» 만 받습니다.
   *       http://… 를 그대로 받으면 ★남의 사이트로 손님을 보낼 수 있습니다
   *       (열린 넘기기 · open redirect). 「//」로 시작하는 것도 막습니다.
   *   ⚠️ Next.js 의 «주소 읽기 훅» 을 ★쓰지 않고, 그때그때 주소창을 직접 읽습니다.
   *      ⇒ Suspense 로 감쌀 일이 없어 빌드가 안 깨집니다.
   *      ⛔ 그 훅으로 바꾸지 마십시오 — 바꾸면 ★Suspense 로 감싸야 합니다
   *        (검사 ⑯-l 이 지킵니다. 낱말을 «글자로» 찾으니 주석에도 쓰지 마십시오).
   */
  const nextPath = (): string | null => {
    if (typeof window === 'undefined') return null
    const raw = new URLSearchParams(window.location.search).get('next')
    if (!raw) return null
    if (!raw.startsWith('/') || raw.startsWith('//')) return null
    return raw
  }

  const routeAfterLogin = async (userId: string) => {
    const back = nextPath()
    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname, privacy_agreed')
      .eq('id', userId)
      .single()

    if (!profile || !profile.nickname || !profile.privacy_agreed) {
      // ⚠️ 프로필이 덜 찬 분은 ★마이페이지가 먼저입니다. next 보다 앞섭니다.
      router.push('/mypage-new')
      return
    }

    if (back) { router.push(back); return }
    // ★2026-07-27 — 커플채팅 초대 링크(?invite=) 자동연결을 제거했다.
    //   커플채팅이 테스트였으므로 통째로 삭제되었고, 연결할 방이 사라졌다.
    //   ?invite= 가 붙은 옛 링크로 들어와도 그냥 홈으로 간다(오류 없음).
    //   ⚠️ 상담사–고객 채팅은 별개이며 살아 있다. 함께 지우지 말 것.

    // 등급과 무관하게 신버전 홈으로. 상담사·관리자 화면은 마이페이지에서 진입.
    router.push('/home-new')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !pw) { setError('이메일과 비밀번호를 입력해주세요.'); return }
    if (!email.includes('@')) { setError('올바른 이메일 형식을 입력해주세요.'); return }
    setError('')
    setLoading(true)
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (authError || !data.user) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }
    await routeAfterLogin(data.user.id)
  }

  /* ★2026-09-09 — 카카오 로그인을 «실제로» 잇습니다.
   *   [전]  단추는 «있었는데» 「준비 중이에요」 라고 말만 했습니다 (handleSocial).
   *   [후]  supabase 가 카카오로 보내고, 돌아올 때 ★/auth/callback 이 받습니다.
   *
   *   ⚠️ /auth/callback 은 ★58부 이전부터 «이미» 있습니다. 새로 만들지 않았습니다.
   *   ⚠️ 첫 로그인이면 profiles 줄이 «없어» callback 이 ★/auth/welcome 으로 보냅니다.
   *      ⛔ 그 길을 막지 마십시오 — ★카카오 길입니다 (3부 10-2).
   *
   *   ⛔⛔ ★redirectTo 를 다른 주소로 바꾸지 마십시오 —
   *      카카오 콘솔의 Redirect URI · Supabase Callback URL 과 ★한 벌입니다.
   *      한 곳만 바꾸면 로그인이 통째로 막히는데, ★까닭을 안 알려 줍니다.
   *
   *   ⚠️ ★next(왔던 자리)를 카카오 길에도 «실어» 보냅니다 (2026-09-10) —
   *      redirectTo 에 ?next= 를 붙이면 callback 이 받아 welcome 으로 넘깁니다.
   *      ⇒ /wallet?from=glf 로 오신 분이 카카오로 들어와도 ★그리로 돌아갑니다.
   *      ⛔ nextPath() 를 거치지 «않고» 주소창 값을 그대로 싣지 마십시오 —
   *         「//」·http:// 를 그대로 실으면 ★남의 사이트로 손님을 보냅니다.
   */
  const [social, setSocial] = useState(false)

  const handleKakao = async () => {
    setError('')
    setSocial(true)
    // ★next 는 «걸러진 것» 만 싣습니다 (nextPath 가 「/」로 시작하는 것만 돌려줍니다)
    const back = nextPath()
    const cb = `${window.location.origin}/auth/callback`
      + (back ? `?next=${encodeURIComponent(back)}` : '')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: cb },
    })
    // ⚠️ 잘 되면 «카카오 화면으로 떠나» 아래 줄까지 못 옵니다.
    //    여기 닿았다는 것은 ★출발조차 못 했다는 뜻입니다. 조용히 넘기지 않습니다.
    if (oauthError) {
      setError('카카오 로그인을 시작하지 못했어요. 잠시 뒤 다시 해보시거나 이메일로 로그인해주세요.')
      setSocial(false)
    }
  }

  const inputWrap: React.CSSProperties = {
    height: 50, background: '#fff', border: '0.5px solid #9c7a58', borderRadius: 12,
    display: 'flex', alignItems: 'center', padding: '0 14px',
  }
  const inputStyle: React.CSSProperties = {
    flex: 1, border: 'none', outline: 'none', background: 'transparent',
    fontSize: 14, color: '#3a2e28', minWidth: 0,
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#FDF6F0', maxWidth: 430, margin: '0 auto',
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif", color: '#3a2e28',
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
      {/* 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '14px 18px',
        background: '#FFFBF7', borderBottom: '0.5px solid #9c7a58',
      }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#5c3a1e', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>←</button>
      </div>

      <div style={{ padding: '36px 24px 24px' }}>

        {/* ★2026-09-10 — 커피잔 + MyungCafe 를 ★새 로고 + 「명연재(明然載)」 로.
            홈 머리(app/home-new/page.tsx)와 «같은 모양» 입니다.
            ⛔ 옛 커피잔으로 되돌리지 마십시오 — 손님이 두 이름을 보게 됩니다. */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <Image src="/logo-myjae.png" alt="명연재" width={30} height={30} priority />
            <span style={{ display: 'flex', alignItems: 'flex-end', gap: 5 }}>
              <span style={{ fontSize: 20, fontWeight: 600, color: '#38414B', letterSpacing: 2, lineHeight: 1 }}>명연재</span>
              <span style={{ fontSize: 11, color: '#68112E', lineHeight: 1 }}>(明然載)</span>
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#5c3a1e' }}>다시 오신 걸 환영해요 ✦</div>
        </div>

        {/* ★2026-09-10 — 카카오를 «맨 위» 로 올렸습니다 [대표님 목업 승낙]
            [까닭] 큐보드·골프온이 «카카오 먼저» 인데 명연재만 이메일이 먼저라
                   손님이 세 앱을 오가며 ★다른 앱처럼 느꼈습니다.
            ⚠️ 색은 ★명연재 피치톤 그대로입니다. 두 앱의 남색을 가져오지 «않았습니다».
               ⇒ 짜임과 문구만 맞추고 ★색은 각 앱 것을 지킵니다 [대표님 2026-09-10].
            ⛔ 노랑 #FEE500 은 ★카카오가 정한 색입니다. 바꾸지 마십시오. */}
        <button onClick={handleKakao} disabled={social}
          style={{
            width: '100%', height: 52, background: '#FEE500', border: 'none', borderRadius: 14,
            color: '#3C1E1E', fontSize: 15, fontWeight: 600,
            cursor: social ? 'default' : 'pointer', opacity: social ? 0.6 : 1, marginBottom: 9,
          }}>
          {social ? '카카오로 넘어가는 중…' : '카카오로 3초 만에 시작'}
        </button>

        {/* ⚠️ 「자기를 뺀 둘」을 적습니다 — 큐보드·골프온도 «같은 규칙» 입니다.
            ⛔ 앱이 늘거나 줄면 ★세 앱을 함께 고치십시오. */}
        <div style={{ fontSize: 11.5, color: '#6b5340', lineHeight: 1.6, marginBottom: 20 }}>
          큐보드 · 골프온과 같은 계정입니다. 한 번 로그인하면 세 곳에서 그대로 쓰입니다.
        </div>

        {/* 가르는 줄 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, height: '0.5px', background: '#e8d5c5' }} />
          <span style={{ fontSize: 11, color: '#6b5340' }}>또는 이메일로</span>
          <div style={{ flex: 1, height: '0.5px', background: '#e8d5c5' }} />
        </div>

        <form onSubmit={handleLogin}>
          {/* 이메일 */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#5c3a1e', marginBottom: 6 }}>이메일</div>
            <div style={inputWrap}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com" style={inputStyle} autoComplete="email" />
            </div>
          </div>

          {/* 비밀번호 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#5c3a1e', marginBottom: 6 }}>비밀번호</div>
            <div style={inputWrap}>
              <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)}
                placeholder="비밀번호 입력" style={inputStyle} autoComplete="current-password" />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ background: 'none', border: 'none', color: '#6b5340', cursor: 'pointer', fontSize: 15 }}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* 로그인 유지 / 비번찾기 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5c3a1e', cursor: 'pointer' }}>
              <input type="checkbox" checked={keepLogin} onChange={e => setKeepLogin(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: '#b46e46' }} />
              로그인 유지
            </label>
            <button type="button" style={{ background: 'none', border: 'none', fontSize: 12, color: '#5c3a1e', cursor: 'pointer' }}>비밀번호 찾기</button>
          </div>

          {error && <div style={{ color: '#c05a5a', fontSize: 12, marginBottom: 14, textAlign: 'center' }}>{error}</div>}

          {/* 로그인 버튼 */}
          <button type="submit" disabled={loading}
            style={{
              width: '100%', height: 52, background: '#b46e46', border: 'none', borderRadius: 14,
              color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              marginBottom: 22, opacity: loading ? 0.6 : 1,
            }}>
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>

        {/* ★네이버·구글은 «내렸습니다» [대표님 2026-09-09] — ⛔ 지우지 않았습니다.
              [까닭] 네이버는 Supabase 가 «지원하지 않습니다» (목록에 없음).
                     구글은 Supabase 에서 Enabled 로 «켜져» 있는데 앱을 만든 적이 없어,
                     ★손님이 누르면 반쯤 되다 말고 «다른 계정» 으로 잡힐 수 있습니다.
                     ⇒ 그러면 그 사람의 지갑·보관함이 «갈라집니다». 되돌리기 어렵습니다.
              ⇒ 붙이실 때는 이 주석을 풀고 handleSocial 을 그 갈래로 이으십시오.
        <button onClick={() => handleSocial('네이버')}
          style={{ width: '100%', height: 50, background: '#03C75A', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>Ｎ 네이버로 로그인</button>
        <button onClick={() => handleSocial('구글')}
          style={{ width: '100%', height: 50, background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: 14, color: '#333', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 8 }}>Ｇ 구글로 로그인</button>
        <div style={{ textAlign: 'center', fontSize: 10, color: '#6b5340', marginBottom: 26 }}>소셜 로그인은 준비 중이에요</div>
        */}

        {/* 회원가입 링크 */}
        <div style={{ textAlign: 'center', fontSize: 13, color: '#6f6053', paddingTop: 18, borderTop: '0.5px solid #9c7a58' }}>
          아직 회원이 아니신가요?{' '}
          <button type="button" onClick={() => router.push('/signup')} style={{ color: '#8f3d0e', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>회원가입</button>
        </div>

      </div>
    </div>
  )
}
