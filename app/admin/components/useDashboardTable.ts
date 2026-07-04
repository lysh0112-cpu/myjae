import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
export type Consultation = {
  id: string
  created_at: string
  customer_phone: string
  customer_name: string | null
  paid_amount: number
  status: string
  consultant_id: string
  assigned_consultant_id: string
  booking_date: string
  completed_date: string
  ai_analysis: string
  summary: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  birth_data: any
}
export type Consultant = {
  id: string
  name: string
}
export function toDateInput(val: string | null | undefined) {
  if (!val || val === 'Invalid Date') return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

// 상담 종류(consultationType/mode) → 사람이 읽는 라벨
// birth_data.consultationType 에 저장된 값을 표에 예쁘게 표시하기 위한 대조표
export const CONSULT_TYPE_LABELS: Record<string, string> = {
  personal: '개인 상담',
  couple: '연인 궁합',
  married: '부부 상담',
  prewedding: '예비 신혼',
  birth: '출산 택일',
  naming: '개명 상담',
  mulsang: '사주 그림',
}

// 상담 건에서 종류 원본값(mode) 뽑기 — 없으면 빈 문자열
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getConsultType(c: { birth_data?: any }): string {
  const bd = c.birth_data
  if (!bd) return ''
  if (typeof bd === 'string') {
    try { return JSON.parse(bd)?.consultationType || '' } catch { return '' }
  }
  return bd.consultationType || ''
}

// 종류 라벨로 변환 — 저장값이 없으면 '-'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getConsultTypeLabel(c: { birth_data?: any }): string {
  const t = getConsultType(c)
  if (!t) return '-'
  return CONSULT_TYPE_LABELS[t] ?? t
}

export function useDashboardTable(
  list: Consultation[],
  onDelete: (id: string) => void,
  onRefresh: () => void
) {
  const [assignMap, setAssignMap] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Consultation>>({})
  const [expandedAI, setExpandedAI] = useState<string | null>(null)
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null)
  useEffect(() => {
    const map: Record<string, string> = {}
    list.forEach(c => { map[c.id] = c.assigned_consultant_id || '' })
    setAssignMap(map)
  }, [list])
  async function handleAssign(consultationId: string, consultantId: string) {
    setAssignMap(prev => ({ ...prev, [consultationId]: consultantId }))
    await supabase.from('consultations')
      .update({ assigned_consultant_id: consultantId || null })
      .eq('id', consultationId)
  }
  function startEdit(c: Consultation) {
    setEditingId(c.id)
    setEditForm({
      paid_amount: c.paid_amount,
      status: c.status,
      booking_date: toDateInput(c.booking_date),
      completed_date: toDateInput(c.completed_date),
    })
  }
  async function saveEdit(id: string) {
    await supabase.from('consultations').update({
      paid_amount: editForm.paid_amount,
      status: editForm.status,
      booking_date: editForm.booking_date || null,
      completed_date: editForm.completed_date || null,
    }).eq('id', id)
    setEditingId(null)
    onRefresh()
  }
  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    // 연관 테이블 먼저 삭제 (외래키 제약 해제)
    await supabase.from('payments').delete().eq('consultation_id', id)
    await supabase.from('chat_messages').delete().eq('consultation_id', id)
    await supabase.from('commentaries').delete().eq('consultation_id', id)
    const { error } = await supabase.from('consultations').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    onDelete(id)
  }
  return {
    assignMap, editingId, editForm, setEditForm,
    expandedAI, setExpandedAI,
    expandedSummary, setExpandedSummary,
    handleAssign, startEdit, saveEdit, handleDelete,
    cancelEdit: () => setEditingId(null),
  }
}
