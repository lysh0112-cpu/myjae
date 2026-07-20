'use client'

// ============================================================================
// 받은 커플채팅 초대 알림 (앱 켜놓은 상태)
//   - 내게 온 pending 초대를 감지 → 진동/소리 + 수락 카드
//   - 실시간 구독으로 초대가 오면 바로 뜸
//   - 홈·마이페이지에 넣어 사용
// ============================================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getMyPendingInvites, acceptInvite, type PendingInvite } from '@/lib/saju/memberInvite'
import { withNim } from '@/lib/saju/honorific'

// 짧은 알림음 (웹 오디오로 생성 — 파일 없이)
function playDing() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1180, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
    osc.start(); osc.stop(ctx.currentTime + 0.42)
  } catch { /* 무시 */ }
}

function buzz() {
  try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]) } catch { /* 무시 */ }
}

export default function InviteNotifier() {
  const router = useRouter()
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [myUid, setMyUid] = useState('')

  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth?.user?.id
      if (!uid) return
      if (cancelled) return
      setMyUid(uid)

      // 처음 로드 시 이미 온 초대 확인
      const pending = await getMyPendingInvites()
      if (!cancelled && pending.length > 0) {
        setInvites(pending)
      }

      // 실시간: 내게 새 초대(invitee_id=나)가 들어오면 알림
      channel = supabase
        .channel(`invite-notify-${uid}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'couple_rooms', filter: `invitee_id=eq.${uid}` },
          async () => {
            const list = await getMyPendingInvites()
            if (!cancelled && list.length > 0) {
              setInvites(list)
              buzz(); playDing()
            }
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'couple_rooms', filter: `invitee_id=eq.${uid}` },
          async () => {
            const list = await getMyPendingInvites()
            if (!cancelled && list.length > 0) {
              setInvites(list)
              buzz(); playDing()
            }
          },
        )
        .subscribe()
    }

    init()
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  if (invites.length === 0) return null
  const invite = invites[0] // 하나씩 처리

  async function handleAccept() {
    const ok = await acceptInvite(invite.roomId)
    if (ok) {
      router.push(`/couple-chat?room=${invite.roomId}`)
    } else {
      alert('수락에 실패했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  function handleLater() {
    setInvites((prev) => prev.slice(1)) // 이 초대는 일단 닫음 (나중에 다시 뜸)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(60,40,30,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 24,
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 320, background: '#fff',
          borderRadius: 16, padding: '24px 20px', textAlign: 'center',
          boxShadow: '0 6px 24px rgba(124,90,170,0.3)',
        }}
      >
        <div style={{ fontSize: 34, marginBottom: 10 }}>💌</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#3a2e28', marginBottom: 4 }}>
          {withNim(invite.inviterName)}이 초대했어요
        </div>
        <div style={{ fontSize: 12.5, color: '#7c5aaa', marginBottom: 18, lineHeight: 1.6 }}>
          둘만의 커플 채팅방으로 💕
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleAccept}
            style={{ flex: 1, padding: 12, borderRadius: 9, background: '#7c5aaa', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            예, 수락
          </button>
          <button
            onClick={handleLater}
            style={{ padding: '12px 18px', borderRadius: 9, background: '#fff', color: '#7c5aaa', border: '0.5px solid #d5c5e5', fontSize: 14, cursor: 'pointer' }}
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  )
}
