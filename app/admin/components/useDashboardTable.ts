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
  /** ★2026-07-21 2차 추가 — 실제 DB 칸 이름.
   *  completed_date 는 이 표에만 있던 이름이라 값이 안 들어와 완료일이 늘 비어 있었다. */
  started_at: string | null
  completed_at: string | null
  ai_analysis: string
  summary: string
  deleted_at: string | null
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
export const CONSULT_TYPE_LABELS: Record<string, string> = {
  personal: '개인 상담',
  couple: '궁합 상담',
  married: '궁합 상담',
  prewedding: '예비 신혼',
  moving: '이사 택일',
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

// 상담 건에 연결된 슬롯 잠금을 풀어줌 (유령 슬롯 방지)
// - bookings에서 slot_id를 찾아 consultant_slots.is_booked=false 로 되돌린 뒤 bookings 정리
// ConsultationList.tsx의 검증된 releaseSlotsFor와 동일한 방식
export async function releaseSlotsFor(consultationIds: string[]) {
  if (consultationIds.length === 0) return
  try {
    const { data: bks } = await supabase
      .from('bookings')
      .select('slot_id')
      .in('consultation_id', consultationIds)
    const slotIds = (bks ?? []).map(b => b.slot_id).filter(Boolean) as string[]
    if (slotIds.length > 0) {
      await supabase.from('consultant_slots')
        .update({ is_booked: false })
        .in('id', slotIds)
    }
    await supabase.from('bookings')
      .delete()
      .in('consultation_id', consultationIds)
  } catch (e) {
    console.error('슬롯 해제 중 오류', e)
  }
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
  // 예약 취소 처리 (완전삭제 아님)
  // - status='cancelled' + deleted_at 기록 → 고객 마이페이지·상담사 목록에서 숨겨짐
  // - 슬롯 해제 → 그 시간 다시 예약 가능
  // - 데이터는 남으므로 '취소 내역' 탭에서 되살리기/영구삭제 가능
  //  🔴 ★2026-09-09 — 여기서 취소하면 ★돈은 «안» 돌아갑니다  [대표님 지시]
  //    「상담예약했다 취소하면 본인 지갑 잔액으로 되돌아가야되는 거잖아」
  //     ⇒ 손님이 ★마이페이지에서 취소하면 «저절로» 돌아갑니다 [대표님 확인].
  //     ⚠️ 그런데 ★여기(관리자)서 취소하면 안 돌아갑니다 —
  //        지갑 함수는 ★«자기 것» 만 만집니다 (인자에 user_id 를 못 넣습니다 · 1부 3-3).
  //     ⇒ 그래서 ★말씀드리고, 🪙 회원 지갑에서 «손으로» 넣어 드리게 합니다.
  //     □ 나중에 — 관리자용 되돌리기 함수를 서버에 하나 더 두면 저절로 됩니다.
  //     ⛔ 이 안내를 지우지 마십시오 — 없으면 «조용히» 돈이 안 돌아갑니다.
  async function handleDelete(id: string) {
    if (!confirm('이 예약을 취소할까요?\n\n고객·상담사 화면에서 사라지고 그 시간이 다시 열립니다.\n(취소 내역 탭에서 되살리거나 영구삭제할 수 있어요)\n\n⚠️ 여기서 취소하면 ★상담료는 지갑으로 «자동으로 안» 돌아갑니다.\n   🪙 회원 지갑에서 손으로 넣어 주십시오.\n   (손님이 마이페이지에서 취소하면 저절로 돌아갑니다)')) return
    await releaseSlotsFor([id])   // 슬롯 잠금 풀기 + bookings 정리
    const { error } = await supabase.from('consultations')
      .update({ status: 'cancelled', deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { alert('취소 실패: ' + error.message); return }
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
