'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ▼ 지출결의서 자동 생성 기준 금액 (이 숫자만 바꾸면 기준이 바뀜)
const APPROVAL_THRESHOLD = 500000

// 대분류 → 세부항목 매핑
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

  const [list, setList] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [date, setDate] = useState(today)
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('카드')
  const [evidenceType, setEvidenceType] = useState('카드전표')
  const [isAsset, setIsAsset] = useState(false)
  const [note, setNote] = useState('')

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

  useEffect(() => { load() }, [])

  const onCategoryChange = (v: string) => {
    setCategory(v)
    setSubcategory('')
  }

  const resetForm = () => {
    setDate(today)
    setCategory('')
    setSubcategory('')
    setDescription('')
    setAmount('')
    setPaymentMethod('카드')
    setEvidenceType('카드전표')
    setIsAsset(false)
    setNote('')
  }

  const amountNum = Number(amount) || 0
  const willNeedApproval = amountNum >= APPROVAL_THRESHOLD

  const save = async () => {
    if (!category) { alert('대분류를 선택해주세요.'); return }
    if (!amount || amountNum <= 0) { alert('금액을 입력해주세요.'); return }

    setSaving(true)
    const needsApproval = amountNum >= APPROVAL_THRESHOLD
    const { error } = await supabase.from('expenses').insert({
      expense_date: date,
      category,
      subcategory: subcategory || null,
      description: description || null,
      amount: Math.round(amountNum),
      payment_method: paymentMethod,
      evidence_type: evidenceType,
      is_asset: isAsset,
      note: note || null,
      needs_approval: needsApproval,
      approval_status: needsApproval ? '결재대기' : '자동승인',
    })
    setSaving(false)

    if (error) { alert('저장 실패: ' + error.message); return }
    resetForm()
    load()
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

  const total = list.reduce((sum, e) => sum + (e.is_asset ? 0 : e.amount), 0)
  const assetTotal = list.reduce((sum, e) => sum + (e.is_asset ? e.amount : 0), 0)
  const waitingCount = list.filter(e => e.approval_status === '결재대기').length

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

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 4px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>💰 관리회계 — 지출</h2>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
        지출을 항목별로 기재합니다. {won(APPROVAL_THRESHOLD)} 이상은 자동으로 결재대기로 들어갑니다. 매출 집계·엑셀 출력은 다음 단계에서 추가됩니다.
      </p>

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
            ⚠️ {won(APPROVAL_THRESHOLD)} 이상 지출입니다. 저장 시 <b>결재대기</b>로 등록되며, 목록에서 승인해야 확정됩니다.
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
          <div style={{ fontSize: 12, color: '#888' }}>전체 건수</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{list.length}건</div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e5e5e5', borderRadius: 12 }}>
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
            ) : list.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: '#999' }}>아직 입력된 지출이 없어요.</td></tr>
            ) : (
              list.map(e => (
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
                        style={{ border: 'none', background: '#047857', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, marginRight: 6 }}>
                        승인
                      </button>
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
