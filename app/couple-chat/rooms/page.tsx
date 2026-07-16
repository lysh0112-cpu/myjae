'use client'

// ============================================================================
// 커플 채팅 방 목록 (내가 속한 커플방들)
//   - URL: /couple-chat/rooms
//   - 링크 보낸 나도 여기서 방을 골라 들어간다.
//   - 방이 없으면 "궁합 보고 초대하기" 안내
// ============================================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { listMyCoupleRooms, leaveCoupleRoom, type CoupleRoomSummary } from '@/lib/saju/coupleRoom'

const PEACH = '#FDF6F0'
const CARD = '#FFFBF7'
const BORDER = '0.5px solid #f0e0d5'
const BROWN = '#b46e46'
const TITLE = '#96502e'
const SUB = '#b4785a'

export default function CoupleRoomsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<CoupleRoomSummary[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth?.user?.id) {
        router.replace('/login')
        return
      }
      const list = await listMyCoupleRooms()
      if (!cancelled) {
        setRooms(list)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [router])

  async function handleLeave(roomId: string, partnerName: string) {
    if (!confirm(`${partnerName}님과의 채팅방에서 나갈까요?\n(내 목록에서 사라져요)`)) return
    const ok = await leaveCoupleRoom(roomId)
    if (ok) {
      setRooms((prev) => prev.filter((r) => r.roomId !== roomId))
    } else {
      alert('나가기에 실패했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: PEACH,
        maxWidth: 480,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          background: CARD,
          borderBottom: BORDER,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <button
          onClick={() => router.push('/home-new')}
          aria-label="홈"
          style={{ background: 'none', border: 'none', color: TITLE, fontSize: 20, cursor: 'pointer', padding: 0 }}
        >
          {'\u2039'}
        </button>
        <span style={{ fontSize: 14, fontWeight: 500, color: TITLE }}>커플 채팅</span>
      </div>

      <div style={{ flex: 1, padding: '16px 14px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: SUB, fontSize: 13, padding: '40px 0' }}>
            불러오는 중…
          </div>
        ) : rooms.length === 0 ? (
          <div
            style={{
              background: CARD,
              border: BORDER,
              borderRadius: 12,
              padding: '32px 20px',
              textAlign: 'center',
              marginTop: 20,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>💗</div>
            <div style={{ fontSize: 14, color: TITLE, fontWeight: 600, marginBottom: 6 }}>
              아직 커플 채팅방이 없어요
            </div>
            <div style={{ fontSize: 12, color: SUB, lineHeight: 1.7, marginBottom: 20 }}>
              연인 궁합을 보고
              <br />
              애인을 초대하면 채팅방이 열려요
            </div>
            <button
              onClick={() => router.push('/couple-chat/invite')}
              style={{ padding: '12px 26px', borderRadius: 10, background: BROWN, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              애인 초대하기
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rooms.map((r) => (
              <div
                key={r.roomId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  background: CARD,
                  border: BORDER,
                  borderRadius: 12,
                  padding: '14px 16px',
                }}
              >
                <button
                  onClick={() => router.push(`/couple-chat?room=${r.roomId}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: '#fbeaf0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    💑
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: TITLE }}>
                      {r.partnerName}님과의 채팅
                    </div>
                    <div style={{ fontSize: 11, color: SUB, marginTop: 2 }}>
                      {r.status === 'connected' ? '연결됨' : '상대 참여 대기 중'}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleLeave(r.roomId, r.partnerName)}
                  aria-label="나가기"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#c5a590',
                    fontSize: 12,
                    cursor: 'pointer',
                    padding: '6px 4px',
                    flexShrink: 0,
                  }}
                >
                  나가기
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
