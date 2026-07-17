'use client'

// ============================================================================
// 홈 바텀시트 — Flexbox 방식 (JS 높이 측정 없음)
// ----------------------------------------------------------------------------
//   [핵심] getBoundingClientRect 같은 픽셀 측정을 아예 안 쓴다.
//     지난 실패 원인: 측정 타이밍이 어긋나 시트가 화면 최상단에 붙어
//     고정 영역을 통째로 가렸음. → 측정 자체를 없애 원천 차단.
//
//   구조:
//     - 시트는 페이지 흐름상 '고정 영역 바로 아래'에 그냥 놓인다(position: relative).
//       그래서 접힘 상태(translateY 0)면 자연히 고정영역이 다 보인다.
//     - 손잡이를 위로 끌면 시트가 transform:translateY(음수)로 위로 올라가
//       고정 영역을 덮는다. (lift = 위로 올라간 픽셀, 0 이상)
//     - 놓으면 절반 기준으로 완전히 올리거나(펼침) 내린다(접힘).
//
//   maxLift = 시트가 최대로 올라갈 수 있는 높이(px). 부모가 넘겨준다.
//             (대략 고정 영역 높이. 정확할 필요 없음 — 넘겨도 자연히 멈춤)
// ============================================================================

import { useEffect, useRef, useState } from 'react'

interface Props {
  maxLift?: number          // 시트가 위로 올라갈 최대 높이(px). 기본 320
  children: React.ReactNode
}

export default function HomeBottomSheet({ maxLift = 320, children }: Props) {
  const [expanded, setExpanded] = useState(false)   // 처음엔 접힘(고정영역 보임)
  const [lift, setLift] = useState(0)               // 위로 올라간 px (드래그 중 실시간)
  const drag = useRef({ active: false, startY: 0, startLift: 0, moved: false })

  const targetLift = expanded ? maxLift : 0
  const currentLift = drag.current.active ? lift : targetLift

  function onHandleDown(e: React.PointerEvent) {
    drag.current = { active: true, startY: e.clientY, startLift: currentLift, moved: false }
    setLift(currentLift)
    e.preventDefault()
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!drag.current.active) return
      // 위로 끌면(clientY 감소) lift 증가
      const dy = drag.current.startY - e.clientY
      if (Math.abs(dy) > 5) drag.current.moved = true
      let next = drag.current.startLift + dy
      if (next < 0) next = 0
      if (next > maxLift) next = maxLift
      setLift(next)
    }
    function onUp() {
      if (!drag.current.active) return
      const wasMoved = drag.current.moved
      const landing = lift
      drag.current.active = false
      if (!wasMoved) { setLift(expanded ? maxLift : 0); return }  // 클릭이면 상태 유지
      setExpanded(landing > maxLift / 2)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [lift, expanded, maxLift])

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 15,
        marginTop: '8px',
        transform: `translateY(-${currentLift}px)`,
        transition: drag.current.active ? 'none' : 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        background: '#FDF6F0',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -6px 24px rgba(120,70,40,0.12)',
        // 위로 올라간 만큼 아래 여백을 채워, 올렸을 때 시트 아래가 비지 않게
        marginBottom: `-${currentLift}px`,
      }}
    >
      {/* 드래그 핸들 */}
      <div
        onPointerDown={onHandleDown}
        style={{
          padding: '12px 0 10px',
          cursor: 'grab',
          display: 'flex',
          justifyContent: 'center',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <div style={{ width: '48px', height: '5px', borderRadius: '99px', background: '#e0d0c0' }} />
      </div>

      {/* 내용 (순수 스크롤+클릭 — 드래그는 손잡이로만) */}
      <div>
        {children}
      </div>
    </div>
  )
}
