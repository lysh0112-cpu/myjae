'use client'
import { Suspense, useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsinCompat } from '@/lib/saju/yongsinNew'
import { supabase } from '@/lib/supabase'
import { diagnoseName, type NameChar, type DiagnoseResult, type Grade } from '@/lib/saju/naming'
import ConsultButton from '@/app/components/common/ConsultButton'

const GOLD = '#c8783c'
const CARD = '#fffbf7'
const SUB = '#b4785a'
const GREEN = '#81c784'

const DEFAULT_TRY_LIMIT = 3

const MY_INFO_KEY = 'myinfo'
const NEWNAME_HISTORY_KEY = 'newname_history_v1'
const NAMING_PASS_KEY = 'naming_pass_v1'   // 개명 이용권 { userId, remaining }

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

function NewResultInner() {
  const router = useRouter()

  const [info, setInfo] = useState<{
    calType: string; year: number; month: number; day: number
    leapMonth: string; hourIdx: number | null
  } | null>(null)

  const [tries, setTries] = useState<TryItem[]>([])
  const [activeTry, setActiveTry] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [uid, setUid] = useState('')   // ★ 로그인 회원 user_id (tries 열쇠)

  // ★ 이름 짓기 조회 횟수 (관리자 설정값 · app_settings)
  const [TRY_LIMIT, setTryLimit] = useState(DEFAULT_TRY_LIMIT)
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'naming_try_limit').maybeSingle()
      .then(({ data }) => { if (data && typeof data.value === 'number') setTryLimit(data.value) })
  }, [])

  const [detailLoading, setDetailLoading] = useState(false)

  const [remaining, setRemaining] = useState(0)   // ★ 남은 조회 횟수(이용권)

  // 이용권 남은 횟수 읽기 (uid 확정 후)
  useEffect(() => {
    if (!uid) return
    try {
      const p = JSON.parse(localStorage.getItem(NAMING_PASS_KEY) || '{}')
      if (p.userId === uid && typeof p.remaining === 'number') setRemaining(p.remaining)
      else setRemaining(0)
    } catch { setRemaining(0) }
  }, [uid])

  useEffect(() => {
    let cancelled = false

    async function load() {
      // 사주 info는 localStorage myinfo에서 (계산용)
      try {
        const m = JSON.parse(localStorage.getItem(MY_INFO_KEY) || '{}')
        if (m.year && !cancelled) {
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

      // ★ tries는 user_id 열쇠로 읽음 (저장한 newhanja와 동일 규칙)
      try {
        const { data: u } = await supabase.auth.getUser()
        const myUid = u?.user?.id || ''
        if (!cancelled) setUid(myUid)
        const h = JSON.parse(localStorage.getItem(NEWNAME_HISTORY_KEY) || '{}')
        if (!cancelled && h.userId === myUid && Array.isArray(h.tries) && h.tries.length > 0) {
          setTries(h.tries)
          setActiveTry(h.tries.length - 1)
        }
      } catch {}

      if (!cancelled) setLoaded(true)
    }

    load()
    return () => { cancelled = true }
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
    try { return ohaengChar(calcYongsinCompat(saju, dayStem).yongsin) } catch { return '' }
  }, [saju, dayStem])

  const result = useMemo<DiagnoseResult | null>(() => {
    if (!saju || !dayStem || !cur || cur.chars.length < 2) return null
    try {
      const y = calcYongsinCompat(saju, dayStem)
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

  // ★ 현재 보고 있는 "새 이름"을 예약 시 상담사 화면으로 넘기기 위해 세션에 저장
  //    (궁합·물상도·이름풀이와 동일 방식. consultant-select가 naming_full을 읽어 namings에 저장)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!cur || !result) return
    try {
      sessionStorage.setItem('naming_full', JSON.stringify({
        kind: 'self',
        hangul_name: cur.chars.map((c) => c.hangul).join(''),
        hanja_name: cur.chars.map((c) => c.hanja).join(''),
        chars: cur.chars.map((c) => ({
          hangul: c.hangul,
          hanja: c.hanja,
          strokes: c.strokes,
          resourceOhaeng: c.resourceOhaeng,
        })),
        result,
        commentary: cur.commentary ?? null,
        target_birth: null,
      }))
      // ★ 상담사 화면에 뜰 해설 텍스트 (물상도·이름풀이와 동일 방식)
      const c = cur.commentary
      if (c) {
        const hangulName = cur.chars.map((ch) => ch.hangul).join('')
        const hanjaName = cur.chars.map((ch) => ch.hanja).join('')
        const text = `[개명 · ${hangulName} (${hanjaName})]\n\n· 종합\n${c.summary || ''}\n\n· 좋은 점\n${c.good || ''}\n\n· 더 좋아지려면\n${c.improve || ''}\n\n· 조언\n${c.advice || ''}`.trim()
        sessionStorage.setItem('ai_analysis', text)
      }
    } catch {}
  }, [cur, result])

  const tryGrades = useMemo(() => {
    if (!saju || !dayStem) return tries.map(() => '')
    try {
      const y = calcYongsinCompat(saju, dayStem)
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
    if (!cur || !saju || !dayStem || detailLoading) return
    if (cur.commentary) return
    setDetailLoading(true)
    try {
      const y = calcYongsinCompat(saju, dayStem)
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
          birthData: info,
          saju,
        }),
      })
      const data = await res.json()
      const commentary: Commentary = data.commentary ?? { title: '', summary: '', good: '', improve: '', advice: '' }

      setTries((prev) => {
        const nextTries = prev.map((t, i) => (i === activeTry ? { ...t, commentary } : t))
        try {
          localStorage.setItem(NEWNAME_HISTORY_KEY, JSON.stringify({ userId: uid, tries: nextTries }))
        } catch {}
        return nextTries
      })

      // ★ 이용권 1회 차감 (상세 풀이를 실제로 받은 경우에만)
      setRemaining((prev) => {
        const next = Math.max(0, prev - 1)
        try {
          localStorage.setItem(NAMING_PASS_KEY, JSON.stringify({ userId: uid, remaining: next }))
        } catch {}
        return next
      })
    } catch (e) {
      console.error('detail error:', e)
    } finally {
      setDetailLoading(false)
    }
  }

  if (loaded && tries.length === 0) {
    return (
      <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
        <Header router={router} />
        <div style={{ padding: '40px 8px', textAlign: 'center', color: SUB, lineHeight: 1.8 }}>
          아직 지어본 이름이 없어요.
          <div style={{ marginTop: 20 }}>
            <button onClick={() => router.push('/manseryeok/naming/rename/newname')}
              style={{ padding: '12px 22px', borderRadius: 12, background: 'rgba(200,120,60,0.12)', border: '1px solid ' + GOLD, color: GOLD, fontWeight: 700, cursor: 'pointer' }}>
              새 이름 지으러 가기 →
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!loaded || !cur) return <main style={{ minHeight: '100vh', background: '#FDF6F0' }} />

  const fullName = cur.chars.map((c) => c.hanja).join('')
  const hangulName = cur.chars.map((c) => c.hangul).join('')
  const triesLeft = TRY_LIMIT - tries.length

  const rows = result ? [
    { label: '사주 보완 (용신)', f: result.yongsinBohwan },
    { label: '한자 기운 (자원오행)', f: result.resourceFlow },
    { label: '소리 기운 (발음오행)', f: result.soundFlow },
    { label: '이름 수리 (81수리)', f: result.suri },
  ] : []

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <Header router={router} />

      <div style={{ textAlign: 'center', margin: '14px 0 6px' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: GOLD, letterSpacing: 4 }}>{fullName}</div>
        <div style={{ fontSize: 13, color: SUB, marginTop: 4 }}>{hangulName} · 새로 지은 이름</div>
        {yongsin && <div style={{ fontSize: 11, color: SUB, marginTop: 2 }}>사주에 필요한 기운 <b style={{ color: GREEN }}>{yongsin}</b></div>}
      </div>

      {result && (
        <div style={{ background: CARD, border: '1px solid rgba(200,120,60,0.10)', borderRadius: 14, padding: 16, margin: '16px 0 14px' }}>
          <div style={{ fontSize: 12, color: GOLD, marginBottom: 12, fontWeight: 700 }}>이름 분석 (4가지 기준)</div>
          {rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i === rows.length - 1 ? 'none' : '0.5px solid #f0e0d5' }}>
              <span style={{ fontSize: 13, color: '#1a1a1a' }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: gradeColor(row.f.grade) }}>{row.f.grade}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '0.5px solid #f0e0d5', textAlign: 'center' }}>
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
                    background: on ? 'rgba(200,120,60,0.12)' : CARD,
                    border: '1px solid ' + (on ? GOLD : 'rgba(200,120,60,0.10)') }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: on ? GOLD : '#fff' }}>{t.chars.map((c) => c.hanja).join('')}</span>
                  {g && <span style={{ fontSize: 11, color: gradeColor(g), marginLeft: 6 }}>{g}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {cur.commentary && cur.commentary.summary ? (
        <div style={{ background: CARD, border: '1px solid rgba(200,120,60,0.12)', borderRadius: 16, padding: 18, marginBottom: 14 }}>
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
              <div style={{ fontSize: 14, color: '#1a1a1a', lineHeight: 1.8 }}>{s.text}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          {remaining > 0 ? (
            <>
              <button onClick={loadDetail} disabled={detailLoading} className="active:scale-95"
                style={{ width: '100%', background: 'rgba(200,120,60,0.12)', border: '1px solid ' + GOLD, borderRadius: 14, padding: 14, color: GOLD, fontWeight: 700, fontSize: 14, cursor: detailLoading ? 'default' : 'pointer' }}>
                {detailLoading
                  ? <><span style={{ display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>✦</span> 이름을 정성껏 풀이하는 중…</>
                  : <>✨ 이 이름 자세히 풀이 보기 · 남은 {remaining}회</>}
              </button>
              <div style={{ fontSize: 11, color: SUB, textAlign: 'center', marginTop: 8, lineHeight: 1.6 }}>
                결제하신 이용권으로 상세 풀이를 확인하실 수 있어요.
              </div>
            </>
          ) : (
            <div style={{ background: CARD, border: '1px solid rgba(200,120,60,0.14)', borderRadius: 14, padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.7, marginBottom: 12 }}>
                이용 가능 횟수를 모두 사용했어요.<br />다시 결제하시면 이어서 이용하실 수 있어요.
              </div>
              <button onClick={() => router.push('/manseryeok/naming/rename/newname')} className="active:scale-95"
                style={{ width: '100%', background: '#c8783c', border: 'none', borderRadius: 12, padding: 13, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                다시 결제하고 이어하기 →
              </button>
            </div>
          )}
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
        <button onClick={() => router.push('/manseryeok/naming/rename/newname')} className="active:scale-95"
          style={{ width: '100%', background: 'rgba(200,120,60,0.12)', border: '1px solid ' + GOLD, borderRadius: 14, padding: 13, color: GOLD, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          다른 이름 또 지어보기 →
        </button>
      ) : (
        <div style={{ background: CARD, border: '1px solid rgba(200,120,60,0.14)', borderRadius: 14, padding: '13px 16px', fontSize: 12, color: SUB, lineHeight: 1.7, textAlign: 'center' }}>
          {TRY_LIMIT}회를 모두 사용했어요.<br />지금까지 지어본 이름 중에서 골라보세요.
        </div>
      )}
    </main>
  )
}

function Header({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px',
      background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)', borderBottom: '0.5px solid #f0e0d5',
    }}>
      <button onClick={() => router.push('/manseryeok/naming/rename/newhanja')} aria-label="뒤로" style={{ background: 'none', border: 'none', color: '#999', fontSize: 20, cursor: 'pointer', padding: 0 }}>{'\u2039'}</button>
      <span style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>새 이름 결과</span>
    </div>
  )
}

export default function NewResultPage() {
  return (
    <Suspense fallback={<div style={{ background: '#FDF6F0', minHeight: '100vh' }} />}>
      <NewResultInner />
    </Suspense>
  )
}
