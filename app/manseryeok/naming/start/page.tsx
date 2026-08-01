'use client'

// app/manseryeok/naming/start/page.tsx
//
// ┌───────────────────────────────────────────────────────────────┐
// │  이름 시작하기 — 「풀이할까요, 지어 드릴까요」 갈림길              │
// └───────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 (Phase 2-B) — 대표님 지시
//
//   보관함의 [+ 새 이름 풀이 / 작명하기] 가 «갈 곳» 입니다.
//   손님이 여기서 «무엇을 원하는지» 고르고, 그에 맞는 길로 갑니다.
//
//   ⚠️ 사주 정보는 «이미 앞에서» 받았습니다 (PersonPickerModal · URL 파라미터).
//      여기서 «다시 묻지 않습니다» — 두 번 묻는 화면은 손님이 지칩니다.
//      ★넘어온 것을 그대로 다음 화면에 실어 보냅니다.
//
//   [갈림길]
//     기존 이름 풀이하기   → /manseryeok/naming/diagnosis   (그 사람 사주를 실어)
//     신생아·개명 작명하기 → /manseryeok/naming/rename/newname (작명 옵션까지 실어)
//
//   ⚠️ 작명 옵션(스타일·선호 발음·피할 이름)은 «교재 밖 취향» 입니다.
//      길흉 판정에 쓰지 않습니다. lib/saju/nameRecommend.ts 의 주석을 보십시오.
// ══════════════════════════════════════════════════════════════════

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PageHeader from '@/app/components/common/PageHeader'

const GOLD = '#c8783c'
const CARD = '#FFFBF7'
const LINE = '#f0e0d5'
const INK = '#3a2e28'
const SUB = '#8a7063'

/** 손맛 — 누를 때 반응 (요청 6) */
const PRESS: React.CSSProperties = {
  transition: 'all .12s cubic-bezier(.4,0,.2,1)',
}

type Mode = 'diagnosis' | 'naming' | null
/* 어감/성향 선호 필터 (교재 밖 참고용) */
type Style = '남성적' | '여성적' | '중성적'
type Kind = '신생아' | '개명'

function StartInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [mode, setMode] = useState<Mode>(null)
  const [kind, setKind] = useState<Kind>('개명')
  const [style, setStyle] = useState<Style | null>(null)
  const [prefer, setPrefer] = useState('')
  const [avoid, setAvoid] = useState('')

  /** 앞 화면에서 실어 온 사주·관계를 그대로 넘깁니다 */
  const carried = useMemo(() => {
    const q = new URLSearchParams()
    for (const k of ['year', 'month', 'day', 'gender', 'calType', 'leapMonth', 'hour', 'relation', 'name']) {
      const v = sp.get(k)
      if (v) q.set(k, v)
    }
    return q
  }, [sp])

  const who = sp.get('name') || (sp.get('year') ? `${sp.get('year')}년생` : '나')

  function go() {
    if (mode === 'diagnosis') {
      router.push(`/manseryeok/naming/diagnosis${carried.toString() ? `?${carried}` : ''}`)
      return
    }
    if (mode === 'naming') {
      const q = new URLSearchParams(carried)
      q.set('kind', kind)
      /* 어감/성향 선호 필터 (교재 밖 참고용) — 길흉 판정 아님 */
      if (style) q.set('style', style)
      const p = prefer.trim()
      if (p) q.set('prefer', p)
      const a = avoid.trim()
      if (a) q.set('avoid', a)
      router.push(`/manseryeok/naming/rename/newname?${q}`)
    }
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#FDF6F0', maxWidth: 430, margin: '0 auto',
      paddingBottom: 40,
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif",
    }}>
      <PageHeader title="이름 시작하기" onBack={() => router.back()} />

      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12, color: SUB, marginBottom: 14, lineHeight: 1.7 }}>
          <b style={{ color: INK }}>{who}</b> 님의 사주로 시작합니다.
          {' '}무엇을 도와드릴까요?
        </div>

        {/* ── 갈림길 ── */}
        <ModeCard
          on={mode === 'diagnosis'}
          onClick={() => setMode('diagnosis')}
          title="이미 있는 이름 풀이하기"
          desc="지금 쓰는 이름이 사주와 어떻게 어울리는지 다섯 갈래로 살펴봅니다."
          hint="한글 이름과 한자를 고르시면 됩니다"
        />
        <ModeCard
          on={mode === 'naming'}
          onClick={() => setMode('naming')}
          title="새 이름 지어 드리기"
          desc="사주가 바라는 기운을 담아 한글 이름을 골라 드리고, 한자까지 맞춰 드립니다."
          hint="신생아 · 개명 둘 다 됩니다"
        />

        {/* ── 작명일 때만 펼쳐지는 자리 ── */}
        {mode === 'naming' && (
          <div style={{
            background: CARD, border: `1px solid ${LINE}`, borderRadius: 14,
            padding: '14px 13px', marginTop: 4, marginBottom: 14,
          }}>
            <Row label="누구의 이름인가요">
              {(['신생아', '개명'] as Kind[]).map((k) => (
                <Chip key={k} on={kind === k} onClick={() => setKind(k)}>{k}</Chip>
              ))}
            </Row>

            {/* ⚠️ 아래 셋은 «교재 밖 취향» 입니다 — 길흉 판정에 쓰지 않습니다 */}
            <Row label="어떤 결이 좋으세요" note="고르지 않으셔도 됩니다">
              {(['남성적', '여성적', '중성적'] as Style[]).map((v) => (
                <Chip key={v} on={style === v} onClick={() => setStyle(style === v ? null : v)}>{v}</Chip>
              ))}
            </Row>

            <Field
              label="꼭 넣고 싶은 소리"
              placeholder="예) 민, 서"
              value={prefer}
              onChange={setPrefer}
            />
            <Field
              label="피하고 싶은 글자"
              placeholder="예) 항렬자·친척 이름의 한 글자"
              value={avoid}
              onChange={setAvoid}
              note="한 글자를 적으시면 그 글자가 든 이름을 모두 뺍니다"
            />

            <div style={{ fontSize: 10.5, color: '#a8927e', lineHeight: 1.65, marginTop: 10 }}>
              결과 · 어감에 대한 취향은 참고로만 씁니다.
              이름의 길흉은 교재의 기준으로 따로 살핍니다.
            </div>
          </div>
        )}

        <button
          onClick={go}
          disabled={!mode}
          style={{
            ...PRESS,
            width: '100%', padding: 15, borderRadius: 13, marginTop: 8,
            background: mode ? GOLD : '#e8ddd3',
            border: 'none', color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: mode ? 'pointer' : 'default',
          }}>
          {mode === 'naming' ? '이름 지으러 가기 →' : mode === 'diagnosis' ? '이름 풀이하러 가기 →' : '위에서 골라 주세요'}
        </button>
      </div>
    </main>
  )
}

