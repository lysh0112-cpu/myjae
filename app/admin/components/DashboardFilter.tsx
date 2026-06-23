'use client'

type Props = {
  filteredCount: number
  totalCount: number
  onReset: () => void
  onExcel: () => void
}

export default function DashboardFilter({ filteredCount, totalCount, onReset, onExcel }: Props) {
  return (
    <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-3">
        <div className="text-sm font-bold text-white">
          상담 내역
          <span className="ml-2 text-xs" style={{ color: '#8a88a0' }}>
            {filteredCount === totalCount
              ? `총 ${totalCount}건`
              : `${filteredCount}건 / 전체 ${totalCount}건`}
          </span>
        </div>
        <button onClick={onReset}
          className="px-3 py-1 rounded-lg text-xs"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
          필터 초기화
        </button>
      </div>
      <button onClick={onExcel}
        className="px-4 py-2 rounded-xl text-xs font-bold"
        style={{ background: 'rgba(76,175,80,0.2)', color: '#81c784', border: '1px solid rgba(76,175,80,0.3)' }}>
        📊 엑셀 다운로드
      </button>
    </div>
  )
}
