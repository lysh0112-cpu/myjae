'use client'
import { Suspense, useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsinCompat } from '@/lib/saju/yongsinNew'
import { diagnoseName, type NameChar, type DiagnoseResult } from '@/lib/saju/naming'
import ConsultButton from '@/app/components/common/ConsultButton'
import { supabase } from '@/lib/supabase'
import { saveNamingRecord } from '@/lib/saju/namingRecords'
import PerspectiveAccordion from '@/app/manseryeok/components/PerspectiveAccordion'

const GOLD = '#c8783c'
const CARD = '#fffbf7'
const SUB = '#b4785a'
const GREEN = '#81c784'

const DEFAULT_TRY_LIMIT = 3
const BABY_HISTORY_KEY = 'newborn_history_v1'
const NEWBORN_PASS_KEY = 'newborn_pass_v1'   // 아기 이용권 { babyKey, remaining }

interface SavedChar {
  hangul: string
  hanja: string
  strokes: number
  resourceOhaeng: string
}

interface Perspective {
  intro: string
  name: string
  meaning: string
}
interface Commentary {
  title: string
  yinyang: Perspective
  baleum: Perspective
  suri: Perspective
  jawon: Perspective
  yongsin: Perspective
  conclusion: string
}

const EMPTY_PERSPECTIVE: Perspective = { intro: '', name: '', meaning: '' }

// ── 방어: 통변 문자열에 "파싱 실패한 원본 JSON"이 섞였는지 감지 ──
const RAW_JSON_HINTS = [
  '{"title"', '"title":', '"intro":', '"name":', '"meaning":',
  '"yinyang"', '"baleum"', '"suri"', '"jawon"', '"yongsin"', '"conclusion"',
]
function looksLikeRawJson(text: string): boolean {
  if (!text) return false
  const t = text.trim()
  if (RAW_JSON_HINTS.some((h) => t.includes(h))) return true
  if (t.startsWith('{') && t.includes('"')) return true
  return false
}
// 오염된 문자열이면 빈 문자열로 대체 (원본 JSON 노출 차단)
function cleanText(text: string): string {
  return looksLikeRawJson(text) ? '' : text
}

// 저장 스냅샷/옛 데이터를 5관점 Commentary로 안전 변환 (이름풀이와 동일 로직)
function normalizeCommentary(raw: unknown): Commentary | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const asPersp = (v: unknown): Perspective => {
    if (v && typeof v === 'object') {
      const p = v as Record<string, unknown>
      return {
        intro: cleanText(typeof p.intro === 'string' ? p.intro : ''),
        name: cleanText(typeof p.name === 'string' ? p.name : ''),
        meaning: cleanText(typeof p.meaning === 'string' ? p.meaning : ''),
      }
    }
    return { ...EMPTY_PERSPECTIVE }
  }
  const hasNew = 'yinyang' in o || 'baleum' in o || 'jawon' in o || 'conclusion' in o
  if (hasNew) {
    return {
      title: cleanText(typeof o.title === 'string' ? o.title : ''),
      yinyang: asPersp(o.yinyang),
      baleum: asPersp(o.baleum),
      suri: asPersp(o.suri),
      jawon: asPersp(o.jawon),
      yongsin: asPersp(o.yongsin),
      conclusion: cleanText(typeof o.conclusion === 'string' ? o.conclusion : ''),
    }
  }
  const legacy = [o.summary, o.good, o.improve, o.advice]
    .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    .map((x) => cleanText(x))
    .filter((x) => x !== '')
    .join('\n\n')
  return {
    title: cleanText(typeof o.title === 'string' ? o.title : ''),
    yinyang: { ...EMPTY_PERSPECTIVE }, baleum: { ...EMPTY_PERSPECTIVE },
    suri: { ...EMPTY_PERSPECTIVE }, jawon: { ...EMPTY_PERSPECTIVE },
    yongsin: { ...EMPTY_PERSPECTIVE }, conclusion: legacy,
  }
}

