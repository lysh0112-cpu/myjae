'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'
const BLUE = '#378add'

// 상담 가능 시간대 (오전 10시 ~ 밤 9시)
const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

type Slot = {
  id: string
  slot_date: string
  slot_hour: number
  is_booked: boolean
}

// 오늘부터 14일치 날짜 생성
function buildDays(): { key: string; label: string; weekday: string }[] {
  const out: { key: string; label: string; weekday: string }[] = []
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    out.push({
      key: `${yyyy}-${mm}-${dd}`,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      weekday: WEEK[d.getDay()],
    })
  }
  return out
}

export default function ConsultantSchedule({
  consultantId,
  fontSize = 13,
}: {
  consultantId: string
  fontSize?: number
}) {
  const days = buildDays()
  const [selectedDate, setSelectedDate] = useState(days[0].key)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [busyHour, setBusyHour] = useState<number | null>(null)

  const fetchSlots = useCallback(async () => {
    if (!consultantId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('consultant_slots')
      .select('id, slot_date, slot_hour, is_booked')
      .eq('consultant_id', consultantId)
      .order('slot_date')
      .order('slot_hour')
    setSlots((data as Slot[]) ?? [])
    setLoading(false)
  }, [consultantId])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  // 선택한 날짜의 슬롯만
  const daySlots = slots.filter((s) => s.slot_date === selectedDate)
  const slotOf = (hour: number) => daySlots.find((s) => s.slot_hour === hour)

  // 시간 칸 켜기/끄기
  async function toggleHour(hour: number) {
    if (!consultantId) return
    const existing = slotOf(hour)

    // 이미 예약 찬 시간은 못 끔
    if (existing?.is_booked) {
      alert('이미 예약이 잡힌 시간이라 닫을 수 없어요.')
      return
    }

    setBusyHour(hour)
    try {
      if (existing) {
        // 열려 있던 것 → 닫기 (삭제)
        await supabase.from('consultant_slots').delete().eq('id', existing.id)
      } else {
        // 닫혀 있던 것 → 열기 (추가)
        await supabase.from('consultant_slots').insert({
          consultant_id: consultantId,
          slot_date: selectedDate,
          slot_hour: hour,
        })
      }
      await fetchSlots()
    } catch (e) {
      console.error(e)
      alert('변경 중 문제가 생겼어요. 다시 시도해 주세요.')
    } finally {
      setBusyHour(null)
    }
  }

  // 선택 날짜에 열어둔 시간 요약
  const openHours = daySlots
    .filter((s) => !s.is_booked)
    .map((s) => `${s.slot_hour}시`)
    .join(', ')
  const bookedHours = daySlots
    .filter((s) => s.is_booked)
    .map((s) => `${s.slot_hour}시`)
    .join(', ')

  if (!consultantId) {
    return (
      <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: SUB }}>
        상담사 정보를 불러올 수 없어요
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: fontSize + 'px' }}>

      {/* 안내 */}
      <div style={{ fontSize: '11px', color: SUB, marginBottom: '8px', lineHeight: 1.5 }}>
        날짜를 고른 뒤 시간을 눌러 여세요. 켜둔 시간만 고객에게 보입니다.
      </div>

      {/* 날짜 가로 스크롤 */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', flexShrink: 0 }}>
        {days.map((d) => {
          const on = d.key === selectedDate
          const hasOpen = slots.some((s) => s.slot_date === d.key)
          return (
            <button
              key={d.key}
              onClick={() => setSelectedDate(d.key)}
              style={{
                flexShrink: 0,
                padding: '6px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                background: on ? GOLD : CARD,
                color: on ? '#1a1a18' : '#cfcdc7',
                border: '1px solid ' + (on ? GOLD : 'rgba(250,199,117,0.12)'),
                fontSize: '11px',
                lineHeight: 1.3,
                textAlign: 'center',
                position: 'relative',
              }}
            >
              <div>{d.label}</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>{d.weekday}</div>
              {hasOpen && !on && (
                <span style={{ position: 'absolute', top: 3, right: 4, width: 5, height: 5, borderRadius: '50%', background: GOLD }} />
              )}
            </button>
          )
        })}
      </div>

      {/* 시간 격자 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: GOLD }}>불러오는 중...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '4px' }}>
            {HOURS.map((h) => {
              const slot = slotOf(h)
              const isOpen = !!slot && !slot.is_booked
              const isBooked = !!slot && slot.is_booked
              const isBusy = busyHour === h

              let bg = CARD
              let color = SUB
              let border = '1px solid rgba(250,199,117,0.1)'
              if (isOpen) { bg = GOLD; color = '#1a1a18'; border = '1px solid ' + GOLD }
              if (isBooked) { bg = 'rgba(55,138,221,0.18)'; color = BLUE; border = '1px solid ' + BLUE }

              return (
                <button
                  key={h}
                  onClick={() => toggleHour(h)}
                  disabled={isBusy}
                  style={{
                    padding: '10px 0',
                    borderRadius: '8px',
                    cursor: isBooked ? 'not-allowed' : 'pointer',
                    background: bg,
                    color,
                    border,
                    fontSize: '12px',
                    lineHeight: 1.3,
                    opacity: isBusy ? 0.5 : 1,
                  }}
                >
                  <div>{h}시</div>
                  <div style={{ fontSize: '9px' }}>
                    {isBooked ? '예약참' : isOpen ? '열림' : ''}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 요약 */}
      <div style={{ flexShrink: 0, marginTop: '10px', padding: '9px', borderRadius: '8px', background: 'rgba(250,199,117,0.08)', border: '1px solid rgba(250,199,117,0.25)', fontSize: '11px', color: '#cfcdc7', lineHeight: 1.6 }}>
        <div>열어둔 시간: <span style={{ color: GOLD }}>{openHours || '없음'}</span></div>
        {bookedHours && (
          <div>예약 찬 시간: <span style={{ color: BLUE }}>{bookedHours}</span></div>
        )}
      </div>
    </div>
  )
}
