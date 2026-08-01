'use client'
import { useState, useEffect, useRef, Suspense, CSSProperties } from 'react'
import { splitSurname, surnameOfHangul } from '@/lib/saju/surname'
// ★2026-08-01 (43부 8차) — 「한 번에 이름 하나」 정책.
//   🔴 6차에 여기를 «빠뜨렸습니다». 결제 팝업이 여전히 「3개의 이름을 지어보고」 라고
//      말하고 있었습니다. 한도를 쓰는 곳은 «모두» 정책을 지나야 합니다.
import { clampTryLimit, isSingleName } from '@/lib/saju/namingPolicy'
import { useRouter, useSearchParams } from 'next/navigation'
// ★2026-08-01 (43부) — 작명 «대상» 을 Step 3·4 까지 잃지 않고 나릅니다 (결함 ①②③④)
import {
  loadNamingTarget, saveNamingTarget, namingTargetQuery, guessKind, hasSaju,
  type NamingTarget, type NamingKindLite,
} from '@/lib/saju/namingSession'
import { supabase } from '@/lib/supabase'
import { fromMyInfo, fromProfile, personKey } from '@/lib/saju/myInfo'
// ★2026-08-01 (Step 2) — 추천·사전에서 고르기
import NamePicker from '@/app/manseryeok/naming/components/NamePicker'
import type { NameStyle } from '@/lib/saju/nameRecommend'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsinCompat } from '@/lib/saju/yongsinNew'
import { ohaengOrEmpty } from '@/lib/saju/ohaeng'

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
//     바탕  #F4F2EF   ← ★7차: 베이지를 버린 «오프화이트». 흰 카드와 확실히 갈립니다
//     카드  #FFFFFF   ← 흰색. 바탕과 확실히 갈립니다
//     테두리 #DFD9D2  ← 실제로 «보이는» 선 (+ 카드에 옅은 그림자)
//     고름  GOLD 테두리 + 옅은 금빛 바탕
//
//   ⚠️ 글자색은 건드리지 않았습니다 — 바탕이 더 밝아졌으므로 대비는 «좋아지기만» 합니다.
//   ⚠️ 어두운 테마 화면(rename/hanja · rename/result)은 «손대지 않았습니다».
//      거기서는 흰 글씨가 «맞습니다». 같이 바꾸면 그 화면이 통째로 안 보입니다.
// ══════════════════════════════════════════════════════════════════
const CARD = '#FFFFFF'
/** ★보이는 테두리 — 이 파일에서 «선» 은 전부 이 값을 쓰십시오 */
const LINE = '#DFD9D2'
/** 바탕 — 카드가 떠 보이도록 한 단 낮춥니다 */
const BG = '#F4F2EF'
/** ★7차 — 안내 글자를 «짙게». #b4785a 는 흰 카드 위에서 흐렸습니다 */
const SUB = '#6B5B50'
/** 본문 글자 — 검정 대신 짙은 갈회색 */
const INK = '#2E2622'
/** 카드 그림자 — 테두리만으로 부족한 자리에 */
const SHADOW = '0 1px 3px rgba(46,38,34,0.06)'

const MY_INFO_KEY = 'myinfo'
const NAMING_RESULT_KEY = 'naming_last_result_v1'
const NAMING_PASS_KEY = 'naming_pass_v1'   // 개명 이용권 { userId, remaining }
const DEFAULT_TRY_LIMIT = clampTryLimit(3)

interface SavedChar {
  hangul: string
  hanja: string
  strokes: number
  resourceOhaeng: string
}

// 한글 음절 한 글자만 남기기 (조합 완료 후 정리용)
function firstHangul(s: string): string {
  const arr = Array.from(s)
  for (const ch of arr) {
    const code = ch.charCodeAt(0)
    if (code >= 0xac00 && code <= 0xd7a3) return ch
  }
  // 완성형 한글이 아직 없으면(조합 중) 원본 마지막 글자 유지
  return arr.length > 0 ? arr[arr.length - 1] : ''
}

function NewNameInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [count, setCount] = useState<1 | 2 | null>(null)
  const [c1, setC1] = useState('')
  const [c2, setC2] = useState('')

  // 한글 조합(IME) 진행 상태 — 조합 중에는 값을 자르지 않는다
  const composing1 = useRef(false)
  const composing2 = useRef(false)

  // ★2026-07-31 복성 — 성이 두 글자일 수 있습니다.
  //   예전에는 남궁민수가 성「남」 + 이름「궁·민」 으로 채워져 «수» 가 사라졌습니다.
  const [surnameChars, setSurnameChars] = useState<SavedChar[]>([])
  /**
   * 화면에 보일 성씨 — 복성이면 두 글자를 붙입니다.
   *
   * ★2026-08-01 — «저장된 이름이 없을 때» 를 받쳐 줍니다 (대표님 지시)
   *   [왜]  신생아 작명은 «아직 이름이 없습니다». chars 가 비어 있습니다.
   *         그러면 성씨도 비어 추천이 «한 개도» 안 나옵니다.
   *   ★그래서 앞 화면에서 실어 온 성씨(URL) 를 «받쳐» 씁니다.
   *     저장된 이름이 있으면 그쪽이 먼저입니다 — 개명은 성씨가 이미 정해져 있으니까요.
   */
  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 (43부) 결함 ② — 이 값이 «한 번도 쓰이지 않았습니다»
  //
  //   [무엇이 있었나]
  //     surnameHangul = chars.join('') || surnameFromUrl 이었는데
  //       · chars 가 있으면 앞이 이기고
  //       · chars 가 없으면 아래 313행 관문에서 «이미 막혔습니다»
  //     → 42부에 넣은 «URL 성씨 받치기» 가 구조상 도달 불가였습니다.
  //
  //   ⚠️ 앞 두 글자를 그냥 자르면 안 됩니다 — 보관함은 「류 첫째」를,
  //      개명은 「김철수」를 name 으로 실어 보냅니다.
  //      ★성 분리는 surname.ts 한 곳만 씁니다 (교훈 CJ).
  // ══════════════════════════════════════════════════════════════
  //   ⚠️ 세션(부본)도 봅니다 — Step 3 에서 «뒤로» 로 돌아오면 URL 이 빕니다.
  //      그때 성씨가 사라지면 손님이 처음부터 다시 해야 합니다.
  const [sess, setSess] = useState<NamingTarget | null>(null)

  const surnameFromUrl = (() => {
    const s = (sp?.get('surname') || '').trim()
    if (s) return surnameOfHangul(s)
    const fromName = surnameOfHangul(sp?.get('name') || '')
    if (fromName) return fromName
    return sess?.surnameHangul ?? ''
  })()
  /**
   * ★2026-08-01 (43부) — URL 이 성씨를 «또박또박» 준 경우 그것이 «먼저» 입니다.
   *
   *   [왜]  아래 surnameChars 는 my_names 의 «내 가장 최근 이름풀이» 입니다.
   *     아기 이름을 지으러 온 부모에게도 그 값이 있습니다.
   *     ⚠️ 그것을 먼저 쓰면 「류 아기」를 지으러 왔는데 «부모 성씨·부모 이름» 이 나옵니다.
   *     ★앞 화면이 성씨를 명시했으면 그 사람의 것입니다.
   */
  const explicitSurname = surnameOfHangul(sp?.get('surname') || '')
  const loadedSurnameHangul = surnameChars.map(c => c.hangul).join('')
  const surnameHangul = explicitSurname || loadedSurnameHangul || surnameFromUrl
  // ⚠️ 한자 성씨는 «불러온 것이 이 성씨일 때만» 씁니다. 아니면 Step 3 에서 고릅니다.
  const surnameHanja = loadedSurnameHangul === surnameHangul
    ? surnameChars.map(c => c.hanja).join('')
    : ''
  const [loaded, setLoaded] = useState(false)

  /**
   * ★결함 ③ — 개명인가 신생아인가.
   *   URL 이 «먼저» 이고, 없으면 chars 유무로 가늠합니다.
   *   chars 있음 → 개명 (성씨가 이미 정해져 있습니다)
   *   chars 없음 → 신생아 (아직 이름이 없습니다)
   */
  const kind: NamingKindLite =
    sp?.get('kind') === '신생아' ? '신생아'
      : sp?.get('kind') === '개명' ? '개명'
        // ⚠️ chars 가 «이 성씨의» 것일 때만 개명으로 봅니다.
        //    부모의 이름 기록을 보고 아기 작명을 개명으로 오해하지 않도록.
        : sess?.kind ?? guessKind(surnameHanja.length > 0)
  const isNewborn = kind === '신생아'

  // ── 이용권/결제 ──
  const [uid, setUid] = useState('')
  const [hanjaPrice, setHanjaPrice] = useState(20000)   // 한자바꾸기(개명) 가격
  const [tryLimit, setTryLimit] = useState(DEFAULT_TRY_LIMIT)  // 결제 1회당 조회 횟수
  const [payOpen, setPayOpen] = useState(false)
  const [pendingName, setPendingName] = useState('')    // 결제 후 이동할 이름

  useEffect(() => {
    supabase.from('analysis_prices').select('price').eq('price_key', 'naming_hanja').maybeSingle()
      .then(({ data }) => { if (data) setHanjaPrice(data.price) })
    supabase.from('app_settings').select('value').eq('key', 'naming_try_limit').maybeSingle()
      // ⚠️ 관리자 설정 값도 «정책을 지나» 옵니다 — 설정으로 3개가 되살아나지 않습니다
      .then(({ data }) => { if (data && typeof data.value === 'number') setTryLimit(clampTryLimit(data.value)) })
    supabase.auth.getUser().then(({ data }) => { if (data?.user) setUid(data.user.id) })
  }, [])

  // 현재 남은 조회 횟수 읽기 (이 user의 이용권)
  function readRemaining(): number {
    try {
      const p = JSON.parse(localStorage.getItem(NAMING_PASS_KEY) || '{}')
      if (p.userId === uid && typeof p.remaining === 'number') return p.remaining
    } catch {}
    return 0
  }

  useEffect(() => {
    let cancelled = false

    // ★ 저장된 이름 전체(chars)에서 성씨 + 이름 한글을 채운다
    //   개명은 발음(한글)은 그대로 두고 한자만 바꾸는 것이므로,
    //   원래 이름의 한글을 미리 채워 보여준다. (사용자가 지우고 새로 쓸 수도 있음)
    function fillFromChars(chars: SavedChar[]) {
      if (!Array.isArray(chars) || !chars[0]) return false
      // ★가르는 것은 splitSurname 하나뿐입니다 (복성이면 앞 두 글자가 성)
      const sp = splitSurname(chars)
      setSurnameChars(sp.surname)
      const given = sp.given.filter(Boolean)
      if (given.length === 1) {
        setCount(1)
        setC1(given[0].hangul || '')
      } else if (given.length >= 2) {
        setCount(2)
        setC1(given[0].hangul || '')
        setC2(given[1].hangul || '')
      }
      return true
    }

    async function load() {
      // ★세션(부본)을 먼저 집어 둡니다 — 뒤로가기로 돌아온 손님을 받쳐 줍니다
      const t = loadNamingTarget()
      if (!cancelled && t) setSess(t)

      // 1) 로그인했으면 내 계정(my_names)에서 가장 최근 이름풀이 전체를 불러와 채움
      try {
        const { data: u } = await supabase.auth.getUser()
        if (u?.user) {
          const { data: rows } = await supabase
            .from('my_names')
            .select('chars')
            .eq('user_id', u.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
          if (!cancelled && rows && rows[0] && Array.isArray(rows[0].chars) && rows[0].chars[0]) {
            fillFromChars(rows[0].chars as SavedChar[])
            setLoaded(true)
            return
          }
        }
      } catch {}

      // 2) (비로그인/없을 때) 기존 localStorage 방식 — 이름풀이 결과 전체
      //    personKey는 표준 헬퍼로 계산 (과거 '-1' 값도 '모름'으로 흡수)
      try {
        const m = JSON.parse(localStorage.getItem(MY_INFO_KEY) || '{}')
        const pk = personKey(fromMyInfo(m))

        const r = JSON.parse(localStorage.getItem(NAMING_RESULT_KEY) || '{}')
        const samePerson = r.personKey && r.personKey === pk
        if (samePerson && Array.isArray(r.chars) && r.chars[0]) {
          if (!cancelled) { fillFromChars(r.chars as SavedChar[]); setLoaded(true) }
          return
        }
      } catch {}

      if (!cancelled) setLoaded(true)
    }

    load()
    return () => { cancelled = true }
  }, [])

  function chooseCount(n: 1 | 2) {
    setCount(n)
    setC1('')
    setC2('')
  }

  // 조합 중에는 입력 그대로 두고, 조합이 끝나거나(완성형) 비조합 입력이면 한 글자로 정리
  function handleChange(
    raw: string,
    composingRef: React.MutableRefObject<boolean>,
    setter: (v: string) => void,
  ) {
    if (composingRef.current) {
      setter(raw)
      return
    }
    setter(firstHangul(raw))
  }

  function handleCompositionEnd(
    raw: string,
    composingRef: React.MutableRefObject<boolean>,
    setter: (v: string) => void,
  ) {
    composingRef.current = false
    setter(firstHangul(raw))
  }

  // ★2026-08-01 (43부) — «한글» 성씨만 있으면 됩니다.
  //   전에는 !!surname(= 저장된 한자 성씨)을 봤습니다. 신생아는 그것이 «없습니다».
  const ready =
    surnameHangul.length > 0 &&
    count !== null &&
    firstHangul(c1).trim().length > 0 &&
    (count === 1 || firstHangul(c2).trim().length > 0)

  const proceed = () => {
    if (!ready) return
    const a = firstHangul(c1)
    const b = firstHangul(c2)
    const name = count === 1 ? a : a + b
    // 남은 조회 횟수가 있으면 바로 진입, 없으면 결제 팝업
    if (readRemaining() > 0) {
      goHanja(name)
    } else {
      setPendingName(name)
      setPayOpen(true)
    }
  }

  // 결제(지금은 실제 PG 없이 통과) → 이용권 충전 후 진입
  // ★ 나중에 실제 결제 붙일 때 이 함수 안 "결제 통과" 자리에 PG 호출을 넣으면 됨
  function payAndProceed() {
    try {
      localStorage.setItem(NAMING_PASS_KEY, JSON.stringify({ userId: uid, remaining: tryLimit }))
      // 결제하면 새 이용권이므로 지난 시도기록 초기화
      localStorage.removeItem('newname_history_v1')
    } catch {}
    setPayOpen(false)
    goHanja(pendingName)
  }

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 (Phase 2-B) — 갈림길 화면(start)에서 실어 온 «작명 옵션»
  //
  //   kind(신생아·개명) · style · prefer · avoid
  //   ⚠️ 여기서 «쓰지는 않습니다». 다음 화면까지 «잃지 않고» 나르는 것이 일입니다.
  //      실제로 쓰는 곳은 Step 2 추천 화면입니다.
  //   ⚠️ style·prefer·avoid 는 «교재 밖 취향» 입니다. 길흉 판정에 쓰지 마십시오.
  // ══════════════════════════════════════════════════════════════
  //   ★2026-08-01 (43부) 결함 ③④ — 여기서 나르는 것이 «옵션» 만이 아니게 되었습니다.
  //     전에는 kind·style·prefer·avoid·relation 다섯 개만 실었고,
  //       · kind 는 newhanja 가 «읽지도 넘기지도» 않아 거기서 끊겼고 (③)
  //       · 사주는 아예 «안 실어» Step 3 이 내 myinfo 로 돌아갔습니다 (④)
  //     ★이제 성씨·사주·kind 까지 한 덩이(NamingTarget)로 나릅니다.
  //     아래 target / withOpts / goHanja 를 보십시오.

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 (Step 2) — 추천에 쓸 «용신» 을 여기서 구합니다
  //
  //   ⚠️ 이 화면은 전에 사주를 «안 봤습니다» — 손님이 이름을 직접 쳤으니까요.
  //      추천을 하려면 사주가 있어야 합니다. myinfo(또는 URL)에서 읽어 냅니다.
  //   ⚠️ 용신을 못 구해도 «멈추지 않습니다». 그때는 발음오행만으로 줄 세웁니다.
  // ══════════════════════════════════════════════════════════════
  //   ★2026-08-01 (43부) — from 을 함께 돌려줍니다.
  //     'url' 이면 «보관함에서 고른 그 사람» 이고, 'me' 면 로그인한 나입니다.
  //     ⚠️ 이 구분이 있어야 Step 3·4 에 «누구 사주를» 넘기는지가 또렷해집니다.
  const infoForSaju = (() => {
    const q = (k: string) => sp?.get(k)
    if (q('year')) {
      return {
        from: 'url' as const,
        calType: q('calType') || '양력',
        year: Number(q('year')), month: Number(q('month') || 1), day: Number(q('day') || 1),
        leapMonth: q('leapMonth') || '0',
        hourIdx: q('hour') && q('hour') !== '모름' ? Number(q('hour')) : null,
        gender: q('gender') || null,
      }
    }
    // ★세션(부본) — 뒤로가기로 돌아왔을 때 «그 사람» 사주를 지킵니다
    if (hasSaju(sess)) {
      return {
        from: 'url' as const,
        calType: sess!.calType, year: sess!.year, month: sess!.month, day: sess!.day,
        leapMonth: sess!.leapMonth, hourIdx: sess!.hourIdx, gender: sess!.gender,
      }
    }
    try {
      const m = JSON.parse(localStorage.getItem(MY_INFO_KEY) || '{}')
      return {
        from: 'me' as const,
        calType: m.calType || '양력',
        year: Number(m.year) || 0, month: Number(m.month) || 1, day: Number(m.day) || 1,
        leapMonth: m.leapMonth || '0',
        hourIdx: m.hour != null && m.hour !== '모름' ? Number(m.hour) : null,
        gender: m.gender || null,
      }
    } catch {
      return {
        from: 'me' as const, calType: '양력', year: 0, month: 1, day: 1,
        leapMonth: '0', hourIdx: null, gender: null,
      }
    }
  })()

  const { saju, solar, dayStem } = useResultSaju(
    infoForSaju.calType, infoForSaju.year, infoForSaju.month,
    infoForSaju.day, infoForSaju.leapMonth, infoForSaju.hourIdx,
  )

  const yongsin = (() => {
    if (!saju.length || !dayStem) return ''
    try {
      return ohaengOrEmpty(calcYongsinCompat(
        saju, dayStem, solar?.month, solar?.day,
        saju.find(x => x.pillar === '시주')?.branch ?? null,
      ).yongsin)
    } catch { return '' }
  })()

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 (43부) — 작명 «대상» 한 덩이 (결함 ③④를 여기서 막습니다)
  //
  //   ⚠️ 성씨·사주·kind 가 «따로» 흘러 다니면 한 군데만 빠져도
  //      Step 3 이 조용히 내 사주로 돌아갑니다. 그것이 ④였습니다.
  //      → 한 덩이로 묶어 «통째로» 넘깁니다.
  // ══════════════════════════════════════════════════════════════
  const target: NamingTarget = {
    kind,
    surnameHangul,
    // ★신생아는 한자 성씨가 «없습니다». Step 3 에서 성씨 한자부터 고릅니다.
    surnameHanja: surnameHanja || null,
    calType: infoForSaju.calType,
    year: infoForSaju.year,
    month: infoForSaju.month,
    day: infoForSaju.day,
    leapMonth: infoForSaju.leapMonth,
    hourIdx: infoForSaju.hourIdx,
    gender: infoForSaju.gender,
    relation: sp?.get('relation') ?? null,
    personTitle: sp?.get('name') ?? null,
    style: sp?.get('style') ?? null,
    prefer: sp?.get('prefer') ?? null,
    avoid: sp?.get('avoid') ?? null,
  }

  /** ★Step 3 로 가는 «단 하나» 의 문. URL(정본) + 세션(부본) 둘 다에 실어 보냅니다 */
  function goHanja(n: string) {
    saveNamingTarget(target)
    router.push(withOpts('/manseryeok/naming/rename/newhanja?name=' + encodeURIComponent(n)))
  }

  const withOpts = (base: string) => {
    const q = namingTargetQuery(target)
    return q ? `${base}&${q}` : base
  }

  /**
   * ★2026-08-01 (Step 2) — 추천·사전에서 고른 이름으로 바로 넘어갑니다.
   *   ⚠️ 직접 쓰기와 «같은 길» 을 씁니다 — 이용권 차감·결제 흐름이 갈리면 안 됩니다.
   */
  function pickName(name: string) {
    const n = name.trim()
    if (!n) return
    if (readRemaining() > 0) {
      goHanja(n)
    } else {
      setPendingName(n)
      setPayOpen(true)
    }
  }

  const inputStyle: CSSProperties = {
    width: 48, height: 46, textAlign: 'center', fontSize: 18,
    borderRadius: 10, border: '1px solid ' + GOLD,
    background: 'rgba(200,120,60,0.07)', color: INK,
  }

  const chip = (n: 1 | 2, label: string) => {
    const on = count === n
    return (
      <button onClick={() => chooseCount(n)} className="active:scale-95"
        style={{ flex: 1, padding: '12px 0', borderRadius: 12, cursor: 'pointer',
          background: on ? 'rgba(200,120,60,0.12)' : CARD,
          border: '1px solid ' + (on ? GOLD : LINE),
          color: on ? GOLD : '#cfcdc4', fontWeight: 700, fontSize: 14 }}>
        {label}
      </button>
    )
  }

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 (43부) 결함 ① — 여기가 «신생아를 막던» 자리입니다
  //
  //   [무엇이 있었나]  조건이 `!surname` 이었습니다.
  //     surname 은 «저장된 이름(chars)의 첫 글자» 입니다.
  //     ⚠️ 신생아는 이름이 «없어서» 오는 손님입니다. chars 가 없습니다.
  //     → 성씨를 또박또박 적고 들어와도 「먼저 이름 풀이에서 시작해 주세요」를 봤습니다.
  //       작명 입구를 만들어 놓고 작명을 막고 있었습니다.
  //
  //   [이제]  «한글 성씨 한 글자» 만 있으면 들여보냅니다.
  //     한자 성씨는 Step 3 에서 고릅니다 — 그것이 신생아의 정상 순서입니다.
  //   ⚠️ 성씨조차 없을 때만 막습니다. 그때는 어디로 가야 하는지도 알려 줍니다.
  // ══════════════════════════════════════════════════════════════
  if (loaded && !surnameHangul) {
    return (
      <main style={{ minHeight: '100vh', background: BG, maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
        <Header router={router} isNewborn={isNewborn} />
        <div style={{ padding: '40px 8px', textAlign: 'center', color: SUB, lineHeight: 1.8 }}>
          성씨를 먼저 알려 주세요.
          <div style={{ fontSize: 12, marginTop: 8, color: '#a8927e' }}>
            보관함에서 <b>[+ 새 이름 짓기]</b> 를 누르시면
            <br />성씨와 생년월일을 받아 이리로 모셔 옵니다.
          </div>
          <div style={{ marginTop: 20 }}>
            <button onClick={() => router.push(isNewborn ? '/manseryeok/naming/naming-storage' : '/manseryeok/naming/diagnosis/storage?mode=diagnosis')}
              style={{ padding: '12px 22px', borderRadius: 12, background: 'rgba(200,120,60,0.12)', border: '1px solid ' + GOLD, color: GOLD, fontWeight: 700, cursor: 'pointer' }}>
              {isNewborn ? '작명 보관함으로 가기 →' : '이름 보관함으로 가기 →'}
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!loaded) return <main style={{ minHeight: '100vh', background: BG }} />

  return (
    <main style={{ minHeight: '100vh', background: BG, maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <Header router={router} isNewborn={isNewborn} />
      {/* ★2026-08-01 (43부) — 신생아와 개명은 «하는 일이 다릅니다». 문구를 갈랐습니다.
          개명  : 발음은 그대로 두고 한자만 바꿉니다
          신생아: 한글 이름부터 짓고, 한자는 다음 걸음에서 고릅니다 */}
      <p style={{ fontSize: 12, color: SUB, margin: '0 0 16px', padding: '0 4px', lineHeight: 1.7 }}>
        {isNewborn
          ? <><b style={{ color: '#8f3d0e' }}>{surnameHangul}</b> 씨 아기의 이름을 지어 드립니다 · 한자는 다음 걸음에서 골라요</>
          : <>성씨 {surnameHanja}({surnameHangul})는 그대로 · 발음은 두고 한자만 바꿔드려요</>}
      </p>

      {/* ★2026-08-01 (Step 2) — 세 갈래로 고릅니다.
          추천받기 · 교재 사전에서 고르기 · 직접 쓰기(전에 하던 그대로) */}
      <NamePicker
        surname={surnameHangul}
        yongsin={(yongsin || null) as never}
        style={(sp?.get('style') as NameStyle | null) ?? null}
        prefer={sp?.get('prefer') ?? ''}
        avoid={sp?.get('avoid') ?? ''}
        onPick={pickName}
        manual={<>
      <div style={{ fontSize: 12, color: SUB, marginBottom: 8, padding: '0 4px' }}>이름 글자 수</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {chip(1, '외자 (한 글자)')}
        {chip(2, '두 글자')}
      </div>

      {count !== null && (
        <>
          <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: '18px 16px' }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
              {/* ★2026-08-01 (43부) — 신생아는 한자 성씨가 «아직 없습니다». 한글로 보여 줍니다 */}
              <span style={{ fontSize: 22, color: SUB }}>{surnameHanja || surnameHangul}</span>
              <input
                value={c1}
                maxLength={2}
                inputMode="text"
                onCompositionStart={() => { composing1.current = true }}
                onCompositionEnd={(e) => handleCompositionEnd(e.currentTarget.value, composing1, setC1)}
                onChange={(e) => handleChange(e.target.value, composing1, setC1)}
                placeholder="서"
                style={inputStyle}
              />
              {count === 2 && (
                <input
                  value={c2}
                  maxLength={2}
                  inputMode="text"
                  onCompositionStart={() => { composing2.current = true }}
                  onCompositionEnd={(e) => handleCompositionEnd(e.currentTarget.value, composing2, setC2)}
                  onChange={(e) => handleChange(e.target.value, composing2, setC2)}
                  placeholder="연"
                  style={inputStyle}
                />
              )}
            </div>
            <div style={{ fontSize: 11, color: SUB, textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
              {isNewborn
                ? '부르고 싶은 한글 이름을 적어 주세요. 한자는 다음 걸음에서 골라 드려요.'
                : '원래 이름이 채워져 있어요. 그대로 두면 발음은 유지하고 한자만 바꿔드려요.'}
            </div>
          </div>
          <button onClick={proceed} disabled={!ready} className="active:scale-95"
            style={{ marginTop: 16, width: '100%', background: ready ? 'rgba(200,120,60,0.12)' : CARD,
              border: '1px solid ' + (ready ? GOLD : 'rgba(200,120,60,0.10)'), borderRadius: 14, padding: 14,
              color: ready ? GOLD : '#555', fontWeight: 700, fontSize: 14, cursor: ready ? 'pointer' : 'default' }}>
            한자 추천받기 {'\u2192'}
          </button>
        </>
      )}
        </>}
      />

      {/* ★ 개명 이용권 결제 팝업 (선결제 → tryLimit회 조회) */}
      {payOpen && (
        <div onClick={() => setPayOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 360, background: '#fffbf7', borderRadius: 18, padding: '24px 20px', boxShadow: '0 16px 40px rgba(90,50,30,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✍️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginBottom: 6 }}>이름 지어보기 이용권</div>
            {/* ★2026-08-01 (43부 8차) — 「한 번에 하나」면 «개수를 말하지 않습니다».
                ⚠️ 「3개」라고 해 놓고 하나만 주면 그것은 «약속을 어기는» 것입니다. */}
            <div style={{ fontSize: 13, color: SUB, marginBottom: 16, lineHeight: 1.7 }}>
              {isSingleName ? (
                <>결제하시면 사주에 맞는 한자로<br />
                  <b style={{ color: GOLD }}>이름 하나</b>를 지어 드리고<br />
                  상세 풀이까지 확인하실 수 있어요.</>
              ) : (
                <>결제하시면 사주에 맞는 한자로<br />
                  <b style={{ color: GOLD }}>{tryLimit}개</b>의 이름을 지어보고<br />
                  상세 풀이까지 확인하실 수 있어요.</>
              )}
            </div>
            <div style={{ background: CARD, borderRadius: 12, padding: '14px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: SUB }}>결제 금액</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: GOLD }}>{hanjaPrice.toLocaleString()}원</span>
            </div>
            <button onClick={payAndProceed}
              style={{ width: '100%', padding: 15, borderRadius: 12, background: '#c8783c', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
              💳 {hanjaPrice.toLocaleString()}원 결제하고 시작하기
            </button>
            <button onClick={() => setPayOpen(false)}
              style={{ width: '100%', padding: 12, borderRadius: 12, background: 'transparent', border: `1px solid ${LINE}`, color: SUB, fontSize: 13, cursor: 'pointer' }}>
              다음에 할게요
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function Header({ router, isNewborn }: {
  router: ReturnType<typeof useRouter>
  isNewborn?: boolean
}) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px',
      background: 'rgba(244,242,239,0.96)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${LINE}`,
    }}>
      {/* ★2026-08-01 (43부) — 신생아는 «이름 풀이» 를 한 적이 없습니다.
          그 화면으로 되돌리면 갈 곳이 없어 보입니다. 보관함으로 보냅니다. */}
      <button
        onClick={() => router.push(isNewborn
          // ★2026-08-01 (43부 9차) — 신생아는 «작명 보관함» 으로 돌아갑니다
          ? '/manseryeok/naming/naming-storage'
          : '/manseryeok/naming/diagnosis')}
        aria-label="뒤로" style={{ background: 'none', border: 'none', color: '#999', fontSize: 20, cursor: 'pointer', padding: 0 }}>{'\u2039'}</button>
      <span style={{ fontSize: 15, fontWeight: 500, color: INK }}>
        {isNewborn ? '아기 이름 짓기' : '발음 그대로, 한자 바꾸기'}
      </span>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 — Suspense 로 감쌌습니다.
//
//   [무슨 일이 있었나]
//     Step 2 를 붙이며 이 화면에 useSearchParams() 를 더했습니다.
//     Next.js 는 «정적으로 그리는» 페이지에서 그 훅을 쓰면
//     Suspense 경계를 요구합니다 — 없으면 «빌드가 실패» 합니다.
//
//     ⚠️ npm run verify 로는 못 잡습니다. Next 빌드를 안 하기 때문입니다.
//        ★배포 로그에서야 드러났습니다:
//          「useSearchParams() should be wrapped in a suspense boundary」
//
//   ⚠️ useSearchParams() 를 쓰는 화면은 «반드시» 이렇게 감싸십시오.
//      같은 폴더의 start/page.tsx 도 같은 꼴입니다.
// ══════════════════════════════════════════════════════════════════
export default function NewNamePage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: BG }} />}>
      <NewNameInner />
    </Suspense>
  )
}
