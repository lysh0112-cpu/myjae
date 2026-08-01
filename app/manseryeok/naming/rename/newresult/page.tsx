'use client'
import { Suspense, useState, useEffect, useMemo, useRef } from 'react'
import { splitSurname } from '@/lib/saju/surname'
import { useRouter, useSearchParams } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
// ★2026-08-01 (Phase 1-C) — 감정과 «같은» 결과 프레임
import NameAnalysisResultView from '@/app/manseryeok/naming/components/NameAnalysisResultView'
import type { PerspectiveCommentary } from '@/app/manseryeok/components/PerspectiveAccordion'
import { calcYongsinCompat } from '@/lib/saju/yongsinNew'
import { supabase } from '@/lib/supabase'
import { diagnoseName, type NameChar, type DiagnoseResult, type Grade } from '@/lib/saju/naming'
import { saveNamingRecord } from '@/lib/saju/namingRecords'
import ConsultButton from '@/app/components/common/ConsultButton'
// ★2026-08-01 (43부 5차) — A4 작명서 (인쇄 · PDF)
import NamingCertificateButton, { type CertChar } from '@/app/manseryeok/naming/components/NamingCertificate'
// ★2026-08-01 (43부 6차) — 「한 번에 이름 하나」 정책 (대표님 확정)
//   ⚠️ 비교 칩·회차 안내는 «지우지 않았습니다». 배선만 끊었습니다.
import { clampTryLimit, isSingleName, visibleTries, keepPastTries } from '@/lib/saju/namingPolicy'
import { ohaengOrEmpty } from '@/lib/saju/ohaeng'
// ★2026-08-01 (43부) — 작명 «대상» 을 Step 3 에서 그대로 받습니다 (결함 ③④)
import {
  resolveNamingTarget, hasSaju, type NamingTarget,
} from '@/lib/saju/namingSession'

const GOLD = '#c8783c'
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 (43부 6차) — 배색 대비를 올렸습니다 (대표님 지시)
//
//   [무엇이 문제였나]  바탕(#FDF6F0)과 카드(#fffbf7)가 «거의 같은 색» 이라
//     카드가 어디서 시작하고 끝나는지 눈에 안 들어왔습니다.
//     테두리도 rgba(200,120,60,0.10) — 그 위에서는 «없는 것과 같았습니다».
//     ⚠️ 그래서 「고른 것/안 고른 것」이 구분되지 않았습니다.
//
//   ★[이제]  세 층을 또렷이 갈랐습니다.
//     바탕  #F5E9DE   ← 한 단 낮춥니다 (카드가 «떠» 보이게)
//     카드  #FFFFFF   ← 흰색. 바탕과 확실히 갈립니다
//     테두리 #E5D3C2  ← 실제로 «보이는» 선
//     고름  GOLD 테두리 + 옅은 금빛 바탕
//
//   ⚠️ 글자색은 건드리지 않았습니다 — 바탕이 더 밝아졌으므로 대비는 «좋아지기만» 합니다.
//   ⚠️ 어두운 테마 화면(rename/hanja · rename/result)은 «손대지 않았습니다».
//      거기서는 흰 글씨가 «맞습니다». 같이 바꾸면 그 화면이 통째로 안 보입니다.
// ══════════════════════════════════════════════════════════════════
const CARD = '#FFFFFF'
/** ★보이는 테두리 — 이 파일에서 «선» 은 전부 이 값을 쓰십시오 */
const LINE = '#E5D3C2'
/** 바탕 — 카드가 떠 보이도록 한 단 낮춥니다 */
const BG = '#F5E9DE'
const SUB = '#b4785a'
const GREEN = '#81c784'

