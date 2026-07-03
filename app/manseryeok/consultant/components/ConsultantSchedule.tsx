'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const GOLD = '#FAC775'
const SUB = '#8a88a0'
const BLUE = '#378add'

// 상담 가능 시간대 (오전 10시 ~ 밤 9시)
const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

// 4주 전체에서 권장하는 최대 열림 개수 (막지 않고 안내만)
const SOFT_LIMIT = 5

type Slot = {
  id: string
  slot_date: string
  slot_hour: number
  is_booked: boolean
}

type Day = { key: string; label: string; weekday: string; weekdayIdx: number }

// 오늘부터 28일(4주)치 날짜 생성
function buildDays(): Day[] {
  const out: Day[] = []
  const today = new Date()
  for (let i = 0; i < 28; i++) {
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
  // 7일씩 4주 = 4행으로 분할
  const weeks: Day[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const showToast = useCallback((text: string) => {
    setToast(text)
    setTimeout(() => setToast(''), 1800)
  }, [])

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

  // 4주 전체에서 지금 열려 있는 슬롯 수 (예약 찬 것 포함)
  const totalOpenCount = slots.length

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
        await supabase.from('consultant_slots').delete().eq('id', existing.id)
        await fetchSlots()
        showToast(`${hour}시 닫힘`)
      } else {
        // 새로 켤 때: 이미 5개 이상이면 안내만 (막지 않음)
        if (totalOpenCount >= SOFT_LIMIT) {
          showToast('최대 5개 정도까지만 선택해 주세요')
        }
        await supabase.from('consultant_slots').insert({
          consultant_id: consultantId,
          slot_date: date,
          slot_hour: hour,
        })
        await fetchSlots()
        if (totalOpenCount < SOFT_LIMIT) {
          showToast(`${hour}시 저장됨 ✓`)
        }
      }
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

  const overLimit = totalOpenCount > SOFT_LIMIT

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: fontSize + 'px', position: 'relative' }}>

      {/* 저장됨 / 안내 팝업 (토스트) */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(26,26,24,0.96)',
          color: GOLD,
          border: `1px solid ${GOLD}`,
          borderRadius: '12px',
          padding: '12px 22px',
          fontSize: '14px',
          fontWeight: 700,
          zIndex: 2000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      {/* 안내 */}
      <div style={{ fontSize: '11px', color: SUB, marginBottom: '10px', lineHeight: 1.5, flexShrink: 0 }}>
        각 날짜 아래 시간을 눌러 여세요. 누르면 바로 저장돼요. 켜둔 시간(노란색)만 고객에게 보입니다.
        <span style={{ color: GOLD, marginLeft: '6px' }}>· 4주 통틀어 5개 정도 권장</span>
      </div>

      {/* 주 단위 달력 그리드 */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {loading ? (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: GOLD }}>불러오는 중...</div>
        ) : (
          weeks.map((week, wi) => (
            <div key={wi} style={{ marginBottom: '14px' }}>
              {/* 주 라벨 */}
              <div style={{ fontSize: '10px', color: SUB, marginBottom: '5px' }}>{wi + 1}주차</div>

              {/* 이 주의 날짜들: 가로 7칸 */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${week.length}, 1fr)`, gap: '5px' }}>
                {week.map((d) => {
                  const isSun = d.weekdayIdx === 0
                  const isSat = d.weekdayIdx === 6
                  const dayColor = isSun ? '#e57373' : isSat ? '#64b5f6' : '#e8e2f5'
                  const openCount = slots.filter((s) => s.slot_date === d.key && !s.is_booked).length

                  return (
                    <div key={d.key} style={{ display: 'flex', flexDirection: 'column' }}>
                      {/* 날짜 헤더 */}
                      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: dayColor, lineHeight: 1.2 }}>{d.label}</div>
                        <div style={{ fontSize: '9px', color: dayColor, opacity: 0.75 }}>{d.weekday}</div>
                        {openCount > 0 && (
                          <div style={{ fontSize: '8px', color: GOLD }}>{openCount}개</div>
                        )}
                      </div>

                      {/* 그 날의 시간들: 세로로 아래 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {HOURS.map((h) => {
                          const slot = slotOf(d.key, h)
                          const isOpen = !!slot && !slot.is_booked
                          const isBooked = !!slot && slot.is_booked
                          const isBusy = busyKey === `${d.key}-${h}`

                          let bg = 'rgba(255,255,255,0.03)'
                          let color = SUB
                          let border = '1px solid rgba(255,255,255,0.06)'
                          if (isOpen) { bg = GOLD; color = '#1a1a18'; border = '1px solid ' + GOLD }
                          if (isBooked) { bg = 'rgba(55,138,221,0.2)'; color = BLUE; border = '1px solid ' + BLUE }

                          return (
                            <button
                              key={h}
                              onClick={() => toggleHour(d.key, h)}
                              disabled={isBusy}
                              title={isBooked ? '예약참' : isOpen ? '열림 (누르면 닫힘)' : '닫힘 (누르면 열림)'}
                              style={{
                                padding: '4px 0',
                                borderRadius: '5px',
                                cursor: isBooked ? 'not-allowed' : 'pointer',
                                background: bg,
                                color,
                                border,
                                fontSize: '10px',
                                fontWeight: isOpen || isBooked ? 600 : 400,
                                lineHeight: 1.1,
                                opacity: isBusy ? 0.5 : 1,
                                textAlign: 'center',
                              }}
                            >
                              {h}{isBooked ? '·예약' : ''}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 하단 요약 */}
      <div style={{ flexShrink: 0, marginTop: '8px', padding: '9px', borderRadius: '8px', background: overLimit ? 'rgba(229,115,115,0.1)' : 'rgba(250,199,117,0.08)', border: '1px solid ' + (overLimit ? 'rgba(229,115,115,0.4)' : 'rgba(250,199,117,0.25)'), fontSize: '11px', color: '#cfcdc7', lineHeight: 1.6 }}>
        4주 동안 열어둔 시간 <span style={{ color: overLimit ? '#e57373' : GOLD, fontWeight: 700 }}>{totalOpenCount}개</span>
        {overLimit && <span style={{ color: '#e57373', marginLeft: '6px' }}>· 5개 정도까지만 권장해요</span>}
        <span style={{ color: SUB, marginLeft: '8px' }}>· 노란색=열림, 파란색=예약참</span>
      </div>
    </div>
  )
}
