'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// 30분(분 단위로 바꾸려면 아래 숫자만 수정)
const TIMEOUT_MS = 30 * 60 * 1000

export default function AutoLogout() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function doLogout() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.auth.signOut()
      try { sessionStorage.clear() } catch {}
      window.location.href = '/'
    }

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(doLogout, TIMEOUT_MS)
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((e) => window.addEventListener(e, resetTimer))
    resetTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach((e) => window.removeEventListener(e, resetTimer))
    }
  }, [])

  return null
}