const DEFAULT_TRY_LIMIT = clampTryLimit(3)

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
  const sp = useSearchParams()

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 (43부) 결함 ③④ — 이 화면이 «누구의» 이름을 그리는지
  //
  //   [무엇이 있었나]
  //     ③ badge 와 보관함 저장이 «'개명' 붙박이» 였습니다.
  //        → 「신생아」 배지는 «생길 길이 없었습니다».
  //     ④ 사주를 localStorage myinfo(내 것)에서만 읽었습니다.
  //        → 가족 이름을 지어도 결과는 «내» 사주로 풀렸습니다.
  //
  //   ⚠️ 대상이 없으면 target 은 null 이고, 아래는 옛 길(myinfo·'개명')로 갑니다.
  //      ★기존 개명 손님의 화면은 달라지지 않습니다. (교훈 [폴백])
  // ══════════════════════════════════════════════════════════════
  const [target, setTarget] = useState<NamingTarget | null>(null)
  /** 개명인가 신생아인가 — ★붙박이를 걷어낸 자리 */
  const namingKind = target?.kind ?? '개명'

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
      .then(({ data }) => { if (data && typeof data.value === 'number') setTryLimit(clampTryLimit(data.value)) })
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
      // ★대상을 «먼저» 받습니다 — URL(정본) → 세션(부본)
      let t = resolveNamingTarget((k) => sp?.get(k))

      // ══════════════════════════════════════════════════════════
      //  🔴★2026-08-01 (43부 5차) — «지난 세션이 흘러드는» 것을 막습니다
      //
      //   [무엇이 있었나]  배지가 언제나 「신생아 작명」으로 굳어 보였습니다.
      //     까닭 — 세션(naming_target_v1)은 «지워질 때까지 남습니다».
      //       ① 아기 이름을 한 번 지으면 kind=신생아 가 세션에 남고
      //       ② 나중에 «개명» 을 옛 길(URL 없이)로 들어오면
      //       ③ resolveNamingTarget 이 그 «묵은» 세션을 집어
      //          개명 결과에 「신생아 작명」 배지가 붙었습니다.
      //     ⚠️ 사주까지 아기 것으로 풀릴 수 있었습니다. 배지보다 이쪽이 더 무겁습니다.
      //
      //   ★[막는 법]  세션의 성씨가 «지금 보고 있는 이름» 의 성씨와 같은지 잽니다.
      //     다르면 남의 세션이므로 «버립니다» → 옛 길(myinfo·개명)로 갑니다.
      //   ⚠️ URL 로 온 것은 «정본» 이라 이 검사를 하지 않습니다.
      // ══════════════════════════════════════════════════════════
      const fromUrl = !!sp?.get('surname')
      if (t && !fromUrl) {
        try {
          const h = JSON.parse(localStorage.getItem(NEWNAME_HISTORY_KEY) || '{}')
          const first = Array.isArray(h.tries) && h.tries.length
            ? (h.tries[h.tries.length - 1] as TryItem)
            : null
          const surOfName = first?.chars?.[0]?.hangul ?? ''
          if (surOfName && !t.surnameHangul.startsWith(surOfName)) {
            t = null   // ★묵은 세션입니다. 쓰지 않습니다.
          }
        } catch { /* 못 읽으면 그냥 둡니다 — 막지 않습니다 */ }
      }
      if (!cancelled) setTarget(t)

      // ── 사주 info ──
      //   ★① 대상의 사주 (결함 ④가 새던 자리)  ② 없으면 localStorage myinfo
      if (hasSaju(t)) {
        if (!cancelled) {
          setInfo({
            calType: t!.calType, year: t!.year, month: t!.month, day: t!.day,
            leapMonth: t!.leapMonth, hourIdx: t!.hourIdx,
          })
        }
      } else {
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
      }

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
  }, [sp])

  const { saju, solar, dayStem } = useResultSaju(
    info?.calType || '양력',
    info?.year || 0,
    info?.month || 0,
    info?.day || 0,
    info?.leapMonth || '0',
    info?.hourIdx ?? null,
  )

  /**
   * ★2026-08-01 (43부 6차) — 「한 번에 하나」면 «언제나 마지막에 지은 이름» 입니다.
   *
   *   ⚠️ activeTry 를 그대로 두는 것은 «일부러» 입니다.
   *      정책을 되돌리면 비교 칩이 그 값을 다시 씁니다 — 배선만 끊어 두었습니다.
   *   ⚠️ visibleTries 를 씁니다 — 「어느 것을 보여 줄까」를 화면마다 판단하면
   *      한 군데만 어긋나도 «다른 이름의 풀이» 가 나갑니다.
   */
  const shownTries = visibleTries(tries)
  const cur = isSingleName ? shownTries[0] : tries[activeTry]

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
        // ★2026-08-01 (43부) — 「누구 이름인가」를 기록에 남깁니다.
        //   전에는 언제나 self 라, 아이 이름을 지어도 보관함에 «본인» 으로 쌓였습니다.
        relation: target?.relation || 'self',
        person: target && hasSaju(target)
          ? {
              gender: target.gender || '남',
              calType: target.calType,
              year: String(target.year), month: String(target.month), day: String(target.day),
              leapMonth: target.leapMonth,
              hour: target.hourIdx == null ? '모름' : String(target.hourIdx),
            }
          : null,
        result,
        // Commentary 는 이 화면의 로컬 타입이고 저장 함수는 Record 를 받는다.
        //   담기는 값은 같은 모양이라 캐스팅으로 맞춘다.
        commentary: (cur.commentary ?? null) as Record<string, unknown> | null,
        // ⚠️ service_type 은 «나누지 않습니다» — 나누면 옛 기록이 목록에서 사라집니다
        serviceType: 'naming',
        // ★2026-08-01 (43부) — «붙박이 '개명'» 을 걷어냈습니다 (결함 ③).
        //   전에는 신생아 작명도 「개명」으로 저장돼 보관함 배지가 늘 개명이었습니다.
        kind: namingKind,
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
      <main style={{ minHeight: '100vh', background: BG, maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
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

  if (!loaded || !cur) return <main style={{ minHeight: '100vh', background: BG }} />

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
    <main style={{ minHeight: '100vh', background: BG, maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <Header router={router} />

      <div style={{ textAlign: 'center', margin: '14px 0 6px' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: GOLD, letterSpacing: 4 }}>{fullName}</div>
        <div style={{ fontSize: 13, color: SUB, marginTop: 4 }}>{hangulName} · 새로 지은 이름</div>
        {yongsin && <div style={{ fontSize: 11, color: SUB, marginTop: 2 }}>사주에 필요한 기운 <b style={{ color: GREEN }}>{yongsin}</b></div>}
      </div>

      {result && (
        <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, margin: '16px 0 14px' }}>
          <div style={{ fontSize: 12, color: GOLD, marginBottom: 12, fontWeight: 700 }}>이름 분석 (4가지 기준)</div>
          {rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${LINE}` }}>
              <span style={{ fontSize: 13, color: '#1a1a1a' }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: gradeColor(row.f.grade) }}>{row.f.grade}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${LINE}`, textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: SUB }}>종합 </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: gradeColor(result.overallGrade) }}>{result.overallGrade}</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ★2026-08-01 (43부 6차) — 「한 번에 이름 하나」 (대표님 확정)
            비교 칩의 «배선을 끊었습니다». 부품은 아래 그대로 살아 있어
            namingPolicy 의 값 하나만 되돌리면 예전으로 돌아옵니다.
          ⚠️ 옛 기록을 «감추기만» 합니다. 지우지 않았습니다 —
             보관함에 그대로 있고, 아래에서 그리로 가는 길을 알려 드립니다.
          ══════════════════════════════════════════════════════════ */}
      {!isSingleName && tries.length > 1 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: SUB, margin: '0 0 8px' }}>지금까지 지어본 이름 (눌러서 비교)</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tries.map((t, i) => {
              const on = i === activeTry
              const g = tryGrades[i]
              return (
                <button key={i} onClick={() => setActiveTry(i)} className="active:scale-95"
                  style={{ padding: '8px 12px', borderRadius: 12, cursor: 'pointer',
                    background: on ? 'rgba(200,120,60,0.14)' : '#ffffff',
                    // ★2026-08-01 (43부 6차) — 고르지 않은 칩의 테두리를 «보이게» 했습니다.
                    //   투명도 0.10 이면 크림색 바탕에서 «테두리가 없어 보입니다».
                    border: '1px solid ' + (on ? GOLD : '#e5d3c2'),
                    boxShadow: on ? 'none' : '0 1px 3px rgba(0,0,0,0.04)' }}>
                  {/* 🔴★2026-08-01 (43부 6차) — 글자가 «흰색» 이라 안 보였습니다.
                      color: on ? GOLD : '#fff' 였는데 바탕도 크림색(#FFFBF7)이라
                      고르지 않은 이름 두 개가 «통째로 사라져» 보였습니다.
                      ⚠️ 비교하라고 만든 자리인데 «비교할 것이 안 보였습니다». */}
                  <span style={{ fontSize: 14, fontWeight: 700, color: on ? '#8f3d0e' : '#3a2e28' }}>
                    {t.chars.map((c) => c.hanja).join('')}
                  </span>
                  {/* ★한글도 함께 — 한자만 보고는 어느 이름인지 알기 어렵습니다 */}
                  <span style={{ fontSize: 10.5, color: '#8a7063', marginLeft: 5 }}>
                    {t.chars.map((c) => c.hangul).join('')}
                  </span>
                  {g && <span style={{ fontSize: 11, color: gradeColor(g), marginLeft: 6, fontWeight: 600 }}>{g}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ★옛 손님이 이미 쌓아 둔 이름이 있으면 «어디서 보는지» 알려 드립니다.
          ⚠️ 말없이 감추면 「내가 지은 이름 어디 갔지」가 됩니다. */}
      {isSingleName && keepPastTries(tries) > 0 && (
        <button
          onClick={() => router.push('/manseryeok/naming/diagnosis/storage?mode=naming')}
          style={{
            width: '100%', marginBottom: 14, padding: '11px 12px', borderRadius: 12,
            background: CARD, border: `1px solid ${LINE}`, color: '#6b5340',
            fontSize: 11.5, cursor: 'pointer', lineHeight: 1.6, textAlign: 'center',
          }}>
          전에 지으신 이름 {keepPastTries(tries)}개는 작명 보관함에 있어요 →
        </button>
      )}

      {/* ★2026-08-01 (Phase 1-C) — 감정과 «같은» 결과 프레임을 씁니다.
          [무엇이 고쳐졌나]  전에는 옛 «종합» 필드를 봤는데 API 가 그 필드를
            «주지 않아» 조건이 늘 거짓이었습니다. 손님은 통변을 불러도
            「불러오기 버튼」만 계속 봤습니다. */}
      {cur.commentary && cur.commentary.yinyang?.meaning ? (
        <NameAnalysisResultView
          hanjaName={fullName}
          hangulName={hangulName}
          subtitle={namingKind === '신생아' ? '아기에게 지어 드린 이름' : '새로 지은 이름'}
          badge={{ kind: namingKind }}
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
            <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: '16px', textAlign: 'center' }}>
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

      {/* ══════════════════════════════════════════════════════════
          ★2026-08-01 (43부 5차) — A4 작명서 (대표님 지시)
            ⚠️ 통변(맺음말)이 아직 없으면 «작명서에 빈칸» 이 나갑니다.
               그래서 풀이를 부르기 전에는 눌리지 않게 두었습니다.
            ⚠️ 판정을 여기서 다시 하지 않습니다 — result 가 낸 것을 그대로 싣습니다.
          ══════════════════════════════════════════════════════════ */}
      {cur && result && (
        <NamingCertificateButton
          disabled={!cur.commentary?.yinyang?.meaning}
          kind={namingKind}
          hangulName={hangulName}
          hanjaName={fullName}
          chars={cur.chars.map((c, i): CertChar => ({
            hangul: c.hangul, hanja: c.hanja,
            strokes: c.strokes, resourceOhaeng: c.resourceOhaeng,
            // ★성·이름 가르기는 저장된 chars 의 앞부분이 성입니다 (복성은 두 글자)
            role: i < cur.chars.length - (cur.chars.length >= 3 ? 2 : 1) ? '성' : '이름',
          }))}
          saju={saju.map(x => ({ pillar: x.pillar, stem: x.stem, branch: x.branch }))}
          birthText={info
            ? `${info.calType} ${info.year}년 ${info.month}월 ${info.day}일`
              + (info.hourIdx == null ? ' (시 모름)' : '')
            : '—'}
          yongsin={yongsin}
          lines={[
            ['음양', result.yinYang.grade],
            ['발음오행', result.soundFlow.grade],
            ['수리 4격', result.suri.grade],
            ['자원오행', result.resourceFlow.grade],
            // ★[내이름 감정] 과 «같은 다섯 관점» 입니다 — 하나도 빠뜨리지 않습니다
            ['사주와의 만남', result.yongsinBohwan.grade],
          ]}
          conclusion={cur.commentary?.conclusion || ''}
          issuedAt={(() => {
            const d = new Date()
            return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
          })()}
        />
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
            {/* ★2026-08-01 (43부 5차) — 보관함으로 «가는 버튼» 을 함께 둡니다.
                ⚠️ 「저장됐어요」 만 있고 갈 길이 없어, 어디서 다시 보는지 알 수 없었습니다.
                   ★작명 기록이므로 «작명 보관함» 으로 보냅니다 (mode=naming). */}
            <button
              onClick={() => router.push('/manseryeok/naming/diagnosis/storage?mode=naming')}
              className="active:scale-95"
              style={{ width: '100%', padding: 13, borderRadius: 12, marginBottom: 10,
                background: '#fffbf7', border: '1px solid #c8783c', color: '#c8783c',
                fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              📚 작명 보관함에서 보기 →
            </button>
          </>
        ) : null
      )}

      {/* 전문가 상담 연결 (개명 상담 · mode=naming) — 저장 표시 아래.
          관리자 > 가격 관리에서 '노출'을 끄면 이 영역이 통째로 사라진다. */}
      <div style={{ marginBottom: 14 }}>
        <ConsultButton priceKey="naming" mode="naming" />
      </div>

      {/* ══════════════════════════════════════════════════════════
          ★2026-08-01 (43부 6차) — 회차 안내도 배선을 끊었습니다.
            「한 번에 하나」 라 «남은 횟수» 라는 것이 없습니다.
          ⚠️ 다만 «다른 이름을 지을 길» 은 반드시 남겨 둡니다.
             길이 없으면 손님이 화면에 갇힙니다.
          ══════════════════════════════════════════════════════════ */}
      {isSingleName ? (
        <>
          <div style={{ fontSize: 11, color: SUB, textAlign: 'center', margin: '20px 0 8px', lineHeight: 1.7 }}>
            다른 이름도 지어 보시겠어요?<br />
            <span style={{ color: '#a8927e' }}>이름 하나마다 따로 풀이해 드립니다.</span>
          </div>
          <button onClick={() => router.push('/manseryeok/naming/rename/newname')} className="active:scale-95"
            style={{ width: '100%', background: 'rgba(200,120,60,0.12)', border: '1px solid ' + GOLD, borderRadius: 14, padding: 13, color: GOLD, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            새 이름 지으러 가기 →
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 11, color: SUB, textAlign: 'center', margin: '20px 0 8px' }}>
            총 {TRY_LIMIT}회까지 종합 해설이 가능합니다 · 남은 횟수 {triesLeft > 0 ? triesLeft : 0}회
          </div>
          {triesLeft > 0 ? (
            <button onClick={() => router.push('/manseryeok/naming/rename/newname')} className="active:scale-95"
              style={{ width: '100%', background: 'rgba(200,120,60,0.12)', border: '1px solid ' + GOLD, borderRadius: 14, padding: 13, color: GOLD, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              다른 이름 또 지어보기 →
            </button>
          ) : (
            <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: '13px 16px', fontSize: 12, color: SUB, lineHeight: 1.7, textAlign: 'center' }}>
              {TRY_LIMIT}회를 모두 사용했어요.<br />지금까지 지어본 이름 중에서 골라보세요.
            </div>
          )}
        </>
      )}
    </main>
  )
}

function Header({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px',
      background: 'rgba(245,233,222,0.96)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${LINE}`,
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
    <Suspense fallback={<div style={{ background: BG, minHeight: '100vh' }} />}>
      <NewResultInner />
    </Suspense>
  )
}
