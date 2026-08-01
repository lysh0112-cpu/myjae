'use client'

// app/manseryeok/naming/rename/newborn/page.tsx
//
// ┌───────────────────────────────────────────────────────────────┐
// │  아기 이름 짓기 — «입구» (E단계 재오픈)                            │
// └───────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 (43부 · E) — 대표님 승인 「신생아 작명 재오픈」
//
//  [전에는]  이 화면이 «준비중 안내» 였습니다.
//    그리고 아무도 이 화면을 부르지 않았습니다 — 홈 12지신 카드가 사라졌기 때문입니다.
//    ⚠️ 닫혀 있던 까닭은 «기능 미완성» 이었습니다. 그 기능이 42·43부에 갖춰졌습니다.
//
//  [이제]  이 화면은 «입구» 입니다. 폼을 여기 다시 만들지 «않습니다».
//    ★보관함의 「+ 새 이름 짓기」 가 쓰는 그 폼(PersonFormPitch namingMode)으로 보냅니다.
//      · 성씨 «필수» · 태명·호칭 «선택» · 생년월일시
//      · 거기서 받은 것이 Step 2 → 3 → 4 로 그대로 흘러갑니다
//    ⚠️ 폼을 여기 또 만들면 «같은 값을 두 곳에서 받게» 되고, 언젠가 갈립니다. (교훈 CJ)
//
//  ⚠️ 이 화면은 판정을 하지 않습니다. 길을 안내만 합니다.
// ══════════════════════════════════════════════════════════════════

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'

const GOLD = '#c8783c'
const CARD = '#FFFBF7'
const LINE = '#f0e0d5'
const INK = '#3a2e28'
const SUB = '#8a7063'
const PRESS = { transition: 'all .12s cubic-bezier(.4,0,.2,1)' } as const

/** 아기 작명이 «무엇을 보는가» — 교재의 네 축입니다 */
const AXES = [
  { icon: '🔊', title: '발음오행', desc: '성씨와 이름이 소리로 잘 흐르는지 (교재 3장 125칸)' },
  { icon: '🌱', title: '자원오행', desc: '한자가 품은 기운이 아기 사주를 받쳐 주는지' },
  { icon: '🔢', title: '수리 4격', desc: '획수가 이루는 네 자리의 배열' },
  { icon: '☯️', title: '음양', desc: '획수의 홀짝이 한쪽으로 치우치지 않는지' },
]

function NewbornInner() {
  const router = useRouter()

  /**
   * ★보관함으로 보내면서 «작명 폼을 열어 달라» 고 알려 줍니다.
   *   보관함이 open=작명 을 보고 그 자리에서 폼을 띄웁니다.
   */
  //   ★mode=naming 을 함께 실어 «작명 보관함» 으로 들어갑니다 (43부 2차)
  const start = () => router.push('/manseryeok/naming/naming-storage?open=작명')

  return (
    <main style={{
      minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto',
      padding: '8px 16px 40px',
    }}>
      {/* ── 머리 ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 10, padding: '13px 4px',
        background: 'rgba(253,246,240,0.96)', backdropFilter: 'blur(10px)',
      }}>
        <button onClick={() => router.push('/home-new')} aria-label="뒤로"
          style={{ background: 'none', border: 'none', color: '#999', fontSize: 20, cursor: 'pointer', padding: 0 }}>
          {'\u2039'}
        </button>
        <span style={{ fontSize: 15, fontWeight: 500, color: INK }}>아기 이름 짓기</span>
      </div>

      <div style={{ textAlign: 'center', padding: '18px 8px 22px' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>👶</div>
        <div style={{ fontSize: 19, fontWeight: 700, color: '#8f3d0e', marginBottom: 8, lineHeight: 1.5 }}>
          아직 이름이 없어도 괜찮아요
        </div>
        <div style={{ fontSize: 13, color: SUB, lineHeight: 1.8 }}>
          성씨와 생년월일시만 알려 주시면<br />
          아기 사주에 맞는 한글 이름부터 골라 드립니다.
        </div>
      </div>

      {/* ── 세 걸음 ── */}
      <div style={{
        background: CARD, border: `1px solid ${LINE}`, borderRadius: 16,
        padding: '16px 16px 6px', marginBottom: 14,
      }}>
        {[
          { n: 1, t: '성씨와 생년월일시', d: '태명이 있으시면 함께 적어 주세요 (선택)' },
          { n: 2, t: '한글 이름 고르기', d: '사주에 맞춰 뽑은 이름 열 개 · 교재 사전 · 직접 쓰기' },
          { n: 3, t: '한자 고르기', d: '성씨 한자부터 고르고, 이름 한자를 맞춥니다' },
        ].map((s) => (
          <div key={s.n} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <span style={{
              flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
              background: GOLD, color: '#fff', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{s.n}</span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>{s.t}</div>
              <div style={{ fontSize: 11.5, color: SUB, marginTop: 2, lineHeight: 1.6 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 무엇을 보는가 ── */}
      <div style={{ fontSize: 12, color: SUB, marginBottom: 8, paddingLeft: 4 }}>
        이렇게 살펴 드려요
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
        {AXES.map((a) => (
          <div key={a.title} style={{
            background: CARD, border: `1px solid ${LINE}`, borderRadius: 13, padding: '12px 12px',
          }}>
            <div style={{ fontSize: 18, marginBottom: 5 }}>{a.icon}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: INK }}>{a.title}</div>
            <div style={{ fontSize: 10.5, color: SUB, marginTop: 3, lineHeight: 1.6 }}>{a.desc}</div>
          </div>
        ))}
      </div>

      <button onClick={start} className="active:scale-95"
        style={{
          ...PRESS, width: '100%', padding: 16, borderRadius: 14,
          background: '#c8783c', border: 'none', color: '#fff',
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}>
        아기 이름 지으러 가기 →
      </button>

      {/* ★대법원 인명용 한자 — 한자 고르는 화면에도 있지만 여기서 «미리» 알려 드립니다 */}
      <div style={{
        marginTop: 14, fontSize: 10.5, color: '#a8927e', lineHeight: 1.7, padding: '0 4px',
      }}>
        ⚠️ 출생신고에는 <b>대법원 인명용 한자</b>만 쓸 수 있습니다.
        고르신 한자가 그 표에 있는지 대법원 전자가족관계등록시스템에서 한 번 더 확인해 주세요.
      </div>
    </main>
  )
}

export default function NewbornPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <NewbornInner />
    </Suspense>
  )
}
