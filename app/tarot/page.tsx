'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/app/components/common/PageHeader'

const TAROT_MODE: 'ai' | 'consultant' = 'ai'

// 해석 기법 + 가격 (지금은 화면 표시용. 결제는 아직 미연동 → 실제로는 전부 무료 작동)
const SPREADS = [
  { id: 'one', count: 1, title: '한 장 뽑기', badge: '1회 무료 · 이후 2,000원',
    desc: '지금 가장 궁금한 한 가지에, 카드 한 장이 답합니다.',
    positions: ['오늘의 메시지'], price: 2000, freeFirst: true },
  { id: 'three', count: 3, title: '세 장 뽑기', badge: '3,000원',
    desc: '시간의 흐름을 따라, 일이 어떻게 흘러갈지 읽습니다.',
    positions: ['과거', '현재', '미래'], price: 3000, freeFirst: false },
  { id: 'four', count: 4, title: '네 장 뽑기', badge: '5,000원',
    desc: '지금 상황의 원인부터 나아갈 길까지 짚어봅니다.',
    positions: ['현재', '원인', '조언', '결과'], price: 5000, freeFirst: false },
  { id: 'celtic', count: 10, title: '열 장 뽑기', badge: '켈틱 크로스 · 10,000원',
    desc: '하나의 고민을 열 가지 각도로 깊이 파고듭니다.',
    positions: ['현재 상황', '장애물', '먼 과거', '가까운 과거', '가능한 미래', '가까운 미래', '나의 태도', '주변 환경', '희망과 두려움', '최종 결과'], price: 10000, freeFirst: false },
]

const CATEGORY_CHIPS = [
  { label: '연애·결혼', text: '그 사람과의 인연이 어떻게 흘러갈지 궁금해요.' },
  { label: '직장·이직', text: '지금 직장에 머물지, 새 길을 찾을지 고민이에요.' },
  { label: '사업·재물', text: '앞으로의 재물 운과 사업의 방향이 궁금해요.' },
  { label: '건강', text: '요즘 건강과 마음 상태가 어떤지 살펴보고 싶어요.' },
  { label: '인간관계', text: '주변 사람들과의 관계를 어떻게 풀어가면 좋을까요?' },
]

const TAROT_HISTORY_KEY = 'tarot_history_v1'
const HISTORY_MAX = 1

interface Card {
  id: number; nameKo: string; nameEn: string
  uprightKw: string; reversedKw: string; imageUrl: string | null
}
interface Picked { card: Card; reversed: boolean; position: string; flipped: boolean }
interface Interpretation {
  title: string
  cards: { position: string; name: string; direction: string; meaning: string }[]
  summary: string; advice: string
}
interface HistoryItem { interp: Interpretation; question: string; savedAt: number }

const gold = '#FAC775'
const cardBg = '#2C2C2A'
const border = '1px solid rgba(250,199,117,0.15)'

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(TAROT_HISTORY_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}
function saveToHistory(item: HistoryItem) {
  try {
    const list = loadHistory()
    const next = [item, ...list].slice(0, HISTORY_MAX)
    localStorage.setItem(TAROT_HISTORY_KEY, JSON.stringify(next))
  } catch {}
}

function cardsKey(picked: Picked[]): string {
  return picked.map(p => `${p.card.id}${p.reversed ? 'R' : 'U'}@${p.position}`).join('|')
}

// 해석 전체를 읽어줄 텍스트로. 단락 사이에 쉼(…)과 짧은 안내를 넣어 자연스럽게 넘어가게 한다.
function interpToText(interp: Interpretation): string {
  // 마침표를 여러 개 이으면 브라우저 음성이 그만큼 더 쉰다. 단락 구분용.
  const PAUSE = '. . . '
  const parts: string[] = []

  if (interp.title) parts.push(`${interp.title}. ${PAUSE}`)

  const total = interp.cards?.length || 0
  interp.cards?.forEach((c, i) => {
    const order = total > 1 ? `${i + 1}번째 카드. ` : ''
    parts.push(`${order}${c.position}, ${c.name}, ${c.direction}. ${c.meaning} ${PAUSE}`)
  })

  if (interp.summary) parts.push(`${PAUSE}전체 흐름이에요. ${interp.summary} ${PAUSE}`)
  if (interp.advice) parts.push(`마지막으로, 조언이에요. ${interp.advice}`)

  return parts.join(' ')
}

type Step = 'question' | 'deck' | 'spread' | 'draw' | 'reveal' | 'result'

