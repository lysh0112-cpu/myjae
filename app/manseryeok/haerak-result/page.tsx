'use client'
/**
 * 하락이수 결과
 * ─────────────────────────────────────────────
 * 진입: haerak-input > 이 화면   ·   보관함 카드 > 이 화면(다시보기)
 *
 * ⛔ 셈은 ★/api/haerak 한 곳에서 합니다. 여기서 «다시 셈하지» 마십시오.
 * ⛔ AI 를 부르지 않습니다 — 순수 계산입니다.
 *
 * ⛔⛔ ★「원당」 이라는 낱말을 화면에 쓰지 마십시오  [대표님 2026-09-14]
 *    ⇒ 손님이 뜻을 모르는 말입니다. 「세 번째 자리」 처럼 숫자와 쉬운 말로만.
 *
 * ⚠️ ★글이 아직 없는 괘는 «지어내지» 않습니다 — 「옮기는 중」 이라고 말합니다.
 *    (지금은 64괘가 다 들어와 있어 빈 곳이 없습니다. 그래도 길은 남겨 둡니다.)
 */
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { saveRecord } from '@/lib/saju/sajuRecords'

const ACCENT = '#3f6fa8'
const BG = '#FDF6F0'
const CARD = '#FFFBF7'
const LINE = '#f0e0d5'
const INK = '#141c28'
const SUB = '#55636f'
/** 움직이는 자리 — ★붉은 줄 */
const MOVE = '#c0392b'

interface GwaeOut {
  no: number; name: string; ko: string; sang: string; ha: string
  hyo: boolean[]
  lead: string | null
  parts: { who: string; text: string }[] | null
  label: string | null
}
interface Out {
  target: number
  dongHyo: number
  su: { nyeon: number; wol: number; il: number }
  seoncheon: GwaeOut
  hucheon: GwaeOut
  geunggeo: {
    nyeonGanji: string; wolGanji: string; ilGanji: string
    nai: number; wolLastDay: number; eumWol: number; eumIl: number
  }
}

function HaerakResultInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const name = sp.get('name') || ''
  const recordId = sp.get('recordId')

  const [data, setData] = useState<Out | null>(null)
  const [err, setErr] = useState<string | null>(null)

  /*  ⚠️ ★여기서 setErr(null) 을 «맨 위» 에 두지 마십시오.
   *     화면이 뜨자마자 값을 바꾸는 꼴이 되어 검사(react-hooks)가 막습니다.
   *     ⇒ 기다린 «뒤» 에 바꿉니다. */
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/haerak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: sp.get('year'), month: sp.get('month'), day: sp.get('day'),
          calType: sp.get('calType'), leapMonth: sp.get('leapMonth'),
          target: sp.get('target'),
        }),
      })
      const j = await res.json()
      if (!res.ok) { setErr(j?.error || '셈하지 못했어요.'); return }
      setErr(null)
      setData(j as Out)
    } catch {
      setErr('불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
    }
  }, [sp])

  /*  ⚠️ ★effect 안에서 «곧바로» 값을 바꾸면 검사가 막습니다 (cascading render).
   *     ⇒ 한 박자 미뤄서 부릅니다. 화면이 먼저 뜨고, 그다음 셈이 옵니다.
   *     ⛔ 여기에 setState 를 «직접» 적지 마십시오. */
  useEffect(() => {
    const t = setTimeout(() => { void load() }, 0)
    return () => clearTimeout(t)
  }, [load])

  /*  ★보관함에 남깁니다 — ⛔ «다시보기» 로 들어온 것은 다시 저장하지 않습니다
   *     (7부 「새로 보는 길만 만들고 다시 보는 길을 안 만듦」 의 반대쪽 실수를 막습니다) */
  useEffect(() => {
    if (!data || recordId) return
    const y = sp.get('year'), m = sp.get('month'), d = sp.get('day')
    if (!y || !m || !d) return
    saveRecord({
      serviceType: 'haerak',
      title: name || '이름 없음',
      inputData: {
        gender: sp.get('gender') || '',
        calType: sp.get('calType') || '양력',
        year: y, month: m, day: d,
        leapMonth: sp.get('leapMonth') || '0',
        hour: sp.get('hour') || '모름',
      },
      //  ⚠️ ★볼 해를 여기에 담습니다 — 보관함 딱지가 이 값을 읽습니다.
      resultData: { year: data.target, seoncheon: data.seoncheon.no, hucheon: data.hucheon.no, dongHyo: data.dongHyo },
    })
  }, [data, recordId, name, sp])

  if (err) {
    return (
      <Wrap>
        <div style={{ background: CARD, border: `1.5px solid ${LINE}`, borderRadius: 16, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, color: INK, marginBottom: 12 }}>{err}</div>
          <button type="button" onClick={load} style={btn}>다시 해 보기</button>
        </div>
      </Wrap>
    )
  }
  if (!data) {
    return <Wrap><div style={{ padding: 40, textAlign: 'center', color: SUB, fontSize: 13 }}>괘를 짓는 중…</div></Wrap>
  }

  const g = data.geunggeo
  return (
    <Wrap>
      <button type="button" onClick={() => router.push('/manseryeok/haerak')} style={backBtn} aria-label="뒤로">‹</button>

      <div style={{ fontSize: 11, color: SUB }}>하락이수 河洛理數</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: INK, margin: '3px 0 4px', letterSpacing: '-0.3px' }}>
        {name ? `${name} 님` : ''} {data.target}년
      </div>
      <div style={{ fontSize: 12, color: SUB, marginBottom: 16, lineHeight: 1.6 }}>
        한 해를 앞뒤로 나누어 두 괘로 봅니다. 움직이는 자리는 ★{data.dongHyo}번째 줄입니다.
      </div>

      {/*  🔴🔴 ★상반기 · 하반기가 «어느 괘» 인가 — 여기 «한 곳» 에서 정합니다
        *
        *  ✅ [대표님 2026-09-14 확정]
        *       ★상반기 = 선천괘(先天卦)   ·   ★하반기 = 후천괘(後天卦)
        *     ⇒ 노트에 적힌 차례와 «같습니다».
        *
        *  ⚠️ 연재쌤이 「상반기와 하반기가 바뀌었다」 하신 적이 있습니다 (2026-09-14).
        *     ⇒ 그런데 그것은 ★«라벨» 이 아니라 «괘 자체» 가 뒤바뀐 것을 보신 것입니다.
        *       월칸 윗수(29/30) 규칙 때문에 노트와 두 괘가 «맞바뀌는» 사람이 있습니다.
        *       ⛔ 여기 두 줄을 맞바꿔서 «가리려고» 하지 마십시오 — 다른 사람 것이 틀어집니다.
        *       ⇒ 고칠 곳은 ★월칸 윗수 규칙(haerakInputs.wolLastDayOf)입니다. */}
      <GwaeCard half="상반기" g={data.seoncheon} move={data.dongHyo} />
      <div style={{ height: 12 }} />
      <GwaeCard half="하반기" g={data.hucheon} move={data.dongHyo} />

      {/* ── 셈한 값 — ★대표님·연재쌤 대조용. 작게 둡니다 ── */}
      <details style={{ marginTop: 16, background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: '11px 13px' }}>
        <summary style={{ fontSize: 11.5, color: SUB, cursor: 'pointer' }}>셈한 값 보기</summary>
        <div style={{ marginTop: 9, fontSize: 11.5, color: SUB, lineHeight: 1.9 }}>
          음력 생월·생일 {g.eumWol}월 {g.eumIl}일 · 나이 {g.nai}세 · 그 달 마지막 날 {g.wolLastDay}일<br />
          간지 {g.nyeonGanji} · {g.wolGanji} · {g.ilGanji}<br />
          수 년 {data.su.nyeon} · 월 {data.su.wol} · 일 {data.su.il}
        </div>
      </details>

      <div style={{ height: 26 }} />
    </Wrap>
  )
}

