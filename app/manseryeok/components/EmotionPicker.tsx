'use client'

// app/manseryeok/components/EmotionPicker.tsx
// ----------------------------------------------------------------------------
// "오늘 기분은?" 감정 입력 부품. (홈에서 사용. props 없음 → 어디서든 한 줄로)
//   - 이모지 5종(울적·불안·보통·평온·설렘) 중 하나 탭 → B팝 애니메이션(2배+위로점프)
//   - 한 줄 기록(선택) + 저장 → emotion_logs (하루 1개)
//   - 페이지 진입 시 오늘 기록이 있으면 그 상태로 복원.
// 색·톤은 명카페 피치톤 그대로. 새 발명 없음.
// ----------------------------------------------------------------------------

import { useEffect, useState } from 'react'
import { MOODS, MoodCode, saveTodayMood, getTodayMood, countMoods, shouldShowNotice, noticeFor } from '@/lib/saju/emotionLog'
import MoodHistoryModal from './MoodHistoryModal'

export default function EmotionPicker() {
  const [selected, setSelected] = useState<MoodCode | null>(null)
  const [note, setNote] = useState('')
  const [popKey, setPopKey] = useState(0)      // 애니메이션 재실행용
  const [saving, setSaving] = useState(false)
  const [savedMood, setSavedMood] = useState<MoodCode | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [notice, setNotice] = useState<{ emoji: string; title: string; body: string } | null>(null)

  useEffect(() => {
    getTodayMood().then((m) => {
      if (m) {
        setSelected(m.mood)
        setSavedMood(m.mood)
        if (m.note) setNote(m.note)
      }
    })
  }, [])

  const pick = (code: MoodCode) => {
    setSelected(code)
    setPopKey((k) => k + 1)
  }

  const save = async () => {
    if (selected == null || saving) return
    const firstSaveToday = savedMood == null
    setSaving(true)
    const ok = await saveTodayMood(selected, note.trim() || undefined)
    setSaving(false)
    if (ok) {
      setSavedMood(selected)
      // 오늘 첫 저장일 때만 안내 팝업 확인 (다시 저장은 카운트 안 늘어남)
      if (firstSaveToday) {
        const cnt = await countMoods()
        if (shouldShowNotice(cnt)) setNotice(noticeFor(cnt))
      }
    }
  }

  const dirty = selected != null && (selected !== savedMood || note.trim().length >= 0)

  return (
    <div style={{ background: '#FFFBF7', border: '0.5px solid #f0d8c0', borderRadius: 14, padding: '14px 14px 13px', marginBottom: 11 }}>
      <style>{`
        @keyframes emoPopB {
          0%{transform:scale(.9) translateY(0)}
          35%{transform:scale(2) translateY(-14px) rotate(-12deg)}
          60%{transform:scale(1.3) translateY(0) rotate(8deg)}
          80%{transform:scale(1.5) rotate(-3deg)}
          100%{transform:scale(1.28)}
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#96502e' }}>오늘 기분은 어떠세요?</span>
        {/* 진짜 button으로 둔다. span이면 손가락이 살짝 밀릴 때 글자 범위만 잡히고 눌리지 않는다. */}
        <button type="button" onClick={() => setShowHistory(true)} style={{ fontSize: 10.5, color: '#8f3d0e', background: '#faede0', border: '0.5px solid #ecd8c6', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>📅 내 감정 기록</button>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        {MOODS.map((m) => {
          const on = selected === m.code
          return (
            <div
              key={m.code}
              onClick={() => pick(m.code)}
              style={{
                flex: 1, textAlign: 'center', padding: '11px 0', borderRadius: 11, cursor: 'pointer',
                border: on ? '2px solid #c8783c' : '0.5px solid #eaddd0',
                background: on ? '#faede0' : '#fff',
                overflow: 'visible',
                WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span
                key={on ? popKey : `s${m.code}`}
                style={{
                  display: 'inline-block', fontSize: 24, lineHeight: 1,
                  animation: on ? 'emoPopB .7s cubic-bezier(.34,1.7,.5,1)' : 'none',
                  transform: on ? 'scale(1.28)' : 'scale(.92)',
                }}
              >
                {m.emoji}
              </span>
            </div>
          )
        })}
      </div>

      {selected != null && (
        <div style={{ fontSize: 11, color: '#8a7360', marginTop: 9, textAlign: 'center', fontWeight: 500 }}>
          {MOODS.find((m) => m.code === selected)?.label}
        </div>
      )}

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="오늘 한 줄 기록 남기기…"
        maxLength={60}
        style={{
          width: '100%', marginTop: 10, fontSize: 11.5, color: '#5a4a3e',
          background: '#fff', border: '0.5px solid #efe0d4', borderRadius: 9,
          padding: '9px 11px', outline: 'none', boxSizing: 'border-box',
        }}
      />

      {selected != null && (
        <button
          onClick={save}
          disabled={saving}
          style={{
            width: '100%', marginTop: 9, padding: '9px 0', borderRadius: 9, border: 'none',
            background: savedMood === selected && note.trim() === '' ? '#d8b9a0' : '#b46e46',
            color: '#fff', fontSize: 12, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? '저장 중…' : savedMood != null ? '오늘 기분 다시 저장' : '오늘 기분 저장'}
        </button>
      )}

      <MoodHistoryModal open={showHistory} onClose={() => setShowHistory(false)} />

      {notice && (
        <div onClick={() => setNotice(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(60,40,30,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 1100 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 300, background: '#FFFBF7', border: '0.5px solid #f0d8c0', borderRadius: 16, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 9 }}>{notice.emoji}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#96502e', marginBottom: 8 }}>{notice.title}</div>
            <div style={{ fontSize: 12, color: '#7a6858', lineHeight: 1.7 }}>{notice.body}</div>
            <button onClick={() => setNotice(null)}
              style={{ width: '100%', marginTop: 14, padding: '10px 0', borderRadius: 10, border: 'none', background: '#b46e46', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>확인</button>
          </div>
        </div>
      )}
    </div>
  )
}
