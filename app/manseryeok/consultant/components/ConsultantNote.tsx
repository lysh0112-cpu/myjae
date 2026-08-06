'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
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
  const [topPct, setTopPct] = useState(50)      // 위(내 설명) 영역 높이 % — 경계선 드래그로 조절
  const dragRef = useRef<{ startY: number; orig: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // ══════════════════════════════════════════════════════════════
  //  🎤 말로 넣기 — ★2026-08-06 (47부 44차 · 대표님 지시)
  //
  //  [대표님]  「상담사 선생님들이 말로 하면 한말이 자동으로 타이핑되서 들어가면」
  //
  //  ⚠️⚠️ ★전에 «채팅창» 에 넣었다가 걷어내신 적이 있습니다 —
  //     「고객과 채팅으로 하면서 녹취로 채팅창에 상담사가 말한 내용을 올리려 했더니
  //       ★마음먹은 대로 «빨리 안 올라가는» 것 같더라구」
  //     [까닭]  채팅은 ★말이 «확정» 되어야 보낼 수 있는데,
  //       브라우저가 말을 다 듣고 판단하는 데 1~2초가 걸립니다.
  //       손님이 «기다리는» 자리라 그 몇 초가 답답했던 것입니다.
  //
  //  ⇒ ★여기는 «다릅니다». 「내 설명 입력」은 손님이 기다리지 않습니다.
  //     칸에 «쌓이는» 것을 보며 계속 말하면 됩니다.
  //  ⇒ 그래도 «빠르게 보이도록» 이렇게 지었습니다 —
  //     ① ★interimResults — 말하는 «도중» 에도 흐린 글씨로 먼저 보입니다
  //     ② ★continuous — 잠깐 끊겨도 «안 꺼집니다»
  //     ③ ★칸에 «덧붙입니다» — 손으로 친 글을 «안 지웁니다»
  //     ④ 상담사가 ★켜고 끕니다. 저절로 켜지지 않습니다.
  //
  //  ⛔ ★「AI 정리 결과」 칸에는 «넣지 마십시오». 대표님 —
  //     「고객이 봤던 내용과 상담사가 정리한 내용을 합쳐서 요약해 주는 기능」
  //     ⇒ AI 가 채우고 상담사가 다듬어 손님께 톡으로 보내는 자리입니다.
  //
  //  ⚠️ ★못 알아듣는 것은 «막을 수 없습니다» — 사주 용어(丙寅·화개살…)는
  //     브라우저가 하는 일이라 저희가 못 고칩니다. 말한 뒤 손으로 다듬는 것이 전제입니다.
  //  ⚠️ 못 쓰는 브라우저(사파리·구형)에서는 ★버튼이 «아예 안 보입니다».
  // ══════════════════════════════════════════════════════════════
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')        // 말하는 «도중» 의 글 (흐리게 보임)
  // ⚠️⚠️ ★useState + useEffect 로 하지 «않습니다» —
  //    eslint(react-hooks/purity)가 「효과 안에서 setState 를 부르면
  //    그리기가 겹친다」고 ★막습니다 (47부 36차에 같은 것을 겪었습니다).
  //    ⇒ 대신 ★«그릴 때» 창을 살펴봅니다. 서버에서 그릴 때는 false 입니다.
  //    ⛔ useEffect 로 바꾸지 마십시오. eslint 기준선이 깨집니다.
  const canVoice =
    typeof window !== 'undefined' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null)

  const toggleVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return
    if (listening) { recRef.current?.stop(); return }

    const rec = new SR()
    rec.lang = 'ko-KR'
    rec.continuous = true       // ★잠깐 끊겨도 «안 꺼집니다»
    rec.interimResults = true   // ★도중에도 «먼저» 보입니다

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          // ★확정된 것만 «칸에 덧붙입니다». 손으로 친 글을 안 지웁니다.
          setNote(prev => (prev ? prev.replace(/\s*$/, '') + ' ' : '') + t.trim())
          setNoteSaved(false)
        } else {
          live += t
        }
      }
      setInterim(live)
    }
    rec.onend = () => { setListening(false); setInterim('') }
    rec.onerror = () => { setListening(false); setInterim('') }
    rec.start()
    recRef.current = rec
    setListening(true)
  }

  // ⚠️ 화면을 떠날 때 «반드시» 멈춥니다 — 안 그러면 마이크가 계속 켜져 있습니다.
  useEffect(() => () => { recRef.current?.stop() }, [])

  // 위/아래 경계선 드래그
  function startVDrag(e: React.MouseEvent) {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, orig: topPct }
    window.addEventListener('mousemove', onVDrag)
    window.addEventListener('mouseup', endVDrag)
  }
  const onVDrag = useCallback((e: MouseEvent) => {
    if (!dragRef.current || !wrapRef.current) return
    const h = wrapRef.current.clientHeight
    if (h <= 0) return
    const delta = ((e.clientY - dragRef.current.startY) / h) * 100
    const next = Math.min(80, Math.max(20, dragRef.current.orig + delta))
    setTopPct(next)
  }, [])
  function endVDrag() {
    dragRef.current = null
    window.removeEventListener('mousemove', onVDrag)
    window.removeEventListener('mouseup', endVDrag)
  }

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