/** 괘 한 장 */
function GwaeCard({ half, g, move }: { half: string; g: GwaeOut; move: number }) {
  return (
    <div style={{ background: CARD, border: `1.5px solid ${LINE}`, borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* 괘 그림 — ★위가 6효, 아래가 1효 */}
        <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 4, flexShrink: 0 }}>
          {g.hyo.map((yang, i) => {
            const on = i + 1 === move
            return (
              <div key={i} style={{ display: 'flex', gap: 5, width: 44 }} aria-hidden="true">
                {yang ? (
                  <span style={{ flex: 1, height: 5, borderRadius: 2, background: on ? MOVE : INK }} />
                ) : (
                  <>
                    <span style={{ flex: 1, height: 5, borderRadius: 2, background: on ? MOVE : INK }} />
                    <span style={{ flex: 1, height: 5, borderRadius: 2, background: on ? MOVE : INK }} />
                  </>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: SUB }}>{half}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: INK, letterSpacing: '-0.3px' }}>
            {g.ko} <span style={{ fontSize: 12, color: SUB, fontWeight: 400 }}>{g.name}</span>
          </div>
          <div style={{ fontSize: 11, color: SUB, marginTop: 2 }}>
            {g.sang} 위 · {g.ha} 아래 {g.label ? <>· <span style={{ color: MOVE }}>{move}번째 줄</span></> : null}
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: LINE, margin: '13px 0' }} />

      {g.parts === null ? (
        /* ⛔ 글이 없으면 «지어내지» 않고 사실대로 말합니다 */
        <div style={{ fontSize: 12.5, color: SUB, lineHeight: 1.7 }}>
          이 괘의 풀이는 아직 옮기는 중이에요. 조금만 기다려 주세요.
        </div>
      ) : (
        <>
          {g.lead ? (
            <div style={{ fontSize: 13, color: INK, lineHeight: 1.85, marginBottom: g.parts.length ? 11 : 0 }}>
              {g.lead}
            </div>
          ) : null}
          {g.parts.map((p, i) => (
            <div key={i} style={{ marginBottom: i === g.parts!.length - 1 ? 0 : 11 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: ACCENT, marginBottom: 3 }}>{p.who}</div>
              <div style={{ fontSize: 13, color: INK, lineHeight: 1.85 }}>{p.text}</div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

const btn: React.CSSProperties = {
  padding: '11px 20px', borderRadius: 12, background: ACCENT, border: 'none',
  color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
}
const backBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#96502e', fontSize: 17,
  cursor: 'pointer', padding: '0 0 10px', fontFamily: 'inherit',
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '18px 14px 40px' }}>
      <div style={{ maxWidth: 460, margin: '0 auto' }}>{children}</div>
    </div>
  )
}

export default function HaerakResultPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#5c3a1e' }}>불러오는 중…</div>}>
      <HaerakResultInner />
    </Suspense>
  )
}
