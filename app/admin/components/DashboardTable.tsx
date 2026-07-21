'use client'
import { Consultation, Consultant, useDashboardTable, CONSULT_TYPE_LABELS } from './useDashboardTable'
import { useTableFilter } from './useTableFilter'
import DashboardFilter from './DashboardFilter'
import DashboardRow from './DashboardRow'
import ColumnFilter from './ColumnFilter'

type Props = {
  list: Consultation[]
  consultants: Consultant[]
  onDelete: (id: string) => void
  onExcel: () => void
  onRefresh: () => void
}

// 상태 필터에 보이는 우리말 이름 (2026-07-21 2차: 실제로 쓰이는 값들을 채웠다)
const STATUS_LABEL: Record<string, string> = {
  completed: '완료', in_progress: '진행 중', booked: '예약 확정',
  paid: '결제완료', pending: '대기중', closed: '종료',
  cancelled: '취소됨', canceled: '취소됨',
}

export default function DashboardTable({ list, consultants, onDelete, onExcel, onRefresh }: Props) {
  const { filters, setFilter, resetFilters, options, filtered } = useTableFilter(list)

  const consultantNameMap = Object.fromEntries([
    ['AI', 'AI'],
    ...consultants.map(c => [c.id, c.name])
  ])

  // 종류 필터 드롭다운 라벨: 저장값(mode) → 사람이 읽는 이름. '없음'은 그대로.
  const consultTypeLabelMap = { ...CONSULT_TYPE_LABELS, '없음': '없음' }

  const {
    assignMap, editingId, editForm, setEditForm,
    expandedAI, setExpandedAI,
    expandedSummary, setExpandedSummary,
    handleAssign, startEdit, saveEdit, handleDelete, cancelEdit,
  } = useDashboardTable(list, onDelete, onRefresh)

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
      <DashboardFilter
        filteredCount={filtered.length}
        totalCount={list.length}
        onReset={resetFilters}
        onExcel={onExcel}
      />
      <div style={{ overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: '1200px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ background: 'rgba(60,52,137,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <ColumnFilter label="일자" value={filters.date}
                options={options.date} onChange={v => setFilter('date', v)} />
              <ColumnFilter label="예약일" value={filters.bookingDate}
                options={options.bookingDate} onChange={v => setFilter('bookingDate', v)} />
              <ColumnFilter label="완료일" value={filters.completedDate}
                options={options.completedDate} onChange={v => setFilter('completedDate', v)} />
              {/* ★2026-07-21 2차 추가 — 걸러낼 값이 아니라 보여주기만 하므로 일반 th */}
              {['상담시간', '고객'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-bold whitespace-nowrap"
                  style={{ color: '#FAC775' }}>{h}</th>
              ))}
              <ColumnFilter label="담당상담사" value={filters.consultant}
                options={options.consultant} onChange={v => setFilter('consultant', v)}
                labelMap={consultantNameMap} />
              <ColumnFilter label="종류" value={filters.consultType}
                options={options.consultType} onChange={v => setFilter('consultType', v)}
                labelMap={consultTypeLabelMap} />
              <ColumnFilter label="강제배정" value={filters.assignedConsultant}
                options={options.assignedConsultant} onChange={v => setFilter('assignedConsultant', v)}
                labelMap={consultantNameMap} />
              <ColumnFilter label="전화번호" value={filters.phone}
                options={options.phone} onChange={v => setFilter('phone', v)} />
              <ColumnFilter label="결제금액" value={filters.amount}
                options={options.amount} onChange={v => setFilter('amount', v)}
                labelMap={Object.fromEntries(options.amount.map(a => [a, Number(a).toLocaleString() + '원']))} />
              <ColumnFilter label="상태" value={filters.status}
                options={options.status} onChange={v => setFilter('status', v)}
                labelMap={STATUS_LABEL} />
              {['AI분석', '상담내용', '수정', '예약 취소'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-bold whitespace-nowrap"
                  style={{ color: '#FAC775' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={15} className="text-center py-10 text-sm"
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
