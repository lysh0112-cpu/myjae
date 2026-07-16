// ============================================================================
// 커플 채팅 방 데이터 헬퍼 (실시간 메시지 · 내 방 목록)
//   - couple_messages / couple_rooms / couple_members 사용
//   - 상담채팅(couple_chat_messages)과 무관한 독립 기능
// ============================================================================

import { supabase } from '@/lib/supabase'

export type CoupleMsg = {
  id: string
  room_id: string
  sender_id: string | null
  kind: 'user' | 'ai'
  message: string
  image_url?: string | null
  visibility: 'all' | 'private'
  created_at: string
}

export type CoupleRoomSummary = {
  roomId: string
  partnerName: string
  status: string
}

// 내가 속한 커플방 목록 (상대 닉네임 포함)
export async function listMyCoupleRooms(): Promise<CoupleRoomSummary[]> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return []

  // 내가 멤버인 방 id들
  const { data: mine } = await supabase
    .from('couple_members')
    .select('room_id')
    .eq('user_id', uid)
  const roomIds = (mine || []).map((m) => m.room_id)
  if (roomIds.length === 0) return []

  // 그 방들의 전체 멤버 (상대 찾기)
  const { data: members } = await supabase
    .from('couple_members')
    .select('room_id, user_id')
    .in('room_id', roomIds)

  // 방 상태
  const { data: rooms } = await supabase
    .from('couple_rooms')
    .select('id, status, created_at')
    .in('id', roomIds)
    .order('created_at', { ascending: false })

  // 상대 user_id 모으기
  const partnerIds = Array.from(
    new Set((members || []).filter((m) => m.user_id !== uid).map((m) => m.user_id)),
  )

  // 상대 닉네임
  const nameMap: Record<string, string> = {}
  if (partnerIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, nickname')
      .in('id', partnerIds)
    for (const p of profs || []) nameMap[p.id] = p.nickname || '상대'
  }

  return (rooms || []).map((r) => {
    const partner = (members || []).find((m) => m.room_id === r.id && m.user_id !== uid)
    return {
      roomId: r.id,
      partnerName: partner ? nameMap[partner.user_id] || '상대' : '연결 대기 중',
      status: r.status,
    }
  })
}

// 방의 메시지 로드 (내가 볼 수 있는 것: 전체공개 + 내가 보낸 비공개 AI조언)
export async function loadRoomMessages(roomId: string, myUid: string): Promise<CoupleMsg[]> {
  const { data } = await supabase
    .from('couple_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
  const all = (data || []) as CoupleMsg[]
  // 비공개(private)는 보낸 사람만
  return all.filter((m) => m.visibility === 'all' || m.sender_id === myUid)
}

// 메시지 보내기
export async function sendRoomMessage(
  roomId: string,
  myUid: string,
  text: string,
): Promise<void> {
  if (!text.trim()) return
  await supabase.from('couple_messages').insert({
    room_id: roomId,
    sender_id: myUid,
    kind: 'user',
    message: text,
    visibility: 'all',
  })
}

// 방에서 나가기 (나만 빠짐) — 내 멤버십만 삭제.
// 둘 다 나가서 아무도 안 남으면 방·메시지까지 정리(빈 방 방지).
export async function leaveCoupleRoom(roomId: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return false

  try {
    // 1) 내 멤버십 삭제
    const { error } = await supabase
      .from('couple_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', uid)
    if (error) throw error

    // 2) 남은 멤버 확인 — 아무도 없으면 방 통째로 정리(cascade로 메시지도 삭제)
    const { data: rest } = await supabase
      .from('couple_members')
      .select('id')
      .eq('room_id', roomId)
    if (!rest || rest.length === 0) {
      await supabase.from('couple_rooms').delete().eq('id', roomId)
    }
    return true
  } catch (e) {
    console.error('leaveCoupleRoom error', e)
    return false
  }
}
