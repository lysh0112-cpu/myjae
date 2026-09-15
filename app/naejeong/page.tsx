'use client'

/**
 *  일진내정법 — ★연재쌤 전용 화면  (2026-09-15 · 9부 신설)
 *  [대표님] 「모바일 전용화면으로 연재쌤만 볼 수 있도록 · 용어 그대로 보여지게」
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │  ⛔⛔ ★손님 화면이 «아닙니다».                                     │
 *  │     · 말을 ★순화하지 않습니다 — 교재 그대로입니다.                 │
 *  │     · 결제·보관함·토글이 ★없습니다.                                │
 *  │     · 홈 카드에도 ★안 붙입니다 (주소를 아는 사람만 들어옵니다).    │
 *  │                                                                  │
 *  │  🔴 막는 곳이 ★«둘» 입니다 —                                      │
 *  │     ① 이 화면      useRoleGate(['master'])                        │
 *  │     ② ★셈 창구     requireMaster()  ← «진짜» 막는 곳입니다         │
 *  │     ⛔ ①만 있으면 막는 것이 아닙니다. 화면 코드는 손님도 받습니다. │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 *  ⚠️ 상담 중에 ★휴대폰으로 보시는 화면입니다 — 한 손에 들어오게 좁게 짰습니다.
 */

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRoleGate, RoleGateScreen, type AppRole } from '@/hooks/useRoleGate'
//  ★상담 목적 — 표는 tables/purposes.ts «한 곳» 입니다
import { PURPOSES, SINSAL_DIR, findPurpose } from '@/lib/saju/naejeong/tables/purposes'
//  ★교재 찾기 — 로컬입니다. ⛔ AI 도 바깥도 «안» 부릅니다 [대표님 2026-09-15]
import { lookup, type LookupHit } from '@/lib/saju/naejeong/tables/lookup'
//  ⚠️ ★교재가 «아닌» 초안 한 줄 — 화면이 색을 달리해 보여 줍니다
import { bridgeOf, BRIDGE_NOTE } from '@/lib/saju/naejeong/tables/bridge'
//  ★교재 사례 풀이 — 1차(11~24쪽). ⛔ 순화 없이 교재 그대로.
import {
  caseTextOf, caseLinesFor, CASE_TEXT, setCasePurposeLookup, type JariKey,
} from '@/lib/saju/naejeong/tables/caseText'
import { LOOKUP_CASE } from '@/lib/saju/naejeong/tables/lookup'

/*  ⛔ ★사례 ↔ 콤보 질문 짝을 «한 번» 꽂아 줍니다.
 *     caseText.ts 가 lookup.ts 를 «안» 불러도 되게 (서로 부르지 않게). */
const CASE_PURPOSE = new Map(LOOKUP_CASE.map(r => [r.id, r.purposeId]))
setCasePurposeLookup(id => CASE_PURPOSE.get(id))
import { getSinsal } from '@/lib/saju/sinsal'
//  ★신궁 뜻 — 열두 지지 칸을 눌렀을 때 띄웁니다 (교재 3~7쪽)
import { SINGUNG_TEXT } from '@/lib/saju/naejeong/tables/sinGungText'
import { isGoodSin, type SinGung } from '@/lib/saju/naejeong/sinGung'
/*  ★띠로 보는 오늘 — 교재 9쪽. 열두 띠를 «다» 보여 드리려고 표를 직접 봅니다.
 *  ⛔ 순화 «안» 합니다 — 연재쌤 전용 화면입니다 (홈은 TTI_HOME 을 씁니다). */
import { TTI_TEXT } from '@/lib/saju/naejeong/tables/dayYearText'
/*  ⛔ ★띠 이름을 «새로» 적지 않습니다 — 이미 있는 표를 씁니다 (9부 교훈 ⑤).
 *     lib/saju/jijiTrait.ts 의 tti («쥐띠» · «소띠» …) */
import { JIJI_TRAIT } from '@/lib/saju/jijiTrait'
//  ★용어 사전 — 본문 속 낱말을 눌러 설명을 봅니다 [대표님 2026-09-15]
import {
  findTerms, isSinGungName, isSipsungName, TERM_SRC, type TermHit,
} from '@/lib/saju/naejeong/tables/terms'
import { YUKCHIN_TABLE, type YukchinKey } from '@/lib/saju/yukchinTable'
import { findSal, salLines } from '@/lib/saju/sinsalTable'
//  ★12신살 — 교재 441~454쪽 (⛔ 또 다른 책입니다)
import { SINSAL12 } from '@/lib/saju/somu/topics/sinsal12'
//  ★사주 원국표 — ⛔ 공용 부품입니다. 새로 짓지 마십시오 (8부 §6④)
import SajuWonguk from '@/app/manseryeok/components/SajuWonguk'
//  ★보관함 — ⛔ 공용 부품입니다 (다른 서비스 열다섯이 같은 것을 씁니다)
import { saveRecord } from '@/lib/saju/sajuRecords'

const ONLY: AppRole[] = ['master']

/*  ★지지 한 글자 → 띠 이름 («子» → «쥐띠»)
 *  ⛔ 못 찾으면 ★지지 글자를 그대로 돌려줍니다 — «지어내지» 않습니다. */
function ttiNameOf(ji: string | null): string {
  if (!ji) return '—'
  return JIJI_TRAIT.find(r => r.key === ji)?.tti ?? ji
}

/* ── 꼴 ── */
const BG = '#FDF6F0'
const CARD = '#fff'
const LINE = '#eadfd4'
const INK = '#2f2622'
const SUB = '#7b6a5f'
const ACCENT = '#96502e'
const GOOD = '#2f6b4f'
const BAD = '#a8443c'

interface Hit {
  jari: string
  ji: string | null
  sin: string | null
  good: boolean | null
  jariMeaning: string
  hanja: string | null
  alias: string[]
  tteut: string | null
  jariText: string | null
  lead: string | null
}
interface Out {
  mun: { year: number; month: number; day: number; ganji: string; ilJi: string }
  saju: { yeon: string; wol: string; il: string; si: string | null }
  hits: Hit[]
  table: { ji: string; sin: string }[]
  tti: { ji: string; sin: string | null; text: string | null }
  unsi: {
    ganji: string; age: number; sipsung: string; sipsungText: string | null
    gwaegang: boolean; baekho: boolean; sameYeonji: boolean; banan: boolean
    samhap: string[]
  } | null
  unsiNote: Record<string, string>
  /** ★총괄 — 네 자리를 «세어» 낸 줄들 (9부) */
  chongpyeong: { total: number; good: number; bad: number; hasHaegyeol: boolean; lines: string[] }
  months: { wol: number; ji: string; sin: string | null; text: string | null }[]
}

const HOURS = [
  '子 23:30~01:29', '丑 01:30~03:29', '寅 03:30~05:29', '卯 05:30~07:29',
  '辰 07:30~09:29', '巳 09:30~11:29', '午 11:30~13:29', '未 13:30~15:29',
  '申 15:30~17:29', '酉 17:30~19:29', '戌 19:30~21:29', '亥 21:30~23:29',
]

