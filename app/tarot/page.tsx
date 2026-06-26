'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/app/components/common/PageHeader'

// ============================================================
// 관리자 옵션 (나중에 관리자 화면에서 켜고 끌 수 있게 연결 예정)
//   'ai'         → AI가 바로 해석해줌
//   'consultant' → 카드만 뽑고, 해석은 상담사가 (뽑기 결과만 저장)
// 지금은 기본값 'ai'. 두 방향 다 지원하도록 미리 만들어둠.
// ============================================================
const TAROT_MODE: 'ai' | 'consultant' = 'ai'

const SPREADS = [
  {
    id: 'one', count: 1, title: '한 장 뽑기', badge: '무료',
    desc: '지금 가장 궁금한 한 가지에, 카드 한 장이 답합니다.',
    positions: ['오늘의 메시지'],
    free: true,
  },
  {
    id: 'three', count: 3, title: '세 장 뽑기', badge: '과거·현재·미래',
    desc: '시간의 흐름을 따라, 일이 어떻게 흘러갈지 읽습니다.',
    positions: ['과거', '현재', '미래'],
    free: false,
  },
  {
    id: 'four', count: 4, title: '네 장 뽑기', badge: '현재·원인·조언·결과',
    desc: '지금 상황의 원인부터 나아갈 길까지 짚어봅니다.',
    positions: ['현재', '원인', '조언', '결과'],
    free: false,
  },
  {
    id: 'celtic', count: 10, title: '열 장 뽑기', badge: '켈틱 크로스 · 프리미엄',
    desc: '하나의 고민을 열 가지 각도로 깊이 파고듭니다.',
    positions: ['현재 상황', '장애물', '먼 과거', '가까운 과거', '가능한 미래', '가까운 미래', '나의 태도', '주변 환경', '희망과 두려움', '최종 결과'],
    free: false,
  },
]

const CATEGORY_CHIPS = [
  { label: '연애·결혼', text: '그 사람과의 인연이 어떻게 흘러갈지 궁금해요.' },
  { label: '직장·이직', text: '지금 직장에 머물지, 새 길을 찾을지 고민이에요.' },
  { label: '사업·재물', text: '앞으로의 재물 운과 사업의 방향이 궁금해요.' },
  { label: '건강', text: '요즘 건강과 마음 상태가 어떤지 살펴보고 싶어요.' },
  { label: '인간관계', text: '주변 사람들과의 관계를 어떻게 풀어가면 좋을까요?' },
]

const TAROT_RESULT_KEY = 'tarot_last_result_v1'

interface Card {
  id: number
  nameKo: string
  nameEn: string
  uprightKw: string
  reversedKw: string
  imageUrl: string | null
}
interface Picked {
  card: Card
  reversed: boolean
  position: string
  flipped: boolean
}
interface Interpretation {
  title: string
  cards: { position: string; name: string; direction: string; meaning: string }[]
  summary: string
  advice: string
}

const gold = '#FAC775'
const cardBg = '#2C2C2A'
const border = '1px solid rgba(250,199,117,0.15)'

