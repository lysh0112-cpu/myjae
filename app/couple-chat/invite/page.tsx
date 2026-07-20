'use client'

// ============================================================================
// 커플 채팅 초대 링크 발급 화면 (2단계)
//   - 로그인 회원이 애인에게 보낼 초대 링크를 만든다.
//   - couple_rooms 에 방 1개(pending) 생성 + invite_token 발급
//   - 링크: /signup?invite={token}  (애인이 누르면 가입 → 자동연결)
//   - 지금은 "링크 복사" + "공유하기(기본 공유창)". 카톡 전용 버튼은 키 발급 후 추가.
//   - 상담채팅과 무관한 독립 기능.
// ============================================================================

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  searchMembersByName,
  inviteMemberToRoom,
  type MemberHit,
} from '@/lib/saju/memberInvite'
import { withNim } from '@/lib/saju/honorific'

const PEACH = '#FDF6F0'
const CARD = '#FFFBF7'
const BORDER = '0.5px solid #f0e0d5'
const BROWN = '#b46e46'
const TITLE = '#96502e'
const SUB = '#b4785a'
const PINK = '#d4537e'

function InviteInner() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  // 회원 검색 초대용
  const [myUid, setMyUid] = useState('')
  const [myToken, setMyToken] = useState('')
  const [myCompat, setMyCompat] = useState<unknown>(null)
  const [searchName, setSearchName] = useState('')
  const [searching, setSearching] = useState(false)
  const [hits, setHits] = useState<MemberHit[] | null>(null)
  const [invitedName, setInvitedName] = useState('')

  useEffect(() => {
    let cancelled = false

    async function makeInvite() {
      try {
        const { data: auth } = await supabase.auth.getUser()
        const uid = auth?.user?.id
        if (!uid) {
          if (!cancelled) {
            setErrorMsg('로그인이 필요해요.')
            setLoading(false)
          }
          return
        }

        // 고유 초대 토큰
        const token =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID().replace(/-/g, '')
            : Math.random().toString(36).slice(2) + Date.now().toString(36)

        // URL에서 궁합 정보 읽기 (궁합 결과 화면에서 넘어온 경우)
        let compatData: unknown = null
        try {
          const compatRaw = new URLSearchParams(window.location.search).get('compat')
          if (compatRaw) compatData = JSON.parse(decodeURIComponent(compatRaw))
        } catch { /* 무시 */ }

        // 커플방 1개 생성 (상대 가입 대기 = pending)
        const { error } = await supabase.from('couple_rooms').insert({
          inviter_id: uid,
          invite_token: token,
          status: 'pending',
          compat_data: compatData,
        })
        if (error) throw error

        // 초대자를 방 멤버(inviter)로 등록 — room_id를 다시 조회해서 넣는다
        const { data: room } = await supabase
          .from('couple_rooms')
          .select('id')
          .eq('invite_token', token)
          .maybeSingle()
        if (room?.id) {
          await supabase.from('couple_members').insert({
            room_id: room.id,
            user_id: uid,
            role: 'inviter',
          })
        }

        const origin =
          typeof window !== 'undefined' ? window.location.origin : 'https://myjae.vercel.app'
        if (!cancelled) {
          setInviteUrl(`${origin}/couple-chat/join?invite=${token}`)
          setMyUid(uid)
          setMyToken(token)
          setMyCompat(compatData)
          setLoading(false)
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          setErrorMsg('초대 링크를 만들지 못했어요. 잠시 후 다시 시도해주세요.')
          setLoading(false)
        }
      }
    }

    makeInvite()
    return () => { cancelled = true }
  }, [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setErrorMsg('복사가 안 됐어요. 링크를 길게 눌러 복사해주세요.')
    }
  }

  async function handleSearch() {
    const name = searchName.trim()
    if (!name) return
    setSearching(true)
    setHits(null)
    try {
      const results = await searchMembersByName(name, myUid)
      setHits(results)
    } finally {
      setSearching(false)
    }
  }

  // 이 초대 화면이 미리 만든 방(myToken)에 상대(invitee)를 지정 = 회원 초대
  async function handleInviteMember(hit: MemberHit) {
    if (!myToken) return
    // 이미 만들어둔 방을 찾아서 invitee_id 지정 + connected 대기
    const { data: room } = await supabase
      .from('couple_rooms')
      .select('id')
      .eq('invite_token', myToken)
      .maybeSingle()
    if (!room?.id) { alert('초대 방을 찾지 못했어요.'); return }
    const { error } = await supabase
      .from('couple_rooms')
      .update({ invitee_id: hit.userId })
      .eq('id', room.id)
    if (error) { alert('초대에 실패했어요. 잠시 후 다시 시도해주세요.'); return }
    setInvitedName(hit.nickname)
  }

  function handleSms() {
    // 문자앱에 초대 메시지+링크를 담아서 열기 (카카오 키 없이 됨)
    const body = `우리 둘만의 채팅방으로 초대할게요 💕\n${inviteUrl}`
    // iOS는 &body, 안드로이드는 ?body — 둘 다 대응
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const sep = /iphone|ipad|ipod|mac/i.test(ua) ? '&' : '?'
    window.location.href = `sms:${sep}body=${encodeURIComponent(body)}`
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
          onClick={() => router.back()}
          aria-label="뒤로"
          style={{ background: 'none', border: 'none', color: TITLE, fontSize: 20, cursor: 'pointer', padding: 0 }}
        >
          {'\u2039'}
        </button>
        <span style={{ fontSize: 14, fontWeight: 500, color: TITLE }}>커플 채팅 초대</span>
      </div>

      <div style={{ flex: 1, padding: '24px 18px', textAlign: 'center' }}>
        {/* 하트 아이콘 */}
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            background: '#fbeaf0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 34,
          }}
        >
          💗
        </div>

        <div style={{ fontSize: 17, fontWeight: 'bold', color: TITLE, marginBottom: 8 }}>
          애인을 초대해보세요
        </div>
        <div style={{ fontSize: 13, color: SUB, lineHeight: 1.7, marginBottom: 24 }}>
          링크를 보내면 애인이 간단히 가입하고
          <br />
          둘만의 채팅방이 열려요
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: SUB, padding: '20px 0' }}>초대 링크를 만드는 중…</div>
        ) : errorMsg ? (
          <div
            style={{
              fontSize: 13,
              color: '#c0392b',
              background: '#fdecea',
              border: '0.5px solid #f5c6cb',
              borderRadius: 10,
              padding: '14px',
              lineHeight: 1.6,
            }}
          >
            {errorMsg}
          </div>
        ) : invitedName ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💌</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: TITLE, marginBottom: 6 }}>
              {withNim(invitedName)}에게 초대를 보냈어요!
            </div>
            <div style={{ fontSize: 12, color: SUB, lineHeight: 1.7, marginBottom: 20 }}>
              {withNim(invitedName)}이 명카페 앱에서 수락하면
              <br />
              채팅방이 열려요 💕
            </div>
            <button
              onClick={() => router.push('/couple-chat/rooms')}
              style={{ padding: '12px 26px', borderRadius: 10, background: BROWN, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              내 채팅방 보기
            </button>
          </div>
        ) : (
          <>
            {/* 회원 이름 검색 초대 */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: TITLE, marginBottom: 8 }}>
                명카페 회원이면 이름으로 초대
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <input
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
                  placeholder="상대 이름(닉네임)"
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: BORDER, background: '#fff', fontSize: 13, color: '#3a2e28', outline: 'none' }}
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  style={{ padding: '10px 16px', borderRadius: 8, background: BROWN, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  {searching ? '검색중' : '검색'}
                </button>
              </div>

              {hits && hits.length === 0 && (
                <div style={{ fontSize: 12, color: SUB, textAlign: 'center', padding: '8px 0' }}>
                  같은 이름의 회원을 찾지 못했어요. 아래 링크로 초대해보세요.
                </div>
              )}
              {hits && hits.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: '#a0968c' }}>회원 {hits.length}명 · 맞는 사람을 선택하세요</div>
                  {hits.map((h) => (
                    <button
                      key={h.userId}
                      onClick={() => handleInviteMember(h)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '10px 12px', borderRadius: 10, background: '#fff',
                        border: BORDER, cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#fbeaf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>👤</span>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontSize: 13, color: '#3a2e28', fontWeight: 500 }}>{h.nickname}</span>
                        <span style={{ display: 'block', fontSize: 11, color: SUB }}>{h.maskedEmail}{h.joinedYear ? ` · ${h.joinedYear} 가입` : ''}</span>
                      </span>
                      <span style={{ fontSize: 12, color: '#993556', fontWeight: 600 }}>초대</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ fontSize: 11, color: '#6b5340', textAlign: 'center', marginBottom: 16 }}>
              — 또는 링크로 초대 —
            </div>

            {/* 링크 박스 */}
            <div
              style={{
                background: '#fff',
                border: BORDER,
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: SUB,
                  flex: 1,
                  textAlign: 'left',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {inviteUrl}
              </span>
              <button
                onClick={handleCopy}
                style={{
                  fontSize: 12,
                  color: copied ? '#3b8a3b' : '#c8783c',
                  fontWeight: 600,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? '복사됨 ✓' : '복사'}
              </button>
            </div>

            {/* 문자 보내기 + 복사 두 버튼 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button
                onClick={handleSms}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 10,
                  background: BROWN,
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                💬 문자로 보내기
              </button>
              <button
                onClick={handleCopy}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 10,
                  background: '#fff',
                  border: '0.5px solid #e0c9b8',
                  fontSize: 14,
                  fontWeight: 600,
                  color: copied ? '#3b8a3b' : '#96502e',
                  cursor: 'pointer',
                }}
              >
                {copied ? '복사됨 ✓' : '🔗 링크 복사'}
              </button>
            </div>

            <div style={{ fontSize: 11, color: '#6b5340', lineHeight: 1.6 }}>
              문자로 보내거나, 링크를 복사해서 카카오톡에 붙여넣어 보낼 수 있어요
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default function CoupleInvitePage() {
  return (
    <Suspense>
      <InviteInner />
    </Suspense>
  )
}
