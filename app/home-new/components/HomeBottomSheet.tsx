'use client'

// ============================================================================
// 홈 바텀시트 (신한은행 방식) — v3 (top + bottom:0 방식, 넘침 스크롤 방지)
// ----------------------------------------------------------------------------
//   고정 영역(배너·유저카드) 위로 아래에서 올라오는 패널.
//   - 접힘(배너 보임) ↔ 펼침(위를 덮음)
//   - 손잡이(━)를 잡고 위/아래로 끌면 이동, 놓으면 가까운 쪽으로 스냅
//   - 시트 top을 직접 바꾸고 bottom:0으로 고정 → 시트 높이가 자동으로 맞아
//     내용 넘침/스크롤바 안 생김. 내용은 시트 안 스크롤 영역에서만 스크롤.
// ============================================================================

import { useEffect, useRef, useState } from 'react'

interface Props {
  collapsedTop: number
  expandedTop?: number
  bottomNavHeight?: number
  children: React.ReactNode
}

export default function HomeBottomSheet({
  collapsedTop,
  expandedTop = 10,
  bottomNavHeight = 70,
  children,
}: Props) {
  const [expanded, setExpanded] = useState(true)
  const [dragTop, setDragTop] = useState<number | null>(null)
  const drag = useRef({ active: false, startY: 0, startTop: 0, moved: false })

  const safeCollapsed = collapsedTop && collapsedTop > 120 ? collapsedTop : 360
  const snapTop = expanded ? expandedTop : safeCollapsed
  const currentTop = dragTop !== null ? dragTop : snapTop

  function onHandleDown(e: React.PointerEvent) {
    drag.current = { active: true, startY: e.clientY, startTop: currentTop, moved: false }
    setDragTop(currentTop)
    e.preventDefault()
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!drag.current.active) return
      const dy = e.clientY - drag.current.startY
      if (Math.abs(dy) > 5) drag.current.moved = true
      let next = drag.current.startTop + dy
      if (next < expandedTop) next = expandedTop
      if (next > safeCollapsed) next = safeCollapsed
      setDragTop(next)
    }
    function onUp() {
      if (!drag.current.active) return
      const wasMoved = drag.current.moved
      drag.current.active = false
      if (!wasMoved) { setDragTop(null); return }
      const mid = (expandedTop + safeCollapsed) / 2
      const landing = dragTop !== null ? dragTop : currentTop
      setExpanded(landing < mid)
      setDragTop(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragTop, currentTop, safeCollapsed, expandedTop])

  return (
    <div
      style={{
        position: 'absolute',
        top: currentTop,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#FDF6F0',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -6px 24px rgba(120,70,40,0.14)',
        transition: dragTop === null ? 'top 0.28s cubic-bezier(0.4,0,0.2,1)' : 'none',
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 드래그 핸들 */}
      <div
        onPointerDown={onHandleDown}
        style={{
          padding: '14px 0 12px',
          cursor: 'grab',
          display: 'flex',
          justifyContent: 'center',
          flexShrink: 0,
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <div style={{ width: '48px', height: '5px', borderRadius: '99px', background: '#e0d0c0' }} />
      </div>

      {/* 스크롤 영역: 순수 스크롤+클릭만 (드래그는 손잡이로) */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingBottom: `${bottomNavHeight + 16}px`,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </div>
    </div>
  )
}
