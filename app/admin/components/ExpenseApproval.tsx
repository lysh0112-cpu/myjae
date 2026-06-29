'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
  handler: string | null
  approver: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

type Receipt = {
  id: string
  expense_id: string
  file_url: string
  file_name: string | null
  created_at: string
}

export default function ExpenseApproval() {
  const [list, setList] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'결재대기' | '전체'>('결재대기')

  const [selected, setSelected] = useState<Expense | null>(null)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [handler, setHandler] = useState('')
  const [approver, setApprover] = useState('')
  const [uploading, setUploading] = useState(false)
  const [viewImg, setViewImg] = useState<string | null>(null)

  const won = (n: number) => n.toLocaleString('ko-KR') + '원'

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('expenses').select('*')
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (!error && data) {
      let rows = data as Expense[]
      if (filter === '결재대기') rows = rows.filter(e => e.approval_status === '결재대기')
      else rows = rows.filter(e => e.needs_approval)
      setList(rows)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  const openDoc = async (e: Expense) => {
    setSelected(e)
    setHandler(e.handler || '')
    setApprover(e.approver || '')
    setViewImg(null)
    const { data } = await supabase.from('expense_receipts')
      .select('*').eq('expense_id', e.id).order('created_at', { ascending: true })
    setReceipts((data as Receipt[]) || [])
  }

  const closeDoc = () => { setSelected(null); setReceipts([]); setViewImg(null) }

  const saveNames = async () => {
    if (!selected) return
    const { error } = await supabase.from('expenses')
      .update({ handler: handler || null, approver: approver || null }).eq('id', selected.id)
    if (error) { alert('저장 실패: ' + error.message); return }
    alert('저장되었습니다.'); load()
  }

  const uploadFiles = async (files: FileList | null) => {
    if (!selected || !files || files.length === 0) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `${selected.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: upErr } = await supabase.storage.from('receipts').upload(path, file)
      if (upErr) { alert('업로드 실패: ' + upErr.message); continue }
      const { data: pub } = supabase.storage.from('receipts').getPublicUrl(path)
      await supabase.from('expense_receipts').insert({
        expense_id: selected.id, file_url: pub.publicUrl, file_name: file.name,
      })
    }
    setUploading(false)
    const { data } = await supabase.from('expense_receipts')
      .select('*').eq('expense_id', selected.id).order('created_at', { ascending: true })
    setReceipts((data as Receipt[]) || [])
  }

  const removeReceipt = async (r: Receipt) => {
    if (!confirm('이 증빙을 삭제할까요?')) return
    await supabase.from('expense_receipts').delete().eq('id', r.id)
    const marker = '/receipts/'
    const idx = r.file_url.indexOf(marker)
    if (idx >= 0) {
      const path = r.file_url.slice(idx + marker.length)
      await supabase.storage.from('receipts').remove([path])
    }
    setReceipts(prev => prev.filter(x => x.id !== r.id))
  }

  const decide = async (status: '승인' | '반려') => {
    if (!selected) return
    const { error } = await supabase.from('expenses')
      .update({
        approval_status: status, handler: handler || null, approver: approver || null,
        approved_by: approver || '관리자', approved_at: new Date().toISOString(),
      }).eq('id', selected.id)
    if (error) { alert('처리 실패: ' + error.message); return }
    alert(status + ' 처리되었습니다.'); closeDoc(); load()
  }

  // A4 인쇄 (withReceipts=true면 증빙 이미지까지 포함)
  const printDoc = (withReceipts: boolean) => {
    if (!selected) return
    const e = selected
    const imgsHtml = withReceipts && receipts.length > 0
      ? `<div class="receipts"><div class="rcpt-title">증빙 자료 (${receipts.length}장)</div>${
          receipts.map(r => `<img src="${r.file_url}" />`).join('')
        }</div>`
      : (receipts.length > 0 ? `<div class="rcpt-note">※ 증빙 ${receipts.length}장 별첨</div>` : '')

    const html = `
      <html><head><meta charset="utf-8"><title>지출결의서 ${e.seq_no || ''}</title>
      <style>
        @page { size: A4; margin: 18mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Malgun Gothic','맑은 고딕',sans-serif; color: #222; }
        .head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 24px; }
        h1 { font-size: 26px; letter-spacing: 8px; margin: 0; }
        .seq { font-size: 12px; color:#666; margin-top:6px; }
        .stamp { display:flex; border:1px solid #333; }
        .stamp .col { width:80px; text-align:center; border-left:1px solid #333; }
        .stamp .col:first-child { border-left:none; }
        .stamp .h { font-size:11px; font-weight:bold; background:#f0f0f0; padding:4px 0; border-bottom:1px solid #333; }
        .stamp .v { height:48px; display:flex; align-items:center; justify-content:center; font-size:14px; }
        table { width:100%; border-collapse:collapse; font-size:14px; }
        td { border:1px solid #333; padding:9px 10px; }
        td.th { background:#f0f0f0; font-weight:bold; width:16%; white-space:nowrap; }
        .receipts { margin-top:28px; }
        .rcpt-title { font-weight:bold; font-size:14px; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:4px; }
        .receipts img { width:100%; max-height:240mm; object-fit:contain; margin-bottom:14px; page-break-inside:avoid; }
        .rcpt-note { margin-top:20px; font-size:13px; color:#555; }
        .foot { margin-top:30px; font-size:12px; color:#555; text-align:right; }
      </style></head><body>
        <div class="head">
          <div><h1>지 출 결 의 서</h1><div class="seq">${e.seq_no || ''}</div></div>
          <div class="stamp">
            <div class="col"><div class="h">담당</div><div class="v">${handler || ''}</div></div>
            <div class="col"><div class="h">결재권자</div><div class="v">${approver || ''}</div></div>
          </div>
        </div>
        <table><tbody>
          <tr><td class="th">일련번호</td><td>${e.seq_no || '-'}</td><td class="th">지출일</td><td>${e.expense_date}</td></tr>
          <tr><td class="th">대분류</td><td>${e.category}</td><td class="th">세부항목</td><td>${e.subcategory || '-'}</td></tr>
          <tr><td class="th">금액</td><td><b>${won(e.amount)}</b></td><td class="th">결제수단</td><td>${e.payment_method}</td></tr>
          <tr><td class="th">증빙종류</td><td>${e.evidence_type || '-'}</td><td class="th">구분</td><td>${e.is_asset ? '자산' : '비용'}</td></tr>
          <tr><td class="th">내용</td><td colspan="3">${e.description || '-'}</td></tr>
          <tr><td class="th">비고</td><td colspan="3">${e.note || '-'}</td></tr>
          <tr><td class="th">상태</td><td colspan="3">${e.approval_status}${e.approved_at ? ` (${new Date(e.approved_at).toLocaleString('ko-KR')})` : ''}</td></tr>
        </tbody></table>
        ${imgsHtml}
        <div class="foot">출력일: ${new Date().toLocaleString('ko-KR')}</div>
      </body></html>`

    const w = window.open('', '_blank')
    if (!w) { alert('팝업이 차단되었습니다. 팝업을 허용해주세요.'); return }
    w.document.write(html)
    w.document.close()
    // 이미지 로딩 후 인쇄
    w.onload = () => { setTimeout(() => { w.print() }, 300) }
  }

  const statusBadge = (s: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      '결재대기': { bg: '#fff7ed', color: '#c2410c' },
      '승인': { bg: '#ecfdf5', color: '#047857' },
      '반려': { bg: '#fef2f2', color: '#b91c1c' },
    }
    const c = map[s] || { bg: '#f3f4f6', color: '#555' }
    return <span style={{ background: c.bg, color: c.color, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{s}</span>
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '8px 4px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: '#fff' }}>🧾 지출결의서</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20 }}>
        결재가 필요한 지출을 결재하고, 증빙 이미지를 첨부·보관·인쇄합니다.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['결재대기', '전체'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              background: filter === f ? '#7c3aed' : 'rgba(255,255,255,0.08)',
              color: filter === f ? '#fff' : 'rgba(255,255,255,0.6)',
            }}>{f}</button>
        ))}
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e5e5e5', borderRadius: 12, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={thStyle}>일련번호</th>
              <th style={thStyle}>날짜</th>
              <th style={thStyle}>대분류</th>
              <th style={thStyle}>내용</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>금액</th>
              <th style={thStyle}>상태</th>
              <th style={thStyle}>결의서</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#999' }}>불러오는 중…</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#999' }}>해당하는 건이 없어요.</td></tr>
            ) : (
              list.map(e => (
                <tr key={e.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#666' }}>{e.seq_no || '-'}</td>
                  <td style={tdStyle}>{e.expense_date}</td>
                  <td style={tdStyle}>{e.category}</td>
                  <td style={tdStyle}>{e.description || '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{won(e.amount)}</td>
                  <td style={tdStyle}>{statusBadge(e.approval_status)}</td>
                  <td style={tdStyle}>
                    <button onClick={() => openDoc(e)}
                      style={{ border: 'none', background: '#7c3aed', color: '#fff', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>열기</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 결의서 상세 모달 */}
      {selected && (
        <div onClick={closeDoc}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, padding: 20, overflowY: 'auto' }}>
          <div onClick={ev => ev.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, maxWidth: 760, width: '100%', padding: 28, marginTop: 30 }}>

            {/* 제목줄 + 우측 작은 결재란 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>지 출 결 의 서</h3>
                {statusBadge(selected.approval_status)}
              </div>
              <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid #ccc', borderRadius: 6, overflow: 'hidden' }}>
                <div style={stampCol}>
                  <div style={stampHead}>담당</div>
                  <input value={handler} onChange={e => setHandler(e.target.value)} placeholder="-" style={stampInput} />
                </div>
                <div style={{ ...stampCol, borderLeft: '1px solid #ccc' }}>
                  <div style={stampHead}>결재권자</div>
                  <input value={approver} onChange={e => setApprover(e.target.value)} placeholder="-" style={stampInput} />
                </div>
                <button onClick={saveNames} title="이름 저장"
                  style={{ border: 'none', borderLeft: '1px solid #ccc', background: '#f8f8f8', cursor: 'pointer', padding: '0 10px', fontSize: 11, color: '#555' }}>저장</button>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 20 }}>
              <tbody>
                <tr><td style={docTh}>일련번호</td><td style={docTd}>{selected.seq_no || '-'}</td>
                    <td style={docTh}>지출일</td><td style={docTd}>{selected.expense_date}</td></tr>
                <tr><td style={docTh}>대분류</td><td style={docTd}>{selected.category}</td>
                    <td style={docTh}>세부항목</td><td style={docTd}>{selected.subcategory || '-'}</td></tr>
                <tr><td style={docTh}>금액</td><td style={docTd}><b>{won(selected.amount)}</b></td>
                    <td style={docTh}>결제수단</td><td style={docTd}>{selected.payment_method}</td></tr>
                <tr><td style={docTh}>증빙종류</td><td style={docTd}>{selected.evidence_type || '-'}</td>
                    <td style={docTh}>구분</td><td style={docTd}>{selected.is_asset ? '자산' : '비용'}</td></tr>
                <tr><td style={docTh}>내용</td><td style={docTd} colSpan={3}>{selected.description || '-'}</td></tr>
                <tr><td style={docTh}>비고</td><td style={docTd} colSpan={3}>{selected.note || '-'}</td></tr>
              </tbody>
            </table>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <strong style={{ fontSize: 15 }}>증빙 이미지 ({receipts.length}장)</strong>
                <label style={{ padding: '7px 14px', borderRadius: 8, background: '#7c3aed', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  {uploading ? '업로드 중…' : '+ 이미지 추가'}
                  <input type="file" accept="image/*" multiple hidden onChange={e => uploadFiles(e.target.files)} disabled={uploading} />
                </label>
              </div>
              {receipts.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#aaa', border: '1px dashed #ddd', borderRadius: 10, fontSize: 13 }}>
                  아직 첨부된 증빙이 없어요. 영수증·세금계산서·통장 사본을 올려보세요.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                  {receipts.map(r => (
                    <div key={r.id} style={{ position: 'relative', border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
                      <img src={r.file_url} alt={r.file_name || ''} onClick={() => setViewImg(r.file_url)}
                        style={{ width: '100%', height: 110, objectFit: 'cover', cursor: 'pointer', display: 'block' }} />
                      <button onClick={() => removeReceipt(r)}
                        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 6, width: 24, height: 24, cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 인쇄 버튼 2개 + 결재 버튼 */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 24, borderTop: '1px solid #eee', paddingTop: 18, flexWrap: 'wrap' }}>
              <button onClick={() => printDoc(false)}
                style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #555', background: '#fff', color: '#333', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                🖨 양식만 인쇄
              </button>
              <button onClick={() => printDoc(true)}
                style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #555', background: '#fff', color: '#333', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                🖨 증빙 포함 인쇄
              </button>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                <button onClick={() => decide('반려')}
                  style={{ padding: '10px 22px', borderRadius: 8, border: '1px solid #dc2626', background: '#fff', color: '#dc2626', fontWeight: 600, cursor: 'pointer' }}>반려</button>
                <button onClick={() => decide('승인')}
                  style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#047857', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>승인</button>
              </div>
            </div>
            {selected.approved_at && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#888', textAlign: 'right' }}>
                최종 처리: {selected.approved_by} · {new Date(selected.approved_at).toLocaleString('ko-KR')}
              </div>
            )}
          </div>
        </div>
      )}

      {viewImg && (
        <div onClick={() => setViewImg(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <img src={viewImg} alt="" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '10px 12px', fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '10px 12px', whiteSpace: 'nowrap' }
const docTh: React.CSSProperties = { background: '#f8f8f8', padding: '8px 10px', fontWeight: 600, color: '#555', border: '1px solid #eee', width: '15%', whiteSpace: 'nowrap' }
const docTd: React.CSSProperties = { padding: '8px 10px', border: '1px solid #eee' }
const stampCol: React.CSSProperties = { width: 72, display: 'flex', flexDirection: 'column' }
const stampHead: React.CSSProperties = { background: '#f5f5f5', fontSize: 11, fontWeight: 700, color: '#666', textAlign: 'center', padding: '3px 0', borderBottom: '1px solid #ccc' }
const stampInput: React.CSSProperties = { border: 'none', width: '100%', textAlign: 'center', padding: '10px 4px', fontSize: 13, outline: 'none', height: 38 }
