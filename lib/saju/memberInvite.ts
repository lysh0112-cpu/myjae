// ============================================================================
// 회원끼리 이름 검색 초대
//   - 이름(nickname)으로 회원 검색 → 이메일 일부 가려 표시 → 초대
//   - 받는 쪽: 나에게 온 초대 조회 → 수락하면 방 연결
//   - 상담채팅과 무관한 독립 기능
// ============================================================================

import { supabase } from '@/lib/supabase'

export type MemberHit = {
  userId: string
  nickname: string
  maskedEmail: string // jiy***@gmail.com
  joinedYear: string
}

// 이메일 가리기: jiyoung@gmail.com → jiy***@gmail.com
export function maskEmail(email: string): string {
  const [id, domain] = email.split('@')
  if (!domain) return '***'
  const head = id.slice(0, Math.min(3, id.length))
  return `${head}***@${domain}`
}

// 이름(nickname)으로 회원 검색 — 서버 API 경유 (RLS 우회 + 이메일 가림)
export async function searchMembersByName(
  name: string,
  excludeUserId?: string,
): Promise<MemberHit[]> {
  const q = name.trim()
  if (!q) return []
  try {
    const res = await fetch('/api/couple/search-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: q, excludeUserId }),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.members || []) as MemberHit[]
  } catch {
    return []
  }
}

// 회원에게 초대 보내기 (방 생성 + invitee_id 지정)
// compat: 궁합 정보(두 사람 사주). token: 초대 토큰(수락 시 사용)
export async function inviteMemberToRoom(args: {
  inviterId: string
  inviteeId: string
  token: string
  compat: unknown
}): Promise<{ ok: true; roomId: string } | { ok: false; reason: string }> {
  try {
    const { data, error } = await supabase
      .from('couple_rooms')
      .insert({
        inviter_id: args.inviterId,
        invitee_id: args.inviteeId,
        invite_token: args.token,
        status: 'pending',
        compat_data: args.compat,
      })
      .select('id')
      .maybeSingle()
    if (error || !data) return { ok: false, reason: error?.message || '초대 생성 실패' }
    return { ok: true, roomId: data.id }
  } catch (e: any) {
    return { ok: false, reason: e?.message || '오류' }
  }
}

export type PendingInvite = {
  roomId: string
  inviterName: string
}

// 나에게 온 초대들 조회 (수락 대기중)
export async function getMyPendingInvites(): Promise<PendingInvite[]> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return []

  const { data: rooms } = await supabase
    .from('couple_rooms')
    .select('id, inviter_id')
    .eq('invitee_id', uid)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (!rooms || rooms.length === 0) return []

  // 초대한 사람 닉네임
  const inviterIds = Array.from(new Set(rooms.map((r) => r.inviter_id)))
  const nameMap: Record<string, string> = {}
  const { data: profs } = await supabase
    .from('profiles')
    .select('id, nickname')
    .in('id', inviterIds)
  for (const p of profs || []) nameMap[p.id] = p.nickname || '상대'

  return rooms.map((r) => ({
    roomId: r.id,
    inviterName: nameMap[r.inviter_id] || '상대',
  }))
}

// 초대 수락 → 방 멤버로 등록 + connected
export async function acceptInvite(roomId: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return false
  try {
    await supabase.from('couple_members').upsert(
      { room_id: roomId, user_id: uid, role: 'invitee' },
      { onConflict: 'room_id,user_id' },
    )
    await supabase.from('couple_rooms').update({ status: 'connected' }).eq('id', roomId)
    return true
  } catch {
    return false
  }
}

// 초대 거절/나중에 (그냥 pending 유지, 아무것도 안 함) — 필요 시 삭제도 가능
export async function dismissInvite(roomId: string): Promise<void> {
  // "나중에"는 상태 유지. 완전 거절을 원하면 아래 주석 해제
  // await supabase.from('couple_rooms').delete().eq('id', roomId)
  void roomId
}
