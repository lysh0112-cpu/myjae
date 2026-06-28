'use client'
import { Suspense, useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsin } from '@/lib/saju/yongsin'
import { diagnoseName, type NameChar, type DiagnoseResult, type Grade } from '@/lib/saju/naming'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'
const GREEN = '#81c784'

const TRY_LIMIT = 5
const CHAT_LIMIT = 5

const MY_INFO_KEY = 'myinfo'
const NEWNAME_HISTORY_KEY = 'newname_history_v1'

interface SavedChar {
  hangul: string
  hanja: string
  strokes: number
  resourceOhaeng: string
}

interface TryItem {
  name: string
  chars: SavedChar[]
}

interface ChatMsg { role: 'user' | 'assistant'; content: string }

function ohaengChar(s: string): string {
  if (!s) return ''
  const t = s.trim()
  if (t.includes('木') || t.includes('목')) return '목'
  if (t.includes('火') || t.includes('화')) return '화'
  if (t.includes('土') || t.includes('토')) return '토'
  if (t.includes('金') || t.includes('금')) return '금'
  if (t.includes('水') || t.includes('수')) return '수'
  return t
}

function gradeColor(g: Grade | string) {
  if (g === '좋음') return GREEN
  if (g === '아쉬움') return '#E0A04A'
  return '#9a98b0'
}

function personKey(m: Record<string, unknown> | null): string {
  if (!m || !m.year) return ''
  const hourIdx = m.hour === '모름' || m.hour == null ? 'x' : m.hour
  return [m.calType || '양력', m.year, m.month, m.day, m.leapMonth || '0', hourIdx, m.gender || '남'].join('|')
}

