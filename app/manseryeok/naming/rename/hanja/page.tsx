'use client'
import { Suspense, useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsin } from '@/lib/saju/yongsin'
import { supabase } from '@/lib/supabase'
import { diagnoseName, type NameChar, type Grade } from '@/lib/saju/naming'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'
const GREEN = '#81c784'

const TOP_N = 6

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

function gradeNum(g: Grade): number {
  return g === '좋음' ? 2 : g === '보통' ? 1 : 0
}

function HanjaInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const count = sp.get('count') === '2' ? 2 : 1

  const [info, setInfo] = useState<{
    gender: string; calType: string
    year: number; month: number; day: number
    leapMonth: string; hourIdx: number | null
  } | null>(null)

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

  const givenChars = chars.slice(1)

  const [targetIdxs, setTargetIdxs] = useState<number[]>([])
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [chosen, setChosen] = useState<Record<number, HanjaRow>>({})
  const [upsell, setUpsell] = useState(false) // 잠긴 자리 클릭 시 업셀 안내

  const [hanjaList, setHanjaList] = useState<HanjaRow[]>([])
  const [loadingList, setLoadingList] = useState(false)

  useEffect(() => {
    if (count === 2 && givenChars.length >= 2) {
      const idxs = givenChars.map((_, i) => i + 1)
      setTargetIdxs(idxs)
      setActiveIdx(idxs[0])
    }
  }, [count, givenChars.length])

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

  const scored = useMemo(() => {
    if (!yongsinReady || activeIdx === null || hanjaList.length === 0 || !chars[0]) return []
    const surname: NameChar = {
      hangul: chars[0].hangul,
      hanja: chars[0].hanja,
      strokes: chars[0].strokes,
      resourceOhaeng: ohaengChar(chars[0].resourceOhaeng),
    }
    const baseGiven: NameChar[] = givenChars.map((c, gi) => {
      const idx = gi + 1
      const pick = chosen[idx]
      const src = pick
        ? { hangul: chars[idx].hangul, hanja: pick.hanja, strokes: pick.strokes, resourceOhaeng: pick.resource_ohaeng }
        : chars[idx]
      return {
        hangul: src.hangul,
        hanja: src.hanja,
        strokes: src.strokes,
        resourceOhaeng: ohaengChar(src.resourceOhaeng),
      }
    })

    return hanjaList.map((row) => {
      const given = baseGiven.map((g, gi) => {
        const idx = gi + 1
        if (idx !== activeIdx) return g
        return {
          hangul: row.hangul,
          hanja: row.hanja,
          strokes: row.strokes,
          resourceOhaeng: ohaengChar(row.resource_ohaeng),
        }
      })
      const r = diagnoseName({
        surname,
        given,
        yongsin: yong.yongsin,
        heeksin: yong.heeksin,
        elementScore: yong.score,
      })
      const weighted =
        gradeNum(r.yongsinBohwan.grade) * 3 +
        gradeNum(r.resourceFlow.grade) * 2 +
        gradeNum(r.suri.grade) * 1.5 +
        gradeNum(r.soundFlow.grade) * 1
      const fitsYongsin = ohaengChar(row.resource_ohaeng) === yongsin
      return { row, weighted, fitsYongsin }
    })
  }, [yongsinReady, activeIdx, hanjaList, chars, givenChars, chosen, yong, yongsin])

  const { recommend, others } = useMemo(() => {
    if (scored.length === 0) return { recommend: [] as { row: HanjaRow; rank: number }[], others: [] as HanjaRow[] }
    const sorted = [...scored].sort((a, b) => {
      if (a.fitsYongsin !== b.fitsYongsin) return a.fitsYongsin ? -1 : 1
      if (b.weighted !== a.weighted) return b.weighted - a.weighted
      return a.row.strokes - b.row.strokes
    })
    const fitSorted = sorted.filter((s) => s.fitsYongsin)
    const recSrc = (fitSorted.length > 0 ? fitSorted : sorted).slice(0, TOP_N)
    const rec = recSrc.map((s, i) => ({ row: s.row, rank: i + 1 }))
    const recSet = new Set(rec.map((r) => r.row.hanja + r.row.strokes))
    const oth = sorted.map((s) => s.row).filter((r) => !recSet.has(r.hanja + r.strokes))
    return { recommend: rec, others: oth }
  }, [scored, yongsin])

  // 한 글자 모드: 이미 다른 자리에서 골랐으면 잠금
  const lockedByPick = count === 1 && Object.keys(chosen).length > 0

  function chooseSlot(idx: number) {
    if (count === 1 && lockedByPick && chosen[idx] === undefined) {
      // 이미 다른 자리를 골라 잠긴 상태에서 잠긴 자리 클릭 → 업셀
      setUpsell(true)
      return
    }
    setTargetIdxs([idx])
    setActiveIdx(idx)
  }

  function pickHanja(row: HanjaRow) {
    if (activeIdx === null) return
    setChosen((prev) => ({ ...prev, [activeIdx]: row }))
  }

  // 선택 취소(한 글자 모드에서 자리 바꾸려면)
  function clearPick() {
    setChosen({})
    setUpsell(false)
  }

  function proceed() {
    if (activeIdx === null || !chosen[activeIdx]) return
    const next = targetIdxs.find((i) => !chosen[i] && i !== activeIdx)
    if (count === 2 && next !== undefined) {
      setActiveIdx(next)
      setHanjaList([])
      return
    }
    const idxsToSave = count === 2 ? targetIdxs : [activeIdx]
    const picks = idxsToSave.map((i) => {
      const cur = chars[i]
      const sel = chosen[i]
      return {
        idx: i,
        hangul: cur?.hangul ?? '',
        fromHanja: cur?.hanja ?? '',
        fromMeaning: '',
        fromOhaeng: ohaengChar(cur?.resourceOhaeng ?? ''),
        fromStrokes: cur?.strokes ?? 0,
        toHanja: sel?.hanja ?? '',
        toMeaning: sel?.meaning ?? '',
        toOhaeng: ohaengChar(sel?.resource_ohaeng ?? ''),
        toStrokes: sel?.strokes ?? 0,
      }
    })
    try {
      localStorage.setItem('rename_picks_v1', JSON.stringify({ picks, yongsin }))
    } catch {}
    router.push('/manseryeok/naming/rename/result')
  }

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

  const cell = (x: HanjaRow, fit: boolean, rank?: number) => {
    const isCurrent = target && x.hanja === target.hanja
    const on = activeIdx !== null && chosen[activeIdx]?.hanja === x.hanja
    return (
      <button key={x.hanja + x.strokes} onClick={() => pickHanja(x)} className="active:scale-95"
        style={{ position: 'relative', padding: '10px 4px 8px', textAlign: 'center', borderRadius: 16,
          background: on ? 'rgba(250,199,117,0.16)' : CARD,
          border: '1px solid ' + (on ? GOLD : 'rgba(250,199,117,0.12)'),
          opacity: isCurrent && !on ? 0.55 : 1, cursor: 'pointer', transition: 'transform 0.15s ease' }}>
        {rank !== undefined && (
          <span style={{ position: 'absolute', top: 4, left: 6, fontSize: 10, fontWeight: 700, color: '#1a1a18',
            background: GOLD, borderRadius: '50%', width: 16, height: 16, lineHeight: '16px', textAlign: 'center' }}>
            {rank}
          </span>
        )}
        {fit && <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 10, color: GREEN }}>{'\u2713'}</span>}
        <div style={{ fontSize: 24, fontWeight: 600, color: on ? GOLD : '#fff', lineHeight: 1.1 }}>{x.hanja}</div>
        <div style={{ fontSize: 10, color: SUB, marginTop: 3 }}>{x.meaning}</div>
        <div style={{ fontSize: 9, color: SUB, marginTop: 1 }}>{x.resource_ohaeng}·{x.strokes}획</div>
        {isCurrent && <div style={{ fontSize: 9, color: SUB, marginTop: 1 }}>현재</div>}
      </button>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <Header router={router} />

      <p style={{ fontSize: 12, color: SUB, margin: '0 0 14px', padding: '0 4px', lineHeight: 1.7 }}>
        {!yongsinReady
          ? '사주 불러오는 중…'
          : <>내 이름 <b style={{ color: '#fff' }}>{fullName}</b> · 사주에 필요한 기운은 <b style={{ color: GOLD }}>{yongsin}</b>입니다</>}
      </p>

      {count === 1 && (
        <>
          <div style={{ fontSize: 12, color: SUB, marginBottom: 8, padding: '0 4px' }}>
            바꿀 글자 한 개를 골라주세요 {lockedByPick && <span style={{ color: GOLD }}>· 1글자 선택 완료</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {givenChars.map((c, gi) => {
              const idx = gi + 1
              const on = targetIdxs[0] === idx && !lockedByPick
              const picked = chosen[idx] !== undefined
              const locked = lockedByPick && !picked
              return (
                <button key={idx} onClick={() => chooseSlot(idx)} className="active:scale-95"
                  style={{ flex: 1, padding: '14px 0', borderRadius: 14, textAlign: 'center', position: 'relative',
                    background: picked ? 'rgba(129,199,132,0.14)' : on ? 'rgba(250,199,117,0.16)' : CARD,
                    border: '1px solid ' + (picked ? GREEN : on ? GOLD : 'rgba(250,199,117,0.12)'),
                    opacity: locked ? 0.45 : 1, cursor: 'pointer' }}>
                  {locked && <span style={{ position: 'absolute', top: 6, right: 8, fontSize: 12 }}>🔒</span>}
                  <div style={{ fontSize: 26, fontWeight: 700, color: picked ? GREEN : on ? GOLD : '#fff' }}>
                    {picked ? chosen[idx].hanja : c.hanja}
                  </div>
                  <div style={{ fontSize: 11, color: SUB, marginTop: 3 }}>{c.hangul}{picked ? ' ✓' : ''}</div>
                </button>
              )
            })}
          </div>

          {lockedByPick && (
            <button onClick={clearPick}
              style={{ width: '100%', marginBottom: 16, padding: 10, borderRadius: 12, background: 'transparent', border: '1px solid rgba(250,199,117,0.2)', color: SUB, fontSize: 12, cursor: 'pointer' }}>
              ← 다른 자리를 바꾸려면 선택 취소
            </button>
          )}
        </>
      )}

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

      {activeIdx !== null && target && (
        <>
          {(!yongsinReady || loadingList) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0' }}>
              <span style={{ fontSize: 34, color: GOLD, display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>✦</span>
              <span style={{ fontSize: 13, color: SUB }}>한자를 불러오는 중…</span>
            </div>
          )}

          {yongsinReady && !loadingList && hanjaList.length === 0 && (
            <div style={{ textAlign: 'center', color: SUB, padding: 24, fontSize: 13 }}>
              &lsquo;{target.hangul}&rsquo; 음의 인명용 한자를 찾을 수 없어요
            </div>
          )}

          {yongsinReady && !loadingList && recommend.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: SUB }}>사주(용신 {yongsin})에 맞는 추천 · 좋은 순서 {recommend.length}개</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
                {recommend.map((r) => cell(r.row, true, r.rank))}
              </div>
            </>
          )}

          {yongsinReady && !loadingList && others.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: SUB, display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: SUB }}>그 외 &lsquo;{target.hangul}&rsquo; 한자</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {others.map((x) => cell(x, false))}
              </div>
            </>
          )}

          {yongsinReady && !loadingList && hanjaList.length > 0 && (
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
          )}
        </>
      )}

      {/* 업셀 안내 모달 */}
      {upsell && (
        <div onClick={() => setUpsell(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 360, background: '#222220', borderRadius: 18, padding: 22, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>한 글자만 바꿀 수 있어요</div>
            <div style={{ fontSize: 13, color: SUB, lineHeight: 1.7, marginBottom: 18 }}>
              지금은 &lsquo;한 글자 바꾸기&rsquo;예요. 두 글자를 모두 바꾸려면 &lsquo;두 글자 바꾸기&rsquo;를 선택해 주세요.
            </div>
            <button onClick={() => router.push('/manseryeok/naming/rename')}
              style={{ width: '100%', padding: 13, borderRadius: 12, background: 'rgba(250,199,117,0.16)', border: '1px solid ' + GOLD, color: GOLD, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
              두 글자 바꾸기 보기 →
            </button>
            <button onClick={() => setUpsell(false)}
              style={{ width: '100%', padding: 11, borderRadius: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: SUB, fontSize: 13, cursor: 'pointer' }}>
              지금 글자 그대로 진행
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
