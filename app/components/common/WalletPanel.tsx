'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/* ══════════════════════════════════════════════════════════════════
 *  ★공용 지갑 부품 — 2026-09-08 신설 [대표님 지시 · 목업 승낙]
 *
 *  [왜 «한 벌» 인가]
 *    지갑은 ★회원 한 사람에 «줄 하나» 입니다 (mc_wallet). 세 앱이 함께 씁니다.
 *    ⇒ 잔액·내역 화면을 앱마다 만들면 «같은 것을 셋» 만들고 셋 고칩니다.
 *    ⛔⛔ ★큐보드·골프온에 지갑 화면을 «따로 만들지» 마십시오.
 *        1부 4-1 「회원 관리는 명카페 한 곳」과 같은 결입니다.
 *    ⇒ 그쪽 앱에서는 ★https://myjae.vercel.app/wallet?from=glf 로 «넘겨» 주십시오.
 *
 *  [쓰는 곳 «둘»]
 *    app/wallet/page.tsx        공용 화면 (다른 앱에서 넘어옴) · big = true
 *    app/mypage-new/page.tsx    「지갑 · 쿠폰」 칸 안           · big = false
 *    ⇒ ★같은 부품입니다. 고치실 때 이 파일 «하나» 만 보시면 됩니다.
 *
 *  ⚠️ mc_wallet · mc_ledger 는 ★RLS 로 «본인 줄만» 옵니다. 남의 것은 안 보입니다.
 *  ⚠️ 지갑 줄이 «없는» 회원이 있습니다 (충전을 한 번도 안 한 분).
 *     ⇒ ★.maybeSingle() 입니다. ⛔ .single() 로 바꾸지 마십시오 — 오류가 납니다.
 *  ⛔ 「포인트(0P)」·「이용권(0회)」를 도로 넣지 마십시오 — ★없는 기능입니다.
 *     늘 0으로 적혀 있으면 손님이 「내 포인트는?」 하십니다.
 * ══════════════════════════════════════════════════════════════════ */

type Row = {
  id: string; service: string; kind: string; item: string | null
  amount: number; after: number; memo: string | null; at: string
}

/** ⚠️ 관리자 화면(WalletMember.tsx:29)과 ★같은 낱말입니다. 함께 고치십시오. */
const SERVICE_NAME: Record<string, string> = {
  bil: '큐보드', glf: '골프온', myc: '명카페',
}
/** 딱지 색 — ★앱을 가리키는 것뿐입니다. 뜻(좋다/나쁘다)은 없습니다. */
const SERVICE_TAG: Record<string, { bg: string; fg: string }> = {
  bil: { bg: '#dfeae0', fg: '#3f6b45' },
  glf: { bg: '#e8e0f2', fg: '#5a4a7a' },
  myc: { bg: '#f5e2d8', fg: '#8a4a2a' },
}

/** 충전 금액 다섯 [대표님 2026-09-08] — ⚠️ PG 붙일 때 이 값을 그대로 쓰십시오 */
export const CHARGE_AMOUNTS = [5000, 10000, 20000, 50000, 100000]

const C = {
  card: '#FFFBF7', line: '#9c7a58', thin: '#e8dccf',
  ink: '#5a4a3e', sub: '#8a7565', faint: '#a2907f',
  gold: '#96502e', plus: '#4a7c4e', btn: '#b46e46',
}

