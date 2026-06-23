'use client'
import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Consultation = {
  id: string
  created_at: string
  customer_phone: string
  paid_amount: number
  status: string
  consultant_id: string
  assigned_consultant_id: string
  booking_date: string
  completed_date: string
  ai_analysis: string
  summary: string
}

type Consultant = {
  id: string
  name: string
}

type Props = {
  list: Consultation[]
  consultants: Consultant[]
  onDelete: (id: string) => void
  onExcel: () => void
  onRefresh: () => void
}

export default function DashboardTable({ list, consultants, onDelete, onExcel, onRefresh }: Props) {
  const [selectedConsultant, setSelectedConsultant] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [expandedAI, setExpandedAI] = useState<string | null>(null)
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Consultation>>({})
  // 강제배정만 로컬 상태로 관리 (재렌더링 최소화)
  const [assignMap, setAssignMap] = useState<Record<string, string>>({})

  // assignMap 초기화 (list 변경 시)
  React.useEffect(() => {
    const map: Record<string, string> = {}
    list.forEach(c => { map[c.id] = c.assigned_consultant_id || '' })
    setAssignMap(map)
  }, [list])

  const getConsultantName = (id: string) => {
    if (!id) return 'AI'
    return consultants.find(c => c.id === id)?.name ?? 'AI'
  }

  const getStatusLabel = (status: string) => {
    if (status === 'paid') return '결제완료'
    if (status === 'closed') return '종료'
    if (status === 'pending') return '대기중'
    return status
  }

  const getStatusStyle = (status: string) => {
    if (status === 'paid') return { background: 'rgba(250,199,117,0.15)', color: '#FAC775' }
    if (status === 'closed') return { background: 'rgba(255,100,100,0.15)', color: '#ff6464' }
    return { background: 'rgba(76,175,80,0.15)', color: '#81c784' }
  }

  // 날짜 문자열 → input[type=date] 용 yyyy-MM-dd 변환 (Invalid Date 방어)
  const toDateInput = (val: string | null | undefined) => {
    if (!val || val === 'Invalid Date') return ''
    const d = new Date(val)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0]
  }

  async function handleAssign(consultationId: string, consultantId: string) {
    // 해당 행만 업데이트, 전체 리렌더링 없음
    setAssignMap(prev => ({ ...prev, [consultationId]: consultantId }))
    await supabase.from('consultations')
      .update({ assigned_consultant_id: consultantId || null })
      .eq('id', consultationId)
  }

  function startEdit(c: Consultation) {
    setEditingId(c.id)
    setEditForm({
      paid_amount: c.paid_amount,
      status: c.status,
      booking_date: toDateInput(c.booking_date),
      completed_date: toDateInput(c.completed_date),
    })
  }

  async function saveEdit(id: string) {
    await supabase.from('consultations').update({
      paid_amount: editForm.paid_amount,
      status: editForm.status,
      booking_date: editForm.booking_date || null,
      completed_date: editForm.completed_date || null,
    }).eq('id', id)
    setEditingId(null)
    onRefresh()
  }

  // 삭제: DashboardTable에서 직접 처리 후 부모에도 알림
  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    const { error } = await supabase.from('consultations').delete().eq('id', id)
    if (error) {
      alert('삭제 실패: ' + error.message)
      return
    }
    onDelete(id)
  }

  const filtered = list
    .filter(c => selectedConsultant === 'all' ? true :
      selectedConsultant === 'ai' ? !c.consultant_id :
      c.consultant_id === selectedConsultant)
    .filter(c => selectedStatus === 'all' ? true : c.status === selectedStatus)

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>

      <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-sm font-bold text-white">
            상담 내역
            <span className="ml-2 text-xs" style={{ color: '#8a88a0' }}>총 {filtered.length}건</span>
          </div>
          <select value={selectedConsultant} onChange={e => setSelectedConsultant(e.target.value)}
            className="rounded-xl px-3 py-1.5 text-xs outline-none"
            style={{ background: '#1a1a18', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
            <option value="all">전체 상담사</option>
            <option value="ai">AI 분석</option>
            {consultants.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
            className="rounded-xl px-3 py-1.5 text-xs outline-none"
            style={{ background: '#1a1a18', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
            <option value="all">전체 상태</option>
            <option value="paid">결제완료</option>
            <option value="pending">대기중</option>
            <option value="closed">종료</option>
          </select>
        </div>
        <button onClick={onExcel}
          className="px-4 py-2 rounded-xl text-xs font-bold"
          style={{ background: 'rgba(76,175,80,0.2)', color: '#81c784', border: '1px solid rgba(76,175,80,0.3)' }}>
          📊 엑셀 다운로드
        </button>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: '1100px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr style={{ background: 'rgba(60,52,137,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['일자', '예약일', '완료일', '담당상담사', '강제배정', '전화번호', '결제금액', '상태', 'AI분석', '상담내용', '수정', '삭제'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-bold whitespace-nowrap"
                  style={{ color: '#FAC775' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center py-10 text-sm"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>내역 없음</td>
              </tr>
            )}
            {filtered.map((c, i) => (
              <React.Fragment key={c.id}>
                <tr style={{
                  background: editingId === c.id ? 'rgba(60,52,137,0.2)' : i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.04)'
                }}>
                  <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: '#8a88a0' }}>
                    {new Date(c.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-3 py-2">
                    {editingId === c.id ? (
                      <input type="date" value={editForm.booking_date || ''}
                        onChange={e => setEditForm({ ...editForm, booking_date: e.target.value })}
                        className="rounded px-2 py-1 text-xs outline-none w-28"
                        style={{ background: '#1a1a18', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }} />
                    ) : (
                      <span className="text-xs" style={{ color: '#8a88a0' }}>
                        {toDateInput(c.booking_date)
                          ? new Date(c.booking_date).toLocaleDateString('ko-KR')
                          : '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editingId === c.id ? (
                      <input type="date" value={editForm.completed_date || ''}
                        onChange={e => setEditForm({ ...editForm, completed_date: e.target.value })}
                        className="rounded px-2 py-1 text-xs outline-none w-28"
                        style={{ background: '#1a1a18', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }} />
                    ) : (
                      <span className="text-xs" style={{ color: '#8a88a0' }}>
                        {toDateInput(c.completed_date)
                          ? new Date(c.completed_date).toLocaleDateString('ko-KR')
                          : '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="text-xs px-2 py-1 rounded-full"
                      style={{
                        background: c.consultant_id ? 'rgba(60,52,137,0.3)' : 'rgba(250,199,117,0.15)',
                        color: c.consultant_id ? '#b0aec8' : '#FAC775'
                      }}>
                      {getConsultantName(c.consultant_id)}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <select
                      value={assignMap[c.id] ?? ''}
                      onChange={e => handleAssign(c.id, e.target.value)}
                      className="rounded-lg px-2 py-1 text-xs outline-none"
                      style={{
                        background: assignMap[c.id] ? 'rgba(231,76,60,0.2)' : '#1a1a18',
                        color: assignMap[c.id] ? '#ff8080' : 'rgba(255,255,255,0.4)',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                      <option value="">배정안함</option>
                      {consultants.map(con => (
                        <option key={con.id} value={con.id}>{con.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3 text-sm text-white whitespace-nowrap">{c.customer_phone}</td>
                  <td className="px-3 py-2">
                    {editingId === c.id ? (
                      <input type="number" value={editForm.paid_amount || 0}
                        onChange={e => setEditForm({ ...editForm, paid_amount: parseInt(e.target.value) || 0 })}
                        className="rounded px-2 py-1 text-xs outline-none w-24"
                        style={{ background: '#1a1a18', color: '#FAC775', border: '1px solid rgba(255,255,255,0.2)' }} />
                    ) : (
                      <span className="text-sm font-bold" style={{ color: '#FAC775' }}>
                        {(c.paid_amount || 0).toLocaleString()}원
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editingId === c.id ? (
                      <select value={editForm.status || ''}
                        onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                        className="rounded px-2 py-1 text-xs outline-none"
                        style={{ background: '#1a1a18', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <option value="paid">결제완료</option>
                        <option value="pending">대기중</option>
                        <option value="closed">종료</option>
                      </select>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full" style={getStatusStyle(c.status)}>
                        {getStatusLabel(c.status)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {c.ai_analysis ? (
                      <button onClick={() => setExpandedAI(expandedAI === c.id ? null : c.id)}
                        className="px-2 py-1 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(250,199,117,0.15)', color: '#FAC775' }}>
                        {expandedAI === c.id ? '접기' : '보기'}
                      </button>
                    ) : <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>없음</span>}
                  </td>
                  <td className="px-3 py-3">
                    {c.summary ? (
                      <button onClick={() => setExpandedSummary(expandedSummary === c.id ? null : c.id)}
                        className="px-2 py-1 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(60,52,137,0.3)', color: '#b0aec8' }}>
                        {expandedSummary === c.id ? '접기' : '보기'}
                      </button>
                    ) : <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>없음</span>}
                  </td>
                  <td className="px-3 py-3">
                    {editingId === c.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => saveEdit(c.id)}
                          className="px-2 py-1 rounded-lg text-xs font-bold"
                          style={{ background: 'rgba(76,175,80,0.2)', color: '#81c784' }}>
                          저장
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="px-2 py-1 rounded-lg text-xs font-bold"
                          style={{ background: 'rgba(255,255,255,0.08)', color: '#8a88a0' }}>
                          취소
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(c)}
                        className="px-3 py-1 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(250,199,117,0.15)', color: '#FAC775' }}>
                        수정
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => handleDelete(c.id)}
                      className="px-3 py-1 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(255,100,100,0.15)', color: '#ff6464' }}>
                      삭제
                    </button>
                  </td>
                </tr>
                {expandedAI === c.id && (
                  <tr style={{ background: 'rgba(250,199,117,0.05)' }}>
                    <td colSpan={12} className="px-6 py-3 text-xs"
                      style={{ color: '#b0aec8', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="font-bold mb-1" style={{ color: '#FAC775' }}>AI 분석 내용</div>
                      {typeof c.ai_analysis === 'string'
                        ? c.ai_analysis.slice(0, 500) + (c.ai_analysis.length > 500 ? '...' : '')
                        : JSON.stringify(c.ai_analysis).slice(0, 500)}
                    </td>
                  </tr>
                )}
                {expandedSummary === c.id && (
                  <tr style={{ background: 'rgba(60,52,137,0.1)' }}>
                    <td colSpan={12} className="px-6 py-3 text-xs"
                      style={{ color: '#b0aec8', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="font-bold mb-1" style={{ color: '#b0aec8' }}>상담 요약</div>
                      {c.summary?.slice(0, 500)}{c.summary?.length > 500 ? '...' : ''}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
