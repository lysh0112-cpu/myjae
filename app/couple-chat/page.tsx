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
import {
  loadRoomMessages,
  sendRoomMessage,
  leaveCoupleRoom,
  getRoomAiOn,
  setRoomAiOn,
  getRoomCompat,
  saveAiMessage,
  shareAiMessage,
  deleteAiMessage,
  type CoupleMsg,
} from '@/lib/saju/coupleRoom'
import { calcSaju } from '@/app/manseryeok/ai-chat/useSaju'
import {
  loadDisplaySettings,
  saveDisplaySettings,
  fontCssOf,
  isDarkColor,
  googleFontsHref,
  loadRecentColors,
  pushRecentColor,
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

// 오늘의 궁합 운세 문구 (날짜별 고정)
const FORTUNES = [
  '서로에게 솔직한 마음을 전해보세요. 작은 말 한마디가 큰 감동이 될 거예요 💫',
  '오늘은 함께하는 시간이 더욱 빛나는 날이에요. 소소한 일상을 나눠보세요 🌟',
  '두 분의 오행 기운이 조화롭게 흐르는 날이에요. 서로를 응원해주세요 ✨',
  '작은 배려가 큰 사랑이 되는 날이에요. 따뜻한 말 한마디를 건네보세요 🌸',
  '오늘은 새로운 계획을 함께 세워보기 좋은 날이에요 🎯',
]
function todayFortune(): string {
  return FORTUNES[new Date().getDate() % FORTUNES.length]
}

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
  const [settingsTab, setSettingsTab] = useState<'bg' | 'font' | 'size' | 'textColor' | 'bubble'>('bg')
  const [showMenu, setShowMenu] = useState(false)
  const [recentColors, setRecentColors] = useState<string[]>([])
  const [aiOn, setAiOn] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [compat, setCompat] = useState<any | null>(null)
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

      // AI 토글 상태 + 궁합 정보 로드
      getRoomAiOn(rid).then((on) => { if (!cancelled) setAiOn(on) })
      getRoomCompat(rid).then((c) => { if (!cancelled) setCompat(c) })

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
    // AI 켜져 있고 "AI"로 시작하는 질문이면 AI도 호출
    if (aiOn && /^(ai|에이아이|에이아이야|ai야)\b/i.test(text)) {
      askAi(text)
    }
  }

  // AI 토글 켜고 끄기
  async function toggleAi() {
    if (!roomId) return
    const next = !aiOn
    setAiOn(next)
    await setRoomAiOn(roomId, next)
  }

  // 두 사람 사주 + 궁합 정보를 프롬프트로 만들어 AI 호출 → 나만 미리보기 저장
  async function askAi(userQuestion?: string) {
    if (!roomId || !myUid || aiLoading) return
    setAiLoading(true)
    try {
      // 두 사람 사주 계산 (궁합 정보에 담긴 생년월일 사용)
      let saju1: any[] = []
      let saju2: any[] = []
      let gender1 = '남'
      let gender2 = '여'
      let compatSummary = ''
      if (compat?.person1 && compat?.person2) {
        const p1 = compat.person1
        const p2 = compat.person2
        saju1 = calcSaju(Number(p1.year), Number(p1.month), Number(p1.day), Number(p1.hour ?? 0))
        saju2 = calcSaju(Number(p2.year), Number(p2.month), Number(p2.day), Number(p2.hour ?? 0))
        gender1 = p1.gender || '남'
        gender2 = p2.gender || '여'
        if (compat.grade) compatSummary = `두 사람의 궁합 등급: ${compat.grade}. `
      }

      // 최근 대화 맥락 (최대 10개)
      const recent = messages.slice(-10).map((m) => ({
        role: m.sender_id === myUid ? 'user' : 'assistant',
        content: m.message,
      }))
      const question = userQuestion
        ? userQuestion.replace(/^(ai|에이아이|에이아이야|ai야)[\s,:]*/i, '')
        : '우리 두 사람의 대화 흐름을 보고, 사주와 궁합을 바탕으로 다정한 관계 조언을 해줘.'

      const res = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'personal',
          saju1, saju2,
          gender1, gender2,
          messages: [
            ...recent,
            { role: 'user', content: `${compatSummary}${question}` },
          ],
        }),
      })

      // 스트리밍 응답 수집
      let aiText = ''
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n')) {
            const t = line.trim()
            if (!t.startsWith('data:')) continue
            try {
              const j = JSON.parse(t.slice(5).trim())
              if (j.text) aiText += j.text
            } catch { /* 무시 */ }
          }
        }
      }
      if (!aiText) aiText = '지금은 조언을 준비하지 못했어요. 잠시 후 다시 시도해주세요.'

      // 나만 보기(private)로 저장
      await saveAiMessage(roomId, myUid, aiText)
    } catch (e) {
      console.error('askAi error', e)
      alert('AI 조언을 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleShareAi(messageId: string) {
    await shareAiMessage(messageId)
    // 화면에서도 all로 갱신
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, visibility: 'all' } : m))
  }

  async function handleHideAi(messageId: string) {
    await deleteAiMessage(messageId)
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
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
  // 내 말풍선: 지정색 있으면 그 색, 없으면 기본 브라운. 글자색은 밝기 대비 자동
  const myBubbleBg = disp.myBubble || BROWN
  const myBubbleText = disp.myBubble ? (isDarkColor(disp.myBubble) ? '#fff' : '#3a2e28') : '#fff'

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
          onClick={toggleAi}
          aria-label="AI 조언"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: aiOn ? '#7c5aaa' : (isDark ? 'rgba(255,255,255,0.12)' : '#f3ecfa'),
            border: aiOn ? 'none' : '0.5px solid #d5c5e5',
            borderRadius: 14, padding: '5px 10px', cursor: 'pointer',
            marginRight: 2,
          }}
        >
          <span style={{ fontSize: 13 }}>🤖</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: aiOn ? '#fff' : '#7c5aaa' }}>
            AI {aiOn ? 'ON' : 'OFF'}
          </span>
        </button>
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
              background: isDark ? 'rgba(255,255,255,0.10)' : '#fbeaf0',
              border: isDark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid #f0c9d8',
              borderRadius: 12,
              padding: '11px 13px',
            }}
          >
            <div style={{ fontSize: 13, color: isDark ? '#f0b0cc' : '#c85a8c', fontWeight: 600, marginBottom: 4 }}>
              ✦ 오늘의 궁합 운세
            </div>
            <div style={{ fontSize: 14, color: isDark ? '#f0e0e8' : TITLE, lineHeight: 1.6 }}>
              {todayFortune()}
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
            // AI 조언 메시지 (보라 박스)
            if (m.kind === 'ai') {
              const isPreview = m.visibility === 'private'
              return (
                <div key={m.id} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      background: '#f3ecfa',
                      border: isPreview ? '1px dashed #b89ad4' : '1px solid #d5c5e5',
                      borderRadius: 12,
                      padding: '11px 13px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <span style={{ fontSize: 14 }}>🤖</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#7c5aaa' }}>
                        AI 조언{isPreview ? ' · 나만 보이는 중' : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: fontPt, color: '#4a3a5a', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {m.message}
                    </div>
                    {isPreview && mine && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        <button
                          onClick={() => handleShareAi(m.id)}
                          style={{ flex: 1, padding: 7, borderRadius: 8, background: '#7c5aaa', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          상대에게 공유
                        </button>
                        <button
                          onClick={() => handleHideAi(m.id)}
                          style={{ padding: '7px 12px', borderRadius: 8, background: '#fff', color: '#7c5aaa', border: '0.5px solid #d5c5e5', fontSize: 12, cursor: 'pointer' }}
                        >
                          숨기기
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            }
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
                    background: mine ? myBubbleBg : otherBubbleBg,
                    color: mine ? myBubbleText : otherBubbleText,
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
        {aiOn && (
          <button
            onClick={() => askAi()}
            disabled={aiLoading}
            style={{
              width: '100%', marginBottom: 8, padding: 10, borderRadius: 8,
              background: '#f3ecfa', border: '0.5px solid #d5c5e5',
              color: '#7c5aaa', fontSize: 13, fontWeight: 600,
              cursor: aiLoading ? 'default' : 'pointer', opacity: aiLoading ? 0.6 : 1,
            }}
          >
            {aiLoading ? '🤖 AI가 생각하는 중…' : '🤖 AI에게 조언 구하기'}
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지 입력…"
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
              {/* 탭 버튼 */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto' }}>
                {([
                  ['bg', '배경'],
                  ['font', '글자체'],
                  ['size', '글자크기'],
                  ['textColor', '글자색'],
                  ['bubble', '말풍선'],
                ] as const).map(([key, label]) => {
                  const on = settingsTab === key
                  return (
                    <button
                      key={key}
                      onClick={() => setSettingsTab(key)}
                      style={{
                        flexShrink: 0, padding: '8px 12px', borderRadius: 8,
                        background: on ? BROWN : '#f3e6dc',
                        color: on ? '#fff' : TITLE,
                        border: 'none', fontSize: 12, fontWeight: on ? 600 : 400,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* 탭 내용 */}
              {settingsTab === 'size' && (
                <div>
                  <div style={{ fontSize: 13, color: SUB, marginBottom: 10 }}>글자 크기</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <select
                      value={fontPt}
                      onChange={(e) => updateDisp({ fontPt: Number(e.target.value) })}
                      style={{ flex: 1, padding: '11px 12px', borderRadius: 9, border: BORDER, background: '#fff', color: TITLE, fontSize: 14, cursor: 'pointer' }}
                    >
                      {FONT_POINTS.map((pt) => (<option key={pt} value={pt}>{pt} 포인트</option>))}
                    </select>
                    <span style={{ fontSize: fontPt, color: TITLE, minWidth: 44, textAlign: 'center' }}>가나다</span>
                  </div>
                </div>
              )}

              {settingsTab === 'font' && (
                <div>
                  <div style={{ fontSize: 13, color: SUB, marginBottom: 10 }}>글씨체</div>
                  <select
                    value={disp.fontKey}
                    onChange={(e) => updateDisp({ fontKey: e.target.value })}
                    style={{ width: '100%', padding: '11px 12px', borderRadius: 9, border: BORDER, background: '#fff', color: TITLE, fontSize: 14, cursor: 'pointer', fontFamily: fontCssOf(disp.fontKey) }}
                  >
                    {FONTS.map((f) => (<option key={f.key} value={f.key} style={{ fontFamily: f.css }}>{f.label}</option>))}
                  </select>
                  <div style={{ marginTop: 8, padding: '10px 12px', background: '#fff', border: BORDER, borderRadius: 9, fontSize: 15, color: '#3a2e28', fontFamily: fontCssOf(disp.fontKey) }}>
                    가나다라 ABC 미리보기 💕
                  </div>
                </div>
              )}

              {settingsTab === 'bg' && (
                <div>
                  <div style={{ fontSize: 13, color: SUB, marginBottom: 10 }}>배경색</div>
                  <ColorPalette
                    current={disp.bg}
                    onPick={pickBg}
                    recent={recentColors}
                    themeColumns={THEME_COLUMNS}
                    standardColors={STANDARD_COLORS}
                    autoLabel={'⬜ 자동 (기본 피치)'}
                    onAuto={() => pickBg(BG_AUTO)}
                  />
                </div>
              )}

              {settingsTab === 'textColor' && (
                <div>
                  <div style={{ fontSize: 13, color: SUB, marginBottom: 10 }}>글자색</div>
                  <ColorPalette
                    current={disp.textColor}
                    onPick={(c) => { updateDisp({ textColor: c }); setRecentColors(pushRecentColor(c)) }}
                    recent={recentColors}
                    themeColumns={THEME_COLUMNS}
                    standardColors={STANDARD_COLORS}
                    autoLabel={'가 자동 (배경에 맞춤)'}
                    onAuto={() => updateDisp({ textColor: '' })}
                  />
                </div>
              )}

              {settingsTab === 'bubble' && (
                <div>
                  <div style={{ fontSize: 13, color: SUB, marginBottom: 10 }}>내 말풍선 색</div>
                  <ColorPalette
                    current={disp.myBubble}
                    onPick={(c) => { updateDisp({ myBubble: c }); setRecentColors(pushRecentColor(c)) }}
                    recent={recentColors}
                    themeColumns={THEME_COLUMNS}
                    standardColors={STANDARD_COLORS}
                    autoLabel={'💬 기본 (브라운)'}
                    onAuto={() => updateDisp({ myBubble: '' })}
                  />
                </div>
              )}
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

// ── 색 팔레트 (배경/글자색/말풍선 공통) ──────────────────────
function ColorPalette({
  current,
  onPick,
  recent,
  themeColumns,
  standardColors,
  autoLabel,
  onAuto,
}: {
  current: string
  onPick: (hex: string) => void
  recent: string[]
  themeColumns: string[][]
  standardColors: string[]
  autoLabel?: string
  onAuto?: () => void
}) {
  const BORDER = '0.5px solid #f0e0d5'
  const TITLE = '#96502e'
  const cell = (c: string, key: string) => {
    const on = current.toLowerCase() === c.toLowerCase()
    return (
      <button
        key={key}
        onClick={() => onPick(c)}
        aria-label={c}
        style={{
          width: '100%', aspectRatio: '1', borderRadius: 3,
          background: c,
          border: on ? '2px solid #b46e46' : '0.5px solid #d8ccc2',
          cursor: 'pointer', padding: 0,
        }}
      />
    )
  }
  return (
    <div>
      {autoLabel && onAuto && (
        <button
          onClick={onAuto}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '9px 10px', marginBottom: 12, borderRadius: 8,
            background: current === '' ? '#faf3ec' : '#fff',
            border: current === '' ? '1.5px solid #b46e46' : BORDER,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 13, color: TITLE }}>{autoLabel}</span>
        </button>
      )}
      <div style={{ fontSize: 11, color: '#a0968c', marginBottom: 6 }}>테마 색</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3, marginBottom: 12 }}>
        {themeColumns.map((col, ci) => col.map((c, ri) => cell(c, `t-${ci}-${ri}`)))}
      </div>
      <div style={{ fontSize: 11, color: '#a0968c', marginBottom: 6 }}>표준 색</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3, marginBottom: 12 }}>
        {standardColors.map((c) => cell(c, `s-${c}`))}
      </div>
      {recent.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: '#a0968c', marginBottom: 6 }}>최근 사용한 색</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3, marginBottom: 12 }}>
            {recent.map((c) => cell(c, `r-${c}`))}
          </div>
        </>
      )}
      <label
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '10px', borderRadius: 8, background: '#fff', border: BORDER, cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 15 }}>🎨</span>
        <span style={{ fontSize: 13, color: TITLE, flex: 1 }}>다른 색 직접 고르기…</span>
        <input
          type="color"
          value={current || '#FDF6F0'}
          onChange={(e) => onPick(e.target.value)}
          style={{ width: 28, height: 28, padding: 0, border: BORDER, borderRadius: 6, cursor: 'pointer', background: 'none' }}
        />
      </label>
    </div>
  )
}
