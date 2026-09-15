'use client'

/**
 *  일진내정법 — ★상담 보관함  (2026-09-15 · 9부)
 *  [대표님] 「완성된 종합 내정 리포트와 사주 데이터를 저장하고 관리」
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │  ⛔⛔ ★연재쌤 전용입니다 — /naejeong 과 «같은 문지기».             │
 *  │     · 화면  useRoleGate(['master'])                              │
 *  │     · ⚠️ 담고 읽는 것은 ★saju_records 가 «본인 것만» 내줍니다.     │
 *  │                                                                  │
 *  │  ⛔ [개인정보]  손님 생년월일과 «상담 메모» 가 들어 있습니다.       │
 *  │     · ★손님 «이름» 은 «안» 받습니다 — 딱지가 «사주» 로만 적힙니다. │
 *  │     · ⛔ 목록을 주소에 싣지 «않습니다» (7부 교훈).                 │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 *  ⚠️ ★다른 보관함 열다섯과 «같은 부품»(listRecordsByService)을 씁니다.
 *     ⛔ 새로 짓지 마십시오 (8부 §6④).
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRoleGate, RoleGateScreen, type AppRole } from '@/hooks/useRoleGate'
import { listRecordsByService, deleteRecord, type SajuRecord } from '@/lib/saju/sajuRecords'

const ONLY: AppRole[] = ['master']

const BG = '#FDF6F0'
const CARD = '#fff'
const LINE = '#eadfd4'
const INK = '#2f2622'
const SUB = '#7b6a5f'
const ACCENT = '#96502e'
const BAD = '#a8443c'

/** 담아 둔 리포트 — ⛔ 없는 칸은 «지어내지» 않고 빈 채로 둡니다 */
interface Saved {
  mun?: { ganji?: string; ilJi?: string }
  saju?: { yeon?: string; wol?: string; il?: string; si?: string | null }
  chongpyeong?: string[]
  hits?: { jari: string; ji: string | null; sin: string | null }[]
  memo?: string
}

