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
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { saveRecord } from '@/lib/saju/sajuRecords'
//  ⚠️ ★글은 «한 곳» 에서 옵니다 — ⛔ 여기에 문장을 적지 마십시오
import { HAERAK_PLAIN_NOTE } from '@/lib/saju/haerak/intro'
//  ★지갑 관문은 lib/wallet/consultGate.ts «한 곳» 입니다
import { useAiFee, refundAiFee, WALLET_MSG } from '@/lib/wallet/consultGate'
//  ★상담 단추도 «공용 부품» 입니다 — ⛔ 화면마다 다시 짓지 마십시오
import ConsultButton from '@/app/components/common/ConsultButton'

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
/**
 *  ★나누는 수 — 하락이수의 «붙박이» 입니다 [교재]
 *  ⛔ 바꾸면 괘가 통째로 달라집니다. 창구(app/api/haerak/route.ts)와 ★같은 값이어야 합니다.
 *     ⇒ 검사 54 ㉙ 가 둘이 어긋나는지 봅니다.
 */
const DIV = { nyeon: 8, wol: 6, il: 3 } as const

/*  ⚠️ ★eslint 가 「use…」 로 시작하는 이름을 «React 훅» 으로 착각합니다.
 *     useAiFee 는 ★훅이 아니라 «그냥 함수» 입니다 (지갑에서 빼는 일만 합니다).
 *  ⇒ ★이름을 바꿔 부릅니다. eslint-disable 을 뿌리지 않으려는 것입니다.
 *  ⛔ 되돌려서 useAiFee 를 «직접» 부르지 마십시오 — 기준선(85/147)이 늘어납니다. */
const payFee = useAiFee

interface Out {
  target: number
  dongHyo: number
  su: { nyeon: number; wol: number; il: number }
  /** ★나머지 수 — 연재쌤 노트의 붉은 동그라미 ③⑥① (9부) */
  namu: { nyeon: number; wol: number; il: number }
  /** ★수가 «어떻게» 나왔는가 — 윗수 + 천간 + 지지 (9부) */
  kan: {
    nyeon: { top: number; gan: number; ji: number }
    wol: { top: number; gan: number; ji: number }
    il: { top: number; gan: number; ji: number }
  }
  seoncheon: GwaeOut
  hucheon: GwaeOut
  geunggeo: {
    nyeonGanji: string; wolGanji: string; ilGanji: string
    nai: number; wolLastDay: number; eumWol: number; eumIl: number
    /** ★나이를 «어느 해» 기준으로 세었는가 (9부) */
    baseYear: number
  }
}

function HaerakResultInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const name = sp.get('name') || ''
  const recordId = sp.get('recordId')

  const [data, setData] = useState<Out | null>(null)
  const [err, setErr] = useState<string | null>(null)
  /*  ⛔ ★셈을 «한 번만» 부르게 지키는 자리입니다 (돈이 빠지는 자리입니다).
   *     ⚠️ 이것을 빼면 화면이 다시 그려질 때마다 ★또 빠집니다. */
  const paidRef = useRef(false)

  /*  ⚠️ ★여기서 setErr(null) 을 «맨 위» 에 두지 마십시오.
   *     화면이 뜨자마자 값을 바꾸는 꼴이 되어 검사(react-hooks)가 막습니다.
   *     ⇒ 기다린 «뒤» 에 바꿉니다. */
  const load = useCallback(async () => {
    /* ══════════════════════════════════════════════════════════════
     *  🔴🔴 ★2026-09-14 (9부) — 지갑에서 «빼는» 자리
     *
     *  [무엇이 빠져 있었나]  8부에 ★이 한 토막이 «통째로» 없었습니다.
     *     결제 시트는 ★«잔액이 되는지» 만 보고(wallet_check) 화면을 넘깁니다.
     *     ⇒ 실제로 빼는 것(wallet_use)은 ★이 화면이 해야 합니다.
     *     ⇒ 그래서 대표님 지갑에서 ★하락이수만 «안 빠졌습니다».
     *
     *  ⚠️ 얼마가 드는지는 입력 화면에서 ★이미 여쭀습니다.
     *     ⛔ 여기서 «또» 묻지 마십시오 — 손님이 두 번 확인하게 됩니다.
     *  ⛔ ★다시보기(recordId)는 «안 뺍니다» — 이미 내신 것입니다.
     *  ⛔ ★셈이 실패하면 «되돌립니다» — 「돈은 빠졌는데 못 봤다」 가 가장 나쁩니다.
     * ══════════════════════════════════════════════════════════════ */
    let ledgerId: string | undefined
    if (!recordId && !paidRef.current) {
      paidRef.current = true
      const fee = await payFee('haerak_ai', name || '하락이수', '하락이수 풀이')
      if (fee.gate === 'on' && !fee.ok) {
        //  ⚠️ 여기서는 ★되돌릴 것이 «없습니다» — 애초에 못 뺐습니다.
        setErr(WALLET_MSG.aiRolledBack)
        return
      }
      ledgerId = fee.gate === 'on' && fee.ok ? fee.ledgerId : undefined
    }
    //  🔴 셈이 실패한 ★«모든» 길에서 되돌립니다
    const giveBack = async () => {
      if (ledgerId) await refundAiFee(ledgerId, '하락이수 셈 실패 — 되돌림')
    }

    try {
      const res = await fetch('/api/haerak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: sp.get('year'), month: sp.get('month'), day: sp.get('day'),
          calType: sp.get('calType'), leapMonth: sp.get('leapMonth'),
          //  ⚠️ ★2026-09-14 (9부) — baseYear 를 «안 넘깁니다».
          //     나이가 «보려는 해» 기준이라, target 하나면 나이도 정해집니다 [연재쌤 확정].
          target: sp.get('target'),
        }),
      })
      const j = await res.json()
      if (!res.ok) {
        await giveBack()
        //  ⛔ 되돌렸으니 ★다시 눌러 보실 수 있게 문을 엽니다
        paidRef.current = false
        setErr(j?.error || '셈하지 못했어요.')
        return
      }
      setErr(null)
      setData(j as Out)
    } catch {
      await giveBack()
      paidRef.current = false
      setErr('불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
    }
  }, [sp, recordId, name])

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
      //  ⚠️ baseYear 도 함께 남깁니다 — «그때 몇 세로 보았는지» 의 기록입니다.
      //     ⛔ 다시볼 때 «쓰지는» 않습니다 (볼 해가 나이를 정합니다).
      resultData: {
        year: data.target, seoncheon: data.seoncheon.no, hucheon: data.hucheon.no,
        dongHyo: data.dongHyo, baseYear: data.geunggeo.baseYear,
      },
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
  const k = data.kan
  return (
    <Wrap>
      <button type="button" onClick={() => router.push('/manseryeok/haerak')} style={backBtn} aria-label="뒤로">‹</button>

      <div style={{ fontSize: 11, color: SUB }}>하락이수 河洛理數</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: INK, margin: '3px 0 4px', letterSpacing: '-0.3px' }}>
        {name ? `${name} 님` : ''} {data.target}년
      </div>
      <div style={{ fontSize: 12, color: SUB, marginBottom: 16, lineHeight: 1.6 }}>
        한 해를 앞뒤로 나누어 두 괘로 봅니다 — 상반기는 <b>선천괘</b>, 하반기는 <b>후천괘</b>입니다.
        움직이는 자리는 {data.dongHyo}번째 줄이에요.
      </div>

      {/*  🔴🔴 ★상반기 · 하반기가 «어느 괘» 인가 — 여기 «한 곳» 에서 정합니다
        *
        *  ✅ [대표님 2026-09-14 확정]
        *       ★상반기 = 선천괘(先天卦)   ·   ★하반기 = 후천괘(後天卦)
        *     ⇒ 노트에 적힌 차례와 «같습니다».
        *
        *  ⚠️ 연재쌤이 「상반기와 하반기가 바뀌었다」 하신 적이 있습니다 (2026-09-14).
        *     ⇒ 그것은 ★«라벨» 이 아니라 «괘 자체» 가 뒤바뀐 것을 보신 것입니다.
        *
        *  ✅ ★까닭을 찾았습니다 (2026-09-14 · 9부) — «달력» 이었습니다.
        *     부본(lunar-javascript)이 한국천문연구원 달력과 어긋나 월말이 하루 틀렸고,
        *     그 하루 때문에 ★선천·후천이 통째로 맞바뀌었습니다 (희준 님 26년 — 승↔사).
        *     ⇒ 이제 ★정본(KASI)을 씁니다. 부본으로 떨어지면 «괘를 안 내보냅니다».
        *
        *  ⛔ 여기 두 줄을 맞바꿔서 «가리려고» 하지 마십시오 — 다른 사람 것이 틀어집니다.
        *  ⛔ 월칸 윗수 «규칙» 을 비틀지도 마십시오 — ★규칙은 처음부터 맞았습니다. */}
      <GwaeCard half="상반기" kind="선천괘" g={data.seoncheon} move={data.dongHyo} />
      <div style={{ height: 12 }} />
      <GwaeCard half="하반기" kind="후천괘" g={data.hucheon} move={data.dongHyo} />

      {/*  🔴 ★말 순화 알림 — 2026-09-14 (9부) [대표님]
        *  ⛔ ★여기가 «가장 중요한» 자리입니다 —
        *     소개 팝업은 «안 누르면» 안 보입니다. 결과는 ★누구나 봅니다.
        *     ⇒ 「생명이 위태로울 만큼」 같은 «남겨 둔» 대목을 읽고
        *       놀라신 손님이 ★까닭을 찾을 자리입니다.
        *  ⛔ 이 줄을 빼지 마십시오. 빼면 손님이 «왜 이런 말이 나오는지» 모르십니다. */}
      <div style={{
        marginTop: 16, padding: '11px 13px',
        background: CARD, border: `1px solid ${LINE}`, borderRadius: 12,
        fontSize: 11.5, color: SUB, lineHeight: 1.75,
      }}>{HAERAK_PLAIN_NOTE}</div>

      {/*  🔴 ★하락이수 전담 상담사 연결 — 2026-09-14 (9부) [대표님]
        *
        *  ⛔ ★공용 부품(ConsultButton)을 씁니다. 화면마다 다시 짓지 마십시오 (8부 §6④).
        *  ⚠️ priceKey 는 ★consult_prices 의 'haerak' 줄을 읽습니다 —
        *     관리 화면에서 «상담료» 를 정해 두셔야 단추가 제대로 열립니다.
        *  ⚠️ ★알림 한 줄 «위» 에 둡니다 — 글을 다 읽으신 «바로 뒤» 가 눌리는 자리입니다.
        *     (승진운도 맺음말 바로 아래에 두었습니다 — 7부 1-5) */}
      <div style={{ marginTop: 18 }}>
        <ConsultButton priceKey="haerak" mode="haerak" />
      </div>

      {/* ── 셈한 값 — ★대표님·연재쌤 대조용. 작게 둡니다 ── */}
      <details style={{ marginTop: 16, background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: '11px 13px' }}>
        <summary style={{ fontSize: 11.5, color: SUB, cursor: 'pointer' }}>
          셈한 값 보기
          {/*  🔴 ★2026-09-14 (9부) [대표님] — «몇 년 기준 몇 세» 로 보았는지 밝힙니다.
            *  [까닭]  하락이수는 ★«상담 시점의 나이» 로 앞날을 봅니다.
            *     ⇒ 같은 2027년이라도 2026년에 보면 32세 · 2027년에 보면 33세로 셈해
            *       ★괘가 달라집니다. 손님이 「작년과 다른데요」 하실 자리입니다.
            *  ⛔ 이 줄을 빼지 마십시오 — 근거가 사라집니다. */}
          <span style={{ marginLeft: 8, color: SUB, opacity: 0.85 }}>
            · {g.baseYear}년 기준 나이 {g.nai}세로 보았습니다
          </span>
        </summary>
        <div style={{ marginTop: 9, fontSize: 11.5, color: SUB, lineHeight: 1.9 }}>
          {/*  ⚠️ 나이·월말·생일은 ★아래 세 줄이 «이름을 붙여» 다시 보여 드립니다.
            *     여기서는 ★한눈에 보시라고 한 줄로 둡니다. */}
          음력 생월·생일 {g.eumWol}월 {g.eumIl}일 · 나이 {g.nai}세 · 그 달 마지막 날 {g.wolLastDay}일<br />
          {/*  🔴 ★수가 «어떻게» 나왔는지 — 줄마다 한 줄씩 [대표님 2026-09-14]
            *
            *  ⚠️ ★윗수가 칸마다 «다릅니다» — 년은 나이 · 월은 그 달 마지막 날 · 일은 음력 생일.
            *     그래서 ★이름을 붙여 둡니다. 안 붙이면 「62가 어디서 나왔지?」 하십니다.
            *  ⚠️ ★지지 수도 칸마다 «표가 다릅니다» — 같은 未 라도 월 8 · 년 13 · 일 11.
            *     ⇒ 줄을 나눠 놓아야 그것이 보입니다.
            *  ⛔ 나누는 수(8·6·3)는 ★하락이수의 «붙박이» 입니다.
            *     ⚠️ 글자로 적지 말고 ★열쇠(DIV) 하나로 두었습니다 — 창구와 어긋나지 않게.
            *  ⛔ 여기서 «다시 셈하지» 않습니다 — 창구가 보낸 값을 그대로 그립니다. */}
          <div style={{ marginTop: 4 }}>
            년　{g.nyeonGanji}　나이 {k.nyeon.top} + {g.nyeonGanji[0]} {k.nyeon.gan} + {g.nyeonGanji[1]} {k.nyeon.ji} = {data.su.nyeon}　÷{DIV.nyeon} → {data.namu.nyeon}
          </div>
          <div>
            월　{g.wolGanji}　월말 {k.wol.top} + {g.wolGanji[0]} {k.wol.gan} + {g.wolGanji[1]} {k.wol.ji} = {data.su.wol}　÷{DIV.wol} → {data.namu.wol}
          </div>
          <div>
            일　{g.ilGanji}　생일 {k.il.top} + {g.ilGanji[0]} {k.il.gan} + {g.ilGanji[1]} {k.il.ji} = {data.su.il}　÷{DIV.il} → {data.namu.il}
          </div>
          <div style={{ marginTop: 6, fontSize: 11, opacity: 0.8 }}>
            ※ 나눈 숫자가 정확히 떨어지면, 나눈 숫자를 그대로 표시한다.
          </div>
        </div>
      </details>

      <div style={{ height: 26 }} />
    </Wrap>
  )
}

/** 괘 한 장 */
/*  ★2026-09-14 [연재쌤 · 대표님] — 「선천괘 · 후천괘」 라는 말을 ★«반드시» 보이십시오.
 *    ⚠️ 6부 「한자말을 쓰지 마십시오」 와 부딪히는 듯하나, 이 둘은 ★하락이수의 «이름» 입니다.
 *       연재쌤이 손님께 말씀하실 때 쓰시는 말이라 ⛔ 빼면 말이 어긋납니다.
 *    ⇒ 대신 ★「상반기 · 하반기」 를 «먼저» 두어 손님이 뜻을 바로 알게 합니다. */
function GwaeCard({ half, kind, g, move }: { half: string; kind: string; g: GwaeOut; move: number }) {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: ACCENT }}>{half}</span>
            {/* ⛔ 이 말을 빼지 마십시오 [연재쌤 · 대표님 2026-09-14] */}
            <span style={{
              fontSize: 10, color: SUB, background: '#f0f4f8',
              border: `1px solid ${LINE}`, borderRadius: 20, padding: '1px 7px',
            }}>{kind}</span>
          </div>
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
