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
  { key: 'myc', title: '🔮 명카페', hint: '서비스마다 따로 정합니다 · 0원이면 무료' },
]

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
    for (const r of rows) {
      const { error } = await supabase.from('mc_price')
        .update({ price: r.price, up_at: new Date().toISOString() })
        .eq('service', r.service).eq('item', r.item)
      if (error) { alert('저장 실패(' + r.label + '): ' + error.message); setSaving(false); return }
    }
    setSaving(false)
    alert('요금표가 저장되었습니다')
    load()
  }

  if (loading) return <div className="text-sm" style={{ color: '#8a88a0' }}>불러오는 중...</div>

  return (
    <div>
      {GROUPS.map(g => {
        const list = rows.filter(r => r.service === g.key)
        if (list.length === 0) return null
        return (
          <div key={g.key} className="mb-6 rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-sm font-bold mb-1" style={{ color: '#e8e6f0' }}>{g.title}</div>
            {g.hint && (
              <div className="text-xs mb-3" style={{ color: '#8a88a0' }}>{g.hint}</div>
            )}

            <div className="mt-3">
              {list.map(r => (
                <div key={r.service + r.item}
                  className="flex items-center gap-3 py-2"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-sm" style={{ width: 150, color: '#e8e6f0' }}>{r.label}</span>
                  <span className="text-xs flex-1 font-mono" style={{ color: '#6a6880' }}>{r.item}</span>
                  <input
                    value={r.price.toLocaleString()}
                    onChange={e => setPrice(r.service, r.item, e.target.value)}
                    className="rounded-lg px-3 text-sm text-right"
                    style={{
                      width: 96, height: 32,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#e8e6f0',
                    }} />
                  <span className="text-xs" style={{ color: '#8a88a0', width: 18 }}>원</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div className="rounded-xl px-4 py-3 mb-4 text-xs"
        style={{ background: 'rgba(250,199,117,0.10)', color: '#FAC775', border: '1px solid rgba(250,199,117,0.25)' }}>
        고치면 그 뒤부터 바뀐 값으로 빠집니다. 지난 내역은 안 바뀝니다.
        <br />
        가운데 영문(price_key)은 상담사 전문분야·상담 가격과 같은 낱말이라 바꾸지 않습니다.
      </div>

      <button onClick={saveAll} disabled={saving}
        className="px-6 py-2.5 rounded-xl text-sm font-bold"
        style={{ background: 'rgba(250,199,117,0.25)', color: '#FAC775', border: '1px solid rgba(250,199,117,0.4)' }}>
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  )
}
