'use client'
// app/components/HomeBottomNav.tsx
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-07 (48부 8차) — 손님 하단바 «한 곳으로»  [대표님 지시]
//    「홈 · 선생님 소개 · 문의사항 · 보관함 — 이것이 좋네」
//
//  🔴 ★왜 부품으로 모았나
//     전에는 ★세 화면이 «각자» 똑같은 목록을 적어 두었습니다 —
//       app/home-new/page.tsx · app/archive/page.tsx · app/mypage-new/page.tsx
//     ⇒ 사본이 셋이라 ★한 곳만 고치면 화면마다 하단바가 달라집니다.
//     ⇒ 45부 교훈 BQ 「이 표는 사본입니다. 한쪽만 고치지 마십시오」와 같은 자리입니다.
//  ⛔⛔ ★탭을 늘리거나 이름을 바꿀 때는 «여기만» 고치십시오.
//       화면 쪽에 다시 적지 마십시오.
//
//  ⚠️ ★전에 있던 두 칸을 걷었습니다 —
//     「⊞ 서비스」  ★아무 데도 안 갔습니다 (wip: true — 눌러도 알림만).
//                   서비스 목록은 ★홈에서 조금만 내려가면 나옵니다.
//                   [대표님 「서비스버튼은 삭제하고」]
//     「💬 상담」   ★/manseryeok/reviews(후기)로 갔습니다 — 상담이 아니었습니다.
//                   (47부 인수인계서 10-6에 「상담이 아닙니다」라고 적혀 있던 자리)
//
//  ⚠️ ★후기 등록은 하단바에 «안» 넣었습니다 —
//     상담을 안 받은 사람에게는 평생 쓸 일 없는 칸이고,
//     받은 분도 «한 번» 쓰고 다시 안 누릅니다.
//     ⇒ 상담이 끝난 뒤 «그 자리» 에서 받는 것이 훨씬 많이 걷힙니다.
//     ⛔ 하단바에 다시 넣지 마십시오. 대표님과 의논해 정한 것입니다.
// ══════════════════════════════════════════════════════════════════

import { useRouter, usePathname } from 'next/navigation'

/**
 * ★손님 하단바 — 네 칸  [대표님 확정 2026-08-07]
 */
export const HOME_NAV = [
  { icon: '🏠', label: '홈',        href: '/home-new' },
  { icon: '🧑‍🏫', label: '선생님 소개', href: '/teachers' },
  { icon: '💬', label: '문의사항',   href: '/inquiry' },
  { icon: '📚', label: '보관함',     href: '/archive' },
] as const

export default function HomeBottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: '430px',
      display: 'flex', background: '#FFFBF7',
      borderTop: '0.5px solid #9c7a58', zIndex: 20,
    }}>
      {HOME_NAV.map((n) => {
        const active = pathname === n.href || pathname.startsWith(n.href + '/')
        return (
          <button
            key={n.label}
            onClick={() => router.push(n.href)}
            style={{
              flex: 1, padding: '10px 0', background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '3px',
            }}
          >
            <span style={{ fontSize: '18px' }}>{n.icon}</span>
            <span style={{
              fontSize: '10px',
              color: active ? '#c8783c' : '#b09079',
              fontWeight: active ? 600 : 400,
              whiteSpace: 'nowrap',
            }}>
              {n.label}
            </span>
            {/* 지금 자리 — 아이콘을 흐리게 하는 대신 밑줄로 (전에 하던 그대로) */}
            <span style={{
              height: '2px', width: '22px', borderRadius: '2px',
              background: active ? '#c8783c' : 'transparent',
            }} />
          </button>
        )
      })}
    </div>
  )
}
