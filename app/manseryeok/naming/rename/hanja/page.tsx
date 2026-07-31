'use client'
import { Suspense, useState, useEffect, useMemo, useRef } from 'react'
import { splitSurname } from '@/lib/saju/surname'
import { useRouter, useSearchParams } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsinCompat as calcYongsin } from '@/lib/saju/yongsinNew'
import { supabase } from '@/lib/supabase'
import { diagnoseName, type NameChar } from '@/lib/saju/naming'
import { ohaengOrEmpty } from '@/lib/saju/ohaeng'
// ★2026-07-30 (3단계) — hanja 표 단일 창구 + 후보 정렬 이관
import {
  HANJA_SELECT, listPolicy, rowOhaeng, rowStrokes, rowHanja,
  type HanjaRow as SharedHanjaRow,
} from '@/lib/saju/hanjaRow'
import {
  buildSajuOhaengProfile, judgeResource, candidateScore, compareCandidates,
} from '@/lib/saju/resourceJudge'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'
const GREEN = '#81c784'

const TOP_N = 6
const CHAT_LIMIT = 5

const MY_INFO_KEY = 'myinfo'
const NAMING_RESULT_KEY = 'naming_last_result_v1'
const LOCKED_SLOT_KEY = 'rename_locked_slot'

// ★2026-07-30 (3단계) — 지역 정의를 걷어내고 lib/saju/hanjaRow.ts 를 씁니다. (교훈 CJ)
type HanjaRow = SharedHanjaRow

interface SavedChar {
  hangul: string
  hanja: string
  strokes: number
  resourceOhaeng: string
}

interface ChatMsg { role: 'user' | 'assistant'; content: string }

// ★2026-07-30 (1단계) — 이 자리에 있던 ohaengChar 사본을 걷어냈습니다.
//   네 화면에 한 글자도 다르지 않은 사본이 넷 있었고, 정작 «내이름 감정»
//   (naming/diagnosis/page.tsx)에는 없었습니다. 창구를 하나로 모았습니다. (교훈 CJ)
//   ⚠️ 여기에 다시 사본을 만들지 마십시오. lib/saju/ohaeng.ts 를 부르십시오.

