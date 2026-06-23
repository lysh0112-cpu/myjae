'use client'
import React from 'react'
import { Consultation, Consultant, toDateInput } from './useDashboardTable'

type Props = {
  c: Consultation
  i: number
  consultants: Consultant[]
  assignMap: Record<string, string>
  editingId: string | null
  editForm: Partial<Consultation>
  expandedAI: string | null
  expandedSummary: string | null
  onAssign: (id: string, val: string) => void
  onStartEdit: (c: Consultation) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
  onDelete: (id: string) => void
  onEditForm: (form: Partial<Consultation>) => void
  onToggleAI: (id: string) => void
  onToggleSummary: (id: string) => void
}

function getConsultantName(id: string, consultants: Consultant[]) {
  if (!id) return 'AI'
  return consultants.find(c => c.id === id)?.name ?? 'AI'
}
function getStatusLabel(s: string) {
  if (s === 'paid') return '결제완료'
  if (s === 'closed') return '종료'
  if (s === 'pending') return '대기중'
  return s
}
function getStatusStyle(s: string) {
  if (s === 'paid') return { background: 'rgba(250,199,117,0.15)', color: '#FAC775' }
  if (s === 'closed') return { background: 'rgba(255,100,100,0.15)', color: '#ff6464' }
  return { background: 'rgba(76,175,80,0.15)', color: '#81c784' }
}

export default function DashboardRow({
  c, i, consultants, assignMap, editingId, editForm,
  expandedAI, expandedSummary,
  onAssign, onStartEdit, onSaveEdit, onCancelEdit, onDelete,
  onEditForm, onToggleAI, onToggleSummary
}: Props) {
  const isEditing = editingId === c.id

  return (
    <React.Fragment>
      <tr style={{
        background: isEditing ? 'rgba(60,52,137,0.2)' : i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.04)'
      }}>
        {/* 일자 */}
        <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: '#8a88a0' }}>
          {new Date(c.created_at).toLocaleDateString('ko-KR')}
        </td>
        {/* 예약일 */}
        <td className="px-3 py-2">
          {isEditing ? (
            <input type="date" value={editForm.booking_date || ''}
              onChange={e => onEditForm({ ...editForm, booking_date: e.target.value })}
              className="rounded px-2 py-1 text-xs outline-none w-28"
              style={{ background: '#1a1a18', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }} />
          ) : (
            <span className="text-xs" style={{ color: '#8a88a0' }}>
              {toDateInput(c.booking_date) ? new Date(c.booking_date).toLocaleDateString('ko-KR') : '-'}
            </span>
          )}
        </td>
        {/* 완료일 */}
        <td className="px-3 py-2">
          {isEditing ? (
            <input type="date" value={editForm.completed_date || ''}
              onChange={e => onEditForm({ ...editForm, completed_date: e.target.value })}
              className="rounded px-2 py-1 text-xs outline-none w-28"
              style={{ background: '#1a1a18', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }} />
          ) : (
            <span className="text-xs" style={{ color: '#8a88a0' }}>
              {toDateInput(c.completed_date) ? new Date(c.completed_date).toLocaleDateString('ko-KR') : '-'}
            </span>
          )}
        </td>
        {/* 담당상담사 */}
        <td className="px-3 py-3 whitespace-nowrap">
          <span className="text-xs px-2 py-1 rounded-full"
            style={{
              background: c.consultant_id ? 'rgba(60,52,137,0.3)' : 'rgba(250,199,117,0.15)',
              color: c.consultant_id ? '#b0aec8' : '#FAC775'
            }}>
            {getConsultantName(c.consultant_id, consultants)}
          </span>
        </td>
        {/* 강제배정 */}
        <td className="px-3 py-3 whitespace-nowrap">
          <select value={assignMap[c.id] ?? ''}
            onChange={e => onAssign(c.id, e.target.value)}
            className="rounded-lg px-2 py-1 text-xs outline-none"
            style={{
              background: assignMap[c.id] ? 'rgba(231,76,60,0.2)' : '#1a1a18',
              color: assignMap[c.id] ? '#ff8080' : 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
            <option value="">배정안함</option>
            {consultants.map(con => <option key={con.id} value={con.id}>{con.name}</option>)}
          </select>
        </td>
        {/* 전화번호 */}
        <td className="px-3 py-3 text-sm text-white whitespace-nowrap">{c.customer_phone}</td>
        {/* 결제금액 */}
        <td className="px-3 py-2">
          {isEditing ? (
            <input type="number" value={editForm.paid_amount || 0}
              onChange={e => onEditForm({ ...editForm, paid_amount: parseInt(e.target.value) || 0 })}
              className="rounded px-2 py-1 text-xs outline-none w-24"
              style={{ background: '#1a1a18', color: '#FAC775', border: '1px solid rgba(255,255,255,0.2)' }} />
          ) : (
            <span className="text-sm font-bold" style={{ color: '#FAC775' }}>
              {(c.paid_amount || 0).toLocaleString()}원
            </span>
          )}
        </td>
        {/* 상태 */}
        <td className="px-3 py-2">
          {isEditing ? (
            <select value={editForm.status || ''}
              onChange={e => onEditForm({ ...editForm, status: e.target.value })}
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
        {/* AI분석 */}
        <td className="px-3 py-3">
          {c.ai_analysis ? (
            <button onClick={() => onToggleAI(c.id)}
              className="px-2 py-1 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(250,199,117,0.15)', color: '#FAC775' }}>
              {expandedAI === c.id ? '접기' : '보기'}
            </button>
          ) : <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>없음</span>}
        </td>
        {/* 상담내용 */}
        <td className="px-3 py-3">
          {c.summary ? (
            <button onClick={() => onToggleSummary(c.id)}
              className="px-2 py-1 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(60,52,137,0.3)', color: '#b0aec8' }}>
              {expandedSummary === c.id ? '접기' : '보기'}
            </button>
          ) : <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>없음</span>}
        </td>
        {/* 수정 */}
        <td className="px-3 py-3">
          {isEditing ? (
            <div className="flex gap-1">
              <button onClick={() => onSaveEdit(c.id)}
                className="px-2 py-1 rounded-lg text-xs font-bold"
                style={{ background: 'rgba(76,175,80,0.2)', color: '#81c784' }}>저장</button>
              <button onClick={onCancelEdit}
                className="px-2 py-1 rounded-lg text-xs font-bold"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#8a88a0' }}>취소</button>
            </div>
          ) : (
            <button onClick={() => onStartEdit(c)}
              className="px-3 py-1 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(250,199,117,0.15)', color: '#FAC775' }}>수정</button>
          )}
        </td>
        {/* 삭제 */}
        <td className="px-3 py-3">
          <button onClick={() => onDelete(c.id)}
            className="px-3 py-1 rounded-lg text-xs font-bold"
            style={{ background: 'rgba(255,100,100,0.15)', color: '#ff6464' }}>삭제</button>
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
  )
}
