'use client'

// app/mypage-new/EmotionPicker.tsx
// ----------------------------------------------------------------------------
// 마이페이지 "오늘 기분은?" 감정 입력 부품.
//   - 이모지 5종(울적·불안·보통·평온·설렘) 중 하나 탭 → B팝 애니메이션(2배+위로점프)
//   - 한 줄 기록(선택) + 저장 → emotion_logs (하루 1개)
//   - 페이지 진입 시 오늘 기록이 있으면 그 상태로 복원.
// 색·톤은 명카페 피치톤 그대로. 새 발명 없음.
// ----------------------------------------------------------------------------

import { useEffect, useState } from 'react'
import { MOODS, MoodCode, saveTodayMood, getTodayMood } from '@/lib/saju/emotionLog'

export default function EmotionPicker() {
  const [selected, setSelected] = useState<MoodCode | null>(null)
  const [note, setNote] = useState('')
  const [popKey, setPopKey] = useState(0)      // 애니메이션 재실행용
  const [saving, setSaving] = useState(false)
  const [savedMood, setSavedMood] = useState<MoodCode | null>(null)

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
    setSaving(true)
    const ok = await saveTodayMood(selected, note.trim() || undefined)
    setSaving(false)
    if (ok) setSavedMood(selected)
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
      <div style={{ fontSize: 12, fontWeight: 600, color: '#96502e', marginBottom: 11 }}>오늘 기분은 어떠세요?</div>

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
    </div>
  )
}