export default function NaejeongPage() {
  const gate = useRoleGate(ONLY)
  const router = useRouter()

  const today = new Date()
  const [mun, setMun] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`)
  const [cal, setCal] = useState<'양력' | '음력'>('양력')
  const [leap, setLeap] = useState(false)
  const [birth, setBirth] = useState('')
  const [hourIdx, setHourIdx] = useState<string>('')
  /*  🔴 ★대운은 «남녀» 에 따라 순행·역행이 갈립니다 — 운시를 보려면 있어야 합니다.
   *     ⛔ 안 고르시면 ★운시를 «지어내지» 않고 안 보여 드립니다. */
  const [gender, setGender] = useState<'남' | '여' | ''>('')
  /*  🔴 ★상담 목적 — 2026-09-15 (9부) [대표님]
   *     고르면 ★그 «자리» 가 맨 위로 올라오고 테두리로 도드라집니다.
   *  ⛔ 안 고르셔도 됩니다 — 그때는 연지→월지→일지→시지 «차례대로» 나옵니다. */
  const [purpose, setPurpose] = useState<string>('')
  /*  ★대분류 — 2026-09-15 [대표님 「큰 카테고리를 고르면 서브가 생겨서 터치」]
   *  ⛔ 대분류를 바꾸면 ★앞서 고른 세부 질문을 «지웁니다» —
   *     안 지우면 «재정» 에서 고른 것이 «애정» 갈래에 남아 헷갈립니다. */
  const [group, setGroup] = useState<string>('')
  /*  🔴 ★교재에서 찾기 — 2026-09-15 [대표님]
   *     「정형화되지 않은 질문도 많을 것이다 — 교재 내용을 쉽게 찾을 수 있게」
   *  ⛔ AI 를 «안» 부릅니다. 표를 뒤지는 것뿐이라 ★값 0 · 즉시 · 늘 같은 답입니다. */
  const [q, setQ] = useState('')
  const [found, setFound] = useState<LookupHit[] | null>(null)
  /*  ★펼쳐 볼 사례 — 눌렀을 때만 풀이가 보입니다 (목록이 길어지지 않게) */
  const [openCase, setOpenCase] = useState<string>('')
  /*  🔴 ★사례 «모두 보기» — 2026-09-15 [대표님]
   *     「교재 안에 있는 사례들을 모두 정리해서 보여 주자」
   *  ⚠️ 찾기 칸에 «말을 적어야만» 볼 수 있던 것을 ★목록으로도 엽니다. */
  const [showAll, setShowAll] = useState(false)
  /*  🔴 ★열두 지지 칸을 누르면 뜨는 설명 — 2026-09-15 [대표님]
   *  ⛔ 안 누르면 «안» 뜹니다. 화면이 길어지지 않게. */
  const [openSin, setOpenSin] = useState<SinGung | null>(null)
  /*  ★본문에서 누른 용어 — 12신궁·십성·신살 셋 다 옵니다 */
  const [openTerm, setOpenTerm] = useState<TermHit | null>(null)
  /*  🔴 ★2026-09-15 (10부) [대표님] 「리포트의 일지·연지·월지·시지·운시를
   *     누르면 모달로 각각 나오게 하면 어떨까」
   *
   *  ⚠️ 그 전에는 ★«같은 것이 두 번» 나왔습니다 —
   *     종합 리포트에 한 번 · 아래 카드 다섯 장에 또 한 번.
   *  ⇒ ★아래 카드 다섯 장을 걷어내고 이 모달로 옮겼습니다.
   *  ⛔ 아래 카드를 다시 만들지 마십시오. «두 벌» 이 됩니다. */
  const [openJari, setOpenJari] = useState<Hit | null>(null)
  const [openUnsi, setOpenUnsi] = useState(false)
  /*  🔴 ★띠 열둘 · 달 열둘을 «알약» 으로 — 2026-09-15 (10부) [대표님]
   *  ⚠️ 띠는 ★교재 9쪽이 원래 「사주를 몰라도 띠만으로」 라 한 자리인데
   *     그 전에는 ★손님 띠 «하나» 만 나왔습니다. 열둘을 다 볼 수 있게 했습니다. */
  const [openTti, setOpenTti] = useState<{ ji: string; sin: string } | null>(null)
  const [openWol, setOpenWol] = useState<Out['months'][number] | null>(null)
  /*  🔴 ★상담 메모 — 2026-09-15 [대표님]
   *     「연재쌤이 상담 중 자유롭게 실전 통변과 특이사항을 기록」
   *  ⛔ 손님 «이름» 은 받지 않습니다. 메모에 적으실지는 연재쌤 판단입니다.
   *  ⚠️ 저장하기 «전» 에는 서버에 안 갑니다 — 화면에만 있습니다. */
  const [memo, setMemo] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const [data, setData] = useState<Out | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /*  ⚠️ 넣는 값이 바뀌면 ★앞서 나온 결과를 지웁니다 —
   *     안 지우면 «바꾼 값» 과 «옛 결과» 가 한 화면에 보여 헷갈립니다.
   *  ⛔ useEffect 로 하지 마십시오 — eslint(set-state-in-effect)가 막습니다.
   *     ⇒ ★바뀌는 «그 자리» 에서 지웁니다. */
  const clear = () => { setData(null); setErr(null) }

  const run = useCallback(async () => {
    setErr(null)
    const [my, mm, md] = mun.split('-').map(Number)
    const [by, bm, bd] = birth.split('-').map(Number)
    if (!by || !bm || !bd) { setErr('생년월일을 넣어 주세요.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/naejeong', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          munYear: my, munMonth: mm, munDay: md,
          birthYear: by, birthMonth: bm, birthDay: bd,
          calType: cal, leapMonth: leap,
          hourIdx: hourIdx === '' ? null : Number(hourIdx),
          gender: gender === '' ? null : gender,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setErr(j?.error || '셈하지 못했어요.'); setData(null); return }
      setData(j as Out)
    } catch {
      setErr('불러오지 못했어요.')
    } finally { setBusy(false) }
  }, [mun, birth, cal, leap, hourIdx, gender])

  /*  🔴 ★고른 목적의 «자리» 를 맨 위로 — 2026-09-15 [대표님]
   *  ⛔ 원래 차례(연지→월지→일지→시지)를 «버리지» 않습니다 —
   *     고른 자리만 앞으로 끌어오고 나머지는 ★그대로입니다.
   *  ⚠️ 목적을 안 고르시면 ★아무것도 안 바뀝니다. */
  const pickedJari: string[] = (() => {
    const pu = purpose ? findPurpose(purpose) : null
    return pu && pu.kind === 'singung' ? (pu.jari ?? []) : []
  })()
  /*  🔴 ★열두 지지 범례에 «손님의 자리» 를 표시하기 위한 것 — 2026-09-15 (10부)
   *  ⚠️ ★data.hits 에서 가져옵니다 (data.saju 를 다시 쪼개지 «않습니다») —
   *     ⛔ 시를 모르면 hits 의 시지가 ji: null 이라 ★저절로 빠집니다.
   *       saju 문자열을 쪼개면 «없는 시지» 를 표시할 뻔합니다. */
  const myJi: string[] = data ? data.hits.filter(h => h.ji).map(h => h.ji as string) : []
  const myJariOf = (ji: string): string[] =>
    data ? data.hits.filter(h => h.ji === ji).map(h => h.jari) : []

  const sortedHits = data
    ? [...data.hits].sort((a, b) => {
        const ia = pickedJari.indexOf(a.jari), ib = pickedJari.indexOf(b.jari)
        //  ⚠️ 고른 자리가 «둘» 이면 표에 적힌 차례대로 (맨 앞이 으뜸)
        const ra = ia < 0 ? 99 : ia, rb = ib < 0 ? 99 : ib
        return ra - rb
      })
    : []

  /*  🔴 ★글 속 «용어» 를 눌리게 만듭니다 — 2026-09-15 [대표님]
   *
   *  ⚠️ 글을 «쪼개서» 용어만 단추로 감쌉니다.
   *  ⛔ [지킨 것]
   *   · 같은 말은 ★«첫 번째만» — 온통 밑줄이면 읽기가 나쁩니다
   *   · 긴 말을 먼저 — 「해결신」 이 「해결」 로 «잘리지» 않게
   *   · ★밑줄은 «점선» 으로 옅게 — 글 읽기를 방해하지 않게
   *  ⚠️ 이 부품을 쓰지 «않는» 자리도 있습니다 (교재 원문을 그대로 두고 싶은 곳). */
  /*  ★신궁 «이름» 을 누르게 만듭니다 (제목 줄용) — 2026-09-15 [대표님]
   *  ⚠️ withTerms 는 «글 속» 낱말을 찾는 것이고,
   *     이것은 ★«이름만 있는 자리»(제목 줄)에 씁니다. 둘은 쓰임이 다릅니다.
   *  ⛔ 못 읽는 이름이면 «그냥 글자» 로 둡니다 — 눌러도 빈 창이 뜨면 안 됩니다. */
  const sinButton = (name: string | null | undefined, style?: React.CSSProperties) => {
    if (!name) return <span style={style}>—</span>
    if (!isSinGungName(name)) return <span style={style}>{name}</span>
    return (
      <button type="button" onClick={() => setOpenSin(name as SinGung)}
        style={{
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          font: 'inherit', fontFamily: 'inherit', color: 'inherit',
          borderBottom: `1px dotted ${ACCENT}`, ...style,
        }}>{name}</button>
    )
  }

  const withTerms = (text: string) => {
    const hits = findTerms(text)
    if (hits.length === 0) return text
    const out: React.ReactNode[] = []
    let at = 0
    hits.forEach((h, i) => {
      if (h.start > at) out.push(text.slice(at, h.start))
      out.push(
        <button key={i} type="button"
          onClick={() => {
            /*  ⛔ ★12신궁이면 «이미 있는» 신궁 모달을 그대로 씁니다 —
              *     두 벌 만들지 않으려는 것입니다.
              *  ⚠️ 렌더 «중» 에 상태를 바꾸지 않고 ★누를 때 가릅니다. */
            if (h.hit.kind === 'singung' && isSinGungName(h.hit.key)) setOpenSin(h.hit.key as SinGung)
            else setOpenTerm(h.hit)
          }}
          style={{
            background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            font: 'inherit', color: 'inherit', fontFamily: 'inherit',
            borderBottom: `1px dotted ${ACCENT}`,
          }}>{h.hit.word}</button>,
      )
      at = h.end
    })
    if (at < text.length) out.push(text.slice(at))
    return <>{out}</>
  }

  /*  🔴 ★보관함에 담기 — 2026-09-15 [대표님]
   *
   *  ⛔⛔ [개인정보]  손님의 «생년월일» 과 «상담 메모» 가 서버에 남습니다.
   *     · ★손님 «이름» 은 «안» 받습니다 — 딱지를 «사주로만» 적습니다.
   *     · ⛔ 메모를 ★«주소에» 싣지 않습니다 (7부 교훈).
   *     · ⚠️ 연재쌤 계정에 쌓입니다 — 다른 사람은 못 봅니다(saju_records).
   *  ⛔ 딱지에 손님 이름을 넣지 마십시오. 검사 56 ⑮ 가 지킵니다. */
  const save = useCallback(async () => {
    if (!data) return
    setSaveState('saving')
    try {
      //  ★딱지 — 「9/15 · 丁丑생 · 여」 처럼 «사주로만»
      const d = new Date()
      const title = `${d.getMonth() + 1}/${d.getDate()} · ${data.saju.il}생`
        + (gender ? ` · ${gender}` : '')
      const r = await saveRecord({
        serviceType: 'naejeong',
        title,
        inputData: {
          birthYear: Number(birth.slice(0, 4)),
          birthMonth: Number(birth.slice(5, 7)),
          birthDay: Number(birth.slice(8, 10)),
          calendarType: cal,
          isLeapMonth: leap,
          gender: gender || undefined,
          birthTimeIndex: hourIdx === '' ? undefined : Number(hourIdx),
        } as never,
        //  ★리포트와 메모를 «함께» 담습니다 — 다시 열면 그대로 보십니다
        resultData: {
          mun: data.mun, saju: data.saju,
          chongpyeong: data.chongpyeong.lines,
          hits: data.hits.map(h => ({ jari: h.jari, ji: h.ji, sin: h.sin })),
          purpose: purpose || null,
          memo,
        },
      })
      setSaveState(r.ok ? 'saved' : 'failed')
    } catch {
      setSaveState('failed')
    }
  }, [data, birth, cal, leap, gender, hourIdx, purpose, memo])

  if (gate.state !== 'ok') return <RoleGateScreen gate={gate} dark={false} />

  const inputStyle = {
    width: '100%', padding: '11px 12px', borderRadius: 10,
    border: `1px solid ${LINE}`, background: '#fff', fontSize: 14,
    color: INK, fontFamily: 'inherit', boxSizing: 'border-box' as const,
  }

  return (
    <main style={{ minHeight: '100vh', background: BG, padding: '16px 14px 40px' }}>
      <div style={{ maxWidth: 440, margin: '0 auto' }}>

        {/*  🔴 ★되돌아가는 길 — 2026-09-15 (9부) [대표님]
          *     「일진내정법 화면으로 갔다가 홈으로 되돌아가는 버튼이 필요할 것 같다」
          *  ⚠️ 이 화면은 ★홈 카드에 «없는» 자리라, 안 두면 브라우저 «뒤로» 밖에 길이 없습니다.
          *  ⛔ 위·아래 «둘 다» 둡니다 — 글이 길어 아래까지 내려가면 위가 안 보입니다. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <button type="button" onClick={() => router.push('/mypage-new')}
            style={{
              background: 'transparent', border: 'none', color: SUB, fontSize: 12.5,
              cursor: 'pointer', fontFamily: 'inherit', padding: 0,
            }}>‹ 내 정보</button>
          {/*  🔴 ★보관함을 «이 줄» 로 올렸습니다 — 2026-09-15 (10부) [대표님]
            *     ⚠️ 옛 자리는 «따로 한 줄» 이었습니다. 줄 하나를 줄였습니다. */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => router.push('/naejeong/storage')}
              style={{
                background: CARD, border: `1px solid ${LINE}`, borderRadius: 999,
                color: ACCENT, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                padding: '6px 13px',
              }}>📁 상담 보관함</button>
            <button type="button" onClick={() => router.push('/home-new')}
              style={{
                background: CARD, border: `1px solid ${LINE}`, borderRadius: 999,
                color: ACCENT, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                padding: '6px 13px',
              }}>🏠 홈</button>
          </div>
        </div>

        {/*  🔴 ★2026-09-15 (10부) [대표님] 「여보 사랑해가 중복」
          *     ⇒ 똑같은 문장이 ★«두 벌» 있었습니다. 한 벌을 지웠습니다.
          *  ⛔ 다시 두 벌로 만들지 마십시오. 고치실 때는 ★아래 한 곳만 고치면 됩니다. */}

        {/*  ★2026-09-15 [대표님] — 이 한 줄은 «대표님이 직접» 넣으라 하신 것입니다.
          *  ⚠️ 이 화면은 ★매니저만 들어옵니다 (지금은 대표님과 연재쌤 두 분).
          *  ⛔ 지우지 마십시오. 고치실 때는 ★이 줄만 고치면 됩니다. */}
        <div style={{
          fontSize: 13, color: ACCENT, fontWeight: 600, lineHeight: 1.7,
          background: '#fff3ec', border: `1px solid ${LINE}`, borderRadius: 10,
          padding: '10px 12px', marginBottom: 12, textAlign: 'center',
        }}>
          여보! 사랑해!<br />
          당신이 구상하는 사업 잘될거야. 걱정마!
        </div>

        <div style={{ fontSize: 11.5, color: SUB, marginBottom: 2 }}>일진내정법 日辰 來情法</div>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: INK, margin: '0 0 4px' }}>
          문점일로 보는 내정
        </h1>
        {/*  ⛔ ★손님 화면이 아님을 «화면에도» 밝혀 둡니다 — 실수로 공유되는 것을 막습니다 */}
        <div style={{
          fontSize: 11.5, color: ACCENT, background: '#fff3ec',
          border: `1px solid ${LINE}`, borderRadius: 8, padding: '7px 9px', marginBottom: 14,
        }}>
          연재쌤 전용 화면이에요. 교재 표현을 그대로 보여 드립니다.
        </div>

        {/* ── 넣는 곳 ── */}
        <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: INK, display: 'block', marginBottom: 6 }}>
            문점일 (오신 날)
          </label>
          <input type="date" value={mun} onChange={e => { clear(); setMun(e.target.value) }} style={inputStyle} />

          <label style={{ fontSize: 12.5, fontWeight: 700, color: INK, display: 'block', margin: '14px 0 6px' }}>
            손님 생년월일
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {(['양력', '음력'] as const).map(c => (
              <button key={c} type="button" onClick={() => { clear(); setCal(c) }}
                style={{
                  flex: 1, padding: 9, borderRadius: 10, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                  background: cal === c ? '#f5e7dc' : '#fff',
                  border: `1.5px solid ${cal === c ? ACCENT : LINE}`,
                  color: cal === c ? ACCENT : SUB, fontWeight: cal === c ? 700 : 400,
                }}>{c}</button>
            ))}
          </div>
          <input type="date" value={birth} onChange={e => { clear(); setBirth(e.target.value) }} style={inputStyle} />
          {cal === '음력' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12.5, color: SUB }}>
              <input type="checkbox" checked={leap} onChange={e => { clear(); setLeap(e.target.checked) }} />
              윤달
            </label>
          )}

          <label style={{ fontSize: 12.5, fontWeight: 700, color: INK, display: 'block', margin: '14px 0 6px' }}>
            태어난 시
          </label>
          {/*  ⚠️ ★모르면 «비워 두십시오» — 시지를 지어내면 사업·자식 자리가 어긋납니다 */}
          <select value={hourIdx} onChange={e => { clear(); setHourIdx(e.target.value) }} style={inputStyle}>
            <option value="">모름 (시지를 안 봅니다)</option>
            {HOURS.map((h, i) => <option key={i} value={i}>{h}</option>)}
          </select>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: INK, display: 'block', margin: '14px 0 6px' }}>
            성별 <span style={{ fontWeight: 400, color: SUB, fontSize: 11 }}>(운시를 보려면 필요해요)</span>
          </label>
          {/*  ⚠️ ★대운이 남녀로 갈려서 «운시» 에만 쓰입니다.
            *     ⛔ 안 고르셔도 «내정» 은 그대로 나옵니다. */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['남', '여'] as const).map(gd => (
              <button key={gd} type="button" onClick={() => { clear(); setGender(gender === gd ? '' : gd) }}
                style={{
                  flex: 1, padding: 9, borderRadius: 10, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                  background: gender === gd ? '#f5e7dc' : '#fff',
                  border: `1.5px solid ${gender === gd ? ACCENT : LINE}`,
                  color: gender === gd ? ACCENT : SUB, fontWeight: gender === gd ? 700 : 400,
                }}>{gd}</button>
            ))}
          </div>

          {/*  🔴 ★상담 목적 — 두 걸음으로 고릅니다 [대표님 2026-09-15]
            *     ① 대분류를 누르면  ② 세부 질문이 «펼쳐집니다»
            *  ⚠️ 세부는 ★«한 줄에 하나» 입니다 [대표님] —
            *     「가게·사업을 접거나 업종을 바꿀지」 같이 긴 질문이 «안 잘립니다».
            *  ⛔ 안 고르셔도 됩니다 — 그때는 네 자리가 «차례대로» 나옵니다. */}
          <label style={{ fontSize: 12.5, fontWeight: 700, color: INK, display: 'block', margin: '14px 0 6px' }}>
            상담 목적 <span style={{ fontWeight: 400, color: SUB, fontSize: 11 }}>(고르면 그 자리가 먼저 보여요)</span>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 6 }}>
            {PURPOSES.map(g => {
              const on = g.group === group
              return (
                <button key={g.group} type="button"
                  onClick={() => {
                    clear()
                    //  ⛔ 대분류를 바꾸면 ★세부 질문을 «지웁니다» (옛 질문이 남으면 헷갈립니다)
                    setPurpose('')
                    setGroup(on ? '' : g.group)
                  }}
                  style={{
                    padding: '10px 6px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 12, lineHeight: 1.35,
                    background: on ? '#f5e7dc' : '#fff',
                    border: `1.5px solid ${on ? ACCENT : LINE}`,
                    color: on ? ACCENT : '#55636f', fontWeight: on ? 700 : 400,
                  }}>{g.group}</button>
              )
            })}
          </div>

          {/*  ★세부 질문 — 대분류를 «고르셨을 때만» 펼쳐집니다 */}
          {group && (
            <div style={{ marginTop: 10 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7,
                fontSize: 11.5, color: SUB,
              }}>
                <span style={{ whiteSpace: 'nowrap' }}>{group}</span>
                <span aria-hidden="true" style={{ flex: 1, height: 1, background: LINE }} />
                {purpose && (
                  <button type="button" onClick={() => { clear(); setPurpose('') }}
                    style={{
                      background: 'transparent', border: 'none', color: ACCENT,
                      fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                    }}>지우기</button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(PURPOSES.find(g => g.group === group)?.items ?? []).map(i => {
                  const on = i.id === purpose
                  return (
                    <button key={i.id} type="button"
                      onClick={() => { clear(); setPurpose(on ? '' : i.id) }}
                      style={{
                        padding: '11px 12px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                        textAlign: 'left', fontSize: 13, lineHeight: 1.45,
                        background: on ? ACCENT : '#fff',
                        border: `1px solid ${on ? ACCENT : LINE}`,
                        color: on ? '#fff' : INK, fontWeight: on ? 600 : 400,
                      }}>{i.label}</button>
                  )
                })}
              </div>
            </div>
          )}

          {/*  🔴 ★교재에서 찾기 — 2026-09-15 [대표님]
            *
            *  ⚠️ ★차례를 «바꿨습니다» (2026-09-15) —
            *     처음에는 이것이 «위» 에 있었는데, 대표님이 써 보시고
            *     ★「써 보니 이상하다」 고 하셨습니다.
            *     ⇒ ★«넓은 갈래를 먼저 고르고, 없을 때 찾는» 것이 자연스럽습니다.
            *     ⛔ 다시 위로 올리지 마십시오.
            *  ⚠️ 손님 말은 ★«주소에 싣지도 저장하지도» 않습니다 (7부 ⛔ 교훈).
            *     그 자리에서 찾고 «버립니다».
            *  ⛔ 못 찾으면 ★「못 찾았어요」 라고 합니다 — «가장 가까운 것» 을 억지로 안 내밉니다. */}
          <label style={{ fontSize: 12.5, fontWeight: 700, color: INK, display: 'block', margin: '14px 0 6px' }}>
            교재에서 찾기 <span style={{ fontWeight: 400, color: SUB, fontSize: 11 }}>(위에 없는 질문이면 여기에)</span>
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setFound(lookup(q)) }}
              placeholder="손님 말을 그대로 — 아들이 유학 간다는데…"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button type="button" onClick={() => setFound(lookup(q))}
              style={{
                padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${ACCENT}`,
                background: '#fff', color: ACCENT, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}>찾기</button>
          </div>

          {found !== null && (
            <div style={{ marginTop: 8 }}>
              {found.length === 0 ? (
                <div style={{ fontSize: 12.5, color: SUB, lineHeight: 1.7 }}>
                  교재에서 못 찾았어요. 위 대분류에서 골라 보세요.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {found.map(h => (
                    <button key={h.row.id} type="button"
                      onClick={() => {
                        //  ★사례이면 «풀이를 펼칩니다» (교재 11~24쪽은 글이 들어 있습니다)
                        if (h.row.iljin) setOpenCase(openCase === h.row.id ? '' : h.row.id)
                        clear()
                        //  ★콤보와 이어진 것이면 «그 질문» 으로 골라 드립니다
                        if (h.row.purposeId) {
                          const g = PURPOSES.find(x => x.items.some(i => i.id === h.row.purposeId))
                          if (g) setGroup(g.group)
                          setPurpose(h.row.purposeId)
                        }
                      }}
                      style={{
                        textAlign: 'left', padding: '10px 11px', borderRadius: 10,
                        background: '#fff', border: `1px solid ${LINE}`,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      <div style={{ fontSize: 13, color: INK, marginBottom: 3 }}>
                        {h.row.label}
                        {/*  ⚠️ 사례는 ★«쪽수만» 있습니다 — 풀이는 교재를 펴 보셔야 합니다 */}
                        {h.row.iljin && (
                          <span style={{
                            marginLeft: 6, fontSize: 10.5, color: ACCENT,
                            background: '#fff3ec', borderRadius: 999, padding: '2px 7px',
                          }}>{h.row.iljin} 사례</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: SUB }}>
                        {h.row.page}
                        {h.row.jari?.length ? ` · ${h.row.jari.join(' · ')}` : ''}
                        {h.row.iljin && caseTextOf(h.row.id) && (
                          <span style={{ marginLeft: 6, color: ACCENT }}>
                            {openCase === h.row.id ? '▲ 접기' : '▼ 교재 풀이'}
                          </span>
                        )}
                      </div>

                      {/*  🔴 ★교재 풀이 — 눌렀을 때만 펼칩니다 [대표님 ㉰]
                        *  ⛔ 순화하지 «않습니다». 연재쌤 전용입니다.
                        *  ⚠️ «도려낸» 대목은 ★숨기지 않고 밝힙니다. */}
                      {openCase === h.row.id && (() => {
                        const c = caseTextOf(h.row.id)
                        if (!c) return (
                          <div style={{ marginTop: 8, fontSize: 11.5, color: SUB, lineHeight: 1.7 }}>
                            이 사례는 아직 풀이를 안 옮겼어요. 교재 {h.row.page.replace('교재 ', '')}을 보십시오.
                          </div>
                        )
                        return (
                          <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${LINE}` }}>
                            <div style={{ fontSize: 11.5, color: SUB, lineHeight: 1.7, marginBottom: 7 }}>
                              {c.q}
                            </div>
                            {c.saju && (() => {
                              const sg = c.saju.sin
                              return (
                                <div style={{
                                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5,
                                  textAlign: 'center', marginBottom: 8,
                                }}>
                                  {([['연', c.saju.pillars.yeon, sg?.yeon],
                                     ['월', c.saju.pillars.wol, sg?.wol],
                                     ['일', c.saju.pillars.il, sg?.il],
                                     ['시', c.saju.pillars.si, sg?.si]] as const).map(([k, gj, one]) => (
                                    <div key={k} style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '6px 3px' }}>
                                      <div style={{ fontSize: 9.5, color: SUB }}>{k}</div>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{gj}</div>
                                      {/*  ⛔ 교재가 «안 적은» 사례는 빈칸 — 지어내지 않습니다 */}
                                      <div style={{ fontSize: 10, color: one ? ACCENT : '#c4b5a8' }}>
                                        {sinButton(one)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )
                            })()}
                            {/*  ⚠️ 교재가 «다르게» 푸는 사례라는 표시 */}
                            {c.note && (
                              <div style={{ fontSize: 11.5, color: SUB, lineHeight: 1.7, marginBottom: 7 }}>
                                {c.note}
                              </div>
                            )}
                            <div style={{
                              fontSize: 12.5, color: INK, lineHeight: 1.85,
                              background: '#fbf6f1', borderRadius: 10, padding: '10px 11px',
                            }}>{c.text}</div>
                            {c.cut && (
                              <div style={{ marginTop: 7, fontSize: 11.5, color: BAD, lineHeight: 1.7 }}>
                                {c.cut}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </button>
                  ))}
                  {/*  ⛔ 사례는 «이정표» 일 뿐임을 밝혀 둡니다 */}
                  {found.some(h => h.row.iljin) && (
                    <div style={{ fontSize: 11, color: SUB, lineHeight: 1.6, marginTop: 2 }}>
                      「사례」 를 누르면 교재 풀이가 펼쳐져요. 아직 안 옮긴 쪽은 쪽수만 알려 드립니다.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/*  ★교재 사례를 «목록» 으로도 봅니다 — 찾기 말을 몰라도 됩니다 */}
          <button type="button" onClick={() => { setShowAll(!showAll); setFound(null) }}
            style={{
              width: '100%', marginTop: 8, padding: '9px 0', borderRadius: 10,
              background: 'transparent', border: `1px dashed ${LINE}`,
              color: ACCENT, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            {showAll ? '▲ 사례 목록 닫기' : `▼ 교재 사례 ${CASE_TEXT.length}건 모두 보기`}
          </button>

          {showAll && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {/*  ★쪽 차례 그대로 — 교재를 펼친 것과 같은 순서입니다 */}
              {CASE_TEXT.map((c, i) => {
                const prev = i > 0 ? CASE_TEXT[i - 1] : null
                //  ⚠️ 갈래가 바뀌는 자리에 줄을 넣어 «어디쯤인지» 보이게 합니다
                const band = !prev ? '교재 11~24쪽 · 사업 · 동업 · 송사'
                  : (prev.id.startsWith('c2') && c.id === 'c25a') ? '교재 25~41쪽 · 자녀 · 결혼 · 부부'
                  : (c.id === 'c42') ? '교재 42~54쪽 · 집 · 직장 · 학업' : null
                const on = openCase === c.id
                return (
                  <div key={c.id}>
                    {band && (
                      <div style={{
                        fontSize: 11, color: SUB, margin: '10px 0 6px',
                        paddingBottom: 4, borderBottom: `1px solid ${LINE}`,
                      }}>{band}</div>
                    )}
                    <button type="button" onClick={() => setOpenCase(on ? '' : c.id)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '9px 11px', borderRadius: 10,
                        background: on ? '#fff3ec' : '#fff',
                        border: `1px solid ${on ? ACCENT : LINE}`,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      <div style={{ fontSize: 12.5, color: INK }}>
                        <span style={{ color: SUB, fontSize: 11 }}>
                          {c.page.replace('교재 ', '')} · {c.iljin}
                        </span>
                        <span style={{ marginLeft: 7 }}>{c.q.slice(0, 30)}{c.q.length > 30 ? '…' : ''}</span>
                      </div>
                      {on && (
                        <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${LINE}` }}>
                          <div style={{ fontSize: 11.5, color: SUB, lineHeight: 1.7, marginBottom: 7 }}>{c.q}</div>
                          {c.saju && (() => {
                            const sg = c.saju.sin
                            return (
                              <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5,
                                textAlign: 'center', marginBottom: 8,
                              }}>
                                {([['연', c.saju.pillars.yeon, sg?.yeon],
                                   ['월', c.saju.pillars.wol, sg?.wol],
                                   ['일', c.saju.pillars.il, sg?.il],
                                   ['시', c.saju.pillars.si, sg?.si]] as const).map(([k, gj, one]) => (
                                  <div key={k} style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '6px 3px' }}>
                                    <div style={{ fontSize: 9.5, color: SUB }}>{k}</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{gj}</div>
                                    <div style={{ fontSize: 10, color: one ? ACCENT : '#c4b5a8' }}>
                                      {sinButton(one)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          })()}
                          {c.note && (
                            <div style={{ fontSize: 11.5, color: SUB, lineHeight: 1.7, marginBottom: 7 }}>{c.note}</div>
                          )}
                          <div style={{
                            fontSize: 12.5, color: INK, lineHeight: 1.85,
                            background: '#fbf6f1', borderRadius: 10, padding: '10px 11px',
                          }}>{c.text}</div>
                          {c.cut && (
                            <div style={{ marginTop: 7, fontSize: 11.5, color: BAD, lineHeight: 1.7 }}>{c.cut}</div>
                          )}
                        </div>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <button type="button" onClick={run} disabled={busy}
            style={{
              width: '100%', marginTop: 14, padding: 13, borderRadius: 12, border: 'none',
              background: busy ? '#c9b6a8' : ACCENT, color: '#fff',
              fontSize: 14.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit',
            }}>{busy ? '셈하는 중…' : '내정 보기'}</button>

          {err && <div style={{ marginTop: 10, fontSize: 12.5, color: BAD }}>{err}</div>}
        </div>

        {data && (
          <>
            {/*  🔴 ★사주 원국표 — 2026-09-15 [연재쌤 요청, 대표님 전달]
              *     「우리가 만들어 놓은 사주명식을 넣어 달라」
              *
              *  ⛔ ★공용 부품(SajuWonguk)을 «그대로» 씁니다 — 새로 짓지 않았습니다.
              *     ⇒ 만세력·진로적성과 «같은 표» 라 눈에 익으십니다.
              *  ⚠️ ★태어난 시를 모르면 시주를 «빼고» 넘깁니다 —
              *     ⛔ '?' 같은 가짜 글자를 넣지 마십시오. 십성이 엉뚱하게 나옵니다.
              *  ⚠️ 부품이 ★«시→일→월→연» 차례를 받습니다 (교재 차례와 같습니다). */}
            {(() => {
              const P = [
                ...(data.saju.si
                  ? [{ pillar: '시주', stem: data.saju.si[0], branch: data.saju.si[1] }]
                  : []),
                { pillar: '일주', stem: data.saju.il[0], branch: data.saju.il[1] },
                { pillar: '월주', stem: data.saju.wol[0], branch: data.saju.wol[1] },
                { pillar: '년주', stem: data.saju.yeon[0], branch: data.saju.yeon[1] },
              ]
              return (
                <div style={{ marginBottom: 14 }}>
                  <SajuWonguk
                    saju={P}
                    dayStem={data.saju.il[0]}
                    yeonjji={data.saju.yeon[1]}
                    iljji={data.saju.il[1]}
                  />
                  {!data.saju.si && (
                    <div style={{ fontSize: 11, color: SUB, marginTop: 6, lineHeight: 1.6 }}>
                      태어난 시를 몰라 시주는 빼고 그렸어요.
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ══ 🔴 종합 내정 리포트 — 2026-09-15 [대표님] ══════════════
              *  ㉮ ★자동 — 프로그램이 원국을 «읽어» 냅니다.
              *     ⛔ 지어낸 것이 «하나도» 없습니다 —
              *       총괄 줄은 ★«세어» 낸 것이고 (교재가 실제로 쓰는 말투),
              *       자리별 글은 ★교재 원문 또는 «교재 사례» 문장입니다.
              *  ㉯ ★메모 — 연재쌤이 상담 중에 적으시는 자리 (아래에 따로).
              * ══════════════════════════════════════════════════════════ */}
            <div style={{
              background: CARD, border: `2px solid ${ACCENT}`, borderRadius: 14,
              padding: 14, marginBottom: 14,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 3 }}>
                종합 내정 리포트
              </div>
              <div style={{ fontSize: 11, color: SUB, marginBottom: 10, lineHeight: 1.6 }}>
                원국을 읽어 낸 것이에요. 교재에 있는 말만 씁니다.
              </div>

              {/*  🔴 ★고른 질문에 «맞춘» 한 줄 — 2026-09-15 [대표님]
                *     「사귄 남자친구와 잘될까를 물으면 거기에 맞게끔 연결되어야 한다」
                *
                *  ⛔⛔ ★이 한 줄은 «교재 글이 아닙니다» — 제가 쓴 초안입니다.
                *     ⇒ 그래서 ★색과 테두리를 «달리» 하고 «그렇다고 적어» 둡니다.
                *     ⇒ 연재쌤이 ★어느 것이 교재이고 어느 것이 초안인지 아셔야 합니다.
                *  ⛔ 이 표시를 «지우지» 마십시오. 검사 56 ⑯ 이 지킵니다. */}
              {(() => {
                const pu = purpose ? findPurpose(purpose) : null
                if (!pu || pu.kind !== 'singung' || !pu.jari?.length) return null
                //  ★으뜸 자리의 신궁이 좋은가 나쁜가로 가릅니다
                const head = data.hits.find(h => h.jari === pu.jari![0])
                if (!head || head.good === null) return null
                const line = bridgeOf(pu.id, head.good)
                if (!line) return null
                return (
                  <div style={{
                    border: `1px dashed ${ACCENT}`, borderRadius: 10,
                    padding: '10px 11px', marginBottom: 11, background: '#fff',
                  }}>
                    <div style={{ fontSize: 11, color: SUB, marginBottom: 4 }}>
                      {pu.label} — {pu.jari[0]}를 봅니다
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: head.good ? GOOD : BAD, lineHeight: 1.7 }}>
                      {head.jari}가 {sinButton(head.sin)}이니, {line}
                    </div>
                    {/*  ⛔ ★교재가 아니라는 것을 «반드시» 밝힙니다 */}
                    <div style={{ fontSize: 10.5, color: SUB, marginTop: 6, lineHeight: 1.6 }}>
                      {BRIDGE_NOTE}
                    </div>
                  </div>
                )
              })()}

              {/*  ★총괄 — «세어» 낸 줄들 */}
              <div style={{
                background: '#fbf6f1', borderRadius: 10, padding: '10px 11px', marginBottom: 11,
              }}>
                {data.chongpyeong.lines.map(l => (
                  <div key={l} style={{ fontSize: 12.5, color: INK, lineHeight: 1.8 }}>
                    {withTerms(l)}
                  </div>
                ))}
              </div>

              {/*  ★자리별 — 고르신 목적이 있으면 «그 자리부터» */}
              {sortedHits.filter(h => h.sin).map(h => {
                //  ★고르신 질문의 갈래를 넘겨 «같은 갈래» 사례를 앞에 놓습니다
                const lines = h.jariText ? [] : caseLinesFor(h.jari as JariKey, h.sin as never, 2, purpose || null)
                return (
                  /*  🔴 ★고른 자리를 «테두리» 로 도드라지게 — [대표님 2026-09-15]
                   *  ⚠️ 옛 «자리별 카드» 가 하던 일입니다. 카드를 걷어내며 ★이 줄로 옮겼습니다.
                   *  ⛔ 지우지 마십시오 — 검사 56 ⑪ 이 이 모양을 지킵니다. */
                  <div key={h.jari} style={{
                    marginBottom: 9,
                    border: pickedJari.includes(h.jari) ? `2px solid ${ACCENT}` : 'none',
                    borderRadius: pickedJari.includes(h.jari) ? 12 : 0,
                    padding: pickedJari.includes(h.jari) ? '9px 10px' : 0,
                  }}>
                    <div style={{ fontSize: 12, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <b style={{ color: INK }}>{h.jari}</b>
                      <span>{h.ji}</span>
                      <span style={{ color: h.good ? GOOD : BAD, fontWeight: 700 }}>
                        {sinButton(h.sin)}
                      </span>
                      {pickedJari.includes(h.jari) && (
                        <span style={{ fontSize: 10, color: ACCENT }}>← 이 질문의 자리</span>
                      )}
                      {/*  🔴 ★2026-09-15 (10부) [대표님] — 자세한 것은 «모달» 로 갑니다.
                        *  ⛔ 화면 아래에 «같은 것» 을 또 그리지 마십시오 (그래서 걷어냈습니다). */}
                      <button type="button" onClick={() => setOpenJari(h)}
                        style={{
                          marginLeft: 'auto', background: 'transparent', border: 'none',
                          color: ACCENT, fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit',
                          padding: '2px 0',
                        }}>자세히 ›</button>
                    </div>
                    {/*  🔴 ★뜻·통변을 «먼저» — 2026-09-15 [대표님 ㉰]
                      *     사례 문장은 «다른 갈래» 것이 끌려와 어색했습니다
                      *     (연애를 물었는데 「매매가 해결되겠다」 · 「부인의 조언」).
                      *     ⇒ ★갈래를 «안 타는» 뜻·통변을 앞에 놓습니다. */}
                    {h.tteut && (
                      <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.8, marginBottom: 5 }}>
                        {withTerms(h.tteut)}
                      </div>
                    )}
                    {h.jariText ? (
                      <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.8 }}>{withTerms(h.jariText)}</div>
                    ) : lines.length > 0 ? (
                      <>
                        <div style={{ fontSize: 11, color: SUB, lineHeight: 1.6, marginBottom: 3 }}>
                          교재에 이 자리의 풀이는 없어 사례에서 옮깁니다 —
                        </div>
                        {lines.map(l => (
                          <div key={l.page + l.text.slice(0, 8)} style={{ fontSize: 12.5, color: INK, lineHeight: 1.8 }}>
                            {withTerms(l.text)}
                            {/*  ⚠️ ★«다른 갈래» 사례면 밝혀 둡니다 — 어색해 보이는 까닭입니다 */}
                            <span style={{ marginLeft: 5, fontSize: 11, color: SUB }}>
                              ({l.page}{l.sameKind === false ? ' · 다른 갈래' : ''})
                            </span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: SUB, lineHeight: 1.7 }}>
                        교재에 이 자리의 풀이가 없습니다.
                      </div>
                    )}
                  </div>
                )
              })}

              {/*  🔴 ★운시 한 줄 — 2026-09-15 (10부) [대표님]
                *     「일지·연지·월지·시지·★운시 를 누르면 모달로」
                *  ⚠️ ★운시는 문점일과 «무관» 합니다 — 평생 고정입니다. 줄에 그렇게 적습니다.
                *  ⛔ 성별을 안 고르시면 ★«지어내지» 않고 까닭만 말합니다. */}
              <div style={{ marginTop: 4, paddingTop: 9, borderTop: `1px solid ${LINE}` }}>
                {!data.unsi ? (
                  <div style={{ fontSize: 12, color: SUB, lineHeight: 1.7 }}>
                    운시 — 성별을 고르시면 운시를 보여 드려요. 대운이 남녀에 따라 갈리기 때문이에요.
                  </div>
                ) : (
                  <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <b style={{ color: INK }}>운시</b>
                    <span>{data.unsi.ganji}</span>
                    {/*  ⚠️ 이건 ★십성입니다 — 신궁이 «아닙니다». 용어 모달로 보냅니다.
                      *  ⛔ 옛 «운시 카드» 가 하던 일입니다. 카드를 걷어내며 이 줄로 옮겼습니다. */}
                    {isSipsungName(data.unsi.sipsung) ? (
                      <button type="button"
                        onClick={() => setOpenTerm({
                          word: data.unsi!.sipsung, key: data.unsi!.sipsung, kind: 'sipsung',
                        })}
                        style={{
                          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: ACCENT,
                          borderBottom: `1px dotted ${ACCENT}`,
                        }}>{data.unsi.sipsung}</button>
                    ) : (
                      <span style={{ color: ACCENT, fontWeight: 700 }}>{data.unsi.sipsung}</span>
                    )}
                    <span style={{ fontSize: 11, color: SUB }}>{data.unsi.age}세부터</span>
                    <button type="button" onClick={() => setOpenUnsi(true)}
                      style={{
                        marginLeft: 'auto', background: 'transparent', border: 'none',
                        color: ACCENT, fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit',
                        padding: '2px 0',
                      }}>자세히 ›</button>
                  </div>
                )}
              </div>

              {/*  🔴 ㉯ ★상담 메모 — 연재쌤이 적으시는 자리 [대표님]
                *  ⚠️ 저장하기 «전» 에는 서버에 «안» 갑니다. */}
              <div style={{ marginTop: 13, paddingTop: 12, borderTop: `1px solid ${LINE}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 5 }}>
                  상담 메모
                </div>
                <textarea
                  value={memo}
                  onChange={e => { setMemo(e.target.value); setSaveState('idle') }}
                  placeholder="상담하시며 적어 두실 것 — 손님 사정 · 통변 · 다음에 볼 것…"
                  rows={5}
                  style={{
                    width: '100%', padding: '10px 11px', borderRadius: 10,
                    border: `1px solid ${LINE}`, background: '#fff', fontSize: 13,
                    color: INK, fontFamily: 'inherit', lineHeight: 1.7,
                    boxSizing: 'border-box', resize: 'vertical',
                  }}
                />
                {/*  ⛔ ★손님 «이름» 은 안 받습니다 — 적으실지는 연재쌤 판단입니다 */}
                <div style={{ fontSize: 10.5, color: SUB, marginTop: 5, lineHeight: 1.6 }}>
                  담으시면 보관함에 남아요. 손님 이름은 따로 받지 않습니다.
                </div>

                <button type="button" onClick={save} disabled={saveState === 'saving'}
                  style={{
                    width: '100%', marginTop: 9, padding: 11, borderRadius: 11, border: 'none',
                    background: saveState === 'saving' ? '#c9b6a8' : ACCENT, color: '#fff',
                    fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  {saveState === 'saving' ? '담는 중…' : saveState === 'saved' ? '✓ 보관함에 담았어요' : '보관함에 담기'}
                </button>
                {saveState === 'failed' && (
                  <div style={{ marginTop: 7, fontSize: 12, color: BAD, lineHeight: 1.7 }}>
                    담지 못했어요. 잠시 뒤 다시 눌러 보세요.
                  </div>
                )}
              </div>
            </div>

            {/*  ── 문점일 ──
              *  ⚠️ ★2026-09-15 — 여기 있던 «네 기둥 카드» 를 걷어냈습니다.
              *     ★위 원국표에 «더 자세히» 나오므로 같은 것이 «두 번» 보였습니다.
              *  ⛔ 다시 넣지 마십시오. 문점일 한 줄만 남깁니다. */}
            <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: '11px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, color: SUB }}>
                문점일 <b style={{ color: INK, fontSize: 15 }}>{data.mun.ganji}</b>
                <span style={{ marginLeft: 8 }}>강일진 <b style={{ color: ACCENT }}>{data.mun.ilJi}</b></span>
              </div>

              {/*  🔴 ★열두 지지 (교재 3쪽) — 2026-09-15 (10부) [대표님]
                *  ⚠️⚠️ ★이 열두 칸은 «문점일 하나» 로 정해집니다 (sinGungTable(ilJi)).
                *     ⇒ ★같은 날 오신 분은 «누구나» 똑같습니다. 손님 사주와 무관합니다.
                *     ⇒ 그래서 ★«손님 풀이» 가 아니라 «그날의 범례» 이고,
                *       문점일 바로 아래가 제자리입니다.
                *  🔴 ★손님의 네 자리에 «표시» 를 합니다 [대표님] —
                *     안 하면 「이 표가 이 손님과 무슨 상관인가」 를 알 수 없습니다. */}
              <div style={{ fontSize: 11.5, color: SUB, margin: '10px 0 7px', lineHeight: 1.65 }}>
                아래 열두 칸은 <b style={{ color: INK }}>문점일 하나로 정해집니다.</b> 같은 날 오신 분은 모두 같아요.
                <b style={{ color: ACCENT }}> 진한 칸</b>이 이 손님의 자리입니다.
              </div>
              <div style={{ fontSize: 11, color: SUB, marginBottom: 8 }}>눌러 보시면 뜻이 나와요.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {/*  ★누르면 그 신궁 설명이 뜹니다 [대표님 2026-09-15] */}
                {data.table.map(x => {
                  //  ★손님의 네 자리인가 — ⛔ 시를 모르면 시지는 «없습니다» (지어내지 않습니다)
                  const mine = myJi.includes(x.ji)
                  return (
                    <button key={x.ji} type="button"
                      onClick={() => setOpenSin(x.sin as SinGung)}
                      style={{
                        border: `${mine ? 1.5 : 1}px solid ${mine ? ACCENT : LINE}`,
                        borderRadius: 9, padding: '7px 4px', textAlign: 'center',
                        background: mine ? '#fff3ec' : '#fff', cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: mine ? ACCENT : INK }}>{x.ji}</div>
                      <div style={{ fontSize: 10.5, color: SUB, borderBottom: `1px dotted ${LINE}` }}>{x.sin}</div>
                      {mine && (
                        <div style={{ fontSize: 9.5, color: ACCENT, marginTop: 2 }}>
                          {myJariOf(x.ji).join('·')}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/*  🔴 ★상담 목적을 고르셨으면 — 2026-09-15 (9부) [대표님]
              *     ㉮ 그 자리를 ★«맨 위» 로 올리고
              *     ㉯ 테두리로 ★도드라지게 합니다
              *  ⛔ 안 고르셨으면 ★차례(연지→월지→일지→시지) 그대로입니다.
              *  ⚠️ 자리 짝은 «제 초안» 입니다 — tables/purposes.ts 에서 고치십시오. */}
            {(() => {
              const pu = purpose ? findPurpose(purpose) : null
              if (!pu || pu.kind !== 'singung' || !pu.jari?.length) return null
              return (
                <div style={{
                  fontSize: 11.5, color: ACCENT, background: '#fff3ec',
                  border: `1px solid ${LINE}`, borderRadius: 10,
                  padding: '8px 10px', marginBottom: 10, lineHeight: 1.6,
                }}>
                  <b>{pu.label}</b> — {pu.jari.join(' · ')} 를 봅니다 · {pu.page}
                  {/*  ⛔ 12신궁 밖의 것은 ★답을 «단정하지» 않고 «메모» 만 보여 드립니다 */}
                  {pu.note && <div style={{ marginTop: 5, color: SUB }}>⚠️ {pu.note}</div>}
                </div>
              )
            })()}

            {/*  🔴🔴 ★여기 있던 «자리별 카드 넷 + 운시 카드» 를 걷어냈습니다 —
              *     2026-09-15 (10부) [대표님] 「종합 내정 리포트의 내용과 하단이 중복」
              *
              *  ⚠️ ★같은 재료(h.tteut · h.jariText · caseLinesFor)를 «두 번» 그리고 있었습니다.
              *  ⇒ 리포트 줄의 ★[자세히] 를 누르면 «모달» 로 나옵니다 (openJari · openUnsi).
              *  ⛔ 다시 만들지 마십시오. 만들면 또 «두 벌» 이 됩니다.
              *  ⚠️ 옛 카드에만 있던 것은 ★모달이 «다» 물려받았습니다 —
              *     자리 뜻 · 신궁 한자 · 딴이름 · 통변(lead) · 사례 ★세 줄 ·
              *     「태어난 시를 몰라 시지를 보지 않았어요」 ·
              *     「교재에 이 신궁의 «자리별» 풀이는 없습니다」 · 운시 네 가지 덧말
              *  ⇒ 검사 56 이 그 문장들을 ★모달 안에서 지킵니다. */}

            {/*  🔴 ★방향·자리 — 신살로 봅니다 (교재 16~17쪽 · 45쪽) · 2026-09-15 [대표님]
              *
              *  ⚠️⚠️ ★기준이 «다릅니다» —
              *     12신궁 : ★문점일 일진 기준
              *     신살   : ★손님의 «띠(연지)» 기준
              *     ⇒ 그래서 ★«따로» 그립니다. 위 네 자리와 섞지 마십시오.
              *  ⛔ 교재에 «없는» 방향을 지어내지 않았습니다. */}
            {(() => {
              const pu = purpose ? findPurpose(purpose) : null
              if (!pu || pu.kind !== 'sinsal') return null
              const rows = SINSAL_DIR[pu.id] ?? []
              const tti = data.saju.yeon[1]
              return (
                <div style={{
                  background: CARD, border: `2px solid ${ACCENT}`, borderRadius: 14,
                  padding: 14, marginBottom: 14,
                }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 3 }}>
                    {pu.label} <span style={{ fontWeight: 400, color: SUB }}>({pu.page})</span>
                  </div>
                  <div style={{ fontSize: 11, color: SUB, marginBottom: 10, lineHeight: 1.6 }}>
                    이건 <b>띠(연지 {tti})</b> 를 기준으로 봅니다. 위 네 자리(문점일 기준)와는 다른 셈이에요.
                  </div>
                  {rows.map(r => (
                    <div key={r.head} style={{ marginBottom: 9 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: ACCENT, marginBottom: 3 }}>
                        {r.head}
                      </div>
                      <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.75 }}>{r.body}</div>
                    </div>
                  ))}
                  {/*  ★그 띠에서 각 신살이 «어느 지지» 인지 — 방향을 찾으실 때 쓰십니다 */}
                  <div style={{
                    marginTop: 10, paddingTop: 10, borderTop: `1px solid ${LINE}`,
                    fontSize: 11.5, color: SUB, lineHeight: 1.8,
                  }}>
                    {(['반안', '망신', '역마', '화개', '지살', '장성', '연살', '육해', '월살', '천살'] as const).map(nm => {
                      const ji = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
                        .find(j => getSinsal(tti, j) === nm)
                      return ji ? <span key={nm} style={{ marginRight: 10 }}>{nm} <b style={{ color: INK }}>{ji}</b></span> : null
                    })}
                  </div>
                </div>
              )
            })()}

            {/*  🔴 ★열두 지지 표는 «문점일 칸» 으로 올렸습니다 — 2026-09-15 (10부) [대표님]
              *     「열두지지 표는 여기 위치가 맞나? 사람마다 모두 다른가?」
              *  ⇒ ★사람마다 «다르지 않습니다». sinGungTable(ilJi) 하나로만 정해집니다.
              *    생년월일·시·성별을 ★한 글자도 안 씁니다.
              *  ⇒ 그러니 이것은 «손님 풀이» 가 아니라 ★그날의 «범례» 입니다.
              *    ⛔ 맨 아래로 다시 내리지 마십시오 — 읽는 차례가 거꾸로가 됩니다. */}

            {/* ── 곁들이 : 오늘의 운세(띠) · 신년 운세(달) ── */}
            <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 3 }}>
                띠로 보는 오늘 <span style={{ fontWeight: 400, color: SUB }}>(교재 9쪽)</span>
              </div>
              {/*  ⚠️ ★교재 제목이 「그날에만 유용」 입니다 — 문점일이 바뀌면 값도 바뀝니다.
                *     ⇒ 그 단서를 «화면에» 둡니다. 안 두면 언제 쓰는 것인지 모릅니다.
                *  ⚠️ 사주를 몰라도 ★띠만으로 봅니다 (전화로 물어 오실 때 쓰는 자리). */}
              <div style={{ fontSize: 11, color: SUB, marginBottom: 8, lineHeight: 1.6 }}>
                사주를 모르실 때 띠만으로 보는 법이에요. 문점일 그날에만 씁니다.
              </div>
              {/*  ★손님 띠는 «요약 한 줄» 로 먼저 — 열둘 속에서 찾지 않으셔도 되게 */}
              <div style={{
                border: `1.5px solid ${ACCENT}`, background: '#fff3ec',
                borderRadius: 10, padding: '9px 11px', marginBottom: 9,
              }}>
                <div style={{ fontSize: 13, color: INK }}>
                  <span style={{ fontSize: 11.5, color: SUB, marginRight: 6 }}>이 손님</span>
                  {ttiNameOf(data.tti.ji)} {data.tti.ji} → {sinButton(data.tti.sin, { fontWeight: 700 })}
                </div>
              </div>

              {/*  🔴 ★열두 띠를 «알약» 으로 — 2026-09-15 (10부) [대표님]
                *  ⚠️ 교재 9쪽은 원래 ★「사주를 몰라도 띠만으로」 보는 자리인데
                *     그 전에는 ★손님 띠 «하나» 만 나와 그 쓰임이 죽어 있었습니다.
                *     ⇒ 전화로 물어 오시는 분께 바로 짚어 드릴 수 있습니다.
                *  ⛔ ★띠 이름을 여기서 «새로» 적지 마십시오 —
                *     lib/saju/jijiTrait.ts 에 이미 있습니다 (9부 교훈 ⑤ 공용 부품). */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 16 }}>
                {data.table.map(x => {
                  const mine = x.ji === data.tti.ji
                  return (
                    <button key={x.ji} type="button"
                      onClick={() => setOpenTti({ ji: x.ji, sin: x.sin })}
                      style={{
                        border: `${mine ? 1.5 : 1}px solid ${mine ? ACCENT : LINE}`,
                        borderRadius: 9, padding: '7px 3px', textAlign: 'center',
                        background: mine ? '#fff3ec' : '#fff', cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: mine ? ACCENT : INK }}>
                        {ttiNameOf(x.ji)}
                      </div>
                      <div style={{ fontSize: 10, color: SUB }}>{x.ji}</div>
                      <div style={{
                        fontSize: 10.5, color: isGoodSin(x.sin as SinGung) ? GOOD : BAD,
                        borderBottom: `1px dotted ${LINE}`,
                      }}>{x.sin}</div>
                    </button>
                  )
                })}
              </div>

              <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 3 }}>
                달로 보는 한 해 <span style={{ fontWeight: 400, color: SUB }}>(교재 10~11쪽)</span>
              </div>
              {/*  ⚠️ 교재가 ★「상담하러 방문한 날을 기준으로 한다」 고 못 박았습니다 */}
              {/*  ⛔ ★«음력» 달입니다 (1월=寅 … 12월=丑 · 교재 10쪽).
                *     밝혀 두지 않으면 ★양력 달로 보십니다. */}
              <div style={{ fontSize: 11, color: SUB, marginBottom: 8, lineHeight: 1.6 }}>
                문점일을 기준으로 잡습니다. 날을 바꾸면 열두 달이 함께 바뀝니다.
                달은 <b>음력</b> 기준이에요 (1월 寅 … 12월 丑).
              </div>
              {/*  🔴 ★열두 달을 «알약» 으로 — 2026-09-15 (10부) [대표님]
                *  ⚠️ 그 전에는 ★열두 덩이 글이 «한꺼번에» 펼쳐져 화면이 길었습니다
                *     (대표님 사진 두 장이 이 부분뿐이었습니다).
                *  ⛔ 다시 풀어 늘어놓지 마십시오. */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {data.months.map(m => {
                  //  ★문점일이 든 달 — 어디부터 보는지 알 수 있게 표시합니다
                  const now = m.ji === data.mun.ilJi
                  return (
                    <button key={m.wol} type="button" onClick={() => setOpenWol(m)}
                      style={{
                        border: `${now ? 1.5 : 1}px solid ${now ? ACCENT : LINE}`,
                        borderRadius: 9, padding: '7px 3px', textAlign: 'center',
                        background: now ? '#fff3ec' : '#fff', cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: now ? ACCENT : INK }}>
                        {m.wol}월
                      </div>
                      <div style={{ fontSize: 10, color: SUB }}>{m.ji}</div>
                      <div style={{
                        fontSize: 10.5, color: m.sin && isGoodSin(m.sin as SinGung) ? GOOD : BAD,
                        borderBottom: `1px dotted ${LINE}`,
                      }}>{m.sin}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
        {/*  🔴🔴 ★자리 모달 — 2026-09-15 (10부) [대표님]
          *     「리포트의 일지·연지·월지·시지를 누르면 모달로 각각 나오게」
          *
          *  ⚠️ ★옛 «자리별 카드» 가 담던 것을 «다» 물려받았습니다 —
          *     자리 뜻 · 신궁 한자 · 딴이름 · 통변(lead) · 사례 ★세 줄(쪽수·일진).
          *  ⛔ 사례를 ★«두 줄» 로 줄이지 마십시오 — 리포트가 두 줄, 여기가 세 줄입니다.
          *    (리포트는 «훑는» 자리, 여기는 «짚는» 자리입니다) */}
        {openJari && (() => {
          const h = openJari
          const lines = h.jariText ? [] : caseLinesFor(h.jari as JariKey, h.sin as never, 3, purpose || null)
          return (
            <div role="dialog" aria-modal="true" aria-label={`${h.jari} 풀이`}
              onClick={() => setOpenJari(null)}
              style={{
                position: 'fixed', inset: 0, zIndex: 60,
                background: 'rgba(40,30,24,0.42)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              }}>
              <div onClick={e => e.stopPropagation()}
                style={{
                  width: '100%', maxWidth: 440, maxHeight: '82vh', overflowY: 'auto',
                  background: BG, borderRadius: '18px 18px 0 0', padding: '16px 16px 28px',
                }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: INK }}>{h.jari}</span>
                  <span style={{ fontSize: 16, color: INK }}>{h.ji ?? '—'}</span>
                  {h.sin && (
                    <span style={{ fontSize: 15, fontWeight: 700, color: h.good ? GOOD : BAD }}>
                      {sinButton(h.sin)}{h.hanja ? ` ${h.hanja}` : ''}
                    </span>
                  )}
                  <button type="button" onClick={() => setOpenJari(null)}
                    style={{
                      marginLeft: 'auto', background: 'transparent', border: 'none',
                      color: SUB, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                    }} aria-label="닫기">×</button>
                </div>
                <div style={{ fontSize: 11.5, color: SUB, marginBottom: 12, lineHeight: 1.6 }}>
                  {h.jariMeaning}
                  {h.alias.length > 0 && <> · {h.alias.join(' · ')}</>}
                  {pickedJari.includes(h.jari) && (
                    <span style={{ marginLeft: 6, color: ACCENT }}>이 질문의 자리</span>
                  )}
                </div>

                {/*  ⛔ ★시를 모르면 «사실대로» — 지어내지 않습니다 */}
                {!h.ji && (
                  <div style={{ fontSize: 12.5, color: SUB, lineHeight: 1.7 }}>
                    태어난 시를 몰라 시지를 보지 않았어요.
                  </div>
                )}
                {h.lead && (
                  <div style={{
                    fontSize: 12.5, color: INK, lineHeight: 1.85,
                    background: CARD, border: `1px solid ${LINE}`, borderRadius: 12,
                    padding: '11px 12px', marginBottom: 11,
                  }}>{withTerms(h.lead)}</div>
                )}
                {h.tteut && (
                  <div style={{ fontSize: 13, color: INK, lineHeight: 1.85, marginBottom: 11 }}>
                    {withTerms(h.tteut)}
                  </div>
                )}
                {h.sin && (h.jariText
                  ? <div style={{
                      fontSize: 13, color: INK, lineHeight: 1.8,
                      background: CARD, borderRadius: 12, padding: '11px 12px',
                      border: `1px solid ${LINE}`,
                    }}>{withTerms(h.jariText)}</div>
                  : (
                    <>
                      {/*  🔴 ⛔ 교재에 «자리별 풀이가 없는» 넷(공망·원진·해결·퇴식) */}
                      <div style={{ fontSize: 12, color: SUB, lineHeight: 1.7 }}>
                        교재에 이 신궁의 «자리별» 풀이는 없습니다.
                        {lines.length > 0 && ' 교재 사례에서는 이렇게 풀었습니다 —'}
                      </div>
                      {lines.map(l => (
                        <div key={l.page + l.text.slice(0, 10)} style={{
                          marginTop: 7, fontSize: 12.5, color: INK, lineHeight: 1.8,
                          background: CARD, border: `1px solid ${LINE}`,
                          borderRadius: 12, padding: '10px 12px',
                        }}>
                          {withTerms(l.text)}
                          <span style={{ marginLeft: 6, fontSize: 11, color: SUB }}>
                            ({l.page} · {l.iljin})
                          </span>
                        </div>
                      ))}
                    </>
                  )
                )}
              </div>
            </div>
          )
        })()}

        {/*  🔴 ★운시 모달 — 2026-09-15 (10부) [대표님]
          *  ⚠️ ★문점일과 «무관» 합니다 — 평생 고정입니다. 모달이 그것을 밝힙니다.
          *  ⛔ 해당되지 «않는» 덧말(괴강·백호·연지동일·반안)은 안 보여 줍니다. */}
        {openUnsi && data?.unsi && (() => {
          const u = data.unsi
          return (
            <div role="dialog" aria-modal="true" aria-label="운시 풀이"
              onClick={() => setOpenUnsi(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 60,
                background: 'rgba(40,30,24,0.42)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              }}>
              <div onClick={e => e.stopPropagation()}
                style={{
                  width: '100%', maxWidth: 440, maxHeight: '82vh', overflowY: 'auto',
                  background: BG, borderRadius: '18px 18px 0 0', padding: '16px 16px 28px',
                }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: INK }}>운시 運始</span>
                  <span style={{ fontSize: 16, color: INK }}>{u.ganji}</span>
                  {/*  ⚠️ 이건 ★십성입니다 — 신궁이 «아닙니다». 용어 모달로 보냅니다. */}
                  {isSipsungName(u.sipsung) ? (
                    <button type="button"
                      onClick={() => setOpenTerm({ word: u.sipsung, key: u.sipsung, kind: 'sipsung' })}
                      style={{
                        background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: ACCENT,
                        borderBottom: `1px dotted ${ACCENT}`,
                      }}>{u.sipsung}</button>
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 700, color: ACCENT }}>{u.sipsung}</span>
                  )}
                  <span style={{ fontSize: 11.5, color: SUB }}>{u.age}세부터</span>
                  <button type="button" onClick={() => setOpenUnsi(false)}
                    style={{
                      marginLeft: 'auto', background: 'transparent', border: 'none',
                      color: SUB, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                    }} aria-label="닫기">×</button>
                </div>
                <div style={{ fontSize: 11.5, color: SUB, marginBottom: 12, lineHeight: 1.6 }}>
                  첫 대운이에요. 문점일과 상관없이 평생 그대로입니다. · 교재 8쪽
                </div>

                {u.sipsungText && (
                  <div style={{
                    fontSize: 13, color: INK, lineHeight: 1.85,
                    background: CARD, border: `1px solid ${LINE}`, borderRadius: 12,
                    padding: '11px 12px', marginBottom: 11,
                  }}>{withTerms(u.sipsungText)}</div>
                )}
                {/*  ⚠️ 해당될 때만 보입니다 — ⛔ 아닌 것을 «있는 척» 하지 않습니다 */}
                {([
                  [u.gwaegang, data.unsiNote['괴강']],
                  [u.baekho, data.unsiNote['백호']],
                  [u.sameYeonji, data.unsiNote['연지동일']],
                  [u.banan, data.unsiNote['반안']],
                ] as const).filter(([on]) => on).map(([, t]) => (
                  <div key={t} style={{
                    fontSize: 12.5, color: INK, lineHeight: 1.75,
                    borderLeft: `2px solid ${ACCENT}`, paddingLeft: 9, marginBottom: 8,
                  }}>{t}</div>
                ))}
                <div style={{ fontSize: 12, color: SUB, lineHeight: 1.7, marginTop: 8 }}>
                  {data.unsiNote['고초살']}
                  {u.samhap.length > 0 && (
                    <> <b style={{ color: INK }}>({u.ganji[1]} 삼합 — {u.samhap.join(' · ')})</b></>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {/*  🔴 ★띠 모달 — 2026-09-15 (10부) [대표님]
          *  ⛔ 교재 9쪽에 «줄이 없는» 둘(상문·공망)은 ★사실대로 말합니다. */}
        {openTti && (() => {
          const t = openTti
          const text = TTI_TEXT[t.sin as SinGung]
          return (
            <div role="dialog" aria-modal="true" aria-label={`${ttiNameOf(t.ji)} 오늘`}
              onClick={() => setOpenTti(null)}
              style={{
                position: 'fixed', inset: 0, zIndex: 60,
                background: 'rgba(40,30,24,0.42)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              }}>
              <div onClick={e => e.stopPropagation()}
                style={{
                  width: '100%', maxWidth: 440, maxHeight: '82vh', overflowY: 'auto',
                  background: BG, borderRadius: '18px 18px 0 0', padding: '16px 16px 28px',
                }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: INK }}>{ttiNameOf(t.ji)}</span>
                  <span style={{ fontSize: 15, color: INK }}>{t.ji}</span>
                  <span style={{
                    fontSize: 15, fontWeight: 700,
                    color: isGoodSin(t.sin as SinGung) ? GOOD : BAD,
                  }}>{t.sin}</span>
                  <button type="button" onClick={() => setOpenTti(null)}
                    style={{
                      marginLeft: 'auto', background: 'transparent', border: 'none',
                      color: SUB, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                    }} aria-label="닫기">×</button>
                </div>
                <div style={{ fontSize: 11.5, color: SUB, marginBottom: 12, lineHeight: 1.6 }}>
                  문점일 {data?.mun.ganji} 기준 · 교재 9쪽
                  {t.ji === data?.tti.ji && <span style={{ marginLeft: 6, color: ACCENT }}>이 손님의 띠</span>}
                </div>
                {text
                  ? <div style={{
                      fontSize: 13, color: INK, lineHeight: 1.85,
                      background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: '11px 12px',
                    }}>{withTerms(text)}</div>
                  : <div style={{ fontSize: 12.5, color: SUB, lineHeight: 1.7 }}>
                      교재 9쪽에 이 신궁의 줄은 없습니다. 위 자리별 풀이로 보십시오.
                    </div>}
              </div>
            </div>
          )
        })()}

        {/*  🔴 ★달 모달 — 2026-09-15 (10부) [대표님]
          *  ⛔ ★음력 달입니다 (1월=寅 … 12월=丑 · 교재 10쪽). */}
        {openWol && (() => {
          const m = openWol
          return (
            <div role="dialog" aria-modal="true" aria-label={`음력 ${m.wol}월`}
              onClick={() => setOpenWol(null)}
              style={{
                position: 'fixed', inset: 0, zIndex: 60,
                background: 'rgba(40,30,24,0.42)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              }}>
              <div onClick={e => e.stopPropagation()}
                style={{
                  width: '100%', maxWidth: 440, maxHeight: '82vh', overflowY: 'auto',
                  background: BG, borderRadius: '18px 18px 0 0', padding: '16px 16px 28px',
                }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: INK }}>음력 {m.wol}월</span>
                  <span style={{ fontSize: 15, color: INK }}>{m.ji}</span>
                  {sinButton(m.sin, { fontSize: 15, fontWeight: 700 })}
                  <button type="button" onClick={() => setOpenWol(null)}
                    style={{
                      marginLeft: 'auto', background: 'transparent', border: 'none',
                      color: SUB, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                    }} aria-label="닫기">×</button>
                </div>
                <div style={{ fontSize: 11.5, color: SUB, marginBottom: 12, lineHeight: 1.6 }}>
                  문점일 {data?.mun.ganji} 기준 · 교재 10~11쪽 · 달은 음력입니다
                </div>
                {m.text
                  ? <div style={{
                      fontSize: 13, color: INK, lineHeight: 1.85,
                      background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: '11px 12px',
                    }}>{withTerms(m.text)}</div>
                  : <div style={{ fontSize: 12.5, color: SUB, lineHeight: 1.7 }}>
                      교재 10~11쪽에 이 신궁의 줄은 없습니다.
                    </div>}
              </div>
            </div>
          )
        })()}

        {/*  🔴 ★신궁 설명 모달 — 2026-09-15 [대표님]
          *     열두 지지 칸을 누르면 뜹니다.
          *  ⛔ 교재 3~7쪽 글을 «그대로» 보여 줍니다 (연재쌤 전용이라 순화 없음).
          *  ⚠️ ★자리별 풀이가 «없는» 넷(공망·원진·해결·퇴식)은
          *     교재 «사례» 문장으로 채웁니다 — 쪽수와 함께. ⛔ 지어내지 않습니다. */}
        {openSin && (() => {
          const t = SINGUNG_TEXT[openSin]
          const good = isGoodSin(openSin)
          return (
            <div
              role="dialog" aria-modal="true" aria-label={`${openSin} 설명`}
              onClick={() => setOpenSin(null)}
              style={{
                position: 'fixed', inset: 0, zIndex: 60,
                background: 'rgba(40,30,24,0.42)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              }}>
              {/*  ⛔ 안쪽을 눌렀을 때는 «안» 닫히게 합니다 */}
              <div onClick={e => e.stopPropagation()}
                style={{
                  width: '100%', maxWidth: 440, maxHeight: '82vh', overflowY: 'auto',
                  background: BG, borderRadius: '18px 18px 0 0', padding: '16px 16px 28px',
                }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: good ? GOOD : BAD }}>{openSin}</span>
                  <span style={{ fontSize: 13, color: SUB }}>{t.hanja}</span>
                  {t.alias.length > 0 && (
                    <span style={{ fontSize: 11.5, color: SUB }}>· {t.alias.join(' · ')}</span>
                  )}
                  <button type="button" onClick={() => setOpenSin(null)}
                    style={{
                      marginLeft: 'auto', background: 'transparent', border: 'none',
                      color: SUB, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                    }} aria-label="닫기">×</button>
                </div>
                <div style={{ fontSize: 11.5, color: SUB, marginBottom: 12 }}>
                  {good ? '좋은 신궁' : '나쁜 신궁'} · 교재 7쪽
                </div>

                <div style={{ fontSize: 13, color: INK, lineHeight: 1.85, marginBottom: 12 }}>{t.tteut}</div>
                <div style={{
                  fontSize: 12.5, color: INK, lineHeight: 1.85,
                  background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: '11px 12px',
                  marginBottom: 12,
                }}>{t.lead}</div>

                {/*  ★네 자리별로 — 교재에 있으면 그대로, 없으면 «사례» 로 */}
                {(['연지', '월지', '일지', '시지'] as const).map(j => {
                  const one = t.jari ? t.jari[j] : null
                  const lines = one ? [] : caseLinesFor(j as JariKey, openSin, 2)
                  return (
                    <div key={j} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, marginBottom: 4 }}>{j}</div>
                      {one ? (
                        <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.8 }}>{one}</div>
                      ) : lines.length > 0 ? (
                        lines.map(l => (
                          <div key={l.page + l.text.slice(0, 8)} style={{
                            fontSize: 12.5, color: INK, lineHeight: 1.8, marginBottom: 5,
                          }}>
                            {l.text}
                            <span style={{ marginLeft: 5, fontSize: 11, color: SUB }}>({l.page} · {l.iljin})</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: 12, color: SUB, lineHeight: 1.7 }}>
                          교재에 이 자리의 풀이가 없습니다.
                        </div>
                      )}
                    </div>
                  )
                })}

                {!t.jari && (
                  <div style={{ fontSize: 11, color: SUB, lineHeight: 1.7, marginTop: 4 }}>
                    교재 4~7쪽에 이 신궁의 «자리별» 풀이는 없어, 교재 «사례» 에서 옮겨 왔습니다.
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/*  🔴 ★용어 모달 — 2026-09-15 [대표님]
          *     본문 속 낱말을 누르면 뜹니다. ★12신궁 · 십성 · 신살 셋 다.
          *  ⛔⛔ ★출전이 «셋» 이라 «어느 책인지» 를 «반드시» 밝힙니다.
          *     안 밝히면 연재쌤이 「일진내정법 교재에 있는 말」 로 오해하십니다.
          *  ⛔ 순화 «안» 합니다 — 연재쌤 전용입니다 [대표님]. */}
        {openTerm && (() => {
          const t = openTerm
          //  ⚠️ 12신궁은 ★«누를 때» 신궁 모달로 갑니다 (위 withTerms) — 여기 안 옵니다

          let title = t.word
          let src = TERM_SRC[t.kind]
          let lines: string[] = []
          let sub = ''

          if (t.kind === 'sipsung' && isSipsungName(t.key)) {
            const r = YUKCHIN_TABLE[t.key as YukchinKey]
            title = `${t.key} · ${r.pair}`
            sub = r.keyword
            //  ⚠️ 조건이 붙은 줄({t, when})은 ★조건을 모르니 «안» 보여 줍니다
            lines = r.say.filter((x): x is string => typeof x === 'string')
          } else if (t.kind === 'sinsal') {
            if (t.key.startsWith('s12:')) {
              const k = t.key.slice(4)
              const sec = (SINSAL12 as unknown as { sections: { key: string; label: string; lines?: string[] }[] })
                .sections.find(x => x.key === k)
              title = sec?.label ?? t.word
              lines = sec?.lines ?? []
              src = '교재 441~454쪽 · 12신살 — ⚠️ 일진내정법 교재가 아닙니다'
            } else {
              const r = findSal(t.key)
              title = r?.name ? `${r.name} ${r.hanja ?? ''}`.trim() : t.word
              lines = salLines(t.key, '성인')
              src = '사주 교재 94~97쪽 — ⚠️ 일진내정법 교재가 아닙니다'
            }
          }

          return (
            <div role="dialog" aria-modal="true" aria-label={`${t.word} 설명`}
              onClick={() => setOpenTerm(null)}
              style={{
                position: 'fixed', inset: 0, zIndex: 60,
                background: 'rgba(40,30,24,0.42)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              }}>
              <div onClick={e => e.stopPropagation()}
                style={{
                  width: '100%', maxWidth: 440, maxHeight: '82vh', overflowY: 'auto',
                  background: BG, borderRadius: '18px 18px 0 0', padding: '16px 16px 28px',
                }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: INK }}>{title}</span>
                  <button type="button" onClick={() => setOpenTerm(null)}
                    style={{
                      marginLeft: 'auto', background: 'transparent', border: 'none',
                      color: SUB, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                    }} aria-label="닫기">×</button>
                </div>
                {sub && (
                  <div style={{ fontSize: 11.5, color: SUB, lineHeight: 1.6, marginBottom: 10 }}>{sub}</div>
                )}

                {lines.length > 0 ? (
                  lines.map((l, i) => (
                    <div key={i} style={{
                      fontSize: 12.5, color: INK, lineHeight: 1.85, marginBottom: 7,
                    }}>{l}</div>
                  ))
                ) : (
                  //  ⛔ 표에 없으면 ★사실대로 — 지어내지 않습니다
                  <div style={{ fontSize: 12.5, color: SUB, lineHeight: 1.7 }}>
                    이 말의 설명이 저장소에 아직 없습니다.
                  </div>
                )}

                {/*  ⛔⛔ ★어느 책에서 온 말인지 «반드시» 밝힙니다 */}
                <div style={{
                  marginTop: 12, paddingTop: 10, borderTop: `1px solid ${LINE}`,
                  fontSize: 11, color: SUB, lineHeight: 1.6,
                }}>{src}</div>
              </div>
            </div>
          )
        })()}

        {/*  ★글이 길어 아래까지 내려오신 분을 위해 «한 번 더» 둡니다 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={() => router.push('/mypage-new')}
            style={{
              flex: 1, padding: 12, borderRadius: 12, background: CARD,
              border: `1px solid ${LINE}`, color: SUB, fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>내 정보로</button>
          <button type="button" onClick={() => router.push('/home-new')}
            style={{
              flex: 1, padding: 12, borderRadius: 12, background: ACCENT,
              border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>🏠 홈으로</button>
        </div>
        <button type="button" onClick={() => router.push('/naejeong/storage')}
          style={{
            width: '100%', marginTop: 8, padding: 11, borderRadius: 12,
            background: CARD, border: `1px solid ${LINE}`, color: ACCENT,
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>📁 상담 보관함</button>
      </div>
    </main>
  )
}
