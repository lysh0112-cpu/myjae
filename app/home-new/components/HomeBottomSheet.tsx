'use client'

// ============================================================================
// 홈 바텀시트 (신한은행 방식) — v2 안정화
// ----------------------------------------------------------------------------
//   고정 영역(배너·유저카드) 위로 아래에서 올라오는 패널.
//   - 접힘(배너 보임) ↔ 펼침(위를 덮음) 두 단계
//   - 손잡이를 잡고 위/아래로 끌면 이동, 놓으면 가까운 쪽으로 스냅
//   - 펼친 상태에서 내용은 시트 안에서 스크롤
//   collapsedTop = 접힘 시 시트 상단 y(px). (측정 실패 대비 안전 하한선 있음)
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
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [dragTop, setDragTop] = useState<number | null>(null)
  const drag = useRef({ active: false, startY: 0, startTop: 0, content: false, moved: false })

  // 측정 실패로 collapsedTop이 비정상이면 안전값 (배너가 안 보이는 것 방지)
  const safeCollapsed = collapsedTop && collapsedTop > 120 ? collapsedTop : 360

  const snapTop = expanded ? expandedTop : safeCollapsed
  const currentTop = dragTop !== null ? dragTop : snapTop

  function onHandleDown(e: React.PointerEvent) {
    drag.current = { active: true, startY: e.clientY, startTop: currentTop, content: false, moved: false }
    setDragTop(currentTop)
    e.preventDefault()
  }

  function onContentDown(e: React.PointerEvent) {
    const sc = scrollRef.current
    if (!sc || sc.scrollTop > 0) return
    // 버튼·링크 등 인터랙티브 요소 위에서는 드래그 시작하지 않음 (클릭 보장)
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, textarea, select, [role="button"]')) return
    drag.current = { active: true, startY: e.clientY, startTop: currentTop, content: true, moved: false }
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!drag.current.active) return
      const dy = e.clientY - drag.current.startY
      if (Math.abs(dy) > 5) drag.current.moved = true   // 5px 넘게 움직여야 드래그로 인정
      if (drag.current.content && dy < 0) return
      let next = drag.current.startTop + dy
      if (next < expandedTop) next = expandedTop
      if (next > safeCollapsed) next = safeCollapsed
      setDragTop(next)
    }
    function onUp() {
      if (!drag.current.active) return
      const wasMoved = drag.current.moved
      drag.current.active = false
      // 실제로 끌지 않았으면(=탭/클릭) 시트 상태 안 건드림 → 버튼 클릭 정상 동작
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
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: `translateX(-50%) translateY(${currentTop}px)`,
        width: '100%',
        maxWidth: '430px',
        height: '100%',
        background: '#FDF6F0',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -6px 24px rgba(120,70,40,0.14)',
        transition: dragTop === null ? 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' : 'none',
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        willChange: 'transform',
      }}
    >
      {/* 드래그 핸들 */}
      <div
        onPointerDown={onHandleDown}
        style={{
          padding: '10px 0 8px',
          cursor: 'grab',
          display: 'flex',
          justifyContent: 'center',
          flexShrink: 0,
          touchAction: 'none',
        }}
      >
        <div style={{ width: '40px', height: '5px', borderRadius: '99px', background: '#e0d0c0' }} />
      </div>

      {/* 스크롤 영역: 하단 여백 = 네비 높이 + 시트가 내려간 만큼(currentTop) */}
      <div
        ref={scrollRef}
        onPointerDown={onContentDown}
        style={{
          flex: 1,
          overflowY: expanded ? 'auto' : 'hidden',
          overflowX: 'hidden',
          paddingBottom: `${bottomNavHeight + Math.round(currentTop) + 12}px`,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </div>
    </div>
  )
}
