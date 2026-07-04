import { useState, useMemo } from 'react'
import { Consultation, getConsultType } from './useDashboardTable'
export type FilterState = {
  consultant: string
  status: string
  assignedConsultant: string
  phone: string
  amount: string
  bookingDate: string
  completedDate: string
  date: string
  consultType: string
}
export const FILTER_DEFAULTS: FilterState = {
  consultant: 'all',
  status: 'all',
  assignedConsultant: 'all',
  phone: 'all',
  amount: 'all',
  bookingDate: 'all',
  completedDate: 'all',
  date: 'all',
  consultType: 'all',
}
export function useTableFilter(list: Consultation[]) {
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS)
  function setFilter(key: keyof FilterState, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }
  function resetFilters() {
    setFilters(FILTER_DEFAULTS)
  }
  // 각 컬럼별 고유값 추출
  const options = useMemo(() => {
    const toDateStr = (val: string | null) => {
      if (!val || val === 'Invalid Date') return null
      const d = new Date(val)
      if (isNaN(d.getTime())) return null
      return d.toLocaleDateString('ko-KR')
    }
    return {
      consultant: [...new Set(list.map(c => c.consultant_id || 'AI'))],
      status: [...new Set(list.map(c => c.status).filter(Boolean))],
      assignedConsultant: [...new Set(list.map(c => c.assigned_consultant_id || '배정안함'))],
      phone: [...new Set(list.map(c => c.customer_phone).filter(Boolean))],
      amount: [...new Set(list.map(c => String(c.paid_amount || 0)))].sort((a, b) => Number(a) - Number(b)),
      bookingDate: [...new Set(list.map(c => toDateStr(c.booking_date)).filter(Boolean))] as string[],
      completedDate: [...new Set(list.map(c => toDateStr(c.completed_date)).filter(Boolean))] as string[],
      date: [...new Set(list.map(c => toDateStr(c.created_at)).filter(Boolean))] as string[],
      consultType: [...new Set(list.map(c => getConsultType(c) || '없음'))],
    }
  }, [list])
  // 필터 적용
  const filtered = useMemo(() => {
    const toDateStr = (val: string | null) => {
      if (!val || val === 'Invalid Date') return null
      const d = new Date(val)
      if (isNaN(d.getTime())) return null
      return d.toLocaleDateString('ko-KR')
    }
    return list.filter(c => {
      if (filters.consultant !== 'all') {
        const val = c.consultant_id || 'AI'
        if (val !== filters.consultant) return false
      }
      if (filters.status !== 'all' && c.status !== filters.status) return false
      if (filters.assignedConsultant !== 'all') {
        const val = c.assigned_consultant_id || '배정안함'
        if (val !== filters.assignedConsultant) return false
      }
      if (filters.phone !== 'all' && c.customer_phone !== filters.phone) return false
      if (filters.amount !== 'all' && String(c.paid_amount || 0) !== filters.amount) return false
      if (filters.bookingDate !== 'all' && toDateStr(c.booking_date) !== filters.bookingDate) return false
      if (filters.completedDate !== 'all' && toDateStr(c.completed_date) !== filters.completedDate) return false
      if (filters.date !== 'all' && toDateStr(c.created_at) !== filters.date) return false
      if (filters.consultType !== 'all') {
        const val = getConsultType(c) || '없음'
        if (val !== filters.consultType) return false
      }
      return true
    })
  }, [list, filters])
  return { filters, setFilter, resetFilters, options, filtered }
}
