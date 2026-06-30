'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PageHeader from '@/app/components/common/PageHeader'
import { runDiagnose, type DiagnosedDate } from '../lib/diagnose'

const cardBg = '#13132a'
const sub = '#5555aa'
const text = '#e8e4ff'
const gold = '#FAC775'

const PRICE = 9900

const HOUR_LABELS: Record<string, string> = {
  '-1': '시간 모름',
  '0': '子시(23~01)', '1': '丑시(01~03)', '2': '寅시(03~05)', '3': '卯시(05~07)',
  '4': '辰시(07~09)', '5': '巳시(09~11)', '6': '午시(11~13)', '7': '未시(13~15)',
  '8': '申시(15~17)', '9': '酉시(17~19)', '10': '戌시(19~21)', '11': '亥시(21~23)',
}

interface PersonInput {
  year: string; month: string; day: string; hour: string
  gender: string; calType: string; job: string; mbti: string
}

const GRADE_COLOR: Record<string, string> = {
  S: '#FAC775', A: '#9be29b', B: '#9bc0e2', C: '#c8b0ff', D: '#9a98b0', '-': '#9a98b0',
}

function Disclaimer({ full }: { full?: boolean }) {
  return (
    <div style={{ background: 'rgba(255,120,120,0.06)', border: '1px solid rgba(255,120,120,0.18)', borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#d88', lineHeight: 1.6 }}>
      {full
        ? '※ 본 분석은 전통 사주명리에 기반한 참고 정보입니다. 실제 예식일은 양가·예식장 사정과 두 분의 형편을 함께 고려해 결정하세요.'
        : '※ 전통 명리 참고용 · 실제 예식일은 양가·예식장 사정과 함께 결정하세요.'}
    </div>
  )
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: gold, fontSize: '12px', letterSpacing: '1px' }}>
      {'★'.repeat(n)}<span style={{ color: '#444466' }}>{'★'.repeat(5 - n)}</span>
    </span>
  )
}

function personSummary(p: PersonInput | null): string {
  if (!p || !p.year) return '정보 없음'
  const hour = HOUR_LABELS[p.hour] ?? '시간 모름'
  return `${p.gender} · ${p.calType} ${p.year}.${p.month}.${p.day} · ${hour}`
}

function ResultCard({ r }: { r: DiagnosedDate }) {
  if (!r.passed) {
    return (
      <div style={{ background: 'rgba(255,120,120,0.06)', border: '1px solid rgba(255,120,120,0.2)', borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '14px', color: text, fontWeight: 600 }}>{r.dateLabel}</span>
          <span style={{ fontSize: '12px', color: '#e0a0a0', fontWeight: 600 }}>아쉬운 날</span>
        </div>
        {r.ganji !== '?' && <div style={{ fontSize: '12px', color: sub, marginBottom: '8px' }}>일진 {r.ganji}</div>}
        {r.avoidReasons.map((reason, i) => (
          <div key={i} style={{ fontSize: '12px', color: '#c89090', lineHeight: 1.7 }}>· {reason}</div>
        ))}
        <div style={{ fontSize: '11px', color: sub, marginTop: '8px', lineHeight: 1.6 }}>
          전통적으로 혼례에 피해온 날이에요. 아래에서 좋은 날을 새로 찾아보실 수 있어요.
        </div>
      </div>
    )
  }

  const b = r.breakdown!
  const rows = [
    { label: '천을귀인 (귀인의 도움)', score: b.cheoneul, max: 30 },
    { label: '부부 용신 (기운 보완)', score: b.yongsin, max: 30 },
    { label: '손 없는 날', score: b.sonEopneun, max: 20 },
    { label: '천희·홍란 (혼인 길신)', score: b.cheonhuiHongran, max: 20 },
  ]
  return (
    <div style={{ background: cardBg, border: '1px solid ' + (r.grade === 'S' || r.grade === 'A' ? 'rgba(250,199,117,0.35)' : 'rgba(255,255,255,0.06)'), borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '14px', color: text, fontWeight: 600 }}>{r.dateLabel}</span>
        <span style={{ fontSize: '15px', fontWeight: 700, color: gold }}>{r.score}점</span>
      </div>
      <div style={{ fontSize: '12px', color: sub, marginBottom: '12px' }}>
        일진 {r.ganji} · <span style={{ color: GRADE_COLOR[r.grade] }}>{r.grade}등급</span>
      </div>

      {r.badges.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
          {r.badges.map((bd, i) => (
            <span key={i} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(250,199,117,0.12)', color: gold, border: '1px solid rgba(250,199,117,0.25)' }}>✦ {bd}</span>
          ))}
        </div>
      )}

      <div style={{ fontSize: '11px', color: sub, marginBottom: '8px' }}>길신 점수</div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: '#b8b4d8' }}>{row.label}</span>
          <Stars n={row.score === 0 ? 0 : Math.max(1, Math.round((row.score / row.max) * 5))} />
        </div>
      ))}
    </div>
  )
}

function CheckInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [groom, setGroom] = useState<PersonInput | null>(null)
  const [bride, setBride] = useState<PersonInput | null>(null)
  const [dates, setDates] = useState<string[]>([''])

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<DiagnosedDate[]>([])
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  useEffect(() => {
    try {
      const p1 = sp.get('p1')
      const p2 = sp.get('p2')
      if (p1) setGroom(JSON.parse(decodeURIComponent(p1)))
      if (p2) setBride(JSON.parse(decodeURIComponent(p2)))
    } catch {}
  }, [sp])

  function setDate(idx: number, value: string) {
    setDates(prev => prev.map((d, i) => (i === idx ? value : d)))
  }
  function addDate() {
    setDates(prev => (prev.length >= 3 ? prev : [...prev, '']))
  }
  function removeDate(idx: number) {
    setDates(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
  }

  function handleOpenPay() {
    if (!groom || !groom.year || !bride || !bride.year) {
      setError('두 분의 사주 정보가 없어요. 이전 화면에서 신랑·신부 생년월일을 입력해 주세요 😊')
      return
    }
    const filled = dates.filter(d => d && d.trim())
    if (filled.length === 0) {
      setError('진단할 날짜를 한 개 이상 입력해 주세요 😊')
      return
    }
    setError('')
    setPayOpen(true)
  }

  async function runCheck() {
    setPayOpen(false)
    const filled = dates.filter(d => d && d.trim())
    setLoading(true)
    setDone(false)
    try {
      const result = await runDiagnose({ dates: filled, groom, bride })
      if (result.error) { setError(result.error); setLoading(false); return }
      setResults(result.results)
      setDone(true)
    } catch {
      setError('진단 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  function goFind() {
    if (!groom || !bride) return
    const p1 = encodeURIComponent(JSON.stringify(groom))
    const p2 = encodeURIComponent(JSON.stringify(bride))
    router.push(`/manseryeok/wedding-timing/find?p1=${p1}&p2=${p2}`)
  }

  const anyAvoid = done && results.some(r => !r.passed)

  return (
    <main style={{ minHeight: '100vh', background: '#0d0d1a', maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>
      <PageHeader
        title="정한 날 봐드리기"
        subtitle="생각한 날짜가 좋은 날인지 봐드려요"
        onBack={() => router.back()}
      />

      <div style={{ padding: '16px' }}>
        <Disclaimer full />

        <div style={{ fontSize: '13px', color: '#c8c0ff', fontWeight: 600, margin: '20px 0 10px' }}>두 사람 정보</div>
        <div style={{ background: cardBg, borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px' }}>🤵</span>
            <span style={{ fontSize: '12px', color: sub, width: '44px' }}>신랑</span>
            <span style={{ fontSize: '13px', color: text }}>{personSummary(groom)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>👰</span>
            <span style={{ fontSize: '12px', color: sub, width: '44px' }}>신부</span>
            <span style={{ fontSize: '13px', color: text }}>{personSummary(bride)}</span>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: '#c8c0ff', fontWeight: 600, margin: '20px 0 10px' }}>
          봐드릴 날짜 <span style={{ fontSize: '11px', color: sub, fontWeight: 400 }}>(최대 3개)</span>
        </div>
        {dates.map((d, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
            <input type="date" value={d}
              onChange={e => setDate(i, e.target.value)}
              style={{ flex: 1, boxSizing: 'border-box', background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '12px 14px', color: d ? '#c8b0ff' : '#5555aa', fontSize: '15px', colorScheme: 'dark', outline: 'none' }} />
            {dates.length > 1 && (
              <button onClick={() => removeDate(i)}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 12px', color: sub, fontSize: '13px', cursor: 'pointer' }}>✕</button>
            )}
          </div>
        ))}
        {dates.length < 3 && (
          <button onClick={addDate}
            style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'transparent', border: '1px dashed rgba(200,176,255,0.3)', color: '#c8b0ff', fontSize: '13px', cursor: 'pointer', marginTop: '2px' }}>
            + 날짜 추가
          </button>
        )}

        {error && (
          <div style={{ marginTop: '14px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#ff8888', lineHeight: 1.6 }}>
            {error}
          </div>
        )}

        <button onClick={handleOpenPay} disabled={loading}
          style={{ width: '100%', marginTop: '18px', padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg,#5544bb,#7766dd)', border: 'none', color: text, fontSize: '15px', fontWeight: 600, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '보는 중...' : '📅 이 날이 좋은지 봐주기'}
        </button>

        {done && results.length > 0 && (
          <>
            <div style={{ fontSize: '13px', color: '#c8c0ff', fontWeight: 600, margin: '24px 0 12px' }}>◆ 진단 결과</div>
            {results.map((r, i) => <ResultCard key={i} r={r} />)}

            {anyAvoid && (
              <div style={{ background: 'linear-gradient(160deg,#34322f 0%,#2C2C2A 100%)', border: `1px solid ${gold}`, borderRadius: '14px', padding: '16px', marginTop: '6px' }}>
                <div style={{ fontSize: '12px', color: '#c8b0ff', marginBottom: '10px', lineHeight: 1.5 }}>
                  아쉬운 날이 있으셨나요? 두 분께 맞는 좋은 날을 찾아드릴게요.
                </div>
                <button onClick={goFind}
                  style={{ width: '100%', padding: '13px', borderRadius: '12px', background: 'rgba(250,199,117,0.16)', border: `1px solid ${gold}`, color: gold, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                  💍 좋은 결혼 길일 찾아보기 →
                </button>
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: '16px' }}>
          <Disclaimer />
        </div>
      </div>

      {payOpen && (
        <div onClick={() => setPayOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', background: '#15152e', borderRadius: '20px 20px 0 0', padding: '10px 20px 28px', boxShadow: '0 -8px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)', margin: '0 auto 18px' }} />

            <div style={{ fontSize: '17px', fontWeight: 700, color: text, marginBottom: '4px' }}>📅 정한 날 진단</div>
            <div style={{ fontSize: '13px', color: sub, marginBottom: '16px', lineHeight: 1.6 }}>
              생각해 둔 날짜가 두 분께 좋은 날인지 봐드려요
            </div>

            <div style={{ background: cardBg, borderRadius: '12px', padding: '14px', marginBottom: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '12px', color: sub, marginBottom: '8px' }}>분석 내용</div>
              {['입력한 날짜별 길흉 진단', '길신 풀이(천을귀인·용신·손없는날 등)', '피해야 할 날이면 사유 안내', '두 사람 사주 함께 반영'].map((t, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#b8b4d8', lineHeight: 1.9 }}>· {t}</div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', color: sub }}>결제 금액</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#c8b0ff' }}>{PRICE.toLocaleString()}원</span>
            </div>

            <button onClick={runCheck}
              style={{ width: '100%', padding: '15px', borderRadius: '12px', background: 'linear-gradient(135deg,#5544bb,#7766dd)', border: 'none', color: text, fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginBottom: '8px' }}>
              💳 {PRICE.toLocaleString()}원 결제하기
            </button>
            <div style={{ fontSize: '11px', color: sub, textAlign: 'center', marginBottom: '14px' }}>
              (결제 시스템 첨부 예정 — 지금은 바로 결과를 봐요)
            </div>

            <button onClick={() => setPayOpen(false)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: sub, fontSize: '13px', cursor: 'pointer', marginBottom: '14px' }}>
              취소
            </button>

            <Disclaimer />
          </div>
        </div>
      )}
    </main>
  )
}

export default function WeddingCheckPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d1a' }}>
        <div style={{ color: '#c8b0ff' }}>로딩 중...</div>
      </div>
    }>
      <CheckInner />
    </Suspense>
  )
}
