'use client'
import { useState, useRef, useEffect } from 'react'
import CustomerHistory from './CustomerHistory'

// ============================================================
// 이전 상담 내역 (독립 플로팅 창)
//  - 상담사 메뉴바 "📋 상담내역" 버튼으로 열고 닫음
//  - 원래 가운데 칸 위쪽에 붙어 있던 CustomerHistory 를 그대로 담았다.
//    (계산·표시 로직은 손대지 않고 창 틀만 씌운 것)
//  - 제목줄 드래그로 이동, 오른쪽 아래 모서리로 크기 조절, X 닫기.
// ============================================================

type Props = {
  open: boolean
  onClose: () => void
  userId: string | null | undefined
  currentConsultationId: string | null | undefined
  customerName?: string
  fontSize?: number
}

export default function HistoryFloating({
  open, onClose, userId, currentConsultationId, customerName, fontSize = 13,
}: Props) {
  const [pos, setPos] = useState({ x: 140, y: 120 })
  const [size, setSize] = useState({ w: 440, h: 520 })
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null)

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (drag.current) {
        setPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy })
      } else if (resize.current) {
        const r = resize.current
        setSize({
          w: Math.max(320, r.w + (e.clientX - r.x)),
          h: Math.max(240, r.h + (e.clientY - r.y)),
        })
      }
    }
    const up = () => { drag.current = null; resize.current = null }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [])

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y, zIndex: 4900,
      width: size.w, height: size.h,
      background: '#1e1e34', color: '#ddd', borderRadius: 8,
      boxShadow: '0 12px 40px rgba(0,0,0,.5)', border: '1px solid rgba(255,255,255,0.12)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
    }}>
      {/* 제목줄 — 드래그로 이동 */}
      <div
        onMouseDown={e => { drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y } }}
        style={{
          height: 32, flexShrink: 0, cursor: 'move', userSelect: 'none',
          background: '#2b2b45', color: '#fff', display: 'flex', alignItems: 'center',
          padding: '0 10px', gap: 8, fontSize: 12, fontWeight: 600,
        }}>
        <span>📋 {customerName ? `${customerName} 상담 내역` : '이전 상담 내역'}</span>
        <button type="button" onClick={onClose}
          style={{
            marginLeft: 'auto', width: 22, height: 22, borderRadius: 5,
            border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff',
            cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
            WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation',
          }}>✕</button>
      </div>

      {/* 내용 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', fontSize: fontSize + 'px' }}>
        {userId ? (
          <CustomerHistory
            userId={userId}
            currentConsultationId={currentConsultationId}
            fontSize={fontSize}
          />
        ) : (
          <div style={{ padding: '26px 14px', textAlign: 'center', color: '#6a6a8a', fontSize: 12, lineHeight: 1.7 }}>
            상담 목록에서 고객을 먼저 선택해 주세요.
          </div>
        )}
      </div>

      {/* 크기 조절 손잡이 */}
      <div
        onMouseDown={e => { resize.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h } }}
        style={{
          position: 'absolute', right: 0, bottom: 0, width: 16, height: 16,
          cursor: 'nwse-resize', background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.25) 50%)',
        }}
        title="드래그로 창 크기 조절"
      />
    </div>
  )
}