export default function WalletPanel({ big = false }: { big?: boolean }) {
  const [balance, setBalance] = useState<number | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id
      if (!uid) { setBalance(0); return }

      supabase.from('mc_wallet').select('balance').eq('user_id', uid)
        .maybeSingle()
        .then(({ data: w }) => setBalance(w?.balance ?? 0))

      supabase.from('mc_ledger')
        .select('id, service, kind, item, amount, after, memo, at')
        .eq('user_id', uid)
        .order('at', { ascending: false })
        .limit(100)
        .then(({ data: r }) => { if (r) setRows(r as Row[]) })
    })
  }, [])

  const shown = filter === 'all' ? rows : rows.filter(r => r.service === filter)
  const list = showAll ? shown : shown.slice(0, 5)

  return (
    <div>
      {big && (
        <>
          <div style={{ fontSize: 11, color: C.sub }}>내 지갑</div>
          <div style={{ fontSize: 26, color: C.gold, margin: '3px 0 14px', fontWeight: 500 }}>
            {balance == null ? '…' : `${balance.toLocaleString()}원`}
          </div>
        </>
      )}

      <button
        onClick={() => alert('충전 기능을 준비하고 있어요.\n지금은 관리자에게 말씀해 주시면 넣어 드립니다.')}
        style={{
          width: '100%', height: 44, background: C.btn, border: 'none', borderRadius: 10,
          color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        //  ★2026-09-09 [대표님 「지갑으로 통일하자」] — 「캐시」를 걷었습니다.
        //    ⚠️ 바로 위에 「내 지갑」이라 적혀 있는데 단추만 「캐시」였습니다.
        //       ★한 화면에서 손님이 두 말을 봤습니다.
        //    ⛔ 「캐시」·「이용권」을 돈 이름으로 되살리지 마십시오 —
        //       「이용권」은 ★작명 화면의 «다른 물건» 입니다 (개명 횟수권).
        }}>☕ 충전하기</button>
      <div style={{ fontSize: 10, color: '#6b5340', marginTop: 7, textAlign: 'center' }}>
        {CHARGE_AMOUNTS.map(n => n.toLocaleString()).join(' · ')}원
      </div>

      {/* 거르개 — ⚠️ 줄이 없는 앱을 골라도 «아직 내역이 없어요» 가 뜹니다. 정상입니다. */}
      <div style={{ display: 'flex', gap: 5, marginTop: 15, flexWrap: 'wrap' }}>
        {[['all', '전체'], ['myc', '명카페'], ['bil', '큐보드'], ['glf', '골프온']].map(([k, label]) => {
          const on = filter === k
          return (
            <button key={k} onClick={() => { setFilter(k); setShowAll(false) }}
              style={{
                fontSize: 11, padding: '4px 11px', borderRadius: 14, cursor: 'pointer',
                background: on ? '#f0e0d0' : 'transparent',
                color: on ? '#5c3a1e' : C.sub,
                border: `0.5px solid ${on ? '#b99a7d' : '#d8c4b0'}`,
              }}>{label}</button>
          )
        })}
      </div>

      <div style={{ fontSize: 11, color: C.sub, marginTop: 14 }}>최근 내역</div>

      {shown.length === 0 ? (
        <div style={{ padding: '16px 0', fontSize: 12, color: C.faint, textAlign: 'center' }}>
          아직 내역이 없어요
        </div>
      ) : (
        <>
          {list.map(r => {
            const plus = r.amount > 0
            const tag = SERVICE_TAG[r.service] ?? { bg: '#eee', fg: '#666' }
            return (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 0', borderTop: `0.5px solid ${C.thin}`,
              }}>
                <span style={{ fontSize: 11, color: C.sub, width: 38, flex: 'none' }}>
                  {r.at.slice(5, 10).replace('-', '.')}
                </span>
                <span style={{
                  fontSize: 9, padding: '2px 5px', borderRadius: 9, flex: 'none',
                  background: tag.bg, color: tag.fg,
                }}>{SERVICE_NAME[r.service] ?? r.service}</span>
                <span style={{
                  fontSize: 12, color: C.ink, flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{r.memo || r.item || (plus ? '충전' : '이용')}</span>
                <span style={{
                  fontSize: 12, width: 56, textAlign: 'right',
                  color: plus ? C.plus : C.gold,
                }}>{plus ? '+' : ''}{r.amount.toLocaleString()}</span>
                {/* ★그때 «남은 잔액» — 「왜 돈이 줄었냐」는 문의에 이 줄만 보여 드리면 끝납니다 */}
                <span style={{ fontSize: 10, width: 52, textAlign: 'right', color: C.faint }}>
                  {r.after.toLocaleString()}원
                </span>
              </div>
            )
          })}
          {shown.length > 5 && (
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button onClick={() => setShowAll(v => !v)}
                style={{
                  background: 'none', border: 'none', fontSize: 11, color: C.gold,
                  borderBottom: `0.5px solid #d8b89e`, paddingBottom: 1, cursor: 'pointer',
                }}>
                {showAll ? '접기' : `내역 더 보기 (${shown.length})`}
              </button>
            </div>
          )}
        </>
      )}

      {/* 쿠폰 — ⚠️ 「결제 내역 · 쿠폰 등록」 칸을 내리면서 이리로 옮겼습니다.
          [왜]  손님이 충전하면 그게 «곧 결제» 입니다. 내역이 두 곳에 나뉘어 있었습니다.
          ⛔ 「결제 내역」 칸을 다시 만들지 마십시오 — 여기 내역과 «같은 것» 입니다. */}
      <div style={{ borderTop: `0.5px solid ${C.thin}`, marginTop: 13, paddingTop: 11 }}>
        <button
          onClick={() => alert('쿠폰 기능을 준비하고 있어요.')}
          style={{
            width: '100%', padding: '9px 0', background: 'none',
            border: `0.5px solid ${C.line}`, borderRadius: 10,
            color: '#5c3a1e', fontSize: 12, cursor: 'pointer',
          }}>🎁 쿠폰 등록하기</button>
      </div>
    </div>
  )
}
