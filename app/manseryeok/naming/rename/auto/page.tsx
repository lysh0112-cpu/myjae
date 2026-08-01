'use client'

// app/manseryeok/naming/rename/auto/page.tsx
//
// ┌───────────────────────────────────────────────────────────────┐
// │  ★«가짜 데이터» 를 걷어낸 자리 — 이제 진짜 엔진으로 보냅니다        │
// └───────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 (43부) — 대표님 확정 「전면 삭제 후 엔진 연동」
//
//  🔴 [무엇이 있었나]
//    이 화면에 «손으로 박아 놓은 이름 열 개» 가 있었습니다 —
//      吳娟熙(오연희) · 吳瑞潤(오서윤) · 吳沇河(오연하) …
//    ⚠️ 어느 손님이 들어와도 «오씨 이름 열 개» 가 나왔습니다.
//       사주를 보지 않았고, 점수도 「좋음/보통」을 손으로 적어 둔 것이었습니다.
//       「사주(용신)에 맞춰 지은 이름입니다」 라고 «적혀만» 있었습니다.
//    ★손님이 들어오면 «남의 이름» 을 자기 것으로 볼 수 있었습니다.
//
//  [왜 여기에 엔진을 다시 붙이지 «않는가»]
//    ⚠️ 이름 추천은 이미 있습니다 — lib/saju/nameRecommend.ts 를
//       Step 2(rename/newname)의 NamePicker 가 씁니다.
//       여기에 또 만들면 «같은 값을 두 곳에서» 내게 되고, 언젠가 갈립니다. (교훈 CJ·ET)
//    ★그래서 이 화면은 «엔진을 가진 곳으로 보내는 다리» 로 둡니다.
//
//  [왜 파일을 지우지 «않는가»]
//    ⚠️ 지금 아무도 이 주소를 부르지 않습니다. 그래도 «옛 링크·북마크·홍보물» 이
//       살아 있을 수 있습니다. 지우면 그분들이 404 를 봅니다.
//       ★교훈 AM — 안 쓰인다고 지우면, 쓰이던 길이 함께 끊깁니다.
//    → 빈손으로 두지 않고 «갈 곳» 을 알려 줍니다.
//
//  ⚠️ 여기에 이름 목록을 «다시» 만들지 마십시오. 판정도 하지 마십시오.
// ══════════════════════════════════════════════════════════════════

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const GOLD = '#c8783c'
const SUB = '#8a7063'

function AutoInner() {
  const router = useRouter()
  const sp = useSearchParams()

  /** ★앞 화면이 실어 준 것(사주·성씨·kind)을 «잃지 않고» 그대로 넘깁니다 */
  const carried = (() => {
    const q = new URLSearchParams()
    for (const [k, v] of sp?.entries() ?? []) {
      if (k === 'n') continue          // 옛 「몇 개 보여 줄까」 — 이제 엔진이 열 개를 냅니다
      if (v) q.set(k, v)
    }
    return q.toString()
  })()

  const to = '/manseryeok/naming/rename/newname' + (carried ? `?${carried}` : '')

  // ★바로 보냅니다. 손님을 여기 세워 둘 까닭이 없습니다.
  useEffect(() => { router.replace(to) }, [router, to])

  return (
    <main style={{
      minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 34, color: GOLD, marginBottom: 14 }}>✦</div>
      <div style={{ fontSize: 14, color: '#3a2e28', lineHeight: 1.8, marginBottom: 22 }}>
        이름 추천 화면으로 옮겨 드릴게요.
        <div style={{ fontSize: 12, color: SUB, marginTop: 8 }}>
          사주를 보고 이름을 골라 드리는 자리로 바뀌었습니다.
        </div>
      </div>
      {/* ⚠️ 자동 이동이 막힌 경우(옛 브라우저 등)를 위해 손으로 갈 길도 둡니다 */}
      <button onClick={() => router.replace(to)}
        style={{
          padding: '13px 26px', borderRadius: 12, background: '#c8783c',
          border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
        이름 추천받으러 가기 →
      </button>
    </main>
  )
}

export default function AutoRecPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <AutoInner />
    </Suspense>
  )
}
