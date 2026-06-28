'use client'
import { Suspense, useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsin } from '@/lib/saju/yongsin'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'
const GREEN = '#81c784'

const MY_INFO_KEY = 'myinfo'
const NAMING_RESULT_KEY = 'naming_last_result_v1'

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

// diagnosis 화면과 동일한 personKey 규칙 (동일인 식별)
function personKey(m: Record<string, unknown> | null): string {
  if (!m || !m.year) return ''
  const hourIdx = m.hour === '모름' || m.hour == null ? 'x' : m.hour
  return [m.calType || '양력', m.year, m.month, m.day, m.leapMonth || '0', hourIdx, m.gender || '남'].join('|')
}

function isHangulSyllable(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return code >= 0xac00 && code <= 0xd7a3
}

function NewHanjaInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [info, setInfo] = useState<{
    gender: string; calType: string
    year: number; month: number; day: number
    leapMonth: string; hourIdx: number | null
  } | null>(null)

  const [surname, setSurname] = useState<SavedChar | null>(null)
  const [syllables, setSyllables] = useState<string[]>([])
  const [activeIdx, setActiveIdx] = useState<number>(0)
  const [restored, setRestored] = useState(false)

  // 사주 정보 + 본인 성씨(동일인) + 새 이름(URL) 로딩
  useEffect(() => {
    let m: Record<string, unknown> = {}
    try {
      m = JSON.parse(localStorage.getItem(MY_INFO_KEY) || '{}')
      if (m.year) {
        setInfo({
          gender: (m.gender as string) || '남',
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
      const r = JSON.parse(localStorage.getItem(NAMING_RESULT_KEY) || '{}')
      const samePerson = r.personKey && r.personKey === personKey(m)
      if (samePerson && Array.isArray(r.chars) && r.chars[0]) {
        setSurname(r.chars[0] as SavedChar)
      }
    } catch {}
    // URL 새 이름 → 한글 음절 분해
    const nameParam = sp.get('name') || ''
    const arr = Array.from(nameParam.trim()).filter(isHangulSyllable)
    setSyllables(arr)
    setActiveIdx(0)
    setRestored(true)
  }, [sp])

  const { saju, dayStem, converting } = useResultSaju(
    info?.calType || '양력',
    info?.year || 0,
    info?.month || 0,
    info?.day || 0,
    info?.leapMonth || '0',
    info?.hourIdx ?? null,
  )

  const yong = useMemo(() => {
    if (!saju || !dayStem) return { yongsin: '', heeksin: '', score: {} as Record<string, number> }
    try {
      const y = calcYongsin(saju, dayStem)
      return { yongsin: ohaengChar(y.yongsin), heeksin: ohaengChar(y.heeksin), score: y.score }
    } catch {
      return { yongsin: '', heeksin: '', score: {} as Record<string, number> }
    }
  }, [saju, dayStem])
  const yongsin = yong.yongsin
  const yongsinReady = !converting && !!yongsin

  // 성씨 없거나 새 이름 없으면 안내
  if (restored && (!surname || syllables.length === 0)) {
    return (
      <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
        <Header router={router} />
        <div style={{ padding: '40px 8px', textAlign: 'center', color: SUB, lineHeight: 1.8 }}>
          {!surname
            ? <>먼저 &lsquo;내 이름 풀이&rsquo;에서<br />이름을 입력해 주세요.</>
            : <>새 이름이 전달되지 않았어요.<br />다시 입력해 주세요.</>}
          <div style={{ marginTop: 20 }}>
            <button onClick={() => router.push('/manseryeok/naming/rename/newname')}
              style={{ padding: '12px 22px', borderRadius: 12, background: 'rgba(250,199,117,0.16)', border: '1px solid ' + GOLD, color: GOLD, fontWeight: 700, cursor: 'pointer' }}>
              새 이름 입력으로 →
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!restored) return <main style={{ minHeight: '100vh', background: '#1f1e1c' }} />

  const target = syllables[activeIdx]

  return (
    <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <Header router={router} />

      <p style={{ fontSize: 12, color: SUB, margin: '0 0 14px', padding: '0 4px', lineHeight: 1.7 }}>
        {!yongsinReady
          ? '사주 불러오는 중…'
          : <>새 이름 <b style={{ color: '#fff' }}>{surname!.hanja}{syllables.join('')}</b> · 사주에 필요한 기운은 <b style={{ color: GOLD }}>{yongsin}</b>입니다</>}
      </p>

      {/* 글자 자리 (성씨 + 새 이름 글자들) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <div style={{ flex: 1, padding: '12px 0', borderRadius: 14, textAlign: 'center', background: CARD, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#cfcdc4' }}>{surname!.hanja}</div>
          <div style={{ fontSize: 10, color: SUB, marginTop: 3 }}>{surname!.hangul} · 성씨</div>
        </div>
        {syllables.map((syl, i) => {
          const on = activeIdx === i
          return (
            <button key={i} onClick={() => setActiveIdx(i)} className="active:scale-95"
              style={{ flex: 1, padding: '12px 0', borderRadius: 14, textAlign: 'center', cursor: 'pointer',
                background: on ? 'rgba(250,199,117,0.16)' : CARD,
                border: '1px solid ' + (on ? GOLD : 'rgba(250,199,117,0.12)') }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: on ? GOLD : '#fff' }}>{syl}</div>
              <div style={{ fontSize: 10, color: SUB, marginTop: 3 }}>{on ? '고르는 중' : '대기'}</div>
            </button>
          )
        })}
      </div>

      {/* 한자 조회/추천 목록 자리 — 조각 2b에서 채움 */}
      {!yongsinReady ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0' }}>
          <span style={{ fontSize: 34, color: GOLD, display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>✦</span>
          <span style={{ fontSize: 13, color: SUB }}>사주를 불러오는 중…</span>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: SUB, padding: 30, fontSize: 13, border: '1px dashed rgba(250,199,117,0.2)', borderRadius: 14 }}>
          &lsquo;{target}&rsquo; 한자 추천이 여기에 표시됩니다<br />
          <span style={{ fontSize: 11, color: GREEN }}>(다음 단계에서 연결)</span>
        </div>
      )}
    </main>
  )
}

function Header({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 16px' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 20, cursor: 'pointer' }}>{'\u2039'}</button>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>새 이름 한자 고르기</span>
    </div>
  )
}

export default function NewHanjaPage() {
  return (
    <Suspense fallback={<div style={{ background: '#1f1e1c', minHeight: '100vh' }} />}>
      <NewHanjaInner />
    </Suspense>
  )
}
