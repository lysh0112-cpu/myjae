import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export type Consultation = {
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
