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
  fontCssOf,
  isDarkColor,
  googleFontsHref,
  loadRecentColors,
  pushRecentColor,
  FONT_SCALES,
  FONT_POINTS,
  FONTS,
  BG_AUTO,
  THEME_COLUMNS,
  STANDARD_COLORS,
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
  const [settingsBig, setSettingsBig] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [recentColors, setRecentColors] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  // 개인 표시설정 로드 (글자·폰트·배경)
  useEffect(() => {
    setDisp(loadDisplaySettings())
    setRecentColors(loadRecentColors())
  }, [])

  function updateDisp(patch: Partial<ChatDisplaySettings>) {
    setDisp((prev) => {
      const next = { ...prev, ...patch }
      saveDisplaySettings(next)
      return next
    })
  }

  // 배경색 선택 → 적용 + 최근 색에 기록
  function pickBg(hex: string) {
    updateDisp({ bg: hex })
    setRecentColors(pushRecentColor(hex))
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

  const bgColor = disp.bg
  const isDark = isDarkColor(bgColor)
  const fontPt = disp.fontPt || 15
  const fontFam = fontCssOf(disp.fontKey)
  // 다크 배경이면 카드/글자색을 밝게 (자동)
  const autoText = isDark ? '#f0f0f0' : '#3a2e28'
  // 사용자가 글자색 지정했으면 그 색, 아니면 자동
  const userText = disp.textColor || autoText
  const mainText = isDark ? '#f0f0f0' : TITLE
  const cardBg = isDark ? '#3a3a3a' : CARD
  const otherBubbleBg = isDark ? '#3a3a3a' : '#fff'
  const otherBubbleText = disp.textColor || (isDark ? '#f0f0f0' : '#3a2e28')

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
      {/* 구글 웹폰트 로드 (채팅방에서만) */}
      <link rel="stylesheet" href={googleFontsHref()} />
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
                    fontSize: fontPt,
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
              fontSize: fontPt,
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
              borderRadius: '16px 16px 0 0',
              height: settingsBig ? '85vh' : '42vh',
              display: 'flex', flexDirection: 'column',
              transition: 'height 0.2s ease',
            }}
          >
            {/* 상단 고정 바 (크기조절 핸들 + 제목 + 닫기) */}
            <div style={{ padding: '10px 18px 12px', borderBottom: BORDER, flexShrink: 0 }}>
              <div
                onClick={() => setSettingsBig((v) => !v)}
                style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8, cursor: 'pointer' }}
              >
                <div style={{ width: 40, height: 4, borderRadius: 2, background: '#d8ccc2' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: TITLE }}>채팅방 설정</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => setSettingsBig((v) => !v)}
                    aria-label={settingsBig ? '접기' : '펼치기'}
                    style={{ background: 'none', border: 'none', fontSize: 18, color: '#b4785a', cursor: 'pointer', padding: '2px 6px' }}
                  >
                    {settingsBig ? '⌄' : '⌃'}
                  </button>
                  <button onClick={() => setShowSettings(false)} aria-label="닫기" style={{ background: 'none', border: 'none', fontSize: 20, color: '#c5a590', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            </div>

            {/* 내용 (스크롤) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
            {/* 글자 크기 — 포인트 콤보 */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, color: SUB, marginBottom: 10 }}>글자 크기</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={fontPt}
                  onChange={(e) => updateDisp({ fontPt: Number(e.target.value) })}
                  style={{
                    flex: 1, padding: '11px 12px', borderRadius: 9,
                    border: BORDER, background: '#fff', color: TITLE,
                    fontSize: 14, cursor: 'pointer',
                  }}
                >
                  {FONT_POINTS.map((pt) => (
                    <option key={pt} value={pt}>{pt} 포인트</option>
                  ))}
                </select>
                <span style={{ fontSize: fontPt, color: TITLE, minWidth: 44, textAlign: 'center' }}>가나다</span>
              </div>
            </div>

            {/* 폰트 종류 — 콤보상자 */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, color: SUB, marginBottom: 10 }}>글씨체</div>
              <select
                value={disp.fontKey}
                onChange={(e) => updateDisp({ fontKey: e.target.value })}
                style={{
                  width: '100%', padding: '11px 12px', borderRadius: 9,
                  border: BORDER, background: '#fff', color: TITLE,
                  fontSize: 14, cursor: 'pointer',
                  fontFamily: fontCssOf(disp.fontKey),
                }}
              >
                {FONTS.map((f) => (
                  <option key={f.key} value={f.key} style={{ fontFamily: f.css }}>
                    {f.label}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 8, padding: '8px 12px', background: '#fff', border: BORDER, borderRadius: 9, fontSize: 14, color: '#3a2e28', fontFamily: fontCssOf(disp.fontKey) }}>
                가나다라 ABC 미리보기 💕
              </div>
            </div>

            {/* 글자색 — 엑셀식 팔레트 */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, color: SUB, marginBottom: 10 }}>글자색</div>

              {/* 자동 */}
              <button
                onClick={() => updateDisp({ textColor: '' })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 10px', marginBottom: 12, borderRadius: 8,
                  background: disp.textColor === '' ? '#faf3ec' : '#fff',
                  border: disp.textColor === '' ? '1.5px solid #b46e46' : BORDER,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 14, color: '#3a2e28' }}>가</span>
                <span style={{ fontSize: 13, color: TITLE }}>자동 (배경에 맞춤)</span>
              </button>

              {/* 테마 색 */}
              <div style={{ fontSize: 11, color: '#a0968c', marginBottom: 6 }}>테마 색</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3, marginBottom: 12 }}>
                {THEME_COLUMNS.map((col, ci) =>
                  col.map((c, ri) => {
                    const on = disp.textColor.toLowerCase() === c.toLowerCase()
                    return (
                      <button
                        key={`t-${ci}-${ri}`}
                        onClick={() => { updateDisp({ textColor: c }); setRecentColors(pushRecentColor(c)) }}
                        aria-label={c}
                        style={{
                          width: '100%', aspectRatio: '1', borderRadius: 3,
                          background: c,
                          border: on ? '2px solid #b46e46' : '0.5px solid #d8ccc2',
                          cursor: 'pointer', padding: 0,
                        }}
                      />
                    )
                  }),
                )}
              </div>

              {/* 표준 색 */}
              <div style={{ fontSize: 11, color: '#a0968c', marginBottom: 6 }}>표준 색</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3, marginBottom: 12 }}>
                {STANDARD_COLORS.map((c) => {
                  const on = disp.textColor.toLowerCase() === c.toLowerCase()
                  return (
                    <button
                      key={`ts-${c}`}
                      onClick={() => { updateDisp({ textColor: c }); setRecentColors(pushRecentColor(c)) }}
                      aria-label={c}
                      style={{
                        width: '100%', aspectRatio: '1', borderRadius: 3,
                        background: c,
                        border: on ? '2px solid #b46e46' : '0.5px solid #d8ccc2',
                        cursor: 'pointer', padding: 0,
                      }}
                    />
                  )
                })}
              </div>

              {/* 다른 색 직접 고르기 */}
              <label
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '10px', borderRadius: 8, background: '#fff', border: BORDER,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 15 }}>🖍️</span>
                <span style={{ fontSize: 13, color: TITLE, flex: 1 }}>다른 글자색 고르기…</span>
                <input
                  type="color"
                  value={disp.textColor || '#3a2e28'}
                  onChange={(e) => { updateDisp({ textColor: e.target.value }); setRecentColors(pushRecentColor(e.target.value)) }}
                  style={{ width: 28, height: 28, padding: 0, border: BORDER, borderRadius: 6, cursor: 'pointer', background: 'none' }}
                />
              </label>
            </div>

            {/* 배경색 — 엑셀식 팔레트 */}
            <div>
              <div style={{ fontSize: 13, color: SUB, marginBottom: 10 }}>배경색</div>

              {/* 자동 */}
              <button
                onClick={() => pickBg(BG_AUTO)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 10px', marginBottom: 12, borderRadius: 8,
                  background: '#fff', border: BORDER, cursor: 'pointer',
                }}
              >
                <span style={{ width: 18, height: 18, borderRadius: 4, background: BG_AUTO, border: '0.5px solid #d0c0b5', display: 'inline-block' }} />
                <span style={{ fontSize: 13, color: TITLE }}>자동 (기본 피치)</span>
              </button>

              {/* 테마 색 */}
              <div style={{ fontSize: 11, color: '#a0968c', marginBottom: 6 }}>테마 색</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3, marginBottom: 12 }}>
                {THEME_COLUMNS.map((col, ci) =>
                  col.map((c, ri) => {
                    const on = disp.bg.toLowerCase() === c.toLowerCase()
                    return (
                      <button
                        key={`${ci}-${ri}`}
                        onClick={() => pickBg(c)}
                        aria-label={c}
                        style={{
                          width: '100%', aspectRatio: '1', borderRadius: 3,
                          background: c,
                          border: on ? '2px solid #b46e46' : '0.5px solid #d8ccc2',
                          cursor: 'pointer', padding: 0,
                        }}
                      />
                    )
                  }),
                )}
              </div>

              {/* 표준 색 */}
              <div style={{ fontSize: 11, color: '#a0968c', marginBottom: 6 }}>표준 색</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3, marginBottom: 12 }}>
                {STANDARD_COLORS.map((c) => {
                  const on = disp.bg.toLowerCase() === c.toLowerCase()
                  return (
                    <button
                      key={c}
                      onClick={() => pickBg(c)}
                      aria-label={c}
                      style={{
                        width: '100%', aspectRatio: '1', borderRadius: 3,
                        background: c,
                        border: on ? '2px solid #b46e46' : '0.5px solid #d8ccc2',
                        cursor: 'pointer', padding: 0,
                      }}
                    />
                  )
                })}
              </div>

              {/* 최근 사용한 색 */}
              {recentColors.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: '#a0968c', marginBottom: 6 }}>최근 사용한 색</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3, marginBottom: 12 }}>
                    {recentColors.map((c) => {
                      const on = disp.bg.toLowerCase() === c.toLowerCase()
                      return (
                        <button
                          key={c}
                          onClick={() => pickBg(c)}
                          aria-label={c}
                          style={{
                            width: '100%', aspectRatio: '1', borderRadius: 3,
                            background: c,
                            border: on ? '2px solid #b46e46' : '0.5px solid #d8ccc2',
                            cursor: 'pointer', padding: 0,
                          }}
                        />
                      )
                    })}
                  </div>
                </>
              )}

              {/* 다른 색 (직접 고르기) */}
              <label
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '10px', borderRadius: 8, background: '#fff', border: BORDER,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 15 }}>🎨</span>
                <span style={{ fontSize: 13, color: TITLE, flex: 1 }}>다른 색 직접 고르기…</span>
                <input
                  type="color"
                  value={disp.bg}
                  onChange={(e) => pickBg(e.target.value)}
                  style={{ width: 28, height: 28, padding: 0, border: BORDER, borderRadius: 6, cursor: 'pointer', background: 'none' }}
                />
              </label>
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