export default function NaejeongStoragePage() {
  const gate = useRoleGate(ONLY)
  const router = useRouter()

  const [rows, setRows] = useState<SajuRecord[] | null>(null)
  const [open, setOpen] = useState<string>('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    //  ⚠️ ★result_data 를 «함께» 싣습니다 — 리포트와 메모가 거기 있습니다.
    //     (8부 하락이수가 이것을 빠뜨려 「볼 해가 이상해요」 가 났습니다)
    const r = await listRecordsByService('naejeong', true)
    setRows(r)
  }, [])

  /*  ⚠️ ★eslint 가 «effect 안에서 바로 setState» 를 막습니다.
   *     ⇒ 부르는 것은 ★«비동기» 라 곧바로 바뀌지 않습니다 — 그래서 감쌉니다.
   *  ⛔ 기준선(85/147)을 늘리지 않으려는 것입니다. */
  useEffect(() => {
    if (gate.state !== 'ok') return
    let alive = true
    void (async () => {
      const r = await listRecordsByService('naejeong', true)
      if (alive) setRows(r)
    })()
    return () => { alive = false }
  }, [gate.state])

  if (gate.state !== 'ok') return <RoleGateScreen gate={gate} dark={false} />

  const remove = async (id: string) => {
    if (busy) return
    setBusy(true)
    try {
      await deleteRecord(id)
      await load()
      setOpen('')
    } finally { setBusy(false) }
  }

  return (
    <main style={{ minHeight: '100vh', background: BG, padding: '16px 14px 40px' }}>
      <div style={{ maxWidth: 440, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <button type="button" onClick={() => router.push('/naejeong')}
            style={{
              background: 'transparent', border: 'none', color: SUB, fontSize: 12.5,
              cursor: 'pointer', fontFamily: 'inherit', padding: 0,
            }}>‹ 일진내정법</button>
          <button type="button" onClick={() => router.push('/home-new')}
            style={{
              background: CARD, border: `1px solid ${LINE}`, borderRadius: 999,
              color: ACCENT, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              padding: '6px 13px',
            }}>🏠 홈</button>
        </div>

        <div style={{ fontSize: 11.5, color: SUB, marginBottom: 2 }}>일진내정법</div>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: INK, margin: '0 0 4px' }}>상담 보관함</h1>
        {/*  ⛔ ★전용임을 «화면에도» 밝혀 둡니다 */}
        <div style={{
          fontSize: 11.5, color: ACCENT, background: '#fff3ec',
          border: `1px solid ${LINE}`, borderRadius: 8, padding: '7px 9px', marginBottom: 14,
          lineHeight: 1.6,
        }}>
          연재쌤 전용이에요. 손님 사주와 상담 메모가 담겨 있으니 살펴 다루십시오.
        </div>

        {rows === null ? (
          <div style={{ fontSize: 12.5, color: SUB, textAlign: 'center', padding: '20px 0' }}>
            불러오는 중이에요…
          </div>
        ) : rows.length === 0 ? (
          //  ⛔ 빈 채로 두지 않고 «무엇을 하면 되는지» 알려 드립니다
          <div style={{
            background: CARD, border: `1px solid ${LINE}`, borderRadius: 14,
            padding: '22px 14px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, color: INK, marginBottom: 6 }}>아직 담은 상담이 없어요.</div>
            <div style={{ fontSize: 11.5, color: SUB, lineHeight: 1.7 }}>
              일진내정법에서 리포트를 보시고 <b>보관함에 담기</b>를 누르시면 여기에 쌓입니다.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(r => {
              const on = open === r.id
              const d = (r.resultData ?? {}) as Saved
              return (
                <div key={r.id} style={{
                  background: CARD, borderRadius: 14, padding: 13,
                  border: `1px solid ${on ? ACCENT : LINE}`,
                }}>
                  <button type="button" onClick={() => setOpen(on ? '' : r.id)}
                    style={{
                      width: '100%', textAlign: 'left', background: 'transparent',
                      border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: SUB, marginTop: 3 }}>
                      {d.mun?.ganji ? `문점일 ${d.mun.ganji}` : ''}
                      {d.memo ? ' · 메모 있음' : ''}
                      <span style={{ marginLeft: 6, color: ACCENT }}>{on ? '▲ 접기' : '▼ 펼치기'}</span>
                    </div>
                  </button>

                  {on && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${LINE}` }}>
                      {/*  ★사주 */}
                      {d.saju && (
                        <div style={{
                          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5,
                          textAlign: 'center', marginBottom: 9,
                        }}>
                          {([['연', d.saju.yeon], ['월', d.saju.wol], ['일', d.saju.il], ['시', d.saju.si]] as const)
                            .map(([k, v]) => (
                              <div key={k} style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '6px 3px' }}>
                                <div style={{ fontSize: 9.5, color: SUB }}>{k}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: v ? INK : '#c4b5a8' }}>{v ?? '—'}</div>
                              </div>
                            ))}
                        </div>
                      )}

                      {/*  ★총괄 */}
                      {(d.chongpyeong ?? []).length > 0 && (
                        <div style={{
                          background: '#fbf6f1', borderRadius: 10, padding: '9px 11px', marginBottom: 9,
                        }}>
                          {d.chongpyeong!.map(l => (
                            <div key={l} style={{ fontSize: 12, color: INK, lineHeight: 1.8 }}>{l}</div>
                          ))}
                        </div>
                      )}

                      {/*  ★네 자리 */}
                      {(d.hits ?? []).filter(h => h.sin).map(h => (
                        <div key={h.jari} style={{ fontSize: 12, color: INK, lineHeight: 1.8 }}>
                          <b>{h.jari}</b> {h.ji} <span style={{ color: ACCENT }}>{h.sin}</span>
                        </div>
                      ))}

                      {/*  🔴 ★상담 메모 — 연재쌤이 적으신 것 */}
                      {d.memo && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: INK, marginBottom: 4 }}>상담 메모</div>
                          <div style={{
                            fontSize: 12.5, color: INK, lineHeight: 1.85,
                            background: '#fbf6f1', borderRadius: 10, padding: '10px 11px',
                            whiteSpace: 'pre-wrap',
                          }}>{d.memo}</div>
                        </div>
                      )}

                      {/*  ⛔ 지우기는 «한 번 더» 여쭙지 않고 바로 지웁니다 —
                        *     ⚠️ 잘못 누르실 수 있어 «작게» 두고 색도 눈에 덜 띄게 했습니다. */}
                      <button type="button" onClick={() => remove(r.id)} disabled={busy}
                        style={{
                          marginTop: 11, background: 'transparent', border: 'none',
                          color: BAD, fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                        }}>이 기록 지우기</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
