'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getConsultTypeLabel } from './useDashboardTable'

type Cancelled = {
  id: string
  created_at: string
  deleted_at: string | null
  customer_phone: string
  customer_name: string | null
  paid_amount: number
  consultant_id: string
  booking_date: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  birth_data: any
}
type Consultant = { id: string; name: string }

function fmtDateTime(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  const mo = d.getMonth() + 1
  const da = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mo}/${da} ${hh}:${mi}`
}
function fmtDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('ko-KR')
}

export default function CancelledHistory() {
  const [list, setList] = useState<Cancelled[]>([])
  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: cons }, { data: consultantList }] = await Promise.all([
      // 취소된 건(deleted_at 있음)만 모아서 최근 취소 순
      supabase.from('consultations').select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase.from('consultants').select('id, name'),
    ])
    setList((cons as Cancelled[]) ?? [])
    setConsultants((consultantList as Consultant[]) ?? [])
    setLoading(false)
  }

  function consultantName(id: string) {
    if (!id) return 'AI'
    return consultants.find(c => c.id === id)?.name ?? 'AI'
  }

  // 되살리기: 취소를 되돌림 → 다시 정상 예약 목록에 나타남
  // (주의: 그 시간 슬롯이 이미 다른 사람에게 예약됐을 수 있으므로, 슬롯 재잠금은 하지 않고 상담 건만 복원)
  async function handleRestore(c: Cancelled) {
    if (!confirm('이 예약을 되살릴까요?\n\n다시 정상 예약으로 돌아갑니다.\n(그 시간이 이미 다른 분께 예약됐을 수 있으니, 예약 시간은 확인해 주세요)')) return
    setBusyId(c.id)
    try {
      const { error } = await supabase.from('consultations')
        .update({ status: 'booked', deleted_at: null })
        .eq('id', c.id)
      if (error) { alert('되살리기 실패: ' + error.message); return }
      await fetchAll()
    } finally {
      setBusyId(null)
    }
  }

  // 영구삭제: DB에서 완전히 제거 (복구 불가). 연관 데이터도 함께 정리.
  async function handlePurge(c: Cancelled) {
    if (!confirm('정말 영구삭제할까요?\n\n되돌릴 수 없습니다. 이 상담과 관련된 모든 기록이 사라집니다.')) return
    if (!confirm('한 번 더 확인합니다. 정말 영구삭제합니다.')) return
    setBusyId(c.id)
    try {
      // 연관 테이블 먼저 삭제 (외래키 제약 해제)
      await supabase.from('payments').delete().eq('consultation_id', c.id)
      await supabase.from('chat_messages').delete().eq('consultation_id', c.id)
      await supabase.from('commentaries').delete().eq('consultation_id', c.id)
      await supabase.from('couples').delete().eq('consultation_id', c.id)
      await supabase.from('mulsang_images').delete().eq('consultation_id', c.id)
      await supabase.from('namings').delete().eq('consultation_id', c.id)
      await supabase.from('weddings').delete().eq('consultation_id', c.id)
      await supabase.from('births').delete().eq('consultation_id', c.id)
      await supabase.from('bookings').delete().eq('consultation_id', c.id)
      const { error } = await supabase.from('consultations').delete().eq('id', c.id)
      if (error) { alert('영구삭제 실패: ' + error.message); return }
      await fetchAll()
    } finally {
      setBusyId(null)
    }
  }

  function handleExcel() {
    const headers = ['취소일시', '원래예약일', '상담사', '종류', '전화번호', '금액']
    const rows = list.map(c => [
      fmtDateTime(c.deleted_at),
      fmtDate(c.booking_date),
      consultantName(c.consultant_id),
      getConsultTypeLabel(c),
      c.customer_phone,
      (c.paid_amount || 0).toLocaleString() + '원',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `명연재_취소내역_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="text-center py-10" style={{ color: '#FAC775' }}>불러오는 중...</div>

  const th = 'px-3 py-3 text-left text-xs font-bold whitespace-nowrap'

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-sm font-bold text-white">
          취소 내역
          <span className="ml-2 text-xs" style={{ color: '#8a88a0' }}>총 {list.length}건</span>
        </div>
        <button onClick={handleExcel}
          className="px-4 py-2 rounded-xl text-xs font-bold"
          style={{ background: 'rgba(76,175,80,0.2)', color: '#81c784', border: '1px solid rgba(76,175,80,0.3)' }}>
          📊 엑셀 다운로드
        </button>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ background: 'rgba(60,52,137,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['취소일시', '원래 예약일', '상담사', '종류', '전화번호', '금액', '되살리기', '영구삭제'].map(h => (
                <th key={h} className={th} style={{ color: '#FAC775' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-sm"
                style={{ color: 'rgba(255,255,255,0.3)' }}>취소된 예약이 없습니다</td></tr>
            )}
            {list.map((c, i) => {
              const isBusy = busyId === c.id
              const typeLabel = getConsultTypeLabel(c)
              return (
                <tr key={c.id} style={{
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.04)'
                }}>
                  <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: '#e8e2f5' }}>{fmtDateTime(c.deleted_at)}</td>
                  <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: '#8a88a0' }}>{fmtDate(c.booking_date)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="text-xs px-2 py-1 rounded-full"
                      style={{ background: 'rgba(60,52,137,0.3)', color: '#b0aec8' }}>
                      {consultantName(c.consultant_id)}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {typeLabel !== '-' ? (
                      <span className="text-xs px-2 py-1 rounded-full"
                        style={{ background: 'rgba(129,199,132,0.15)', color: '#81c784' }}>{typeLabel}</span>
                    ) : <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>-</span>}
                  </td>
                  <td className="px-3 py-3 text-sm text-white whitespace-nowrap">{c.customer_phone}</td>
                  <td className="px-3 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#FAC775' }}>
                    {(c.paid_amount || 0).toLocaleString()}원
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => handleRestore(c)} disabled={isBusy}
                      className="px-3 py-1 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(55,138,221,0.2)', color: '#64b5f6', opacity: isBusy ? 0.5 : 1 }}>
                      되살리기
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => handlePurge(c)} disabled={isBusy}
                      className="px-3 py-1 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(255,100,100,0.15)', color: '#ff6464', opacity: isBusy ? 0.5 : 1 }}>
                      영구삭제
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