[가장 중요한 규칙 — 반드시 지킬 것]
이 요약의 주인은 상담사입니다. AI가 아닙니다.
1. [상담사 의견]과 [상담 대화] 속 상담사의 말이 최우선입니다.
   그 관점·판단·표현을 그대로 존중해 살려 쓰세요.
2. [AI 분석]은 참고 자료일 뿐입니다.
   상담사가 말하지 않은 내용을 AI 분석에서 끌어와 새로 덧붙이지 마세요.
3. 상담사의 해석과 어긋나는 내용은 절대 쓰지 마세요.
   AI 분석과 상담사 의견이 다르면, 언제나 상담사를 따릅니다.
4. AI는 상담사의 말을 고객이 읽기 쉽게 다듬고 정리하는 역할만 합니다.
   새로운 풀이·예측·조언을 스스로 만들어내지 마세요.

[형식 규칙]
- 마크다운 기호(##, **, ---)는 절대 쓰지 마세요.
- 따뜻하고 정중한 존댓말로, 6~10줄 이내로 핵심만.
- 고객이 바로 읽기 좋게, 오늘 상담의 핵심과 조언을 담아주세요.

[상담사 의견] ★최우선 — 이 내용을 중심으로 요약하세요
${note.slice(0, 1000)}

[상담 대화] ★상담사가 실제로 한 말을 살리세요
${chatText.slice(0, 1500)}

[AI 분석] (참고용 — 상담사가 언급한 부분만 보조로 활용)
${(cons?.ai_analysis || cons?.ai_free_analysis || '').slice(0, 1500)}

위 내용을 종합하되, 상담사의 관점과 표현을 최우선으로 존중해 상담 요약을 작성하세요.`

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
      // supabase는 실패해도 throw하지 않는다. error를 직접 확인해야 catch가 뜻이 있다.
      const { error } = await supabase.from('consultations').update({ summary }).eq('id', consultationId)
      if (error) throw error
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
    <div ref={wrapRef} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ③ 위 — 상담사 의견 입력 */}
      <div style={{ height: topPct + '%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={paneTitle}>
          <span>✍️ 내 설명 입력</span>
          {/* ★2026-08-06 (47부 44차) — 말로 넣기. 못 쓰는 브라우저면 «아예 안 보입니다». */}
          {canVoice && (
            <button onClick={toggleVoice}
              title={listening ? '멈추면 말이 더 안 들어갑니다' : '말하면 아래 칸에 그대로 쌓입니다'}
              style={{
                ...miniBtn, marginLeft: 'auto', marginRight: 6,
                background: listening ? '#5a1a1a' : '#2C2C2A',
                borderColor: listening ? '#c14545' : '#5F5E5A',
                color: listening ? '#ff9a9a' : '#FAC775',
              }}>
              {listening ? '⏹ 멈춤' : '🎤 말로 넣기'}
            </button>
          )}
          <button onClick={saveNote} style={miniBtn}>{noteSaved ? '✓ 저장됨' : '저장'}</button>
        </div>
        <div style={{ flex: 1, padding: '10px', minHeight: 0 }}>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={listening ? '말씀하시면 여기에 쌓입니다…' : '고객에게 전할 설명·상담사 의견을 입력하세요...'}
            style={{ width: '100%', height: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: '#c8c0ff', fontSize: fontSize + 'px', fontFamily, lineHeight: 1.6 }}
          />
          {/* ★말하는 «도중» 의 글 — 흐린 색으로 «먼저» 보여 드립니다.
              ⇒ 「멈춘 것처럼」 보이지 않게 하려는 것입니다.
              ⚠️ 확정되면 위 칸으로 들어가고 여기는 비워집니다. */}
          {listening && interim && (
            <div style={{
              marginTop: 4, padding: '4px 2px', fontSize: 13, lineHeight: 1.6,
              color: '#8a88a0', fontStyle: 'italic',
            }}>
              {interim}…
            </div>
          )}
        </div>
      </div>

      {/* 위/아래 경계선 — 드래그로 높이 조절 */}
      <div
        onMouseDown={startVDrag}
        title="드래그로 위·아래 높이 조절"
        style={{ height: '10px', flexShrink: 0, cursor: 'row-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div style={{ width: '40px', height: '3px', borderRadius: '2px', background: 'rgba(250,199,117,0.4)' }} />
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
