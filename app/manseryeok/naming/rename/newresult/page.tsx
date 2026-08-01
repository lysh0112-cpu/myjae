'use client'
import { Suspense, useState, useEffect, useMemo, useRef } from 'react'
import { splitSurname } from '@/lib/saju/surname'
import { useRouter } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
// ★2026-08-01 (Phase 1-C) — 감정과 «같은» 결과 프레임
import NameAnalysisResultView from '@/app/manseryeok/naming/components/NameAnalysisResultView'
import type { PerspectiveCommentary } from '@/app/manseryeok/components/PerspectiveAccordion'
import { calcYongsinCompat } from '@/lib/saju/yongsinNew'
import { supabase } from '@/lib/supabase'
import { diagnoseName, type NameChar, type DiagnoseResult, type Grade } from '@/lib/saju/naming'
import { saveNamingRecord } from '@/lib/saju/namingRecords'
import ConsultButton from '@/app/components/common/ConsultButton'
import { ohaengOrEmpty } from '@/lib/saju/ohaeng'

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

// ★2026-08-01 (Phase 1-C) — 5관점으로 바로잡았습니다.
//
//   🔴 전에는 { title, summary, good, improve, advice } 였습니다.
//      그런데 /api/naming 은 «5관점» (yinyang·baleum·suri·jawon·yongsin·conclusion)을 줍니다.
//      → commentary.summary 가 «늘 비어» 있어, 손님은 통변을 불러도
//        「불러오기 버튼」만 계속 봤습니다. 통변이 아예 안 나오고 있었습니다.
//
//   ★이제 감정 화면과 «같은» 프레임(NameAnalysisResultView)을 씁니다.
type Commentary = PerspectiveCommentary

interface TryItem {
  name: string
  chars: SavedChar[]
  commentary?: Commentary
}

