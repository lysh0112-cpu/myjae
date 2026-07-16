'use client'

// ============================================================================
// 커플 채팅 플로팅 버튼 (홈·마이페이지·궁합결과 우하단에 뜸)
//   - 누르면 내 커플방 목록으로 (/couple-chat/rooms)
//   - 로그인 안 됐거나 방 없으면 안 보이게 (깔끔하게)
// ============================================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { listMyCoupleRooms } from '@/lib/saju/coupleRoom'

export default function CoupleChatFab() {
  const router = useRouter()
  const [show, setShow] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth?.user?.id) return
      const rooms = await listMyCoupleRooms()
      if (!cancelled && rooms.length > 0) setShow(true)
    }
    check()
    return () => { cancelled = true }
  }, [])

  if (!show) return null

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
        onClick={() => router.push('/couple-chat/rooms')}
        aria-label="커플 채팅"
        style={{
          position: 'absolute',
          right: 18,
          bottom: 84,
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: '#d4537e',
          border: 'none',
          boxShadow: '0 2px 10px rgba(212,83,126,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
      >
        💗
      </button>
    </div>
  )
}
