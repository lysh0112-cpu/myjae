'use client'
import { useState, useEffect, useRef, CSSProperties } from 'react'
import { splitSurname } from '@/lib/saju/surname'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fromMyInfo, fromProfile, personKey } from '@/lib/saju/myInfo'
// ★2026-08-01 (Step 2) — 추천·사전에서 고르기
import NamePicker from '@/app/manseryeok/naming/components/NamePicker'
import type { NameStyle } from '@/lib/saju/nameRecommend'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsinCompat } from '@/lib/saju/yongsinNew'
import { ohaengOrEmpty } from '@/lib/saju/ohaeng'

const GOLD = '#c8783c'
const CARD = '#fffbf7'
const SUB = '#b4785a'

const MY_INFO_KEY = 'myinfo'
const NAMING_RESULT_KEY = 'naming_last_result_v1'
const NAMING_PASS_KEY = 'naming_pass_v1'   // 개명 이용권 { userId, remaining }
const DEFAULT_TRY_LIMIT = 3

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

export default function NewNamePage() {
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
  const surname: SavedChar | null = surnameChars[0] ?? null
  /** 화면에 보일 성씨 — 복성이면 두 글자를 붙입니다 */
  const surnameHanja = surnameChars.map(c => c.hanja).join('')
  const surnameHangul = surnameChars.map(c => c.hangul).join('')
  const [loaded, setLoaded] = useState(false)

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
      .then(({ data }) => { if (data && typeof data.value === 'number') setTryLimit(data.value) })
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

  const ready =
    !!surname &&
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
      router.push(withOpts('/manseryeok/naming/rename/newhanja?name=' + encodeURIComponent(name)))
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
    router.push(withOpts('/manseryeok/naming/rename/newhanja?name=' + encodeURIComponent(pendingName)))
  }

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 (Phase 2-B) — 갈림길 화면(start)에서 실어 온 «작명 옵션»
  //
  //   kind(신생아·개명) · style · prefer · avoid
  //   ⚠️ 여기서 «쓰지는 않습니다». 다음 화면까지 «잃지 않고» 나르는 것이 일입니다.
  //      실제로 쓰는 곳은 Step 2 추천 화면입니다.
  //   ⚠️ style·prefer·avoid 는 «교재 밖 취향» 입니다. 길흉 판정에 쓰지 마십시오.
  // ══════════════════════════════════════════════════════════════
  const namingOpts = (() => {
    const q = new URLSearchParams()
    for (const k of ['kind', 'style', 'prefer', 'avoid', 'relation']) {
      const v = sp?.get(k)
      if (v) q.set(k, v)
    }
    return q.toString()
  })()
  const withOpts = (base: string) => (namingOpts ? `${base}&${namingOpts}` : base)

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 (Step 2) — 추천에 쓸 «용신» 을 여기서 구합니다
  //
  //   ⚠️ 이 화면은 전에 사주를 «안 봤습니다» — 손님이 이름을 직접 쳤으니까요.
  //      추천을 하려면 사주가 있어야 합니다. myinfo(또는 URL)에서 읽어 냅니다.
  //   ⚠️ 용신을 못 구해도 «멈추지 않습니다». 그때는 발음오행만으로 줄 세웁니다.
  // ══════════════════════════════════════════════════════════════
  const infoForSaju = (() => {
    const q = (k: string) => sp?.get(k)
    if (q('year')) {
      return {
        calType: q('calType') || '양력',
        year: Number(q('year')), month: Number(q('month') || 1), day: Number(q('day') || 1),
        leapMonth: q('leapMonth') || '0',
        hourIdx: q('hour') && q('hour') !== '모름' ? Number(q('hour')) : null,
      }
    }
    try {
      const m = JSON.parse(localStorage.getItem(MY_INFO_KEY) || '{}')
      return {
        calType: m.calType || '양력',
        year: Number(m.year) || 0, month: Number(m.month) || 1, day: Number(m.day) || 1,
        leapMonth: m.leapMonth || '0',
        hourIdx: m.hour != null && m.hour !== '모름' ? Number(m.hour) : null,
      }
    } catch { return { calType: '양력', year: 0, month: 1, day: 1, leapMonth: '0', hourIdx: null } }
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

  /**
   * ★2026-08-01 (Step 2) — 추천·사전에서 고른 이름으로 바로 넘어갑니다.
   *   ⚠️ 직접 쓰기와 «같은 길» 을 씁니다 — 이용권 차감·결제 흐름이 갈리면 안 됩니다.
   */
  function pickName(name: string) {
    const n = name.trim()
    if (!n) return
    if (readRemaining() > 0) {
      router.push(withOpts('/manseryeok/naming/rename/newhanja?name=' + encodeURIComponent(n)))
    } else {
      setPendingName(n)
      setPayOpen(true)
    }
  }

  const inputStyle: CSSProperties = {
    width: 48, height: 46, textAlign: 'center', fontSize: 18,
    borderRadius: 10, border: '1px solid ' + GOLD,
    background: 'rgba(200,120,60,0.07)', color: '#1a1a1a',
  }

  const chip = (n: 1 | 2, label: string) => {
    const on = count === n
    return (
      <button onClick={() => chooseCount(n)} className="active:scale-95"
        style={{ flex: 1, padding: '12px 0', borderRadius: 12, cursor: 'pointer',
          background: on ? 'rgba(200,120,60,0.12)' : CARD,
          border: '1px solid ' + (on ? GOLD : 'rgba(200,120,60,0.10)'),
          color: on ? GOLD : '#cfcdc4', fontWeight: 700, fontSize: 14 }}>
        {label}
      </button>
    )
  }

  if (loaded && !surname) {
    return (
      <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
        <Header router={router} />
        <div style={{ padding: '40px 8px', textAlign: 'center', color: SUB, lineHeight: 1.8 }}>
          먼저 &lsquo;내 이름 풀이&rsquo;에서 시작해 주세요.
          <div style={{ marginTop: 20 }}>
            <button onClick={() => router.push('/manseryeok/naming')}
              style={{ padding: '12px 22px', borderRadius: 12, background: 'rgba(200,120,60,0.12)', border: '1px solid ' + GOLD, color: GOLD, fontWeight: 700, cursor: 'pointer' }}>
              이름 메뉴로 가기 →
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!loaded) return <main style={{ minHeight: '100vh', background: '#FDF6F0' }} />

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <Header router={router} />
      <p style={{ fontSize: 12, color: SUB, margin: '0 0 16px', padding: '0 4px' }}>
        성씨 {surnameHanja}({surnameHangul})는 그대로 · 발음은 두고 한자만 바꿔드려요
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
          <div style={{ background: CARD, border: '1px solid rgba(200,120,60,0.10)', borderRadius: 16, padding: '18px 16px' }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
              <span style={{ fontSize: 22, color: SUB }}>{surnameHanja}</span>
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
              원래 이름이 채워져 있어요. 그대로 두면 발음은 유지하고 한자만 바꿔드려요.
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
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>이름 지어보기 이용권</div>
            <div style={{ fontSize: 13, color: SUB, marginBottom: 16, lineHeight: 1.7 }}>
              결제하시면 사주에 맞는 한자로<br />
              <b style={{ color: GOLD }}>{tryLimit}개</b>의 이름을 지어보고<br />
              상세 풀이까지 확인하실 수 있어요.
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
              style={{ width: '100%', padding: 12, borderRadius: 12, background: 'transparent', border: '0.5px solid #f0e0d5', color: SUB, fontSize: 13, cursor: 'pointer' }}>
              다음에 할게요
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
      <button onClick={() => router.push('/manseryeok/naming/diagnosis')} aria-label="뒤로" style={{ background: 'none', border: 'none', color: '#999', fontSize: 20, cursor: 'pointer', padding: 0 }}>{'\u2039'}</button>
      <span style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>발음 그대로, 한자 바꾸기</span>
    </div>
  )
}