// 5관점 통변이 하나라도 채워졌는지 (상세풀이 도착 판정용)
function hasCommentary(c: Commentary | null | undefined): boolean {
  if (!c) return false
  return !!(c.conclusion || c.yinyang.intro || c.baleum.intro || c.suri.intro || c.jawon.intro || c.yongsin.intro)
}

// commentary 안의 모든 텍스트 필드를 훑어 오염(원본 JSON)이 하나라도 있으면 true.
//   (예: conclusion에 {"title":..., "yinyang":{"intro":... 가 통째로 들어간 곽일우 케이스)
//   looksLikeRawJson은 위(파일 상단)에서 정의됨.
function commentaryHasRawJson(c: Commentary | null | undefined): boolean {
  if (!c) return false
  const fields = [
    c.title, c.conclusion,
    c.yinyang.intro, c.yinyang.name, c.yinyang.meaning,
    c.baleum.intro, c.baleum.name, c.baleum.meaning,
    c.suri.intro, c.suri.name, c.suri.meaning,
    c.jawon.intro, c.jawon.name, c.jawon.meaning,
    c.yongsin.intro, c.yongsin.name, c.yongsin.meaning,
  ]
  return fields.some((f) => looksLikeRawJson(f))
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
  const [remaining, setRemaining] = useState(0)        // ★ 남은 조회 횟수(이용권)
  const [finalPicked, setFinalPicked] = useState(false) // ★ 최종 선택 완료 여부
  const [showFinalPopup, setShowFinalPopup] = useState(false) // ★ '최종 선택하세요' 팝업
  const [saving, setSaving] = useState(false)

  // ★ 이름 짓기 조회 횟수 (관리자 설정값 · app_settings)
  const [TRY_LIMIT, setTryLimit] = useState(DEFAULT_TRY_LIMIT)
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'naming_try_limit').maybeSingle()
      .then(({ data }) => { if (data && typeof data.value === 'number') setTryLimit(data.value) })
  }, [])

  // ★ 아기 이용권 남은 횟수 읽기
  useEffect(() => {
    if (!bkey) return
    try {
      const p = JSON.parse(localStorage.getItem(NEWBORN_PASS_KEY) || '{}')
      if (p.babyKey === bkey && typeof p.remaining === 'number') setRemaining(p.remaining)
      else setRemaining(0)
    } catch { setRemaining(0) }
  }, [bkey])

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

  // ★ 마지막 회차 소진(remaining=0) + 후보 있음 + 아직 최종선택 안 함 → '최종 선택하세요' 팝업
  useEffect(() => {
    if (loaded && remaining === 0 && tries.length > 0 && !finalPicked) {
      setShowFinalPopup(true)
    }
  }, [loaded, remaining, tries.length, finalPicked])

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
        const persp = (label: string, p: Perspective) =>
          `· ${label}\n${[p?.intro, p?.name, p?.meaning].filter(Boolean).join('\n')}`
        const text = [
          `[아기 이름 · ${hangulName} (${hanjaName})]`,
          c.title ? `"${c.title}"` : '',
          persp('음양오행', c.yinyang),
          persp('발음오행', c.baleum),
          persp('수리오행', c.suri),
          persp('자원오행', c.jawon),
          persp('사주와의 만남', c.yongsin),
          c.conclusion ? `· 맺음\n${c.conclusion}` : '',
        ].filter(Boolean).join('\n\n').trim()
        sessionStorage.setItem('ai_analysis', text)
      }
    } catch {}
  }, [cur, result, baby])

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
          birthData: baby,
          saju,
        }),
      })

      // ★ 응답이 실패(504 등)거나 JSON이 아니면 → 후보·회차 건드리지 않고 안내만.
      if (!res.ok) {
        alert('풀이를 불러오지 못했어요 (서버 응답 지연).\n잠시 후 다시 눌러주세요. 회차는 차감되지 않았어요.')
        return
      }
      let data: { commentary?: unknown }
      try {
        data = await res.json()
      } catch {
        alert('풀이를 불러오지 못했어요 (응답 오류).\n잠시 후 다시 눌러주세요. 회차는 차감되지 않았어요.')
        return
      }

      const commentary: Commentary = normalizeCommentary(data.commentary) ?? {
        title: '', yinyang: { ...EMPTY_PERSPECTIVE }, baleum: { ...EMPTY_PERSPECTIVE },
        suri: { ...EMPTY_PERSPECTIVE }, jawon: { ...EMPTY_PERSPECTIVE },
        yongsin: { ...EMPTY_PERSPECTIVE }, conclusion: '',
      }
      // ★ 통변이 실제로 채워졌을 때만 저장·차감 (빈 통변이면 실패로 간주)
      if (!hasCommentary(commentary)) {
        alert('풀이 내용을 받지 못했어요.\n잠시 후 다시 눌러주세요. 회차는 차감되지 않았어요.')
        return
      }
      // ★ 방어: 파싱 실패한 원본 JSON이 섞였으면 저장·차감하지 않는다 (오염 박제 방지).
      if (commentaryHasRawJson(commentary)) {
        alert('풀이를 온전히 받지 못했어요.\n잠시 후 다시 눌러주세요. 회차는 차감되지 않았어요.')
        return
      }
      setTries((prev) => {
        const nextTries = prev.map((t, i) => (i === activeTry ? { ...t, commentary } : t))
        try {
          localStorage.setItem(BABY_HISTORY_KEY, JSON.stringify({ babyKey: bkey, tries: nextTries }))
        } catch {}
        return nextTries
      })
      // ★ 이용권 1회 차감 (상세 풀이를 실제로 받은 경우에만)
      setRemaining((prev) => {
        const next = Math.max(0, prev - 1)
        try {
          localStorage.setItem(NEWBORN_PASS_KEY, JSON.stringify({ babyKey: bkey, remaining: next }))
        } catch {}
        return next
      })
    } catch (e) {
      console.error('detail error:', e)
    } finally {
      setDetailLoading(false)
    }
  }

  // ★ 특정 이름을 "최종 선택" → 부모 계정(user_id)으로 my_names에 저장 (kind='newborn')
  //   확정하면 못 바꿈. 마이페이지·상담사 화면에 이 최종 이름만 뜸.
  //   ⚠️ 최종 선택 = 확정. 남은 조회 횟수가 있어도 소멸하고 더 이상 지어볼 수 없다.
  async function pickFinal(t: TryItem) {
    if (saving || finalPicked) return

    // ★ 통변 누락 방지: localStorage의 최신 tries에서 같은 이름의 최신 통변을 다시 읽어 보강.
    //   (state의 t가 stale이어도 저장된 통변을 확실히 가져온다)
    let picked = t
    try {
      const h = JSON.parse(localStorage.getItem(BABY_HISTORY_KEY) || '{}')
      if (h.babyKey === bkey && Array.isArray(h.tries)) {
        const key = t.chars.map((c) => c.hanja).join('')
        const fresh = (h.tries as TryItem[]).find((x) => x.chars.map((c) => c.hanja).join('') === key)
        if (fresh) picked = fresh
      }
    } catch {}

    // ★ 게이트 A(저장 직전 방어): 통변이 파싱 실패한 원본 JSON으로 오염됐으면
    //   최종선택을 중단한다. 깨진 통변을 보관함에 박제하지 않는다.
    //   (회차 차감·후보 삭제는 아직 안 했으므로 그대로 유지된다.)
    if (commentaryHasRawJson(picked.commentary ?? null)) {
      alert('풀이가 온전하지 않아요. 이 이름은 아직 최종 선택할 수 없어요.\n해당 이름의 풀이를 다시 생성한 뒤 선택해 주세요.')
      return
    }

    // 최종 선택 경고 — 남은 횟수가 있으면 "소멸된다" 안내 후 확인
    const hanjaName0 = picked.chars.map((c) => c.hanja).join('')
    const warn = remaining > 0
      ? `"${hanjaName0}"(으)로 최종 선택할까요?\n\n최종 선택하면 더 이상 다른 이름을 지어볼 수 없어요.\n(남은 조회 ${remaining}회는 사라져요.)`
      : `"${hanjaName0}"(으)로 최종 선택할까요?\n\n최종 선택하면 더 이상 다른 이름을 지어볼 수 없어요.`
    if (!window.confirm(warn)) return

    setSaving(true)
    try {
      const { data: u } = await supabase.auth.getUser()
      if (!u?.user) {
        alert('로그인이 필요해요.')
        setSaving(false)
        return
      }
      const hangulName = picked.chars.map((c) => c.hangul).join('')
      const hanjaName = picked.chars.map((c) => c.hanja).join('')

      // 저장 시점의 4가지 등급(result)을 박제 → 다시보기는 순수 읽기 전용
      let savedResult: DiagnoseResult | null = null
      try {
        if (saju && dayStem && picked.chars.length >= 2) {
          const y = calcYongsinCompat(saju, dayStem)
          const surname: NameChar = {
            hangul: picked.chars[0].hangul, hanja: picked.chars[0].hanja,
            strokes: picked.chars[0].strokes, resourceOhaeng: ohaengChar(picked.chars[0].resourceOhaeng),
          }
          const given: NameChar[] = picked.chars.slice(1).map((c) => ({
            hangul: c.hangul, hanja: c.hanja, strokes: c.strokes, resourceOhaeng: ohaengChar(c.resourceOhaeng),
          }))
          savedResult = diagnoseName({ surname, given, yongsin: y.yongsin, heeksin: y.heeksin, elementScore: y.score })
        }
      } catch {}

      await supabase.from('my_names').insert({
        user_id: u.user.id,
        hangul_name: hangulName,
        hanja_name: hanjaName,
        chars: picked.chars,
        result: savedResult,
        commentary: picked.commentary ?? null,
        kind: 'newborn',
        person_key: bkey,
      })

      // ── 아기 이름 보관함(saju_records, service_type='newborn')에도 병행 저장 ──
      //   홈 > [아기 이름 짓기] 진입 시 뜨는 보관함이 이 기록을 읽는다.
      //   ★ 최종선택했으면 무조건 저장한다 (savedResult 없어도 이름·통변은 저장).
      try {
        const person = baby ? {
          gender: baby.gender, calType: baby.calType,
          year: baby.year, month: baby.month, day: baby.day,
          leapMonth: baby.leapMonth, hour: baby.hour,
        } : null
        const charsForSave: (NameChar | null)[] = picked.chars.map((c) => ({
          hangul: c.hangul, hanja: c.hanja,
          strokes: c.strokes, resourceOhaeng: ohaengChar(c.resourceOhaeng),
        }))
        await saveNamingRecord({
          chars: charsForSave,
          relation: 'baby',
          person,
          result: savedResult,
          commentary: (picked.commentary ?? null) as Record<string, unknown> | null,
          serviceType: 'newborn',
        })
      } catch (e) { console.error(e) }

      setFinalPicked(true)

      // ⚠️ 최종 선택 확정 → 남은 조회 횟수 소멸 + 임시 보관 이름들 삭제
      //   최종선택 = 이 이름으로 확정. 나머지 지어봤던 이름(임시)은 정리한다.
      //   (전체 보관함에는 최종선택한 이름만 정식 저장됨)
      try {
        localStorage.setItem(NEWBORN_PASS_KEY, JSON.stringify({ babyKey: bkey, remaining: 0 }))
        localStorage.removeItem(BABY_HISTORY_KEY)   // ★ 지어봤던 임시 이름들 삭제
        setRemaining(0)
      } catch {}

      // 저장 완료 → 아기 보관함으로 이동 (방금 저장한 이름이 목록 맨 위에 보인다)
      router.push('/manseryeok/naming/rename/newborn-storage')
    } catch (e) {
      console.error(e)
      alert('저장에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  if (loaded && tries.length === 0) {
    return (
      <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
        <Header router={router} />
        <div style={{ padding: '40px 8px', textAlign: 'center', color: SUB, lineHeight: 1.8 }}>
          아직 지어본 이름이 없어요.
          <div style={{ marginTop: 20 }}>
            <button onClick={() => router.push('/manseryeok/naming/rename/newborn')}
              style={{ padding: '12px 22px', borderRadius: 12, background: 'rgba(200,120,60,0.12)', border: '1px solid ' + GOLD, color: GOLD, fontWeight: 700, cursor: 'pointer' }}>
              아기 이름 지으러 가기 →
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!loaded || !cur) return <main style={{ minHeight: '100vh', background: '#FDF6F0' }} />

  const fullName = cur.chars.map((c) => c.hanja).join('')
  const hangulName = cur.chars.map((c) => c.hangul).join('')

  // 다른 이름 또 지어보려면 아기 사주를 그대로 들고 newborn 입력으로
  const babyParam = sp.get('baby') || ''

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes candSparkle {
          0%,100% { border-color:#e6be9f; box-shadow:0 0 0 0 rgba(200,120,60,0); }
          50% { border-color:#c8783c; box-shadow:0 0 10px 2px rgba(200,120,60,0.35); }
        }
        @keyframes popIn {
          from { opacity:0; transform:translateY(8px) scale(0.96); }
          to { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>
      <Header router={router} />

      <div style={{ textAlign: 'center', margin: '14px 0 6px' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: GOLD, letterSpacing: 4 }}>{fullName}</div>
        <div style={{ fontSize: 13, color: SUB, marginTop: 4 }}>{hangulName} · 아기 이름</div>
        {yongsin && <div style={{ fontSize: 11, color: SUB, marginTop: 2 }}>사주에 필요한 기운 <b style={{ color: GREEN }}>{yongsin}</b></div>}
      </div>

      {tries.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: SUB, margin: '0 0 8px' }}>
            {remaining === 0 && !finalPicked
              ? '📋 조회한 후보 이름 · 눌러서 최종 선택'
              : '지금까지 지어본 이름 (눌러서 비교)'}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {tries.map((t, i) => {
              const on = i === activeTry
              const pickMode = remaining === 0 && !finalPicked   // 최종선택 모드
              return (
                <button key={i}
                  onClick={() => pickMode ? pickFinal(t) : setActiveTry(i)}
                  disabled={saving}
                  className="active:scale-95"
                  style={{
                    padding: '10px 16px', borderRadius: 12, cursor: saving ? 'default' : 'pointer',
                    background: on && !pickMode ? 'rgba(200,120,60,0.12)' : CARD,
                    border: '2px solid ' + (pickMode ? '#e6be9f' : (on ? GOLD : 'rgba(200,120,60,0.10)')),
                    animation: pickMode ? 'candSparkle 1.3s ease-in-out infinite' : 'none',
                    animationDelay: pickMode ? `${i * 0.4}s` : '0s',
                  }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: on && !pickMode ? GOLD : '#1a1a1a' }}>
                    {t.chars.map((c) => c.hanja).join('')}
                  </span>
                  {on && !pickMode && <span style={{ fontSize: 10, color: '#96502e', marginLeft: 5 }}>보는 중</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {hasCommentary(cur.commentary) ? (
        <>
          {cur.commentary && <PerspectiveAccordion commentary={cur.commentary} />}

          {finalPicked ? (
            <div style={{ background: 'rgba(129,199,132,0.12)', border: '1px solid ' + GREEN, borderRadius: 14, padding: '14px', marginBottom: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 4 }}>✓ 최종 이름으로 저장했어요</div>
              <div style={{ fontSize: 12, color: SUB }}>마이페이지에서 확인하실 수 있어요.</div>
            </div>
          ) : (
            <div style={{ background: 'rgba(129,199,132,0.10)', border: '1px solid ' + GREEN, borderRadius: 14, padding: '13px 16px', marginBottom: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#4a9450', marginBottom: 3 }}>✓ 후보로 임시저장됐어요</div>
              <div style={{ fontSize: 12, color: SUB, lineHeight: 1.6 }}>
                {remaining > 0
                  ? <>위 후보 목록에 담겼어요 · 남은 조회 <b style={{ color: GOLD }}>{remaining}회</b></>
                  : <>조회 횟수를 모두 사용했어요 · 후보 중에서 최종 선택해 주세요</>}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ marginBottom: 14 }}>
          {remaining > 0 ? (
            <>
              <button onClick={loadDetail} disabled={detailLoading} className="active:scale-95"
                style={{ width: '100%', background: '#c8783c', border: 'none', borderRadius: 14, padding: 14, color: '#fff', fontWeight: 700, fontSize: 14, cursor: detailLoading ? 'default' : 'pointer' }}>
                {detailLoading
                  ? <><span style={{ display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>✦</span> 이름을 정성껏 풀이하는 중…</>
                  : <>✨ 이 이름 풀이 보고 후보 담기 · 남은 {remaining}회</>}
              </button>
              <div style={{ fontSize: 11, color: SUB, textAlign: 'center', marginTop: 8, lineHeight: 1.6 }}>
                누르면 5관점 풀이를 보고 이 이름이 후보로 저장돼요 (1회 차감)
              </div>
            </>
          ) : (
            <div style={{ background: CARD, border: '1px solid rgba(200,120,60,0.14)', borderRadius: 14, padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.7, marginBottom: 12 }}>
                이용 가능 횟수를 모두 사용했어요.<br />다시 결제하시면 이어서 이용하실 수 있어요.
              </div>
              <button onClick={() => router.push('/manseryeok/naming/rename/newborn')} className="active:scale-95"
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
        남은 조회 횟수 {remaining > 0 ? remaining : 0}회
      </div>
      {remaining > 0 ? (
        <button onClick={() => {
          const babyParam = sp.get('baby') || ''
          // 현재 이름의 성씨(chars[0])를 그대로 실어 보내 성씨 입력도 건너뜀
          const sur = cur.chars[0]
          const surParam = sur ? encodeURIComponent(JSON.stringify({
            hangul: sur.hangul, hanja: sur.hanja, strokes: sur.strokes, resourceOhaeng: sur.resourceOhaeng,
          })) : ''
          router.push('/manseryeok/naming/rename/newborn?baby=' + babyParam + (surParam ? '&surname=' + surParam : ''))
        }} className="active:scale-95"
          style={{ width: '100%', background: 'rgba(200,120,60,0.12)', border: '1px solid ' + GOLD, borderRadius: 14, padding: 13, color: GOLD, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          다른 이름 또 지어보기 →
        </button>
      ) : (
        <div style={{ background: CARD, border: '1px solid rgba(200,120,60,0.14)', borderRadius: 14, padding: '13px 16px', fontSize: 12, color: SUB, lineHeight: 1.7, textAlign: 'center' }}>
          위 후보 이름 중에서 하나를 눌러 최종 선택해 주세요.
        </div>
      )}

      {/* ★ 마지막 회차 소진 → '최종 선택하세요' 안내 팝업 (하단에서 올라옴) */}
      {showFinalPopup && !finalPicked && (
        <div
          onClick={() => setShowFinalPopup(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(40,28,22,0.35)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '0 16px 24px',
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 400, background: '#fffbf7', borderRadius: 18,
              padding: '22px 20px', textAlign: 'center',
              boxShadow: '0 8px 30px rgba(40,28,22,0.25)',
              animation: 'popIn 0.3s ease-out',
            }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>✨</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#96502e', marginBottom: 8, lineHeight: 1.5 }}>
              최종 이름을 선택해 주세요
            </div>
            <div style={{ fontSize: 13, color: SUB, lineHeight: 1.7, marginBottom: 18 }}>
              조회 횟수를 모두 사용했어요.<br />
              선택한 이름만 보관함에 저장되고,<br />
              나머지 후보는 사라져요.
            </div>
            <button
              onClick={() => setShowFinalPopup(false)}
              className="active:scale-95"
              style={{ width: '100%', background: '#c8783c', border: 'none', borderRadius: 12, padding: 13, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              후보 중에서 고르기
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
      <button onClick={() => router.push('/manseryeok/naming/rename/newborn-hanja')} aria-label="뒤로" style={{ background: 'none', border: 'none', color: '#999', fontSize: 20, cursor: 'pointer', padding: 0 }}>{'\u2039'}</button>
      <span style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>아기 이름 결과</span>
    </div>
  )
}

export default function NewbornResultPage() {
  return (
    <Suspense fallback={<div style={{ background: '#FDF6F0', minHeight: '100vh' }} />}>
      <NewbornResultInner />
    </Suspense>
  )
}
