'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ===== 설정값 (필요하면 여기 숫자만 바꾸면 됩니다) =====
const IDLE_LIMIT_MS = 2 * 60 * 60 * 1000  // 무동작 2시간 → 자동 로그아웃
const WARN_BEFORE_MS = 1 * 60 * 1000       // 로그아웃 1분 전 경고창
// =====================================================

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'

export default function AutoLogout() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showWarn, setShowWarn] = useState(false)
  const [remain, setRemain] = useState(60) // 경고창 남은 초

  // 타이머 보관용 (리렌더에도 값 유지)
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdown = useRef<ReturnType<typeof setInterval> | null>(null)

  // 로그아웃 실행 (BottomNav와 동일한 방식)
  const doLogout = useCallback(async () => {
    try { await supabase.auth.signOut() } catch {}
    // 공용기기 대비: 브라우저에 남는 모든 흔적(사주·작명·궁합·분석 등) 완전 삭제
    try {
      sessionStorage.clear()
      localStorage.clear()
    } catch {}
    // 홈을 통째로 새로 불러와 화면에 남은 정보까지 초기화
    window.location.href = '/'
  }, [])

  // 모든 타이머 정리
  const clearTimers = useCallback(() => {
    if (warnTimer.current) clearTimeout(warnTimer.current)
    if (logoutTimer.current) clearTimeout(logoutTimer.current)
    if (countdown.current) clearInterval(countdown.current)
    warnTimer.current = null
    logoutTimer.current = null
    countdown.current = null
  }, [])

  // 타이머 새로 시작 (활동 감지 때마다 호출 = 리셋)
  const startTimers = useCallback(() => {
    clearTimers()
    setShowWarn(false)

    // 경고창 띄울 시점 (무동작 시간 - 1분)
    warnTimer.current = setTimeout(() => {
      setRemain(Math.round(WARN_BEFORE_MS / 1000))
      setShowWarn(true)
      // 경고창 안에서 1초씩 카운트다운
      countdown.current = setInterval(() => {
        setRemain((s) => (s > 1 ? s - 1 : 0))
      }, 1000)
    }, IDLE_LIMIT_MS - WARN_BEFORE_MS)

    // 최종 로그아웃 시점
    logoutTimer.current = setTimeout(() => {
      doLogout()
    }, IDLE_LIMIT_MS)
  }, [clearTimers, doLogout])

  // 로그인 상태 감지
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user)
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  // 로그인 상태일 때만 활동 감지 + 타이머 작동
  useEffect(() => {
    if (!isLoggedIn) {
      clearTimers()
      setShowWarn(false)
      return
    }

    startTimers() // 처음 진입 시 시작

    // 사용자 활동 = 타이머 리셋 (단, 경고창이 떠 있을 땐 리셋 안 함 → 본인이 직접 선택)
    const onActivity = () => {
      if (!showWarn) startTimers()
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity))
      clearTimers()
    }
  }, [isLoggedIn, showWarn, startTimers, clearTimers])

  // 로그인 안 했거나 경고창 안 떠 있으면 아무것도 안 보임
  if (!isLoggedIn || !showWarn) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: '340px', background: CARD,
          border: `1px solid ${GOLD}`, borderRadius: '18px',
          padding: '24px 20px', textAlign: 'center',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: '15px', fontWeight: 700, color: GOLD, marginBottom: '10px' }}>
          곧 자동 로그아웃됩니다
        </div>
        <div style={{ fontSize: '13px', color: SUB, lineHeight: 1.7, marginBottom: '8px' }}>
          오랫동안 사용하지 않아<br />
          잠시 후 자동으로 로그아웃돼요.
        </div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '18px' }}>
          {remain}초
        </div>

        <button
          onClick={() => startTimers()}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px',
            background: 'rgba(250,199,117,0.16)', border: `1px solid ${GOLD}`,
            color: GOLD, fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            marginBottom: '10px',
          }}
        >
          계속 이용하기
        </button>
        <button
          onClick={() => doLogout()}
          style={{
            width: '100%', padding: '12px', borderRadius: '12px',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
            color: SUB, fontSize: '13px', cursor: 'pointer',
          }}
        >
          지금 로그아웃
        </button>
      </div>
    </div>
  )
}
