'use client'

// ============================================================================
// AI 상담 플로팅 버튼 (홈 우하단)
// ----------------------------------------------------------------------------
//   - 누르면 내 사주를 들고 AI 대화 화면(/manseryeok/ai-talk)으로 간다
//   - 사주가 등록돼 있으면 person1 파라미터로 넘겨 바로 내 사주 기준 대화 시작
//     (마이페이지 "AI 물어보기" 버튼이 쓰던 방식 그대로 — 07-19 이관)
//   - 비회원이면 로그인으로, 사주 미등록이면 마이페이지로 안내
//
// 위치·크기·그림자는 검증된 CoupleChatFab 패턴을 그대로 씀. 새 발명 없음.
// ============================================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type FabProfile = {
  birth_year: number | null
  birth_month: number | null
  birth_day: number | null
  birth_hour: string | null
  gender: string | null
  saju_saved: boolean | null
}

export default function AiTalkFab() {
  const router = useRouter()
  const [profile, setProfile] = useState<FabProfile | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) { if (!cancelled) setIsLoggedIn(false); return }
      if (cancelled) return
      setIsLoggedIn(true)

      const { data: p } = await supabase.from('profiles')
        .select('birth_year, birth_month, birth_day, birth_hour, gender, saju_saved')
        .eq('id', u.user.id)
        .maybeSingle()
      if (!cancelled && p) setProfile(p as FabProfile)
    })()
    return () => { cancelled = true }
  }, [])

  function go() {
    if (!isLoggedIn) { router.push('/login'); return }
    if (!profile?.birth_year) {
      alert('먼저 내 사주를 등록해 주세요.')
      router.push('/mypage-new')
      return
    }
    const p1 = encodeURIComponent(JSON.stringify({
      year: profile.birth_year,
      month: profile.birth_month,
      day: profile.birth_day,
      hour: profile.birth_hour ?? '0',
      gender: profile.gender || '남',
    }))
    router.push(`/manseryeok/ai-talk?person1=${p1}`)
  }

  // 로그인 확인 전에는 안 그린다 (깜빡임 방지)
  if (isLoggedIn === null) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        height: 0,
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      <button
        onClick={go}
        aria-label="AI 상담"
        style={{
          position: 'absolute',
          right: 18,
          bottom: 84,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#c8783c',
          border: '2.5px solid #fff',
          boxShadow: '0 2px 10px rgba(200,120,60,0.40)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          pointerEvents: 'auto',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
      >
        <span style={{ fontSize: 19, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '0.5px' }}>AI</span>
        <span style={{ fontSize: 11, color: '#fae0cf', marginTop: 2, lineHeight: 1 }}>상담</span>
      </button>
    </div>
  )
}
