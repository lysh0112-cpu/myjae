'use client'

// ══════════════════════════════════════════════════════════════════
//  app/auth/welcome/page.tsx — 처음 오신 분에게 «한 번만» 뜨는 화면
//
//  ★2026-09-10 — 두 가지를 고쳤습니다 [대표님]
//
//   ① ★어두운 화면 → «피치톤»
//      [까닭] 손님 화면은 ★전부 피치톤(#FDF6F0)입니다.
//        45부(2026-07)가 「피치톤 로그인에서 갑자기 어두운 화면으로 떨어져
//        흐름이 끊겼다」고 적고 /login 쪽 연결을 끊었는데,
//        ★카카오 길에는 그대로 남아 있었습니다. 이제 여기도 피치톤입니다.
//      ⛔ 어두운 색(#1a1a18 · #2C2C2A)으로 되돌리지 마십시오.
//
//   ② ★사주는 «모든 손님에게 선택» 입니다  [대표님 2026-09-10 «밤»]
//      [처음]  지갑 쓰러 오신 분(from=bil·glf)에게만 선택, 명카페로 곧장 오신 분은 필수.
//              「명카페는 사주가 본체라 홈이 사주 카드로 시작합니다.
//                ⛔ 명카페 쪽 필수를 풀지 마십시오」 [대표님 2026-09-10 «낮»]
//      [바뀜]  ★같은 날 밤에 대표님이 «뒤집으셨습니다» —
//              「회원가입은 모두 통일하고, 명연재 정보 입력을 따로 가져가자」
//        ⇒ 가입은 ★계정만 만들고, 사주는 ★«쓸 때» 받습니다.
//        ⇒ 세 앱(명연재·큐보드·골프온)의 가입 길이 «같아집니다».
//
//      ⚠️ 사주를 안 넣으신 분은 홈 카드가 데려옵니다 —
//         ★「생년월일시를 넣으면 오늘의 운세를 볼 수 있어요 →」 → 마이페이지
//         (app/manseryeok/components/UserCard.tsx)
//         ⛔ 그 줄을 지우면 ★손님이 사주를 넣을 길이 «없어집니다».
//
//      ⚠️ from=bil · glf 는 ★여전히 살아 있습니다 — 사주 접힘 «말고도»
//         「큐보드 지갑으로 가기」 단추와 돌아가는 길을 정합니다. ⛔ 빼지 마십시오.
//
//  ⚠️ ★from 낱말(bil · glf · myc)을 바꾸지 마십시오 —
//     mc_ledger.service 와 짝이고 ★세 창이 함께 지키기로 한 것입니다 (3부 8-5).
//
//  ⚠️ 주소 읽기 훅을 «안 쓰고» 그때그때 주소창을 직접 읽습니다 (/login 과 같은 방식).
//     ⛔ 그 훅으로 바꾸지 마십시오 — 바꾸면 ★Suspense 로 감싸야 하고 빌드가 깨집니다.
//     ⚠️ 그 낱말은 ★주석에도 쓰지 마십시오. 검사가 «글자로» 찾습니다 (2부 1-6).
// ══════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { HOURS, HOUR_INDEX } from '@/lib/saju/myInfo'
import { safeNextPath } from '@/lib/safeNext'

