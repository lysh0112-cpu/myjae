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

        // 커플방 1개 생성 (상대 가입 대기 = pending)
        const { error } = await supabase.from('couple_rooms').insert({
          inviter_id: uid,
          invite_token: token,
          status: 'pending',
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

  async function handleShare() {
    // 휴대폰 기본 공유창 (카톡·문자·메일 등). 카톡 전용 버튼은 키 발급 후 추가.
    const shareData = {
      title: '커플 채팅 초대',
      text: '우리 둘만의 채팅방으로 초대할게요 💕',
      url: inviteUrl,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        handleCopy()
      }
    } catch {
      /* 사용자가 공유창을 닫은 경우 등 — 무시 */
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
        ) : (
          <>
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

            {/* 공유 버튼 */}
            <button
              onClick={handleShare}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 10,
                background: BROWN,
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer',
                marginBottom: 10,
              }}
            >
              링크 공유하기
            </button>

            <div style={{ fontSize: 11, color: '#c5a590', lineHeight: 1.6 }}>
              공유하기를 누르면 카카오톡·문자 등으로 보낼 수 있어요
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
