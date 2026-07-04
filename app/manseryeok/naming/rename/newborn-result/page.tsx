'use client'
import { Suspense, useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsin } from '@/lib/saju/yongsin'
import { diagnoseName, type NameChar, type DiagnoseResult, type Grade } from '@/lib/saju/naming'
import ConsultButton from '@/app/components/common/ConsultButton'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'
const GREEN = '#81c784'

const TRY_LIMIT = 3
const BABY_HISTORY_KEY = 'newborn_history_v1'

interface SavedChar {
  hangul: string
  hanja: string
  strokes: number
  resourceOhaeng: string
}

interface Commentary {
  title: string
  summary: string
  good: string
  improve: string
  advice: string
}

interface TryItem {
  name: string
  chars: SavedChar[]
  commentary?: Commentary
}

interface BabyInfo {
  gender: string
  calType: string
  year: string
  month: string
  day: string
  leapMonth: string
  hour: string
}

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

function babyKey(b: BabyInfo | null): string {
  if (!b || !b.year) return ''
  return ['baby', b.calType, b.year, b.month, b.day, b.leapMonth, b.hour, b.gender].join('_')
}

function NewbornResultInner() {
  const router = useRouter()
  const sp = useSearchParams()

  // ── URL에서 아기 사주 받기 (궁합 방식) ──
  const baby: BabyInfo | null = useMemo(() => {
    try {
      const raw = sp.get('baby')
      if (!raw) return null
      return JSON.parse(decodeURIComponent(raw)) as BabyInfo
    } catch { return null }
  }, [sp])
  const bkey = babyKey(baby)

  const [tries, setTries] = useState<TryItem[]>([])
  const [activeTry, setActiveTry] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [price, setPrice] = useState(20000)
  const [payOpen, setPayOpen] = useState(false)

  useEffect(() => {
    import('@/lib/supabase').then(({ supabase }) => {
      supabase
        .from('analysis_prices')
        .select('price')
        .eq('price_key', 'naming_hanja')
        .maybeSingle()
        .then(({ data }) => { if (data) setPrice(data.price) })
    })
  }, [])

  // 아기 tries 읽기 (아기 사주 열쇠로)
  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem(BABY_HISTORY_KEY) || '{}')
      if (h.babyKey === bkey && Array.isArray(h.tries) && h.tries.length > 0) {
        setTries(h.tries)
        setActiveTry(h.tries.length - 1)
      }
    } catch {}
    setLoaded(true)
  }, [bkey])

  const infoYear = baby ? parseInt(baby.year) : 0
  const infoMonth = baby ? parseInt(baby.month) : 0
  const infoDay = baby ? parseInt(baby.day) : 0
  const infoHourIdx = baby ? (baby.hour === '모름' ? null : parseInt(baby.hour)) : null

  const { saju, dayStem } = useResultSaju(
    baby?.calType || '양력',
    infoYear,
    infoMonth,
    infoDay,
    baby?.leapMonth || '0',
    infoHourIdx,
  )

  const cur = tries[activeTry]

  const yongsin = useMemo(() => {
    if (!saju || !dayStem) return ''
    try { return ohaengChar(calcYongsin(saju, dayStem).yongsin) } catch { return '' }
  }, [saju, dayStem])

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

  // 상담사 화면으로 넘길 아기 이름 결과 (naming_full + ai_analysis)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!cur || !result) return
    try {
      sessionStorage.setItem('naming_full', JSON.stringify({
        kind: 'newborn',
        hangul_name: cur.chars.map((c) => c.hangul).join(''),
        hanja_name: cur.chars.map((c) => c.hanja).join(''),
        chars: cur.chars.map((c) => ({
          hangul: c.hangul, hanja: c.hanja, strokes: c.strokes, resourceOhaeng: c.resourceOhaeng,
        })),
        result,
        commentary: cur.commentary ?? null,
        target_birth: baby ?? null,
      }))
      const c = cur.commentary
      if (c) {
        const hangulName = cur.chars.map((ch) => ch.hangul).join('')
        const hanjaName = cur.chars.map((ch) => ch.hanja).join('')
        const text = `[아기 이름 · ${hangulName} (${hanjaName})]\n\n· 종합\n${c.summary || ''}\n\n· 좋은 점\n${c.good || ''}\n\n· 더 좋아지려면\n${c.improve || ''}\n\n· 조언\n${c.advice || ''}`.trim()
        sessionStorage.setItem('ai_analysis', text)
      }
    } catch {}
  }, [cur, result, baby])

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

  async function loadDetail() {
    setPayOpen(false)
    if (!cur || !saju || !dayStem || detailLoading) return
    if (cur.commentary) return
    setDetailLoading(true)
    try {
      const y = calcYongsin(saju, dayStem)
      const surname: NameChar = {
        hangul: cur.chars[0].hangul, hanja: cur.chars[0].hanja,
        strokes: cur.chars[0].strokes, resourceOhaeng: ohaengChar(cur.chars[0].resourceOhaeng),
      }
      const given: NameChar[] = cur.chars.slice(1).map((c) => ({
        hangul: c.hangul, hanja: c.hanja, strokes: c.strokes, resourceOhaeng: ohaengChar(c.resourceOhaeng),
      }))
      const sajuText = Array.isArray(saju)
        ? (saju as { pillar: string; stem: string; branch: string }[]).map((p) => `${p.pillar}:${p.stem}${p.branch}`).join(', ')
        : ''
      const res = await fetch('/api/naming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surname, given,
          yongsin: y.yongsin, heeksin: y.heeksin, elementScore: y.score,
          dayStem, sajuText,
        }),
      })
      const data = await res.json()
      const commentary: Commentary = data.commentary ?? { title: '', summary: '', good: '', improve: '', advice: '' }
      setTries((prev) => {
        const nextTries = prev.map((t, i) => (i === activeTry ? { ...t, commentary } : t))
        try {
          localStorage.setItem(BABY_HISTORY_KEY, JSON.stringify({ babyKey: bkey, tries: nextTries }))
        } catch {}
        return nextTries
      })
    } catch (e) {
      console.error('detail error:', e)
    } finally {
      setDetailLoading(false)
    }
  }

  if (loaded && tries.length === 0) {
    return (
      <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
        <Header router={router} />
        <div style={{ padding: '40px 8px', textAlign: 'center', color: SUB, lineHeight: 1.8 }}>
          아직 지어본 이름이 없어요.
          <div style={{ marginTop: 20 }}>
            <button onClick={() => router.push('/manseryeok/naming/rename/newborn')}
              style={{ padding: '12px 22px', borderRadius: 12, background: 'rgba(250,199,117,0.16)', border: '1px solid ' + GOLD, color: GOLD, fontWeight: 700, cursor: 'pointer' }}>
              아기 이름 지으러 가기 →
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!loaded || !cur) return <main style={{ minHeight: '100vh', background: '#1f1e1c' }} />

  const fullName = cur.chars.map((c) => c.hanja).join('')
  const hangulName = cur.chars.map((c) => c.hangul).join('')
  const triesLeft = TRY_LIMIT - tries.length

  const rows = result ? [
    { label: '사주 보완 (용신)', f: result.yongsinBohwan },
    { label: '한자 기운 (자원오행)', f: result.resourceFlow },
    { label: '소리 기운 (발음오행)', f: result.soundFlow },
    { label: '이름 수리 (81수리)', f: result.suri },
  ] : []

  // 다른 이름 또 지어보려면 아기 사주를 그대로 들고 newborn 입력으로
  const babyParam = sp.get('baby') || ''

  return (
    <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <Header router={router} />

      <div style={{ textAlign: 'center', margin: '14px 0 6px' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: GOLD, letterSpacing: 4 }}>{fullName}</div>
        <div style={{ fontSize: 13, color: SUB, marginTop: 4 }}>{hangulName} · 아기 이름</div>
        {yongsin && <div style={{ fontSize: 11, color: SUB, marginTop: 2 }}>사주에 필요한 기운 <b style={{ color: GREEN }}>{yongsin}</b></div>}
      </div>

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

      {cur.commentary && cur.commentary.summary ? (
        <div style={{ background: CARD, border: '1px solid rgba(250,199,117,0.15)', borderRadius: 16, padding: 18, marginBottom: 14 }}>
          {cur.commentary.title && (
            <div style={{ fontSize: 16, fontWeight: 700, color: GOLD, marginBottom: 12, lineHeight: 1.5 }}>
              &ldquo;{cur.commentary.title}&rdquo;
            </div>
          )}
          {[
            { label: '종합', text: cur.commentary.summary },
            { label: '좋은 점', text: cur.commentary.good },
            { label: '더 좋아지려면', text: cur.commentary.improve },
            { label: '조언', text: cur.commentary.advice },
          ].filter((s) => s.text).map((s, i) => (
            <div key={i} style={{ borderLeft: '3px solid ' + GOLD, padding: '4px 12px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: GOLD, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 14, color: '#e0dce8', lineHeight: 1.8 }}>{s.text}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => setPayOpen(true)} disabled={detailLoading} className="active:scale-95"
            style={{ width: '100%', background: 'rgba(250,199,117,0.16)', border: '1px solid ' + GOLD, borderRadius: 14, padding: 14, color: GOLD, fontWeight: 700, fontSize: 14, cursor: detailLoading ? 'default' : 'pointer' }}>
            {detailLoading
              ? <><span style={{ display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>✦</span> 이름을 정성껏 풀이하는 중…</>
              : <>✨ 이 이름 자세히 풀이 보기 · {price.toLocaleString()}원</>}
          </button>
          <div style={{ fontSize: 11, color: SUB, textAlign: 'center', marginTop: 8, lineHeight: 1.6 }}>
            마음에 드는 이름을 고르면, 사주에 맞는지 상세히 풀어드려요.
          </div>
        </div>
      )}

      {/* 전문가 상담 연결 (개명 상담 · mode=naming) */}
      <div style={{ marginBottom: 14 }}>
        <ConsultButton priceKey="naming" mode="naming" />
      </div>

      <div style={{ fontSize: 11, color: SUB, textAlign: 'center', margin: '20px 0 8px' }}>
        총 {TRY_LIMIT}회까지 종합 해설이 가능합니다 · 남은 횟수 {triesLeft > 0 ? triesLeft : 0}회
      </div>
      {triesLeft > 0 ? (
        <button onClick={() => router.push('/manseryeok/naming/rename/newborn')} className="active:scale-95"
          style={{ width: '100%', background: 'rgba(250,199,117,0.16)', border: '1px solid ' + GOLD, borderRadius: 14, padding: 13, color: GOLD, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          다른 이름 또 지어보기 →
        </button>
      ) : (
        <div style={{ background: CARD, border: '1px solid rgba(250,199,117,0.2)', borderRadius: 14, padding: '13px 16px', fontSize: 12, color: SUB, lineHeight: 1.7, textAlign: 'center' }}>
          {TRY_LIMIT}회를 모두 사용했어요.<br />지금까지 지어본 이름 중에서 골라보세요.
        </div>
      )}

      {payOpen && (
        <div onClick={() => setPayOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', background: '#222220', borderRadius: '20px 20px 0 0', padding: '10px 20px 28px', boxShadow: '0 -8px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)', margin: '0 auto 18px' }} />
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>✍️ 이름 자세히 풀이</div>
            <div style={{ fontSize: '13px', color: SUB, marginBottom: '16px', lineHeight: 1.6 }}>
              아기 이름 <b style={{ color: GOLD }}>{fullName}</b>을 사주 기준으로 상세히 풀어드려요
            </div>
            <div style={{ background: CARD, borderRadius: '12px', padding: '14px', marginBottom: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '12px', color: SUB, marginBottom: '8px' }}>포함 내용</div>
              {['사주 보완(용신) 상세 풀이', '한자·소리 기운 분석', '이름 수리 해설', '종합 조언'].map((t, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#b8b4d8', lineHeight: 1.9 }}>· {t}</div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', color: SUB }}>결제 금액</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: GOLD }}>{price.toLocaleString()}원</span>
            </div>
            <button onClick={loadDetail}
              style={{ width: '100%', padding: '15px', borderRadius: '12px', background: 'linear-gradient(135deg,#3C3489 0%,#FAC775 100%)', border: 'none', color: '#1a1a18', fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginBottom: '8px' }}>
              💳 {price.toLocaleString()}원 결제하고 풀이 보기
            </button>
            <button onClick={() => setPayOpen(false)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: SUB, fontSize: '13px', cursor: 'pointer' }}>
              취소
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function Header({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 16px' }}>
      <button onClick={() => router.push('/manseryeok/naming')} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 20, cursor: 'pointer' }}>{'\u2039'}</button>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>아기 이름 결과</span>
    </div>
  )
}

export default function NewbornResultPage() {
  return (
    <Suspense fallback={<div style={{ background: '#1f1e1c', minHeight: '100vh' }} />}>
      <NewbornResultInner />
    </Suspense>
  )
}