export default function WelcomePage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [nickname, setNickname] = useState('')
  /** ★카카오가 준 이메일 — profiles 에 «옮겨 담습니다» (아래 base 참조) */
  const [kakaoEmail, setKakaoEmail] = useState<string | null>(null)

  // ── 사주 입력 상태 ──
  const [gender, setGender] = useState<'남' | '여'>('남')
  const [calType, setCalType] = useState<'양력' | '음력'>('양력')
  const [leap, setLeap] = useState(false)          // 윤달 여부 (음력일 때만)
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [birthHour, setBirthHour] = useState('')   // HOURS 중 하나(라벨)

  const [agreeRequired, setAgreeRequired] = useState(false)
  /* ★2026-09-10 — 만 14세 확인 [대표님 판단]
   *   ⚠️ 카카오는 생일·연령대를 «주지 않습니다» (동의항목 「권한 없음」).
   *      그래서 나이를 알 길이 없어 ★스스로 확인하는 줄을 둡니다.
   *   ⛔ 이 줄을 빼지 마십시오 — 약관 제5조가 「가입 시 확인합니다」라고 적고 있습니다.
   *   ⛔ signup 화면에도 «같은 줄» 이 있습니다. 한쪽만 고치면 뚫린 문이 남습니다. */
  const [agreeAge, setAgreeAge] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  /* ★어디서 오셨는가 — 「/」로 시작하는 «우리 집 주소» 만 받습니다.
   *   ⛔ 「//」·http:// 를 그대로 받으면 ★남의 사이트로 손님을 보냅니다 (열린 넘기기).
   *      /login 의 nextPath() · callback 의 safeNext 와 ★같은 규칙입니다.
   *
   *   ⛔⛔ ★useEffect 안에서 setState 로 담지 마십시오 —
   *      «그릴 때» 견줍니다 (58부·1부·2부가 세 번 적어 둔 자리).
   *      ⚠️ 서버에는 주소창이 «없어» typeof 로 먼저 막습니다.
   */
  const rawNext = typeof window === 'undefined'
    ? null
    : new URLSearchParams(window.location.search).get('next')
  /* ★2026-09-11 (6부) — 규칙은 lib/safeNext.ts «한 곳» 입니다 (검사 ㉒-q).
   *   ⚠️ 여기가 「/\evil」 이 «실제로» 새던 자리였습니다 — router.push 가 남의 사이트로 갔습니다. */
  const backTo = safeNextPath(rawNext)
  const fromApp: 'bil' | 'glf' | null =
    backTo?.includes('from=bil') ? 'bil'
    : backTo?.includes('from=glf') ? 'glf'
    : null

  /* 🔴 ★2026-09-10 (밤) — 사주를 ★«모든 손님에게 선택» 으로 바꿨습니다.
   *
   *   [전]  sajuRequired = fromApp === null
   *         ⇒ 명카페로 곧장 오신 분에게는 ★«필수» 였습니다.
   *         ⇒ 위 15~21줄 주석이 「⛔ 명카페 쪽 필수를 풀지 마십시오」라 적어 둔 자리입니다.
   *
   *   [후]  ★언제나 선택입니다.  [대표님 2026-09-10 밤 — «앞서 하신 지시를 뒤집으심»]
   *         ⇒ 가입은 ★계정만 만들고, 「나에 대한 정보」는 따로 받습니다.
   *         ⇒ 세 앱의 가입 길이 «같아집니다».
   *
   *   [사주를 안 넣으신 분은 어떻게 되나]
   *      홈 카드가 ★「생년월일시를 넣으면 오늘의 운세를 볼 수 있어요 →」라 말하고,
   *      누르면 ★마이페이지로 갑니다 (UserCard.tsx · 대표님 지시).
   *      ⛔ 그 줄이 ★손님을 데려오는 «유일한 길» 입니다. 지우지 마십시오.
   *
   *   ⚠️ 위 15~21줄의 옛 주석은 ★이제 틀린 말입니다. 함께 읽지 마십시오. */
  const sajuRequired = false
  const [sajuOpen, setSajuOpen] = useState(false)
  const showSaju = sajuRequired || sajuOpen

  const appName = fromApp === 'bil' ? '큐보드' : fromApp === 'glf' ? '골프온' : null

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserId(data.user.id)
      /* ★2026-09-10 — 카카오가 준 것을 «미리 채워» 둡니다.
       *   ⚠️ 카카오는 ★nickname 칸을 «안 줍니다» — 값으로 잰 칸 열하나에 없었습니다.
       *      이름값은 name · full_name · user_name · preferred_username 에 옵니다.
       *   ⇒ 손님이 그대로 두시면 카카오 이름이, 고치시면 고친 이름이 담깁니다.
       *   ⛔ 이 자리를 «닉네임 칸만» 보게 좁히지 마십시오 (list-users 와 같은 결).
       */
      const meta = data.user.user_metadata ?? {}
      setKakaoEmail(data.user.email ?? null)
      const metaName =
        (meta.nickname as string | undefined) ||
        (meta.name as string | undefined) ||
        (meta.full_name as string | undefined) ||
        (meta.user_name as string | undefined) ||
        (meta.preferred_username as string | undefined) ||
        ''
      supabase.from('profiles').select('nickname').eq('id', data.user.id).maybeSingle()
        .then(({ data: p }) => { setNickname(p?.nickname || metaName) })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async () => {
    if (!userId) return
    if (!nickname.trim()) { setMsg('닉네임을 입력해주세요.'); return }

    const y = parseInt(birthYear, 10)
    const m = parseInt(birthMonth, 10)
    const d = parseInt(birthDay, 10)

    /* ★사주를 «넣으셨는가» — 한 칸이라도 채우셨으면 «다» 채우셔야 합니다.
     *   ⚠️ 반쯤 넣고 넘어가면 ★쓸 수 없는 사주가 남습니다.
     */
    const sajuTouched = !!(birthYear || birthMonth || birthDay || birthHour)

    if (sajuRequired || sajuTouched) {
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
    }
    if (!agreeRequired) { setMsg('필수 약관에 동의해주세요.'); return }
    if (!agreeAge) { setMsg('만 14세 이상만 가입하실 수 있어요.'); return }

    const now = new Date().toISOString()

    /* ⚠️ ★사주를 «안 넣으신» 분은 그 칸을 아예 담지 않습니다.
     *   ⛔ 0 이나 빈 값을 넣지 마십시오 — 「1900년생」 같은 헛 사주가 생깁니다.
     */
    const base = {
      id: userId,
      nickname: nickname.trim(),
      /* 🔴 ★2026-09-10 — 이메일을 profiles 에 «담습니다».
       *   [겪은 일]  auth.users 에는 이메일이 «있는데» profiles.email 이 ★NULL 이었습니다.
       *      옮겨 담는 자리가 «없었습니다». 그래서 회원 관리에서 사람을 못 가렸습니다.
       *   ⚠️ 값이 «없으면» 담지 않습니다 — 빈 글자로 덮어쓰면 있던 것이 지워집니다.
       */
      ...(kakaoEmail ? { email: kakaoEmail } : {}),
      privacy_agreed: true,
      privacy_agreed_at: now,
      terms_agreed: true,
      marketing_agreed: agreeMarketing,
    }
    const sajuPart = (sajuRequired || sajuTouched)
      ? {
          birth_year: y,
          birth_month: m,
          birth_day: d,
          // 시주를 홈 화면과 «같은» 모양으로: 인덱스(0~11) 글자 또는 '모름'
          birth_hour: birthHour === '모름' ? '모름' : String(HOUR_INDEX[birthHour]),
          cal_type: calType,
          gender: gender,
          leap_month: calType === '음력' && leap,   // 윤달은 음력일 때만 뜻이 있습니다
          saju_saved: true,
        }
      : {}

    setLoading(true)
    const { error } = await supabase.from('profiles')
      .upsert({ ...base, ...sajuPart }, { onConflict: 'id' })
    setLoading(false)

    if (error) { setMsg('저장 실패: ' + error.message); return }

    // ★왔던 자리가 있으면 «그리로» 돌려보냅니다 (큐보드·골프온의 지갑 화면)
    if (backTo) { router.push(backTo); return }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
    if (profile?.role === 'consultant' || profile?.role === 'master') {
      router.push('/manseryeok/consultant')
    } else {
      router.push('/')
    }
  }

  // 숫자만 남기는 도우미
  const onlyNum = (v: string, maxLen: number) => v.replace(/[^0-9]/g, '').slice(0, maxLen)

  // ── 피치톤 색 (홈·로그인 화면과 «같은» 색입니다. ⛔ 새 색을 짓지 마십시오) ──
  const INK = '#3a2e28'
  const INK_SOFT = '#6b5340'
  const ACCENT = '#8f3d0e'
  const LINE = '#9c7a58'
  const LINE_SOFT = '#e8d5c5'

  const segBtn = (on: boolean): React.CSSProperties => ({
    flex: 1, padding: '9px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    border: 'none', background: on ? '#96502e' : '#fff',
    color: on ? '#fff' : INK_SOFT, transition: 'all 0.15s',
  })

  const numInput: React.CSSProperties = {
    flex: 1, minWidth: 0, padding: '11px 8px', borderRadius: 10, textAlign: 'center',
    border: `0.5px solid ${LINE}`, background: '#fff',
    color: INK, fontSize: 15, outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FDF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 460, background: '#FFFBF7', border: `0.5px solid ${LINE}`, borderRadius: 20, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: ACCENT, marginBottom: 6 }}>명연재에 오신 걸 환영합니다</div>
          <div style={{ color: INK_SOFT, fontSize: 13 }}>
            {appName
              ? `닉네임만 정하시면 바로 지갑으로 가요`
              : '닉네임과 내 사주를 등록해주세요 (최초 1회)'}
          </div>
        </div>

        {/* 닉네임 */}
        <label style={{ display: 'block', color: INK_SOFT, fontSize: 13, marginBottom: 6 }}>닉네임</label>
        <input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={20}
          placeholder="명연재에서 사용할 이름"
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `0.5px solid ${LINE}`, background: '#fff', color: INK, fontSize: 15, outline: 'none', marginBottom: 20, boxSizing: 'border-box' }} />

        {/* ── 내 사주 정보 ── */}
        <div style={{ background: '#fff', border: `0.5px solid ${LINE_SOFT}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          {sajuRequired ? (
            <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT, marginBottom: 14 }}>✦ 내 사주 정보</div>
          ) : (
            <button onClick={() => setSajuOpen(v => !v)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>
                ✦ 내 사주 정보 <span style={{ color: INK_SOFT, fontWeight: 400 }}>(선택)</span>
              </span>
              <span style={{ fontSize: 12, color: '#96502e' }}>{sajuOpen ? '접기 ▴' : '펼치기 ▾'}</span>
            </button>
          )}

          {!sajuRequired && !sajuOpen && (
            <div style={{ fontSize: 12, color: INK_SOFT, lineHeight: 1.7, marginTop: 8 }}>
              사주·작명 서비스를 쓰실 때 넣으셔도 돼요. 지금은 건너뛰셔도 됩니다.
            </div>
          )}

          {showSaju && (
            <div style={{ marginTop: sajuRequired ? 0 : 14 }}>
              {/* 성별 / 달력 */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: INK_SOFT, marginBottom: 6 }}>성별</div>
                  <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: `0.5px solid ${LINE_SOFT}` }}>
                    <button onClick={() => setGender('남')} style={segBtn(gender === '남')}>남</button>
                    <button onClick={() => setGender('여')} style={segBtn(gender === '여')}>여</button>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: INK_SOFT, marginBottom: 6 }}>달력</div>
                  <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: `0.5px solid ${LINE_SOFT}` }}>
                    <button onClick={() => setCalType('양력')} style={segBtn(calType === '양력')}>양력</button>
                    <button onClick={() => setCalType('음력')} style={segBtn(calType === '음력')}>음력</button>
                  </div>
                </div>
              </div>

              {/* 윤달 — 음력일 때만 보입니다 */}
              {calType === '음력' && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: INK_SOFT, marginBottom: 6 }}>
                    윤달 여부 <span style={{ color: '#8a7a6a' }}>(음력 생일이 윤달이면 선택)</span>
                  </div>
                  <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: `0.5px solid ${LINE_SOFT}` }}>
                    <button onClick={() => setLeap(false)} style={segBtn(leap === false)}>평달</button>
                    <button onClick={() => setLeap(true)} style={segBtn(leap === true)}>윤달</button>
                  </div>
                </div>
              )}

              {/* 생년월일 — 직접 입력 */}
              <div style={{ fontSize: 12, color: INK_SOFT, marginBottom: 6 }}>생년월일 (숫자로 직접 입력)</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 14 }}>
                <input value={birthYear} onChange={e => setBirthYear(onlyNum(e.target.value, 4))}
                  inputMode="numeric" placeholder="1990" style={{ ...numInput, flex: 1.5 }} />
                <span style={{ fontSize: 13, color: INK_SOFT }}>년</span>
                <input value={birthMonth} onChange={e => setBirthMonth(onlyNum(e.target.value, 2))}
                  inputMode="numeric" placeholder="5" style={numInput} />
                <span style={{ fontSize: 13, color: INK_SOFT }}>월</span>
                <input value={birthDay} onChange={e => setBirthDay(onlyNum(e.target.value, 2))}
                  inputMode="numeric" placeholder="12" style={numInput} />
                <span style={{ fontSize: 13, color: INK_SOFT }}>일</span>
              </div>

              {/* 시주 */}
              <div style={{ fontSize: 12, color: INK_SOFT, marginBottom: 6 }}>태어난 시 (시주)</div>
              <select value={birthHour} onChange={e => setBirthHour(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `0.5px solid ${LINE}`, background: '#fff', color: birthHour ? INK : '#8a7a6a', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                <option value="">시간 선택 (모르면 &quot;모름&quot;)</option>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* 약관 */}
        <div style={{ background: '#fff', border: `0.5px solid ${LINE_SOFT}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={agreeRequired} onChange={e => setAgreeRequired(e.target.checked)} style={{ marginTop: 3 }} />
            <span style={{ color: INK, fontSize: 14, fontWeight: 600 }}>
              {/* ★2026-09-10 — 「약관」이라 써 놓고 갈 화면이 없던 것을 «이었습니다».
                  ⛔ 링크를 빼지 마십시오 — 동의를 받으려면 볼 수 있어야 합니다.
                  ⚠️ 체크박스 안에서 눌리면 체크가 토글되므로 ★stopPropagation 이 필요합니다. */}
              <span style={{ color: ACCENT }}>[필수]</span>{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer"
                 onClick={e => e.stopPropagation()}
                 style={{ color: INK, textDecoration: 'underline' }}>개인정보 수집·이용</a>
              {' 및 '}
              <a href="/terms" target="_blank" rel="noopener noreferrer"
                 onClick={e => e.stopPropagation()}
                 style={{ color: INK, textDecoration: 'underline' }}>이용약관</a>
              에 동의합니다
            </span>
          </label>

          <div style={{ background: '#FDF6F0', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: INK_SOFT, lineHeight: 1.7, maxHeight: 180, overflowY: 'auto', marginBottom: 12 }}>
            {/* ★2026-09-10 — 카카오 콘솔 동의항목·개인정보처리방침과 «낱말을 맞췄습니다».
                ⛔ 카카오 심사가 이 자리를 봅니다. 콘솔에서 동의항목을 바꾸시면
                   ★여기와 개인정보처리방침 제2조를 «함께» 고치십시오. */}
            <b style={{ color: INK }}>· 수집 항목</b><br />
            [카카오] 회원번호, 닉네임, 카카오계정(이메일) / 프로필 사진(선택)<br />
            [직접 입력] 생년월일·출생시간·성별(사주 분석용)<br />
            [이용 중 생성] 상담·결제 내역<br /><br />
            <b style={{ color: INK }}>· 이용 목적</b><br />
            사주·작명·궁합 등 명리 분석 서비스 제공, AI 분석 및 전문가 상담 연결, 결제·정산 처리<br /><br />
            <b style={{ color: INK }}>· 보유 기간</b><br />
            회원 탈퇴 시까지. 관련 법령에 따라 일정 기간 보관될 수 있습니다.<br /><br />
            <b style={{ color: INK }}>· AI 분석 안내</b><br />
            입력하신 사주 정보는 AI 분석에 활용되며, 분석 결과는 참고용입니다.<br /><br />
            동의를 거부할 수 있으나, 거부 시 서비스 이용이 제한됩니다.
          </div>

          {/* ★만 14세 확인 — ⛔ 빼지 마십시오 (약관 제5조가 이 줄을 근거로 삼습니다) */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={agreeAge} onChange={e => setAgreeAge(e.target.checked)} />
            <span style={{ color: INK, fontSize: 14, fontWeight: 600 }}>
              <span style={{ color: ACCENT }}>[필수]</span> 만 14세 이상입니다
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={agreeMarketing} onChange={e => setAgreeMarketing(e.target.checked)} />
            <span style={{ color: INK_SOFT, fontSize: 13 }}>
              [선택] 이벤트·혜택 등 마케팅 정보 수신에 동의합니다
            </span>
          </label>
        </div>

        {msg && <div style={{ color: '#c05a5a', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{msg}</div>}

        <button onClick={submit} disabled={loading}
          style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', background: '#96502e', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? '저장 중…' : appName ? `동의하고 ${appName} 지갑으로 가기` : '동의하고 시작하기'}
        </button>
      </div>
    </div>
  )
}
