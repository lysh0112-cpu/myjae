'use client'
import { useState } from 'react'
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

  async function handleAssign(consultationId: string, consultantId: string) {
    await supabase.from('consultations')
      .update({ assigned_consultant_id: consultantId || null })
      .eq('id', consultationId)
    onRefresh()
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
              <>
                <tr key={c.id}
                  style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: '#8a88a0' }}>
                    {new Date(c.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: '#8a88a0' }}>
                    {c.booking_date ? new Date(c.booking_date).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: '#8a88a0' }}>
                    {c.completed_date ? new Date(c.completed_date).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="text-xs px-2 py-1 rounded-full"
                      style={{ background: c.consultant_id ? 'rgba(60,52,137,0.3)' : 'rgba(250,199,117,0.15)',
                        color: c.consultant_id ? '#b0aec8' : '#FAC775' }}>
                      {getConsultantName(c.consultant_id)}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <select
                      value={c.assigned_consultant_id || ''}
                      onChange={e => handleAssign(c.id, e.target.value)}
                      className="rounded-lg px-2 py-1 text-xs outline-none"
                      style={{ background: c.assigned_consultant_id ? 'rgba(231,76,60,0.2)' : '#1a1a18',
                        color: c.assigned_consultant_id ? '#ff8080' : 'rgba(255,255,255,0.4)',
                        border: '1px solid rgba(255,255,255,0.1)' }}>
                      <option value="">배정안함</option>
                      {consultants.map(con => (
                        <option key={con.id} value={con.id}>{con.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3 text-sm text-white whitespace-nowrap">{c.customer_phone}</td>
                  <td className="px-3 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#FAC775' }}>
                    {(c.paid_amount || 0).toLocaleString()}원
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs px-2 py-1 rounded-full" style={getStatusStyle(c.status)}>
                      {getStatusLabel(c.status)}
                    </span>
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
                    <button className="px-3 py-1 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(250,199,117,0.15)', color: '#FAC775' }}>
                      수정
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => onDelete(c.id)}
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
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
