// ============================================================================
// 커플 채팅 초대 연결 헬퍼
//   - 초대 링크(/signup?invite={token})로 가입한 사람을 그 방에 자동 연결한다.
//   - signup 화면을 최소한만 건드리도록 연결 로직을 여기로 분리.
//   - 상담채팅과 무관한 독립 기능.
// ============================================================================

import { supabase } from '@/lib/supabase'

// 초대 링크의 토큰으로 방·초대자 정보를 미리 본다 (초대장 화면 표시용).
export async function getInviteInfo(
  token: string | null,
): Promise<{ ok: true; roomId: string; inviterName: string } | { ok: false }> {
  if (!token) return { ok: false }
  try {
    const { data: room } = await supabase
      .from('couple_rooms')
      .select('id, inviter_id')
      .eq('invite_token', token)
      .maybeSingle()
    if (!room?.id) return { ok: false }

    let inviterName = '상대'
    const { data: prof } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', room.inviter_id)
      .maybeSingle()
    if (prof?.nickname) inviterName = prof.nickname

    return { ok: true, roomId: room.id, inviterName }
  } catch {
    return { ok: false }
  }
}

export type JoinResult =
  | { ok: true; roomId: string }
  | { ok: false; reason: 'no_token' | 'not_found' | 'self' | 'error' }

// 초대 토큰으로 가입자(userId)를 그 커플방에 멤버(invitee)로 넣는다.
// 성공하면 roomId 반환 → 호출부에서 채팅방으로 이동.
export async function joinCoupleByInvite(
  token: string | null,
  userId: string | null | undefined,
): Promise<JoinResult> {
  if (!token) return { ok: false, reason: 'no_token' }
  if (!userId) return { ok: false, reason: 'error' }

  try {
    // 1) 토큰으로 방 찾기
    const { data: room } = await supabase
      .from('couple_rooms')
      .select('id, inviter_id, status')
      .eq('invite_token', token)
      .maybeSingle()

    if (!room?.id) return { ok: false, reason: 'not_found' }

    // 초대한 본인이 자기 링크로 다시 들어온 경우 방어
    if (room.inviter_id === userId) return { ok: false, reason: 'self' }

    // 2) 멤버로 등록 (이미 있으면 unique 제약으로 무시 → 중복 안전)
    await supabase.from('couple_members').upsert(
      { room_id: room.id, user_id: userId, role: 'invitee' },
      { onConflict: 'room_id,user_id' },
    )

    // 3) 방 상태를 connected로
    if (room.status !== 'connected') {
      await supabase
        .from('couple_rooms')
        .update({ status: 'connected' })
        .eq('id', room.id)
    }

    return { ok: true, roomId: room.id }
  } catch (e) {
    console.error('joinCoupleByInvite error', e)
    return { ok: false, reason: 'error' }
  }
}
