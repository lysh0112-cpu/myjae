'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DEFAULT_THRESHOLD = 500000 // DB에서 못 불러올 때만 쓰는 기본값

const CATEGORIES: Record<string, string[]> = {
  '인건비': ['급여', '상담사 정산금', '상여금·수당', '일용직·아르바이트', '4대보험 사업자부담분', '퇴직급여'],
  '복리후생비': ['식대', '간식·다과', '경조사비', '기타 복리후생'],
  '임차료': ['사무실·상담소 렌트비', '관리비', '보증금(자산)'],
  '차량·운반비': ['유류비', '차량 렌트·리스', '주차비·통행료', '차량 보험·수리'],
  '지급수수료': ['결제수수료(토스)', 'AI·서버비', '카카오 알림톡', '세무·법무 수수료', '플랫폼 수수료'],
  '광고선전비': ['인스타·네이버 광고', '콘텐츠 제작', '이벤트·프로모션', '제휴 마케팅'],
  '통신비': ['인터넷·전화', '휴대폰', '도메인'],
  '소모품·비품': ['사무용품', '소모품', '비품(10만원 미만)', '비품(고가·자산)'],
  '세금·공과금': ['부가가치세', '소득세', '전기·수도·가스', '면허·등록세'],
  '여비교통비': ['대중교통·택시', '출장·숙박'],
  '기타': ['도서·교육비', '회의비·접대비', '잡비'],
}

const PAYMENT_METHODS = ['카드', '현금', '계좌이체']
const EVIDENCE_TYPES = ['세금계산서', '카드전표', '현금영수증', '간이영수증', '없음']

