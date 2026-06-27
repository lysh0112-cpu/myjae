'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'

export default function NewNamePage() {
  const router = useRouter()
  const [c1, setC1] = useState('')
  const [c2, setC2] = useState('')

  const ready = c1.trim().length > 0

  const proceed = () => {
    if (!ready) return
    const name = (c1 + c2).trim()
    router.push('/manseryeok/naming/rename/hanja?count=2&newname=' + encodeURIComponent(name))
  }

  const inputStyle = {
    width: 48, height: 46, textAlign: 'center', fontSize: 18,
    borderRadius: 10, border: '1px solid ' + GOLD,
    background: 'rgba(250,199,117,0.08)', color: '#fff',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 16px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 20, cursor: 'pointer' }}>{'\u2039'}</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>새 이름 직접 정하기</span>
      </div>
      <p style={{ fontSize: 12, color: SUB, margin: '0 0 16px', padding: '0 4px' }}>
        성씨 吳(오)는 고정 · 원하는 한글 이름을 적어주세요
      </p>

      <div style={{ background: CARD, border: '1px solid rgba(250,199,117,0.12)', borderRadius: 16, padding: '18px 16px' }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ fontSize: 22, color: SUB }}>吳</span>
          <input value={c1} onChange={(e) => setC1(e.target.value.slice(0, 1))} placeholder="서" style={inputStyle} />
          <input value={c2} onChange={(e) => setC2(e.target.value.slice(0, 1))} placeholder="연" style={inputStyle} />
        </div>
        <p style={{ fontSize: 11, color: SUB, textAlign: 'center', margin: '12px 0 0' }}>
          외자 이름이면 한 칸만 채우셔도 됩니다
        </p>
      </div>

      <button onClick={proceed} disabled={!ready} className="active:scale-95"
        style={{ marginTop: 16, width: '100%', background: ready ? 'rgba(250,199,117,0.16)' : CARD,
          border: '1px solid ' + (ready ? GOLD : 'rgba(250,199,117,0.12)'), borderRadius: 14, padding: 14,
          color: ready ? GOLD : '#555', fontWeight: 700, fontSize: 14, cursor: ready ? 'pointer' : 'default' }}>
        한자 추천받기 {'\u2192'}
      </button>
    </main>
  )
}
