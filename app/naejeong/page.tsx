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
//  ★교재 사례 풀이 — 1차(11~24쪽). ⛔ 순화 없이 교재 그대로.
import { caseTextOf, caseLinesFor, CASE_TEXT, type JariKey } from '@/lib/saju/naejeong/tables/caseText'
import { getSinsal } from '@/lib/saju/sinsal'
//  ★신궁 뜻 — 열두 지지 칸을 눌렀을 때 띄웁니다 (교재 3~7쪽)
import { SINGUNG_TEXT } from '@/lib/saju/naejeong/tables/sinGungText'
import { isGoodSin, type SinGung } from '@/lib/saju/naejeong/sinGung'

const ONLY: AppRole[] = ['master']

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
  const sortedHits = data
    ? [...data.hits].sort((a, b) => {
        const ia = pickedJari.indexOf(a.jari), ib = pickedJari.indexOf(b.jari)
        //  ⚠️ 고른 자리가 «둘» 이면 표에 적힌 차례대로 (맨 앞이 으뜸)
        const ra = ia < 0 ? 99 : ia, rb = ib < 0 ? 99 : ib
        return ra - rb
      })
    : []

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
          <button type="button" onClick={() => router.push('/home-new')}
            style={{
              background: CARD, border: `1px solid ${LINE}`, borderRadius: 999,
              color: ACCENT, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              padding: '6px 13px',
            }}>🏠 홈</button>
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

          {/*  🔴 ★교재에서 찾기 — 2026-09-15 [대표님]
            *  ⚠️ 손님 말은 ★«주소에 싣지도 저장하지도» 않습니다 (7부 ⛔ 교훈).
            *     그 자리에서 찾고 «버립니다».
            *  ⛔ 못 찾으면 ★「못 찾았어요」 라고 합니다 — «가장 가까운 것» 을 억지로 안 내밉니다. */}
          <label style={{ fontSize: 12.5, fontWeight: 700, color: INK, display: 'block', margin: '14px 0 6px' }}>
            교재에서 찾기 <span style={{ fontWeight: 400, color: SUB, fontSize: 11 }}>(손님 말을 그대로 적어 보세요)</span>
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setFound(lookup(q)) }}
              placeholder="아들이 유학 간다는데 형편이…"
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
                  교재에서 못 찾았어요. 아래 대분류에서 골라 보세요.
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
                                      <div style={{ fontSize: 10, color: one ? ACCENT : '#c4b5a8' }}>{one ?? '—'}</div>
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
                                    <div style={{ fontSize: 10, color: one ? ACCENT : '#c4b5a8' }}>{one ?? '—'}</div>
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
            {/* ── 문점일 · 사주 ── */}
            <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, color: SUB, marginBottom: 8 }}>
                문점일 <b style={{ color: INK, fontSize: 15 }}>{data.mun.ganji}</b>
                <span style={{ marginLeft: 8 }}>강일진 <b style={{ color: ACCENT }}>{data.mun.ilJi}</b></span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, textAlign: 'center' }}>
                {([['연주', data.saju.yeon], ['월주', data.saju.wol], ['일주', data.saju.il], ['시주', data.saju.si]] as const)
                  .map(([k, v]) => (
                    <div key={k} style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: '8px 4px' }}>
                      <div style={{ fontSize: 10.5, color: SUB }}>{k}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: v ? INK : '#c4b5a8' }}>{v ?? '—'}</div>
                    </div>
                  ))}
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

            {/* ── 🔴 네 자리 풀이 — 교재 그대로 ── */}
            {sortedHits.map(h => (
              <div key={h.jari} style={{
                background: CARD, borderRadius: 14, padding: 14, marginBottom: 10,
                //  ★고른 목적의 자리는 테두리로 도드라집니다
                border: pickedJari.includes(h.jari) ? `2px solid ${ACCENT}` : `1px solid ${LINE}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                  <b style={{ fontSize: 13.5, color: INK }}>{h.jari}</b>
                  <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>{h.ji ?? '—'}</span>
                  {h.sin && (
                    <span style={{
                      fontSize: 13.5, fontWeight: 700,
                      color: h.good ? GOOD : BAD,
                    }}>{h.sin}{h.hanja ? ` ${h.hanja}` : ''}</span>
                  )}
                  {pickedJari.includes(h.jari) && (
                    <span style={{
                      marginLeft: 'auto', fontSize: 10.5, color: ACCENT,
                      background: '#fff3ec', border: `1px solid ${LINE}`,
                      borderRadius: 999, padding: '2px 8px',
                    }}>이 질문의 자리</span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: SUB, marginBottom: 8 }}>{h.jariMeaning}</div>

                {!h.ji && (
                  <div style={{ fontSize: 12.5, color: SUB }}>
                    태어난 시를 몰라 시지를 보지 않았어요.
                  </div>
                )}
                {h.tteut && (
                  <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.75, marginBottom: 8 }}>{h.tteut}</div>
                )}
                {/*  🔴 ⛔ 교재에 «자리별 풀이가 없는» 신궁이 넷(공망·원진·해결·퇴식) 있습니다.
                  *     ⇒ ★사실대로 말합니다. 지어내지 않습니다. */}
                {h.sin && (h.jariText
                  ? <div style={{
                      fontSize: 13, color: INK, lineHeight: 1.8,
                      background: '#fbf6f1', borderRadius: 10, padding: '10px 11px',
                    }}>{h.jariText}</div>
                  : (() => {
                      /*  🔴 ★교재 4~7쪽에 «자리별 풀이가 없는» 넷(공망·원진·해결·퇴식) —
                        *     ⇒ 교재 «사례» 에서 «같은 자리 × 같은 신궁» 문장을 찾아 보여 드립니다.
                        *  ⛔ 지어내는 것이 «아닙니다» — 교재 문장을 «그대로» 오려서, ★쪽수와 함께. */
                      const lines = caseLinesFor(h.jari as JariKey, h.sin as never)
                      return (
                        <>
                          <div style={{ fontSize: 12, color: SUB, lineHeight: 1.7 }}>
                            교재에 이 신궁의 «자리별» 풀이는 없습니다.
                            {lines.length > 0 && ' 교재 사례에서는 이렇게 풀었습니다 —'}
                          </div>
                          {lines.map(l => (
                            <div key={l.page + l.text.slice(0, 10)} style={{
                              marginTop: 7, fontSize: 12.5, color: INK, lineHeight: 1.8,
                              background: '#fbf6f1', borderRadius: 10, padding: '9px 11px',
                            }}>
                              {l.text}
                              <span style={{ marginLeft: 6, fontSize: 11, color: SUB }}>
                                ({l.page} · {l.iljin})
                              </span>
                            </div>
                          ))}
                        </>
                      )
                    })()
                )}
              </div>
            ))}

            {/*  🔴 ★운시(運始) — 교재 8쪽
              *  ⚠️ ★문점일과 «무관» 합니다 — 평생 고정입니다. 화면이 그것을 밝힙니다.
              *  ⛔ 성별을 안 고르시면 ★안 보여 드립니다 (지어내지 않습니다). */}
            <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 3 }}>
                운시 運始 <span style={{ fontWeight: 400, color: SUB }}>(교재 8쪽)</span>
              </div>
              <div style={{ fontSize: 11, color: SUB, marginBottom: 8, lineHeight: 1.6 }}>
                첫 대운이에요. 문점일과 상관없이 평생 그대로입니다.
              </div>

              {!data.unsi ? (
                <div style={{ fontSize: 12.5, color: SUB, lineHeight: 1.7 }}>
                  성별을 고르시면 운시를 보여 드려요. 대운이 남녀에 따라 갈리기 때문이에요.
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 17, fontWeight: 700, color: INK }}>{data.unsi.ganji}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>{data.unsi.sipsung}</span>
                    <span style={{ fontSize: 11.5, color: SUB }}>{data.unsi.age}세부터</span>
                  </div>
                  {data.unsi.sipsungText && (
                    <div style={{
                      fontSize: 13, color: INK, lineHeight: 1.8,
                      background: '#fbf6f1', borderRadius: 10, padding: '10px 11px', marginBottom: 8,
                    }}>{data.unsi.sipsungText}</div>
                  )}
                  {/*  ⚠️ 해당될 때만 보입니다 — ⛔ 아닌 것을 «있는 척» 하지 않습니다 */}
                  {([
                    [data.unsi.gwaegang, data.unsiNote['괴강']],
                    [data.unsi.baekho, data.unsiNote['백호']],
                    [data.unsi.sameYeonji, data.unsiNote['연지동일']],
                    [data.unsi.banan, data.unsiNote['반안']],
                  ] as const).filter(([on]) => on).map(([, t]) => (
                    <div key={t} style={{
                      fontSize: 12.5, color: INK, lineHeight: 1.75,
                      borderLeft: `2px solid ${ACCENT}`, paddingLeft: 9, marginBottom: 7,
                    }}>{t}</div>
                  ))}
                  <div style={{ fontSize: 12, color: SUB, lineHeight: 1.7, marginTop: 8 }}>
                    {data.unsiNote['고초살']}
                    {data.unsi.samhap.length > 0 && (
                      <> <b style={{ color: INK }}>({data.unsi.ganji[1]} 삼합 — {data.unsi.samhap.join(' · ')})</b></>
                    )}
                  </div>
                </>
              )}
            </div>

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

            {/* ── 열두 지지 표 (교재 3쪽) ── */}
            <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 3 }}>열두 지지</div>
              <div style={{ fontSize: 11, color: SUB, marginBottom: 8 }}>눌러 보시면 뜻이 나와요.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {/*  ★누르면 그 신궁 설명이 뜹니다 [대표님 2026-09-15] */}
                {data.table.map(x => (
                  <button key={x.ji} type="button"
                    onClick={() => setOpenSin(x.sin as SinGung)}
                    style={{
                      border: `1px solid ${LINE}`, borderRadius: 9, padding: '7px 4px', textAlign: 'center',
                      background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{x.ji}</div>
                    <div style={{ fontSize: 10.5, color: SUB }}>{x.sin}</div>
                  </button>
                ))}
              </div>
            </div>

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
              <div style={{
                border: `1px solid ${LINE}`, borderRadius: 10, padding: '10px 11px', marginBottom: 16,
              }}>
                <div style={{ fontSize: 13, color: INK, marginBottom: data.tti.text ? 6 : 0 }}>
                  {data.tti.ji} → <b>{data.tti.sin ?? '—'}</b>
                </div>
                {/*  ⛔ 교재 9쪽에 «줄이 없는» 신궁(상문·공망)은 ★사실대로 말합니다 */}
                {data.tti.text
                  ? <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.75 }}>{data.tti.text}</div>
                  : <div style={{ fontSize: 11.5, color: SUB, marginTop: 6, lineHeight: 1.6 }}>
                      교재 9쪽에 이 신궁의 줄은 없습니다. 위 자리별 풀이로 보십시오.
                    </div>}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {data.months.map(m => (
                  <div key={m.wol} style={{
                    border: `1px solid ${LINE}`, borderRadius: 10, padding: '9px 11px',
                  }}>
                    <div style={{ fontSize: 12, marginBottom: m.text ? 5 : 0 }}>
                      <span style={{ color: SUB }}>음력 {m.wol}월 {m.ji}</span>
                      <b style={{ marginLeft: 7, color: INK, fontSize: 13 }}>{m.sin}</b>
                    </div>
                    {m.text && (
                      <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.75 }}>{m.text}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
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
      </div>
    </main>
  )
}