function NewResultInner() {
  const router = useRouter()

  const [info, setInfo] = useState<{
    calType: string; year: number; month: number; day: number
    leapMonth: string; hourIdx: number | null
  } | null>(null)

  const [tries, setTries] = useState<TryItem[]>([])
  const [activeTry, setActiveTry] = useState(0)
  const [loaded, setLoaded] = useState(false)

  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatUsed, setChatUsed] = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let m: Record<string, unknown> = {}
    try {
      m = JSON.parse(localStorage.getItem(MY_INFO_KEY) || '{}')
      if (m.year) {
        setInfo({
          calType: (m.calType as string) || '양력',
          year: parseInt(String(m.year)),
          month: parseInt(String(m.month)),
          day: parseInt(String(m.day)),
          leapMonth: (m.leapMonth as string) || '0',
          hourIdx: m.hour === '모름' || m.hour == null ? null : parseInt(String(m.hour)),
        })
      }
    } catch {}
    try {
      const h = JSON.parse(localStorage.getItem(NEWNAME_HISTORY_KEY) || '{}')
      if (h.personKey === personKey(m) && Array.isArray(h.tries) && h.tries.length > 0) {
        setTries(h.tries)
        setActiveTry(h.tries.length - 1) // 가장 최근 이름
      }
    } catch {}
    setLoaded(true)
  }, [])

  const { saju, dayStem } = useResultSaju(
    info?.calType || '양력',
    info?.year || 0,
    info?.month || 0,
    info?.day || 0,
    info?.leapMonth || '0',
    info?.hourIdx ?? null,
  )

  const cur = tries[activeTry]

  const yongsin = useMemo(() => {
    if (!saju || !dayStem) return ''
    try { return ohaengChar(calcYongsin(saju, dayStem).yongsin) } catch { return '' }
  }, [saju, dayStem])

  // 현재 이름의 진단 결과
  const result = useMemo<DiagnoseResult | null>(() => {
    if (!saju || !dayStem || !cur || cur.chars.length < 2) return null
    try {
      const y = calcYongsin(saju, dayStem)
      const surname: NameChar = {
        hangul: cur.chars[0].hangul, hanja: cur.chars[0].hanja,
        strokes: cur.chars[0].strokes, resourceOhaeng: ohaengChar(cur.chars[0].resourceOhaeng),
      }
      const given: NameChar[] = cur.chars.slice(1).map((c) => ({
        hangul: c.hangul, hanja: c.hanja, strokes: c.strokes, resourceOhaeng: ohaengChar(c.resourceOhaeng),
      }))
      return diagnoseName({ surname, given, yongsin: y.yongsin, heeksin: y.heeksin, elementScore: y.score })
    } catch { return null }
  }, [saju, dayStem, cur])

  // 시험 이름 목록의 종합 등급(비교용)
  const tryGrades = useMemo(() => {
    if (!saju || !dayStem) return tries.map(() => '')
    try {
      const y = calcYongsin(saju, dayStem)
      return tries.map((t) => {
        if (t.chars.length < 2) return ''
        const surname: NameChar = {
          hangul: t.chars[0].hangul, hanja: t.chars[0].hanja,
          strokes: t.chars[0].strokes, resourceOhaeng: ohaengChar(t.chars[0].resourceOhaeng),
        }
        const given: NameChar[] = t.chars.slice(1).map((c) => ({
          hangul: c.hangul, hanja: c.hanja, strokes: c.strokes, resourceOhaeng: ohaengChar(c.resourceOhaeng),
        }))
        try { return diagnoseName({ surname, given, yongsin: y.yongsin, heeksin: y.heeksin, elementScore: y.score }).overallGrade }
        catch { return '' }
      })
    } catch { return tries.map(() => '') }
  }, [saju, dayStem, tries])

  async function sendChat() {
    const q = chatInput.trim()
    if (!q || chatLoading || chatUsed >= CHAT_LIMIT || !cur) return
    const next = [...chatMsgs, { role: 'user' as const, content: q }]
    setChatMsgs(next)
    setChatInput('')
    setChatLoading(true)
    const ctx = {
      name: cur.chars.map((c) => c.hanja).join('') || undefined,
      yongsin: yongsin || undefined,
      candidates: undefined,
    }
    try {
      const res = await fetch('/api/naming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, context: ctx }),
      })
      const data = await res.json()
      setChatMsgs([...next, { role: 'assistant', content: data.reply || '죄송해요, 다시 여쭤봐 주세요.' }])
      setChatUsed((n) => n + 1)
    } catch {
      setChatMsgs([...next, { role: 'assistant', content: '연결이 잠시 불안정해요. 다시 시도해 주세요.' }])
    } finally {
      setChatLoading(false)
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMsgs, chatLoading])

  if (loaded && tries.length === 0) {
    return (
      <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
        <Header router={router} />
        <div style={{ padding: '40px 8px', textAlign: 'center', color: SUB, lineHeight: 1.8 }}>
          아직 지어본 이름이 없어요.
          <div style={{ marginTop: 20 }}>
            <button onClick={() => router.push('/manseryeok/naming/rename/newname')}
              style={{ padding: '12px 22px', borderRadius: 12, background: 'rgba(250,199,117,0.16)', border: '1px solid ' + GOLD, color: GOLD, fontWeight: 700, cursor: 'pointer' }}>
              새 이름 지으러 가기 →
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!loaded || !cur) return <main style={{ minHeight: '100vh', background: '#1f1e1c' }} />

  const fullName = cur.chars.map((c) => c.hanja).join('')
  const hangulName = cur.chars.map((c) => c.hangul).join('')
  const chatLeft = CHAT_LIMIT - chatUsed
  const triesLeft = TRY_LIMIT - tries.length

  const rows = result ? [
    { label: '사주 보완 (용신)', f: result.yongsinBohwan },
    { label: '한자 기운 (자원오행)', f: result.resourceFlow },
    { label: '소리 기운 (발음오행)', f: result.soundFlow },
    { label: '이름 수리 (81수리)', f: result.suri },
  ] : []

  return (
    <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <Header router={router} />

      {/* 새로 지은 이름 */}
      <div style={{ textAlign: 'center', margin: '14px 0 6px' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: GOLD, letterSpacing: 4 }}>{fullName}</div>
        <div style={{ fontSize: 13, color: SUB, marginTop: 4 }}>{hangulName} · 새로 지은 이름</div>
        {yongsin && <div style={{ fontSize: 11, color: SUB, marginTop: 2 }}>사주에 필요한 기운 <b style={{ color: GREEN }}>{yongsin}</b></div>}
      </div>

      {/* 4요소 등급 */}
      {result && (
        <div style={{ background: CARD, border: '1px solid rgba(250,199,117,0.1)', borderRadius: 14, padding: 16, margin: '16px 0 14px' }}>
          <div style={{ fontSize: 12, color: GOLD, marginBottom: 12, fontWeight: 700 }}>이름 분석 (4가지 기준)</div>
          {rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i === rows.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 13, color: '#e8e4ff' }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: gradeColor(row.f.grade) }}>{row.f.grade}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: SUB }}>종합 </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: gradeColor(result.overallGrade) }}>{result.overallGrade}</span>
          </div>
        </div>
      )}

      {/* 지금까지 지어본 이름 비교 */}
      {tries.length > 1 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: SUB, margin: '0 0 8px' }}>지금까지 지어본 이름 (눌러서 비교)</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tries.map((t, i) => {
              const on = i === activeTry
              const g = tryGrades[i]
              return (
                <button key={i} onClick={() => setActiveTry(i)} className="active:scale-95"
                  style={{ padding: '8px 12px', borderRadius: 12, cursor: 'pointer',
                    background: on ? 'rgba(250,199,117,0.16)' : CARD,
                    border: '1px solid ' + (on ? GOLD : 'rgba(250,199,117,0.12)') }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: on ? GOLD : '#fff' }}>{t.chars.map((c) => c.hanja).join('')}</span>
                  {g && <span style={{ fontSize: 11, color: gradeColor(g), marginLeft: 6 }}>{g}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 설명 */}
      <div style={{ background: 'rgba(129,199,132,0.08)', border: '1px solid rgba(129,199,132,0.3)', borderRadius: 14, padding: '13px 16px', marginBottom: 14 }}>
        <p style={{ fontSize: 13, color: '#dfe7d8', lineHeight: 1.8, margin: 0 }}>
          {yongsin
            ? <><b style={{ color: '#fff' }}>{hangulName}</b> 이름의 한자들이 사주에 필요한 기운 <b style={{ color: GREEN }}>{yongsin}</b>을(를) 얼마나 채워주는지, 소리·획수의 균형까지 함께 분석했습니다.</>
            : <>이름의 한자·소리·획수 균형을 종합해 분석했습니다.</>}
        </p>
      </div>

      {/* AI 작명 도우미 채팅 */}
      <div style={{ marginTop: 8, borderTop: '1px solid rgba(250,199,117,0.15)', paddingTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>✨ 작명 도우미에게 물어보기</span>
          <span style={{ fontSize: 11, color: SUB }}>남은 질문 {chatLeft}회</span>
        </div>
        <div style={{ fontSize: 11, color: SUB, marginBottom: 12, lineHeight: 1.6 }}>
          이 이름에 대해 궁금한 점을 물어보세요. (예: 이 한자 조합이 잘 어울리나요?)
        </div>

        <div style={{ background: CARD, border: '1px solid rgba(250,199,117,0.12)', borderRadius: 14, padding: 12, maxHeight: 320, overflowY: 'auto' }}>
          {chatMsgs.length === 0 && (
            <div style={{ fontSize: 12, color: SUB, textAlign: 'center', padding: '16px 0' }}>무엇이든 편하게 물어보세요.</div>
          )}
          {chatMsgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
              <div style={{ maxWidth: '80%', padding: '9px 12px', borderRadius: 14, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                background: m.role === 'user' ? 'rgba(250,199,117,0.18)' : '#1f1e1c',
                color: m.role === 'user' ? '#fff' : '#e0dce8',
                border: m.role === 'user' ? '1px solid rgba(250,199,117,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                {m.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
              <div style={{ padding: '9px 12px', borderRadius: 14, fontSize: 13, background: '#1f1e1c', color: SUB, border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>✦</span> 생각 중…
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {chatLeft > 0 ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendChat() }}
              placeholder="궁금한 점을 입력하세요" disabled={chatLoading}
              style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#1a1a18', border: '1px solid rgba(255,255,255,0.15)', color: '#e8e4ff', fontSize: 14 }} />
            <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
              style={{ padding: '12px 18px', borderRadius: 12, background: chatInput.trim() && !chatLoading ? GOLD : '#444', border: 'none', color: chatInput.trim() && !chatLoading ? '#1a1a18' : '#888', fontWeight: 700, cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'default' }}>
              전송
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 14, background: 'rgba(250,199,117,0.08)', border: '1px solid rgba(250,199,117,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#fff' }}>질문 {CHAT_LIMIT}회를 모두 사용했어요.</div>
          </div>
        )}
      </div>

      {/* 또 지어보기 / 카운트 안내 */}
      <div style={{ fontSize: 11, color: SUB, textAlign: 'center', margin: '20px 0 8px' }}>
        총 {TRY_LIMIT}회까지 종합 해설이 가능합니다 · 남은 횟수 {triesLeft > 0 ? triesLeft : 0}회
      </div>
      {triesLeft > 0 ? (
        <button onClick={() => router.push('/manseryeok/naming/rename/newname')} className="active:scale-95"
          style={{ width: '100%', background: 'rgba(250,199,117,0.16)', border: '1px solid ' + GOLD, borderRadius: 14, padding: 13, color: GOLD, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          다른 이름 또 지어보기 →
        </button>
      ) : (
        <div style={{ background: CARD, border: '1px solid rgba(250,199,117,0.2)', borderRadius: 14, padding: '13px 16px', fontSize: 12, color: SUB, lineHeight: 1.7, textAlign: 'center' }}>
          {TRY_LIMIT}회를 모두 사용했어요.<br />지금까지 지어본 이름 중에서 골라보세요.
        </div>
      )}
    </main>
  )
}

function Header({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 16px' }}>
      <button onClick={() => router.push('/manseryeok/naming')} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 20, cursor: 'pointer' }}>{'\u2039'}</button>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>새 이름 결과</span>
    </div>
  )
}

export default function NewResultPage() {
  return (
    <Suspense fallback={<div style={{ background: '#1f1e1c', minHeight: '100vh' }} />}>
      <NewResultInner />
    </Suspense>
  )
}
