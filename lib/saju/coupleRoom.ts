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
): Promise<CoupleMsg | null> {
  if (!text.trim()) return null
  const { data } = await supabase.from('couple_messages').insert({
    room_id: roomId,
    sender_id: myUid,
    kind: 'user',
    message: text,
    visibility: 'all',
  }).select('*').maybeSingle()
  return (data as CoupleMsg) || null
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

// ── AI 조언 기능 (3단계: off / private(나에게만) / all(같이)) ──
export type AiMode = 'off' | 'private' | 'all'

// 방의 AI 모드 읽기
export async function getRoomAiMode(roomId: string): Promise<AiMode> {
  const { data } = await supabase
    .from('couple_rooms')
    .select('ai_on, ai_mode')
    .eq('id', roomId)
    .maybeSingle()
  if (!data?.ai_on) return 'off'
  return data.ai_mode === 'all' ? 'all' : 'private'
}

// 방의 AI 모드 설정
export async function setRoomAiMode(roomId: string, mode: AiMode): Promise<void> {
  await supabase
    .from('couple_rooms')
    .update({
      ai_on: mode !== 'off',
      ai_mode: mode === 'all' ? 'all' : 'private',
    })
    .eq('id', roomId)
}

// AI 조언 메시지 저장. mode='all'이면 바로 둘 다 보임, 'private'이면 나만 미리보기
export async function saveAiMessage(
  roomId: string,
  myUid: string,
  text: string,
  mode: AiMode,
): Promise<string | null> {
  const { data } = await supabase
    .from('couple_messages')
    .insert({
      room_id: roomId,
      sender_id: myUid,
      kind: 'ai',
      message: text,
      visibility: mode === 'all' ? 'all' : 'private',
    })
    .select('id')
    .maybeSingle()
  return data?.id || null
}

// AI 조언을 상대에게 공유 (private → all)
export async function shareAiMessage(messageId: string): Promise<void> {
  await supabase.from('couple_messages').update({ visibility: 'all' }).eq('id', messageId)
}

// AI 조언 숨기기 (내 미리보기 삭제)
export async function deleteAiMessage(messageId: string): Promise<void> {
  await supabase.from('couple_messages').delete().eq('id', messageId)
}

// 방의 궁합 정보(compat_data) 읽기 — AI 조언에 사용
export async function getRoomCompat(roomId: string): Promise<any | null> {
  const { data } = await supabase
    .from('couple_rooms')
    .select('compat_data')
    .eq('id', roomId)
    .maybeSingle()
  return data?.compat_data || null
}

// 방에서 상대방(나 아닌 멤버) 닉네임 가져오기 — 채팅방 말풍선 표시용
export async function getPartnerName(roomId: string, myUid: string): Promise<string> {
  const { data: members } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('room_id', roomId)
  const partner = (members || []).find((m) => m.user_id !== myUid)
  if (!partner) return '상대'
  const { data: prof } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('id', partner.user_id)
    .maybeSingle()
  return prof?.nickname || '상대'
}
