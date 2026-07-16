'use client'

// ============================================================================
// 커플 채팅방 (피치톤 + DB 실시간)
//   - URL: /couple-chat?room={roomId}
//   - couple_messages 실시간 구독 (한 명이 보내면 상대 폰에 바로 뜸)
//   - room 파라미터 없으면 → 내 방 목록으로 보냄
//   - 상담채팅과 무관한 독립 기능
// ============================================================================

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DailyFortune from './components/DailyFortune'
import {
  loadRoomMessages,
  sendRoomMessage,
  leaveCoupleRoom,
  type CoupleMsg,
} from '@/lib/saju/coupleRoom'
import {
  loadDisplaySettings,
  saveDisplaySettings,
  bgColorOf,
  FONT_SCALES,
  FONT_FAMILIES,
  BG_OPTIONS,
  DEFAULT_DISPLAY,
  type ChatDisplaySettings,
} from '@/lib/saju/chatDisplay'

const PEACH = '#FDF6F0'
const CARD = '#FFFBF7'
const BORDER = '0.5px solid #f0e0d5'
const BROWN = '#b46e46'
const TITLE = '#96502e'
const SUB = '#b4785a'

function ChatInner() {
  const router = useRouter()
  const [roomId, setRoomId] = useState<string | null>(null)
  const [myUid, setMyUid] = useState<string | null>(null)
  const [messages, setMessages] = useState<CoupleMsg[]>([])
  const [input, setInput] = useState('')
  const [ready, setReady] = useState(false)
  const [disp, setDisp] = useState<ChatDisplaySettings>(DEFAULT_DISPLAY)
  const [showSettings, setShowSettings] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // 개인 표시설정 로드 (글자·폰트·배경)
  useEffect(() => {
    setDisp(loadDisplaySettings())
  }, [])

  function updateDisp(patch: Partial<ChatDisplaySettings>) {
    setDisp((prev) => {
      const next = { ...prev, ...patch }
      saveDisplaySettings(next)
      return next
    })
  }

  async function handleLeave() {
    if (!roomId) return
    if (!confirm('채팅방을 나가시겠어요?\n내 목록에서 삭제되고, 대화 내용을 볼 수 없게 돼요.')) return
    const ok = await leaveCoupleRoom(roomId)
    if (ok) router.push('/couple-chat/rooms')
    else alert('나가기에 실패했어요. 잠시 후 다시 시도해주세요.')
  }

  // 초기화: 로그인·room 확인 + 메시지 로드 + 실시간 구독
  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      const rid =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('room')
          : null

      // 방 지정이 없으면 목록으로
      if (!rid) {
        router.replace('/couple-chat/rooms')
        return
      }

      const { data: auth } = await supabase.auth.getUser()
      const uid = auth?.user?.id
      if (!uid) {
        router.replace('/login')
        return
      }
      if (cancelled) return

      setRoomId(rid)
      setMyUid(uid)

      const msgs = await loadRoomMessages(rid, uid)
      if (cancelled) return
      setMessages(msgs)
      setReady(true)

      // 실시간 구독 (검증된 상담채팅 패턴 재사용)
      channel = supabase
        .channel(`couple-room-${rid}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'couple_messages',
            filter: `room_id=eq.${rid}`,
          },
          (payload) => {
            const m = payload.new as CoupleMsg
            // 비공개(private)는 보낸 사람만 화면에 추가
            if (m.visibility !== 'all' && m.sender_id !== uid) return
            setMessages((prev) =>
              prev.some((x) => x.id === m.id) ? prev : [...prev, m],
            )
          },
        )
        .subscribe()
    }

    init()
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [router])

  // 새 메시지 오면 맨 아래로
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || !roomId || !myUid) return
    setInput('')
    await sendRoomMessage(roomId, myUid, text)
  }

  const { color: bgColor, dark: isDark } = bgColorOf(disp.bg)
  const scale = disp.fontScale
  const fontFam = disp.fontFamily
  // 다크 배경이면 카드/글자색을 밝게
  const mainText = isDark ? '#f0f0f0' : TITLE
  const cardBg = isDark ? '#3a3a3a' : CARD
  const otherBubbleBg = isDark ? '#3a3a3a' : '#fff'
  const otherBubbleText = isDark ? '#f0f0f0' : '#3a2e28'

  return (
    <main
      style={{
        minHeight: '100vh',
        background: bgColor,
        maxWidth: 480,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: fontFam,
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          background: cardBg,
          borderBottom: BORDER,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => router.push('/couple-chat/rooms')}
          aria-label="방 목록"
          style={{ background: 'none', border: 'none', color: mainText, fontSize: 20, cursor: 'pointer', padding: 0 }}
        >
          {'\u2039'}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: mainText }}>우리만의 공간 🔒</div>
          <div style={{ fontSize: 12, color: isDark ? '#b0b0b0' : SUB }}>커플 전용 비밀 채팅방</div>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          aria-label="설정"
          style={{ background: 'none', border: 'none', color: mainText, fontSize: 20, cursor: 'pointer', padding: '0 4px' }}
        >
          ⚙️
        </button>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            aria-label="메뉴"
            style={{ background: 'none', border: 'none', color: mainText, fontSize: 20, cursor: 'pointer', padding: '0 4px' }}
          >
            ☰
          </button>
          {showMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 30,
                background: '#fff',
                border: BORDER,
                borderRadius: 10,
                boxShadow: '0 4px 14px rgba(60,40,30,0.15)',
                zIndex: 20,
                minWidth: 130,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => { setShowMenu(false); router.push('/home-new') }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', fontSize: 14, color: '#3a2e28', cursor: 'pointer' }}
              >
                🏠 홈으로
              </button>
              <button
                onClick={() => { setShowMenu(false); handleLeave() }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', borderTop: BORDER, fontSize: 14, color: '#c0392b', cursor: 'pointer' }}
              >
                🚪 채팅방 나가기
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 메시지 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
        {/* 오늘의 궁합운세 */}
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              background: '#fbeaf0',
              border: '0.5px solid #f0c9d8',
              borderRadius: 12,
              padding: '11px 13px',
            }}
          >
            <div style={{ fontSize: 13, color: '#c85a8c', fontWeight: 600, marginBottom: 4 }}>
              ✦ 오늘의 궁합 운세
            </div>
            <div style={{ fontSize: 14, color: TITLE, lineHeight: 1.6 }}>
              <DailyFortune />
            </div>
          </div>
        </div>

        {!ready ? (
          <div style={{ textAlign: 'center', color: SUB, fontSize: 15, padding: '30px 0' }}>
            채팅방을 여는 중…
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#c5a590', fontSize: 15, padding: '40px 0', lineHeight: 1.8 }}>
            아직 메시지가 없어요
            <br />
            첫 번째 메시지를 보내보세요 💕
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === myUid
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: mine ? 'flex-end' : 'flex-start',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    maxWidth: '72%',
                    fontSize: 15.5 * scale,
                    lineHeight: 1.55,
                    padding: '9px 13px',
                    borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: mine ? BROWN : otherBubbleBg,
                    color: mine ? '#fff' : otherBubbleText,
                    border: mine ? 'none' : (isDark ? 'none' : BORDER),
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {m.message}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div style={{ borderTop: BORDER, background: cardBg, padding: '10px 12px', position: 'sticky', bottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="메시지 입력… (Shift+Enter 줄바꿈)"
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              background: isDark ? '#3a3a3a' : '#fff',
              border: BORDER,
              borderRadius: 20,
              padding: '11px 15px',
              fontSize: 15 * scale,
              color: isDark ? '#f0f0f0' : '#3a2e28',
              outline: 'none',
              maxHeight: 100,
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleSend}
            aria-label="보내기"
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: BROWN,
              border: 'none',
              color: '#fff',
              fontSize: 18,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {'\u27A4'}
          </button>
        </div>
      </div>

      {/* 설정 패널 (글자 크기 · 폰트 · 배경) */}
      {showSettings && (
        <div
          onClick={() => setShowSettings(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(60,40,30,0.35)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480, background: '#FDF6F0',
              borderRadius: '16px 16px 0 0', padding: '20px 18px 28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: TITLE }}>채팅방 설정</span>
              <button onClick={() => setShowSettings(false)} aria-label="닫기" style={{ background: 'none', border: 'none', fontSize: 20, color: '#c5a590', cursor: 'pointer' }}>✕</button>
            </div>

            {/* 글자 크기 */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, color: SUB, marginBottom: 10 }}>글자 크기</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {FONT_SCALES.map((f) => {
                  const on = Math.abs(disp.fontScale - f.scale) < 0.01
                  return (
                    <button
                      key={f.key}
                      onClick={() => updateDisp({ fontScale: f.scale })}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 9,
                        background: on ? BROWN : '#fff',
                        border: on ? 'none' : BORDER,
                        color: on ? '#fff' : TITLE,
                        fontWeight: on ? 600 : 400,
                        fontSize: 11 + f.scale * 3,
                        cursor: 'pointer',
                      }}
                    >
                      {f.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 폰트 종류 */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, color: SUB, marginBottom: 10 }}>글씨체</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {FONT_FAMILIES.map((f) => {
                  const on = disp.fontFamily === f.css
                  return (
                    <button
                      key={f.key}
                      onClick={() => updateDisp({ fontFamily: f.css })}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 9,
                        background: on ? BROWN : '#fff',
                        border: on ? 'none' : BORDER,
                        color: on ? '#fff' : TITLE,
                        fontWeight: on ? 600 : 400,
                        fontSize: 13,
                        fontFamily: f.css,
                        cursor: 'pointer',
                      }}
                    >
                      {f.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 배경색 */}
            <div>
              <div style={{ fontSize: 13, color: SUB, marginBottom: 10 }}>배경색</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {BG_OPTIONS.map((b) => {
                  const on = disp.bg === b.key
                  return (
                    <button
                      key={b.key}
                      onClick={() => updateDisp({ bg: b.key })}
                      aria-label={b.label}
                      style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: b.color,
                        border: on ? '2px solid #b46e46' : '0.5px solid #f0e0d5',
                        cursor: 'pointer',
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function CoupleChatPage() {
  return (
    <Suspense>
      <ChatInner />
    </Suspense>
  )
}
