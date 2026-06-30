'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'

type Slot = { id: string; slot_date: string; slot_hour: number; is_booked: boolean }

export default function ScheduleStep({
  consultantId,
  consultantName,
  consultationId,
  customerPhone,
  onComplete,
}: {
  consultantId: string
  consultantName: string
  consultationId: string
  customerPhone: string
  onComplete: () => void
}) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [pickedSlot, setPickedSlot] = useState<Slot | null>(null)
  const [booking, setBooking] = useState(false)

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('consultant_slots')
      .select('id, slot_date, slot_hour, is_booked')
      .eq('consultant_id', consultantId)
      .eq('is_booked', false)
      .gte('slot_date', today)
      .order('slot_date')
      .order('slot_hour')
    const list = (data as Slot[]) ?? []
    setSlots(list)
    if (list.length > 0) setSelectedDate(list[0].slot_date)
    setLoading(false)
  }, [consultantId])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  const dates = Array.from(new Set(slots.map((s) => s.slot_date)))
  const daySlots = slots.filter((s) => s.slot_date === selectedDate)

  function fmtDate(d: string) {
    const dt = new Date(d + 'T00:00:00')
    const w = ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()]
    return `${dt.getMonth() + 1}/${dt.getDate()} ${w}`
  }

  async function confirm() {
    if (!pickedSlot) return
    setBooking(true)
    try {
      const { data: u } = await supabase.auth.getUser()
      // 예약 저장
      const { error: bErr } = await supabase.from('bookings').insert({
        slot_id: pickedSlot.id,
        consultant_id: consultantId,
        consultation_id: consultationId,
        user_id: u?.user?.id ?? null,
        customer_phone: customerPhone,
        status: 'booked',
      })
      if (bErr) throw bErr
      // 슬롯 잠금
      await supabase.from('consultant_slots').update({ is_booked: true }).eq('id', pickedSlot.id)
      // 상담 건에 예약 시간 기록
      await supabase.from('consultations')
        .update({ booking_date: pickedSlot.slot_date, booking_hour: pickedSlot.slot_hour })
        .eq('id', consultationId)
      onComplete()
    } catch (e) {
      console.error(e)
      alert('예약 중 문제가 생겼어요. 다시 시도해 주세요.')
      setBooking(false)
      fetchSlots()
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1a1a18', maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: GOLD, fontSize: 18 }}>🕐</span>
        <span style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>상담 시간 선택</span>
      </div>
      <p style={{ color: SUB, fontSize: 13, marginBottom: 20 }}>
        {consultantName} 상담사님과 상담할 시간을 골라주세요
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', color: GOLD, padding: 40 }}>불러오는 중...</div>
      ) : slots.length === 0 ? (
        <div style={{ background: CARD, border: '1px solid rgba(250,199,117,0.15)', borderRadius: 14, padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#cfcdc7', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
            지금은 예약 가능한 시간이 없어요.<br />상담사가 시간을 열면 다시 안내드릴게요.
          </p>
          <button onClick={onComplete}
            style={{ background: 'rgba(250,199,117,0.16)', border: `1px solid ${GOLD}`, color: GOLD, borderRadius: 12, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            채팅방으로 이동 →
          </button>
        </div>
      ) : (
        <>
          <div style={{ color: SUB, fontSize: 12, marginBottom: 6 }}>날짜</div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 18 }}>
            {dates.map((d) => {
              const on = d === selectedDate
              return (
                <button key={d} onClick={() => { setSelectedDate(d); setPickedSlot(null) }}
                  style={{ flexShrink: 0, padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                    background: on ? GOLD : CARD, color: on ? '#1a1a18' : '#cfcdc7',
                    border: '1px solid ' + (on ? GOLD : 'rgba(250,199,117,0.12)'), fontSize: 13 }}>
                  {fmtDate(d)}
                </button>
              )
            })}
          </div>

          <div style={{ color: SUB, fontSize: 12, marginBottom: 6 }}>시간</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
            {daySlots.map((s) => {
              const on = pickedSlot?.id === s.id
              return (
                <button key={s.id} onClick={() => setPickedSlot(s)}
                  style={{ padding: '13px 0', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                    background: on ? GOLD : CARD, color: on ? '#1a1a18' : '#cfcdc7',
                    border: '1px solid ' + (on ? GOLD : 'rgba(250,199,117,0.18)'), fontSize: 14, fontWeight: on ? 700 : 400 }}>
                  {s.slot_hour}시
                </button>
              )
            })}
          </div>

          <div style={{ borderTop: '1px solid rgba(250,199,117,0.12)', paddingTop: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: SUB }}>선택</span>
              <span style={{ color: GOLD }}>
                {pickedSlot ? `${fmtDate(pickedSlot.slot_date)} ${pickedSlot.slot_hour}시` : '시간을 골라주세요'}
              </span>
            </div>
          </div>

          <button onClick={confirm} disabled={!pickedSlot || booking}
            style={{ width: '100%', padding: 15, borderRadius: 14, fontSize: 15, fontWeight: 700,
              cursor: pickedSlot && !booking ? 'pointer' : 'default',
              background: pickedSlot ? 'rgba(250,199,117,0.16)' : CARD,
              border: '1px solid ' + (pickedSlot ? GOLD : 'rgba(250,199,117,0.12)'),
              color: pickedSlot ? GOLD : '#555' }}>
            {booking ? '예약 중...' : '이 시간으로 예약하고 상담 시작 →'}
          </button>
        </>
      )}
    </main>
  )
}
