'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Price = {
  id: string
  price_key: string
  label: string
  price: number
  active: boolean
  sort: number
}

export default function PriceManager() {
  const [rows, setRows] = useState<Price[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await supabase
      .from('consult_prices')
      .select('*')
      .order('sort')
    if (error) { alert('불러오기 실패: ' + error.message); return }
    setRows((data ?? []) as Price[])
    setLoading(false)
  }

  function setPrice(id: string, val: number) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, price: val } : r))
  }
  function toggle(id: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  async function saveAll() {
    setSaving(true)
    for (const r of rows) {
      const { error } = await supabase
        .from('consult_prices')
        .update({ price: r.price, active: r.active, updated_at: new Date().toISOString() })
        .eq('id', r.id)
      if (error) { alert('저장 실패(' + r.label + '): ' + error.message); setSaving(false); return }
    }
    setSaving(false)
    alert('저장되었습니다')
    load()
  }

  if (loading) return <div className="text-sm" style={{ color: '#8a88a0' }}>불러오는 중...</div>

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base font-bold" style={{ color: '#FAC775' }}>💰 가격 관리</span>
      </div>
      <p className="text-xs mb-5" style={{ color: '#8a88a0', lineHeight: 1.6 }}>
        상담 종류마다 가격을 정하고, 상담 연결 버튼을 켜거나 끕니다.<br />
        꺼진 상담은 고객 화면에 “전문가와 상담하기” 버튼이 보이지 않습니다.
      </p>

      <div className="rounded-2xl overflow-hidden"
        style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
        {/* 헤더 */}
        <div className="flex items-center px-5 py-3 text-xs font-bold"
          style={{ background: 'rgba(60,52,137,0.3)', color: '#FAC775',
            borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ flex: 1 }}>상담 종류</span>
          <span style={{ width: 130, textAlign: 'right' }}>가격 (원)</span>
          <span style={{ width: 70, textAlign: 'center' }}>노출</span>
        </div>

        {rows.map(r => (
          <div key={r.id} className="flex items-center px-5 py-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', opacity: r.active ? 1 : 0.5 }}>
            <span style={{ flex: 1, fontSize: 13, color: '#fff' }}>
              {r.label}{!r.active && <span style={{ fontSize: 11, color: '#8a88a0' }}> (숨김)</span>}
            </span>
            <div style={{ width: 130, textAlign: 'right' }}>
              <input type="number" value={r.price}
                onChange={e => setPrice(r.id, parseInt(e.target.value) || 0)}
                className="rounded-lg px-2 py-1.5 text-sm text-right outline-none"
                style={{ width: 110, background: 'rgba(255,255,255,0.08)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div style={{ width: 70, display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => toggle(r.id)}
                style={{ width: 46, height: 24, borderRadius: 20, position: 'relative',
                  background: r.active ? '#FAC775' : 'rgba(255,255,255,0.2)', transition: 'all .15s' }}>
                <span style={{ position: 'absolute', top: 3, [r.active ? 'right' : 'left']: 3,
                  width: 18, height: 18, borderRadius: '50%', background: '#fff' } as any} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: '#8a88a0' }}>
        <span>💡 켜짐 = 고객에게 상담 버튼 보임 · 꺼짐 = 숨김</span>
      </div>

      <button onClick={saveAll} disabled={saving}
        className="w-full py-3 rounded-xl text-sm font-bold mt-4"
        style={{ background: '#FAC775', color: '#1a1a18' }}>
        {saving ? '저장중...' : '전체 저장'}
      </button>
    </div>
  )
}
