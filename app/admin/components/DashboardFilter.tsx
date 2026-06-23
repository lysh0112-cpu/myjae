'use client'
import { Consultant } from './useDashboardTable'

type Props = {
  consultants: Consultant[]
  selectedConsultant: string
  selectedStatus: string
  filteredCount: number
  onConsultantChange: (v: string) => void
  onStatusChange: (v: string) => void
  onExcel: () => void
}

export default function DashboardFilter({
  consultants, selectedConsultant, selectedStatus,
  filteredCount, onConsultantChange, onStatusChange, onExcel
}: Props) {
  return (
    <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-sm font-bold text-white">
          상담 내역
          <span className="ml-2 text-xs" style={{ color: '#8a88a0' }}>총 {filteredCount}건</span>
        </div>
        <select value={selectedConsultant} onChange={e => onConsultantChange(e.target.value)}
          className="rounded-xl px-3 py-1.5 text-xs outline-none"
          style={{ background: '#1a1a18', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
          <option value="all">전체 상담사</option>
          <option value="ai">AI 분석</option>
          {consultants.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={selectedStatus} onChange={e => onStatusChange(e.target.value)}
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
  )
}
