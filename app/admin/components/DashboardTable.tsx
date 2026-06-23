'use client'
import { useState } from 'react'
import { Consultation, Consultant, useDashboardTable } from './useDashboardTable'
import DashboardFilter from './DashboardFilter'
import DashboardRow from './DashboardRow'

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

  const {
    assignMap, editingId, editForm, setEditForm,
    expandedAI, setExpandedAI,
    expandedSummary, setExpandedSummary,
    handleAssign, startEdit, saveEdit, handleDelete, cancelEdit,
  } = useDashboardTable(list, onDelete, onRefresh)

  const filtered = list
    .filter(c => selectedConsultant === 'all' ? true :
      selectedConsultant === 'ai' ? (!c.consultant_id || c.consultant_id === '') :
      c.consultant_id === selectedConsultant)
    .filter(c => selectedStatus === 'all' ? true : c.status === selectedStatus)

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
      <DashboardFilter
        consultants={consultants}
        selectedConsultant={selectedConsultant}
        selectedStatus={selectedStatus}
        filteredCount={filtered.length}
        onConsultantChange={setSelectedConsultant}
        onStatusChange={setSelectedStatus}
        onExcel={onExcel}
      />
      <div style={{ overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: '1100px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr style={{ background: 'rgba(60,52,137,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['일자','예약일','완료일','담당상담사','강제배정','전화번호','결제금액','상태','AI분석','상담내용','수정','삭제'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-bold whitespace-nowrap"
                  style={{ color: '#FAC775' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={12} className="text-center py-10 text-sm"
                style={{ color: 'rgba(255,255,255,0.3)' }}>내역 없음</td></tr>
            )}
            {filtered.map((c, i) => (
              <DashboardRow
                key={c.id}
                c={c} i={i}
                consultants={consultants}
                assignMap={assignMap}
                editingId={editingId}
                editForm={editForm}
                expandedAI={expandedAI}
                expandedSummary={expandedSummary}
                onAssign={handleAssign}
                onStartEdit={startEdit}
                onSaveEdit={saveEdit}
                onCancelEdit={cancelEdit}
                onDelete={handleDelete}
                onEditForm={setEditForm}
                onToggleAI={id => setExpandedAI(expandedAI === id ? null : id)}
                onToggleSummary={id => setExpandedSummary(expandedSummary === id ? null : id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