// ★2026-07-30 (1단계) — 이 자리에 있던 ohaengChar 사본을 걷어냈습니다.
//   네 화면에 한 글자도 다르지 않은 사본이 넷 있었고, 정작 «내이름 감정»
//   (naming/diagnosis/page.tsx)에는 없었습니다. 창구를 하나로 모았습니다. (교훈 CJ)
//   ⚠️ 여기에 다시 사본을 만들지 마십시오. lib/saju/ohaeng.ts 를 부르십시오.

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

  const { saju, solar, dayStem } = useResultSaju(
    info?.calType || '양력',
    info?.year || 0,
    info?.month || 0,
    info?.day || 0,
    info?.leapMonth || '0',
    info?.hourIdx ?? null,
  )

  const cur = tries[activeTry]

  // 심산 오행 점수로 용신 계산 (월지 계절 치환 반영). 4곳에서 같이 쓴다.
  const yongArgs = () => [solar?.month, solar?.day,
    saju.find(p => p.pillar === '시주')?.branch ?? null] as const

  const yongsin = useMemo(() => {
    if (!saju || !dayStem) return ''
    try { return ohaengOrEmpty(calcYongsinCompat(saju, dayStem, ...yongArgs()).yongsin) } catch { return '' }
  }, [saju, dayStem, solar])

  const result = useMemo<DiagnoseResult | null>(() => {
    if (!saju || !dayStem || !cur || cur.chars.length < 2) return null
    try {
      const y = calcYongsinCompat(saju, dayStem, ...yongArgs())
      const { surname, surname2, given } = toDiagnoseParts(cur.chars)
      return diagnoseName({ surname, surname2, given, yongsin: y.yongsin, heeksin: y.heeksin, elementScore: y.score })
    } catch { return null }
  }, [saju, dayStem, cur])

  // ★2026-07-21 2차: 보관함 자동 저장.
  //   [왜] 개명은 지금까지 보관함에 남지 않아, 고객이 나가면 결과가 사라졌다.
  //        다른 화면(사주·궁합·택일·이름풀이)과 같이 자동으로 남긴다.
  //   ⚠️ 같은 이름을 여러 번 봐도 그대로 쌓는다(대표님 확정).
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const savingRef = useRef(false)
  // ★이미 저장한 이름을 기억한다. 후보 탭을 왔다갔다 할 때마다
  //   같은 이름이 다시 쌓이는 것을 막는다. (한 화면 안에서만 유효)
  const savedNamesRef = useRef<Set<string>>(new Set())

  async function saveToArchive() {
    if (!cur || !result) return
    if (savingRef.current) return
    const nameKey = cur.chars.map((c) => c.hanja).join('')
    if (savedNamesRef.current.has(nameKey)) {
      setSavedRecordId(nameKey)   // 이미 저장한 이름 → 표시만 유지
      return
    }
    savingRef.current = true
    setSaveFailed(false)
    try {
      const res = await saveNamingRecord({
        chars: cur.chars,
        relation: 'self',
        person: null,
        result,
        // Commentary 는 이 화면의 로컬 타입이고 저장 함수는 Record 를 받는다.
        //   담기는 값은 같은 모양이라 캐스팅으로 맞춘다.
        commentary: (cur.commentary ?? null) as Record<string, unknown> | null,
        serviceType: 'naming',
        // ★2026-08-01 — 보관함에서 «작명» 으로 갈립니다 (옛 기록은 «풀이» 로 남습니다)
        kind: '개명',
      })
      // ★실패해도 alert 로 막지 않는다. 고객이 부른 게 아니라 자동 저장이다.
      if (res.ok && res.id) {
        savedNamesRef.current.add(nameKey)
        setSavedRecordId(res.id)
      } else {
        setSaveFailed(true)
      }
    } catch {
      setSaveFailed(true)
    } finally {
      savingRef.current = false
    }
  }

  useEffect(() => {
    if (!cur || !result) return
    // 다른 후보 이름을 보면 그것도 새 건으로 저장한다.
    //   (단, 이미 저장한 이름이면 saveToArchive 안에서 건너뛴다)
    setSavedRecordId(null)
    setSaveFailed(false)
    saveToArchive()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, result])

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
          // ★2026-07-30 (1단계) — 상담사 화면에도 «표준 표기» 로 넘깁니다.
          //   전에는 상담사가 '木' 을 보고 판정은 '목' 으로 돌아 두 화면이 어긋났습니다.
          resourceOhaeng: ohaengOrEmpty(c.resourceOhaeng),
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
        // ★2026-08-01 — 5관점으로 바꿨습니다 (옛 summary/good/improve/advice 는 «오지 않습니다»)
        const seg = (label: string, v: { intro: string; name: string; meaning: string }) =>
          `· ${label}\n${[v.name, v.meaning].filter(Boolean).join('\n')}`
        const text = [
          `[개명 · ${hangulName} (${hanjaName})]`,
          c.title ? `\n"${c.title}"` : '',
          '', seg('음양오행', c.yinyang), seg('발음오행', c.baleum), seg('수리오행', c.suri),
          seg('자원오행', c.jawon), seg('사주와의 만남', c.yongsin),
          c.conclusion ? `\n· 맺음말\n${c.conclusion}` : '',
        ].filter(Boolean).join('\n').trim()
        sessionStorage.setItem('ai_analysis', text)
      }
    } catch {}
  }, [cur, result])

  const tryGrades = useMemo(() => {
    if (!saju || !dayStem) return tries.map(() => '')
    try {
      const y = calcYongsinCompat(saju, dayStem, ...yongArgs())
      return tries.map((t) => {
        if (t.chars.length < 2) return ''
        const { surname, surname2, given } = toDiagnoseParts(t.chars)
        try { return diagnoseName({ surname, surname2, given, yongsin: y.yongsin, heeksin: y.heeksin, elementScore: y.score }).overallGrade }
        catch { return '' }
      })
    } catch { return tries.map(() => '') }
  }, [saju, dayStem, tries])

  async function loadDetail() {
    if (!cur || !saju || !dayStem || detailLoading) return
    if (cur.commentary) return
    setDetailLoading(true)
    try {
      const y = calcYongsinCompat(saju, dayStem, ...yongArgs())
      // ⚠️★서버로는 «가르지 않고» 통째로 보냅니다.
      //   Body 에 surname2 를 실을 자리가 없어서, 여기서 갈라 보내면
      //   복성 둘째 글자(궁)가 통째로 사라집니다.
      //   서버가 splitSurname 안전망으로 다시 가릅니다 — 그쪽이 정본입니다.
      const surname: NameChar = {
        hangul: cur.chars[0].hangul, hanja: cur.chars[0].hanja,
        strokes: cur.chars[0].strokes, resourceOhaeng: ohaengOrEmpty(cur.chars[0].resourceOhaeng),
      }
      const given: NameChar[] = cur.chars.slice(1).map((c) => ({
        hangul: c.hangul, hanja: c.hanja, strokes: c.strokes, resourceOhaeng: ohaengOrEmpty(c.resourceOhaeng),
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
      const EMPTY: Commentary = {
        title: '', conclusion: '',
        yinyang: { intro: '', name: '', meaning: '' },
        baleum: { intro: '', name: '', meaning: '' },
        suri: { intro: '', name: '', meaning: '' },
        jawon: { intro: '', name: '', meaning: '' },
        yongsin: { intro: '', name: '', meaning: '' },
      }
      const commentary: Commentary = (data.commentary as Commentary) ?? EMPTY

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

      {/* ★2026-08-01 (Phase 1-C) — 감정과 «같은» 결과 프레임을 씁니다.
          [무엇이 고쳐졌나]  전에는 옛 «종합» 필드를 봤는데 API 가 그 필드를
            «주지 않아» 조건이 늘 거짓이었습니다. 손님은 통변을 불러도
            「불러오기 버튼」만 계속 봤습니다. */}
      {cur.commentary && cur.commentary.yinyang?.meaning ? (
        <NameAnalysisResultView
          hanjaName={fullName}
          hangulName={hangulName}
          subtitle="새로 지은 이름"
          badge={{ kind: '개명' }}
          saju={saju}
          solarYear={solar?.year ?? 0}
          solarMonth={solar?.month ?? 1}
          solarDay={solar?.day ?? 1}
          dayStem={dayStem ?? ''}
          commentary={cur.commentary}
          stars={null}
          overallStar={null}
          yongsin={(yongsin || null) as never}
          careerHref="/manseryeok/career-input"
          onOtherHanja={() => router.push('/manseryeok/naming/rename/newhanja')}
        />
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

      {/* 보관함 저장 상태 — 자동 저장이라 누르는 버튼이 아니다. (2026-07-21 2차)
          실패했을 때만 [다시 저장]으로 바뀐다. */}
      {cur && result && (
        saveFailed ? (
          <button onClick={saveToArchive}
            style={{ width: '100%', padding: 13, borderRadius: 12, marginBottom: 6,
              background: GOLD, border: 'none', color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            💾 다시 저장하기
          </button>
        ) : savedRecordId ? (
          <>
            <div style={{ width: '100%', padding: 13, borderRadius: 12, marginBottom: 4,
              background: '#eef5e8', color: '#4a7a3a',
              fontSize: 14, fontWeight: 500, textAlign: 'center' }}>
              ✓ 보관함에 저장됐어요
            </div>
            <div style={{ fontSize: 11, color: '#6b5340', textAlign: 'center', marginBottom: 10 }}>
              보관함에서 언제든 다시 볼 수 있어요
            </div>
          </>
        ) : null
      )}

      {/* 전문가 상담 연결 (개명 상담 · mode=naming) — 저장 표시 아래.
          관리자 > 가격 관리에서 '노출'을 끄면 이 영역이 통째로 사라진다. */}
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


/**
 * ★2026-07-31 복성 — 글자 배열을 diagnoseName 이 받을 꼴로 가릅니다.
 *   남궁민수 → 성 [남,궁] · 이름 [민,수].  가르는 것은 splitSurname 하나뿐입니다.
 *   ⚠️ 화면마다 chars[0] 으로 자르면 복성 손님의 점수가 서버 결과와 어긋납니다.
 */
function toDiagnoseParts(chars: { hangul: string; hanja: string; strokes: number; resourceOhaeng?: string | null }[]) {
  const sp = splitSurname(chars)
  const toName = (c: typeof chars[number]): NameChar => ({
    hangul: c.hangul, hanja: c.hanja, strokes: c.strokes,
    resourceOhaeng: ohaengOrEmpty(c.resourceOhaeng ?? ''),
  })
  return {
    surname: toName(sp.surname[0]),
    surname2: sp.surname[1] ? toName(sp.surname[1]) : null,
    given: sp.given.map(toName),
    surCount: sp.surname.length,
  }
}

export default function NewResultPage() {
  return (
    <Suspense fallback={<div style={{ background: '#FDF6F0', minHeight: '100vh' }} />}>
      <NewResultInner />
    </Suspense>
  )
}
