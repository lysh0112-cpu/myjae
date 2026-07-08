// app/manseryeok/components/TongbyeonView.tsx
// ============================================================================
// AI 통변 결과 화면.
// ----------------------------------------------------------------------------
// 선택한 질문 + 사주 데이터를 받아 프롬프트를 조립하고,
// /api/tongbyeon 을 스트리밍 호출해 통변을 실시간으로 카드에 표시한다.
//
// "■ 제목" 으로 시작하는 줄을 카드 제목으로, 그 아래 문단을 본문으로 파싱해
// 사주아이처럼 카드로 나눠 보여준다.
//
// props:
//   input      : TongbyeonInput (사주 계산값)
//   questions  : 사용자가 고른 SajuQuestion[]
//   premium?   : 프리미엄 여부 (상세해설 주입 + 더 길게)
//   onBack?    : 뒤로
// ============================================================================

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { buildTongbyeonPrompt, type TongbyeonInput } from '@/lib/saju/tongbyeonPrompt'
import type { SajuQuestion } from '@/lib/saju/questions'

const C = {
  cardBg: '#FFFBF7',
  card: '#fff',
  border: '#f0e0d5',
  divider: '#f5e5da',
  point: '#c8783c',
  brown: '#b46e46',
  title: '#3a2e28',
  titleWarm: '#96502e',
  sub: '#b4785a',
  subLight: '#c5a590',
}

interface Card { title: string; body: string }

// "■ 제목\n본문..." 텍스트를 카드 배열로 파싱
function parseCards(text: string): { intro: string; cards: Card[]; outro: string } {
  const parts = text.split(/^■\s*/m)
  const intro = parts[0]?.trim() ?? ''
  const cards: Card[] = []
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i]
    const nl = block.indexOf('\n')
    if (nl === -1) { cards.push({ title: block.trim(), body: '' }); continue }
    cards.push({ title: block.slice(0, nl).trim(), body: block.slice(nl + 1).trim() })
  }
  // 마지막 카드 본문에 마무리 인사가 붙어 있을 수 있으나, 단순화를 위해 그대로 둔다
  return { intro, cards, outro: '' }
}

export interface TongbyeonViewProps {
  input: TongbyeonInput
  questions: SajuQuestion[]
  premium?: boolean
  onBack?: () => void
}

export default function TongbyeonView({ input, questions, premium, onBack }: TongbyeonViewProps) {
  const prompt = useMemo(
    () => buildTongbyeonPrompt(input, questions, { premium }),
    [input, questions, premium]
  )
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    let cancelled = false

    async function run() {
      setLoading(true); setErr(''); setText('')
      try {
        const res = await fetch('/api/tongbyeon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemPrompt: prompt, premium: !!premium }),
        })
        if (!res.ok || !res.body) { setErr('통변을 불러오지 못했어요.'); setLoading(false); return }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let acc = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done || cancelled) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) { acc += parsed.text; if (!cancelled) setText(acc) }
            } catch {}
          }
        }
      } catch {
        if (!cancelled) setErr('통변을 불러오는 중 문제가 생겼어요.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [prompt, premium])

  const { intro, cards } = useMemo(() => parseCards(text), [text])

  return (
    <div style={{ background: C.cardBg, borderRadius: 18, border: `0.5px solid ${C.border}`, overflow: 'hidden' }}>
      {/* 헤더 */}
      <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        {onBack && <span onClick={onBack} style={{ color: C.subLight, fontSize: 18, cursor: 'pointer' }}>‹</span>}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.title }}>{input.name}님의 사주 이야기</div>
          <div style={{ fontSize: 10, color: C.point, marginTop: 1 }}>명연재（明然載）</div>
        </div>
        {onBack && <span style={{ width: 16 }} />}
      </div>

      <div style={{ padding: '14px 16px 20px' }}>
        {/* 인트로(제목 없는 첫 문단) */}
        {intro && (
          <div style={{ fontSize: 13.5, lineHeight: 1.85, color: C.title, whiteSpace: 'pre-wrap', marginBottom: 14 }}>{intro}</div>
        )}

        {/* 카드들 */}
        {cards.map((c, i) => (
          <div key={i} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.titleWarm, marginBottom: 8 }}>{c.title}</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.85, color: C.title, whiteSpace: 'pre-wrap' }}>{c.body}</div>
          </div>
        ))}

        {/* 로딩/커서 */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 4px', color: C.sub, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.brown, animation: 'tbpulse 1s infinite' }} />
            정성껏 풀이하고 있어요…
          </div>
        )}

        {err && (
          <div style={{ padding: '14px', textAlign: 'center', color: '#c05a5a', fontSize: 13 }}>{err}</div>
        )}
      </div>

      <style>{`@keyframes tbpulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
    </div>
  )
}
