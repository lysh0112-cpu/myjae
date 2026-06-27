'use client'
import { Suspense, useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsin } from '@/lib/saju/yongsin'
import { supabase } from '@/lib/supabase'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'
const GREEN = '#81c784'

const MY_INFO_KEY = 'myinfo'
const NAMING_RESULT_KEY = 'naming_last_result_v1'

interface HanjaRow {
  hangul: string
  hanja: string
  meaning: string
  strokes: number
  resource_ohaeng: string
  sound_ohaeng: string
}

interface SavedChar {
  hangul: string
  hanja: string
  strokes: number
  resourceOhaeng: string
}

// 용신/자원오행 표기를 한 글자(목화토금수)로 정규화
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

function HanjaInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const count = sp.get('count') === '2' ? 2 : 1

  // 사주 정보 (myinfo에서 직접 로딩 — diagnosis와 동일)
  const [info, setInfo] = useState<{
    gender: string; calType: string
    year: number; month: number; day: number
    leapMonth: string; hourIdx: number | null
  } | null>(null)

  // 본인 이름 (naming_last_result_v1의 chars에서 복원)
  const [chars, setChars] = useState<SavedChar[]>([])

  useEffect(() => {
    try {
      const m = JSON.parse(localStorage.getItem(MY_INFO_KEY) || '{}')
      if (m.year) {
        setInfo({
          gender: m.gender || '남',
          calType: m.calType || '양력',
          year: parseInt(m.year),
          month: parseInt(m.month),
          day: parseInt(m.day),
          leapMonth: m.leapMonth || '0',
          hourIdx: m.hour === '모름' || m.hour == null ? null : parseInt(m.hour),
        })
      }
    } catch {}
    try {
      const r = JSON.parse(localStorage.getItem(NAMING_RESULT_KEY) || '{}')
      if (Array.isArray(r.chars)) {
        setChars(r.chars.filter((c: SavedChar | null): c is SavedChar => !!c))
      }
    } catch {}
  }, [])

  const { saju, dayStem, converting } = useResultSaju(
    info?.calType || '양력',
    info?.year || 0,
    info?.month || 0,
    info?.day || 0,
    info?.leapMonth || '0',
    info?.hourIdx ?? null,
  )

  // 용신 계산
  const yongsin = useMemo(() => {
    if (!saju || !dayStem) return ''
    try {
      return ohaengChar(calcYongsin(saju, dayStem).yongsin)
    } catch {
      return ''
    }
  }, [saju, dayStem])

  // 이름자 후보 (성 제외). chars[0]=성, 나머지가 이름
  const givenChars = chars.slice(1)

  // 바꿀 자리 선택 상태 (chars 기준 인덱스). count===2면 두 자리 다.
  const [targetIdxs, setTargetIdxs] = useState<number[]>([])
  // 두 글자 모드에서 지금 고르는 순서
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  // 각 자리에서 선택한 한자
  const [chosen, setChosen] = useState<Record<number, HanjaRow>>({})

  // 한자 목록
  const [hanjaList, setHanjaList] = useState<HanjaRow[]>([])
  const [loadingList, setLoadingList] = useState(false)

  // 두 글자 모드면 이름 두 자리 자동 지정
  useEffect(() => {
    if (count === 2 && givenChars.length >= 2) {
      const idxs = givenChars.map((_, i) => i + 1) // chars 기준 인덱스
      setTargetIdxs(idxs)
      setActiveIdx(idxs[0])
    }
  }, [count, givenChars.length])

  // activeIdx가 정해지면 그 음의 한자 조회
  useEffect(() => {
    if (activeIdx === null) { setHanjaList([]); return }
    const target = chars[activeIdx]
    if (!target) return
    let cancelled = false
    setLoadingList(true)
    supabase
      .from('hanja')
      .select('hangul, hanja, meaning, strokes, resource_ohaeng, sound_ohaeng')
      .eq('hangul', target.hangul)
      .order('strokes', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error(error); setHanjaList([]) }
        else setHanjaList((data as HanjaRow[]) ?? [])
        setLoadingList(false)
      })
    return () => { cancelled = true }
  }, [activeIdx, chars])

  // 한 글자 모드에서 자리 선택
  function chooseSlot(idx: number) {
    setTargetIdxs([idx])
    setActiveIdx(idx)
    setChosen({})
  }

  // 한자 선택
  function pickHanja(row: HanjaRow) {
    if (activeIdx === null) return
    setChosen((prev) => ({ ...prev, [activeIdx]: row }))
  }

  // 다음 자리로 or 결과로
  function proceed() {
    if (activeIdx === null || !chosen[activeIdx]) return
    // 두 글자 모드: 아직 안 고른 자리가 있으면 그 자리로 이동
    const next = targetIdxs.find((i) => !chosen[i] && i !== activeIdx)
    if (next !== undefined) {
      setActiveIdx(next)
      setHanjaList([])
      return
    }
    // 모두 고름 → 결과로 (선택 결과를 localStorage에 임시 저장)
    const picks = targetIdxs.map((i) => ({
      idx: i,
      hangul: chars[i]?.hangul,
      from: chars[i]?.hanja,
      to: chosen[i]?.hanja,
      meaning: chosen[i]?.meaning,
      resourceOhaeng: chosen[i]?.resource_ohaeng,
      strokes: chosen[i]?.strokes,
    }))
    try {
      localStorage.setItem('rename_picks_v1', JSON.stringify({ picks, yongsin }))
    } catch {}
    const q = picks.map((p) => p.to).join('')
    router.push('/manseryeok/naming/rename/result?hanja=' + encodeURIComponent(q))
  }

  // ----- 화면 -----

  // 이름 정보가 없으면 안내
  if (chars.length === 0 || givenChars.length === 0) {
    return (
      <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
        <Header router={router} />
        <div style={{ padding: '40px 8px', textAlign: 'center', color: SUB, lineHeight: 1.8 }}>
          먼저 &lsquo;내 이름 풀이&rsquo;에서<br />이름을 입력해 주세요.
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

  const fullName = chars.map((c) => c.hanja).join('')
  const target = activeIdx !== null ? chars[activeIdx] : null
  const fitList = hanjaList.filter((x) => ohaengChar(x.resource_ohaeng) === yongsin)
  const restList = hanjaList.filter((x) => ohaengChar(x.resource_ohaeng) !== yongsin)

  const cell = (x: HanjaRow) => {
    const isCurrent = target && x.hanja === target.hanja
    const on = activeIdx !== null && chosen[activeIdx]?.hanja === x.hanja
    const isFit = ohaengChar(x.resource_ohaeng) === yongsin
    return (
      <button key={x.hanja + x.strokes} onClick={() => pickHanja(x)} className="active:scale-95"
        style={{ position: 'relative', padding: '10px 4px 8px', textAlign: 'center', borderRadius: 16,
          background: on ? 'rgba(250,199,117,0.16)' : CARD,
          border: '1px solid ' + (on ? GOLD : 'rgba(250,199,117,0.12)'),
          opacity: isCurrent && !on ? 0.55 : 1, cursor: 'pointer', transition: 'transform 0.15s ease' }}>
        {isFit && <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 10, color: GREEN }}>{'\u2713'}</span>}
        <div style={{ fontSize: 24, fontWeight: 600, color: on ? GOLD : '#fff', lineHeight: 1.1 }}>{x.hanja}</div>
        <div style={{ fontSize: 10, color: SUB, marginTop: 3 }}>{x.meaning}</div>
        <div style={{ fontSize: 9, color: SUB, marginTop: 1 }}>{x.resource_ohaeng}·{x.strokes}획</div>
        {isCurrent && <div style={{ fontSize: 9, color: SUB, marginTop: 1 }}>현재</div>}
      </button>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <Header router={router} />

      {/* 본인 이름 + 용신 안내 */}
      <p style={{ fontSize: 12, color: SUB, margin: '0 0 14px', padding: '0 4px', lineHeight: 1.7 }}>
        {converting || !yongsin
          ? '사주 불러오는 중…'
          : <>내 이름 <b style={{ color: '#fff' }}>{fullName}</b> · 사주에 필요한 기운은 <b style={{ color: GOLD }}>{yongsin}</b>입니다</>}
      </p>

      {/* 자리 선택 (한 글자 모드) */}
      {count === 1 && (
        <>
          <div style={{ fontSize: 12, color: SUB, marginBottom: 8, padding: '0 4px' }}>바꿀 글자를 골라주세요</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {givenChars.map((c, gi) => {
              const idx = gi + 1
              const on = targetIdxs[0] === idx
              return (
                <button key={idx} onClick={() => chooseSlot(idx)} className="active:scale-95"
                  style={{ flex: 1, padding: '14px 0', borderRadius: 14, textAlign: 'center',
                    background: on ? 'rgba(250,199,117,0.16)' : CARD,
                    border: '1px solid ' + (on ? GOLD : 'rgba(250,199,117,0.12)'), cursor: 'pointer' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: on ? GOLD : '#fff' }}>{c.hanja}</div>
                  <div style={{ fontSize: 11, color: SUB, marginTop: 3 }}>{c.hangul}</div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* 두 글자 모드 진행 표시 */}
      {count === 2 && targetIdxs.length === 2 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {targetIdxs.map((idx) => {
            const on = activeIdx === idx
            const done = !!chosen[idx]
            return (
              <div key={idx} style={{ flex: 1, padding: '12px 0', borderRadius: 14, textAlign: 'center',
                background: on ? 'rgba(250,199,117,0.16)' : CARD,
                border: '1px solid ' + (on ? GOLD : done ? GREEN : 'rgba(250,199,117,0.12)') }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: done ? GREEN : on ? GOLD : '#fff' }}>
                  {done ? chosen[idx].hanja : chars[idx]?.hanja}
                </div>
                <div style={{ fontSize: 10, color: SUB, marginTop: 3 }}>{chars[idx]?.hangul} {done ? '✓' : on ? '고르는 중' : ''}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* 한자 목록 */}
      {activeIdx !== null && target && (
        <>
          {loadingList && <div style={{ textAlign: 'center', color: SUB, padding: 24 }}>한자를 불러오는 중…</div>}

          {!loadingList && hanjaList.length === 0 && (
            <div style={{ textAlign: 'center', color: SUB, padding: 24, fontSize: 13 }}>
              &lsquo;{target.hangul}&rsquo; 음의 인명용 한자를 찾을 수 없어요
            </div>
          )}

          {!loadingList && fitList.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: SUB }}>사주(용신 {yongsin})에 맞는 한자 · 추천</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>{fitList.map(cell)}</div>
            </>
          )}

          {!loadingList && restList.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: SUB, display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: SUB }}>그 외 &lsquo;{target.hangul}&rsquo; 한자</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>{restList.map(cell)}</div>
            </>
          )}

          {/* 확인 바 */}
          <div style={{ marginTop: 20, borderRadius: 16, padding: '13px 16px',
            background: activeIdx !== null && chosen[activeIdx] ? 'rgba(250,199,117,0.16)' : CARD,
            border: '1px solid ' + (activeIdx !== null && chosen[activeIdx] ? GOLD : 'rgba(250,199,117,0.12)'),
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: activeIdx !== null && chosen[activeIdx] ? GOLD : SUB }}>
              {activeIdx !== null && chosen[activeIdx] ? '선택 : ' + chosen[activeIdx].hanja : '한자를 선택하세요'}
            </span>
            <button disabled={activeIdx === null || !chosen[activeIdx]} onClick={proceed}
              style={{ fontSize: 13, fontWeight: 600, color: activeIdx !== null && chosen[activeIdx] ? GOLD : '#555', background: 'none', border: 'none', cursor: activeIdx !== null && chosen[activeIdx] ? 'pointer' : 'default' }}>
              {count === 2 && targetIdxs.some((i) => !chosen[i] && i !== activeIdx) ? '다음 글자 →' : '이 글자로 →'}
            </button>
          </div>
        </>
      )}
    </main>
  )
}

function Header({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 16px' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 20, cursor: 'pointer' }}>{'\u2039'}</button>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>한자 바꾸기</span>
    </div>
  )
}

export default function HanjaPickPage() {
  return (
    <Suspense fallback={<div style={{ background: '#1f1e1c', minHeight: '100vh' }} />}>
      <HanjaInner />
    </Suspense>
  )
}
