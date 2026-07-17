'use client'

// ============================================================================
// 홈 바텀시트 (신한은행 방식)
// ----------------------------------------------------------------------------
//   고정 영역(배너·유저카드·아카이브 버튼) 위로, 아래에서 올라오는 패널.
//   - 두 단계 스냅: '접힘'(collapsed, 배너 보임) ↔ '펼침'(expanded, 위를 덮음)
//   - 손잡이(핸들)를 잡고 위/아래로 끌면 이동, 놓으면 가까운 쪽으로 스냅
//   - 펼친 상태에서 내용은 시트 안에서 스크롤. 스크롤 최상단에서 아래로 끌면 접힘
//
//   부모(page.tsx)는 <HomeBottomSheet collapsedTop={...}>children</HomeBottomSheet>
//   형태로 서비스리스트+후기를 children 으로 넣는다.
//   collapsedTop = 접힘 상태에서 시트 상단이 놓일 화면 y(px). (고정영역 높이)
// ============================================================================

import { useEffect, useRef, useState } from 'react'

interface Props {
  collapsedTop: number      // 접힘 상태에서 시트 top (고정영역 아래)
  expandedTop?: number      // 펼침 상태 시트 top (기본 8px = 거의 전체화면)
  bottomNavHeight?: number  // 하단 네비 높이(시트가 그 위에서 끝나도록)
  children: React.ReactNode
}

export default function HomeBottomSheet({
  collapsedTop,
  expandedTop = 8,
  bottomNavHeight = 70,
  children,
}: Props) {
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [expanded, setExpanded] = useState(true)   // 홈 들어오면 펼쳐진 상태로 시작
  // 드래그 중 실시간 top(px). null이면 스냅 위치(CSS transition) 사용.
  const [dragTop, setDragTop] = useState<number | null>(null)

  const drag = useRef({ active: false, startY: 0, startTop: 0, content: false })

  const snapTop = expanded ? expandedTop : collapsedTop
  const currentTop = dragTop !== null ? dragTop : snapTop

  // 핸들 드래그 시작
  function onHandleDown(e: React.PointerEvent) {
    drag.current = { active: true, startY: e.clientY, startTop: currentTop, content: false }
    setDragTop(currentTop)
    e.preventDefault()
  }

  // 시트 내용(스크롤 영역) 위에서의 드래그 — 스크롤이 최상단일 때만 시트를 내림
  function onContentDown(e: React.PointerEvent) {
    const sc = scrollRef.current
    if (!sc || sc.scrollTop > 0) return
    drag.current = { active: true, startY: e.clientY, startTop: currentTop, content: true }
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!drag.current.active) return
      const dy = e.clientY - drag.current.startY
      // 내용에서 시작한 드래그는 '아래로 내리는' 것만 시트 이동(위로는 스크롤)
      if (drag.current.content && dy < 0) return
      let next = drag.current.startTop + dy
      if (next < expandedTop) next = expandedTop
      if (next > collapsedTop) next = collapsedTop
      setDragTop(next)
    }
    function onUp() {
      if (!drag.current.active) return
      drag.current.active = false
      const mid = (expandedTop + collapsedTop) / 2
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
  }, [dragTop, currentTop, collapsedTop, expandedTop])

  return (
    <div
      ref={sheetRef}
      style={{
        position: 'fixed',
        top: currentTop,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '430px',
        bottom: 0,
        background: '#FDF6F0',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -6px 24px rgba(120,70,40,0.14)',
        transition: dragTop === null ? 'top 0.28s cubic-bezier(0.4,0,0.2,1)' : 'none',
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        touchAction: 'none',
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

      {/* 스크롤 영역 (펼쳤을 때만 스크롤, 접혔을 땐 넘치는 부분 잘림) */}
      <div
        ref={scrollRef}
        data-sheet-scroll
        onPointerDown={onContentDown}
        style={{
          flex: 1,
          overflowY: expanded ? 'auto' : 'hidden',
          overflowX: 'hidden',
          paddingBottom: `${bottomNavHeight + 12}px`,
          WebkitOverflowScrolling: 'touch',
          touchAction: expanded ? 'pan-y' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}
