'use client'
/**
 * 하락이수 입력 — ★«어느 해를 볼지» 만 고르기
 * ─────────────────────────────────────────────
 * 진입: haerak(보관함) > 사람 선택 모달 > 이 화면
 * 다음: haerak-result
 *
 * ⚠️ 사람은 ★이미 정해져서 주소로 넘어옵니다. 생년월일을 «다시 묻지 않습니다».
 *    (진로적성 입력 화면과 «같은 결» 입니다)
 *
 * ★여기서 새로 묻는 것은 «어느 해» 하나뿐입니다  [대표님 2026-09-14 · 목업 승낙]
 *
 * ⛔⛔ ★태어난 시를 «묻지 마십시오».
 *    하락이수는 시를 «안 씁니다» (노트에 칸이 셋뿐 — 년·월·일).
 *    ⇒ 대신 「쓰지 않습니다」 한 줄을 ★보여 드립니다.
 *      다른 서비스는 다 묻는데 여기만 안 물으면 손님이 «빠뜨린 줄» 압니다.
 */
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
//  ★지갑 관문은 lib/wallet/consultGate.ts «한 곳» 입니다 — 여기에 팝업을 따로 만들지 마십시오
import WalletPaySheet from '@/app/components/common/WalletPaySheet'

const ACCENT = '#3f6fa8'        // ★청람 — 홈 BEST 카드와 «같은 결»
const BG = '#FDF6F0'
const CARD = '#FFFBF7'
const LINE = '#f0e0d5'

/** 볼 수 있는 해 — ★올해와 내년 둘 [대표님 2026-09-14] */
function yearChoices(): { y: number; label: string }[] {
  const now = new Date().getFullYear()
  return [{ y: now, label: `올해 ${now}` }, { y: now + 1, label: `내년 ${now + 1}` }]
}

function HaerakInputInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const name = sp.get('name') || ''
  const bYear = sp.get('year') || ''
  const bMonth = sp.get('month') || ''
  const bDay = sp.get('day') || ''
  const calType = sp.get('calType') || '양력'
  const leap = sp.get('leapMonth') === '1'

  const choices = useMemo(() => yearChoices(), [])
  const [target, setTarget] = useState<number>(choices[0].y)
  const [payOpen, setPayOpen] = useState(false)

  /*  🔴 ★나이는 «보러 오시는 그때» 기준 하나입니다  [대표님 2026-09-14]
   *     ⇒ 한 분이 올해와 내년을 «함께» 보셔도 나이는 ★하나입니다.
   *     ⛔ target(볼 해)으로 세지 마십시오 — 괘가 달라집니다. */
  const nai = useMemo(() => {
    const by = Number(bYear)
    return Number.isInteger(by) && by > 1900 ? new Date().getFullYear() - by + 1 : null
  }, [bYear])

  //  ★단추에 값을 보이기 위한 것뿐입니다 — 실제 차감은 mc_price 를 봅니다.
  //  ⛔ 이 값으로 «빼지» 마십시오. 보이기용입니다.
  const [aiPrice, setAiPrice] = useState<number | null>(null)
  useEffect(() => {
    let dead = false
    supabase.from('analysis_prices').select('price').eq('price_key', 'haerak_ai').maybeSingle()
      .then(({ data }) => { if (!dead) setAiPrice(data?.price ?? null) })
    return () => { dead = true }
  }, [])

  const query = useMemo(() => {
    const p = new URLSearchParams()
    for (const k of ['year', 'month', 'day', 'gender', 'calType', 'leapMonth', 'hour', 'name']) {
      const v = sp.get(k)
      if (v) p.set(k, v)
    }
    p.set('target', String(target))
    return p.toString()
  }, [sp, target])

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '18px 14px 40px' }}>
      <div style={{ maxWidth: 460, margin: '0 auto' }}>

        <button
          type="button"
          onClick={() => router.push('/manseryeok/haerak')}
          style={{
            background: 'none', border: 'none', color: '#96502e', fontSize: 17,
            cursor: 'pointer', padding: '0 0 10px', fontFamily: 'inherit',
          }}
          aria-label="뒤로"
        >‹</button>

        <div style={{ background: CARD, border: `1.5px solid ${LINE}`, borderRadius: 16, padding: 18 }}>

          <div style={{ fontSize: 11, color: '#55636f' }}>하락이수 河洛理數</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#141c28', margin: '3px 0 12px', letterSpacing: '-0.3px' }}>
            {name ? `${name} 님의 운의 흐름` : '운의 흐름'}
          </div>

          {/* ── 넘어온 사람 — ★보여만 드립니다. 다시 묻지 않습니다 ── */}
          <div style={{ background: '#f7f0e8', borderRadius: 12, padding: '11px 12px', marginBottom: 16 }}>
            <Row k="생년월일" v={`${calType} ${bYear}. ${bMonth}. ${bDay}${leap ? ' (윤달)' : ''}`} />
            {nai != null ? <Row k="나이" v={`${nai}세`} /> : null}
            {/* ⛔ 이 줄을 빼지 마십시오 — 손님이 «시를 빠뜨렸나» 하고 되돌아옵니다 */}
            <Row k="태어난 시" v="쓰지 않습니다" muted />
          </div>

          {/* ── 어느 해 ── */}
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#141c28', marginBottom: 8 }}>
            어느 해를 보시겠어요?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, marginBottom: 8 }}>
            {choices.map(c => {
              const on = c.y === target
              return (
                <button
                  key={c.y}
                  type="button"
                  onClick={() => setTarget(c.y)}
                  aria-pressed={on}
                  style={{
                    padding: 11, borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                    fontSize: 13, fontWeight: on ? 700 : 400, fontFamily: 'inherit',
                    background: on ? '#eaf2f9' : '#fff',
                    border: `1.5px solid ${on ? ACCENT : LINE}`,
                    color: on ? ACCENT : '#55636f',
                  }}
                >{c.label}</button>
              )
            })}
          </div>
          <div style={{ fontSize: 11, color: '#55636f', lineHeight: 1.6, marginBottom: 6 }}>
            한 해에 상반기·하반기 두 괘가 나옵니다.
          </div>

          <button
            type="button"
            onClick={() => setPayOpen(true)}
            style={{
              width: '100%', marginTop: 14, padding: 15, borderRadius: 12,
              background: ACCENT, border: 'none', color: '#fff',
              fontSize: 14.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            {/* ★값을 «단추에» 보입니다 — 다른 서비스와 같은 모양입니다 [대표님 「통일」] */}
            하락이수 보기{aiPrice != null ? ` · ${aiPrice.toLocaleString()}원` : ''}
          </button>
        </div>

        {/* ★공용 결제 시트 — ⛔ 여기에 팝업을 «따로 만들지» 마십시오 */}
        <WalletPaySheet
          open={payOpen}
          title="하락이수 풀이"
          subtitle="해마다 바뀌는 운의 흐름을 주역의 괘로 풀어 드려요"
          includes={['상반기·하반기 두 괘', '나에게 움직이는 자리(효)', '교재 원문 그대로의 풀이']}
          item="haerak_ai"
          actionLabel="하락이수 보기"
          onClose={() => setPayOpen(false)}
          onCharge={() => router.push('/wallet')}
          onConfirm={() => {
            setPayOpen(false)
            router.push(`/manseryeok/haerak-result?${query}`)
          }}
        />
      </div>
    </div>
  )
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '2px 0', fontSize: 12 }}>
      <span style={{ color: '#55636f' }}>{k}</span>
      <span style={{ color: muted ? '#8b7a68' : '#141c28', textAlign: 'right' }}>{v}</span>
    </div>
  )
}

export default function HaerakInputPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#5c3a1e' }}>불러오는 중…</div>}>
      <HaerakInputInner />
    </Suspense>
  )
}