type Expense = {
  id: string
  seq_no: string | null
  expense_date: string
  category: string
  subcategory: string | null
  description: string | null
  amount: number
  payment_method: string
  evidence_type: string | null
  is_asset: boolean
  note: string | null
  approval_status: string
  needs_approval: boolean
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

export default function ExpenseManager() {
  const today = new Date().toISOString().slice(0, 10)
  const thisYear = String(new Date().getFullYear())

  const [list, setList] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 결재 기준 금액 (DB에서 불러옴)
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD)
  const [thresholdInput, setThresholdInput] = useState(String(DEFAULT_THRESHOLD))

  // 입력 폼
  const [date, setDate] = useState(today)
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('카드')
  const [evidenceType, setEvidenceType] = useState('카드전표')
  const [isAsset, setIsAsset] = useState(false)
  const [note, setNote] = useState('')

  // 조회 기간 필터
  const [filterYear, setFilterYear] = useState(thisYear)
  const [filterMonth, setFilterMonth] = useState('')

  // 기준 금액 불러오기
  const loadThreshold = async () => {
    const { data } = await supabase.from('accounting_settings')
      .select('value').eq('key', 'approval_threshold').single()
    if (data?.value) {
      setThreshold(Number(data.value))
      setThresholdInput(data.value)
    }
  }

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (!error && data) setList(data as Expense[])
    setLoading(false)
  }

  useEffect(() => { loadThreshold(); load() }, [])

  // 기준 금액 저장
  const saveThreshold = async () => {
    const v = Math.round(Number(thresholdInput) || 0)
    if (v <= 0) { alert('0보다 큰 금액을 입력해주세요.'); return }
    const { error } = await supabase.from('accounting_settings')
      .upsert({ key: 'approval_threshold', value: String(v), updated_at: new Date().toISOString() })
    if (error) { alert('저장 실패: ' + error.message); return }
    setThreshold(v)
    alert(`결재 기준 금액이 ${v.toLocaleString('ko-KR')}원으로 변경되었습니다.\n(앞으로 입력하는 지출부터 적용됩니다)`)
  }

  const onCategoryChange = (v: string) => { setCategory(v); setSubcategory('') }

  const resetForm = () => {
    setDate(today); setCategory(''); setSubcategory(''); setDescription('')
    setAmount(''); setPaymentMethod('카드'); setEvidenceType('카드전표')
    setIsAsset(false); setNote('')
  }

  const amountNum = Number(amount) || 0
  const willNeedApproval = amountNum >= threshold

  const save = async () => {
    if (!category) { alert('대분류를 선택해주세요.'); return }
    if (!amount || amountNum <= 0) { alert('금액을 입력해주세요.'); return }
    setSaving(true)
    const needsApproval = amountNum >= threshold
    const { error } = await supabase.from('expenses').insert({
      expense_date: date, category, subcategory: subcategory || null,
      description: description || null, amount: Math.round(amountNum),
      payment_method: paymentMethod, evidence_type: evidenceType,
      is_asset: isAsset, note: note || null,
      needs_approval: needsApproval,
      approval_status: needsApproval ? '결재대기' : '자동승인',
    })
    setSaving(false)
    if (error) { alert('저장 실패: ' + error.message); return }
    resetForm(); load()
  }

  const approve = async (id: string) => {
    const { error } = await supabase.from('expenses')
      .update({ approval_status: '승인', approved_by: '관리자', approved_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { alert('승인 실패: ' + error.message); return }
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('이 지출 내역을 삭제할까요?')) return
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    load()
  }

  const won = (n: number) => n.toLocaleString('ko-KR') + '원'

  const filtered = list.filter(e => {
    if (!e.expense_date) return false
    const yr = e.expense_date.slice(0, 4)
    const mo = e.expense_date.slice(5, 7)
    if (yr !== filterYear) return false
    if (filterMonth && mo !== filterMonth) return false
    return true
  })

  const total = filtered.reduce((s, e) => s + (e.is_asset ? 0 : e.amount), 0)
  const assetTotal = filtered.reduce((s, e) => s + (e.is_asset ? e.amount : 0), 0)
  const waitingCount = filtered.filter(e => e.approval_status === '결재대기').length

  const years = Array.from(new Set([thisYear, ...list.map(e => e.expense_date?.slice(0, 4)).filter(Boolean)]))
    .sort((a, b) => Number(b) - Number(a)) as string[]

  const downloadCSV = () => {
    if (filtered.length === 0) { alert('선택한 기간에 지출 내역이 없습니다.'); return }
    const headers = ['일련번호', '날짜', '대분류', '세부항목', '내용', '금액', '결제수단', '증빙', '구분', '상태', '비고']
    const rows = filtered.map(e => [
      e.seq_no || '', e.expense_date, e.category, e.subcategory || '',
      e.description || '', String(e.amount), e.payment_method, e.evidence_type || '',
      e.is_asset ? '자산' : '비용', e.approval_status, e.note || '',
    ])
    rows.push(['', '', '', '', '비용 합계', String(total), '', '', '', '', ''])
    rows.push(['', '', '', '', '자산성 합계', String(assetTotal), '', '', '', '', ''])
    const escape = (v: string) => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
    const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const periodLabel = filterMonth ? `${filterYear}-${filterMonth}` : filterYear
    a.href = url
    a.download = `명연재_지출내역_${periodLabel}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusBadge = (s: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      '자동승인': { bg: '#eef2ff', color: '#4338ca' },
      '결재대기': { bg: '#fff7ed', color: '#c2410c' },
      '승인': { bg: '#ecfdf5', color: '#047857' },
      '반려': { bg: '#fef2f2', color: '#b91c1c' },
    }
    const c = map[s] || { bg: '#f3f4f6', color: '#555' }
    return <span style={{ background: c.bg, color: c.color, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{s}</span>
  }

  const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 4px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: '#fff' }}>💰 관리회계 — 지출</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 16 }}>
        지출을 항목별로 기재합니다. 매출 집계는 결제 연동 후 추가됩니다.
      </p>

      {/* 결재 기준 금액 설정 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '12px 16px', background: 'rgba(255,255,255,0.06)', borderRadius: 10, flexWrap: 'wrap' }}>
        <span style={{ color: '#FAC775', fontWeight: 700, fontSize: 14 }}>⚙️ 결재 기준 금액</span>
        <input type="number" value={thresholdInput} onChange={e => setThresholdInput(e.target.value)}
          style={{ width: 140, padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14, textAlign: 'right' }} />
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>원 이상 → 자동 결재대기</span>
        <button onClick={saveThreshold}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#FAC775', color: '#1a1a18', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          기준 저장
        </button>
        <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>현재 적용: {won(threshold)}</span>
      </div>

      {/* 입력 폼 */}
      <div style={{ border: '1px solid #e5e5e5', borderRadius: 12, padding: 16, marginBottom: 24, background: '#fafafa' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          <label style={labelStyle}>날짜
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>대분류
            <select value={category} onChange={e => onCategoryChange(e.target.value)} style={inputStyle}>
              <option value="">선택</option>
              {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={labelStyle}>세부항목
            <select value={subcategory} onChange={e => setSubcategory(e.target.value)} style={inputStyle} disabled={!category}>
              <option value="">선택</option>
              {category && CATEGORIES[category].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={labelStyle}>내용
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="예: Vercel Pro 6월" style={inputStyle} />
          </label>
          <label style={labelStyle}>금액 (원)
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" style={inputStyle} />
          </label>
          <label style={labelStyle}>결제수단
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={inputStyle}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label style={labelStyle}>증빙
            <select value={evidenceType} onChange={e => setEvidenceType(e.target.value)} style={inputStyle}>
              {EVIDENCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label style={labelStyle}>비고
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="(선택)" style={inputStyle} />
          </label>
        </div>

        {willNeedApproval && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: '#fff7ed', color: '#c2410c', borderRadius: 8, fontSize: 13 }}>
            ⚠️ {won(threshold)} 이상 지출입니다. 저장 시 <b>결재대기</b>로 등록되며, 지출결의서에서 승인해야 확정됩니다.
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
            <input type="checkbox" checked={isAsset} onChange={e => setIsAsset(e.target.checked)} />
            자산성 항목 (보증금·고가 비품 등 — 손익 합계에서 제외)
          </label>
          <button onClick={save} disabled={saving}
            style={{ marginLeft: 'auto', padding: '10px 24px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? '저장 중…' : '지출 추가'}
          </button>
        </div>
      </div>

      {/* 기간 필터 + 엑셀 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ ...inputStyle, padding: '8px 12px' }}>
          {years.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ ...inputStyle, padding: '8px 12px' }}>
          <option value="">전체(연간)</option>
          {MONTHS.map(m => <option key={m} value={m}>{Number(m)}월</option>)}
        </select>
        <button onClick={downloadCSV}
          style={{ marginLeft: 'auto', padding: '9px 18px', borderRadius: 8, border: 'none', background: '#047857', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          📊 엑셀(CSV) 다운로드
        </button>
      </div>

      {/* 합계 요약 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={summaryBox}>
          <div style={{ fontSize: 12, color: '#888' }}>지출 합계 (비용)</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626' }}>{won(total)}</div>
        </div>
        <div style={summaryBox}>
          <div style={{ fontSize: 12, color: '#888' }}>자산성 합계 (참고)</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#555' }}>{won(assetTotal)}</div>
        </div>
        <div style={summaryBox}>
          <div style={{ fontSize: 12, color: '#888' }}>결재대기</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#c2410c' }}>{waitingCount}건</div>
        </div>
        <div style={summaryBox}>
          <div style={{ fontSize: 12, color: '#888' }}>건수 (해당 기간)</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{filtered.length}건</div>
        </div>
      </div>

      {/* 목록 표 */}
      <div style={{ overflowX: 'auto', border: '1px solid #e5e5e5', borderRadius: 12, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 950 }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={thStyle}>일련번호</th>
              <th style={thStyle}>날짜</th>
              <th style={thStyle}>대분류</th>
              <th style={thStyle}>세부항목</th>
              <th style={thStyle}>내용</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>금액</th>
              <th style={thStyle}>결제</th>
              <th style={thStyle}>증빙</th>
              <th style={thStyle}>상태</th>
              <th style={thStyle}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: '#999' }}>불러오는 중…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: '#999' }}>선택한 기간에 지출이 없어요.</td></tr>
            ) : (
              filtered.map(e => (
                <tr key={e.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#666' }}>{e.seq_no || '-'}</td>
                  <td style={tdStyle}>{e.expense_date}</td>
                  <td style={tdStyle}>{e.category}</td>
                  <td style={tdStyle}>{e.subcategory || '-'}</td>
                  <td style={tdStyle}>{e.description || '-'}{e.is_asset && <span style={{ marginLeft: 6, fontSize: 11, color: '#555' }}>(자산)</span>}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{won(e.amount)}</td>
                  <td style={tdStyle}>{e.payment_method}</td>
                  <td style={tdStyle}>{e.evidence_type || '-'}</td>
                  <td style={tdStyle}>{statusBadge(e.approval_status)}</td>
                  <td style={tdStyle}>
                    {e.approval_status === '결재대기' && (
                      <button onClick={() => approve(e.id)}
                        style={{ border: 'none', background: '#047857', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, marginRight: 6 }}>승인</button>
                    )}
                    <button onClick={() => remove(e.id)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}>🗑</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#555', fontWeight: 500 }
const inputStyle: React.CSSProperties = { padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14, background: '#fff' }
const summaryBox: React.CSSProperties = { flex: 1, minWidth: 140, border: '1px solid #e5e5e5', borderRadius: 10, padding: '12px 16px', background: '#fff' }
const thStyle: React.CSSProperties = { padding: '10px 12px', fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '10px 12px', whiteSpace: 'nowrap' }
