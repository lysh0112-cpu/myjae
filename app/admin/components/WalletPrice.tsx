'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

//  ★요금표 (mc_price) — 2026-09-05 신설
//
//  ⛔⛔ myc 의 item 은 ★price_key 와 «같은 낱말» 입니다 —
//      consultantData.ts 의 SERVICE_SPECIALTIES · consult_prices · ConsultButton 열두 곳.
//      바꾸면 네 곳이 «한꺼번에» 어긋납니다. (48부 4-1)
//
//  ⚠️ 결혼·출산·이사택일은 ★각각 값을 받습니다 [2026-09-05 대표님].
//     화면은 둘씩 쓰지만 값은 서비스마다 하나입니다.
//
//  ⚠️ 0원 = 무료입니다. ⛔ 줄을 «지우지» 마십시오 —
//     지우면 wallet_use 가 no_price 로 «거절» 합니다.
//
//  ★2026-09-08 [대표님 지시] — ★「🔮 명카페」 칸을 «내렸습니다».
//    [왜]  명카페 값이 ★두 곳에 있었습니다 —
//          「💰 가격 관리」(consult/analysis_prices) · 여기(mc_price myc 열 줄)
//          ⇒ 대표님이 어디에 넣어야 하는지 갈렸습니다.
//    ⇒ 명카페 값은 ★「💰 가격 관리」 한 곳에서만 정합니다.
//    ⛔⛔ ★DB 의 mc_price myc 열 줄은 «지우지 마십시오» —
//        나중에 지갑을 붙일 때 wallet_use 가 그 줄을 찾습니다.
//        없으면 ★no_price 로 거절합니다. 화면에서만 감춘 것입니다.
//    ⛔ saveAll 도 ★myc 줄은 «안 건드립니다» (화면에 없는 값을 덮어쓰지 않게).
//    ⇒ 되살리시려면 GROUPS 에 myc 한 줄을 도로 넣으면 됩니다.
//
//  ⚠️ 이 부품은 ★2026-09-08 부터 「💰 가격 관리」 ★오른쪽에 붙습니다.
//     (지갑 탭이 아니라) — PriceManager.tsx 를 보십시오.

type Row = {
  service: string
  item: string
  label: string
  price: number
  sort: number
}

const GROUPS: { key: string; title: string; hint?: string }[] = [
  { key: 'bil', title: '🎱 큐보드' },
  { key: 'glf', title: '⛳ 골프온' },
  // ⛔ { key: 'myc', … } — 2026-09-08 내림. 위 머리말을 보십시오.
]
const SHOWN = new Set(GROUPS.map(g => g.key))

/* 값 칸 — ⛔ 이 부품을 WalletPrice «안» 으로 옮기지 마십시오.
   글자 한 자마다 다시 그려져 ★커서가 빠집니다 (PriceManager 에서 겪은 그 일).
   ⚠️ 치는 «동안» 은 쉼표를 안 찍습니다. 손을 떼면 그때 찍습니다. */
