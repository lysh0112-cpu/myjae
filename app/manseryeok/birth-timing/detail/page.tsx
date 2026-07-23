'use client'
// app/manseryeok/birth-timing/detail/page.tsx
//
// ★ 출산택일 v7 — 고른 시간의 해설 화면.
//
//   ⚠️ 2차 작업 대기 중. 지금은 어떤 시간을 골랐는지만 확인하는 임시 화면이다.
//
//   [붙일 것 — 연재쌤 문구 검수 후]
//   · 한 줄 요약        ← 최다 십신군
//   · ① 타고난 결       ← 일간 오행 + 최다 십신
//   · ② 힘의 세기       ← 신강약 + 뿌리 개수
//   · ③ 채워진 기운     ← 오행 분포
//   · ④ 인생 흐름       ← 대운 십신 변화 (20~60세)
//   · ⑤ 눈에 띄는 것    ← 귀인·네 갈래 뿌리·용신 등
//   · 원국표 (SajuWonguk 재사용) · 대운표 (UnTable 재사용)
//   · [이 아이 사주 자세히 보기] ← ★결제 관문 필요 (22-0 최우선 과제)
//
//   해설은 AI를 쓰지 않고 규칙 기반으로 조립한다(비용 0). 문장 조각은
//   일간오행 5 × 십신 5 × 신강약 4 = 14개 조각으로 100가지를 만든다.
//   검수표: 출산택일_성향문구_검수표.xlsx

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const C = { bg: '#FDF6F0', card: '#FFFBF7', line: '#F0E0D5', sub: '#B4785A', brand: '#96502E' }

const HOUR_TEXT: Record<string, string> = {
  '5': '巳시 09:30~11:30', '6': '午시 11:30~13:30',
  '7': '未시 13:30~15:30', '8': '申시 15:30~17:30',
}

function DetailInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const date = sp.get('date') ?? ''
  const hour = sp.get('hour') ?? ''

  const label = date.length === 8
    ? `${date.slice(0, 4)}년 ${Number(date.slice(4, 6))}월 ${Number(date.slice(6, 8))}일`
    : date

  return (
    <main style={{ minHeight: '100vh', background: C.bg }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 60px' }}>
        <button onClick={() => router.back()} style={{
          border: 'none', background: 'none', fontSize: 19, color: C.sub,
          cursor: 'pointer', padding: 0, marginBottom: 14,
        }}>←</button>

        <div style={{
          background: 'rgba(255,120,120,.06)', border: '1px solid rgba(255,120,120,.18)',
          borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 600,
          color: '#C0705E', lineHeight: 1.7, marginBottom: 18,
        }}>
          ※ 본 분석은 전통 사주명리에 기반한 참고 정보입니다. 실제 출산일·수술일 결정은
          산모와 아기의 건강을 최우선으로, 반드시 담당 산부인과 전문의와 상의해 결정하세요.
        </div>

        <h1 style={{ fontSize: 21, margin: '0 0 4px', letterSpacing: '-.5px' }}>{label}</h1>
        <div style={{ fontSize: 14, color: C.sub, marginBottom: 22 }}>{HOUR_TEXT[hour] ?? hour}</div>

        <div style={{
          background: C.card, border: `1px dashed ${C.line}`, borderRadius: 13,
          padding: '26px 18px', textAlign: 'center', color: C.sub,
          fontSize: 13, lineHeight: 1.85,
        }}>
          이 아이의 결을 풀어 드리는 화면을 준비하고 있어요.<br />
          곧 만나보실 수 있습니다.
        </div>
      </div>
    </main>
  )
}

export default function DetailPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: C.bg, color: C.brand, fontSize: 14,
      }}>불러오는 중…</div>
    }>
      <DetailInner />
    </Suspense>
  )
}
