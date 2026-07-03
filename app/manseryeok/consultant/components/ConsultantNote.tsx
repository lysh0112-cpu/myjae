'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  consultationId: string
  fontSize?: number
  fontFamily?: string
}

// 마크다운 기호 제거 (요약 텍스트 정리)
function clean(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^---+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function ConsultantNote({ consultationId, fontSize = 13, fontFamily }: Props) {
  const [note, setNote] = useState('')          // ③위: 상담사 의견 (commentaries.content)
  const [summary, setSummary] = useState('')    // ③아래: AI 요약 (consultations.summary)
  const [noteSaved, setNoteSaved] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [summarySaved, setSummarySaved] = useState(false)
  const [copied, setCopied] = useState(false)

  // 기존 저장분 불러오기
  useEffect(() => {
    if (!consultationId) return
    let cancelled = false
    ;(async () => {
      const { data: com } = await supabase
        .from('commentaries')
        .select('content')
        .eq('consultation_id', consultationId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const { data: cons } = await supabase
        .from('consultations')
        .select('summary')
        .eq('id', consultationId)
        .single()
      if (cancelled) return
      setNote(com?.content || '')
      setSummary(cons?.summary || '')
    })()
    return () => { cancelled = true }
  }, [consultationId])

  // ③위: 상담사 의견 저장 (commentaries upsert)
  const saveNote = useCallback(async () => {
    if (!consultationId) return
    try {
      // 이 상담 건의 기존 의견이 있으면 갱신, 없으면 새로 생성
      const { data: exist } = await supabase
        .from('commentaries')
        .select('id')
        .eq('consultation_id', consultationId)
        .limit(1)
        .maybeSingle()
      if (exist?.id) {
        await supabase.from('commentaries')
          .update({ content: note, updated_at: new Date().toISOString() })
          .eq('id', exist.id)
      } else {
        await supabase.from('commentaries')
          .insert({ consultation_id: consultationId, content: note })
      }
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 1500)
    } catch (e) {
      console.error('의견 저장 실패', e)
      alert('의견 저장 중 문제가 생겼어요.')
    }
  }, [consultationId, note])

  // ③아래: AI 요약 생성 (왼쪽 분석 + 상담사 의견 + 채팅을 요약)
  async function generateSummary() {
    if (!consultationId) return
    setSummarizing(true)
    try {
      // 재료 모으기: 고객이 본 해설 + 상담사 의견 + 채팅
      const { data: cons } = await supabase
        .from('consultations')
        .select('ai_analysis, ai_free_analysis')
        .eq('id', consultationId)
        .single()
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('sender, message')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: true })
        .limit(100)

      const chatText = (msgs || [])
        .map(m => `${m.sender === 'consultant' ? '상담사' : '고객'}: ${m.message}`)
        .join('\n')

      const prompt = `아래는 명리 상담 내용입니다. 이것을 고객에게 카카오톡으로 보낼 "상담 요약"으로 정리해주세요.

[규칙]
- 마크다운 기호(##, **, ---)는 절대 쓰지 마세요.
- 따뜻하고 정중한 존댓말로, 6~10줄 이내로 핵심만.
- 고객이 바로 읽기 좋게, 오늘 상담의 핵심과 조언을 담아주세요.

[AI 분석]
${(cons?.ai_analysis || cons?.ai_free_analysis || '').slice(0, 1500)}

[상담사 의견]
${note.slice(0, 1000)}

[상담 대화]
${chatText.slice(0, 1500)}

위 내용을 종합해 상담 요약을 작성하세요.`

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await res.json()
      const raw = data.content?.find((c: { type: string }) => c.type === 'text')?.text || ''
      setSummary(clean(raw))
    } catch (e) {
      console.error('요약 생성 실패', e)
      alert('요약 생성 중 문제가 생겼어요.')
    } finally {
      setSummarizing(false)
    }
  }

  // ③아래: 수정한 요약 저장 (consultations.summary)
  async function saveSummary() {
    if (!consultationId) return
    try {
      await supabase.from('consultations').update({ summary }).eq('id', consultationId)
      setSummarySaved(true)
      setTimeout(() => setSummarySaved(false), 1500)
    } catch (e) {
      console.error('요약 저장 실패', e)
      alert('요약 저장 중 문제가 생겼어요.')
    }
  }

  // 카톡 복사 (클립보드)
  async function copyForKakao() {
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      alert('복사가 안 됐어요. 텍스트를 직접 선택해 복사해 주세요.')
    }
  }

  const paneTitle: React.CSSProperties = {
    padding: '8px 12px', fontSize: '12px', color: '#a8a4c8',
    borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
  }
  const miniBtn: React.CSSProperties = {
    fontSize: '11px', padding: '3px 10px', borderRadius: '6px',
    border: '1px solid rgba(250,199,117,0.4)', background: 'rgba(250,199,117,0.12)',
    color: '#FAC775', cursor: 'pointer',
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ③ 위 — 상담사 의견 입력 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderBottom: '1px solid rgba(255,255,255,0.06)', minHeight: 0 }}>
        <div style={paneTitle}>
          <span>✍️ 내 설명 입력</span>
          <button onClick={saveNote} style={miniBtn}>{noteSaved ? '✓ 저장됨' : '저장'}</button>
        </div>
        <div style={{ flex: 1, padding: '10px', minHeight: 0 }}>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="고객에게 전할 설명·상담사 의견을 입력하세요..."
            style={{ width: '100%', height: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: '#c8c0ff', fontSize: fontSize + 'px', fontFamily, lineHeight: 1.6 }}
          />
        </div>
      </div>

      {/* ③ 아래 — AI 정리 결과 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={paneTitle}>
          <span>📄 AI 정리 결과</span>
          <button onClick={generateSummary} disabled={summarizing} style={{ ...miniBtn, opacity: summarizing ? 0.5 : 1 }}>
            {summarizing ? '요약 중...' : '✨ AI 요약'}
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px', minHeight: 0 }}>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="AI 요약을 누르면 여기에 정리돼요. 수정 후 저장·복사하세요."
            style={{ flex: 1, width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', outline: 'none', resize: 'none', color: '#e0dce8', fontSize: fontSize + 'px', fontFamily, lineHeight: 1.7, padding: '8px' }}
          />
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexShrink: 0 }}>
            <button onClick={saveSummary} disabled={!summary}
              style={{ flex: 1, fontSize: '12px', padding: '8px', borderRadius: '8px', border: '1px solid rgba(151,196,89,0.4)', background: 'rgba(151,196,89,0.12)', color: '#97c459', cursor: 'pointer', opacity: summary ? 1 : 0.4 }}>
              {summarySaved ? '✓ 저장됨' : '💾 저장'}
            </button>
            <button onClick={copyForKakao} disabled={!summary}
              style={{ flex: 1, fontSize: '12px', padding: '8px', borderRadius: '8px', border: 'none', background: '#FAE100', color: '#3c1e1e', fontWeight: 700, cursor: 'pointer', opacity: summary ? 1 : 0.4 }}>
              {copied ? '✓ 복사됨' : '💬 카톡 복사'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