// ── 작은 부품들 ────────────────────────────────────────────────────

function ModeCard({ on, onClick, title, desc, hint }: {
  on: boolean; onClick: () => void; title: string; desc: string; hint: string
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        ...PRESS,
        width: '100%', textAlign: 'left', marginBottom: 10, cursor: 'pointer',
        background: on ? '#fff7f0' : CARD,
        border: `1.5px solid ${on ? GOLD : LINE}`,
        borderRadius: 14, padding: '15px 14px',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
        <span style={{
          width: 16, height: 16, borderRadius: 9, flexShrink: 0,
          border: `1.5px solid ${on ? GOLD : '#d8c8bb'}`,
          background: on ? GOLD : 'transparent',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 10,
        }}>{on ? '✓' : ''}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: on ? GOLD : INK }}>{title}</span>
      </div>
      <div style={{ fontSize: 12, color: '#5c3a1e', lineHeight: 1.7, paddingLeft: 23 }}>{desc}</div>
      <div style={{ fontSize: 11, color: SUB, marginTop: 4, paddingLeft: 23 }}>{hint}</div>
    </button>
  )
}

function Row({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11.5, color: SUB, marginBottom: 6 }}>
        {label}{note && <span style={{ color: '#b09a86', marginLeft: 5 }}>· {note}</span>}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        ...PRESS,
        fontSize: 12, padding: '7px 13px', borderRadius: 12, cursor: 'pointer',
        background: on ? GOLD : '#fff',
        color: on ? '#fff' : '#5c3a1e',
        border: `1px solid ${on ? GOLD : LINE}`,
        fontWeight: on ? 600 : 400,
      }}>
      {children}
    </button>
  )
}

function Field({ label, placeholder, value, onChange, note }: {
  label: string; placeholder: string; value: string
  onChange: (v: string) => void; note?: string
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11.5, color: SUB, marginBottom: 6 }}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 11,
          border: `1px solid ${LINE}`, background: '#fff',
          fontSize: 13, color: INK, outline: 'none',
        }}
      />
      {note && <div style={{ fontSize: 10.5, color: '#a8927e', marginTop: 4 }}>{note}</div>}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <StartInner />
    </Suspense>
  )
}