function TarotInner() {
  const router = useRouter()

  const [step, setStep] = useState<'question' | 'deck' | 'spread' | 'draw' | 'reveal' | 'result'>('question')

  const [question, setQuestion] = useState('')
  const [decks, setDecks] = useState<{ code: string; name_ko: string; description: string; is_active: boolean }[]>([])
  const [deckCode, setDeckCode] = useState('universal')
  const [usesReversed, setUsesReversed] = useState(true)
  const [cards, setCards] = useState<Card[]>([])
  const [spreadId, setSpreadId] = useState('three')
  const [picked, setPicked] = useState<Picked[]>([])
  const [loading, setLoading] = useState(false)
  const [interp, setInterp] = useState<Interpretation | null>(null)

  const spread = SPREADS.find(s => s.id === spreadId) || SPREADS[1]

  useEffect(() => {
    fetch('/api/tarot/cards')
      .then(r => r.json())
      .then(d => { if (d.decks) setDecks(d.decks) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem(TAROT_RESULT_KEY)
    if (saved) {
      try {
        const r = JSON.parse(saved)
        if (r.interp) { setInterp(r.interp); setStep('result') }
      } catch {}
    }
  }, [])

  async function loadDeckCards(code: string) {
    const res = await fetch(`/api/tarot/cards?deck=${code}`)
    const data = await res.json()
    setCards(data.cards || [])
    setUsesReversed(data.deck?.usesReversed ?? true)
  }

  function startDraw() {
    setPicked([])
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
    if (next.length >= spread.count) {
      setTimeout(() => setStep('reveal'), 400)
    }
  }

  function flipCard(idx: number) {
    setPicked(prev => prev.map((p, i) => i === idx ? { ...p, flipped: true } : p))
  }

  const allFlipped = picked.length > 0 && picked.every(p => p.flipped)

  async function getInterpretation() {
    setLoading(true)
    try {
      const res = await fetch('/api/tarot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: TAROT_MODE,
          question,
          deckCode,
          spreadTitle: spread.title,
          cards: picked.map(p => ({
            position: p.position,
            name: p.card.nameKo,
            nameEn: p.card.nameEn,
            direction: p.reversed ? '역방향' : '정방향',
            keyword: p.reversed ? p.card.reversedKw : p.card.uprightKw,
          })),
        }),
      })
      const data = await res.json()
      if (data.interpretation) {
        setInterp(data.interpretation)
        setStep('result')
        try {
          localStorage.setItem(TAROT_RESULT_KEY, JSON.stringify({ interp: data.interpretation }))
        } catch {}
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    localStorage.removeItem(TAROT_RESULT_KEY)
    setQuestion(''); setPicked([]); setInterp(null); setStep('question')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1a1a18', maxWidth: '430px', margin: '0 auto', paddingBottom: '40px' }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes slideLeft{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <PageHeader title="타로 카드 리딩" onBack={() => step === 'question' ? router.push('/') : reset()} />

      {step === 'question' && (
        <div style={{ padding: '22px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '30px', marginBottom: '12px' }}>🌙</div>
          <p style={{ color: '#e8e4ff', fontSize: '15px', lineHeight: 1.8, marginBottom: '4px' }}>잠시 숨을 고르고,</p>
          <p style={{ color: '#e8e4ff', fontSize: '15px', lineHeight: 1.8, marginBottom: '18px' }}>마음속에 담긴 질문을 떠올려 보세요</p>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="예) 그 사람과의 인연이 궁금해요..."
            style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '12px', background: '#111', border: '1px solid rgba(250,199,117,0.25)', color: '#e8e4ff', fontSize: '14px', lineHeight: 1.6, resize: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', justifyContent: 'center', margin: '14px 0 20px' }}>
            {CATEGORY_CHIPS.map(c => (
              <button key={c.label} onClick={() => setQuestion(c.text)}
                style={{ background: 'rgba(156,39,176,0.15)', color: '#ce93d8', fontSize: '12px', padding: '7px 13px', borderRadius: '20px', border: 'none', cursor: 'pointer' }}>
                {c.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { if (question.trim()) setStep('deck') }}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px',
              background: question.trim() ? 'linear-gradient(135deg,#3C3489,#FAC775)' : '#333',
              border: 'none', color: question.trim() ? '#1a1a18' : '#777',
              fontSize: '15px', fontWeight: 'bold', cursor: question.trim() ? 'pointer' : 'default',
            }}>
            마음을 담아 다음으로 →
          </button>
          {!question.trim() && (
            <p style={{ color: '#8a88a0', fontSize: '12px', marginTop: '10px', lineHeight: 1.6 }}>
              마음속 질문을 먼저 떠올려 주세요.<br />그래야 카드가 더 또렷한 답을 들려줍니다.
            </p>
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
              <div key={d.code}
                onClick={() => { if (active) setDeckCode(d.code) }}
                style={{
                  background: selected ? cardBg : '#222220',
                  border: selected ? '1px solid rgba(250,199,117,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px', padding: '14px', marginBottom: '10px',
                  cursor: active ? 'pointer' : 'default', opacity: active ? 1 : 0.5,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: selected ? gold : '#e8e4ff', fontSize: '14px', fontWeight: 500 }}>{d.name_ko}</span>
                  {!active && <span style={{ background: 'rgba(255,255,255,0.1)', color: '#8a88a0', fontSize: '10px', padding: '3px 8px', borderRadius: '20px' }}>준비 중</span>}
                  {selected && active && <span style={{ marginLeft: 'auto', color: gold }}>✓</span>}
                </div>
                <p style={{ color: '#8a88a0', fontSize: '11px', margin: '4px 0 0', lineHeight: 1.5 }}>{d.description}</p>
              </div>
            )
          })}
          <button
            onClick={async () => { await loadDeckCards(deckCode); setStep('spread') }}
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
                  <span style={{ background: s.free ? 'rgba(76,175,80,0.15)' : 'rgba(250,199,117,0.15)', color: s.free ? '#81c784' : gold, fontSize: '10px', padding: '3px 9px', borderRadius: '20px' }}>{s.badge}</span>
                  {selected && <span style={{ marginLeft: 'auto', color: gold }}>✓</span>}
                </div>
                <p style={{ color: '#8a88a0', fontSize: '12px', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            )
          })}
          <button onClick={startDraw}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', marginTop: '8px', background: 'linear-gradient(135deg,#3C3489,#FAC775)', border: 'none', color: '#1a1a18', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
            카드 펼치기 →
          </button>
        </div>
      )}

      {step === 'draw' && (
        <div style={{ padding: '18px 16px' }}>
          <p style={{ color: gold, fontSize: '14px', textAlign: 'center', marginBottom: '6px' }}>
            마음이 이끄는 카드를 눌러주세요
          </p>
          <p style={{ color: '#8a88a0', fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
            {picked.length} / {spread.count} 장 선택됨
          </p>
          <div style={{ position: 'relative', height: '150px', overflow: 'hidden', borderRadius: '14px', background: '#111', border }}>
            <div style={{ display: 'flex', gap: '8px', padding: '15px 0', width: 'max-content', animation: 'slideLeft 18s linear infinite' }}>
              {[...Array(24)].map((_, i) => (
                <div key={i} onClick={drawOne}
                  style={{ flex: '0 0 80px', height: '118px', borderRadius: '10px', background: 'linear-gradient(135deg,#3C3489,#2C2C2A)', border: '1px solid rgba(250,199,117,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: gold, fontSize: '26px' }}>
                  ✦
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
            {picked.map((p, i) => (
              <div key={i} style={{ width: '44px', height: '64px', borderRadius: '7px', background: cardBg, border: '1px solid rgba(250,199,117,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: gold, fontSize: '13px' }}>
                {i + 1}
              </div>
            ))}
            {[...Array(Math.max(0, spread.count - picked.length))].map((_, i) => (
              <div key={`e${i}`} style={{ width: '44px', height: '64px', borderRadius: '7px', background: '#1f1f1d', border: '1px dashed rgba(255,255,255,0.15)' }} />
            ))}
          </div>
        </div>
      )}

      {step === 'reveal' && (
        <div style={{ padding: '18px 16px' }}>
          <p style={{ color: gold, fontSize: '14px', textAlign: 'center', marginBottom: '6px' }}>
            카드를 하나씩 눌러 뒤집어 보세요
          </p>
          <p style={{ color: '#8a88a0', fontSize: '12px', textAlign: 'center', marginBottom: '18px' }}>
            천천히, 마음의 준비가 되면
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            {picked.map((p, i) => (
              <div key={i} style={{ width: '92px', textAlign: 'center' }}>
                <div onClick={() => flipCard(i)}
                  style={{ width: '92px', height: '136px', borderRadius: '10px', cursor: p.flipped ? 'default' : 'pointer',
                    background: p.flipped ? cardBg : 'linear-gradient(135deg,#3C3489,#2C2C2A)',
                    border: '1px solid rgba(250,199,117,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    transform: p.flipped && p.reversed ? 'rotate(180deg)' : 'none' }}>
                  {p.flipped ? (
                    <>
                      {p.card.imageUrl
                        ? <img src={p.card.imageUrl} alt={p.card.nameKo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                        : <span style={{ color: gold, fontSize: '13px', fontWeight: 500, padding: '0 4px', lineHeight: 1.3 }}>{p.card.nameKo}</span>}
                    </>
                  ) : <span style={{ color: gold, fontSize: '28px' }}>✦</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#8a88a0', marginTop: '5px' }}>{p.position}</div>
                {p.flipped && (
                  <div style={{ fontSize: '10px', color: p.reversed ? '#e57373' : '#81c784', marginTop: '2px' }}>
                    {p.reversed ? '역방향' : '정방향'}
                  </div>
                )}
              </div>
            ))}
          </div>
          {allFlipped && (
            <button onClick={getInterpretation} disabled={loading}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', marginTop: '22px', background: 'linear-gradient(135deg,#3C3489,#FAC775)', border: 'none', color: '#1a1a18', fontSize: '15px', fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading
                ? <><span style={{ animation: 'spin 1s linear infinite' }}>✦</span> {TAROT_MODE === 'ai' ? '카드를 읽는 중...' : '결과를 정리하는 중...'}</>
                : (TAROT_MODE === 'ai' ? '🔮 해석 보기' : '🔮 상담사에게 해석 요청하기')}
            </button>
          )}
        </div>
      )}

      {step === 'result' && interp && (
        <div style={{ padding: '18px 16px' }}>
          <div style={{ fontSize: '17px', fontWeight: 'bold', color: gold, marginBottom: '16px', lineHeight: 1.5, textAlign: 'center' }}>
            "{interp.title}"
          </div>
          {interp.cards?.map((c, i) => (
            <div key={i} style={{ borderLeft: `3px solid ${gold}`, padding: '4px 12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: gold, marginBottom: '4px' }}>
                {c.position} — {c.name} ({c.direction})
              </div>
              <div style={{ fontSize: '14px', color: '#e0dce8', lineHeight: 1.8 }}>{c.meaning}</div>
            </div>
          ))}
          {interp.summary && (
            <div style={{ background: cardBg, border, borderRadius: '14px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: gold, marginBottom: '6px' }}>전체 흐름</div>
              <div style={{ fontSize: '14px', color: '#e0dce8', lineHeight: 1.8 }}>{interp.summary}</div>
            </div>
          )}
          {interp.advice && (
            <div style={{ background: cardBg, border, borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: gold, marginBottom: '6px' }}>조언</div>
              <div style={{ fontSize: '14px', color: '#e0dce8', lineHeight: 1.8 }}>{interp.advice}</div>
            </div>
          )}
          <button onClick={() => router.push('/manseryeok/consulting')}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'transparent', border: `1px solid ${gold}`, color: gold, fontSize: '14px', fontWeight: 500, cursor: 'pointer', marginBottom: '10px' }}>
            🔮 이 결과로 전문가와 상담하기 →
          </button>
          <button onClick={reset}
            style={{ width: '100%', padding: '13px', borderRadius: '12px', background: cardBg, border, color: '#8a88a0', fontSize: '14px', cursor: 'pointer' }}>
            다시 보기
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
