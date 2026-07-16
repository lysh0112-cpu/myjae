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
    <div>
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

// 홈화면 핵심서비스 가격표 (표시 토글 + 가격) — 타로 아래에 배치
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

  if (loading) return <div className="text-sm mt-6" style={{ color: '#8a88a0' }}>불러오는 중...</div>

  return (
    <div style={{ marginTop: 20 }}>
      <div className="text-sm font-bold mb-2" style={{ color: '#FAC775' }}>🏠 홈화면 가격표</div>
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
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

// 이름 짓기 조회 횟수 (개명) — app_settings 테이블의 naming_try_limit 하나만 저장
function NamingTryLimitBox() {
  const [value, setValue] = useState<number>(3)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'naming_try_limit')
      .maybeSingle()
      .then(({ data }) => {
        if (data && typeof data.value === 'number') setValue(data.value)
        setLoading(false)
      })
  }, [])

  async function save() {
    const v = Math.max(1, Math.min(20, value || 1))
    setSaving(true)
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: v, updated_at: new Date().toISOString() })
        .eq('key', 'naming_try_limit')
      if (error) throw error
      setValue(v)
      alert('이름 짓기 조회 횟수가 ' + v + '회로 저장되었습니다.')
    } catch (e) {
      console.error(e)
      alert('저장에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div className="text-sm font-bold mb-2" style={{ color: '#fff' }}>🔢 이름 짓기 조회 횟수</div>
      <div style={{ background: '#2C2C2A', border: '1px solid rgba(250,199,117,0.15)', borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, color: '#e8e4ff' }}>개명 이름 짓기</div>
            <div style={{ fontSize: 11, color: '#8a88a0', marginTop: 3 }}>한 번에 지어볼 수 있는 이름 개수</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="number" min={1} max={20} value={loading ? '' : value}
              onChange={(e) => setValue(parseInt(e.target.value) || 1)}
              style={{ width: 60, textAlign: 'center', padding: 8, borderRadius: 8, background: '#1a1a18', border: '1px solid rgba(255,255,255,0.1)', color: '#FAC775', fontSize: 14, fontWeight: 'bold' }} />
            <span style={{ fontSize: 13, color: '#8a88a0' }}>회</span>
          </div>
        </div>
      </div>
      <div className="text-xs mt-2" style={{ color: '#8a88a0' }}>
        💡 개명에서 &quot;다른 이름 또 지어보기&quot;로 만들 수 있는 총 횟수예요.
      </div>
      <button onClick={save} disabled={saving}
        className="mt-3 px-6 py-2 rounded-lg text-sm font-bold"
        style={{ background: '#FAC775', color: '#1a1a18', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
        {saving ? '저장 중…' : '저장'}
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
        <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column' }}>
          <PriceTable title="🔮 전문가 상담 가격" table="consult_prices" />
          <NamingTryLimitBox />
        </div>
        <PriceTable title="✨ AI 분석 가격" table="analysis_prices" />
        <div style={{ flex: 1, minWidth: 320 }}>
          <TarotTable />
          <HomePriceTable />
        </div>
      </div>

      <div className="text-xs mt-4" style={{ color: '#8a88a0' }}>
        💡 켜짐 = 고객에게 버튼 보임 · 꺼짐 = 숨김 · 각 표는 따로 저장합니다
      </div>
    </div>
  )
}
