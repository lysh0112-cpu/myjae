'use client'
import React from 'react'
import { Consultation, Consultant, toDateInput, getConsultTypeLabel } from './useDashboardTable'

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
// 상담 상태 → 우리말 (2026-07-21 2차: booked·in_progress·completed 가 빠져 있어
//   화면에 'completed' 같은 영어 원문이 그대로 나왔다)
function getStatusLabel(s: string) {
  if (s === 'completed') return '완료'
  if (s === 'in_progress') return '진행 중'
  if (s === 'booked') return '예약 확정'
  if (s === 'paid') return '결제완료'
  if (s === 'closed') return '종료'
  if (s === 'pending') return '대기중'
  if (s === 'cancelled' || s === 'canceled') return '취소됨'
  return s
}
function getStatusStyle(s: string) {
  if (s === 'completed') return { background: 'rgba(76,175,80,0.15)', color: '#81c784' }
  if (s === 'in_progress') return { background: 'rgba(250,199,117,0.15)', color: '#FAC775' }
  if (s === 'booked') return { background: 'rgba(100,150,255,0.15)', color: '#7fa8ff' }
  if (s === 'paid') return { background: 'rgba(250,199,117,0.15)', color: '#FAC775' }
  if (s === 'closed') return { background: 'rgba(255,100,100,0.15)', color: '#ff6464' }
  return { background: 'rgba(76,175,80,0.15)', color: '#81c784' }
}

// 시작~종료 시각과 상담 시간 (2026-07-21 2차 추가)
function timeRangeText(c: { started_at?: string | null; completed_at?: string | null }): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (!c.started_at && !c.completed_at) return '-'
  if (c.started_at && !c.completed_at) return `${fmt(c.started_at)} ~ 진행 중`
  if (!c.started_at && c.completed_at) return `~ ${fmt(c.completed_at)}`
  const s = new Date(c.started_at!).getTime()
  const e = new Date(c.completed_at!).getTime()
  const min = Math.max(0, Math.round((e - s) / 60000))
  return `${fmt(c.started_at!)} ~ ${fmt(c.completed_at!)} · ${min}분`
}

export default function DashboardRow({
  c, i, consultants, assignMap, editingId, editForm,
  expandedAI, expandedSummary,
  onAssign, onStartEdit, onSaveEdit, onCancelEdit, onDelete,
  onEditForm, onToggleAI, onToggleSummary
}: Props) {
  const isEditing = editingId === c.id
  const consultTypeLabel = getConsultTypeLabel(c)

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
              {/* ★2026-07-21 2차: completed_date 는 값이 안 들어오는 이름이었다.
                  실제 DB 칸인 completed_at 을 쓴다. */}
              {c.completed_at ? new Date(c.completed_at).toLocaleDateString('ko-KR')
                : (toDateInput(c.completed_date) ? new Date(c.completed_date).toLocaleDateString('ko-KR') : '-')}
            </span>
          )}
        </td>
        {/* ★상담시간 — 시작~종료 · 걸린 시간 (2026-07-21 2차 추가) */}
        <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: '#8a88a0' }}>
          {timeRangeText(c)}
        </td>
        {/* ★고객 — 예약 시 입력한 이름 (2026-07-21 2차 추가) */}
        <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: '#e8e2f5' }}>
          {c.customer_name || '-'}
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
        {/* 종류 */}
        <td className="px-3 py-3 whitespace-nowrap">
          {consultTypeLabel !== '-' ? (
            <span className="text-xs px-2 py-1 rounded-full"
              style={{ background: 'rgba(129,199,132,0.15)', color: '#81c784' }}>
              {consultTypeLabel}
            </span>
          ) : (
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>-</span>
          )}
        </td>
        {/* 강제배정 */}
        <td className="px-3 py-3 whitespace-nowrap" style={{ position: 'relative', zIndex: 50 }}>
          <select value={assignMap[c.id] ?? ''}
            onChange={e => onAssign(c.id, e.target.value)}
            className="rounded-lg px-2 py-1 text-xs outline-none"
            style={{
              background: assignMap[c.id] ? 'rgba(231,76,60,0.2)' : '#1a1a18',
              color: assignMap[c.id] ? '#ff8080' : 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
              position: 'relative',
              zIndex: 50
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
        {/* 취소 */}
        <td className="px-3 py-3">
          <button onClick={() => onDelete(c.id)}
            className="px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
            title="예약 취소 — 그 시간이 다시 열리고 「취소 내역」 탭으로 옮겨집니다 (되살리기 가능)"
            style={{ background: 'rgba(255,100,100,0.15)', color: '#ff6464' }}>예약 취소</button>
        </td>
      </tr>
      {expandedAI === c.id && (
        <tr style={{ background: 'rgba(250,199,117,0.05)' }}>
          <td colSpan={15} className="px-6 py-3 text-xs"
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
          <td colSpan={15} className="px-6 py-3 text-xs"
            style={{ color: '#b0aec8', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="font-bold mb-1" style={{ color: '#b0aec8' }}>상담 요약</div>
            {c.summary?.slice(0, 500)}{c.summary?.length > 500 ? '...' : ''}
          </td>
        </tr>
      )}
    </React.Fragment>
  )
}
