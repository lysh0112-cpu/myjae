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

            {/* ── 🔴 네 자리 풀이 — 교재 그대로 ── */}
            {data.hits.map(h => (
              <div key={h.jari} style={{
                background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 14, marginBottom: 10,
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
                  : <div style={{ fontSize: 12, color: SUB, lineHeight: 1.7 }}>
                      교재에 이 신궁의 «자리별» 풀이는 없습니다. 위 뜻으로 보십시오.
                    </div>
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

            {/* ── 열두 지지 표 (교재 3쪽) ── */}
            <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 8 }}>열두 지지</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {data.table.map(x => (
                  <div key={x.ji} style={{
                    border: `1px solid ${LINE}`, borderRadius: 9, padding: '7px 4px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{x.ji}</div>
                    <div style={{ fontSize: 10.5, color: SUB }}>{x.sin}</div>
                  </div>
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
