'use client'
import { Suspense, useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsinCompat } from '@/lib/saju/yongsinNew'
import { supabase } from '@/lib/supabase'
import { diagnoseName, type NameChar, type Grade } from '@/lib/saju/naming'
import { fromMyInfo, fromProfile, personKey, type MyInfo } from '@/lib/saju/myInfo'

const GOLD = '#c8783c'
const CARD = '#fffbf7'
const SUB = '#b4785a'
const GREEN = '#81c784'

const TOP_N = 6
const DEFAULT_TRY_LIMIT = 3

const MY_INFO_KEY = 'myinfo'
const NAMING_RESULT_KEY = 'naming_last_result_v1'
const NEWNAME_HISTORY_KEY = 'newname_history_v1'

interface SavedChar {
  hangul: string
  hanja: string
  strokes: number
  resourceOhaeng: string
}

interface HanjaRow {
  hangul: string
  hanja: string
  meaning: string
  strokes: number
  resource_ohaeng: string
  sound_ohaeng: string
  avoid_hard?: boolean
  avoid_soft?: boolean
}

interface TryItem {
  name: string
  chars: SavedChar[]
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

function isHangulSyllable(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return code >= 0xac00 && code <= 0xd7a3
}

function NewHanjaInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [info, setInfo] = useState<MyInfo | null>(null)

  const [surname, setSurname] = useState<SavedChar | null>(null)
  const [uid, setUid] = useState<string>('')   // ★ 로그인 회원 user_id (tries 저장 열쇠)
  const [syllables, setSyllables] = useState<string[]>([])
  const [activeIdx, setActiveIdx] = useState<number>(0)
  const [restored, setRestored] = useState(false)

  const [chosen, setChosen] = useState<Record<number, HanjaRow>>({})

  const [hanjaList, setHanjaList] = useState<HanjaRow[]>([])
  const [loadingList, setLoadingList] = useState(false)

  // ★ 최종 저장 확인 팝업
  const [confirmOpen, setConfirmOpen] = useState(false)

