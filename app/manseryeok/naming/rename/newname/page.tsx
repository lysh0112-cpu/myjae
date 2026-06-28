'use client'
import { useState, useEffect, CSSProperties } from 'react'
import { useRouter } from 'next/navigation'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'

const MY_INFO_KEY = 'myinfo'
const NAMING_RESULT_KEY = 'naming_last_result_v1'

interface SavedChar {
  hangul: string
  hanja: string
  strokes: number
  resourceOhaeng: string
}

// diagnosis 화면과 동일한 personKey 규칙 (동일인 식별)
function personKey(m: Record<string, unknown> | null): string {
  if (!m || !m.year) return ''
  const hourIdx = m.hour === '모름' || m.hour == null ? 'x' : m.hour
  return [m.calType || '양력', m.year, m.month, m.day, m.leapMonth || '0', hourIdx, m.gender || '남'].join('|')
}

export default function NewNamePage() {
  const router = useRouter()
  const [c1, setC1] = useState('')
  const [c2, setC2] = useState('')

  const [surname, setSurname] = useState<SavedChar | null>(null)
  const [loaded, setLoaded] = useState(false)

  // 본인 성씨를 '내 이름 풀이' 결과에서 이어받음 (사주 동일인일 때만)
  useEffect(() => {
    try {
      const m = JSON.parse(localStorage.getItem(MY_INFO_KEY) || '{}')
      const r = JSON.parse(localStorage.getItem(NAMING_RESULT_KEY) || '{}')
      const samePerson = r.personKey && r.personKey === personKey(m)
      if (samePerson && Array.isArray(r.chars) && r.chars[0]) {
        setSurname(r.chars[0] as SavedChar)
      }
    } catch {}
    setLoaded(true)
  }, [])

  const ready = !!surname && c1.trim().length > 0

  const proceed = () => {
    if (!ready) return
    const name = (c1 + c2).trim()
    router.push('/manseryeok/naming/rename/newhanja?name=' + encodeURIComponent(name))
  }

  const inputStyle: CSSProperties = {
    width: 48, height: 46, textAlign: 'center', fontSize: 18,
    borderRadius: 10, border: '1px solid ' + GOLD,
    background: 'rgba(250,199,117,0.08)', color: '#fff',
  }

  // 성씨 정보가 없으면(=이름 풀이 안 했으면) 안내
  if (loaded && !surname) {
    return (
      <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 16px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 20, cursor: 'pointer' }}>{'\u2039'}</button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>새 이름 직접 정하기</span>
        </div>
        <div style={{ padding: '40px 8px', textAlign: 'center', color: SUB, lineHeight: 1.8 }}>
          먼저 &lsquo;내 이름 풀이&rsquo;에서<br />이름을 입력해 주세요.
          <div style={{ marginTop: 20 }}>
            <button onClick={() => router.push('/manseryeok/naming/diagnosis')}
              style={{ padding: '12px 22px', borderRadius: 12, background: 'rgba(250,199,117,0.16)', border: '1px solid ' + GOLD, color: GOLD, fontWeight: 700, cursor: 'pointer' }}>
              이름 풀이로 가기 →
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!loaded) return <main style={{ minHeight: '100vh', background: '#1f1e1c' }} />

  return (
    <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 16px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 20, cursor: 'pointer' }}>{'\u2039'}</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>새 이름 직접 정하기</span>
      </div>
      <p style={{ fontSize: 12, color: SUB, margin: '0 0 16px', padding: '0 4px' }}>
        성씨 {surname!.hanja}({surname!.hangul})는 그대로 · 원하는 한글 이름을 적어주세요
      </p>
      <div style={{ background: CARD, border: '1px solid rgba(250,199,117,0.12)', borderRadius: 16, padding: '18px 16px' }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ fontSize: 22, color: SUB }}>{surname!.hanja}</span>
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
