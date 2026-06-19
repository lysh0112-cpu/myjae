// app/manseryeok/consultant/components/Commentary.tsx
'use client'

import { useState } from 'react'

interface Props {
  consultationId?: string
}

export default function Commentary({ consultationId }: Props) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/commentary', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ consultationId, text }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch(e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl p-5 mb-4" style={{background:'#2C2C2A',border:'1px solid rgba(255,255,255,0.07)'}}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">✍️</span>
        <h2 className="text-base font-bold text-white">해설 입력</h2>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="고객에게 전달할 사주 풀이를 입력하세요..."
        rows={8}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none leading-relaxed"
        style={{background:'#1a1a18',border:'1px solid rgba(255,255,255,0.12)',
          color:'#e0dce8',colorScheme:'dark'}}
      />

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs" style={{color:'#8a88a0'}}>{text.length}자</span>
        <button
          onClick={handleSave}
          disabled={saving || !text.trim()}
          className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
          style={text.trim()
            ? {background:'linear-gradient(135deg,#3C3489 0%,#FAC775 100%)',color:'#1a1a18'}
            : {background:'rgba(255,255,255,0.06)',color:'#8a88a0',cursor:'not-allowed'}}>
          {saving ? '저장 중...' : saved ? '✓ 저장됨' : '저장하기'}
        </button>
      </div>

      {saved && (
        <div className="mt-3 rounded-xl px-4 py-2.5 flex items-center gap-2"
          style={{background:'rgba(60,52,137,0.2)',border:'1px solid rgba(60,52,137,0.4)'}}>
          <span style={{color:'#FAC775'}}>✓</span>
          <span className="text-sm" style={{color:'#e0dce8'}}>해설이 저장되었습니다. 고객 상담방에 표시됩니다.</span>
        </div>
      )}
    </div>
  )
}
