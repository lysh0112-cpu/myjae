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

type TarotPrice = Price & { free_count: number }

type HomePrice = {
  service_key: string
  label: string
  price: number
  show_price: boolean
  sort: number
}

// 상담/분석 공용 표
function PriceTable({ title, table }: { title: string; table: 'consult_prices' | 'analysis_prices' }) {
  const [rows, setRows] = useState<Price[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await supabase.from(table).select('*').order('sort')
    if (error) { alert('불러오기 실패: ' + error.message); return }
    setRows((data ?? []) as Price[])
    setLoading(false)
  }

  function setPrice(id: string, raw: string) {
    const num = parseInt(raw.replace(/[^0-9]/g, '')) || 0
    setRows(prev => prev.map(r => r.id === id ? { ...r, price: num } : r))
  }
  function toggle(id: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  async function saveAll() {
    setSaving(true)
    for (const r of rows) {
      const { error } = await supabase.from(table)
        .update({ price: r.price, active: r.active, updated_at: new Date().toISOString() })
        .eq('id', r.id)
      if (error) { alert('저장 실패(' + r.label + '): ' + error.message); setSaving(false); return }
    }
    setSaving(false)
    alert(title + ' 저장되었습니다')
    load()
  }

  if (loading) return <div className="text-sm" style={{ color: '#8a88a0' }}>불러오는 중...</div>

  return (
    <div style={{ flex: 1, minWidth: 300 }}>
      <div className="text-sm font-bold mb-2" style={{ color: '#FAC775' }}>{title}</div>
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center px-3 py-2 text-xs font-bold"
          style={{ background: 'rgba(60,52,137,0.3)', color: '#FAC775',
            borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ flex: 1 }}>종류</span>
          <span style={{ width: 100, textAlign: 'right' }}>가격</span>
          <span style={{ width: 44, textAlign: 'center' }}>노출</span>
        </div>

        {rows.map(r => (
          <div key={r.id} className="flex items-center px-3 py-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', opacity: r.active ? 1 : 0.45 }}>
            <span style={{ flex: 1, fontSize: 12, color: '#fff' }}>
              {r.label}{!r.active && <span style={{ fontSize: 10, color: '#8a88a0' }}> (숨김)</span>}
            </span>
            <div style={{ width: 100, textAlign: 'right' }}>
              <input type="text" inputMode="numeric" value={r.price.toLocaleString()}
                onChange={e => setPrice(r.id, e.target.value)}
                className="rounded-lg px-2 py-1 text-xs text-right outline-none"
                style={{ width: 88, background: 'rgba(255,255,255,0.08)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div style={{ width: 44, display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => toggle(r.id)}
                style={{ width: 34, height: 18, borderRadius: 20, position: 'relative',
                  background: r.active ? '#FAC775' : 'rgba(255,255,255,0.2)' }}>
                <span style={{ position: 'absolute', top: 2, [r.active ? 'right' : 'left']: 2,
                  width: 14, height: 14, borderRadius: '50%', background: '#fff' } as any} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={saveAll} disabled={saving}
        className="py-2 px-5 rounded-xl text-sm font-bold mt-3"
        style={{ background: '#FAC775', color: '#1a1a18' }}>
        {saving ? '저장중...' : '저장'}
      </button>
    </div>
  )
}

// 타로 전용 표 (무료횟수 칸 포함)
function TarotTable() {
  const [rows, setRows] = useState<TarotPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await supabase.from('tarot_prices').select('*').order('sort')
    if (error) { alert('불러오기 실패: ' + error.message); return }
    setRows((data ?? []) as TarotPrice[])
    setLoading(false)
  }

  function setPrice(id: string, raw: string) {
    const num = parseInt(raw.replace(/[^0-9]/g, '')) || 0
    setRows(prev => prev.map(r => r.id === id ? { ...r, price: num } : r))
  }
  function setFree(id: string, raw: string) {
    const num = parseInt(raw.replace(/[^0-9]/g, '')) || 0
    setRows(prev => prev.map(r => r.id === id ? { ...r, free_count: num } : r))
  }
  function toggle(id: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  async function saveAll() {
    setSaving(true)
    for (const r of rows) {
      const { error } = await supabase.from('tarot_prices')
        .update({ price: r.price, free_count: r.free_count, active: r.active, updated_at: new Date().toISOString() })
        .eq('id', r.id)
      if (error) { alert('저장 실패(' + r.label + '): ' + error.message); setSaving(false); return }
    }
    setSaving(false)
    alert('타로 가격 저장되었습니다')
    load()
  }

  if (loading) return <div className="text-sm" style={{ color: '#8a88a0' }}>불러오는 중...</div>

  return (
    <div style={{ flex: 1, minWidth: 320 }}>
      <div className="text-sm font-bold mb-2" style={{ color: '#FAC775' }}>🃏 타로 가격</div>
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center px-3 py-2 text-xs font-bold"
          style={{ background: 'rgba(60,52,137,0.3)', color: '#FAC775',
            borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ flex: 1 }}>종류</span>
          <span style={{ width: 78, textAlign: 'right' }}>가격</span>
          <span style={{ width: 58, textAlign: 'center' }}>무료횟수</span>
          <span style={{ width: 40, textAlign: 'center' }}>노출</span>
        </div>

        {rows.map(r => (
          <div key={r.id} className="flex items-center px-3 py-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', opacity: r.active ? 1 : 0.45 }}>
            <span style={{ flex: 1, fontSize: 12, color: '#fff' }}>
              {r.label}{!r.active && <span style={{ fontSize: 10, color: '#8a88a0' }}> (숨김)</span>}
            </span>
            <div style={{ width: 78, textAlign: 'right' }}>
              <input type="text" inputMode="numeric" value={r.price.toLocaleString()}
                onChange={e => setPrice(r.id, e.target.value)}
                className="rounded-lg px-2 py-1 text-xs text-right outline-none"
                style={{ width: 68, background: 'rgba(255,255,255,0.08)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div style={{ width: 58, display: 'flex', justifyContent: 'center' }}>
              <input type="text" inputMode="numeric" value={String(r.free_count)}
                onChange={e => setFree(r.id, e.target.value)}
                className="rounded-lg px-2 py-1 text-xs text-center outline-none"
                style={{ width: 40, background: 'rgba(255,255,255,0.08)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div style={{ width: 40, display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => toggle(r.id)}
                style={{ width: 34, height: 18, borderRadius: 20, position: 'relative',
                  background: r.active ? '#FAC775' : 'rgba(255,255,255,0.2)' }}>
                <span style={{ position: 'absolute', top: 2, [r.active ? 'right' : 'left']: 2,
                  width: 14, height: 14, borderRadius: '50%', background: '#fff' } as any} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs mt-2" style={{ color: '#8a88a0' }}>
        💡 무료횟수 = 결제 없이 볼 수 있는 횟수 (0이면 항상 유료)
      </div>

      <button onClick={saveAll} disabled={saving}
        className="py-2 px-5 rounded-xl text-sm font-bold mt-2"
        style={{ background: '#FAC775', color: '#1a1a18' }}>
        {saving ? '저장중...' : '저장'}
      </button>
    </div>
  )
}

// 홈화면 핵심서비스 가격표 (표시 토글 + 가격) — 가로 전체 폭
function HomePriceTable() {
  const [rows, setRows] = useState<HomePrice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await supabase.from('home_prices').select('*').order('sort')
    if (error) { alert('불러오기 실패: ' + error.message); return }
    setRows((data ?? []) as HomePrice[])
    setLoading(false)
  }

  function setPrice(key: string, raw: string) {
    const num = parseInt(raw.replace(/[^0-9]/g, '')) || 0
    setRows(prev => prev.map(r => r.service_key === key ? { ...r, price: num } : r))
  }
  function toggle(key: string) {
    setRows(prev => prev.map(r => r.service_key === key ? { ...r, show_price: !r.show_price } : r))
  }

  async function saveAll() {
    setSaving(true)
    for (const r of rows) {
      const { error } = await supabase.from('home_prices')
        .update({ price: r.price, show_price: r.show_price, updated_at: new Date().toISOString() })
        .eq('service_key', r.service_key)
      if (error) { alert('저장 실패(' + r.label + '): ' + error.message); setSaving(false); return }
    }
    setSaving(false)
    alert('홈화면 가격표 저장되었습니다')
    load()
  }

  if (loading) return <div className="text-sm" style={{ color: '#8a88a0' }}>불러오는 중...</div>

  return (
    <div style={{ width: '100%', marginTop: 24 }}>
      <div className="text-sm font-bold mb-2" style={{ color: '#FAC775' }}>🏠 홈화면 가격표</div>
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)', maxWidth: 500 }}>
        <div className="flex items-center px-3 py-2 text-xs font-bold"
          style={{ background: 'rgba(60,52,137,0.3)', color: '#FAC775',
            borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ flex: 1 }}>서비스</span>
          <span style={{ width: 100, textAlign: 'right' }}>가격</span>
          <span style={{ width: 44, textAlign: 'center' }}>표시</span>
        </div>

        {rows.map(r => (
          <div key={r.service_key} className="flex items-center px-3 py-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', opacity: r.show_price ? 1 : 0.45 }}>
            <span style={{ flex: 1, fontSize: 12, color: '#fff' }}>
              {r.label}{!r.show_price && <span style={{ fontSize: 10, color: '#8a88a0' }}> (숨김)</span>}
            </span>
            <div style={{ width: 100, textAlign: 'right' }}>
              <input type="text" inputMode="numeric" value={r.price.toLocaleString()}
                onChange={e => setPrice(r.service_key, e.target.value)}
                className="rounded-lg px-2 py-1 text-xs text-right outline-none"
                style={{ width: 88, background: 'rgba(255,255,255,0.08)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div style={{ width: 44, display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => toggle(r.service_key)}
                style={{ width: 34, height: 18, borderRadius: 20, position: 'relative',
                  background: r.show_price ? '#FAC775' : 'rgba(255,255,255,0.2)' }}>
                <span style={{ position: 'absolute', top: 2, [r.show_price ? 'right' : 'left']: 2,
                  width: 14, height: 14, borderRadius: '50%', background: '#fff' } as any} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs mt-2" style={{ color: '#8a88a0' }}>
        💡 표시 켜짐 = 홈 카드에 "○○원~" 노출 · 꺼짐 = 가격 줄 숨김
      </div>

      <button onClick={saveAll} disabled={saving}
        className="py-2 px-5 rounded-xl text-sm font-bold mt-2"
        style={{ background: '#FAC775', color: '#1a1a18' }}>
        {saving ? '저장중...' : '저장'}
      </button>
    </div>
  )
}

export default function PriceManager() {
  return (
    <div style={{ maxWidth: 1200 }}>
      <div className="text-base font-bold mb-1" style={{ color: '#FAC775' }}>💰 가격 관리</div>
      <p className="text-xs mb-4" style={{ color: '#8a88a0', lineHeight: 1.5 }}>
        전문가 상담 · AI 분석 · 타로 가격입니다. 노출을 끄면 고객 화면에서 해당 버튼이 숨겨집니다.
      </p>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <PriceTable title="🔮 전문가 상담 가격" table="consult_prices" />
        <PriceTable title="✨ AI 분석 가격" table="analysis_prices" />
        <TarotTable />
      </div>

      <HomePriceTable />

      <div className="text-xs mt-4" style={{ color: '#8a88a0' }}>
        💡 켜짐 = 고객에게 버튼 보임 · 꺼짐 = 숨김 · 각 표는 따로 저장합니다
      </div>
    </div>
  )
}
