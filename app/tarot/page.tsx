'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  saveTarotRecord, getTarotRecord,
  type TarotCategory, type TarotSavedCard,
} from '@/lib/saju/tarotRecords'

const TAROT_MODE: 'ai' | 'consultant' = 'ai'

// 해석 기법 (가격·무료횟수는 tarot_prices에서 읽어와 채움)
const SPREADS = [
  { id: 'one', count: 1, key: 'tarot_1', title: '한 장 뽑기',
    desc: '지금 가장 궁금한 한 가지에, 카드 한 장이 답합니다.',
    positions: ['오늘의 메시지'] },
  { id: 'three', count: 3, key: 'tarot_3', title: '세 장 뽑기',
    desc: '시간의 흐름을 따라, 일이 어떻게 흘러갈지 읽습니다.',
    positions: ['과거', '현재', '미래'] },
  { id: 'four', count: 4, key: 'tarot_4', title: '네 장 뽑기',
    desc: '지금 상황의 원인부터 나아갈 길까지 짚어봅니다.',
    positions: ['현재', '원인', '조언', '결과'] },
  { id: 'celtic', count: 10, key: 'tarot_10', title: '열 장 뽑기',
    desc: '하나의 고민을 열 가지 각도로 깊이 파고듭니다.',
    positions: ['현재 상황', '장애물', '먼 과거', '가까운 과거', '가능한 미래', '가까운 미래', '나의 태도', '주변 환경', '희망과 두려움', '최종 결과'] },
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
interface TarotPrice { price_key: string; price: number; free_count: number; active: boolean }

const gold = '#c8783c'
const rose = '#b45a78'
const ink = '#1a1a1a'
const sub = '#b4785a'
const cardBg = '#FFFBF7'
const border = '1px solid #f0e0d5'

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

// 뱃지 문구: 무료횟수 있으면 "N회 무료 · 이후 X원", 없으면 "X원"
function badgeText(price?: TarotPrice): string {
  if (!price) return ''
  if (price.free_count > 0) return `${price.free_count}회 무료 · 이후 ${price.price.toLocaleString()}원`
  return `${price.price.toLocaleString()}원`
}

type Step = 'question' | 'deck' | 'spread' | 'draw' | 'reveal' | 'result'

function TarotInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<Step>('question')
  const [question, setQuestion] = useState('')
  const [category, setCategory] = useState<TarotCategory>('기타')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [viewOnly, setViewOnly] = useState(false)
  const [decks, setDecks] = useState<{ code: string; name_ko: string; description: string; is_active: boolean }[]>([])
  const [deckCode, setDeckCode] = useState('universal')
  const [usesReversed, setUsesReversed] = useState(true)
  const [cards, setCards] = useState<Card[]>([])
  const [spreadId, setSpreadId] = useState('three')
  const [picked, setPicked] = useState<Picked[]>([])
  const [loading, setLoading] = useState(false)
  const [interp, setInterp] = useState<Interpretation | null>(null)
  const [interpKey, setInterpKey] = useState<string>('')

  // 타로 가격/무료횟수
  const [prices, setPrices] = useState<Record<string, TarotPrice>>({})

  const spread = SPREADS.find(s => s.id === spreadId) || SPREADS[1]
  const fullyDrawn = picked.length > 0 && picked.length === spread.count

  useEffect(() => {
    fetch('/api/tarot/cards')
      .then(r => r.json())
      .then(d => { if (d.decks) setDecks(d.decks) })
      .catch(() => {})
  }, [])

  // 보관함에서 recordId 로 들어오면 그 기록을 그대로 다시보기 (재계산·AI 재호출 없음)
  useEffect(() => {
    const rid = searchParams.get('recordId')
    if (!rid) return
    let cancelled = false
    getTarotRecord(rid).then(rec => {
      if (cancelled || !rec || !rec.resultData) return
      setQuestion(rec.question || '')
      setCategory(rec.category)
      setInterp(rec.resultData)
      setSavedId(rec.id)
      setViewOnly(true)
      setStep('result')
    })
    return () => { cancelled = true }
  }, [searchParams])

  useEffect(() => {
    supabase.from('tarot_prices').select('price_key, price, free_count, active')
      .then(({ data }) => {
        if (data) {
          const map: Record<string, TarotPrice> = {}
          for (const r of data as TarotPrice[]) map[r.price_key] = r
          setPrices(map)
        }
      })
  }, [])

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
        // 로그인 회원이면 보관함(DB)에 자동 저장 — 아이디 기준으로 기록이 이어짐.
        // 관심사(category)도 함께 저장해 나중에 트렌드 집계에 쓴다.
        const savedCards: TarotSavedCard[] = picked.map(p => ({
          cardId: p.card.id,
          name: p.card.nameKo,
          nameEn: p.card.nameEn,
          position: p.position,
          reversed: p.reversed,
        }))
        saveTarotRecord({
          question,
          category,
          spreadId: spread.id,
          spreadTitle: spread.title,
          cards: savedCards,
          resultData: data.interpretation,
        }).then(res => { if (res.ok && res.id) setSavedId(res.id) })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function startNew() {
    setQuestion(''); setPicked([]); setInterp(null); setInterpKey(''); setStep('question')
    setCategory('기타'); setSavedId(null); setViewOnly(false)
  }

  const hasCachedInterp = interp !== null && interpKey === cardsKey(picked)

  // 노출된(active) 스프레드만 보이기
  const visibleSpreads = SPREADS.filter(s => {
    const p = prices[s.key]
    return !p || p.active
  })

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: '430px', margin: '0 auto', paddingBottom: '40px' }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes slideLeft{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => {
          if (step === 'result') { setStep('reveal'); return }
          if (step === 'reveal') { setStep('draw'); return }
          if (step === 'draw') { setStep('spread'); return }
          if (step === 'spread') { setStep('deck'); return }
          if (step === 'deck') { setStep('question'); return }
          router.push('/')
        }} style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 15, fontWeight: 500, color: ink }}>타로 카드 리딩</div>
      </div>

      {step === 'question' && (
        <div style={{ padding: '22px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '30px', marginBottom: '12px' }}>🌙</div>
          <p style={{ color: '', fontSize: '15px', lineHeight: 1.8, marginBottom: '4px' }}>잠시 숨을 고르고,</p>
          <p style={{ color: '', fontSize: '15px', lineHeight: 1.8, marginBottom: '18px' }}>마음속에 담긴 질문을 떠올려 보세요</p>
          <textarea value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="예) 그 사람과의 인연이 궁금해요..."
            style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '12px', background: '#FFFBF7', border: '1px solid #f0e0d5', color: ink, fontSize: '14px', lineHeight: 1.6, resize: 'none', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', justifyContent: 'center', margin: '14px 0 20px' }}>
            {CATEGORY_CHIPS.map(c => (
              <button key={c.label} onClick={() => { setQuestion(c.text); setCategory(c.label as TarotCategory) }}
                style={{ background: category === c.label ? rose : 'rgba(180,90,120,0.10)', color: category === c.label ? '#fff' : rose, fontSize: '12px', padding: '7px 13px', borderRadius: '20px', border: 'none', cursor: 'pointer' }}>
                {c.label}
              </button>
            ))}
          </div>
          <button onClick={() => { if (question.trim()) setStep('deck') }}
            style={{ width: '100%', padding: '14px', borderRadius: '12px',
              background: question.trim() ? rose : '#EFE0D5',
              border: 'none', color: question.trim() ? '#fff' : '#b09a8a',
              fontSize: '15px', fontWeight: 'bold', cursor: question.trim() ? 'pointer' : 'default' }}>
            마음을 담아 다음으로 →
          </button>
          {!question.trim() && (
            <p style={{ color: sub, fontSize: '12px', marginTop: '10px', lineHeight: 1.6 }}>
              마음속 질문을 먼저 떠올려 주세요.<br />그래야 카드가 더 또렷한 답을 들려줍니다.
            </p>
          )}
          <button onClick={() => router.push('/tarot/storage')}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', marginTop: '14px', background: 'transparent', border: `1px solid ${gold}`, color: gold, fontSize: '13px', cursor: 'pointer' }}>
            📜 이전 타로 기록 보기
          </button>
        </div>
      )}

      {step === 'deck' && (
        <div style={{ padding: '18px 16px' }}>
          <p style={{ color: sub, fontSize: '13px', marginBottom: '14px' }}>어떤 카드로 마음을 들여다볼까요?</p>
          {decks.map(d => {
            const active = d.is_active
            const selected = deckCode === d.code
            return (
              <div key={d.code} onClick={() => { if (active) setDeckCode(d.code) }}
                style={{ background: selected ? cardBg : '#FBF3EC',
                  border: selected ? '1px solid #d8a87e' : '1px solid #f0e0d5',
                  borderRadius: '12px', padding: '14px', marginBottom: '10px',
                  cursor: active ? 'pointer' : 'default', opacity: active ? 1 : 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: selected ? gold : ink, fontSize: '14px', fontWeight: 500 }}>{d.name_ko}</span>
                  {!active && <span style={{ background: 'rgba(180,120,90,0.12)', color: sub, fontSize: '10px', padding: '3px 8px', borderRadius: '20px' }}>준비 중</span>}
                  {selected && active && <span style={{ marginLeft: 'auto', color: gold }}>✓</span>}
                </div>
                <p style={{ color: sub, fontSize: '11px', margin: '4px 0 0', lineHeight: 1.5 }}>{d.description}</p>
              </div>
            )
          })}
          <button onClick={async () => { await loadDeckCards(deckCode); setStep('spread') }}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', marginTop: '8px', background: rose, border: 'none', color: '#fff', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
            이 카드로 볼게요 →
          </button>
        </div>
      )}

      {step === 'spread' && (
        <div style={{ padding: '18px 16px' }}>
          <p style={{ color: sub, fontSize: '13px', marginBottom: '14px' }}>어떻게 풀어볼까요?</p>
          {visibleSpreads.map(s => {
            const selected = spreadId === s.id
            const p = prices[s.key]
            const isFree = p && p.free_count > 0
            const badge = badgeText(p)
            return (
              <div key={s.id} onClick={() => setSpreadId(s.id)}
                style={{ background: cardBg, border: selected ? '1px solid #d8a87e' : '1px solid #f0e0d5', borderRadius: '12px', padding: '14px', marginBottom: '10px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                  <span style={{ color: ink, fontSize: '14px', fontWeight: 500 }}>{s.title}</span>
                  {badge && (
                    <span style={{ background: isFree ? 'rgba(76,150,80,0.12)' : 'rgba(200,120,60,0.12)', color: isFree ? '#4a9450' : gold, fontSize: '10px', padding: '3px 9px', borderRadius: '20px' }}>{badge}</span>
                  )}
                  {selected && <span style={{ marginLeft: 'auto', color: gold }}>✓</span>}
                </div>
                <p style={{ color: sub, fontSize: '12px', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            )
          })}
          <p style={{ color: '#c0a595', fontSize: '11px', textAlign: 'center', margin: '4px 0 12px' }}>
            * 오픈 기념 체험 기간 — 지금은 모두 무료로 보실 수 있어요
          </p>
          <button onClick={startDraw}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: rose, border: 'none', color: '#fff', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
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
              <p style={{ color: sub, fontSize: '12px', lineHeight: 1.7, marginBottom: '18px' }}>
                뽑으신 {spread.count}장이 그대로 있어요.<br />
                뒤집어 해석을 보거나, 새 카드로 다시 보고 싶으면 아래에서 선택하세요.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '22px', flexWrap: 'wrap' }}>
                {picked.map((p, i) => (
                  <div key={i} style={{ width: '44px', height: '64px', borderRadius: '7px', background: '#2C2C2A', border: '1px solid rgba(250,199,117,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FAC775', fontSize: '13px' }}>{i + 1}</div>
                ))}
              </div>
              <button onClick={() => setStep('reveal')}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: rose, border: 'none', color: '#fff', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>
                뒤집으러 가기 →
              </button>
              <button onClick={() => { setPicked([]); setInterp(null); setInterpKey('') }}
                style={{ width: '100%', padding: '13px', borderRadius: '12px', background: cardBg, border, color: sub, fontSize: '14px', cursor: 'pointer' }}>
                새 카드로 다시 뽑기
              </button>
            </div>
          ) : (
            <>
              <p style={{ color: gold, fontSize: '14px', textAlign: 'center', marginBottom: '6px' }}>마음이 이끄는 카드를 눌러주세요</p>
              <p style={{ color: sub, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>{picked.length} / {spread.count} 장 선택됨</p>
              <div style={{ position: 'relative', height: '150px', overflow: 'hidden', borderRadius: '14px', background: '#FFFBF7', border }}>
                <div style={{ display: 'flex', gap: '8px', padding: '15px 0', width: 'max-content', animation: 'slideLeft 10s linear infinite' }}>
                  {[...Array(24)].map((_, i) => (
                    <div key={i} onClick={drawOne}
                      style={{ flex: '0 0 80px', height: '118px', borderRadius: '10px', background: 'linear-gradient(135deg,#3C3489,#2C2C2A)', border: '1px solid rgba(250,199,117,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FAC775', fontSize: '26px' }}>✦</div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
                {picked.map((p, i) => (
                  <div key={i} style={{ width: '44px', height: '64px', borderRadius: '7px', background: '#2C2C2A', border: '1px solid rgba(250,199,117,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FAC775', fontSize: '13px' }}>{i + 1}</div>
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
          <p style={{ color: sub, fontSize: '12px', textAlign: 'center', marginBottom: '18px' }}>천천히, 마음의 준비가 되면</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            {picked.map((p, i) => (
              <div key={i} style={{ width: '92px', textAlign: 'center' }}>
                <div onClick={() => flipCard(i)}
                  style={{ width: '92px', height: '136px', borderRadius: '10px', cursor: p.flipped ? 'default' : 'pointer',
                    background: p.flipped ? '#2C2C2A' : 'linear-gradient(135deg,#3C3489,#2C2C2A)',
                    border: '1px solid rgba(250,199,117,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    transform: p.flipped && p.reversed ? 'rotate(180deg)' : 'none' }}>
                  {p.flipped
                    ? (p.card.imageUrl
                        ? <img src={p.card.imageUrl} alt={p.card.nameKo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                        : <span style={{ color: '#FAC775', fontSize: '13px', fontWeight: 500, padding: '0 4px', lineHeight: 1.3 }}>{p.card.nameKo}</span>)
                    : <span style={{ color: '#FAC775', fontSize: '28px' }}>✦</span>}
                </div>
                <div style={{ fontSize: '11px', color: sub, marginTop: '5px' }}>{p.position}</div>
                {p.flipped && <div style={{ fontSize: '10px', color: p.reversed ? '#e57373' : '#81c784', marginTop: '2px' }}>{p.reversed ? '역방향' : '정방향'}</div>}
              </div>
            ))}
          </div>
          {allFlipped && (
            <button onClick={getInterpretation} disabled={loading}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', marginTop: '22px', background: rose, border: 'none', color: '#fff', fontSize: '15px', fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading
                ? <><span style={{ animation: 'spin 1s linear infinite' }}>✦</span> 카드를 읽는 중...</>
                : (hasCachedInterp ? '🔮 해석 다시 보기' : '🔮 해석 보기')}
            </button>
          )}
        </div>
      )}

      {step === 'result' && interp && (
        <div style={{ padding: '18px 16px' }}>
          {savedId && (
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <span style={{ display: 'inline-block', background: 'rgba(74,148,80,0.12)', color: '#4a9450', fontSize: '11.5px', fontWeight: 600, padding: '5px 12px', borderRadius: '20px' }}>
                {viewOnly ? '📁 보관함에서 불러온 기록' : '✓ 보관함에 저장됐어요'}
              </span>
            </div>
          )}
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: gold, marginBottom: '18px', lineHeight: 1.6, textAlign: 'center' }}>"{interp.title}"</div>

          {interp.cards?.map((c, i) => (
            <div key={i} style={{ borderLeft: `3px solid ${gold}`, padding: '4px 14px', marginBottom: '18px' }}>
              <div style={{ fontSize: '14px', color: gold, marginBottom: '6px', fontWeight: 600 }}>{c.position} — {c.name} ({c.direction})</div>
              <div style={{ fontSize: '15px', color: ink, lineHeight: 1.9 }}>{c.meaning}</div>
            </div>
          ))}
          {interp.summary && (
            <div style={{ background: cardBg, border, borderRadius: '14px', padding: '16px', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', color: gold, marginBottom: '8px', fontWeight: 600 }}>전체 흐름</div>
              <div style={{ fontSize: '15px', color: ink, lineHeight: 1.9 }}>{interp.summary}</div>
            </div>
          )}
          {interp.advice && (
            <div style={{ background: cardBg, border, borderRadius: '14px', padding: '16px', marginBottom: '18px' }}>
              <div style={{ fontSize: '14px', color: gold, marginBottom: '8px', fontWeight: 600 }}>조언</div>
              <div style={{ fontSize: '15px', color: ink, lineHeight: 1.9 }}>{interp.advice}</div>
            </div>
          )}

          <button onClick={startNew}
            style={{ width: '100%', padding: '13px', borderRadius: '12px', background: cardBg, border, color: sub, fontSize: '14px', cursor: 'pointer', marginBottom: '10px' }}>
            새로운 질문하기
          </button>
          <button onClick={() => router.push('/tarot/storage')}
            style={{ width: '100%', padding: '13px', borderRadius: '12px', background: 'transparent', border: `1px solid ${gold}`, color: gold, fontSize: '14px', cursor: 'pointer' }}>
            📜 내 타로 보관함
          </button>
        </div>
      )}
    </main>
  )
}

export default function TarotPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FDF6F0', color: rose }}>로딩 중...</div>}>
      <TarotInner />
    </Suspense>
  )
}