  // ★ 이름 짓기 조회 횟수 (관리자 설정값 · app_settings)
  const [TRY_LIMIT, setTryLimit] = useState(DEFAULT_TRY_LIMIT)
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'naming_try_limit').maybeSingle()
      .then(({ data }) => { if (data && typeof data.value === 'number') setTryLimit(data.value) })
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      // ── info 구성: localStorage myinfo 우선, 없으면 profiles(DB) ──
      let stdInfo: MyInfo | null = null
      try {
        const m = JSON.parse(localStorage.getItem(MY_INFO_KEY) || '{}')
        stdInfo = fromMyInfo(m)
      } catch {}

      if (!stdInfo) {
        try {
          const { data: u } = await supabase.auth.getUser()
          if (u?.user) {
            const { data: p } = await supabase
              .from('profiles')
              .select('birth_year, birth_month, birth_day, birth_hour, cal_type, gender, leap_month, saju_saved')
              .eq('id', u.user.id)
              .single()
            stdInfo = fromProfile(p)
          }
        } catch {}
      }

      if (!cancelled && stdInfo) {
        setInfo(stdInfo)
      }

      // ── 성씨 + user_id: 로그인 my_names 우선, 없으면 localStorage ──
      let surnameLoaded = false
      try {
        const { data: u } = await supabase.auth.getUser()
        if (u?.user) {
          if (!cancelled) setUid(u.user.id)   // ★ user_id 저장
          const { data: rows } = await supabase
            .from('my_names')
            .select('chars')
            .eq('user_id', u.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
          if (!cancelled && rows && rows[0] && Array.isArray(rows[0].chars) && rows[0].chars[0]) {
            setSurname(rows[0].chars[0] as SavedChar)
            surnameLoaded = true
          }
        }
      } catch {}

      if (!surnameLoaded) {
        try {
          const r = JSON.parse(localStorage.getItem(NAMING_RESULT_KEY) || '{}')
          if (!cancelled && Array.isArray(r.chars) && r.chars[0]) {
            setSurname(r.chars[0] as SavedChar)
          }
        } catch {}
      }

      const nameParam = sp.get('name') || ''
      const arr = Array.from(nameParam.trim()).filter(isHangulSyllable)
      if (!cancelled) {
        setSyllables(arr)
        setActiveIdx(0)
        setRestored(true)
      }
    }

    loadAll()
    return () => { cancelled = true }
  }, [sp])

  const infoYear = info ? parseInt(info.year) : 0
  const infoMonth = info ? parseInt(info.month) : 0
  const infoDay = info ? parseInt(info.day) : 0
  const infoHourIdx = info ? (info.hour === '모름' ? null : parseInt(info.hour)) : null

  const { saju, dayStem, converting } = useResultSaju(
    info?.calType || '양력',
    infoYear,
    infoMonth,
    infoDay,
    info?.leapMonth || '0',
    infoHourIdx,
  )

  const yong = useMemo(() => {
    if (!saju || !dayStem) return { yongsin: '', heeksin: '', score: {} as Record<string, number> }
    try {
      const y = calcYongsinCompat(saju, dayStem)
      return { yongsin: ohaengChar(y.yongsin), heeksin: ohaengChar(y.heeksin), score: y.score }
    } catch {
      return { yongsin: '', heeksin: '', score: {} as Record<string, number> }
    }
  }, [saju, dayStem])
  const yongsin = yong.yongsin
  const yongsinReady = !converting && !!yongsin

  useEffect(() => {
    if (!restored || syllables.length === 0) { setHanjaList([]); return }
    const hangul = syllables[activeIdx]
    if (!hangul) { setHanjaList([]); return }
    let cancelled = false
    setLoadingList(true)
    supabase
      .from('hanja')
      .select('hangul, hanja, meaning, strokes, resource_ohaeng, sound_ohaeng, avoid_hard, avoid_soft')
      .eq('hangul', hangul)
      .order('strokes', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error(error); setHanjaList([]) }
        else {
          const filtered = ((data as HanjaRow[]) ?? []).filter((row) => !row.avoid_hard)
          setHanjaList(filtered)
        }
        setLoadingList(false)
      })
    return () => { cancelled = true }
  }, [activeIdx, syllables, restored])

  const scored = useMemo(() => {
    if (!yongsinReady || !surname || hanjaList.length === 0) return []
    const surnameChar: NameChar = {
      hangul: surname.hangul,
      hanja: surname.hanja,
      strokes: surname.strokes,
      resourceOhaeng: ohaengChar(surname.resourceOhaeng),
    }
    return hanjaList.map((row) => {
      const given: NameChar[] = syllables.map((syl, i) => {
        if (i === activeIdx) {
          return { hangul: row.hangul, hanja: row.hanja, strokes: row.strokes, resourceOhaeng: ohaengChar(row.resource_ohaeng) }
        }
        const pick = chosen[i]
        if (pick) {
          return { hangul: syl, hanja: pick.hanja, strokes: pick.strokes, resourceOhaeng: ohaengChar(pick.resource_ohaeng) }
        }
        return { hangul: syl, hanja: '', strokes: 0, resourceOhaeng: '' }
      })
      const r = diagnoseName({
        surname: surnameChar,
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
  }, [yongsinReady, surname, hanjaList, syllables, activeIdx, chosen, yong, yongsin])

  const { recommend, others } = useMemo(() => {
    if (scored.length === 0) return { recommend: [] as { row: HanjaRow; rank: number }[], others: [] as HanjaRow[] }
    const sorted = [...scored].sort((a, b) => {
      const aSoft = a.row.avoid_soft ? 1 : 0
      const bSoft = b.row.avoid_soft ? 1 : 0
      if (a.fitsYongsin !== b.fitsYongsin) return a.fitsYongsin ? -1 : 1
      if (aSoft !== bSoft) return aSoft - bSoft
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

  function pickHanja(row: HanjaRow) {
    setChosen((prev) => ({ ...prev, [activeIdx]: row }))
  }

  // 현재 tries 목록 읽기 (user_id 열쇠)
  function readTries(): TryItem[] {
    try {
      const h = JSON.parse(localStorage.getItem(NEWNAME_HISTORY_KEY) || '{}')
      if (h.userId === uid && Array.isArray(h.tries)) return h.tries
    } catch {}
    return []
  }

  // 완성된 이름의 chars 배열
  function buildNameChars(): SavedChar[] | null {
    if (!surname) return null
    // 아직 모든 글자의 한자를 고르지 않았으면 계산하지 않음 (undefined 방지)
    if (syllables.length === 0) return null
    if (!syllables.every((_, i) => chosen[i])) return null
    return [
      surname,
      ...syllables.map((syl, i) => {
        const pick = chosen[i]!
        return { hangul: syl, hanja: pick.hanja, strokes: pick.strokes, resourceOhaeng: pick.resource_ohaeng }
      }),
    ]
  }

  // "이 이름으로 →" : 다음 글자로 넘어가거나, 다 골랐으면 확인 팝업 띄우기
  function proceed() {
    if (!chosen[activeIdx]) return
    const next = syllables.findIndex((_, i) => !chosen[i] && i !== activeIdx)
    if (next !== -1) {
      setActiveIdx(next)
      return
    }
    if (!surname) return
    setConfirmOpen(true)   // ★ 즉시 저장 대신 확인 팝업
  }

  // 팝업에서 "확정"을 눌렀을 때만 실제 저장 + 결과로 이동
  function confirmSave() {
    const nameChars = buildNameChars()
    if (!nameChars) return
    const hangulName = syllables.join('')
    const hanjaKey = nameChars.map((c) => c.hanja).join('')

    let tries = readTries()
    const existIdx = tries.findIndex((t) => t.chars.map((c) => c.hanja).join('') === hanjaKey)
    if (existIdx === -1) {
      if (tries.length >= TRY_LIMIT) {
        alert('총 ' + TRY_LIMIT + '회까지 이름을 지어볼 수 있어요.\n지금까지 본 이름 중에서 골라주세요.')
        setConfirmOpen(false)
        router.push('/manseryeok/naming/rename/newresult')
        return
      }
      tries.push({ name: hangulName, chars: nameChars })
    } else {
      const item = tries.splice(existIdx, 1)[0]
      tries.push(item)
    }

    try {
      // ★ user_id 열쇠로 저장 (personKey 안 씀 — 대규모에서도 안 겹침)
      localStorage.setItem(NEWNAME_HISTORY_KEY, JSON.stringify({ userId: uid, tries }))
    } catch {}

    setConfirmOpen(false)
    router.push('/manseryeok/naming/rename/newresult')
  }

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
              style={{ padding: '12px 22px', borderRadius: 12, background: 'rgba(200,120,60,0.12)', border: '1px solid ' + GOLD, color: GOLD, fontWeight: 700, cursor: 'pointer' }}>
              새 이름 입력으로 →
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!restored) return <main style={{ minHeight: '100vh', background: '#1f1e1c' }} />

  const target = syllables[activeIdx]
  const allChosen = syllables.length > 0 && syllables.every((_, i) => chosen[i])

  // 팝업에 보여줄 정보
  const previewChars = buildNameChars()
  const previewHanja = previewChars ? previewChars.map((c) => c.hanja).join('') : ''
  const previewHangul = surname && syllables.length ? surname.hangul + syllables.join('') : ''
  const curTries = readTries()
  const previewHanjaKey = previewChars ? previewChars.map((c) => c.hanja).join('') : ''
  const alreadyTried = curTries.some((t) => t.chars.map((c) => c.hanja).join('') === previewHanjaKey)
  const usedCount = curTries.length
  const willUseCount = alreadyTried ? usedCount : usedCount + 1
  const leftAfter = TRY_LIMIT - willUseCount

  const cell = (x: HanjaRow, fit: boolean, rank?: number) => {
    const on = chosen[activeIdx]?.hanja === x.hanja
    const soft = !!x.avoid_soft
    return (
      <button key={x.hanja + x.strokes} onClick={() => pickHanja(x)} className="active:scale-95"
        style={{ position: 'relative', padding: '10px 4px 8px', textAlign: 'center', borderRadius: 16,
          background: on ? 'rgba(200,120,60,0.12)' : CARD,
          border: '1px solid ' + (on ? GOLD : 'rgba(200,120,60,0.10)'),
          cursor: 'pointer', transition: 'transform 0.15s ease' }}>
        {rank !== undefined && (
          <span style={{ position: 'absolute', top: 4, left: 6, fontSize: 10, fontWeight: 700, color: '#fff',
            background: GOLD, borderRadius: '50%', width: 16, height: 16, lineHeight: '16px', textAlign: 'center' }}>
            {rank}
          </span>
        )}
        {fit && <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 10, color: GREEN }}>{'\u2713'}</span>}
        <div style={{ fontSize: 24, fontWeight: 600, color: on ? GOLD : '#fff', lineHeight: 1.1 }}>{x.hanja}</div>
        <div style={{ fontSize: 10, color: SUB, marginTop: 3 }}>{x.meaning}</div>
        <div style={{ fontSize: 9, color: SUB, marginTop: 1 }}>{x.resource_ohaeng}·{x.strokes}획</div>
        {soft && <div style={{ fontSize: 8, color: '#E0A04A', marginTop: 1 }}>주의</div>}
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
          : <>새 이름 <b style={{ color: '#c8783c' }}>{surname!.hanja}{syllables.join('')}</b> · 사주에 필요한 기운은 <b style={{ color: GOLD }}>{yongsin}</b>입니다</>}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <div style={{ flex: 1, padding: '12px 0', borderRadius: 14, textAlign: 'center', background: CARD, border: '0.5px solid #f0e0d5' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#cfcdc4' }}>{surname!.hanja}</div>
          <div style={{ fontSize: 10, color: SUB, marginTop: 3 }}>{surname!.hangul} · 성씨</div>
        </div>
        {syllables.map((syl, i) => {
          const on = activeIdx === i
          const done = !!chosen[i]
          return (
            <button key={i} onClick={() => setActiveIdx(i)} className="active:scale-95"
              style={{ flex: 1, padding: '12px 0', borderRadius: 14, textAlign: 'center', cursor: 'pointer',
                background: on ? 'rgba(200,120,60,0.12)' : done ? 'rgba(129,199,132,0.14)' : CARD,
                border: '1px solid ' + (on ? GOLD : done ? GREEN : 'rgba(200,120,60,0.10)') }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: done ? GREEN : on ? GOLD : '#fff' }}>
                {done ? chosen[i].hanja : syl}
              </div>
              <div style={{ fontSize: 10, color: SUB, marginTop: 3 }}>{syl} {done ? '✓' : on ? '고르는 중' : ''}</div>
            </button>
          )
        })}
      </div>

      {(!yongsinReady || loadingList) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0' }}>
          <span style={{ fontSize: 34, color: GOLD, display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>✦</span>
          <span style={{ fontSize: 13, color: SUB }}>한자를 불러오는 중…</span>
        </div>
      )}

      {yongsinReady && !loadingList && hanjaList.length === 0 && (
        <div style={{ textAlign: 'center', color: SUB, padding: 24, fontSize: 13 }}>
          &lsquo;{target}&rsquo; 음의 인명용 한자를 찾을 수 없어요
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
            <span style={{ fontSize: 11, color: SUB }}>그 외 &lsquo;{target}&rsquo; 한자</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {others.map((x) => cell(x, false))}
          </div>
        </>
      )}

      {yongsinReady && !loadingList && hanjaList.length > 0 && (
        <div style={{ marginTop: 20, borderRadius: 16, padding: '13px 16px',
          background: chosen[activeIdx] ? 'rgba(200,120,60,0.12)' : CARD,
          border: '1px solid ' + (chosen[activeIdx] ? GOLD : 'rgba(200,120,60,0.10)'),
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: chosen[activeIdx] ? GOLD : SUB }}>
            {chosen[activeIdx] ? '선택 : ' + chosen[activeIdx].hanja : '한자를 선택하세요'}
          </span>
          <button disabled={!chosen[activeIdx]} onClick={proceed}
            style={{ fontSize: 13, fontWeight: 600, color: chosen[activeIdx] ? GOLD : '#555', background: 'none', border: 'none', cursor: chosen[activeIdx] ? 'pointer' : 'default' }}>
            {allChosen ? '이 이름으로 →' : '다음 글자 →'}
          </button>
        </div>
      )}

      {/* ★ 최종 저장 확인 팝업 */}
      {confirmOpen && (
        <div onClick={() => setConfirmOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 360, background: '#fffbf7', borderRadius: 18, padding: '24px 20px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: SUB, marginBottom: 10 }}>이 이름으로 저장할까요?</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: GOLD, letterSpacing: 4, marginBottom: 2 }}>{previewHanja}</div>
            <div style={{ fontSize: 13, color: '#1a1a1a', marginBottom: 16 }}>{previewHangul}</div>
            <div style={{ background: CARD, borderRadius: 12, padding: '12px 14px', marginBottom: 18, fontSize: 12, color: SUB, lineHeight: 1.7 }}>
              {alreadyTried
                ? '이미 지어본 이름이에요. 다시 열어봐도 횟수는 줄지 않아요.'
                : <>저장하면 남은 횟수가 <b style={{ color: GOLD }}>{leftAfter}회</b>가 돼요.<br />(총 {TRY_LIMIT}회까지 지어볼 수 있어요)</>}
            </div>
            <button onClick={confirmSave}
              style={{ width: '100%', padding: 14, borderRadius: 12, background: '#c8783c', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
              이 이름으로 저장하기
            </button>
            <button onClick={() => setConfirmOpen(false)}
              style={{ width: '100%', padding: 12, borderRadius: 12, background: 'transparent', border: '0.5px solid #f0e0d5', color: SUB, fontSize: 13, cursor: 'pointer' }}>
              다시 고를게요
            </button>
          </div>
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
      <button onClick={() => router.back()} aria-label="뒤로" style={{ background: 'none', border: 'none', color: '#999', fontSize: 20, cursor: 'pointer', padding: 0 }}>{'\u2039'}</button>
      <span style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>새 이름 한자 고르기</span>
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
