'use client'
// app/manseryeok/moving-timing/components/DayDetailSheet.tsx
//
// ★ 날짜를 누르면 아래에서 올라오는 설명 시트.
//
//   [왜 바텀시트인가]
//   목록 위에 겹쳐 뜨므로 닫으면 목록이 그대로 남는다. 여러 날을 연달아
//   눌러 비교하기 좋다. 페이지를 옮기면 스크롤 위치를 잃는다.
//
//   [내용]
//   movingExplainV1.buildDayExplain 이 만든 글을 그대로 보여준다.
//   AI 를 쓰지 않는다 — 계산 결과를 풀어 쓴 것이라 틀릴 위험이 없다.

import { buildDayExplain } from '../lib/movingExplainV1'
import type { DayResult } from '../lib/recommendV1'
import type { PersonSaju } from '../lib/movingFilterV1'
import type { Direction } from '../lib/movingTables'

const C = {
  card: '#FFFDF9', line: '#EAE0CE', ink: '#3A3228',
  sub: '#9A8060', brand: '#7A6440', accent: '#967850',
  good: '#5F7A4E', warm: '#F5F0E4',
}

interface Props {
  day: DayResult | null
  people: PersonSaju[]
  direction: Direction | null
  onClose: () => void
  onConfirm: (day: DayResult) => void
  saving?: boolean
}

export default function DayDetailSheet({
  day, people, direction, onClose, onConfirm, saving,
}: Props) {
  if (!day) return null

  const ex = buildDayExplain({
    detail: day.detail,
    people,
    ganji: day.ganji,
    weekday: day.weekday,
    lunarLabel: day.lunarLabel,
    holidayName: day.holidayName,
    direction,
  })

  const section = (
    title: string,
    lines: { head?: string; body: string }[],
    color: string,
  ) => {
    if (lines.length === 0) return null
    return (
      <div style={{ marginBottom: 18 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 700, color, marginBottom: 9,
          letterSpacing: '-.2px',
        }}>
          {title}
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{ marginBottom: i < lines.length - 1 ? 11 : 0 }}>
            {l.head && (
              <div style={{
                fontSize: 13.5, fontWeight: 600, color: C.ink, marginBottom: 2,
              }}>
                {l.head}
              </div>
            )}
            <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.8 }}>
              {l.body}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(40,32,24,.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 60,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.card, width: '100%', maxWidth: 480,
          borderRadius: '18px 18px 0 0', padding: '20px 20px 26px',
          maxHeight: '82vh', overflowY: 'auto',
        }}
      >
        {/* 손잡이 */}
        <div style={{
          width: 38, height: 4, borderRadius: 2, background: '#E0D5C0',
          margin: '0 auto 16px',
        }} />

        {/* 날짜 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 3 }}>
          <span style={{
            fontSize: 18, fontWeight: 700, color: C.ink, letterSpacing: '-.4px',
          }}>
            {day.fullLabel}
          </span>
          <span style={{
            fontSize: 13,
            color: day.detail.optWeekend ? '#B4634A' : C.sub,
            fontWeight: day.detail.optWeekend ? 700 : 400,
          }}>
            {day.weekday}
          </span>
          <span style={{ fontSize: 12.5, color: '#C0AC90', marginLeft: 'auto' }}>
            {day.ganji}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: '#BFAE96', marginBottom: 18 }}>
          {day.lunarLabel}
          {day.holidayName && ` · ${day.holidayName}`}
          {day.detail.optSonEomneun && (
            <span style={{
              marginLeft: 7, color: C.good, fontWeight: 700,
            }}>
              손 없는 날
            </span>
          )}
        </div>

        {section('이런 점이 좋아요', ex.merits, C.good)}
        {section('이런 것들을 피했어요', ex.avoided, C.brand)}
        {section('알아두시면 좋아요', ex.notes, '#A87B4A')}

        <button
          onClick={() => onConfirm(day)}
          disabled={saving}
          style={{
            width: '100%', marginTop: 4, padding: '15px 0',
            background: C.accent, color: '#fff', border: 'none', borderRadius: 13,
            fontSize: 15, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
            fontFamily: 'inherit', transition: 'transform .08s, filter .12s',
          }}
          onPointerDown={e => {
            if (saving) return
            e.currentTarget.style.transform = 'scale(0.98)'
            e.currentTarget.style.filter = 'brightness(0.92)'
          }}
          onPointerUp={e => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.filter = 'none'
          }}
          onPointerLeave={e => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.filter = 'none'
          }}
        >
          {saving ? '담는 중…' : '이 날로 정할게요'}
        </button>

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 8, padding: '12px 0',
            background: 'none', border: 'none', color: C.sub,
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          다른 날도 볼게요
        </button>
      </div>
    </div>
  )
}
