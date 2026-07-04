'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const gold = '#FAC775'
const cardBg = '#2C2C2A'
const border = '1px solid rgba(250,199,117,0.15)'

interface PriceRow {
  price_key: string
  label: string
  price: number
  is_active: boolean
  free_count?: number
}

// 각 표별 설정
const CONSULT_KEYS = [
  { key: 'saju', label: '사주 상담' },
  { key: 'couple', label: '연인 궁합 상담' },
  { key: 'prewedding', label: '예비부부 상담' },
  { key: 'married', label: '부부 궁합 상담' },
  { key: 'birth_timing', label: '출산 택일 상담' },
  { key: 'mulsang', label: '사주 그림 상담' },
  { key: 'naming', label: '개명 상담' },
  { key: 'newborn', label: '아기 작명 상담' },
  { key: 'tarot', label: '타로 상담' },
]

function TableCard({
  title, icon, rows, onPriceChange, onToggle, onSave, showFree, onFreeChange, note,
}: {
  title: string
  icon: string
  rows: PriceRow[]
  onPriceChange: (key: string, v: number) => void
  onToggle: (key: string) => void
  onSave: () => void
  showFree?: boolean
  onFreeChange?: (key: string, v: number) => void
  note?: string
  children?: React.ReactNode
}) {
  return (
    <div>
      <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>{icon} {title}</div>
      <div style={{ background: cardBg, border, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', padding: '10px 14px', fontSize: '11px', color: '#8a88a0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ flex: 1 }}>종류</span>
          <span style={{ width: '80px', textAlign: 'right' }}>가격</span>
          {showFree && <span style={{ width: '56px', textAlign: 'center' }}>무료횟수</span>}
          <span style={{ width: '48px', textAlign: 'center' }}>노출</span>
        </div>
        {rows.map((r) => (
          <div key={r.price_key} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ flex: 1, fontSize: '13px', color: r.is_active ? '#e8e4ff' : '#666' }}>
              {r.label}{!r.is_active && ' (숨김)'}
            </span>
            <input type="number" value={r.price} onChange={(e) => onPriceChange(r.price_key, parseInt(e.target.value) || 0)}
              style={{ width: '80px', textAlign: 'right', padding: '6px 8px', borderRadius: '8px', background: '#1a1a18', border: '1px solid rgba(255,255,255,0.1)', color: gold, fontSize: '13px' }} />
            {showFree && (
              <input type="number" value={r.free_count ?? 0} onChange={(e) => onFreeChange?.(r.price_key, parseInt(e.target.value) || 0)}
                style={{ width: '44px', marginLeft: '12px', textAlign: 'center', padding: '6px 4px', borderRadius: '8px', background: '#1a1a18', border: '1px solid rgba(255,255,255,0.1)', color: gold, fontSize: '13px' }} />
            )}
            <button onClick={() => onToggle(r.price_key)}
              style={{ width: '40px', height: '22px', marginLeft: showFree ? '12px' : '8px', borderRadius: '11px', border: 'none', cursor: 'pointer', background: r.is_active ? gold : '#444', position: 'relative', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: '2px', left: r.is_active ? '20px' : '2px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
            </button>
          </div>
        ))}
      </div>
      {note && <div style={{ fontSize: '11px', color: '#8a88a0', margin: '8px 2px 0' }}>💡 {note}</div>}
      <button onClick={onSave}
        style={{ marginTop: '12px', padding: '10px 24px', borderRadius: '10px', background: gold, border: 'none', color: '#1a1a18', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
        저장
      </button>
    </div>
  )
}

export default function PriceManager() {
  const [consult, setConsult] = useState<PriceRow[]>([])
  const [analysis, setAnalysis] = useState<PriceRow[]>([])
  const [tarot, setTarot] = useState<PriceRow[]>([])
  const [home, setHome] = useState<PriceRow[]>([])

  // ★ 이름 짓기 조회 횟수 (개명·아기 공통)
  const [namingTryLimit, setNamingTryLimit] = useState<number>(3)
  const [savingTry, setSavingTry] = useState(false)

  useEffect(() => {
    supabase.from('consult_prices').select('*').order('sort_order').then(({ data }) => { if (data) setConsult(data) })
    supabase.from('analysis_prices').select('*').order('sort_order').then(({ data }) => { if (data) setAnalysis(data) })
    supabase.from('tarot_prices').select('*').order('sort_order').then(({ data }) => { if (data) setTarot(data) })
    supabase.from('home_prices').select('*').order('sort_order').then(({ data }) => { if (data) setHome(data) })
    // ★ 회차 설정 읽기
    supabase.from('app_settings').select('value').eq('key', 'naming_try_limit').maybeSingle()
      .then(({ data }) => { if (data && typeof data.value === 'number') setNamingTryLimit(data.value) })
  }, [])

  function makeHandlers(
    rows: PriceRow[],
    setRows: (r: PriceRow[]) => void,
    table: string,
  ) {
    return {
      onPriceChange: (key: string, v: number) => setRows(rows.map((r) => r.price_key === key ? { ...r, price: v } : r)),
      onFreeChange: (key: string, v: number) => setRows(rows.map((r) => r.price_key === key ? { ...r, free_count: v } : r)),
      onToggle: (key: string) => setRows(rows.map((r) => r.price_key === key ? { ...r, is_active: !r.is_active } : r)),
      onSave: async () => {
        for (const r of rows) {
          const payload: Record<string, unknown> = { price: r.price, is_active: r.is_active }
          if (r.free_count !== undefined) payload.free_count = r.free_count
          await supabase.from(table).update(payload).eq('price_key', r.price_key)
        }
        alert('저장되었습니다.')
      },
    }
  }

  // ★ 회차 저장
  async function saveTryLimit() {
    const v = Math.max(1, Math.min(20, namingTryLimit || 1))
    setSavingTry(true)
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: v, updated_at: new Date().toISOString() })
        .eq('key', 'naming_try_limit')
      if (error) throw error
      setNamingTryLimit(v)
      alert('이름 짓기 조회 횟수가 ' + v + '회로 저장되었습니다.')
    } catch (e) {
      console.error(e)
      alert('저장에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSavingTry(false)
    }
  }

  const consultH = makeHandlers(consult, setConsult, 'consult_prices')
  const analysisH = makeHandlers(analysis, setAnalysis, 'analysis_prices')
  const tarotH = makeHandlers(tarot, setTarot, 'tarot_prices')
  const homeH = makeHandlers(home, setHome, 'home_prices')

  return (
    <div>
      <p style={{ fontSize: '12px', color: '#8a88a0', margin: '0 0 20px' }}>
        전문가 상담 · AI 분석 · 타로 가격입니다. 노출을 끄면 고객 화면에서 해당 버튼이 숨겨집니다.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', alignItems: 'start' }}>
        {/* ── 전문가 상담 가격 ── */}
        <div>
          <TableCard
            title="전문가 상담 가격" icon="🧑‍⚕️"
            rows={consult}
            onPriceChange={consultH.onPriceChange}
            onToggle={consultH.onToggle}
            onSave={consultH.onSave}
          />

          {/* ★ 이름 짓기 조회 횟수 (전문가 상담 하단, 같은 폭의 독립 박스) */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>🔢 이름 짓기 조회 횟수</div>
            <div style={{ background: cardBg, border, borderRadius: '12px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#e8e4ff' }}>개명 · 아기 이름 공통</div>
                  <div style={{ fontSize: '11px', color: '#8a88a0', marginTop: '3px' }}>한 번에 지어볼 수 있는 이름 개수</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="number" min={1} max={20} value={namingTryLimit}
                    onChange={(e) => setNamingTryLimit(parseInt(e.target.value) || 1)}
                    style={{ width: '60px', textAlign: 'center', padding: '8px', borderRadius: '8px', background: '#1a1a18', border: '1px solid rgba(255,255,255,0.1)', color: gold, fontSize: '14px', fontWeight: 'bold' }} />
                  <span style={{ fontSize: '13px', color: '#8a88a0' }}>회</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#8a88a0', margin: '8px 2px 0' }}>
              💡 개명과 아기 이름짓기에서 "다른 이름 또 지어보기"로 만들 수 있는 총 횟수예요.
            </div>
            <button onClick={saveTryLimit} disabled={savingTry}
              style={{ marginTop: '12px', padding: '10px 24px', borderRadius: '10px', background: gold, border: 'none', color: '#1a1a18', fontSize: '13px', fontWeight: 'bold', cursor: savingTry ? 'default' : 'pointer', opacity: savingTry ? 0.6 : 1 }}>
              {savingTry ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>

        {/* ── AI 분석 가격 ── */}
        <TableCard
          title="AI 분석 가격" icon="✨"
          rows={analysis}
          onPriceChange={analysisH.onPriceChange}
          onToggle={analysisH.onToggle}
          onSave={analysisH.onSave}
        />

        {/* ── 타로 가격 + 홈화면 가격표 ── */}
        <div>
          <TableCard
            title="타로 가격" icon="🎴"
            rows={tarot}
            showFree
            onPriceChange={tarotH.onPriceChange}
            onFreeChange={tarotH.onFreeChange}
            onToggle={tarotH.onToggle}
            onSave={tarotH.onSave}
            note="무료횟수 = 결제 없이 볼 수 있는 횟수 (0이면 항상 유료)"
          />

          <div style={{ marginTop: '24px' }}>
            <TableCard
              title="홈화면 가격표" icon="🏠"
              rows={home}
              onPriceChange={homeH.onPriceChange}
              onToggle={homeH.onToggle}
              onSave={homeH.onSave}
              note='표시 켜짐 = 홈 카드에 "○○원~" 노출 · 꺼짐 = 가격 줄 숨김'
            />
          </div>
        </div>
      </div>

      <div style={{ fontSize: '11px', color: '#8a88a0', marginTop: '20px' }}>
        💡 켜짐 = 고객에게 버튼 보임 · 꺼짐 = 숨김 · 각 표는 따로 저장합니다
      </div>
    </div>
  )
}
