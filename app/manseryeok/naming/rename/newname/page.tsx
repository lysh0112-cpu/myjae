'use client'
import { useState, useEffect, useRef, CSSProperties } from 'react'
import { useRouter } from 'next/navigation'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'

const MY_INFO_KEY = 'myinfo'
const NAMING_RESULT_KEY = 'naming_last_result_v1'
const NEWBORN_SURNAME_KEY = 'newborn_surname_v1'

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

// 한글 음절 한 글자만 남기기 (조합 완료 후 정리용)
function firstHangul(s: string): string {
  const arr = Array.from(s)
  for (const ch of arr) {
    const code = ch.charCodeAt(0)
    if (code >= 0xac00 && code <= 0xd7a3) return ch
  }
  // 완성형 한글이 아직 없으면(조합 중) 원본 마지막 글자 유지
  return arr.length > 0 ? arr[arr.length - 1] : ''
}

export default function NewNamePage() {
  const router = useRouter()

  const [count, setCount] = useState<1 | 2 | null>(null)
  const [c1, setC1] = useState('')
  const [c2, setC2] = useState('')

  // 한글 조합(IME) 진행 상태 — 조합 중에는 값을 자르지 않는다
  const composing1 = useRef(false)
  const composing2 = useRef(false)

  const [surname, setSurname] = useState<SavedChar | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const m = JSON.parse(localStorage.getItem(MY_INFO_KEY) || '{}')
      const pk = personKey(m)

      // 1순위: 일반인 — 이름 풀이 결과의 성씨
      const r = JSON.parse(localStorage.getItem(NAMING_RESULT_KEY) || '{}')
      const samePerson = r.personKey && r.personKey === pk
      if (samePerson && Array.isArray(r.chars) && r.chars[0]) {
        setSurname(r.chars[0] as SavedChar)
        setLoaded(true)
        return
      }

      // 2순위: 신생아 — 아기 이름짓기에서 입력한 성씨
      const nb = JSON.parse(localStorage.getItem(NEWBORN_SURNAME_KEY) || '{}')
      const sameBaby = nb.personKey && nb.personKey === pk
      if (sameBaby && nb.surname) {
        setSurname(nb.surname as SavedChar)
        setLoaded(true)
        return
      }
    } catch {}
    setLoaded(true)
  }, [])

  function chooseCount(n: 1 | 2) {
    setCount(n)
    setC1('')
    setC2('')
  }

  // 조합 중에는 입력 그대로 두고, 조합이 끝나거나(완성형) 비조합 입력이면 한 글자로 정리
  function handleChange(
    raw: string,
    composingRef: React.MutableRefObject<boolean>,
    setter: (v: string) => void,
  ) {
    if (composingRef.current) {
      setter(raw)
      return
    }
    setter(firstHangul(raw))
  }

  function handleCompositionEnd(
    raw: string,
    composingRef: React.MutableRefObject<boolean>,
    setter: (v: string) => void,
  ) {
    composingRef.current = false
    setter(firstHangul(raw))
  }

  const ready =
    !!surname &&
    count !== null &&
    firstHangul(c1).trim().length > 0 &&
    (count === 1 || firstHangul(c2).trim().length > 0)

  const proceed = () => {
    if (!ready) return
    const a = firstHangul(c1)
    const b = firstHangul(c2)
    const name = count === 1 ? a : a + b
    router.push('/manseryeok/naming/rename/newhanja?name=' + encodeURIComponent(name))
  }

  const inputStyle: CSSProperties = {
    width: 48, height: 46, textAlign: 'center', fontSize: 18,
    borderRadius: 10, border: '1px solid ' + GOLD,
    background: 'rgba(250,199,117,0.08)', color: '#fff',
  }

  const chip = (n: 1 | 2, label: string) => {
    const on = count === n
    return (
      <button onClick={() => chooseCount(n)} className="active:scale-95"
        style={{ flex: 1, padding: '12px 0', borderRadius: 12, cursor: 'pointer',
          background: on ? 'rgba(250,199,117,0.16)' : CARD,
          border: '1px solid ' + (on ? GOLD : 'rgba(250,199,117,0.12)'),
          color: on ? GOLD : '#cfcdc4', fontWeight: 700, fontSize: 14 }}>
        {label}
      </button>
    )
  }

  if (loaded && !surname) {
    return (
      <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
        <Header router={router} />
        <div style={{ padding: '40px 8px', textAlign: 'center', color: SUB, lineHeight: 1.8 }}>
          먼저 &lsquo;내 이름 풀이&rsquo; 또는<br />&lsquo;내 아기 이름짓기&rsquo;에서 시작해 주세요.
          <div style={{ marginTop: 20 }}>
            <button onClick={() => router.push('/manseryeok/naming')}
              style={{ padding: '12px 22px', borderRadius: 12, background: 'rgba(250,199,117,0.16)', border: '1px solid ' + GOLD, color: GOLD, fontWeight: 700, cursor: 'pointer' }}>
              이름 메뉴로 가기 →
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!loaded) return <main style={{ minHeight: '100vh', background: '#1f1e1c' }} />

  return (
    <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <Header router={router} />
      <p style={{ fontSize: 12, color: SUB, margin: '0 0 16px', padding: '0 4px' }}>
        성씨 {surname!.hanja}({surname!.hangul})는 그대로 · 원하는 한글 이름을 적어주세요
      </p>

      <div style={{ fontSize: 12, color: SUB, marginBottom: 8, padding: '0 4px' }}>이름 글자 수를 골라주세요</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {chip(1, '외자 (한 글자)')}
        {chip(2, '두 글자')}
      </div>

      {count !== null && (
        <>
          <div style={{ background: CARD, border: '1px solid rgba(250,199,117,0.12)', borderRadius: 16, padding: '18px 16px' }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
              <span style={{ fontSize: 22, color: SUB }}>{surname!.hanja}</span>
              <input
                value={c1}
                maxLength={2}
                inputMode="text"
                onCompositionStart={() => { composing1.current = true }}
                onCompositionEnd={(e) => handleCompositionEnd(e.currentTarget.value, composing1, setC1)}
                onChange={(e) => handleChange(e.target.value, composing1, setC1)}
                placeholder="서"
                style={inputStyle}
              />
              {count === 2 && (
                <input
                  value={c2}
                  maxLength={2}
                  inputMode="text"
                  onCompositionStart={() => { composing2.current = true }}
                  onCompositionEnd={(e) => handleCompositionEnd(e.currentTarget.value, composing2, setC2)}
                  onChange={(e) => handleChange(e.target.value, composing2, setC2)}
                  placeholder="연"
                  style={inputStyle}
                />
              )}
            </div>
          </div>
          <button onClick={proceed} disabled={!ready} className="active:scale-95"
            style={{ marginTop: 16, width: '100%', background: ready ? 'rgba(250,199,117,0.16)' : CARD,
              border: '1px solid ' + (ready ? GOLD : 'rgba(250,199,117,0.12)'), borderRadius: 14, padding: 14,
              color: ready ? GOLD : '#555', fontWeight: 700, fontSize: 14, cursor: ready ? 'pointer' : 'default' }}>
            한자 추천받기 {'\u2192'}
          </button>
        </>
      )}
    </main>
  )
}

function Header({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 16px' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 20, cursor: 'pointer' }}>{'\u2039'}</button>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>새 이름 직접 정하기</span>
    </div>
  )
}