function WalletPriceInput({ r, onPrice }: {
  r: Row
  onPrice: (service: string, item: string, raw: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input type="text" inputMode="numeric"
      value={draft ?? r.price.toLocaleString()}
      onFocus={ev => { setDraft(String(r.price)); ev.target.select() }}
      onChange={ev => {
        const raw = ev.target.value.replace(/[^0-9]/g, '')
        setDraft(raw)
        onPrice(r.service, r.item, raw)
      }}
      onBlur={() => setDraft(null)}
      className="rounded-lg px-2 text-xs text-right"
      style={{ width: 62, height: 28, background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.12)', color: '#e8e6f0' }} />
  )
}

export default function WalletPrice() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await supabase
      .from('mc_price')
      .select('service, item, label, price, sort')
      .order('service')
      .order('sort')
    if (error) { alert('불러오기 실패: ' + error.message); setLoading(false); return }
    setRows((data ?? []) as Row[])
    setLoading(false)
  }

  function setPrice(service: string, item: string, raw: string) {
    const num = parseInt(raw.replace(/[^0-9]/g, '')) || 0
    setRows(prev => prev.map(r =>
      r.service === service && r.item === item ? { ...r, price: num } : r))
  }

  async function saveAll() {
    setSaving(true)
    /* 🔴 ★2026-09-11 — 「바뀐 줄 세기」를 넣었습니다 [큐보드 회신 ⑥ 지적]
     *
     *   [전]  error 만 보고 「요금표가 저장되었습니다」라 했습니다.
     *         ⇒ ★0줄이 바뀌어도 «저장됐다» 고 말했습니다.
     *   [까닭] Supabase 는 ★권한이 없어도 «오류를 안 냅니다» —
     *          RLS 가 걸러 «0줄» 이 되어도 error 는 null 입니다.
     *          ⇒ 4부 0-5 「관리자 화면이 조용히 0줄」이 ★여기 그대로 있었습니다.
     *   [고침] ★.select() 로 «바뀐 줄» 을 받아 «셉니다». 0이면 말합니다.
     *
     *   ⚠️ 큐보드가 admin.html 에서 같은 것을 찾았습니다 —
     *      「Supabase 는 권한이 없어도 200 OK + ★빈 배열을 줍니다」
     *   ⛔ .select() 를 빼지 마십시오 — 빼면 다시 «조용히» 실패합니다.
     *   ⛔ 「화면에 친 값」을 서버 답인 척 쓰지 마십시오 (큐보드 2-1 ②). */
    for (const r of rows.filter(x => SHOWN.has(x.service))) {
      const { data, error } = await supabase.from('mc_price')
        .update({ price: r.price, up_at: new Date().toISOString() })
        .eq('service', r.service).eq('item', r.item)
        .select('service, item')
      if (error) { alert('저장 실패(' + r.label + '): ' + error.message); setSaving(false); return }
      if (!data || data.length === 0) {
        alert('저장되지 않았습니다 (' + r.label + ').\n로그인이 풀렸거나 권한이 없습니다.\n로그아웃 후 다시 로그인해 주세요.')
        setSaving(false); return
      }
    }
    setSaving(false)
    alert('요금표가 저장되었습니다')
    load()
  }

  if (loading) return <div className="text-sm" style={{ color: '#8a88a0' }}>불러오는 중...</div>

  return (
    <div>
      <div className="text-xs mb-3" style={{ color: '#8a88a0', lineHeight: 1.6 }}>
        아래 둘은 <span style={{ color: '#FAC775' }}>지갑에서 빠지는 값</span>입니다.<br />
        카카오 로그인을 붙이기 전까지는 아직 돌지 않습니다.
      </div>

      {/* ★큐보드·골프온을 «나란히» — 세로로 길어지지 않게 (2026-09-08 목업 승낙) */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {GROUPS.map(g => {
          const list = rows.filter(r => r.service === g.key)
          if (list.length === 0) return null
          return (
            <div key={g.key} className="rounded-xl p-3"
              style={{ flex: '1 1 160px', minWidth: 160,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-xs font-bold mb-2" style={{ color: '#e8e6f0' }}>{g.title}</div>
              {g.hint && (
                <div className="text-xs mb-2" style={{ color: '#8a88a0' }}>{g.hint}</div>
              )}
              {list.map(r => (
                <div key={r.service + r.item}
                  className="flex items-center gap-2 py-1.5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-xs" style={{ flex: 1, color: '#e8e6f0' }}>{r.label}</span>
                  <WalletPriceInput r={r} onPrice={setPrice} />
                  <span className="text-xs" style={{ color: '#8a88a0' }}>원</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <div className="rounded-xl px-3 py-2 my-3 text-xs"
        style={{ background: 'rgba(250,199,117,0.10)', color: '#FAC775',
          border: '1px solid rgba(250,199,117,0.25)', lineHeight: 1.6 }}>
        고치면 그 뒤부터 바뀐 값으로 빠집니다. 지난 내역은 안 바뀝니다.
      </div>

      <button onClick={saveAll} disabled={saving}
        className="px-6 py-2.5 rounded-xl text-sm font-bold"
        style={{ background: 'rgba(250,199,117,0.25)', color: '#FAC775', border: '1px solid rgba(250,199,117,0.4)' }}>
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  )
}
