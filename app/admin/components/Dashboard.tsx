'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DashboardTable from './DashboardTable'
type Stats = {
  totalRevenue: number
  totalConsultations: number
  pendingSettlement: number
  todayConsultations: number
  aiAnalysisCount: number
}
export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0, totalConsultations: 0,
    pendingSettlement: 0, todayConsultations: 0, aiAnalysisCount: 0,
  })
  const [list, setList] = useState<any[]>([])
  const [consultants, setConsultants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetchAll() }, [])
  async function fetchAll() {
    const today = new Date().toISOString().split('T')[0]
    // ★ 취소된 건(deleted_at 있음)은 대시보드에서 제외 → 정상 예약만 표시
    const [{ data: cons }, { data: todayCons }, { data: allCons }, { data: consultantList }] = await Promise.all([
      supabase.from('consultations').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('consultations').select('id').is('deleted_at', null).gte('created_at', today),
      supabase.from('consultations').select('paid_amount, status').is('deleted_at', null),
      supabase.from('consultants').select('id, name').eq('active', true),
    ])
    if (cons) setList(cons)
    if (consultantList) setConsultants(consultantList)
    const total = allCons?.reduce((s, c) => s + (c.paid_amount || 0), 0) ?? 0
    const pending = allCons?.filter(c => c.status === 'paid').reduce((s, c) => s + (c.paid_amount || 0), 0) ?? 0
    setStats({
      totalRevenue: total,
      totalConsultations: allCons?.length ?? 0,
      pendingSettlement: pending,
      todayConsultations: todayCons?.length ?? 0,
      aiAnalysisCount: allCons?.filter(c => c.paid_amount >= 10000).length ?? 0,
    })
    setLoading(false)
  }
  function handleDelete(id: string) {
    fetchAll()
  }
  function handleExcel() {
    const headers = ['일자', '상담사', '전화번호', '결제금액', '상태']
    const rows = list.map(c => [
      new Date(c.created_at).toLocaleDateString('ko-KR'),
      consultants.find(con => con.id === c.consultant_id)?.name ?? 'AI',
      c.customer_phone,
      (c.paid_amount || 0).toLocaleString() + '원',
      c.status === 'paid' ? '결제완료' : '진행중',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `명카페_상담내역_${new Date().toLocaleDateString('ko-KR')}.csv`
    a.click()
  }
  if (loading) return <div className="text-center py-10" style={{ color: '#FAC775' }}>불러오는 중...</div>
  const cards = [
    { label: '누적 매출', value: `${stats.totalRevenue.toLocaleString()}원`, color: '#FAC775' },
    { label: '총 상담', value: `${stats.totalConsultations}건`, color: '#b0aec8' },
    { label: '오늘 상담', value: `${stats.todayConsultations}건`, color: '#81c784' },
    { label: 'AI 유료', value: `${stats.aiAnalysisCount}건`, color: '#f48fb1' },
    { label: '미정산', value: `${stats.pendingSettlement.toLocaleString()}원`, color: '#ff8080' },
  ]
  return (
    <div className="space-y-4">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl p-4"
            style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.label}</div>
            <div className="text-lg font-bold" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>
      <DashboardTable
        list={list}
        consultants={consultants}
        onDelete={handleDelete}
        onExcel={handleExcel}
        onRefresh={fetchAll}
      />
    </div>
  )
}
