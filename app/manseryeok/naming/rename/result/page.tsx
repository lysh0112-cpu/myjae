'use client'
import { Suspense, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsin } from '@/lib/saju/yongsin'
import { diagnoseName, type NameChar, type DiagnoseResult, type Grade } from '@/lib/saju/naming'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'
const GREEN = '#81c784'

const MY_INFO_KEY = 'myinfo'
const NAMING_RESULT_KEY = 'naming_last_result_v1'
const PICKS_KEY = 'rename_picks_v1'

interface Pick {
  idx: number
  hangul: string
  fromHanja: string
  fromMeaning: string
  fromOhaeng: string
  fromStrokes: number
  toHanja: string
  toMeaning: string
  toOhaeng: string
  toStrokes: number
}

interface SavedChar {
  hangul: string
  hanja: string
  strokes: number
  resourceOhaeng: string
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

function ResultInner() {
  const router = useRouter()
  const [picks, setPicks] = useState<Pick[]>([])
  const [chars, setChars] = useState<SavedChar[]>([])
  const [yongsin, setYongsin] = useState('')
  const [beforeResult, setBeforeResult] = useState<DiagnoseResult | null>(null)
  const [loaded, setLoaded] = useState(false)

  const [info, setInfo] = useState<{
    calType: string; year: number; month: number; day: number
    leapMonth: string; hourIdx: number | null
  } | null>(null)

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PICKS_KEY) || '{}')
      if (Array.isArray(p.picks)) setPicks(p.picks)
      if (p.yongsin) setYongsin(ohaengChar(p.yongsin))
    } catch {}
    try {
      const r = JSON.parse(localStorage.getItem(NAMING_RESULT_KEY) || '{}')
      if (Array.isArray(r.chars)) {
        setChars(r.chars.filter((c: SavedChar | null): c is SavedChar => !!c))
      }
      if (r.result) setBeforeResult(r.result as DiagnoseResult)
    } catch {}
    try {
      const m = JSON.parse(localStorage.getItem(MY_INFO_KEY) || '{}')
      if (m.year) {
        setInfo({
          calType: m.calType || '양력',
          year: parseInt(m.year),
          month: parseInt(m.month),
          day: parseInt(m.day),
          leapMonth: m.leapMonth || '0',
          hourIdx: m.hour === '모름' || m.hour == null ? null : parseInt(m.hour),
        })
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

  // 새 이름(바뀐 한자 반영)의 진단 결과 = "후"
  const afterResult = useMemo<DiagnoseResult | null>(() => {
    if (!saju || !dayStem || chars.length === 0 || picks.length === 0) return null
    try {
      const y = calcYongsin(saju, dayStem)
      const surname: NameChar = {
        hangul: chars[0].hangul,
        hanja: chars[0].hanja,
        strokes: chars[0].strokes,
        resourceOhaeng: ohaengChar(chars[0].resourceOhaeng),
      }
      const given: NameChar[] = chars.slice(1).map((c, gi) => {
        const idx = gi + 1
        const p = picks.find((pp) => pp.idx === idx)
        return p
          ? { hangul: c.hangul, hanja: p.toHanja, strokes: p.toStrokes, resourceOhaeng: ohaengChar(p.toOhaeng) }
          : { hangul: c.hangul, hanja: c.hanja, strokes: c.strokes, resourceOhaeng: ohaengChar(c.resourceOhaeng) }
      })
      return diagnoseName({
        surname, given,
        yongsin: y.yongsin, heeksin: y.heeksin, elementScore: y.score,
      })
    } catch {
      return null
    }
  }, [saju, dayStem, chars, picks])

  if (loaded && (picks.length === 0 || chars.length === 0)) {
    return (
      <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
        <Header router={router} />
        <div style={{ padding: '40px 8px', textAlign: 'center', color: SUB, lineHeight: 1.8 }}>
          먼저 한자 바꾸기에서<br />글자를 골라주세요.
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

  const newChars = chars.map((c, i) => {
    const p = picks.find((pp) => pp.idx === i)
    return p ? p.toHanja : c.hanja
  })
  const oldName = chars.map((c) => c.hanja).join('')
  const newName = newChars.join('')
  const hangulName = chars.map((c) => c.hangul).join('')

  // 4요소 전후 비교 행 구성
  type Row = { label: string; before?: Grade; after?: Grade }
  const rows: Row[] = afterResult ? [
    { label: '사주 보완 (용신)', before: beforeResult?.yongsinBohwan.grade, after: afterResult.yongsinBohwan.grade },
    { label: '한자 기운 (자원오행)', before: beforeResult?.resourceFlow.grade, after: afterResult.resourceFlow.grade },
    { label: '소리 기운 (발음오행)', before: beforeResult?.soundFlow.grade, after: afterResult.soundFlow.grade },
    { label: '이름 수리 (81수리)', before: beforeResult?.suri.grade, after: afterResult.suri.grade },
  ] : []

  return (
    <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <Header router={router} />

      {/* 새 이름 */}
      <div style={{ textAlign: 'center', margin: '14px 0 6px' }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: 4 }}>{newName}</div>
        <div style={{ fontSize: 13, color: SUB, marginTop: 4 }}>{hangulName} · 추천 이름</div>
        <div style={{ fontSize: 11, color: SUB, marginTop: 2 }}>
          기존 <span style={{ textDecoration: 'line-through' }}>{oldName}</span> 에서 한자만 바뀝니다
        </div>
      </div>

      {/* 동그라미 전후 비교 */}
      <div style={{ fontSize: 11, color: SUB, margin: '18px 0 8px' }}>바뀌는 글자</div>
      {picks.map((p) => {
        const fit = ohaengChar(p.toOhaeng) === yongsin
        return (
          <div key={p.idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: CARD, border: '1px solid rgba(250,199,117,0.1)', borderRadius: 14, padding: '18px 8px', marginBottom: 8 }}>
            <div style={{ textAlign: 'center', minWidth: 84 }}>
              <div style={{ fontSize: 10, color: SUB, marginBottom: 6 }}>현재</div>
              <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#3a3a37', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <span style={{ fontSize: 32, color: '#cfcdc4' }}>{p.fromHanja}</span>
              </div>
              <div style={{ fontSize: 11, color: SUB, marginTop: 6 }}>{p.fromMeaning} {p.hangul}</div>
              <div style={{ fontSize: 9, color: SUB, marginTop: 2 }}>{p.fromOhaeng}·{p.fromStrokes}획</div>
            </div>

            <span style={{ fontSize: 22, color: GOLD }}>{'\u2192'}</span>

            <div style={{ textAlign: 'center', minWidth: 84 }}>
              <div style={{ fontSize: 10, color: GOLD, marginBottom: 6 }}>추천</div>
              <div style={{ width: 74, height: 74, borderRadius: '50%', background: 'rgba(250,199,117,0.18)', border: '2px solid ' + GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <span style={{ fontSize: 34, color: GOLD }}>{p.toHanja}</span>
              </div>
              <div style={{ fontSize: 11, color: '#cfcdc7', marginTop: 6 }}>{p.toMeaning} {p.hangul}</div>
              <div style={{ fontSize: 9, color: fit ? GREEN : SUB, marginTop: 2 }}>
                {p.toOhaeng}·{p.toStrokes}획 {fit ? '✓' : ''}
              </div>
            </div>
          </div>
        )
      })}

      {/* 종합 등급 전후 (C) */}
      {afterResult && (
        <div style={{ background: 'rgba(129,199,132,0.1)', border: '1px solid rgba(129,199,132,0.4)', borderRadius: 14, padding: 18, textAlign: 'center', margin: '16px 0 14px' }}>
          <div style={{ fontSize: 11, color: SUB, marginBottom: 10 }}>이름 종합 등급</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: gradeColor(beforeResult?.overallGrade ?? '보통') }}>
                {beforeResult?.overallGrade ?? '—'}
              </div>
              <div style={{ fontSize: 10, color: SUB, marginTop: 2 }}>기존 {oldName}</div>
            </div>
            <span style={{ fontSize: 20, color: GOLD }}>{'\u2192'}</span>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: gradeColor(afterResult.overallGrade) }}>
                {afterResult.overallGrade}
              </div>
              <div style={{ fontSize: 10, color: GREEN, marginTop: 2 }}>추천 {newName}</div>
            </div>
          </div>
        </div>
      )}

      {/* 4요소 전후 비교 (A) */}
      {afterResult && (
        <div style={{ background: CARD, border: '1px solid rgba(250,199,117,0.1)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: GOLD, marginBottom: 10 }}>무엇이 좋아지나</div>
          {rows.map((row, i) => {
            const changed = row.before !== undefined && row.before !== row.after
            const last = i === rows.length - 1
            return (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 13, color: changed ? '#fff' : SUB }}>{row.label}</span>
                {changed ? (
                  <span style={{ fontSize: 12 }}>
                    <span style={{ color: SUB, textDecoration: 'line-through' }}>{row.before}</span>{' '}
                    <span style={{ color: gradeColor(row.after ?? '보통') }}>{'\u2192'} {row.after}</span>
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: gradeColor(row.after ?? '보통') }}>{row.after} (유지)</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 설명 */}
      <div style={{ background: 'rgba(129,199,132,0.08)', border: '1px solid rgba(129,199,132,0.3)', borderRadius: 14, padding: '13px 16px' }}>
        <p style={{ fontSize: 13, color: '#dfe7d8', lineHeight: 1.8, margin: 0 }}>
          {yongsin
            ? <>발음 <b style={{ color: '#fff' }}>{hangulName}</b>은 그대로 두고 한자만 바꿔, 사주에 필요한 기운 <b style={{ color: GREEN }}>{yongsin}</b>을(를) 채워주는 글자로 보완했습니다. 부르던 이름은 변하지 않으면서 한자 기운의 균형이 한결 좋아집니다.</>
            : <>발음은 그대로 두고 한자만 바꿔 사주 기운의 균형을 보완했습니다.</>}
        </p>
      </div>

      <div style={{ fontSize: 11, color: SUB, margin: '16px 0 6px' }}>더 정확히 보려면</div>
      <div style={{ background: CARD, border: '1px solid rgba(250,199,117,0.12)', borderRadius: 14, padding: '13px 16px', fontSize: 12, color: SUB, lineHeight: 1.7 }}>
        이 추천은 용신·자원오행·81수리를 종합한 자동 분석입니다. 최종 확정은 연재 선생님 상담에서 도와드립니다.
      </div>

      <button onClick={() => router.back()} className="active:scale-95"
        style={{ marginTop: 16, width: '100%', background: CARD, border: '1px solid rgba(250,199,117,0.2)', borderRadius: 14, padding: 13, color: '#fff', fontSize: 13, cursor: 'pointer' }}>
        다른 한자 다시 고르기
      </button>
      <div style={{ border: '1px dashed rgba(250,199,117,0.35)', borderRadius: 14, padding: 14, textAlign: 'center', marginTop: 10, color: SUB, fontSize: 13 }}>
        전문가 상담으로 확정하기 (준비 중)
      </div>
    </main>
  )
}

function Header({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 16px' }}>
      <button onClick={() => router.push('/manseryeok/naming')} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 20, cursor: 'pointer' }}>{'\u2039'}</button>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>개명 후보 결과</span>
    </div>
  )
}

export default function RenameResultPage() {
  return (
    <Suspense fallback={<div style={{ background: '#1f1e1c', minHeight: '100vh' }} />}>
      <ResultInner />
    </Suspense>
  )
}
