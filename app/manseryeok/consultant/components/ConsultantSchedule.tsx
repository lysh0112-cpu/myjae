'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const GOLD = '#FAC775'
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

type Day = { key: string; label: string; weekday: string; weekdayIdx: number }

// 오늘부터 14일(2주)치 날짜 생성
function buildDays(): Day[] {
  const out: Day[] = []
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
      weekdayIdx: d.getDay(),
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

  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)

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

  const slotOf = (date: string, hour: number) =>
    slots.find((s) => s.slot_date === date && s.slot_hour === hour)

  async function toggleHour(date: string, hour: number) {
    if (!consultantId) return
    const existing = slotOf(date, hour)

    // 이미 예약 찬 시간은 못 끔
    if (existing?.is_booked) {
      alert('이미 예약이 잡힌 시간이라 닫을 수 없어요.')
      return
    }

    const key = `${date}-${hour}`
    setBusyKey(key)
    try {
      if (existing) {
        // 열려 있던 것 → 닫기 (삭제)
        const { error } = await supabase.from('consultant_slots').delete().eq('id', existing.id)
        if (error) throw error
      } else {
        // 닫혀 있던 것 → 열기 (추가)
        const { error } = await supabase.from('consultant_slots').insert({
          consultant_id: consultantId,
          slot_date: date,
          slot_hour: hour,
        })
        if (error) throw error
      }
      await fetchSlots()
    } catch (e) {
      console.error(e)
      alert('변경 중 문제가 생겼어요. 다시 시도해 주세요.')
    } finally {
      setBusyKey(null)
    }
  }

  if (!consultantId) {
    return (
      <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: SUB }}>
        상담사 정보를 불러올 수 없어요
      </div>
    )
  }

  const totalOpenCount = slots.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

      {/* 안내 */}
      <div style={{ fontSize: '11px', color: SUB, marginBottom: '8px', lineHeight: 1.5, flexShrink: 0 }}>
        날짜 아래 시간을 눌러 여세요. 누르면 바로 저장돼요. 노란색만 고객에게 보입니다.
        <span style={{ color: GOLD, marginLeft: '6px' }}>· 앞으로 2주치</span>
      </div>

      {/* 2주 = 14일을 한 줄에 가로로 나란히 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: GOLD }}>불러오는 중...</div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(14, minmax(44px, 1fr))`,
            gap: '3px',
            minWidth: '640px',
          }}>
            {days.map((d, idx) => {
              const isSun = d.weekdayIdx === 0
              const isSat = d.weekdayIdx === 6
              const dayColor = isSun ? '#e57373' : isSat ? '#64b5f6' : '#d8d4e8'
              const openCount = slots.filter((s) => s.slot_date === d.key && !s.is_booked).length
              // 둘째 주(8~14일째)는 옅은 보라 배경으로 구분
              const weekTint = idx < 7 ? 'rgba(255,255,255,0.02)' : 'rgba(119,102,221,0.06)'

              return (
                <div key={d.key} style={{
                  display: 'flex', flexDirection: 'column',
                  background: weekTint,
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '6px',
                  padding: '4px 3px',
                }}>
                  {/* 날짜 헤더 */}
                  <div style={{ textAlign: 'center', marginBottom: '4px', lineHeight: 1.15 }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: dayColor }}>{d.label}</div>
                    <div style={{ fontSize: '9px', color: dayColor, opacity: 0.72 }}>
                      {d.weekday}{openCount > 0 && <span style={{ color: GOLD }}> ·{openCount}</span>}
                    </div>
                  </div>

                  {/* 시간 셀 세로 나열 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {HOURS.map((h) => {
                      const slot = slotOf(d.key, h)
                      const isOpen = !!slot && !slot.is_booked
                      const isBooked = !!slot && slot.is_booked
                      const isBusy = busyKey === `${d.key}-${h}`

                      let bg = 'rgba(255,255,255,0.03)'
                      let color = '#66657a'
                      let border = '1px solid transparent'
                      if (isOpen) { bg = GOLD; color = '#1a1a18'; border = '1px solid ' + GOLD }
                      if (isBooked) { bg = 'rgba(55,138,221,0.25)'; color = BLUE; border = '1px solid ' + BLUE }

                      return (
                        <button
                          key={h}
                          onClick={() => toggleHour(d.key, h)}
                          disabled={isBusy}
                          title={isBooked ? `${h}시 예약참` : isOpen ? `${h}시 열림 (누르면 닫힘)` : `${h}시 닫힘 (누르면 열림)`}
                          style={{
                            padding: '3px 0',
                            borderRadius: '4px',
                            cursor: isBooked ? 'not-allowed' : 'pointer',
                            background: bg,
                            color,
                            border,
                            fontSize: '10px',
                            fontWeight: isOpen || isBooked ? 700 : 400,
                            lineHeight: 1,
                            opacity: isBusy ? 0.5 : 1,
                            textAlign: 'center',
                          }}
                        >
                          {h}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 하단 요약 */}
      <div style={{ flexShrink: 0, marginTop: '6px', padding: '8px', borderRadius: '8px', background: 'rgba(250,199,117,0.08)', border: '1px solid rgba(250,199,117,0.25)', fontSize: '11px', color: '#cfcdc7', lineHeight: 1.5 }}>
        2주 열어둔 시간 <span style={{ color: GOLD, fontWeight: 700 }}>{totalOpenCount}개</span>
        <span style={{ color: SUB, marginLeft: '8px' }}>· 노란=열림, 파란=예약참</span>
      </div>
    </div>
  )
}