function TarotInner() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('question')
  const [question, setQuestion] = useState('')
  const [decks, setDecks] = useState<{ code: string; name_ko: string; description: string; is_active: boolean }[]>([])
  const [deckCode, setDeckCode] = useState('universal')
  const [usesReversed, setUsesReversed] = useState(true)
  const [cards, setCards] = useState<Card[]>([])
  const [spreadId, setSpreadId] = useState('three')
  const [picked, setPicked] = useState<Picked[]>([])
  const [loading, setLoading] = useState(false)
  const [interp, setInterp] = useState<Interpretation | null>(null)
  const [interpKey, setInterpKey] = useState<string>('')
  const [hasHistory, setHasHistory] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const spread = SPREADS.find(s => s.id === spreadId) || SPREADS[1]
  const fullyDrawn = picked.length > 0 && picked.length === spread.count

  useEffect(() => {
    fetch('/api/tarot/cards')
      .then(r => r.json())
      .then(d => { if (d.decks) setDecks(d.decks) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setHasHistory(loadHistory().length > 0)
  }, [])

  function stopSpeak() {
    try { window.speechSynthesis?.cancel() } catch {}
    setSpeaking(false)
  }
  useEffect(() => {
    return () => { try { window.speechSynthesis?.cancel() } catch {} }
  }, [])
  useEffect(() => {
    if (step !== 'result') stopSpeak()
  }, [step])

  // 브라우저 내장 음성으로 해석 읽어주기 (무료)
  function toggleSpeak() {
    if (!interp) return
    const synth = window.speechSynthesis
    if (!synth) {
      alert('이 기기에서는 음성 읽기를 지원하지 않아요.')
      return
    }
    if (speaking) { stopSpeak(); return }
    const text = interpToText(interp)
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ko-KR'
    u.rate = 0.95
    u.pitch = 1.0
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    synth.cancel()
    synth.speak(u)
    setSpeaking(true)
  }

  function showLastReading() {
    const list = loadHistory()
    if (list.length > 0) {
      setInterp(list[0].interp)
      setQuestion(list[0].question || '')
      setStep('result')
    }
  }

  async function loadDeckCards(code: string) {
    const res = await fetch(`/api/tarot/cards?deck=${code}`)
    const data = await res.json()
    setCards(data.cards || [])
    setUsesReversed(data.deck?.usesReversed ?? true)
  }

  function startDraw() {
    if (picked.length !== spread.count) {
      setPicked([]); setInterp(null); setInterpKey('')
    }
    setStep('draw')
  }

  function drawOne() {
    if (picked.length >= spread.count) return
    const remaining = cards.filter(c => !picked.some(p => p.card.id === c.id))
    if (remaining.length === 0) return
    const card = remaining[Math.floor(Math.random() * remaining.length)]
    const reversed = usesReversed ? Math.random() < 0.5 : false
    const position = spread.positions[picked.length] || `카드 ${picked.length + 1}`
    const next = [...picked, { card, reversed, position, flipped: false }]
    setPicked(next)
    if (next.length >= spread.count) setTimeout(() => setStep('reveal'), 400)
  }

  function flipCard(idx: number) {
    setPicked(prev => prev.map((p, i) => i === idx ? { ...p, flipped: true } : p))
  }

  const allFlipped = picked.length > 0 && picked.every(p => p.flipped)

  async function getInterpretation() {
    const key = cardsKey(picked)
    if (interp && interpKey === key) { setStep('result'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/tarot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: TAROT_MODE, question, deckCode, spreadTitle: spread.title,
          cards: picked.map(p => ({
            position: p.position, name: p.card.nameKo, nameEn: p.card.nameEn,
            direction: p.reversed ? '역방향' : '정방향',
            keyword: p.reversed ? p.card.reversedKw : p.card.uprightKw,
          })),
        }),
      })
      const data = await res.json()
      if (data.interpretation) {
        setInterp(data.interpretation)
        setInterpKey(key)
        setStep('result')
        saveToHistory({ interp: data.interpretation, question, savedAt: Date.now() })
        setHasHistory(true)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function startNew() {
    stopSpeak()
    setQuestion(''); setPicked([]); setInterp(null); setInterpKey(''); setStep('question')
  }

  const hasCachedInterp = interp !== null && interpKey === cardsKey(picked)

  return (
    <main style={{ minHeight: '100vh', background: '#1a1a18', maxWidth: '430px', margin: '0 auto', paddingBottom: '40px' }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes slideLeft{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <PageHeader title="타로 카드 리딩" onBack={() => {
        if (step === 'result') { setStep('reveal'); return }
        if (step === 'reveal') { setStep('draw'); return }
        if (step === 'draw') { setStep('spread'); return }
        if (step === 'spread') { setStep('deck'); return }
        if (step === 'deck') { setStep('question'); return }
        router.push('/')
      }} />

      {step === 'question' && (
        <div style={{ padding: '22px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '30px', marginBottom: '12px' }}>🌙</div>
          <p style={{ color: '#e8e4ff', fontSize: '15px', lineHeight: 1.8, marginBottom: '4px' }}>잠시 숨을 고르고,</p>
          <p style={{ color: '#e8e4ff', fontSize: '15px', lineHeight: 1.8, marginBottom: '18px' }}>마음속에 담긴 질문을 떠올려 보세요</p>
          <textarea value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="예) 그 사람과의 인연이 궁금해요..."
            style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '12px', background: '#111', border: '1px solid rgba(250,199,117,0.25)', color: '#e8e4ff', fontSize: '14px', lineHeight: 1.6, resize: 'none', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', justifyContent: 'center', margin: '14px 0 20px' }}>
            {CATEGORY_CHIPS.map(c => (
              <button key={c.label} onClick={() => setQuestion(c.text)}
                style={{ background: 'rgba(156,39,176,0.15)', color: '#ce93d8', fontSize: '12px', padding: '7px 13px', borderRadius: '20px', border: 'none', cursor: 'pointer' }}>
                {c.label}
              </button>
            ))}
          </div>
          <button onClick={() => { if (question.trim()) setStep('deck') }}
            style={{ width: '100%', padding: '14px', borderRadius: '12px',
              background: question.trim() ? 'linear-gradient(135deg,#3C3489,#FAC775)' : '#333',
              border: 'none', color: question.trim() ? '#1a1a18' : '#777',
              fontSize: '15px', fontWeight: 'bold', cursor: question.trim() ? 'pointer' : 'default' }}>
            마음을 담아 다음으로 →
          </button>
          {!question.trim() && (
            <p style={{ color: '#8a88a0', fontSize: '12px', marginTop: '10px', lineHeight: 1.6 }}>
              마음속 질문을 먼저 떠올려 주세요.<br />그래야 카드가 더 또렷한 답을 들려줍니다.
            </p>
          )}
          {hasHistory && (
            <button onClick={showLastReading}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', marginTop: '14px', background: 'transparent', border: `1px solid ${gold}`, color: gold, fontSize: '13px', cursor: 'pointer' }}>
              📜 이전 해석 보기
            </button>
          )}
        </div>
      )}

      {step === 'deck' && (
        <div style={{ padding: '18px 16px' }}>
          <p style={{ color: '#8a88a0', fontSize: '13px', marginBottom: '14px' }}>어떤 카드로 마음을 들여다볼까요?</p>
          {decks.map(d => {
            const active = d.is_active
            const selected = deckCode === d.code
            return (
              <div key={d.code} onClick={() => { if (active) setDeckCode(d.code) }}
                style={{ background: selected ? cardBg : '#222220',
                  border: selected ? '1px solid rgba(250,199,117,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px', padding: '14px', marginBottom: '10px',
                  cursor: active ? 'pointer' : 'default', opacity: active ? 1 : 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: selected ? gold : '#e8e4ff', fontSize: '14px', fontWeight: 500 }}>{d.name_ko}</span>
                  {!active && <span style={{ background: 'rgba(255,255,255,0.1)', color: '#8a88a0', fontSize: '10px', padding: '3px 8px', borderRadius: '20px' }}>준비 중</span>}
                  {selected && active && <span style={{ marginLeft: 'auto', color: gold }}>✓</span>}
                </div>
                <p style={{ color: '#8a88a0', fontSize: '11px', margin: '4px 0 0', lineHeight: 1.5 }}>{d.description}</p>
              </div>
            )
          })}
          <button onClick={async () => { await loadDeckCards(deckCode); setStep('spread') }}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', marginTop: '8px', background: 'linear-gradient(135deg,#3C3489,#FAC775)', border: 'none', color: '#1a1a18', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
            이 카드로 볼게요 →
          </button>
        </div>
      )}

      {step === 'spread' && (
        <div style={{ padding: '18px 16px' }}>
          <p style={{ color: '#8a88a0', fontSize: '13px', marginBottom: '14px' }}>어떻게 풀어볼까요?</p>
          {SPREADS.map(s => {
            const selected = spreadId === s.id
            return (
              <div key={s.id} onClick={() => setSpreadId(s.id)}
                style={{ background: cardBg, border: selected ? '1px solid rgba(250,199,117,0.4)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', marginBottom: '10px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{s.title}</span>
                  <span style={{ background: s.freeFirst ? 'rgba(76,175,80,0.15)' : 'rgba(250,199,117,0.15)', color: s.freeFirst ? '#81c784' : gold, fontSize: '10px', padding: '3px 9px', borderRadius: '20px' }}>{s.badge}</span>
                  {selected && <span style={{ marginLeft: 'auto', color: gold }}>✓</span>}
                </div>
                <p style={{ color: '#8a88a0', fontSize: '12px', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            )
          })}
          <p style={{ color: '#6a6878', fontSize: '11px', textAlign: 'center', margin: '4px 0 12px' }}>
            * 오픈 기념 체험 기간 — 지금은 모두 무료로 보실 수 있어요
          </p>
          <button onClick={startDraw}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg,#3C3489,#FAC775)', border: 'none', color: '#1a1a18', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
            카드 펼치기 →
          </button>
        </div>
      )}

      {step === 'draw' && (
        <div style={{ padding: '18px 16px' }}>
          {fullyDrawn ? (
            <div style={{ textAlign: 'center', paddingTop: '10px' }}>
              <div style={{ fontSize: '30px', marginBottom: '12px' }}>🔮</div>
              <p style={{ color: gold, fontSize: '15px', marginBottom: '6px' }}>이미 카드를 다 뽑으셨어요</p>
              <p style={{ color: '#8a88a0', fontSize: '12px', lineHeight: 1.7, marginBottom: '18px' }}>
                뽑으신 {spread.count}장이 그대로 있어요.<br />
                뒤집어 해석을 보거나, 새 카드로 다시 보고 싶으면 아래에서 선택하세요.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '22px', flexWrap: 'wrap' }}>
                {picked.map((p, i) => (
                  <div key={i} style={{ width: '44px', height: '64px', borderRadius: '7px', background: cardBg, border: '1px solid rgba(250,199,117,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: gold, fontSize: '13px' }}>{i + 1}</div>
                ))}
              </div>
              <button onClick={() => setStep('reveal')}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg,#3C3489,#FAC775)', border: 'none', color: '#1a1a18', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>
                뒤집으러 가기 →
              </button>
              <button onClick={() => { setPicked([]); setInterp(null); setInterpKey('') }}
                style={{ width: '100%', padding: '13px', borderRadius: '12px', background: cardBg, border, color: '#8a88a0', fontSize: '14px', cursor: 'pointer' }}>
                새 카드로 다시 뽑기
              </button>
            </div>
          ) : (
            <>
              <p style={{ color: gold, fontSize: '14px', textAlign: 'center', marginBottom: '6px' }}>마음이 이끄는 카드를 눌러주세요</p>
              <p style={{ color: '#8a88a0', fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>{picked.length} / {spread.count} 장 선택됨</p>
              <div style={{ position: 'relative', height: '150px', overflow: 'hidden', borderRadius: '14px', background: '#111', border }}>
                <div style={{ display: 'flex', gap: '8px', padding: '15px 0', width: 'max-content', animation: 'slideLeft 10s linear infinite' }}>
                  {[...Array(24)].map((_, i) => (
                    <div key={i} onClick={drawOne}
                      style={{ flex: '0 0 80px', height: '118px', borderRadius: '10px', background: 'linear-gradient(135deg,#3C3489,#2C2C2A)', border: '1px solid rgba(250,199,117,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: gold, fontSize: '26px' }}>✦</div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
                {picked.map((p, i) => (
                  <div key={i} style={{ width: '44px', height: '64px', borderRadius: '7px', background: cardBg, border: '1px solid rgba(250,199,117,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: gold, fontSize: '13px' }}>{i + 1}</div>
                ))}
                {[...Array(Math.max(0, spread.count - picked.length))].map((_, i) => (
                  <div key={`e${i}`} style={{ width: '44px', height: '64px', borderRadius: '7px', background: '#1f1f1d', border: '1px dashed rgba(255,255,255,0.15)' }} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {step === 'reveal' && (
        <div style={{ padding: '18px 16px' }}>
          <p style={{ color: gold, fontSize: '14px', textAlign: 'center', marginBottom: '6px' }}>카드를 하나씩 눌러 뒤집어 보세요</p>
          <p style={{ color: '#8a88a0', fontSize: '12px', textAlign: 'center', marginBottom: '18px' }}>천천히, 마음의 준비가 되면</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            {picked.map((p, i) => (
              <div key={i} style={{ width: '92px', textAlign: 'center' }}>
                <div onClick={() => flipCard(i)}
                  style={{ width: '92px', height: '136px', borderRadius: '10px', cursor: p.flipped ? 'default' : 'pointer',
                    background: p.flipped ? cardBg : 'linear-gradient(135deg,#3C3489,#2C2C2A)',
                    border: '1px solid rgba(250,199,117,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    transform: p.flipped && p.reversed ? 'rotate(180deg)' : 'none' }}>
                  {p.flipped
                    ? (p.card.imageUrl
                        ? <img src={p.card.imageUrl} alt={p.card.nameKo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                        : <span style={{ color: gold, fontSize: '13px', fontWeight: 500, padding: '0 4px', lineHeight: 1.3 }}>{p.card.nameKo}</span>)
                    : <span style={{ color: gold, fontSize: '28px' }}>✦</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#8a88a0', marginTop: '5px' }}>{p.position}</div>
                {p.flipped && <div style={{ fontSize: '10px', color: p.reversed ? '#e57373' : '#81c784', marginTop: '2px' }}>{p.reversed ? '역방향' : '정방향'}</div>}
              </div>
            ))}
          </div>
          {allFlipped && (
            <button onClick={getInterpretation} disabled={loading}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', marginTop: '22px', background: 'linear-gradient(135deg,#3C3489,#FAC775)', border: 'none', color: '#1a1a18', fontSize: '15px', fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading
                ? <><span style={{ animation: 'spin 1s linear infinite' }}>✦</span> 카드를 읽는 중...</>
                : (hasCachedInterp ? '🔮 해석 다시 보기' : '🔮 해석 보기')}
            </button>
          )}
        </div>
      )}

      {step === 'result' && interp && (
        <div style={{ padding: '18px 16px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: gold, marginBottom: '16px', lineHeight: 1.6, textAlign: 'center' }}>"{interp.title}"</div>

          {/* 🔊 해석 듣기 (무료: 브라우저 내장 음성) */}
          <button onClick={toggleSpeak}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '18px', background: speaking ? 'rgba(250,199,117,0.15)' : 'transparent', border: `1px solid ${gold}`, color: gold, fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            {speaking ? '⏸ 읽기 멈추기' : '🔊 해석 듣기'}
          </button>

          {interp.cards?.map((c, i) => (
            <div key={i} style={{ borderLeft: `3px solid ${gold}`, padding: '4px 14px', marginBottom: '18px' }}>
              <div style={{ fontSize: '14px', color: gold, marginBottom: '6px', fontWeight: 600 }}>{c.position} — {c.name} ({c.direction})</div>
              <div style={{ fontSize: '15px', color: '#e8e4f2', lineHeight: 1.9 }}>{c.meaning}</div>
            </div>
          ))}
          {interp.summary && (
            <div style={{ background: cardBg, border, borderRadius: '14px', padding: '16px', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', color: gold, marginBottom: '8px', fontWeight: 600 }}>전체 흐름</div>
              <div style={{ fontSize: '15px', color: '#e8e4f2', lineHeight: 1.9 }}>{interp.summary}</div>
            </div>
          )}
          {interp.advice && (
            <div style={{ background: cardBg, border, borderRadius: '14px', padding: '16px', marginBottom: '18px' }}>
              <div style={{ fontSize: '14px', color: gold, marginBottom: '8px', fontWeight: 600 }}>조언</div>
              <div style={{ fontSize: '15px', color: '#e8e4f2', lineHeight: 1.9 }}>{interp.advice}</div>
            </div>
          )}

          {/* 나중에 상담사 연결이 필요해지면 아래 주석을 풀어 되살리면 됨
          <button onClick={() => router.push('/manseryeok/consulting')}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'transparent', border: `1px solid ${gold}`, color: gold, fontSize: '14px', fontWeight: 500, cursor: 'pointer', marginBottom: '10px' }}>
            🔮 이 결과로 전문가와 상담하기 →
          </button>
          */}

          <button onClick={startNew}
            style={{ width: '100%', padding: '13px', borderRadius: '12px', background: cardBg, border, color: '#8a88a0', fontSize: '14px', cursor: 'pointer' }}>
            새로운 질문하기
          </button>
        </div>
      )}
    </main>
  )
}

export default function TarotPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a18', color: '#FAC775' }}>로딩 중...</div>}>
      <TarotInner />
    </Suspense>
  )
}
