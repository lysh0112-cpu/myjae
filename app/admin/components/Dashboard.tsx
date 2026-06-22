'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
  const [recentList, setRecentList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    const today = new Date().toISOString().split('T')[0]
    const [{ data: cons }, { data: todayCons }, { data: allCons }] = await Promise.all([
      supabase.from('consultations').select('paid_amount, status, created_at, customer_phone, consultant_id, birth_data').order('created_at', { ascending: false }),
      supabase.from('consultations').select('id').gte('created_at', today),
      supabase.from('consultations').select('paid_amount, status'),
    ])
    if (cons) setRecentList(cons)
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

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('consultations').delete().eq('id', id)
    fetchStats()
  }

  function exportExcel() {
    const headers = ['일자', '전화번호', '결제금액', '상태']
    const rows = recentList.map(c => [
      new Date(c.created_at).toLocaleDateString('ko-KR'),
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
      {/* 통계 한 줄 */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl p-4"
            style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.label}</div>
            <div className="text-lg font-bold" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* 상담 내역 테이블 */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-sm font-bold text-white">
            상담 내역
            <span className="ml-2 text-xs" style={{ color: '#8a88a0' }}>총 {recentList.length}건</span>
          </div>
          <button onClick={exportExcel}
            className="px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(76,175,80,0.2)', color: '#81c784', border: '1px solid rgba(76,175,80,0.3)' }}>
            📊 엑셀 다운로드
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: 'rgba(60,52,137,0.2)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['일자', '전화번호', '결제금액', '상태', '수정', '삭제'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold"
                    style={{ color: '#FAC775' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentList.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-sm"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>내역 없음</td>
                </tr>
              )}
              {recentList.map((c, i) => (
                <tr key={i}
                  style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#8a88a0' }}>
                    {new Date(c.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-white whitespace-nowrap">{c.customer_phone}</td>
                  <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#FAC775' }}>
                    {(c.paid_amount || 0).toLocaleString()}원
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full"
                      style={{ background: c.status === 'paid' ? 'rgba(250,199,117,0.15)' : 'rgba(76,175,80,0.15)',
                        color: c.status === 'paid' ? '#FAC775' : '#81c784' }}>
                      {c.status === 'paid' ? '결제완료' : '진행중'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="px-3 py-1 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(250,199,117,0.15)', color: '#FAC775' }}>
                      수정
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(c.id)}
                      className="px-3 py-1 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(255,100,100,0.15)', color: '#ff6464' }}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
