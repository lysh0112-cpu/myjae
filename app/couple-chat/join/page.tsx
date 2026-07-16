'use client'

// ============================================================================
// 커플 채팅 초대장 화면 (링크 받은 사람이 처음 보는 관문)
//   - 링크: /couple-chat/join?invite={token}
//   - 이미 로그인한 회원  → 바로 자동연결 후 채팅방으로
//   - 로그인 안 된 사람    → "가입" 또는 "로그인" 선택 (둘 다 invite 유지)
//   - 상담채팅과 무관한 독립 기능.
// ============================================================================

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getInviteInfo, joinCoupleByInvite } from '@/lib/saju/coupleInvite'

const PEACH = '#FDF6F0'
const CARD = '#FFFBF7'
const BORDER = '0.5px solid #f0e0d5'
const BROWN = '#b46e46'
const TITLE = '#96502e'
const SUB = '#b4785a'
const PINK = '#d4537e'

function JoinInner() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [inviterName, setInviterName] = useState('상대')
  const [token, setToken] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false

    async function init() {
      const t =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('invite')
          : null

      if (!t) {
        if (!cancelled) { setErrorMsg('올바르지 않은 초대 링크예요.'); setLoading(false) }
        return
      }
      if (!cancelled) setToken(t)

      // 초대 정보(초대자 이름) 미리 보기
      const info = await getInviteInfo(t)
      if (cancelled) return
      if (!info.ok) {
        setErrorMsg('초대를 찾을 수 없어요. 링크가 만료됐을 수 있어요.')
        setLoading(false)
        return
      }
      setInviterName(info.inviterName)

      // 이미 로그인한 회원이면 → 바로 연결하고 채팅방으로
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth?.user?.id
      if (uid) {
        const joined = await joinCoupleByInvite(t, uid)
        if (!cancelled) {
          if (joined.ok) {
            router.push(`/couple-chat?room=${joined.roomId}`)
            return
          }
          // 자기 자신 링크 등 연결 불가 → 안내
          setErrorMsg(
            joined.reason === 'self'
              ? '내가 보낸 초대 링크예요. 상대에게 전달해주세요.'
              : '연결에 실패했어요. 잠시 후 다시 시도해주세요.',
          )
          setLoading(false)
        }
        return
      }

      // 비로그인 → 가입/로그인 선택 화면 표시
      if (!cancelled) setLoading(false)
    }

    init()
    return () => { cancelled = true }
  }, [router])

  // 가입/로그인으로 갈 때 invite 토큰을 유지해서 넘긴다.
  function goSignup() {
    router.push(`/signup?invite=${token}`)
  }
  function goLogin() {
    router.push(`/login?invite=${token}`)
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '28px 20px', textAlign: 'center' }}>
        {loading ? (
          <div style={{ fontSize: 13, color: SUB }}>초대를 확인하는 중…</div>
        ) : errorMsg ? (
          <div
            style={{
              background: CARD,
              border: BORDER,
              borderRadius: 12,
              padding: '28px 20px',
            }}
          >
            <div style={{ fontSize: 34, marginBottom: 14 }}>💌</div>
            <div style={{ fontSize: 14, color: SUB, lineHeight: 1.7 }}>{errorMsg}</div>
            <button
              onClick={() => router.push('/home-new')}
              style={{ marginTop: 20, padding: '12px 28px', borderRadius: 10, background: BROWN, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              홈으로
            </button>
          </div>
        ) : (
          <div style={{ background: CARD, border: BORDER, borderRadius: 12, padding: '28px 20px' }}>
            <div
              style={{
                width: 70, height: 70, borderRadius: '50%', background: '#fbeaf0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: 36,
              }}
            >
              💌
            </div>

            <div style={{ fontSize: 17, fontWeight: 'bold', color: TITLE, marginBottom: 8 }}>
              커플 채팅에 초대받았어요
            </div>
            <div style={{ fontSize: 13, color: SUB, lineHeight: 1.7, marginBottom: 24 }}>
              <b style={{ color: PINK }}>{inviterName}</b>님이 둘만의 채팅방으로
              <br />
              초대했어요 💕
            </div>

            <button
              onClick={goSignup}
              style={{ width: '100%', padding: 14, borderRadius: 10, background: BROWN, border: 'none', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: 10 }}
            >
              처음이에요 · 간단히 가입하고 시작
            </button>

            <button
              onClick={goLogin}
              style={{ width: '100%', padding: 13, borderRadius: 10, background: '#fff', border: '0.5px solid #e0c9b8', fontSize: 13, fontWeight: 500, color: TITLE, cursor: 'pointer' }}
            >
              이미 회원이에요 · 로그인
            </button>

            <div style={{ fontSize: 11, color: '#c5a590', lineHeight: 1.6, marginTop: 16 }}>
              가입하든 로그인하든
              <br />
              바로 연결돼서 채팅방이 열려요
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default function CoupleJoinPage() {
  return (
    <Suspense>
      <JoinInner />
    </Suspense>
  )
}
