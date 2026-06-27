'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'
const GREEN = '#81c784'

const SAMPLE = [
  { h: '娟', m: '예쁠', fit: true },
  { h: '演', m: '펼', fit: true },
  { h: '沇', m: '물흐를', fit: true },
  { h: '涓', m: '시내', fit: true },
  { h: '嬿', m: '아름다울', fit: true },
  { h: '渷', m: '물이름', fit: true },
  { h: '妍', m: '고울', fit: false, cur: true },
  { h: '硏', m: '갈', fit: false },
  { h: '延', m: '늘일', fit: false },
  { h: '燃', m: '탈', fit: false },
  { h: '緣', m: '인연', fit: false },
  { h: '鳶', m: '솔개', fit: false },
]

function HanjaInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const count = sp.get('count') || '1'
  const [picked, setPicked] = useState(null)

  const fit = SAMPLE.filter((x) => x.fit)
  const rest = SAMPLE.filter((x) => !x.fit)

  const cell = (x) => {
    const on = picked === x.h
    return (
      <button key={x.h} onClick={() => setPicked(x.h)} className="active:scale-95"
        style={{ position: 'relative', padding: '10px 4px 8px', textAlign: 'center', borderRadius: 16,
          background: on ? 'rgba(250,199,117,0.16)' : CARD,
          border: '1px solid ' + (on ? GOLD : 'rgba(250,199,117,0.12)'),
          opacity: x.cur && !on ? 0.55 : 1, cursor: 'pointer', transition: 'transform 0.15s ease' }}>
        {x.fit && <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 10, color: GREEN }}>{'\u2713'}</span>}
        <div style={{ fontSize: 24, fontWeight: 600, color: on ? GOLD : '#fff', lineHeight: 1.1 }}>{x.h}</div>
        <div style={{ fontSize: 10, color: SUB, marginTop: 3 }}>{x.m}</div>
        {x.cur && <div style={{ fontSize: 9, color: SUB, marginTop: 1 }}>현재</div>}
      </button>
    )
  }

  const confirm = () => {
    if (!picked) return
    router.push('/manseryeok/naming/rename/result?hanja=' + encodeURIComponent(picked))
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 16px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 20, cursor: 'pointer' }}>{'\u2039'}</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{"'연' 한자 고르기"}</span>
      </div>
      <p style={{ fontSize: 12, color: SUB, margin: '0 0 16px', padding: '0 4px' }}>
        {count === '2' ? '吳 ___ ___ · 두 글자를 차례로 고릅니다' : '吳 ___ 嬉 · 가운데 글자를 바꾸는 중'}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, display: 'inline-block' }} />
        <span style={{ fontSize: 11, color: SUB }}>사주(용신 수)에 맞는 한자 · 추천</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>{fit.map(cell)}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: SUB, display: 'inline-block' }} />
        <span style={{ fontSize: 11, color: SUB }}>{"그 외 '연' 한자"}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>{rest.map(cell)}</div>

      <div style={{ marginTop: 20, borderRadius: 16, padding: '13px 16px',
        background: picked ? 'rgba(250,199,117,0.16)' : CARD,
        border: '1px solid ' + (picked ? GOLD : 'rgba(250,199,117,0.12)'),
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: picked ? GOLD : SUB }}>{picked ? '선택 : ' + picked : '한자를 선택하세요'}</span>
        <button disabled={!picked} onClick={confirm}
          style={{ fontSize: 13, fontWeight: 600, color: picked ? GOLD : '#555', background: 'none', border: 'none', cursor: picked ? 'pointer' : 'default' }}>
          이 글자로 {'\u2192'}
        </button>
      </div>
    </main>
  )
}

export default function HanjaPickPage() {
  return (
    <Suspense fallback={<div style={{ background: '#1f1e1c', minHeight: '100vh' }} />}>
      <HanjaInner />
    </Suspense>
  )
}
