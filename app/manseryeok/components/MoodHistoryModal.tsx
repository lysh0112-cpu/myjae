'use client'

// app/manseryeok/components/MoodHistoryModal.tsx
// ----------------------------------------------------------------------------
// 내 감정 기록 모달 — 한 달 기분 흐름 그래프.
//   - 막대 높이 = 기분 점수(설렘·평온 높게 / 불안·울적 낮게), 색도 기분별
//   - 막대를 누르면 그날 기록(이모지·날짜·한 줄 메모)이 아래 박스에 표시
//   - ‹ › 로 월 넘김 (첫 기록 월까지만 과거로, 미래는 이번 달까지)
//   - 오버레이 패턴은 기존 RecordModal과 동일(rgba(60,40,30,0.35))
// 탈퇴 전까지 언제든 조회. 데이터 없으면 안내 문구.
// ----------------------------------------------------------------------------

import { useEffect, useState } from 'react'
import { MOODS, MoodCode, EmotionLog, listMonthMoods, firstMoodMonth } from '@/lib/saju/emotionLog'

const COLOR: Record<MoodCode, string> = { 0: '#9a8574', 1: '#d88a8a', 2: '#c0a898', 3: '#7cc4a0', 4: '#e0a94e' }

function emojiOf(m: MoodCode) { return MOODS.find((x) => x.code === m)?.emoji || '😐' }
function labelOf(m: MoodCode) { return MOODS.find((x) => x.code === m)?.label || '' }

export default function MoodHistoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [rows, setRows] = useState<EmotionLog[]>([])
  const [first, setFirst] = useState<{ year: number; month: number } | null>(null)
  const [picked, setPicked] = useState<EmotionLog | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([listMonthMoods(year, month), firstMoodMonth()]).then(([r, f]) => {
      setRows(r)
      setFirst(f)
      setPicked(r.length ? r[r.length - 1] : null)
      setLoading(false)
    })
  }, [open, year, month])

  if (!open) return null

  const daysInMonth = new Date(year, month, 0).getDate()
  const byDay: Record<number, EmotionLog> = {}
  for (const r of rows) byDay[Number(r.logDate.split('-')[2])] = r

  const isThisMonth = year === today.getFullYear() && month === today.getMonth() + 1
  const atFirst = first ? (year === first.year && month === first.month) : true

  const prevMonth = () => {
    if (atFirst) return
    if (month === 1) { setYear(year - 1); setMonth(12) } else setMonth(month - 1)
  }
  const nextMonth = () => {
    if (isThisMonth) return
    if (month === 12) { setYear(year + 1); setMonth(1) } else setMonth(month + 1)
  }

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(60,40,30,0.35)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 14px', zIndex: 1000, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 360, background: '#FDF6F0', borderRadius: 16, padding: '16px 14px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#96502e' }}>내 감정 기록</span>
          <button type="button" onClick={onClose} aria-label="닫기" style={{ fontSize: 18, color: '#6b5340', cursor: 'pointer', background: 'none', border: 'none', padding: 0, lineHeight: 1, fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>✕</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 12, fontSize: 12, color: '#6b5340' }}>
          <button type="button" onClick={prevMonth} disabled={atFirst} aria-label="이전 달" style={{ cursor: atFirst ? 'default' : 'pointer', fontSize: 15, opacity: atFirst ? 0.3 : 1, background: 'none', border: 'none', padding: '2px 6px', color: 'inherit', fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>‹</button>
          <span style={{ color: '#5a4a3e', fontWeight: 600 }}>{year}. {month}</span>
          <button type="button" onClick={nextMonth} disabled={isThisMonth} aria-label="다음 달" style={{ cursor: isThisMonth ? 'default' : 'pointer', fontSize: 15, opacity: isThisMonth ? 0.3 : 1, background: 'none', border: 'none', padding: '2px 6px', color: 'inherit', fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>›</button>
        </div>

        {loading ? (
          <div style={{ fontSize: 12, color: '#5c3a1e', textAlign: 'center', padding: '30px 0' }}>불러오는 중…</div>
        ) : rows.length === 0 ? (
          <div style={{ background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, padding: '28px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#8a7360', marginBottom: 4 }}>이 달의 기록이 없어요</div>
            <div style={{ fontSize: 11, color: '#6b5340' }}>오늘의 기분을 기록하면 여기 흐름이 그려져요.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#96502e', margin: '0 2px 8px' }}>
              한 달 기분 흐름 <span style={{ fontWeight: 400, color: '#6b5340', fontSize: 10 }}>· 막대를 누르면 그날 기록이 보여요</span>
            </div>
            <div style={{ background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, padding: '14px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 100 }}>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                  const rec = byDay[d]
                  const s = rec ? rec.mood : -1
                  const h = s < 0 ? 4 : (s + 1) * 18
                  const on = picked && Number(picked.logDate.split('-')[2]) === d
                  return (
                    <div key={d}
                      onClick={() => rec && setPicked(rec)}
                      style={{ flex: 1, height: h, borderRadius: 3, background: s < 0 ? '#eee5dc' : COLOR[s as MoodCode], cursor: rec ? 'pointer' : 'default', outline: on ? '2px solid #96502e' : 'none', outlineOffset: 1 }}
                    />
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 8, color: '#6b5340' }}>
                <span>1일</span><span>{Math.round(daysInMonth / 2)}일</span><span>{daysInMonth}일</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, margin: '12px 2px 14px', fontSize: 9, color: '#6b5340', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span>🤩 설렘</span><span>😌 평온</span><span>😐 보통</span><span>😰 불안</span><span>😔 울적</span>
            </div>

            {picked && (
              <div style={{ background: '#faf3ec', border: '0.5px solid #f0e0d5', borderRadius: 12, padding: '14px 15px', display: 'flex', alignItems: 'center', gap: 13 }}>
                <span style={{ fontSize: 30 }}>{emojiOf(picked.mood)}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, color: '#6b5340' }}>{picked.logDate.replace(/-/g, '.').slice(5)}{isThisMonth && Number(picked.logDate.split('-')[2]) === today.getDate() ? ' (오늘)' : ''}</div>
                  <div style={{ fontSize: 13, color: '#4a3e34', marginTop: 2 }}>{labelOf(picked.mood)}{picked.note ? ` · ${picked.note}` : ''}</div>
                </div>
              </div>
            )}
            <div style={{ fontSize: 10, color: '#6b5340', textAlign: 'center', marginTop: 9 }}>↑ 그래프에서 막대를 누르면 그날 기록이 여기 나와요</div>
          </>
        )}
      </div>
    </div>
  )
}
