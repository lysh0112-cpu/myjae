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
  tti: { ji: string; sin: string | null }
  months: { wol: number; ji: string; sin: string | null }[]
}

const HOURS = [
  '子 23:30~01:29', '丑 01:30~03:29', '寅 03:30~05:29', '卯 05:30~07:29',
  '辰 07:30~09:29', '巳 09:30~11:29', '午 11:30~13:29', '未 13:30~15:29',
  '申 15:30~17:29', '酉 17:30~19:29', '戌 19:30~21:29', '亥 21:30~23:29',
]

export default function NaejeongPage() {
  const gate = useRoleGate(ONLY)

  const today = new Date()
  const [mun, setMun] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`)
  const [cal, setCal] = useState<'양력' | '음력'>('양력')
  const [leap, setLeap] = useState(false)
  const [birth, setBirth] = useState('')
  const [hourIdx, setHourIdx] = useState<string>('')
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
        }),
      })
      const j = await res.json()
      if (!res.ok) { setErr(j?.error || '셈하지 못했어요.'); setData(null); return }
      setData(j as Out)
    } catch {
      setErr('불러오지 못했어요.')
    } finally { setBusy(false) }
  }, [mun, birth, cal, leap, hourIdx])

  if (gate.state !== 'ok') return <RoleGateScreen gate={gate} dark={false} />

  const inputStyle = {
    width: '100%', padding: '11px 12px', borderRadius: 10,
    border: `1px solid ${LINE}`, background: '#fff', fontSize: 14,
    color: INK, fontFamily: 'inherit', boxSizing: 'border-box' as const,
  }

  return (
    <main style={{ minHeight: '100vh', background: BG, padding: '16px 14px 40px' }}>
      <div style={{ maxWidth: 440, margin: '0 auto' }}>

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
              <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 6 }}>
                띠로 보는 오늘 <span style={{ fontWeight: 400, color: SUB }}>(교재 9쪽)</span>
              </div>
              <div style={{ fontSize: 13, color: INK, marginBottom: 12 }}>
                {data.tti.ji} → <b>{data.tti.sin ?? '—'}</b>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 6 }}>
                달로 보는 한 해 <span style={{ fontWeight: 400, color: SUB }}>(교재 10~11쪽)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {data.months.map(m => (
                  <div key={m.wol} style={{
                    border: `1px solid ${LINE}`, borderRadius: 9, padding: '6px 4px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 11, color: SUB }}>{m.wol}월 {m.ji}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: INK }}>{m.sin}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