// ★2026-07-30 (3단계) — gradeNum 을 걷어냈습니다. candidateScore 가 대신합니다.

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

  const [targetIdxs, setTargetIdxs] = useState<number[]>([])
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [chosen, setChosen] = useState<Record<number, HanjaRow>>({})
  const [upsell, setUpsell] = useState(false)
  const [restored, setRestored] = useState(false)

  const [hanjaList, setHanjaList] = useState<HanjaRow[]>([])
  const [loadingList, setLoadingList] = useState(false)

  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatUsed, setChatUsed] = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)

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
    let loadedChars: SavedChar[] = []
    try {
      const r = JSON.parse(localStorage.getItem(NAMING_RESULT_KEY) || '{}')
      if (Array.isArray(r.chars)) {
        loadedChars = r.chars.filter((c: SavedChar | null): c is SavedChar => !!c)
        setChars(loadedChars)
      }
    } catch {}
    if (count === 1) {
      try {
        const saved = localStorage.getItem(LOCKED_SLOT_KEY)
        if (saved !== null) {
          const idx = parseInt(saved)
          if (!isNaN(idx) && idx >= 1 && idx < loadedChars.length) {
            setTargetIdxs([idx])
            setActiveIdx(idx)
          }
        }
      } catch {}
    }
    setRestored(true)
  }, [count])

  // ★2026-07-31 복성 — 성씨는 개명 대상이 아닙니다 (대표님 확정: 기본 중의 기본).
  //   예전에는 chars.slice(1) 이라 남궁민수의 «궁» 이 바꿀 수 있는 글자로 떴습니다.
  const nameSplit = splitSurname(chars)
  const surCount = nameSplit.surname.length          // 단성 1 · 복성 2
  const givenChars = nameSplit.given

  const { saju, solar, dayStem, converting } = useResultSaju(
    info?.calType || '양력',
    info?.year || 0,
    info?.month || 0,
    info?.day || 0,
    info?.leapMonth || '0',
    info?.hourIdx ?? null,
  )

  const yong = useMemo(() => {
    if (!saju || !dayStem) return { yongsin: '', heeksin: '', gisin: '', gusin: '', hansin: '', isStrong: false, score: {} as Record<string, number> }
    try {
      // 심산 오행 점수로 계산 (월지 계절 치환 반영)
      const y = calcYongsin(saju, dayStem, solar?.month, solar?.day,
        saju.find(p => p.pillar === '시주')?.branch ?? null)
      // ★2026-07-30 (3단계) — 버려지던 기신·구신·한신·isStrong 을 함께 받습니다.
      //   과다 억제·기신 회피 판정의 재료입니다.
      return {
        yongsin: ohaengOrEmpty(y.yongsin), heeksin: ohaengOrEmpty(y.heeksin),
        gisin: ohaengOrEmpty(y.gisin), gusin: ohaengOrEmpty(y.gusin),
        hansin: ohaengOrEmpty(y.hansin), isStrong: y.isStrong,
        score: y.score,
      }
    } catch {
      return { yongsin: '', heeksin: '', gisin: '', gusin: '', hansin: '', isStrong: false, score: {} as Record<string, number> }
    }
  }, [saju, dayStem, solar])
  const yongsin = yong.yongsin
  const yongsinReady = !converting && !!yongsin

  useEffect(() => {
    if (count === 2 && givenChars.length >= 2 && targetIdxs.length === 0) {
      const idxs = givenChars.map((_, i) => surCount + i)   // ★복성이면 2 부터
      setTargetIdxs(idxs)
      setActiveIdx(idxs[0])
    }
  }, [count, givenChars.length, targetIdxs.length, surCount])

  useEffect(() => {
    if (activeIdx === null) { setHanjaList([]); return }
    const target = chars[activeIdx]
    if (!target) return
    let cancelled = false
    setLoadingList(true)
    supabase
      .from('hanja')
      .select(HANJA_SELECT)   // ★'*' — 마이그레이션 전에도 안 깨집니다
      .eq('hangul', target.hangul)
      .order('strokes', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error(error); setHanjaList([]) }
        else {
          // ★2026-07-30 (3단계) — 전에는 avoid_hard «만» 보았습니다.
          //   그래서 不用(불용한자 947건)이 손님 목록에 그대로 나갔습니다.
          //   이제 diagnosis 와 «같은» 잣대를 씁니다 (avoid_hard · 不用 · 뜻 · 쉬는 줄).
          // ★2026-07-30 (3단계-b) — «거르기» 가 아니라 «표시하기» 입니다.
          //   不用 을 목록에서 빼면 50개 음(겁·괴·늠 …)이 후보 0개가 되어
          //   그 음을 이름에 가진 손님이 한자를 하나도 못 고르게 됩니다.
          //   → 막는 것은 avoid_hard·쉬는 줄뿐이고, 나머지는 흐리게 + 배지로 냅니다.
          const filtered = ((data as HanjaRow[]) ?? []).filter((row) => listPolicy(row).show)
          setHanjaList(filtered)
        }
        setLoadingList(false)
      })
    return () => { cancelled = true }
  }, [activeIdx, chars])

  const scored = useMemo(() => {
    if (!yongsinReady || activeIdx === null || hanjaList.length === 0 || !chars[0]) return []
    const toName = (c: { hangul: string; hanja: string; strokes: number; resourceOhaeng?: string | null }): NameChar => ({
      hangul: c.hangul, hanja: c.hanja, strokes: c.strokes,
      resourceOhaeng: ohaengOrEmpty(c.resourceOhaeng ?? ''),
    })
    const surname: NameChar = toName(nameSplit.surname[0])
    const surname2: NameChar | null = nameSplit.surname[1] ? toName(nameSplit.surname[1]) : null
    const baseGiven: NameChar[] = givenChars.map((c, gi) => {
      // ⚠️ chosen·chars 는 «전체 배열» 자리입니다. 복성이면 2 부터 시작합니다.
      const idx = surCount + gi
      const pick = chosen[idx]
      const src = pick
        ? { hangul: chars[idx].hangul, hanja: rowHanja(pick), strokes: rowStrokes(pick), resourceOhaeng: rowOhaeng(pick) ?? '' }
        : chars[idx]
      return {
        hangul: src.hangul,
        hanja: src.hanja,
        strokes: src.strokes,
        resourceOhaeng: ohaengOrEmpty(src.resourceOhaeng),
      }
    })

    // ★사주 프로필 — 후보마다 다시 만들지 않습니다 (버려지던 기신·구신·한신 포함)
    const profile = buildSajuOhaengProfile({
      isStrong: yong.isStrong, yongsin: yong.yongsin, heeksin: yong.heeksin,
      gisin: yong.gisin, gusin: yong.gusin, hansin: yong.hansin, score: yong.score,
    }, saju)

    return hanjaList.map((row) => {
      const given = baseGiven.map((g, gi) => {
        const idx = surCount + gi   // ★복성이면 chars 자리가 2 부터
        if (idx !== activeIdx) return g
        return {
          hangul: row.hangul,
          hanja: rowHanja(row),
          strokes: rowStrokes(row),          // ★원획법 (strokes_kangxi 우선)
          resourceOhaeng: rowOhaeng(row) ?? '',
        }
      })
      const r = diagnoseName({
        surname,
        surname2,
        given,
        yongsin: yong.yongsin,
        heeksin: yong.heeksin,
        elementScore: yong.score,
      })
      // ★★2026-07-30 (3단계) — 자원오행+사주보완 칸을 judgeResource 로 갈아 끼웁니다.
      //   [무엇이 달라지나]  옛 weighted 는 다섯 관점을 3단 등급(2/1/0)으로 뭉갰습니다.
      //     그래서 상극·과다 오행·기신·구신이 «추천 순서에 닿지 않았습니다».
      //     ★수리·발음의 무게는 그대로입니다 (66.7 : 20 : 13.3 — 옛 비율 그대로).
      //   ⚠️ 점수는 내부용입니다. 화면에 쓰지 마십시오.
      const verdict = judgeResource(
        // ★복성이면 성 두 글자를 배열로 넘깁니다 — 둘째 글자가 이름 글자로 채점되지 않도록
        nameSplit.surname.map(c => ({ hanja: c.hanja, hangul: c.hangul,
          primary: ohaengOrEmpty(c.resourceOhaeng ?? '') || null, secondary: null })),
        given.map(g => ({ hanja: g.hanja, hangul: g.hangul,
          primary: ohaengOrEmpty(g.resourceOhaeng) || null, secondary: null })),
        profile,
      )
      const weighted = candidateScore(verdict, r.suri.grade, r.soundFlow.grade)
      const fitsYongsin = rowOhaeng(row) === yongsin
      return { row, weighted, fitsYongsin, verdict }
    })
  }, [yongsinReady, activeIdx, hanjaList, chars, givenChars, chosen, yong, saju])

  const { recommend, others } = useMemo(() => {
    if (scored.length === 0) return { recommend: [] as { row: HanjaRow; rank: number }[], others: [] as HanjaRow[] }
    // ★2026-07-30 (3단계) — 비교 함수를 공용으로. 두 화면이 각자 두면 반드시 갈립니다. (교훈 CJ)
    const sorted = [...scored].sort((a, b) => compareCandidates(
      { fitsYongsin: a.fitsYongsin, avoidSoft: !!a.row.avoid_soft, score: a.weighted, strokes: rowStrokes(a.row), softPenalty: listPolicy(a.row).softPenalty },
      { fitsYongsin: b.fitsYongsin, avoidSoft: !!b.row.avoid_soft, score: b.weighted, strokes: rowStrokes(b.row), softPenalty: listPolicy(b.row).softPenalty },
    ))
    const fitSorted = sorted.filter((s) => s.fitsYongsin)
    const recSrc = (fitSorted.length > 0 ? fitSorted : sorted).slice(0, TOP_N)
    const rec = recSrc.map((s, i) => ({ row: s.row, rank: i + 1 }))
    const recSet = new Set(rec.map((r) => r.row.hanja + r.row.strokes))
    const oth = sorted.map((s) => s.row).filter((r) => !recSet.has(r.hanja + r.strokes))
    return { recommend: rec, others: oth }
  }, [scored])

  const lockedByPick = count === 1 && activeIdx !== null

  function chooseSlot(idx: number) {
    if (count === 1 && activeIdx !== null && activeIdx !== idx) {
      setUpsell(true)
      return
    }
    setTargetIdxs([idx])
    setActiveIdx(idx)
    if (count === 1) {
      try { localStorage.setItem(LOCKED_SLOT_KEY, String(idx)) } catch {}
    }
  }

  function pickHanja(row: HanjaRow) {
    if (activeIdx === null) return
    setChosen((prev) => ({ ...prev, [activeIdx]: row }))
  }

  function clearPick() {
    setChosen({})
    setActiveIdx(null)
    setTargetIdxs([])
    setHanjaList([])
    setUpsell(false)
    try { localStorage.removeItem(LOCKED_SLOT_KEY) } catch {}
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
        fromOhaeng: ohaengOrEmpty(cur?.resourceOhaeng ?? ''),
        fromStrokes: cur?.strokes ?? 0,
        toHanja: sel?.hanja ?? '',
        toMeaning: sel?.meaning ?? '',
        toOhaeng: ohaengOrEmpty(sel?.resource_ohaeng ?? ''),
        toStrokes: sel?.strokes ?? 0,
      }
    })
    try {
      localStorage.setItem('rename_picks_v1', JSON.stringify({ picks, yongsin }))
    } catch {}
    router.push('/manseryeok/naming/rename/result')
  }

  async function sendChat() {
    const q = chatInput.trim()
    if (!q || chatLoading) return
    if (chatUsed >= CHAT_LIMIT) return

    const next = [...chatMsgs, { role: 'user' as const, content: q }]
    setChatMsgs(next)
    setChatInput('')
    setChatLoading(true)

    const candText = recommend.map((r) => r.row.hanja).join(', ')
    const ctx = {
      name: chars.map((c) => c.hanja).join('') || undefined,
      yongsin: yongsin || undefined,
      candidates: candText || undefined,
    }

    try {
      const res = await fetch('/api/naming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, context: ctx }),
      })
      const data = await res.json()
      setChatMsgs([...next, { role: 'assistant', content: data.reply || '죄송해요, 다시 여쭤봐 주세요.' }])
      setChatUsed((n) => n + 1)
    } catch {
      setChatMsgs([...next, { role: 'assistant', content: '연결이 잠시 불안정해요. 다시 시도해 주세요.' }])
    } finally {
      setChatLoading(false)
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMsgs, chatLoading])

  if (restored && (chars.length === 0 || givenChars.length === 0)) {
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
  const chatLeft = CHAT_LIMIT - chatUsed

  const cell = (x: HanjaRow, fit: boolean, rank?: number) => {
    const isCurrent = target && x.hanja === target.hanja
    const on = activeIdx !== null && chosen[activeIdx]?.hanja === x.hanja
    const soft = !!x.avoid_soft
    // ★2026-07-30 (3단계-b) — 不用·무거운 뜻은 «막지 않고» 흐리게 + 배지로 알립니다.
    const pol = listPolicy(x)
    return (
      <button key={x.hanja + x.strokes} onClick={() => pickHanja(x)} className="active:scale-95"
        style={{ position: 'relative', padding: '10px 4px 8px', textAlign: 'center', borderRadius: 16,
          background: on ? 'rgba(250,199,117,0.16)' : CARD,
          border: '1px solid ' + (on ? GOLD : 'rgba(250,199,117,0.12)'),
          opacity: (isCurrent && !on) ? 0.55 : (pol.dim ? 0.5 : 1), cursor: 'pointer', transition: 'transform 0.15s ease' }}>
        {rank !== undefined && (
          <span style={{ position: 'absolute', top: 4, left: 6, fontSize: 10, fontWeight: 700, color: '#1a1a18',
            background: GOLD, borderRadius: '50%', width: 16, height: 16, lineHeight: '16px', textAlign: 'center' }}>
            {rank}
          </span>
        )}
        {fit && <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 10, color: GREEN }}>{'\u2713'}</span>}
        <div style={{ fontSize: 24, fontWeight: 600, color: on ? GOLD : '#fff', lineHeight: 1.1 }}>{x.hanja}</div>
        <div style={{ fontSize: 10, color: SUB, marginTop: 3 }}>{x.meaning}</div>
        <div style={{ fontSize: 9, color: SUB, marginTop: 1 }}>{rowOhaeng(x) ?? x.resource_ohaeng}·{rowStrokes(x)}획</div>
        {pol.badge && <div style={{ fontSize: 8, color: '#C87C6A', marginTop: 1 }}>{pol.badge}</div>}
        {/* ★2026-07-30 (3단계-e) — 특수 규칙 배지(숫자·간지·동자이음).
            不用 배지와 «다른 축» 이라 둘 다 붙을 수 있습니다. */}
        {pol.specialBadge && <div style={{ fontSize: 8, color: '#9A8FB0', marginTop: 1 }}>{pol.specialBadge}</div>}
        {!pol.badge && !pol.specialBadge && soft && <div style={{ fontSize: 8, color: '#E0A04A', marginTop: 1 }}>주의</div>}
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
            바꿀 글자 한 개를 골라주세요 {lockedByPick && <span style={{ color: GOLD }}>· 선택됨 (다른 자리 잠김)</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {givenChars.map((c, gi) => {
              const idx = surCount + gi   // ★복성이면 chars 자리가 2 부터
              const isActive = activeIdx === idx
              const locked = lockedByPick && !isActive
              const picked = chosen[idx] !== undefined
              return (
                <button key={idx} onClick={() => chooseSlot(idx)} className="active:scale-95"
                  style={{ flex: 1, padding: '14px 0', borderRadius: 14, textAlign: 'center', position: 'relative',
                    background: picked ? 'rgba(129,199,132,0.14)' : isActive ? 'rgba(250,199,117,0.16)' : CARD,
                    border: '1px solid ' + (picked ? GREEN : isActive ? GOLD : 'rgba(250,199,117,0.12)'),
                    opacity: locked ? 0.45 : 1, cursor: 'pointer' }}>
                  {locked && <span style={{ position: 'absolute', top: 6, right: 8, fontSize: 12 }}>🔒</span>}
                  <div style={{ fontSize: 26, fontWeight: 700, color: picked ? GREEN : isActive ? GOLD : '#fff' }}>
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

      {yongsinReady && recommend.length > 0 && (
        <div style={{ marginTop: 28, borderTop: '1px solid rgba(250,199,117,0.15)', paddingTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>✨ 작명 도우미에게 물어보기</span>
            <span style={{ fontSize: 11, color: SUB }}>남은 질문 {chatLeft}회</span>
          </div>
          <div style={{ fontSize: 11, color: SUB, marginBottom: 12, lineHeight: 1.6 }}>
            추천된 한자나 이름에 대해 궁금한 점을 물어보세요. (예: 두 글자 중 뭐가 더 어울려요?)
          </div>

          <div style={{ background: CARD, border: '1px solid rgba(250,199,117,0.12)', borderRadius: 14, padding: 12, maxHeight: 320, overflowY: 'auto' }}>
            {chatMsgs.length === 0 && (
              <div style={{ fontSize: 12, color: SUB, textAlign: 'center', padding: '16px 0' }}>
                무엇이든 편하게 물어보세요.
              </div>
            )}
            {chatMsgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                <div style={{
                  maxWidth: '80%', padding: '9px 12px', borderRadius: 14, fontSize: 13, lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  background: m.role === 'user' ? 'rgba(250,199,117,0.18)' : '#1f1e1c',
                  color: m.role === 'user' ? '#fff' : '#e0dce8',
                  border: m.role === 'user' ? '1px solid rgba(250,199,117,0.3)' : '1px solid rgba(255,255,255,0.06)',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
                <div style={{ padding: '9px 12px', borderRadius: 14, fontSize: 13, background: '#1f1e1c', color: SUB, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>✦</span> 생각 중…
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {chatLeft > 0 ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendChat() }}
                placeholder="궁금한 점을 입력하세요"
                disabled={chatLoading}
                style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#1a1a18', border: '1px solid rgba(255,255,255,0.15)', color: '#e8e4ff', fontSize: 14 }}
              />
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                style={{ padding: '12px 18px', borderRadius: 12, background: chatInput.trim() && !chatLoading ? GOLD : '#444', border: 'none', color: chatInput.trim() && !chatLoading ? '#1a1a18' : '#888', fontWeight: 700, cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'default' }}>
                전송
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 14, background: 'rgba(250,199,117,0.08)', border: '1px solid rgba(250,199,117,0.3)', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#fff', marginBottom: 6 }}>질문 {CHAT_LIMIT}회를 모두 사용했어요.</div>
              <div style={{ fontSize: 12, color: SUB, lineHeight: 1.6 }}>
                더 깊은 상담은 연재 선생님과 함께하실 수 있어요. (추가 질문은 결제 후 이용 — 준비 중)
              </div>
            </div>
          )}
        </div>
      )}

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
