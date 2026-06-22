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
      supabase.from('consultations').select('paid_amount, status, created_at, customer_phone, consultant_id').order('created_at', { ascending: false }),
      supabase.from('consultations').select('id').gte('created_at', today),
      supabase.from('consultations').select('paid_amount, status'),
    ])
    if (cons) setRecentList(cons.slice(0, 5))
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

  if (loading) return <div className="text-center py-10" style={{ color: '#FAC775' }}>불러오는 중...</div>

  const cards = [
    { label: '누적 매출', value: `${stats.totalRevenue.toLocaleString()}원`, color: '#FAC775' },
    { label: '총 상담 건수', value: `${stats.totalConsultations}건`, color: '#b0aec8' },
    { label: '오늘 상담', value: `${stats.todayConsultations}건`, color: '#81c784' },
    { label: 'AI 유료 분석', value: `${stats.aiAnalysisCount}건`, color: '#f48fb1' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl p-4"
            style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.label}</div>
            <div className="text-xl font-bold" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-4"
        style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-sm font-bold mb-3" style={{ color: '#FAC775' }}>미정산 금액</div>
        <div className="text-2xl font-bold" style={{ color: '#FAC775' }}>
          {stats.pendingSettlement.toLocaleString()}원
        </div>
        <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>결제완료 상태 기준</div>
      </div>

      <div className="rounded-2xl p-4"
        style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-sm font-bold mb-3" style={{ color: '#FAC775' }}>최근 상담 5건</div>
        <div className="space-y-2">
          {recentList.length === 0 && (
            <div className="text-xs text-center py-3" style={{ color: 'rgba(255,255,255,0.3)' }}>내역 없음</div>
          )}
          {recentList.map((c, i) => (
            <div key={i} className="flex justify-between items-center py-2"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div className="text-sm text-white">{c.customer_phone}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {new Date(c.created_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold" style={{ color: '#FAC775' }}>
                  {(c.paid_amount || 0).toLocaleString()}원
                </div>
                <div className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: c.status === 'paid' ? 'rgba(250,199,117,0.15)' : 'rgba(76,175,80,0.15)',
                    color: c.status === 'paid' ? '#FAC775' : '#81c784' }}>
                  {c.status === 'paid' ? '결제완료' : '진행중'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
