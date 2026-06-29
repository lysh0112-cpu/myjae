'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function WelcomePage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [nickname, setNickname] = useState('')
  const [agreeRequired, setAgreeRequired] = useState(false) // 필수: 개인정보+이용약관
  const [agreeMarketing, setAgreeMarketing] = useState(false) // 선택: 마케팅
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  // 로그인 안 돼 있으면 로그인 화면으로
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth/login'); return }
      setUserId(data.user.id)
      // 기존 프로필 있으면 닉네임 미리 채움
      supabase.from('profiles').select('nickname').eq('id', data.user.id).single()
        .then(({ data: p }) => { if (p?.nickname) setNickname(p.nickname) })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async () => {
    if (!userId) return
    if (!nickname.trim()) { setMsg('닉네임을 입력해주세요.'); return }
    if (!agreeRequired) { setMsg('필수 약관에 동의해주세요.'); return }

    setLoading(true)
    const now = new Date().toISOString()
    // 프로필 생성 또는 갱신 (역할은 기본 customer, 기존 값 있으면 유지)
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      nickname: nickname.trim(),
      privacy_agreed: true,
      privacy_agreed_at: now,
      terms_agreed: true,
      marketing_agreed: agreeMarketing,
    }, { onConflict: 'id' })
    setLoading(false)

    if (error) { setMsg('저장 실패: ' + error.message); return }

    // 역할 확인 후 분기
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
    if (profile?.role === 'consultant' || profile?.role === 'master') {
      router.push('/manseryeok/consultant')
    } else {
      router.push('/')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 460, background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#FAC775', marginBottom: 6 }}>명연재에 오신 걸 환영합니다</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>닉네임을 정하고 약관에 동의해주세요 (최초 1회)</div>
        </div>

        {/* 닉네임 */}
        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 6 }}>닉네임</label>
        <input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={20}
          placeholder="명연재에서 사용할 이름"
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 15, outline: 'none', marginBottom: 20 }} />

        {/* 약관 동의 */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={agreeRequired} onChange={e => setAgreeRequired(e.target.checked)} style={{ marginTop: 3 }} />
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 600 }}>
              <span style={{ color: '#FAC775' }}>[필수]</span> 개인정보 수집·이용 및 이용약관에 동의합니다
            </span>
          </label>

          {/* 동의 내용 박스 */}
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
